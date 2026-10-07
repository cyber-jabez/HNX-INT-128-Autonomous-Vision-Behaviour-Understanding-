import os
import logging
from pathlib import Path
from typing import Optional, Tuple, Any
import numpy as np

from app.temporal.features import TemporalFeatures
from app.behaviour.rules import BehaviourRules, BehaviourType
from app.behaviour.state_manager import BehaviourStateManager, BehaviourInterval

logger = logging.getLogger(__name__)


class BehaviourClassifier:
    """
    Classifies entity behaviour based on temporal kinematics and tracks intervals.
    Uses trained ML Random Forest model (derived from benchmark datasets in activity_anomaly_datasets.xlsx)
    with seamless fallback to deterministic BehaviourRules.
    """

    def __init__(
        self,
        rules: Optional[BehaviourRules] = None,
        model_path: Optional[str] = None,
    ):
        self.rules = rules or BehaviourRules()
        self.state_manager = BehaviourStateManager()
        self.ml_model = None
        self.feature_cols = None
        self.model_classes = None

        # Resolve model path
        default_model_path = Path(__file__).resolve().parent / "trained_behaviour_model.joblib"
        target_path = Path(model_path) if model_path else default_model_path

        if target_path.exists():
            try:
                import joblib
                package = joblib.load(str(target_path))
                self.ml_model = package.get("model")
                self.feature_cols = package.get(
                    "feature_cols",
                    ["speed", "acceleration", "stationary_duration", "movement_duration", "direction"],
                )
                self.model_classes = package.get("classes", [])
                logger.info(
                    f"Successfully loaded trained ML behaviour model from {target_path} "
                    f"(accuracy: {package.get('accuracy', 0.0) * 100:.2f}%)"
                )
            except Exception as e:
                logger.warning(f"Failed to load ML behaviour model from {target_path}: {e}. Using rule fallback.")
                self.ml_model = None
        else:
            logger.info(f"ML model file not found at {target_path}. Using rule-based behaviour evaluation.")

    def classify_features(self, features: TemporalFeatures) -> Tuple[BehaviourType, float]:
        """
        Predicts behaviour type and confidence using ML model, with fallback to rule engine.
        """
        if self.ml_model is not None:
            try:
                # Extract kinematic feature vector
                x_vec = np.array([[
                    float(features.speed),
                    float(features.acceleration),
                    float(features.stationary_duration),
                    float(features.movement_duration),
                    float(features.direction),
                ]], dtype=np.float32)

                pred_class_str = self.ml_model.predict(x_vec)[0]
                proba = 0.95
                if hasattr(self.ml_model, "predict_proba"):
                    probas = self.ml_model.predict_proba(x_vec)[0]
                    proba = float(np.max(probas))

                # Normalize predicted string to BehaviourType enum
                clean_name = str(pred_class_str).strip().upper()
                if hasattr(BehaviourType, clean_name):
                    return BehaviourType[clean_name], proba
            except Exception as e:
                logger.debug(f"ML inference error: {e}. Falling back to deterministic rules.")

        # Fallback to deterministic rules
        rule_behaviour = self.rules.evaluate(features)
        return rule_behaviour, 0.90

    def process_frame_features(
        self,
        features: TemporalFeatures,
    ) -> Tuple[BehaviourType, Optional[BehaviourInterval]]:
        """
        Evaluates behaviour and updates state interval.
        Returns:
            (current_behaviour, closed_interval_if_transitioned)
        """
        current_behaviour, _ = self.classify_features(features)
        closed_interval = self.state_manager.update(
            track_id=features.track_id,
            behaviour=current_behaviour,
            timestamp=features.timestamp,
        )
        return current_behaviour, closed_interval

