from typing import List, Optional, Dict, Any
from app.services.pipeline_types import FrameData, TrackResult, PipelineEvent
from app.temporal.analyzer import TemporalAnalyzer
from app.behaviour.classifier import BehaviourClassifier
from app.events.engine import EventEngine
from app.models.entities import Zone
from app.services.zone_spatial import SpatialZoneEngine


class BehaviourAndEventPipelineStage:
    """
    Unified Behaviour Recognition & Anomaly Event Detection pipeline stage
    implementing BehaviourAnalyzerStage Protocol.
    """

    def __init__(
        self,
        video_id: int,
        zones: Optional[List[Zone]] = None,
        temporal_analyzer: Optional[TemporalAnalyzer] = None,
        behaviour_classifier: Optional[BehaviourClassifier] = None,
        event_engine: Optional[EventEngine] = None,
    ):
        self.video_id = video_id
        self.zones = zones or []
        self.temporal_analyzer = temporal_analyzer or TemporalAnalyzer()
        self.behaviour_classifier = behaviour_classifier or BehaviourClassifier()
        self.event_engine = event_engine or EventEngine()

    def analyze(self, frame_data: FrameData, tracks: List[TrackResult]) -> List[PipelineEvent]:
        pipeline_events: List[PipelineEvent] = []

        for track in tracks:
            st = track.state
            cx = st.get("center_x", 0.0)
            cy = st.get("center_y", 0.0)

            # Determine spatial zone if inside any
            current_zone_name = None
            for z in self.zones:
                if SpatialZoneEngine.is_inside_polygon(cx, cy, z.polygon_coordinates):
                    current_zone_name = z.name
                    break

            # 1. Temporal Analysis
            features = self.temporal_analyzer.update_track(
                track_id=track.track_id,
                timestamp=frame_data.timestamp,
                center_x=cx,
                center_y=cy,
                frame_id=frame_data.frame_index,
                current_zone=current_zone_name,
            )

            # 2. Behaviour Classification & Interval Management
            behaviour, closed_interval = self.behaviour_classifier.process_frame_features(features)

            # 3. Anomaly & Event Detection
            detected_anomalies, containing_zone = self.event_engine.evaluate_frame(
                video_id=self.video_id,
                features=features,
                behaviour=behaviour,
                active_zones=self.zones,
            )

            for anomaly in detected_anomalies:
                pipeline_events.append(
                    PipelineEvent(
                        event_type=anomaly.event_type.value,
                        severity=anomaly.severity,
                        start_time=anomaly.start_time,
                        end_time=anomaly.end_time,
                        spatial_zone=anomaly.zone_name,
                        explanation=anomaly.trigger_reason,
                        metadata={
                            "track_id": anomaly.track_id,
                            "location_x": anomaly.location_x,
                            "location_y": anomaly.location_y,
                            "confidence": anomaly.confidence,
                            "trigger_reason": anomaly.trigger_reason,
                            "zone_id": anomaly.zone_id,
                            **(anomaly.metadata or {}),
                        },
                    )
                )

        return pipeline_events
