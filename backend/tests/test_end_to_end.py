import os
import tempfile
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.events.context import EventContext
from app.evidence.generator import EvidenceGenerator
from app.explanation.formatter import generate_deterministic_explanation
from app.explanation.llm import LLMExplanationEngine
from app.services.processing_service import EndToEndProcessingService
from app.services.progress_tracker import VideoProgressTracker
from app.models.entities import VideoStatus
from app.database import SessionLocal


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def create_sample_video(path: str, num_frames: int = 30, width: int = 128, height: int = 128, fps: int = 10):
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(path, fourcc, float(fps), (width, height))
    for i in range(num_frames):
        frame = np.full((height, width, 3), (i * 8) % 255, dtype=np.uint8)
        out.write(frame)
    out.release()


# -------------------------------------------------------------------
# Phase 10: Event Context Generation Tests
# -------------------------------------------------------------------

def test_event_context_structured_object():
    ctx = EventContext(
        event_id=21,
        video_id=1,
        track_id=17,
        event_type="LOITERING",
        start_time=134.2,
        end_time=581.5,
        duration=447.3,
        zone="Warehouse Zone B",
        severity="HIGH",
        confidence=0.94,
        trigger_reason="Stationary for more than configured threshold",
    )
    d = ctx.to_dict()
    assert d["event_id"] == 21
    assert d["track_id"] == 17
    assert d["event_type"] == "LOITERING"
    assert d["duration"] == 447.3
    assert d["start_time_formatted"] == "02:14"
    assert d["end_time_formatted"] == "09:41"


# -------------------------------------------------------------------
# Phase 11: Evidence Video Generation Tests
# -------------------------------------------------------------------

def test_evidence_generator_clipping():
    temp_dir = tempfile.mkdtemp()
    video_path = os.path.join(temp_dir, "source.mp4")
    create_sample_video(video_path, num_frames=40, fps=10)  # 4 seconds duration

    ctx = EventContext(
        event_id=1,
        video_id=1,
        track_id=5,
        event_type="RESTRICTED_ZONE_ENTRY",
        start_time=1.5,
        end_time=2.5,
        duration=1.0,
        zone="Vault",
        severity="high",
        confidence=0.99,
        trigger_reason="Crossed boundary",
        location_x=64.0,
        location_y=64.0,
    )

    ev_dir = os.path.join(temp_dir, "evidence")
    generator = EvidenceGenerator(evidence_dir=temp_dir, padding_seconds=1.0, enable_overlays=True)
    clip_path = generator.generate_clip(video_path, ctx, video_duration=4.0, video_fps=10.0)

    assert os.path.exists(clip_path)
    assert os.path.getsize(clip_path) > 0

    # Cleanup
    os.remove(clip_path)
    os.remove(video_path)
    os.rmdir(temp_dir)


# -------------------------------------------------------------------
# Phase 12: Natural Language Explanation Tests
# -------------------------------------------------------------------

def test_natural_language_explanation_deterministic_fallback():
    context_dict = {
        "event_type": "LOITERING",
        "track_id": 17,
        "start_time": 134.0,
        "end_time": 577.0,
        "duration": 443.0,
        "zone": "Warehouse Zone B",
        "confidence": 0.94,
        "trigger_reason": "Stationary beyond 5-minute threshold",
    }
    explanation = generate_deterministic_explanation(context_dict)
    assert "Person #17" in explanation
    assert "Warehouse Zone B" in explanation
    assert "LOITERING" in explanation
    assert "Stationary beyond 5-minute threshold" in explanation
    assert "94%" in explanation


# -------------------------------------------------------------------
# Phase 13 & 14 & 15: Complete Pipeline and Status Endpoint Tests
# -------------------------------------------------------------------

def test_end_to_end_pipeline_and_status(client):
    temp_dir = tempfile.mkdtemp()
    video_path = os.path.join(temp_dir, "pipeline_full.mp4")
    create_sample_video(video_path, num_frames=20, fps=10)

    # 1. Upload
    with open(video_path, "rb") as f:
        up_res = client.post("/api/v1/videos", files={"file": ("pipeline_full.mp4", f, "video/mp4")})
    assert up_res.status_code == 201
    vid_id = up_res.json()["id"]

    # 2. Add a zone
    client.post(
        f"/api/v1/videos/{vid_id}/zones",
        json={
            "name": "Restricted Zone 1",
            "zone_type": "Restricted Zone",
            "polygon_coordinates": [[0, 0], [100, 0], [100, 100], [0, 100]],
        },
    )

    # 3. Check status immediately
    status_res = client.get(f"/api/v1/videos/{vid_id}/status")
    assert status_res.status_code == 200
    assert status_res.json()["status"] == VideoStatus.UPLOADED.value

    # 4. Execute pipeline synchronously via service
    res = EndToEndProcessingService.execute_pipeline(video_id=vid_id, generate_evidence=False)
    assert res["success"] is True

    # 5. Check completed status
    status_res2 = client.get(f"/api/v1/videos/{vid_id}/status")
    assert status_res2.status_code == 200
    assert status_res2.json()["status"] == VideoStatus.COMPLETED.value
    assert status_res2.json()["progress"] == 100

    # 6. Verify Behaviours & Events endpoints
    beh_res = client.get(f"/api/v1/videos/{vid_id}/behaviours")
    assert beh_res.status_code == 200

    evt_res = client.get(f"/api/v1/videos/{vid_id}/events")
    assert evt_res.status_code == 200

    # Cleanup
    client.delete(f"/api/v1/videos/{vid_id}")
    os.remove(video_path)
    os.rmdir(temp_dir)
