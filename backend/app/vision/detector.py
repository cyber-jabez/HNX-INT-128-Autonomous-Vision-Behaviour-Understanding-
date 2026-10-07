from typing import List, Optional
import numpy as np

from app.config import settings
from app.services.pipeline_types import FrameData, DetectionResult
from app.vision.model_manager import model_manager
from app.utils.logger import logger


class YOLODetector:
    """
    Ultralytics YOLO object detector implementing DetectorStage Protocol.
    Supports configurable target classes (initially 'person'),
    confidence threshold, inference FPS, CPU/CUDA device, and custom model paths.
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        confidence_threshold: Optional[float] = None,
        target_classes: Optional[List[str]] = None,
        inference_fps: Optional[float] = None,
    ):
        self.model_path = model_path or settings.YOLO_MODEL_PATH
        self.conf_threshold = (
            confidence_threshold
            if confidence_threshold is not None
            else settings.DETECTION_CONFIDENCE_THRESHOLD
        )
        self.target_classes = set(
            target_classes if target_classes is not None else settings.TARGET_CLASSES
        )
        self.inference_fps = inference_fps or settings.DETECTION_INFERENCE_FPS

    def detect(self, frame_data: FrameData) -> List[DetectionResult]:
        """
        Runs YOLO object detection on a single FrameData.
        Returns DetectionResult instances with:
        class_name, class_id, confidence, x1, y1, x2, y2, frame_id, timestamp.
        """
        try:
            model = model_manager.get_model(self.model_path)
        except RuntimeError as e:
            logger.warning(f"YOLODetector running in passthrough mode: {e}")
            return []

        # Run inference
        results = model.predict(
            source=frame_data.frame,
            conf=self.conf_threshold,
            device=model_manager.device,
            verbose=False,
        )

        detections: List[DetectionResult] = []

        if not results:
            return detections

        first_res = results[0]
        boxes = first_res.boxes
        names = first_res.names  # dict of class_id -> class_name

        if boxes is None or len(boxes) == 0:
            return detections

        for box in boxes:
            cls_id = int(box.cls[0].item())
            cls_name = names.get(cls_id, str(cls_id))

            # Filter for targeted classes if defined (e.g. ['person'])
            if self.target_classes and cls_name not in self.target_classes:
                continue

            conf = float(box.conf[0].item())
            xyxy = box.xyxy[0].tolist()  # [x1, y1, x2, y2]

            detections.append(
                DetectionResult(
                    class_id=cls_id,
                    class_name=cls_name,
                    confidence=round(conf, 4),
                    bbox=[round(coord, 2) for coord in xyxy],
                    extra={
                        "frame_id": frame_data.frame_index,
                        "timestamp": frame_data.timestamp,
                    },
                )
            )

        return detections
