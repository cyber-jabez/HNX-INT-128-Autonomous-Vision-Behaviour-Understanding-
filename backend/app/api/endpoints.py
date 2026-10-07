import os
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, BackgroundTasks, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.entities import VideoStatus
from app.schemas.common import VideoCreate, VideoResponse, EventCreate, EventResponse, APIResponse
from app.schemas.pipeline import ProcessVideoRequest, ProcessVideoResponse
from app.schemas.detection import DetectionCreate, DetectionResponse, DetectionListResponse
from app.schemas.track import (
    TrackPointResponse,
    TrackedObjectResponse,
    TrackWithHistoryResponse,
    TrackListResponse,
)
from app.schemas.intelligence import (
    ZoneCreate,
    ZoneUpdate,
    ZoneResponse,
    BehaviourIntervalResponse,
    EventDetailedResponse,
)
from app.schemas.status import VideoStatusResponse
from app.services.video_service import VideoService, EventService
from app.services.video_pipeline import process_video
from app.services.track_service import TrackService
from app.services.zone_service import ZoneService
from app.services.intelligence_service import IntelligenceService
from app.services.processing_service import EndToEndProcessingService
from app.services.progress_tracker import VideoProgressTracker
from app.vision.detection_service import DetectionService
from app.utils.video_meta import extract_video_metadata, VideoProcessingError
from app.utils.stream import stream_video_file
from app.utils.logger import logger

router = APIRouter()


# -------------------------------------------------------------
# Video Upload & Management Endpoints
# -------------------------------------------------------------

@router.post("/videos", response_model=VideoResponse, status_code=status.HTTP_201_CREATED)
async def upload_video(
    file: Optional[UploadFile] = File(None),
    video: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    """
    Upload a video (MP4, AVI, MOV, MKV).
    Validates extension, MIME type, max file size, and file integrity via OpenCV.
    Extracts metadata: duration, fps, width, height, frame_count.
    Stores file in uploads/ and persists record with status 'UPLOADED'.
    """
    uploaded_file = file or video
    if not uploaded_file:
        raise HTTPException(status_code=400, detail="No video file provided in form-data.")

    original_filename = uploaded_file.filename or "unknown_video.mp4"
    file_ext = Path(original_filename).suffix.lower()

    # 1. Validate File Extension
    if file_ext not in settings.ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported video format '{file_ext}'. Allowed formats: "
                f"{', '.join(settings.ALLOWED_VIDEO_EXTENSIONS)}"
            ),
        )

    # 2. Validate MIME Type if provided
    valid_content_types = [
        "video/mp4",
        "video/x-msvideo",
        "video/avi",
        "video/quicktime",
        "video/x-matroska",
        "application/octet-stream",  # Browsers/tools sometimes send octet-stream
    ]
    if file.content_type and file.content_type.lower() not in valid_content_types:
        logger.warning(f"Unrecognized content-type header: {file.content_type}")

    # Prepare safe destination path
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    unique_filename = f"{uuid.uuid4().hex[:12]}_{original_filename}"
    saved_filepath = settings.UPLOAD_DIR / unique_filename

    # 3. Stream to disk and enforce Maximum File Size
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    total_written = 0

    try:
        with open(saved_filepath, "wb") as buffer:
            while chunk := await uploaded_file.read(1024 * 1024):  # 1MB chunks
                total_written += len(chunk)
                if total_written > max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB.",
                    )
                buffer.write(chunk)
    except Exception as e:
        # Cleanup partial upload on failure
        if saved_filepath.exists():
            os.remove(saved_filepath)
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Failed during file upload streaming: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error occurred while uploading the file.",
        )

    # 4. Check for Corruption and Extract Metadata using OpenCV
    try:
        metadata = extract_video_metadata(saved_filepath)
    except VideoProcessingError as ve:
        # File is corrupt or unreadable
        if saved_filepath.exists():
            os.remove(saved_filepath)
        logger.warning(f"Rejected corrupted or invalid video '{original_filename}': {ve}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Video file verification failed: {str(ve)}",
        )
    except Exception as ex:
        if saved_filepath.exists():
            os.remove(saved_filepath)
        logger.error(f"Unexpected error validating video: {ex}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while validating video file integrity.",
        )

    # 5. Persist to Database with UPLOADED status
    video_create = VideoCreate(
        filename=original_filename,
        filepath=str(saved_filepath),
        duration=metadata["duration"],
        fps=metadata["fps"],
        width=metadata["width"],
        height=metadata["height"],
        frame_count=metadata["frame_count"],
        status=VideoStatus.UPLOADED,
    )

    video_record = VideoService.create_video(db, video_create)
    return video_record


