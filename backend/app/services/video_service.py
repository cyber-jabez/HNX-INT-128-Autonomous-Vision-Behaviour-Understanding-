from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.entities import Video, Event
from app.schemas.common import VideoCreate, EventCreate
from app.utils.logger import logger


class VideoService:
    @staticmethod
    def create_video(db: Session, video_data: VideoCreate) -> Video:
        video = Video(**video_data.model_dump())
        db.add(video)
        db.commit()
        db.refresh(video)
        logger.info(f"Created video record ID: {video.id} ({video.filename})")
        return video

    @staticmethod
    def get_video(db: Session, video_id: int) -> Optional[Video]:
        return db.query(Video).filter(Video.id == video_id).first()

    @staticmethod
    def list_videos(db: Session, skip: int = 0, limit: int = 50) -> List[Video]:
        return db.query(Video).offset(skip).limit(limit).all()

    @staticmethod
    def update_video_status(db: Session, video_id: int, status: str) -> Optional[Video]:
        video = db.query(Video).filter(Video.id == video_id).first()
        if video:
            video.status = status
            db.commit()
            db.refresh(video)
            logger.info(f"Video {video_id} status updated to {status}")
        return video

    @staticmethod
    def delete_video(db: Session, video_id: int) -> bool:
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            return False
        db.delete(video)
        db.commit()
        logger.info(f"Deleted video record ID: {video_id}")
        return True


class EventService:
    @staticmethod
    def create_event(db: Session, event_data: EventCreate) -> Event:
        event = Event(**event_data.model_dump())
        db.add(event)
        db.commit()
        db.refresh(event)
        logger.info(f"Recorded event ID: {event.id} ({event.event_type}) for video {event.video_id}")
        return event

    @staticmethod
    def list_events(db: Session, video_id: Optional[int] = None, skip: int = 0, limit: int = 50) -> List[Event]:
        query = db.query(Event)
        if video_id is not None:
            query = query.filter(Event.video_id == video_id)
        return query.order_by(Event.created_at.desc()).offset(skip).limit(limit).all()
