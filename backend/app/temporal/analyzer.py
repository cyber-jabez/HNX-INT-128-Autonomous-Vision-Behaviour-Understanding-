from typing import Dict, Optional, List, Tuple
from app.config import settings
from app.temporal.trajectory import Trajectory, TrajectoryPoint
from app.temporal.motion import MotionCalculator
from app.temporal.features import TemporalFeatures
from app.utils.logger import logger


class TemporalAnalyzer:
    """
    Maintains track history over time and computes kinematics, displacement,
    stationary duration, and movement duration for every tracked entity.
    """

    def __init__(
        self,
        stationary_displacement_threshold: Optional[float] = None,
        speed_standing_threshold: Optional[float] = None,
    ):
        self.disp_threshold = (
            stationary_displacement_threshold
            if stationary_displacement_threshold is not None
            else settings.STATIONARY_DISPLACEMENT_THRESHOLD_PX
        )
        self.speed_standing_threshold = (
            speed_standing_threshold
            if speed_standing_threshold is not None
            else settings.SPEED_STANDING_THRESHOLD
        )

        self.trajectories: Dict[int, Trajectory] = {}
        # Stationary tracking: track_id -> (anchor_point, stationary_since_timestamp)
        self.stationary_state: Dict[int, Tuple[TrajectoryPoint, float]] = {}
        # Movement duration tracking: track_id -> motion_start_timestamp
        self.movement_state: Dict[int, float] = {}
        # Previous speed for acceleration calculation
        self.previous_speed: Dict[int, float] = {}

    def update_track(
        self,
        track_id: int,
        timestamp: float,
        center_x: float,
        center_y: float,
        frame_id: int,
        current_zone: Optional[str] = None,
    ) -> TemporalFeatures:
        if track_id not in self.trajectories:
            self.trajectories[track_id] = Trajectory(track_id)

        traj = self.trajectories[track_id]
        traj.add_point(timestamp, center_x, center_y, frame_id)
        current_pt = traj.latest

        # If this is the first point
        if traj.length == 1:
            self.stationary_state[track_id] = (current_pt, timestamp)
            self.previous_speed[track_id] = 0.0
            return TemporalFeatures(
                track_id=track_id,
                timestamp=timestamp,
                x=center_x,
                y=center_y,
                speed=0.0,
                direction=0.0,
                acceleration=0.0,
                distance=0.0,
                stationary_duration=0.0,
                movement_duration=0.0,
                zone=current_zone,
            )

        prev_pt = traj.points[-2]
        speed, direction, dt = MotionCalculator.calculate_velocity(prev_pt, current_pt)
        prev_spd = self.previous_speed.get(track_id, 0.0)
        acceleration = MotionCalculator.calculate_acceleration(prev_spd, speed, dt)
        self.previous_speed[track_id] = speed

        # Check Stationary Status against spatial anchor
        anchor_pt, stat_start = self.stationary_state.get(track_id, (current_pt, timestamp))
        disp_from_anchor = MotionCalculator.calculate_displacement(anchor_pt, current_pt)

        if disp_from_anchor <= self.disp_threshold and speed <= self.speed_standing_threshold:
            # Maintained position inside stationary radius
            stationary_duration = max(0.0, timestamp - stat_start)
            movement_duration = 0.0
            self.movement_state.pop(track_id, None)
        else:
            # Moved beyond stationary radius: reset stationary anchor to current point
            self.stationary_state[track_id] = (current_pt, timestamp)
            stationary_duration = 0.0

            # Update movement duration
            if track_id not in self.movement_state:
                self.movement_state[track_id] = timestamp
            movement_duration = max(0.0, timestamp - self.movement_state[track_id])

        return TemporalFeatures(
            track_id=track_id,
            timestamp=round(timestamp, 4),
            x=round(center_x, 2),
            y=round(center_y, 2),
            speed=round(speed, 2),
            direction=round(direction, 2),
            acceleration=round(acceleration, 2),
            distance=round(traj.cumulative_distance, 2),
            stationary_duration=round(stationary_duration, 2),
            movement_duration=round(movement_duration, 2),
            zone=current_zone,
        )
