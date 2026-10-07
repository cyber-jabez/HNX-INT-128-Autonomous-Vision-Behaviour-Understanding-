import json
import logging
from pathlib import Path
from typing import List, Union, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    APP_NAME: str = "HNX26PSI07 Autonomous Vision & Behaviour Understanding System"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS origins
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, str) and v.startswith("["):
            try:
                return json.loads(v)
            except Exception:
                return [i.strip() for i in v.strip("[]").split(",") if i.strip()]
        return v

    # Database
    DATABASE_URL: str = "sqlite:///./hnx_vision.db"

    # Storage paths
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    PROCESSED_DIR: Path = BASE_DIR / "processed"
    EVIDENCE_DIR: Path = BASE_DIR / "evidence"

    # Video Upload Configuration
    MAX_UPLOAD_SIZE_MB: int = 500
    ALLOWED_VIDEO_EXTENSIONS: List[str] = [".mp4", ".avi", ".mov", ".mkv"]

    # Vision & Object Detection Configuration
    YOLO_MODEL_PATH: str = "yolov8n.pt"
    YOLO_MODEL: Optional[str] = None
    DETECTION_CONFIDENCE_THRESHOLD: float = 0.35
    YOLO_CONFIDENCE: Optional[float] = None
    DETECTION_DEVICE: str = "auto"  # 'auto', 'cpu', 'cuda', 'cuda:0'
    DEVICE: Optional[str] = None
    TARGET_CLASSES: List[str] = ["person"]
    DETECTION_INFERENCE_FPS: Optional[float] = None
    PROCESSING_FPS: Optional[float] = None

    # Temporal & Kinematics Configuration
    STATIONARY_DISPLACEMENT_THRESHOLD_PX: float = 15.0
    STATIONARY_THRESHOLD: Optional[float] = None
    MIN_STATIONARY_DURATION_SECONDS: float = 3.0
    SPEED_STANDING_THRESHOLD: float = 10.0
    SPEED_WALKING_THRESHOLD: float = 80.0
    SPEED_RUNNING_THRESHOLD: float = 80.0
    RUNNING_SPEED_THRESHOLD: Optional[float] = None

    # Anomaly / Event Detection Thresholds
    LOITERING_DURATION_SECONDS: float = 5.0
    LOITERING_THRESHOLD: Optional[float] = None
    RESTRICTED_ZONE_TYPES: List[str] = ["Restricted Zone", "RESTRICTED", "restricted", "Machine Area"]

    # Logging
    LOG_LEVEL: str = "INFO"

    # Optional LLM
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    LLM_API_KEY: Optional[str] = None
    LLM_PROVIDER: str = "ollama"  # 'ollama', 'openai', 'gemini', 'none'
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3:latest"

    @property
    def effective_yolo_model(self) -> str:
        return self.YOLO_MODEL or self.YOLO_MODEL_PATH

    @property
    def effective_yolo_confidence(self) -> float:
        return self.YOLO_CONFIDENCE if self.YOLO_CONFIDENCE is not None else self.DETECTION_CONFIDENCE_THRESHOLD

    @property
    def effective_device(self) -> str:
        return self.DEVICE or self.DETECTION_DEVICE

    @property
    def effective_processing_fps(self) -> Optional[float]:
        return self.PROCESSING_FPS or self.DETECTION_INFERENCE_FPS

    @property
    def effective_loitering_threshold(self) -> float:
        return self.LOITERING_THRESHOLD if self.LOITERING_THRESHOLD is not None else self.LOITERING_DURATION_SECONDS

    @property
    def effective_stationary_threshold(self) -> float:
        return self.STATIONARY_THRESHOLD if self.STATIONARY_THRESHOLD is not None else self.STATIONARY_DISPLACEMENT_THRESHOLD_PX

    @property
    def effective_running_threshold(self) -> float:
        return self.RUNNING_SPEED_THRESHOLD if self.RUNNING_SPEED_THRESHOLD is not None else self.SPEED_RUNNING_THRESHOLD

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def ensure_directories(self) -> None:
        """Create storage directories if they do not exist."""
        for path in (self.UPLOAD_DIR, self.PROCESSED_DIR, self.EVIDENCE_DIR):
            path.mkdir(parents=True, exist_ok=True)


settings = Settings()
