import enum
from typing import Optional
from app.config import settings
from app.temporal.features import TemporalFeatures


class BehaviourType(str, enum.Enum):
    WALKING = "WALKING"
    STANDING = "STANDING"
    STATIONARY = "STATIONARY"
    RUNNING = "RUNNING"


class BehaviourRules:
    """Configurable deterministic rules mapping temporal kinematics to human behaviour."""

    def __init__(
        self,
        speed_standing_threshold: Optional[float] = None,
        speed_running_threshold: Optional[float] = None,
        min_stationary_duration: Optional[float] = None,
    ):
        self.speed_standing = (
            speed_standing_threshold
            if speed_standing_threshold is not None
            else settings.SPEED_STANDING_THRESHOLD
        )
        self.speed_running = (
            speed_running_threshold
            if speed_running_threshold is not None
            else settings.SPEED_RUNNING_THRESHOLD
        )
        self.min_stationary_sec = (
            min_stationary_duration
            if min_stationary_duration is not None
            else settings.MIN_STATIONARY_DURATION_SECONDS
        )

    def evaluate(self, features: TemporalFeatures) -> BehaviourType:
        """
        Determines current behaviour state from temporal information:
        - Low speed (< 10 px/s) + duration >= threshold (e.g. 3.0s) -> STATIONARY
        - Low speed (< 10 px/s) + duration < threshold -> STANDING
        - High speed (>= 80 px/s) -> RUNNING
        - Moderate speed (10 px/s - 80 px/s) + continuous movement -> WALKING
        """
        speed = features.speed
        stat_dur = features.stationary_duration

        if speed >= self.speed_running:
            return BehaviourType.RUNNING

        if speed < self.speed_standing:
            if stat_dur >= self.min_stationary_sec:
                return BehaviourType.STATIONARY
            else:
                return BehaviourType.STANDING

        return BehaviourType.WALKING
