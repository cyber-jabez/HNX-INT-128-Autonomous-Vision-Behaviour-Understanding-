from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


# Zone Schemas
class ZoneBase(BaseModel):
    name: str
    zone_type: str = Field(..., description="Safe Zone, Restricted Zone, Machine Area, Entry Area, Exit Area")
    polygon_coordinates: List[List[float]] = Field(
        ...,
        description="List of [x, y] coordinates defining polygon boundary, e.g. [[100, 100], [200, 100], [200, 200], [100, 200]]",
    )


class ZoneCreate(ZoneBase):
    pass


class ZoneUpdate(BaseModel):
    name: Optional[str] = None
    zone_type: Optional[str] = None
    polygon_coordinates: Optional[List[List[float]]] = None


class ZoneResponse(ZoneBase):
    id: int
    video_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Temporal Feature Schemas
class TemporalFeatureResponse(BaseModel):
    id: int
    track_id: int
    timestamp: float
    speed: float
    direction: float
    acceleration: float
    distance: float
    stationary_duration: float
    zone: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Behaviour Schemas
class BehaviourIntervalResponse(BaseModel):
    id: int
    track_id: int
    behaviour: str
    start_time: float
    end_time: float
    duration: float
    confidence: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Event Schemas
class EventDetailedResponse(BaseModel):
    id: int
    video_id: int
    track_id: Optional[int] = None
    event_type: str
    start_time: float
    end_time: Optional[float] = None
    duration: Optional[float] = None
    zone_id: Optional[int] = None
    location_x: Optional[float] = None
    location_y: Optional[float] = None
    severity: str
    confidence: float
    trigger_reason: Optional[str] = None
    status: str
    spatial_zone: Optional[str] = None
    evidence_image_path: Optional[str] = None
    explanation: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
