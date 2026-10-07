import math
from dataclasses import dataclass
from typing import List, Tuple, Optional


@dataclass
class TrajectoryPoint:
    timestamp: float
    x: float
    y: float
    frame_id: int


class Trajectory:
    """Maintains sequential history of points for a single tracked entity."""

    def __init__(self, track_id: int):
        self.track_id = track_id
        self.points: List[TrajectoryPoint] = []
        self.cumulative_distance: float = 0.0

    def add_point(self, timestamp: float, x: float, y: float, frame_id: int):
        if self.points:
            prev = self.points[-1]
            dx = x - prev.x
            dy = y - prev.y
            step_dist = math.hypot(dx, dy)
            self.cumulative_distance += step_dist

        self.points.append(TrajectoryPoint(timestamp=timestamp, x=x, y=y, frame_id=frame_id))

    @property
    def latest(self) -> Optional[TrajectoryPoint]:
        return self.points[-1] if self.points else None

    @property
    def length(self) -> int:
        return len(self.points)

    def window(self, n: int = 5) -> List[TrajectoryPoint]:
        """Return the last n points."""
        return self.points[-n:]
