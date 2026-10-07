import os
import tempfile
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.temporal.analyzer import TemporalAnalyzer
from app.behaviour.rules import BehaviourRules, BehaviourType
from app.behaviour.state_manager import BehaviourStateManager
from app.events.engine import EventEngine, EventType
from app.models.entities import Zone
from app.services.zone_spatial import SpatialZoneEngine
from app.database import SessionLocal


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def create_sample_video(path: str, num_frames: int = 15, width: int = 64, height: int = 64, fps: int = 10):
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(path, fourcc, float(fps), (width, height))
    for i in range(num_frames):
        frame = np.full((height, width, 3), (i * 10) % 255, dtype=np.uint8)
        out.write(frame)
    out.release()


# -------------------------------------------------------------------
# Phase 6: Temporal Analysis Tests
# -------------------------------------------------------------------

def test_temporal_analyzer_stationary_and_movement():
    analyzer = TemporalAnalyzer(
        stationary_displacement_threshold=10.0,
        speed_standing_threshold=5.0,
    )

    # Person #7: 10.0s (450, 300), 11.0s (452, 301), 12.0s (451, 300) -> stationary
    f1 = analyzer.update_track(track_id=7, timestamp=10.0, center_x=450.0, center_y=300.0, frame_id=100)
    assert f1.stationary_duration == 0.0

    f2 = analyzer.update_track(track_id=7, timestamp=11.0, center_x=452.0, center_y=301.0, frame_id=110)
    assert f2.stationary_duration == 1.0
    assert f2.speed <= 5.0

    f3 = analyzer.update_track(track_id=7, timestamp=12.0, center_x=451.0, center_y=300.0, frame_id=120)
    assert f3.stationary_duration == 2.0

    # Person #7 starts running at 13.0s (550, 300) -> displacement 99px in 1s -> speed 99 px/s
    f4 = analyzer.update_track(track_id=7, timestamp=13.0, center_x=550.0, center_y=300.0, frame_id=130)
    assert f4.stationary_duration == 0.0
    assert f4.speed > 80.0
    assert f4.movement_duration >= 0.0


# -------------------------------------------------------------------
# Phase 7: Behaviour Intervals Tests
# -------------------------------------------------------------------

def test_behaviour_intervals_state_manager():
    state_mgr = BehaviourStateManager()

    # Track 7: 10s to 32s WALKING (doesn't generate new records every frame)
    inv1 = state_mgr.update(track_id=7, behaviour=BehaviourType.WALKING, timestamp=10.0)
    assert inv1 is None

    inv2 = state_mgr.update(track_id=7, behaviour=BehaviourType.WALKING, timestamp=20.0)
    assert inv2 is None  # still continuing

    # Transition to STANDING at 32.0s -> emits completed WALKING interval
    closed_walk = state_mgr.update(track_id=7, behaviour=BehaviourType.STANDING, timestamp=32.0)
    assert closed_walk is not None
    assert closed_walk.behaviour == BehaviourType.WALKING
    assert closed_walk.start_time == 10.0
    assert closed_walk.end_time == 32.0
    assert closed_walk.duration == 22.0

    # Transition to STATIONARY at 48.0s
    closed_stand = state_mgr.update(track_id=7, behaviour=BehaviourType.STATIONARY, timestamp=48.0)
    assert closed_stand is not None
    assert closed_stand.behaviour == BehaviourType.STANDING
    assert closed_stand.start_time == 32.0
    assert closed_stand.end_time == 48.0
    assert closed_stand.duration == 16.0


# -------------------------------------------------------------------
# Phase 8: Spatial Zone Point-in-Polygon Tests & Endpoints
# -------------------------------------------------------------------

def test_spatial_polygon_point_in_polygon():
    # Square zone from (100, 100) to (200, 200)
    polygon = [[100.0, 100.0], [200.0, 100.0], [200.0, 200.0], [100.0, 200.0]]

    # Center is inside
    assert SpatialZoneEngine.is_inside_polygon(150.0, 150.0, polygon) is True
    # Outside
    assert SpatialZoneEngine.is_inside_polygon(50.0, 50.0, polygon) is False
    assert SpatialZoneEngine.is_inside_polygon(250.0, 250.0, polygon) is False


