from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.entities import Detection
from app.schemas.detection import DetectionCreate
from app.services.pipeline_types import DetectionResult
from app.utils.logger import logger


class DetectionService:
    """Service layer for persisting and retrieving object detections."""

    @staticmethod
    def save_detection(db: Session, detection_in: DetectionCreate) -> Detection:
        det = Detection(**detection_in.model_dump())
        db.add(det)
        db.commit()
        db.refresh(det)
        return det

    @staticmethod
    def bulk_save_detections(
        db: Session,
        video_id: int,
        detections: List[DetectionResult],
        frame_id: int,
        timestamp: float,
    ) -> List[Detection]:
        db_records = []
        for d in detections:
            bbox = d.bbox
            x1, y1, x2, y2 = bbox[0], bbox[1], bbox[2], bbox[3]
            db_records.append(
                Detection(
                    video_id=video_id,
                    frame_id=frame_id,
                    timestamp=timestamp,
                    class_name=d.class_name,
                    class_id=d.class_id,
                    confidence=d.confidence,
                    x1=x1,
                    y1=y1,
                    x2=x2,
                    y2=y2,
                    track_id=d.track_id,
                )
            )
        if db_records:
            db.bulk_save_objects(db_records)
            db.commit()
            logger.debug(f"Persisted {len(db_records)} detections for video {video_id} frame {frame_id}")
        return db_records

    @staticmethod
    def get_detections_by_video(
        db: Session,
        video_id: int,
        class_name: Optional[str] = None,
        min_confidence: Optional[float] = None,
        frame_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Detection]:
        query = db.query(Detection).filter(Detection.video_id == video_id)
        if class_name:
            query = query.filter(Detection.class_name == class_name)
        if min_confidence is not None:
            query = query.filter(Detection.confidence >= min_confidence)
        if frame_id is not None:
            query = query.filter(Detection.frame_id == frame_id)
        return query.order_by(Detection.frame_id.asc(), Detection.id.asc()).offset(skip).limit(limit).all()

    @staticmethod
    def count_detections_by_video(
        db: Session,
        video_id: int,
        class_name: Optional[str] = None,
    ) -> int:
        query = db.query(Detection).filter(Detection.video_id == video_id)
        if class_name:
            query = query.filter(Detection.class_name == class_name)
        return query.count()
