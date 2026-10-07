from typing import Dict, Any, Optional
from app.models.entities import VideoStatus


class VideoProgressTracker:
    """In-memory thread-safe tracker for granular pipeline stages and percentage completion."""
    _state: Dict[int, Dict[str, Any]] = {}

    @classmethod
    def set_stage(cls, video_id: int, status: VideoStatus, progress: int, current_stage: str, details: Optional[Dict[str, Any]] = None):
        cls._state[video_id] = {
            "status": status.value if hasattr(status, "value") else str(status),
            "progress": min(100, max(0, progress)),
            "current_stage": current_stage,
            "details": details or {},
        }

    @classmethod
    def get_progress(cls, video_id: int, fallback_db_status: str = "UPLOADED") -> Dict[str, Any]:
        if video_id in cls._state:
            return cls._state[video_id]

        # Default mapping from persisted db status
        progress_map = {
            "UPLOADED": (0, "IDLE"),
            "QUEUED": (5, "QUEUED"),
            "DETECTING": (25, "OBJECT_DETECTION"),
            "TRACKING": (45, "OBJECT_TRACKING"),
            "ANALYZING": (65, "BEHAVIOUR_ANALYSIS"),
            "GENERATING_EVENTS": (75, "ANOMALY_DETECTION"),
            "GENERATING_EVIDENCE": (85, "EVIDENCE_EXTRACTION"),
            "GENERATING_EXPLANATIONS": (95, "LLM_SYNTHESIS"),
            "COMPLETED": (100, "FINISHED"),
            "FAILED": (0, "ERROR"),
        }
        pct, stage = progress_map.get(fallback_db_status, (0, fallback_db_status))
        return {
            "status": fallback_db_status,
            "progress": pct,
            "current_stage": stage,
            "details": {},
        }
