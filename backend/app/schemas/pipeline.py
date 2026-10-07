from typing import Optional
from pydantic import BaseModel, Field


class ProcessVideoRequest(BaseModel):
    target_fps: Optional[float] = Field(
        None,
        description="Target frames per second to sample/process. If null, original FPS is processed.",
        gt=0,
    )


class ProcessVideoResponse(BaseModel):
    success: bool
    video_id: int
    message: str
    status: str
