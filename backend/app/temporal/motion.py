import math
from typing import List, Tuple, Optional
from app.temporal.trajectory import TrajectoryPoint


class MotionCalculator:
    """Calculates instantaneous speed, direction angle, and acceleration between trajectory points."""

    @staticmethod
    def calculate_displacement(p1: TrajectoryPoint, p2: TrajectoryPoint) -> float:
        return math.hypot(p2.x - p1.x, p2.y - p1.y)

    @staticmethod
    def calculate_velocity(p1: TrajectoryPoint, p2: TrajectoryPoint) -> Tuple[float, float, float]:
        """
        Returns:
            speed (px/s),
            direction (degrees [0, 360)),
            dt (time delta)
        """
        dt = p2.timestamp - p1.timestamp
        if dt <= 1e-4:
            return 0.0, 0.0, 0.0

        dx = p2.x - p1.x
        dy = p2.y - p1.y
        dist = math.hypot(dx, dy)
        speed = dist / dt

        # Direction angle in degrees: 0=East, 90=South (image coordinates), 180=West, 270=North
        angle_rad = math.atan2(dy, dx)
        angle_deg = (math.degrees(angle_rad) + 360.0) % 360.0

        return speed, angle_deg, dt

    @staticmethod
    def calculate_acceleration(v1: float, v2: float, dt: float) -> float:
        if dt <= 1e-4:
            return 0.0
        return (v2 - v1) / dt
