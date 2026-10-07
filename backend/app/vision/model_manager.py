import os
from typing import Optional
from app.config import settings
from app.utils.logger import logger

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    torch = None
    TORCH_AVAILABLE = False

try:
    from ultralytics import YOLO
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    YOLO = None
    ULTRALYTICS_AVAILABLE = False


class ModelManager:
    """
    Singleton manager for loading, caching, and serving YOLO models.
    Supports CPU, CUDA GPU, and custom model weights.
    """
    _instance: Optional["ModelManager"] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
            cls._instance._models = {}
            cls._instance._device = cls._instance._determine_device()
        return cls._instance

    def _determine_device(self) -> str:
        configured = settings.DETECTION_DEVICE.lower()
        if configured == "auto":
            if TORCH_AVAILABLE and torch.cuda.is_available():
                device = "cuda:0"
            else:
                device = "cpu"
        elif configured.startswith("cuda"):
            if TORCH_AVAILABLE and torch.cuda.is_available():
                device = configured
            else:
                logger.warning("CUDA requested but not available. Falling back to CPU.")
                device = "cpu"
        else:
            device = "cpu"
        logger.info(f"ModelManager initialized target device: {device}")
        return device

    @property
    def device(self) -> str:
        return self._device

    def set_device(self, device: str) -> None:
        self._device = device
        logger.info(f"ModelManager device manually set to: {self._device}")

    def get_model(self, model_path: Optional[str] = None):
        """
        Loads or returns cached YOLO model.
        """
        path = model_path or settings.YOLO_MODEL_PATH
        if path not in self._models:
            if not ULTRALYTICS_AVAILABLE:
                raise RuntimeError(
                    "Ultralytics is not available in the current environment. "
                    "Install with 'pip install ultralytics'."
                )
            logger.info(f"Loading YOLO model from: {path} on device: {self._device}")
            model = YOLO(path)
            model.to(self._device)
            self._models[path] = model
            logger.info(f"YOLO model {path} loaded successfully.")
        return self._models[path]


model_manager = ModelManager()
