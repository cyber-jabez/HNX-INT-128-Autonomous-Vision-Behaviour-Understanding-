import io
import os
import tempfile
import cv2
import numpy as np
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.services.pipeline_types import FrameData, DetectionResult
from app.vision.model_manager import ModelManager
from app.vision.detector import YOLODetector
from app.vision.detection_service import DetectionService
from app.database import SessionLocal


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def create_sample_video_file(path: str, num_frames: int = 15, width: int = 64, height: int = 64, fps: int = 10):
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(path, fourcc, float(fps), (width, height))
    for i in range(num_frames):
        frame = np.full((height, width, 3), (i * 12) % 255, dtype=np.uint8)
        out.write(frame)
    out.release()


def test_model_manager_device_configuration():
    mm = ModelManager()
    assert mm.device in ["cpu", "cuda:0"] or "cuda" in mm.device
    mm.set_device("cpu")
    assert mm.device == "cpu"


def test_yolo_detector_mocked_inference():
    detector = YOLODetector(
        model_path="yolov8n.pt",
        confidence_threshold=0.3,
        target_classes=["person"],
    )

    dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    frame_data = FrameData(frame_index=5, timestamp=0.5, frame=dummy_frame)

    # Mock ultralytics YOLO prediction return
    mock_box = MagicMock()
    mock_box.cls = [MagicMock(item=lambda: 0)]
    mock_box.conf = [MagicMock(item=lambda: 0.88)]
    mock_box.xyxy = [MagicMock(tolist=lambda: [50.0, 60.0, 200.0, 300.0])]

    mock_result = MagicMock()
    mock_result.boxes = [mock_box]
    mock_result.names = {0: "person", 2: "car"}

    with patch("app.vision.model_manager.model_manager.get_model") as mock_get_model:
        mock_model = MagicMock()
        mock_model.predict.return_value = [mock_result]
        mock_get_model.return_value = mock_model

        detections = detector.detect(frame_data)
        assert len(detections) == 1
        d = detections[0]
        assert d.class_name == "person"
        assert d.class_id == 0
        assert d.confidence == 0.88
        assert d.bbox == [50.0, 60.0, 200.0, 300.0]
        assert d.extra["frame_id"] == 5
        assert d.extra["timestamp"] == 0.5


def test_detection_service_and_api(client):
    temp_dir = tempfile.mkdtemp()
    video_path = os.path.join(temp_dir, "det_test.mp4")
    create_sample_video_file(video_path, num_frames=10, fps=10)

    # 1. Upload video
    with open(video_path, "rb") as f:
        upload_res = client.post(
            "/api/v1/videos",
            files={"file": ("det_test.mp4", f, "video/mp4")},
        )
    assert upload_res.status_code == 201
    video_id = upload_res.json()["id"]

    # 2. Save simulated detections via DetectionService
    db = SessionLocal()
    try:
        sample_detections = [
            DetectionResult(
                class_id=0,
                class_name="person",
                confidence=0.85,
                bbox=[15.0, 20.0, 100.0, 150.0],
            ),
            DetectionResult(
                class_id=0,
                class_name="person",
                confidence=0.92,
                bbox=[40.0, 50.0, 120.0, 180.0],
            ),
        ]
        DetectionService.bulk_save_detections(
            db=db,
            video_id=video_id,
            detections=sample_detections,
            frame_id=1,
            timestamp=0.1,
        )
    finally:
        db.close()

    # 3. Retrieve via GET /videos/{video_id}/detections
    res = client.get(f"/api/v1/videos/{video_id}/detections")
    assert res.status_code == 200
    data = res.json()
    assert data["video_id"] == video_id
    assert data["total_detections"] == 2
    assert len(data["detections"]) == 2

    first_det = data["detections"][0]
    assert first_det["class_name"] == "person"
    assert first_det["class_id"] == 0
    assert first_det["confidence"] == 0.85
    assert first_det["x1"] == 15.0
    assert first_det["y1"] == 20.0
    assert first_det["x2"] == 100.0
    assert first_det["y2"] == 150.0
    assert first_det["frame_id"] == 1
    assert first_det["timestamp"] == 0.1

    # 4. Filter by min_confidence
    filtered_res = client.get(f"/api/v1/videos/{video_id}/detections?min_confidence=0.90")
    assert filtered_res.status_code == 200
    assert len(filtered_res.json()["detections"]) == 1

    # Cleanup
    client.delete(f"/api/v1/videos/{video_id}")
    os.remove(video_path)
    os.rmdir(temp_dir)
