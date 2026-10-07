import io
import os
import tempfile
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.entities import VideoStatus


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def create_dummy_video_bytes(num_frames: int = 15, width: int = 64, height: int = 64, fps: int = 10) -> bytes:
    """Generate a lightweight valid MP4 video in memory using OpenCV."""
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, "test.mp4")
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(temp_path, fourcc, float(fps), (width, height))

    for i in range(num_frames):
        frame = np.full((height, width, 3), (i * 15) % 255, dtype=np.uint8)
        out.write(frame)
    out.release()

    with open(temp_path, "rb") as f:
        data = f.read()

    os.remove(temp_path)
    os.rmdir(temp_dir)
    return data


def test_root_and_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"
    assert res.json()["database_connected"] is True


def test_upload_invalid_extension(client):
    fake_file = io.BytesIO(b"not a video")
    res = client.post(
        "/api/v1/videos",
        files={"file": ("test.txt", fake_file, "text/plain")},
    )
    assert res.status_code == 400
    assert "Unsupported video format" in res.json()["detail"]


def test_upload_corrupt_video(client):
    corrupt_file = io.BytesIO(b"fake corrupted mp4 content not readable by opencv")
    res = client.post(
        "/api/v1/videos",
        files={"file": ("corrupt.mp4", corrupt_file, "video/mp4")},
    )
    assert res.status_code == 400
    assert "verification failed" in res.json()["detail"]


def test_video_full_crud_and_stream(client):
    video_bytes = create_dummy_video_bytes(num_frames=20, width=128, height=128, fps=10)
    video_file = io.BytesIO(video_bytes)

    # 1. POST /videos (Upload)
    upload_res = client.post(
        "/api/v1/videos",
        files={"file": ("surveillance_sample.mp4", video_file, "video/mp4")},
    )
    assert upload_res.status_code == 201
    video_data = upload_res.json()
    video_id = video_data["id"]

    assert video_data["filename"] == "surveillance_sample.mp4"
    assert video_data["status"] == VideoStatus.UPLOADED.value
    assert video_data["width"] == 128
    assert video_data["height"] == 128
    assert video_data["frame_count"] == 20
    assert video_data["fps"] == 10.0
    assert video_data["duration"] == 2.0

    # 2. GET /videos
    list_res = client.get("/api/v1/videos")
    assert list_res.status_code == 200
    assert any(v["id"] == video_id for v in list_res.json())

    # 3. GET /videos/{video_id}
    get_res = client.get(f"/api/v1/videos/{video_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == video_id

    # 4. GET /videos/{video_id}/stream (Full stream)
    stream_res = client.get(f"/api/v1/videos/{video_id}/stream")
    assert stream_res.status_code == 200
    assert stream_res.headers.get("accept-ranges") == "bytes"
    assert len(stream_res.content) == len(video_bytes)

    # 5. GET /videos/{video_id}/stream (Range request / Partial Content HTTP 206)
    range_res = client.get(
        f"/api/v1/videos/{video_id}/stream",
        headers={"Range": "bytes=0-100"},
    )
    assert range_res.status_code == 206
    assert range_res.headers.get("content-range").startswith("bytes 0-100/")
    assert len(range_res.content) == 101

    # 6. DELETE /videos/{video_id}
    del_res = client.delete(f"/api/v1/videos/{video_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # 7. Verify deletion
    not_found_res = client.get(f"/api/v1/videos/{video_id}")
    assert not_found_res.status_code == 404