def test_zone_crud_api(client):
    temp_dir = tempfile.mkdtemp()
    video_path = os.path.join(temp_dir, "zone_vid.mp4")
    create_sample_video(video_path, num_frames=5)

    with open(video_path, "rb") as f:
        vid_res = client.post("/api/v1/videos", files={"file": ("zone_vid.mp4", f, "video/mp4")})
    assert vid_res.status_code == 201
    vid_id = vid_res.json()["id"]

    # 1. POST /videos/{video_id}/zones
    zone_payload = {
        "name": "Restricted Vault",
        "zone_type": "Restricted Zone",
        "polygon_coordinates": [[10.0, 10.0], [100.0, 10.0], [100.0, 100.0], [10.0, 100.0]],
    }
    create_zone_res = client.post(f"/api/v1/videos/{vid_id}/zones", json=zone_payload)
    assert create_zone_res.status_code == 201
    zone_data = create_zone_res.json()
    zone_id = zone_data["id"]
    assert zone_data["name"] == "Restricted Vault"

    # 2. GET /videos/{video_id}/zones
    get_zones_res = client.get(f"/api/v1/videos/{vid_id}/zones")
    assert get_zones_res.status_code == 200
    assert len(get_zones_res.json()) == 1

    # 3. PUT /zones/{zone_id}
    put_res = client.put(f"/api/v1/zones/{zone_id}", json={"name": "High Security Vault"})
    assert put_res.status_code == 200
    assert put_res.json()["name"] == "High Security Vault"

    # 4. DELETE /zones/{zone_id}
    del_res = client.delete(f"/api/v1/zones/{zone_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Cleanup
    client.delete(f"/api/v1/videos/{vid_id}")
    os.remove(video_path)
    os.rmdir(temp_dir)


# -------------------------------------------------------------------
# Phase 9: Anomaly & Event Detection Engine Tests
# -------------------------------------------------------------------

def test_anomaly_event_engine_loitering_and_restricted_entry():
    engine = EventEngine(loitering_threshold=5.0)

    # Restricted Zone
    restricted_zone = Zone(
        id=1,
        video_id=1,
        name="Vault Area",
        zone_type="Restricted Zone",
        polygon_coordinates=[[100.0, 100.0], [300.0, 100.0], [300.0, 300.0], [100.0, 300.0]],
    )

    analyzer = TemporalAnalyzer(stationary_displacement_threshold=10.0, speed_standing_threshold=5.0)

    # Frame 1: Person 17 enters restricted zone at (150, 150)
    feat1 = analyzer.update_track(track_id=17, timestamp=10.0, center_x=150.0, center_y=150.0, frame_id=1)
    events1, _ = engine.evaluate_frame(
        video_id=1,
        features=feat1,
        behaviour=BehaviourType.STANDING,
        active_zones=[restricted_zone],
    )
    # Must immediately trigger RESTRICTED_ZONE_ENTRY
    assert len(events1) == 1
    assert events1[0].event_type == EventType.RESTRICTED_ZONE_ENTRY
    assert "unauthorized entry into restricted zone" in events1[0].trigger_reason
    assert events1[0].track_id == 17

    # Frame 2: Person 17 stays stationary in zone for 6 seconds (exceeding 5s loitering threshold)
    feat2 = analyzer.update_track(track_id=17, timestamp=16.0, center_x=151.0, center_y=150.0, frame_id=60)
    events2, _ = engine.evaluate_frame(
        video_id=1,
        features=feat2,
        behaviour=BehaviourType.STATIONARY,
        active_zones=[restricted_zone],
    )
    # Must detect LOITERING
    loitering_events = [e for e in events2 if e.event_type == EventType.LOITERING]
    assert len(loitering_events) == 1
    loitering_evt = loitering_events[0]
    assert loitering_evt.track_id == 17
    assert loitering_evt.duration == 6.0
    assert "exceeding threshold of 5.0s" in loitering_evt.trigger_reason
