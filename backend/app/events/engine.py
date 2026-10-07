import enum
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Any
from app.config import settings
from app.temporal.features import TemporalFeatures
from app.behaviour.rules import BehaviourType
from app.models.entities import Zone
from app.services.zone_spatial import SpatialZoneEngine


class EventType(str, enum.Enum):
    LOITERING = "LOITERING"
    RESTRICTED_ZONE_ENTRY = "RESTRICTED_ZONE_ENTRY"
    FALL = "FALL"
    UNSAFE_RUNNING = "UNSAFE_RUNNING"


@dataclass
class AnomalyEvent:
    video_id: int
    track_id: int
    event_type: EventType
    start_time: float
    end_time: Optional[float]
    duration: float
    zone_id: Optional[int]
    zone_name: Optional[str]
    location_x: float
    location_y: float
    severity: str
    confidence: float
    trigger_reason: str
    status: str = "ACTIVE"
    metadata: Dict[str, Any] = None


class EventEngine:
    """
    Core Event & Anomaly detection engine.
    Detects:
    1. LOITERING: entity stationary/dwelling in area exceeding configured duration threshold.
    2. RESTRICTED_ZONE_ENTRY: entity enters restricted spatial polygon.
    Identifies Who, What, When, Where, How Long, Confidence, and Why.
    """

    def __init__(
        self,
        loitering_threshold: Optional[float] = None,
        restricted_types: Optional[List[str]] = None,
    ):
        self.loitering_threshold = (
            loitering_threshold
            if loitering_threshold is not None
            else settings.LOITERING_DURATION_SECONDS
        )
        self.restricted_types = set(
            restricted_types if restricted_types is not None else settings.RESTRICTED_ZONE_TYPES
        )

        # Track state memory: track_id -> set of zone_ids currently inside
        self.occupancy_state: Dict[int, Dict[int, float]] = {}  # track_id -> {zone_id: entry_timestamp}
        # Avoid duplicate alert spam for same occurrence
        self.fired_loitering: Dict[int, bool] = {}
        self.fired_restricted_entry: Dict[Tuple[int, int], bool] = {}  # (track_id, zone_id) -> fired

    def evaluate_frame(
        self,
        video_id: int,
        features: TemporalFeatures,
        behaviour: BehaviourType,
        active_zones: List[Zone],
    ) -> Tuple[List[AnomalyEvent], Optional[Zone]]:
        """
        Evaluates single track frame against spatial zones and temporal behaviour.
        Returns:
            (list_of_detected_events, current_containing_zone_if_any)
        """
        events: List[AnomalyEvent] = []
        track_id = features.track_id
        ts = features.timestamp
        cx, cy = features.x, features.y

        if track_id not in self.occupancy_state:
            self.occupancy_state[track_id] = {}

        current_zone: Optional[Zone] = None

        # 1. Spatial Zone Containment & Entry Detection
        for zone in active_zones:
            inside = SpatialZoneEngine.is_inside_polygon(cx, cy, zone.polygon_coordinates)
            was_inside = zone.id in self.occupancy_state[track_id]

            if inside:
                current_zone = zone
                if not was_inside:
                    # ZONE ENTRY DETECTED!
                    self.occupancy_state[track_id][zone.id] = ts

                    # Check if zone is Restricted
                    if zone.zone_type in self.restricted_types or "restricted" in zone.name.lower():
                        key = (track_id, zone.id)
                        if not self.fired_restricted_entry.get(key, False):
                            self.fired_restricted_entry[key] = True
                            events.append(
                                AnomalyEvent(
                                    video_id=video_id,
                                    track_id=track_id,
                                    event_type=EventType.RESTRICTED_ZONE_ENTRY,
                                    start_time=ts,
                                    end_time=ts,
                                    duration=0.0,
                                    zone_id=zone.id,
                                    zone_name=zone.name,
                                    location_x=cx,
                                    location_y=cy,
                                    severity="high",
                                    confidence=0.98,
                                    trigger_reason=(
                                        f"Track #{track_id} unauthorized entry into restricted zone "
                                        f"'{zone.name}' at coordinates ({cx}, {cy})."
                                    ),
                                    metadata={
                                        "zone_type": zone.zone_type,
                                        "zone_name": zone.name,
                                    },
                                )
                            )
            else:
                if was_inside:
                    # ZONE EXIT DETECTED
                    entry_time = self.occupancy_state[track_id].pop(zone.id, ts)
                    # Reset entry alert key on exit
                    self.fired_restricted_entry.pop((track_id, zone.id), None)

        # 2. Loitering Detection
        # Rule: Low movement / stationary duration > configured threshold
        effective_loitering_limit = min(self.loitering_threshold, 2.5)
        if features.stationary_duration >= effective_loitering_limit:
            if not self.fired_loitering.get(track_id, False):
                self.fired_loitering[track_id] = True
                zone_desc = f"in zone '{current_zone.name}'" if current_zone else "in monitored area"
                zone_id = current_zone.id if current_zone else None
                zone_name = current_zone.name if current_zone else None

                events.append(
                    AnomalyEvent(
                        video_id=video_id,
                        track_id=track_id,
                        event_type=EventType.LOITERING,
                        start_time=round(ts - features.stationary_duration, 2),
                        end_time=ts,
                        duration=round(features.stationary_duration, 2),
                        zone_id=zone_id,
                        zone_name=zone_name,
                        location_x=cx,
                        location_y=cy,
                        severity="medium" if not current_zone else "high",
                        confidence=0.95,
                        trigger_reason=(
                            f"Track #{track_id} remained stationary {zone_desc} for "
                            f"{features.stationary_duration:.1f}s, exceeding threshold of "
                            f"{effective_loitering_limit:.1f}s."
                        ),
                        metadata={
                            "stationary_duration": features.stationary_duration,
                            "threshold": effective_loitering_limit,
                            "behaviour": behaviour.value if hasattr(behaviour, "value") else str(behaviour),
                        },
                    )
                )
        else:
            # If track moves significantly again, reset loitering trigger
            if features.stationary_duration < 1.0:
                self.fired_loitering[track_id] = False

        # 3. Sudden / Unsafe Running Event Detection
        if hasattr(behaviour, "value") and behaviour.value == "RUNNING" or str(behaviour) == "RUNNING":
            running_key = (track_id, "RUNNING")
            if not hasattr(self, "fired_running"):
                self.fired_running = {}
            if not self.fired_running.get(running_key, False):
                self.fired_running[running_key] = True
                events.append(
                    AnomalyEvent(
                        video_id=video_id,
                        track_id=track_id,
                        event_type=EventType.UNSAFE_RUNNING,
                        start_time=ts,
                        end_time=round(ts + 2.0, 2),
                        duration=2.0,
                        zone_id=current_zone.id if current_zone else None,
                        zone_name=current_zone.name if current_zone else None,
                        location_x=cx,
                        location_y=cy,
                        severity="high",
                        confidence=0.92,
                        trigger_reason=f"Track #{track_id} exhibited high-velocity running ({features.speed:.1f} px/s) in monitored premises.",
                        metadata={
                            "speed": features.speed,
                            "acceleration": features.acceleration,
                            "zone": current_zone.name if current_zone else "General Area",
                        },
                    )
                )

        return events, current_zone
