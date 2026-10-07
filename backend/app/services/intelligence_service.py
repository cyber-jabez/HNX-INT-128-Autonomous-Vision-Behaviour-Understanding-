from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.entities import TemporalFeature, Behaviour, Event
from app.temporal.features import TemporalFeatures
from app.behaviour.state_manager import BehaviourInterval
from app.events.engine import AnomalyEvent
from app.utils.logger import logger


class IntelligenceService:
    """Service layer persisting temporal features, behaviour intervals, and events into SQLite/PostgreSQL."""

    @staticmethod
    def save_temporal_feature(db: Session, feat: TemporalFeatures) -> TemporalFeature:
        db_feat = TemporalFeature(
            track_id=feat.track_id,
            timestamp=feat.timestamp,
            speed=feat.speed,
            direction=feat.direction,
            acceleration=feat.acceleration,
            distance=feat.distance,
            stationary_duration=feat.stationary_duration,
            zone=feat.zone,
        )
        db.add(db_feat)
        db.commit()
        return db_feat

    @staticmethod
    def save_behaviour_interval(db: Session, interval: BehaviourInterval) -> Behaviour:
        db_b = Behaviour(
            track_id=interval.track_id,
            behaviour=interval.behaviour.value if hasattr(interval.behaviour, "value") else str(interval.behaviour),
            start_time=interval.start_time,
            end_time=interval.end_time,
            duration=interval.duration,
            confidence=interval.confidence,
        )
        db.add(db_b)
        db.commit()
        logger.info(
            f"Saved behaviour interval for track #{interval.track_id}: "
            f"{db_b.behaviour} ({db_b.start_time}s - {db_b.end_time}s)"
        )
        return db_b

    @staticmethod
    def save_anomaly_event(db: Session, evt: AnomalyEvent) -> Event:
        db_evt = Event(
            video_id=evt.video_id,
            track_id=evt.track_id,
            event_type=evt.event_type.value if hasattr(evt.event_type, "value") else str(evt.event_type),
            start_time=evt.start_time,
            end_time=evt.end_time,
            duration=evt.duration,
            zone_id=evt.zone_id,
            location_x=evt.location_x,
            location_y=evt.location_y,
            severity=evt.severity,
            confidence=evt.confidence,
            trigger_reason=evt.trigger_reason,
            status=evt.status,
            spatial_zone=evt.zone_name,
            explanation=evt.trigger_reason,
            metadata_json=evt.metadata,
        )
        db.add(db_evt)
        db.commit()
        db.refresh(db_evt)
        logger.warning(
            f"ALERT [Event #{db_evt.id}]: {db_evt.event_type} on Track #{db_evt.track_id} "
            f"({db_evt.trigger_reason})"
        )
        return db_evt

    @staticmethod
    def get_events_by_video(db: Session, video_id: int, skip: int = 0, limit: int = 50) -> List[Event]:
        return (
            db.query(Event)
            .filter(Event.video_id == video_id)
            .order_by(Event.start_time.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_event_by_id(db: Session, event_id: int) -> Optional[Event]:
        return db.query(Event).filter(Event.id == event_id).first()
