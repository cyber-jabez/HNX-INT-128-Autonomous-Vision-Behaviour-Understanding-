from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class TrackPointBase(BaseModel):
    frame_id: int
    timestamp: float
    x: float
    y: float
    width: float
    height: float
    confidence: float


class TrackPointResponse(TrackPointBase):
    id: int
    track_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TrackedObjectBase(BaseModel):
    video_id: int
    track_id: int
    object_type: str
    first_seen: float
    last_seen: float


class TrackedObjectResponse(TrackedObjectBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TrackWithHistoryResponse(TrackedObjectResponse):
    history: List[TrackPointResponse] = []


class TrackListResponse(BaseModel):
    video_id: int
    total_tracks: int
    tracks: List[TrackedObjectResponse]
