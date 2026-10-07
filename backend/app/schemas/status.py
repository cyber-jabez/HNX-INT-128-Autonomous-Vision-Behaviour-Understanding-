from typing import Dict, Any, Optional
from pydantic import BaseModel


class VideoStatusResponse(BaseModel):
    video_id: int
    status: str
    progress: int  # 0 to 100 percentage
    current_stage: str
    details: Optional[Dict[str, Any]] = None
