from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class DetectionBase(BaseModel):
    class_name: str
    class_id: int
    confidence: float
    x1: float
    y1: float
    x2: float
    y2: float
    frame_id: int
    timestamp: float


class DetectionCreate(DetectionBase):
    video_id: int
    track_id: Optional[int] = None


class DetectionResponse(DetectionBase):
    id: int
    video_id: int
    track_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DetectionListResponse(BaseModel):
    video_id: int
    total_detections: int
    detections: List[DetectionResponse]
