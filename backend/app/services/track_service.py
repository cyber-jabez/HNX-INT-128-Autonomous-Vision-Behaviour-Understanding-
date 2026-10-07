from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.entities import TrackedObject, TrackPoint
from app.services.pipeline_types import TrackResult
from app.utils.logger import logger


class TrackService:
    """Service layer for saving and retrieving tracked objects and trajectory points."""

    @staticmethod
    def record_tracks_for_frame(
        db: Session,
        video_id: int,
        tracks: List[TrackResult],
        frame_id: int,
        timestamp: float,
    ) -> None:
        """
        Create or update TrackedObject and record TrackPoint for the given frame.
        """
        for t in tracks:
            st = t.state
            cx = st.get("center_x", 0.0)
            cy = st.get("center_y", 0.0)
            w = st.get("width", 0.0)
            h = st.get("height", 0.0)
            conf = st.get("confidence", 1.0)
            first_seen = st.get("first_seen", timestamp)
            last_seen = st.get("last_seen", timestamp)

            # Check if TrackedObject already exists for this video and track_id
            tracked_obj = (
                db.query(TrackedObject)
                .filter(TrackedObject.video_id == video_id, TrackedObject.track_id == t.track_id)
                .first()
            )

            if not tracked_obj:
                tracked_obj = TrackedObject(
                    video_id=video_id,
                    track_id=t.track_id,
                    object_type=t.class_name,
                    first_seen=first_seen,
                    last_seen=last_seen,
                )
                db.add(tracked_obj)
                db.flush()
            else:
                tracked_obj.last_seen = last_seen

            # Record track point
            pt = TrackPoint(
                track_id=t.track_id,
                frame_id=frame_id,
                timestamp=timestamp,
                x=cx,
                y=cy,
                width=w,
                height=h,
                confidence=conf,
            )
            db.add(pt)

        db.commit()

    @staticmethod
    def get_tracks_by_video(
        db: Session,
        video_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> List[TrackedObject]:
        return (
            db.query(TrackedObject)
            .filter(TrackedObject.video_id == video_id)
            .order_by(TrackedObject.track_id.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def count_tracks_by_video(db: Session, video_id: int) -> int:
        return db.query(TrackedObject).filter(TrackedObject.video_id == video_id).count()

    @staticmethod
    def get_track_by_id(db: Session, track_id: int) -> Optional[TrackedObject]:
        return db.query(TrackedObject).filter(TrackedObject.track_id == track_id).first()

    @staticmethod
    def get_track_history(
        db: Session,
        track_id: int,
        skip: int = 0,
        limit: int = 500,
    ) -> List[TrackPoint]:
        return (
            db.query(TrackPoint)
            .filter(TrackPoint.track_id == track_id)
            .order_by(TrackPoint.frame_id.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_tracks_at_timestamp(
        db: Session,
        video_id: int,
        timestamp: float,
        time_window: float = 1.0,
    ) -> List[dict]:
        """
        Query track points near the given timestamp for a video,
        finding the closest point for each track within [first_seen, last_seen] with a tolerance.
        """
        tracked_objects = db.query(TrackedObject).filter(TrackedObject.video_id == video_id).all()
        if not tracked_objects:
            return []

        from app.models.entities import Video, Behaviour, TemporalFeature
        video_rec = db.query(Video).filter(Video.id == video_id).first()
        vw = float(video_rec.width) if video_rec and video_rec.width else 1920.0
        vh = float(video_rec.height) if video_rec and video_rec.height else 1080.0

        results = []
        for obj in tracked_objects:
            # Check if this object was visible around this timestamp
            if timestamp < obj.first_seen - time_window or timestamp > obj.last_seen + time_window:
                continue

            # Query the closest point to this timestamp
            closest_point = (
                db.query(TrackPoint)
                .filter(
                    TrackPoint.track_id == obj.track_id,
                    TrackPoint.timestamp >= timestamp - time_window,
                    TrackPoint.timestamp <= timestamp + time_window,
                )
                .order_by(
                    # Order by proximity to the queried timestamp
                    (TrackPoint.timestamp - timestamp) * (TrackPoint.timestamp - timestamp)
                )
                .first()
            )

            if not closest_point:
                continue

            pt = closest_point

            # Look up behaviour interval at this timestamp if exists
            beh = (
                db.query(Behaviour)
                .filter(
                    Behaviour.track_id == pt.track_id,
                    Behaviour.start_time <= pt.timestamp + 0.5,
                    Behaviour.end_time >= pt.timestamp - 0.5,
                )
                .first()
            )
            beh_name = beh.behaviour if beh else "Standing"

            # Look up temporal feature speed
            tf = (
                db.query(TemporalFeature)
                .filter(
                    TemporalFeature.track_id == pt.track_id,
                    TemporalFeature.timestamp <= pt.timestamp + 0.5,
                    TemporalFeature.timestamp >= pt.timestamp - 0.5,
                )
                .order_by(TemporalFeature.timestamp.desc())
                .first()
            )
            speed_val = tf.speed if tf else 0.0
            zone_val = tf.zone if tf else None

            # Calculate bbox [x1, y1, x2, y2] normalized 0..1
            half_w = pt.width / 2.0
            half_h = pt.height / 2.0
            px1 = max(0.0, pt.x - half_w)
            py1 = max(0.0, pt.y - half_h)
            px2 = pt.x + half_w
            py2 = pt.y + half_h

            norm_x1 = max(0.0, min(1.0, px1 / vw))
            norm_y1 = max(0.0, min(1.0, py1 / vh))
            norm_x2 = max(0.0, min(1.0, px2 / vw))
            norm_y2 = max(0.0, min(1.0, py2 / vh))

            results.append({
                "track_id": pt.track_id,
                "class_name": obj.object_type,
                "confidence": pt.confidence,
                "bbox": [norm_x1, norm_y1, norm_x2, norm_y2],
                "behaviour": beh_name,
                "speed": round(speed_val, 2),
                "zone": zone_val,
                "timestamp": pt.timestamp,
                "frame_id": pt.frame_id,
            })

        return results

