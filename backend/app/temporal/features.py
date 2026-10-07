from dataclasses import dataclass
from typing import Optional


@dataclass
class TemporalFeatures:
    """Calculated temporal and kinematic feature set for a single track snapshot."""
    track_id: int
    timestamp: float
    x: float
    y: float
    speed: float  # px/s
    direction: float  # degrees [0, 360)
    acceleration: float  # px/s^2
    distance: float  # cumulative distance
    stationary_duration: float  # seconds track has remained stationary
    movement_duration: float  # seconds track has been in continuous motion
    zone: Optional[str] = None
