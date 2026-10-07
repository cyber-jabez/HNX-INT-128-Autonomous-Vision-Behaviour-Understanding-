from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any


@dataclass
class EventContext:
    """
    Structured context object for every detected event.
    Single source of truth for Frontend, Alerts, Database, Evidence, and LLM explanation.
    """
    event_id: Optional[int]
    video_id: int
    track_id: Optional[int]
    event_type: str
    start_time: float
    end_time: Optional[float]
    duration: float
    zone: Optional[str]
    severity: str
    confidence: float
    trigger_reason: str
    location_x: Optional[float] = None
    location_y: Optional[float] = None
    metadata: Dict[str, Any] = None

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        # Format human-friendly time strings
        data["start_time_formatted"] = self._format_seconds(self.start_time)
        if self.end_time is not None:
            data["end_time_formatted"] = self._format_seconds(self.end_time)
        return data

    @staticmethod
    def _format_seconds(seconds: float) -> str:
        s = max(0, int(seconds))
        hrs = s // 3600
        mins = (s % 3600) // 60
        secs = s % 60
        if hrs > 0:
            return f"{hrs:02d}:{mins:02d}:{secs:02d}"
        return f"{mins:02d}:{secs:02d}"
