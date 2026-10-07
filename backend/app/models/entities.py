import enum
import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from app.database import Base


class VideoStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    DETECTING = "DETECTING"
    TRACKING = "TRACKING"
    ANALYZING = "ANALYZING"
    GENERATING_EVENTS = "GENERATING_EVENTS"
    GENERATING_EVIDENCE = "GENERATING_EVIDENCE"
    GENERATING_EXPLANATIONS = "GENERATING_EXPLANATIONS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    filepath = Column(String(512), nullable=False)
    duration = Column(Float, nullable=True)  # in seconds
    fps = Column(Float, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    frame_count = Column(Integer, nullable=True)
    status = Column(String(50), default=VideoStatus.UPLOADED.value, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    detections = relationship("Detection", back_populates="video", cascade="all, delete-orphan")
    tracked_objects = relationship("TrackedObject", back_populates="video", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="video", cascade="all, delete-orphan")
    zones = relationship("Zone", back_populates="video", cascade="all, delete-orphan")


class TrackedObject(Base):
    __tablename__ = "tracked_objects"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)
    track_id = Column(Integer, nullable=False, index=True)
    object_type = Column(String(100), nullable=False)
    first_seen = Column(Float, nullable=False)
    last_seen = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    video = relationship("Video", back_populates="tracked_objects")
    points = relationship("TrackPoint", back_populates="tracked_object", cascade="all, delete-orphan", primaryjoin="TrackPoint.track_id==TrackedObject.track_id", foreign_keys="TrackPoint.track_id")
    behaviours = relationship("Behaviour", back_populates="tracked_object", cascade="all, delete-orphan", primaryjoin="Behaviour.track_id==TrackedObject.track_id", foreign_keys="Behaviour.track_id")
    events = relationship("Event", back_populates="tracked_object", primaryjoin="Event.track_id==TrackedObject.track_id", foreign_keys="Event.track_id")


class TrackPoint(Base):
    __tablename__ = "track_points"

    id = Column(Integer, primary_key=True, index=True)
    track_id = Column(Integer, ForeignKey("tracked_objects.track_id", ondelete="CASCADE"), nullable=False, index=True)
    frame_id = Column(Integer, nullable=False, index=True)
    timestamp = Column(Float, nullable=False)
    x = Column(Float, nullable=False)  # center_x
    y = Column(Float, nullable=False)  # center_y
    width = Column(Float, nullable=False)
    height = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    tracked_object = relationship("TrackedObject", back_populates="points", primaryjoin="TrackPoint.track_id==TrackedObject.track_id", foreign_keys=[track_id])


class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)
    frame_id = Column(Integer, nullable=False, index=True)
    timestamp = Column(Float, nullable=False)
    class_name = Column(String(100), nullable=False)
    class_id = Column(Integer, nullable=False)
    confidence = Column(Float, nullable=False)
    x1 = Column(Float, nullable=False)
    y1 = Column(Float, nullable=False)
    x2 = Column(Float, nullable=False)
    y2 = Column(Float, nullable=False)
    track_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    video = relationship("Video", back_populates="detections")


class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    zone_type = Column(String(100), nullable=False)  # e.g., Safe Zone, Restricted Zone, Machine Area
    polygon_coordinates = Column(JSON, nullable=False)  # List of [x, y] points [[x1, y1], [x2, y2], ...]
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    video = relationship("Video", back_populates="zones")
    events = relationship("Event", back_populates="zone")


class TemporalFeature(Base):
    __tablename__ = "temporal_features"

    id = Column(Integer, primary_key=True, index=True)
    track_id = Column(Integer, ForeignKey("tracked_objects.track_id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(Float, nullable=False)
    speed = Column(Float, nullable=False)  # px/s
    direction = Column(Float, nullable=False)  # degrees [0, 360)
    acceleration = Column(Float, nullable=False)  # px/s^2
    distance = Column(Float, nullable=False)  # cumulative distance travelled
    stationary_duration = Column(Float, nullable=False)  # seconds
    zone = Column(String(100), nullable=True)  # current zone name if any
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Behaviour(Base):
    __tablename__ = "behaviours"

    id = Column(Integer, primary_key=True, index=True)
    track_id = Column(Integer, ForeignKey("tracked_objects.track_id", ondelete="CASCADE"), nullable=False, index=True)
    behaviour = Column(String(50), nullable=False)  # WALKING, STANDING, STATIONARY, RUNNING
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    duration = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    tracked_object = relationship("TrackedObject", back_populates="behaviours", primaryjoin="Behaviour.track_id==TrackedObject.track_id", foreign_keys=[track_id])


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)
    track_id = Column(Integer, ForeignKey("tracked_objects.track_id", ondelete="SET NULL"), nullable=True, index=True)
    event_type = Column(String(100), nullable=False, index=True)  # LOITERING, RESTRICTED_ZONE_ENTRY, etc.
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=True)
    duration = Column(Float, nullable=True)
    zone_id = Column(Integer, ForeignKey("zones.id", ondelete="SET NULL"), nullable=True, index=True)
    location_x = Column(Float, nullable=True)
    location_y = Column(Float, nullable=True)
    severity = Column(String(50), default="medium", index=True)  # low, medium, high, critical
    confidence = Column(Float, default=1.0)
    trigger_reason = Column(Text, nullable=True)
    status = Column(String(50), default="ACTIVE")
    spatial_zone = Column(String(100), nullable=True)
    evidence_image_path = Column(String(512), nullable=True)
    explanation = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    video = relationship("Video", back_populates="events")
    zone = relationship("Zone", back_populates="events")
    tracked_object = relationship("TrackedObject", back_populates="events", primaryjoin="Event.track_id==TrackedObject.track_id", foreign_keys=[track_id])
    evidence_files = relationship("Evidence", back_populates="event", cascade="all, delete-orphan")


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String(512), nullable=False)
    clip_start_time = Column(Float, nullable=False)
    clip_end_time = Column(Float, nullable=False)
    duration = Column(Float, nullable=False)
    has_hud_overlay = Column(Integer, default=1)
    file_size_bytes = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    event = relationship("Event", back_populates="evidence_files")
