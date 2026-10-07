import os
import tempfile
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.temporal.motion import MotionCalculator
from app.temporal.trajectory import TrajectoryPoint
from app.temporal.analyzer import TemporalAnalyzer
from app.behaviour.rules import BehaviourRules, BehaviourType
from app.services.zone_spatial import SpatialZoneEngine
from app.events.engine import EventEngine, EventType
from app.models.entities import Zone, VideoStatus
from app.services.evaluation import (
    SystemEvaluator,
    DetectionEvaluationMetrics,
    TrackingEvaluationMetrics,
    BehaviourEvaluationMetrics,
    EventEvaluationMetrics,
    SystemPerformanceMetrics,
)
from app.database import SessionLocal


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def create_test_video(path: str, num_frames: int = 25, width: int = 128, height: int = 128, fps: int = 10):
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(path, fourcc, float(fps), (width, height))
    for i in range(num_frames):
        frame = np.full((height, width, 3), (i * 7) % 255, dtype=np.uint8)
        out.write(frame)
    out.release()


# -------------------------------------------------------------------
# Phase 19: Comprehensive Testing Requirements
# -------------------------------------------------------------------

def test_video_upload_and_validation(client):
    temp_dir = tempfile.mkdtemp()
    video_path = os.path.join(temp_dir, "valid.mp4")
    create_test_video(video_path, num_frames=20, fps=10)

    # 1. Upload valid video & extract metadata
    with open(video_path, "rb") as f:
        up_res = client.post("/api/v1/videos", files={"file": ("valid.mp4", f, "video/mp4")})
    assert up_res.status_code == 201
    vid_data = up_res.json()
    assert vid_data["frame_count"] == 20
    assert vid_data["fps"] == 10.0
    assert vid_data["duration"] == 2.0
    vid_id = vid_data["id"]

    # 2. Reject invalid video extension
    import io
    fake_txt = io.BytesIO(b"not a video")
    bad_res = client.post("/api/v1/videos", files={"file": ("bad.txt", fake_txt, "text/plain")})
    assert bad_res.status_code == 400

    # 3. Reject corrupted file
    corrupt_mp4 = io.BytesIO(b"broken corrupted bytes")
    corrupt_res = client.post("/api/v1/videos", files={"file": ("corrupt.mp4", corrupt_mp4, "video/mp4")})
    assert corrupt_res.status_code == 400

    # Cleanup
    client.delete(f"/api/v1/videos/{vid_id}")
    os.remove(video_path)
    os.rmdir(temp_dir)


def test_temporal_motion_calculations():
    # Motion & Kinematics calculation
    p1 = TrajectoryPoint(timestamp=0.0, x=100.0, y=100.0, frame_id=0)
    p2 = TrajectoryPoint(timestamp=1.0, x=130.0, y=140.0, frame_id=10)

    disp = MotionCalculator.calculate_displacement(p1, p2)
    assert round(disp, 2) == 50.0  # 3-4-5 triangle

    speed, direction, dt = MotionCalculator.calculate_velocity(p1, p2)
    assert round(speed, 2) == 50.0
    assert dt == 1.0
    assert round(direction, 1) > 0.0

    acc = MotionCalculator.calculate_acceleration(v1=20.0, v2=50.0, dt=1.0)
    assert acc == 30.0


def test_behaviour_classification_rules():
    rules = BehaviourRules(
        speed_standing_threshold=10.0,
        speed_running_threshold=80.0,
        min_stationary_duration=3.0,
    )
    from app.temporal.features import TemporalFeatures

    # 1. Standing
    f_standing = TemporalFeatures(
        track_id=1, timestamp=1.0, x=50, y=50, speed=2.0, direction=0,
        acceleration=0, distance=2, stationary_duration=1.0, movement_duration=0,
    )
    assert rules.evaluate(f_standing) == BehaviourType.STANDING

    # 2. Stationary (duration >= 3.0s)
    f_stationary = TemporalFeatures(
        track_id=1, timestamp=5.0, x=50, y=50, speed=1.0, direction=0,
        acceleration=0, distance=2, stationary_duration=4.5, movement_duration=0,
    )
    assert rules.evaluate(f_stationary) == BehaviourType.STATIONARY

    # 3. Walking (moderate speed)
    f_walking = TemporalFeatures(
        track_id=1, timestamp=6.0, x=80, y=50, speed=35.0, direction=0,
        acceleration=0, distance=30, stationary_duration=0, movement_duration=2.0,
    )
    assert rules.evaluate(f_walking) == BehaviourType.WALKING

    # 4. Running (high speed)
    f_running = TemporalFeatures(
        track_id=1, timestamp=7.0, x=180, y=50, speed=95.0, direction=0,
        acceleration=0, distance=100, stationary_duration=0, movement_duration=3.0,
    )
    assert rules.evaluate(f_running) == BehaviourType.RUNNING


# -------------------------------------------------------------------
# Phase 20: System Evaluation Benchmark Tests
# -------------------------------------------------------------------

def test_system_evaluator_detection_metrics():
    preds = [
        {"bbox": [10, 10, 50, 50], "confidence": 0.9},
        {"bbox": [100, 100, 150, 150], "confidence": 0.8},
        {"bbox": [300, 300, 320, 320], "confidence": 0.4},  # False positive
    ]
    gts = [
        {"bbox": [12, 11, 49, 52]},  # Matches pred 0
        {"bbox": [99, 102, 148, 150]},  # Matches pred 1
        {"bbox": [500, 500, 550, 550]},  # Missed / False Negative
    ]

    metrics = SystemEvaluator.evaluate_object_detection(preds, gts, iou_threshold=0.5)
    assert metrics.true_positives == 2
    assert metrics.false_positives == 1
    assert metrics.false_negatives == 1
    assert metrics.precision == round(2 / 3, 4)
    assert metrics.recall == round(2 / 3, 4)


def test_system_evaluator_tracking_and_behaviour_metrics():
    # Tracking consistency test
    tracked_frames = [
        {1: 101, 2: 102},
        {1: 101, 2: 102},
        {1: 101, 2: 103},  # Person 2 experienced an ID switch to 103
    ]
    trk_metrics = SystemEvaluator.evaluate_tracking(tracked_frames)
    assert trk_metrics.id_switches == 1
    assert trk_metrics.id_consistency_score < 1.0

    # Behaviour metrics test
    preds = ["WALKING", "WALKING", "STANDING", "RUNNING"]
    gts = ["WALKING", "WALKING", "STANDING", "WALKING"]  # 1 error on last
    beh_metrics = SystemEvaluator.evaluate_behaviour(preds, gts)
    assert beh_metrics.accuracy == 0.75
    assert "WALKING" in beh_metrics.confusion_matrix

    # System runtime performance calculation
    perf = SystemEvaluator.measure_system_performance(
        total_frames=100,
        start_time=10.0,
        end_time=12.0,
        inference_durations=[0.015, 0.018, 0.016],
    )
    assert perf.processing_fps == 50.0
    assert perf.inference_latency_ms > 0
    assert perf.cpu_usage_percent >= 0
