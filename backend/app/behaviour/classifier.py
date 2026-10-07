from typing import Optional, Tuple
from app.temporal.features import TemporalFeatures
from app.behaviour.rules import BehaviourRules, BehaviourType
from app.behaviour.state_manager import BehaviourStateManager, BehaviourInterval


class BehaviourClassifier:
    """Classifies entity behaviour based on temporal kinematics and tracks intervals."""

    def __init__(self, rules: Optional[BehaviourRules] = None):
        self.rules = rules or BehaviourRules()
        self.state_manager = BehaviourStateManager()

    def process_frame_features(
        self,
        features: TemporalFeatures,
    ) -> Tuple[BehaviourType, Optional[BehaviourInterval]]:
        """
        Evaluates behaviour and updates state interval.
        Returns:
            (current_behaviour, closed_interval_if_transitioned)
        """
        current_behaviour = self.rules.evaluate(features)
        closed_interval = self.state_manager.update(
            track_id=features.track_id,
            behaviour=current_behaviour,
            timestamp=features.timestamp,
        )
        return current_behaviour, closed_interval
