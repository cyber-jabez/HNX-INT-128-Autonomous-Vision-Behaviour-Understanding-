import io
import os
import tempfile
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.entities import VideoStatus
from app.services.video_pipeline import VideoProcessingPipeline, process_video
from app.services.pipeline_types import FrameData, DetectionResult, TrackResult, PipelineEvent
from app.services.pipeline_stages import DetectorStage, TrackerStage, BehaviourAnalyzerStage


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def create_dummy_video_file(path: str, num_frames: int = 30, width: int = 64, height: int = 64, fps: int = 15):
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(path, fourcc, float(fps), (width, height))
    for i in range(num_frames):
        frame = np.full((height, width, 3), (i * 8) % 255, dtype=np.uint8)
        out.write(frame)
    out.release()


def test_video_pipeline_frame_generator():
    temp_dir = tempfile.mkdtemp()
    video_file = os.path.join(temp_dir, "generator_test.mp4")
    create_dummy_video_file(video_file, num_frames=30, fps=15)

    pipeline = VideoProcessingPipeline()
    frames = list(pipeline.frame_generator(video_file))

    assert len(frames) == 30
    assert frames[0].frame_index == 0
    assert frames[0].timestamp == 0.0
    assert frames[-1].frame_index == 29
    assert abs(frames[-1].timestamp - (29 / 15.0)) < 1e-4

    # Test configurable target FPS (subsampling to 5 FPS from 15 FPS -> step 3 -> 10 frames)
    sampled_frames = list(pipeline.frame_generator(video_file, target_fps=5.0))
    assert len(sampled_frames) == 10
    assert sampled_frames[0].frame_index == 0
    assert sampled_frames[1].frame_index == 3

    os.remove(video_file)
    os.rmdir(temp_dir)


class MockDetector:
    def detect(self, frame_data: FrameData):
        return [
            DetectionResult(
                class_id=0,
                class_name="person",
                confidence=0.92,
                bbox=[10.0, 10.0, 50.0, 50.0],
            )
        ]


class MockTracker:
    def track(self, frame_data: FrameData, detections):
        return [
            TrackResult(
                track_id=1,
                class_name="person",
                bbox=[10.0, 10.0, 50.0, 50.0],
            )
        ]


class MockAnalyzer:
    def analyze(self, frame_data: FrameData, tracks):
        if frame_data.frame_index == 15:
            return [
                PipelineEvent(
                    event_type="test_loitering",
                    severity="high",
                    start_time=1.0,
                    spatial_zone="Entrance",
                )
            ]
        return []


def test_pipeline_architecture_execution():
    temp_dir = tempfile.mkdtemp()
    video_file = os.path.join(temp_dir, "arch_test.mp4")
    create_dummy_video_file(video_file, num_frames=20, fps=10)

    pipeline = VideoProcessingPipeline(
        detector=MockDetector(),
        tracker=MockTracker(),
        analyzer=MockAnalyzer(),
    )

    result = pipeline.process_file(video_file)
    assert result["processed_frames"] == 20
    assert result["events_count"] == 1
    assert result["events"][0].event_type == "test_loitering"

    os.remove(video_file)
    os.rmdir(temp_dir)


def test_process_video_endpoint_and_service(client):
    temp_dir = tempfile.mkdtemp()
    video_path = os.path.join(temp_dir, "endpoint_test.mp4")
    create_dummy_video_file(video_path, num_frames=20, fps=10)

    with open(video_path, "rb") as f:
        upload_res = client.post(
            "/api/v1/videos",
            files={"file": ("endpoint_test.mp4", f, "video/mp4")},
        )
    assert upload_res.status_code == 201
    vid_id = upload_res.json()["id"]

    # Trigger processing via API
    proc_res = client.post(f"/api/v1/videos/{vid_id}/process", json={"target_fps": 5.0})
    assert proc_res.status_code == 200
    assert proc_res.json()["success"] is True

    # Synchronously run process_video directly to verify database status lifecycle
    service_result = process_video(vid_id)
    assert service_result["success"] is True
    assert service_result["processed_frames"] == 20

    # Query video details to ensure COMPLETED status
    get_res = client.get(f"/api/v1/videos/{vid_id}")
    assert get_res.status_code == 200
    assert get_res.json()["status"] == VideoStatus.COMPLETED.value

    # Cleanup
    client.delete(f"/api/v1/videos/{vid_id}")
    os.remove(video_path)
    os.rmdir(temp_dir)
