from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
import numpy as np


@dataclass
class FrameData:
    """Encapsulates data for a single video frame as it moves through the pipeline."""
    frame_index: int
    timestamp: float  # In seconds from start of video
    frame: np.ndarray  # BGR image from OpenCV
    is_keyframe: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DetectionResult:
    """Encapsulates object detection outcome for a frame."""
    class_id: int
    class_name: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2]
    track_id: Optional[int] = None
    extra: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TrackResult:
    """Encapsulates tracked entity trajectory and state."""
    track_id: int
    class_name: str
    bbox: List[float]
    velocity: Optional[List[float]] = None
    trajectory: List[List[float]] = field(default_factory=list)  # [(x, y, timestamp), ...]
    state: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PipelineEvent:
    """Encapsulates an alert / anomaly generated during behaviour analysis."""
    event_type: str
    severity: str  # low, medium, high, critical
    start_time: float
    end_time: Optional[float] = None
    spatial_zone: Optional[str] = None
    evidence_frame: Optional[np.ndarray] = None
    evidence_image_path: Optional[str] = None
    explanation: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