@router.get("/videos", response_model=List[VideoResponse])
def list_videos(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """List all registered videos."""
    return VideoService.list_videos(db, skip=skip, limit=limit)


@router.get("/videos/{video_id}", response_model=VideoResponse)
def get_video(video_id: int, db: Session = Depends(get_db)):
    """Get video details and metadata by ID."""
    video = VideoService.get_video(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video


@router.get("/videos/{video_id}/stream")
def stream_video(video_id: int, request: Request, db: Session = Depends(get_db)):
    """
    Stream video by ID supporting HTTP 206 Partial Content (seeking/scrubbing).
    """
    video = VideoService.get_video(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    file_path = Path(video.filepath)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video file does not exist on disk.",
        )

    return stream_video_file(file_path, request)


@router.delete("/videos/{video_id}", response_model=APIResponse)
def delete_video(video_id: int, db: Session = Depends(get_db)):
    """
    Delete video record and associated file from storage.
    """
    video = VideoService.get_video(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Remove file on disk if exists
    try:
        file_path = Path(video.filepath)
        if file_path.is_file():
            file_path.unlink()
            logger.info(f"Removed video file on disk: {file_path}")
    except Exception as e:
        logger.warning(f"Failed to delete video file on disk: {e}")

    # Remove database record (cascades to tracks, detections, events)
    VideoService.delete_video(db, video_id)

    return APIResponse(
        success=True,
        message=f"Video ID {video_id} and associated file successfully deleted.",
    )


@router.post("/videos/{video_id}/process", response_model=ProcessVideoResponse)
def trigger_video_processing(
    video_id: int,
    background_tasks: BackgroundTasks,
    req: Optional[ProcessVideoRequest] = None,
    db: Session = Depends(get_db),
):
    """
    Trigger the complete end-to-end video processing pipeline in the background:
    Detection -> Tracking -> Kinematics -> Behaviour -> Zones -> Events -> Evidence -> LLM
    """
    video = VideoService.get_video(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    target_fps = req.target_fps if req else None

    # Set initial QUEUED state
    VideoProgressTracker.set_stage(video_id, VideoStatus.QUEUED, 5, "QUEUED")

    # Enqueue complete end-to-end pipeline in background
    background_tasks.add_task(
        EndToEndProcessingService.execute_pipeline,
        video_id=video_id,
        target_fps=target_fps,
    )

    return ProcessVideoResponse(
        success=True,
        video_id=video_id,
        message="End-to-end video processing pipeline initiated in background.",
        status=VideoStatus.QUEUED.value,
    )


@router.get("/videos/{video_id}/status", response_model=VideoStatusResponse)
def get_video_processing_status(
    video_id: int,
    db: Session = Depends(get_db),
):
    """
    Retrieve real-time processing status, progress percentage, and current pipeline stage.
    """
    video = VideoService.get_video(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    progress_info = VideoProgressTracker.get_progress(video_id, fallback_db_status=video.status)
    return VideoStatusResponse(
        video_id=video_id,
        status=progress_info["status"],
        progress=progress_info["progress"],
        current_stage=progress_info["current_stage"],
        details=progress_info.get("details", {}),
    )


# -------------------------------------------------------------
# Detection Retrieval Endpoints (Phase 4)
# -------------------------------------------------------------

@router.get("/videos/{video_id}/detections", response_model=DetectionListResponse)
def get_video_detections(
    video_id: int,
    class_name: Optional[str] = None,
    min_confidence: Optional[float] = None,
    frame_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """
    Retrieve detections for a specific video with filtering by class_name,
    min_confidence, frame_id, with pagination.
    """
    video = VideoService.get_video(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    total = DetectionService.count_detections_by_video(db, video_id, class_name=class_name)
    items = DetectionService.get_detections_by_video(
        db,
        video_id=video_id,
        class_name=class_name,
        min_confidence=min_confidence,
        frame_id=frame_id,
        skip=skip,
        limit=limit,
    )
    return DetectionListResponse(
        video_id=video_id,
        total_detections=total,
        detections=items,
    )


# -------------------------------------------------------------
# Object Tracking Endpoints (Phase 5)
# -------------------------------------------------------------

@router.get("/videos/{video_id}/tracks")
def get_video_tracks(
    video_id: int,
    timestamp: Optional[float] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """
    Retrieve tracked objects for a video (persistent track IDs, time ranges),
    or track detections active at the specified timestamp.
    """
    video = VideoService.get_video(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    if timestamp is not None:
        # Return tracks active around this timestamp
        return TrackService.get_tracks_at_timestamp(db, video_id, timestamp=timestamp)

    total = TrackService.count_tracks_by_video(db, video_id)
    items = TrackService.get_tracks_by_video(db, video_id, skip=skip, limit=limit)
    return TrackListResponse(video_id=video_id, total_tracks=total, tracks=items)


@router.get("/tracks/{track_id}", response_model=TrackedObjectResponse)
def get_track_detail(
    track_id: int,
    db: Session = Depends(get_db),
):
    """
    Retrieve tracked object details by Track ID.
    """
    obj = TrackService.get_track_by_id(db, track_id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"Track ID {track_id} not found")
    return obj


@router.get("/tracks/{track_id}/history", response_model=List[TrackPointResponse])
def get_track_history(
    track_id: int,
    skip: int = 0,
    limit: int = 500,
    db: Session = Depends(get_db),
):
    """
    Retrieve spatial trajectory history (frame_id, timestamp, x, y, width, height, confidence)
    for a persistent Track ID.
    """
    obj = TrackService.get_track_by_id(db, track_id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"Track ID {track_id} not found")

    points = TrackService.get_track_history(db, track_id, skip=skip, limit=limit)
    return points


# -------------------------------------------------------------
# Spatial Zone Endpoints (Phase 8)
# -------------------------------------------------------------

@router.post("/videos/{video_id}/zones", response_model=ZoneResponse, status_code=status.HTTP_201_CREATED)
def create_video_zone(
    video_id: int,
    zone_in: ZoneCreate,
    db: Session = Depends(get_db),
):
    """Create a polygon zone associated with a video."""
    video = VideoService.get_video(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return ZoneService.create_zone(db, video_id, zone_in)


@router.get("/videos/{video_id}/zones", response_model=List[ZoneResponse])
def get_video_zones(
    video_id: int,
    db: Session = Depends(get_db),
):
    """Retrieve all polygon zones defined for a video."""
    video = VideoService.get_video(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return ZoneService.get_zones_by_video(db, video_id)


@router.put("/zones/{zone_id}", response_model=ZoneResponse)
def update_zone(
    zone_id: int,
    zone_update: ZoneUpdate,
    db: Session = Depends(get_db),
):
    """Update name, zone_type, or polygon coordinates of a zone."""
    updated = ZoneService.update_zone(db, zone_id, zone_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Zone not found")
    return updated


@router.delete("/zones/{zone_id}", response_model=APIResponse)
def delete_zone(
    zone_id: int,
    db: Session = Depends(get_db),
):
    """Delete a spatial zone."""
    deleted = ZoneService.delete_zone(db, zone_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Zone not found")
    return APIResponse(success=True, message=f"Zone ID {zone_id} deleted successfully.")


# -------------------------------------------------------------
# Anomaly & Event Detection Endpoints (Phase 9)
# -------------------------------------------------------------

@router.get("/videos/{video_id}/events", response_model=List[EventDetailedResponse])
def get_video_events(
    video_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Retrieve all detected events (LOITERING, RESTRICTED_ZONE_ENTRY) for a video."""
    video = VideoService.get_video(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return IntelligenceService.get_events_by_video(db, video_id, skip=skip, limit=limit)


@router.get("/events/{event_id}", response_model=EventDetailedResponse)
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
):
    """Retrieve details for a specific event by ID."""
    evt = IntelligenceService.get_event_by_id(db, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
    return evt


# -------------------------------------------------------------
# Behaviour Endpoints (Phase 15)
# -------------------------------------------------------------

@router.get("/videos/{video_id}/behaviours", response_model=List[BehaviourIntervalResponse])
def get_video_behaviours(
    video_id: int,
    db: Session = Depends(get_db),
):
    """Retrieve all behaviour intervals for tracked entities in a video."""
    video = VideoService.get_video(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    from app.models.entities import Behaviour, TrackedObject
    # Join with tracked_objects to get behaviours belonging to this video
    items = (
        db.query(Behaviour)
        .join(TrackedObject, Behaviour.track_id == TrackedObject.track_id)
        .filter(TrackedObject.video_id == video_id)
        .order_by(Behaviour.start_time.asc())
        .all()
    )
    return items


@router.get("/tracks/{track_id}/behaviours", response_model=List[BehaviourIntervalResponse])
def get_track_behaviours(
    track_id: int,
    db: Session = Depends(get_db),
):
    """Retrieve behaviour intervals for a specific track ID."""
    from app.models.entities import Behaviour
    items = db.query(Behaviour).filter(Behaviour.track_id == track_id).order_by(Behaviour.start_time.asc()).all()
    return items


# -------------------------------------------------------------
# Evidence Clip Streaming & Retrieval (Phase 11 & Phase 15)
# -------------------------------------------------------------

@router.get("/events/{event_id}/evidence")
def get_event_evidence(
    event_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Retrieve or stream the generated evidence video clip for a specific event.
    """
    evt = IntelligenceService.get_event_by_id(db, event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")

    if not evt.evidence_image_path or not Path(evt.evidence_image_path).exists():
        # Attempt just-in-time generation if source video exists
        video = VideoService.get_video(db, evt.video_id)
        if video and Path(video.filepath).exists():
            from app.events.context import EventContext
            from app.evidence.generator import evidence_generator
            ctx = EventContext(
                event_id=evt.id,
                video_id=evt.video_id,
                track_id=evt.track_id,
                event_type=evt.event_type,
                start_time=evt.start_time,
                end_time=evt.end_time,
                duration=evt.duration or 0.0,
                zone=evt.spatial_zone,
                severity=evt.severity,
                confidence=evt.confidence,
                trigger_reason=evt.trigger_reason or "",
                location_x=evt.location_x,
                location_y=evt.location_y,
            )
            clip_path = evidence_generator.generate_clip(
                video_path=video.filepath,
                context=ctx,
                video_duration=video.duration,
                video_fps=video.fps,
            )
            evt.evidence_image_path = str(clip_path)
            db.commit()
        else:
            raise HTTPException(status_code=404, detail="Evidence clip not available for this event.")

    return stream_video_file(evt.evidence_image_path, request)


@router.post("/events", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def record_event(event: EventCreate, db: Session = Depends(get_db)):
    """Record a detected behaviour or anomaly event."""
    return EventService.create_event(db, event)


@router.get("/events", response_model=List[EventResponse])
def list_events(video_id: Optional[int] = None, skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """List detected events across videos or filtered by video ID."""
    return EventService.list_events(db, video_id=video_id, skip=skip, limit=limit)
