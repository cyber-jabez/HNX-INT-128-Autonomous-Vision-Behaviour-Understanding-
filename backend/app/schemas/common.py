from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


from app.models.entities import VideoStatus


# Health Check
class HealthCheckResponse(BaseModel):
    status: str = "healthy"
    app_name: str
    environment: str
    version: str = "1.0.0"
    database_connected: bool


# Video Schemas
class VideoBase(BaseModel):
    filename: str


class VideoCreate(VideoBase):
    filepath: str
    duration: Optional[float] = None
    fps: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    frame_count: Optional[int] = None
    status: VideoStatus = VideoStatus.UPLOADED


class VideoResponse(VideoBase):
    id: int
    filepath: str
    duration: Optional[float] = None
    fps: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    frame_count: Optional[int] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Event Schemas
class EventBase(BaseModel):
    event_type: str
    severity: str = "medium"
    start_time: float
    end_time: Optional[float] = None
    spatial_zone: Optional[str] = None
    evidence_image_path: Optional[str] = None
    explanation: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None


class EventCreate(EventBase):
    video_id: int


class EventResponse(EventBase):
    id: int
    video_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Generic API response
class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None
