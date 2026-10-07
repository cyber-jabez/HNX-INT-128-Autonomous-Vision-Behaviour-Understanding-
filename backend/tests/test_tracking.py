import os
import tempfile
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.pipeline_types import FrameData, DetectionResult
from app.vision.tracker import ByteTracker
from app.services.track_service import TrackService
from app.database import SessionLocal


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def create_sample_video(path: str, num_frames: int = 20, width: int = 64, height: int = 64, fps: int = 10):
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(path, fourcc, float(fps), (width, height))
    for i in range(num_frames):
        frame = np.full((height, width, 3), (i * 10) % 255, dtype=np.uint8)
        out.write(frame)
    out.release()


def test_bytetracker_multiple_people_identity_persistence():
    """
    Simulate multiple moving people over consecutive frames and verify
    that each person retains their persistent Track ID across frames.
    """
    tracker = ByteTracker(high_thresh=0.5, low_thresh=0.1)

    dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)

    # Person 1 starts at [50, 50, 100, 150] moving right by 5px each frame
    # Person 2 starts at [300, 50, 350, 150] moving left by 5px each frame
    person1_x = 50.0
    person2_x = 300.0

    track_id_person1 = None
    track_id_person2 = None

    for f_idx in range(10):
        timestamp = f_idx * 0.1
        frame_data = FrameData(frame_index=f_idx, timestamp=timestamp, frame=dummy_frame)

        p1_bbox = [person1_x, 50.0, person1_x + 50.0, 150.0]
        p2_bbox = [person2_x, 50.0, person2_x + 50.0, 150.0]

        detections = [
            DetectionResult(class_id=0, class_name="person", confidence=0.90, bbox=p1_bbox),
            DetectionResult(class_id=0, class_name="person", confidence=0.88, bbox=p2_bbox),
        ]

        tracks = tracker.track(frame_data, detections)
        assert len(tracks) == 2

        # Sort tracks by center_x
        sorted_tracks = sorted(tracks, key=lambda t: t.state["center_x"])
        p1_trk = sorted_tracks[0]
        p2_trk = sorted_tracks[1]

        if f_idx == 0:
            track_id_person1 = p1_trk.track_id
            track_id_person2 = p2_trk.track_id
            assert track_id_person1 != track_id_person2
        else:
            # Crucial check: ID retention across frames
            assert p1_trk.track_id == track_id_person1
            assert p2_trk.track_id == track_id_person2

        person1_x += 5.0
        person2_x -= 5.0


def test_track_endpoints_and_history(client):
    temp_dir = tempfile.mkdtemp()
    video_path = os.path.join(temp_dir, "track_test.mp4")
    create_sample_video(video_path, num_frames=10, fps=10)

    # 1. Upload video
    with open(video_path, "rb") as f:
        res = client.post(
            "/api/v1/videos",
            files={"file": ("track_test.mp4", f, "video/mp4")},
        )
    assert res.status_code == 201
    video_id = res.json()["id"]

    # 2. Record mock tracks in database
    db = SessionLocal()
    try:
        from app.services.pipeline_types import TrackResult
        mock_tracks_frame1 = [
            TrackResult(
                track_id=101,
                class_name="person",
                bbox=[50.0, 60.0, 100.0, 160.0],
                state={
                    "center_x": 75.0,
                    "center_y": 110.0,
                    "width": 50.0,
                    "height": 100.0,
                    "confidence": 0.95,
                    "first_seen": 0.0,
                    "last_seen": 0.0,
                },
            ),
            TrackResult(
                track_id=102,
                class_name="person",
                bbox=[200.0, 60.0, 250.0, 160.0],
                state={
                    "center_x": 225.0,
                    "center_y": 110.0,
                    "width": 50.0,
                    "height": 100.0,
                    "confidence": 0.89,
                    "first_seen": 0.0,
                    "last_seen": 0.0,
                },
            ),
        ]
        TrackService.record_tracks_for_frame(
            db=db,
            video_id=video_id,
            tracks=mock_tracks_frame1,
            frame_id=0,
            timestamp=0.0,
        )

        mock_tracks_frame2 = [
            TrackResult(
                track_id=101,
                class_name="person",
                bbox=[55.0, 60.0, 105.0, 160.0],
                state={
                    "center_x": 80.0,
                    "center_y": 110.0,
                    "width": 50.0,
                    "height": 100.0,
                    "confidence": 0.94,
                    "first_seen": 0.0,
                    "last_seen": 0.1,
                },
            ),
        ]
        TrackService.record_tracks_for_frame(
            db=db,
            video_id=video_id,
            tracks=mock_tracks_frame2,
            frame_id=1,
            timestamp=0.1,
        )
    finally:
        db.close()

    # 3. GET /videos/{video_id}/tracks
    tracks_res = client.get(f"/api/v1/videos/{video_id}/tracks")
    assert tracks_res.status_code == 200
    tracks_data = tracks_res.json()
    assert tracks_data["video_id"] == video_id
    assert tracks_data["total_tracks"] == 2
    assert len(tracks_data["tracks"]) == 2

    # 4. GET /tracks/{track_id}
    t_res = client.get("/api/v1/tracks/101")
    assert t_res.status_code == 200
    assert t_res.json()["track_id"] == 101
    assert t_res.json()["object_type"] == "person"
    assert t_res.json()["first_seen"] == 0.0
    assert t_res.json()["last_seen"] == 0.1

    # 5. GET /tracks/{track_id}/history
    history_res = client.get("/api/v1/tracks/101/history")
    assert history_res.status_code == 200
    points = history_res.json()
    assert len(points) == 2
    assert points[0]["frame_id"] == 0
    assert points[0]["x"] == 75.0
    assert points[0]["y"] == 110.0
    assert points[1]["frame_id"] == 1
    assert points[1]["x"] == 80.0

    # Cleanup
    client.delete(f"/api/v1/videos/{video_id}")
    os.remove(video_path)
    os.rmdir(temp_dir)
