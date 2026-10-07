import os
import time
from pathlib import Path
from typing import Optional, Dict, Any, Generator, Callable
import cv2

from app.database import SessionLocal
from app.models.entities import Video, VideoStatus, Event, Zone
from app.services.pipeline_types import FrameData, DetectionResult, TrackResult, PipelineEvent
from app.services.pipeline_stages import (
    DetectorStage,
    TrackerStage,
    BehaviourAnalyzerStage,
    PassthroughDetector,
    PassthroughTracker,
    PassthroughAnalyzer,
)
from app.services.integrated_pipeline_stage import BehaviourAndEventPipelineStage
from app.services.intelligence_service import IntelligenceService
from app.vision.detector import YOLODetector
from app.vision.tracker import ByteTracker
from app.utils.logger import logger


class VideoProcessingPipeline:
    """
    Reusable video processing engine.
    Sequentially processes frames, tracks original FPS and elapsed video time,
    supports configurable target processing FPS (frame skipping/sampling),
    safely handles corrupted frames, and releases OpenCV resources cleanly.
    """

    def __init__(
        self,
        detector: Optional[DetectorStage] = None,
        tracker: Optional[TrackerStage] = None,
        analyzer: Optional[BehaviourAnalyzerStage] = None,
        target_fps: Optional[float] = None,
        max_corrupted_frame_streak: int = 30,
    ):
        self.detector = detector or PassthroughDetector()
        self.tracker = tracker or PassthroughTracker()
        self.analyzer = analyzer or PassthroughAnalyzer()
        self.target_fps = target_fps
        self.max_corrupted_streak = max_corrupted_frame_streak

    def frame_generator(
        self,
        video_path: Path | str,
        target_fps: Optional[float] = None,
    ) -> Generator[FrameData, None, None]:
        """
        Safely open video, yield sequential FrameData with accurate timestamps,
        subsample according to target_fps if specified, skip corrupted frames safely,
        and guarantee resource release.
        """
        path_str = str(video_path)
        cap = cv2.VideoCapture(path_str)

        if not cap.isOpened():
            raise RuntimeError(f"Failed to open video source: {path_str}")

        try:
            original_fps = float(cap.get(cv2.CAP_PROP_FPS) or 25.0)
            if original_fps <= 0:
                original_fps = 25.0

            step_interval = 1
            effective_target_fps = target_fps or self.target_fps
            if effective_target_fps and 0 < effective_target_fps < original_fps:
                step_interval = max(1, round(original_fps / effective_target_fps))

            frame_index = 0
            corrupted_streak = 0

            while True:
                ret, frame = cap.read()
                if not ret:
                    # Video stream completed or encountered read failure
                    break

                if frame is None or frame.size == 0:
                    corrupted_streak += 1
                    logger.warning(
                        f"Corrupted frame encountered at index {frame_index} (streak {corrupted_streak})"
                    )
                    if corrupted_streak >= self.max_corrupted_streak:
                        logger.error(f"Exceeded maximum corrupted frames streak ({self.max_corrupted_streak}).")
                        break
                    frame_index += 1
                    continue

                # Reset corruption streak upon receiving valid frame
                corrupted_streak = 0

                # Accurate timestamp based on original video FPS and frame index
                timestamp = frame_index / original_fps

                # Process this frame if it matches sampling step interval
                if frame_index % step_interval == 0:
                    yield FrameData(
                        frame_index=frame_index,
                        timestamp=round(timestamp, 4),
                        frame=frame,
                        is_keyframe=(frame_index % int(original_fps) == 0),
                    )

                frame_index += 1
        finally:
            cap.release()
            logger.debug(f"Video capture resource safely released for {path_str}")

    def process_file(
        self,
        video_path: Path | str,
        on_frame_processed: Optional[Callable[[FrameData, Dict[str, Any]], None]] = None,
    ) -> Dict[str, Any]:
        """
        Execute the full modular pipeline on a given video file:
        Frame -> Detection -> Tracking -> Analysis -> Event Generation
        """
        start_time = time.time()
        processed_frames_count = 0
        all_events: list[PipelineEvent] = []

        for frame_data in self.frame_generator(video_path):
            # 1. Detection Stage
            detections = self.detector.detect(frame_data)

            # 2. Tracking Stage
            tracks = self.tracker.track(frame_data, detections)

            # 3. Behaviour / Spatial Zone Analysis Stage
            events = self.analyzer.analyze(frame_data, tracks)
            if events:
                all_events.extend(events)

            processed_frames_count += 1
            if on_frame_processed:
                on_frame_processed(
                    frame_data,
                    {"detections": detections, "tracks": tracks, "events": events},
                )

        elapsed = time.time() - start_time
        return {
            "processed_frames": processed_frames_count,
            "events_count": len(all_events),
            "events": all_events,
            "elapsed_seconds": round(elapsed, 3),
        }


def process_video(
    video_id: int,
    target_fps: Optional[float] = None,
    pipeline: Optional[VideoProcessingPipeline] = None,
) -> Dict[str, Any]:
    """
    Standard reusable service interface: process_video(video_id).
    Queries video from DB, updates status to PROCESSING, runs pipeline,
    records any detected events into DB, and marks status as COMPLETED (or FAILED).
    """
    db = SessionLocal()
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            logger.error(f"Cannot process video: Video ID {video_id} not found in database.")
            return {"success": False, "error": f"Video {video_id} not found"}

        video_path = Path(video.filepath)
        if not video_path.is_file():
            video.status = VideoStatus.FAILED.value
            db.commit()
            logger.error(f"Video file not found at {video_path}")
            return {"success": False, "error": "Video file missing on disk"}

        # Update status to PROCESSING
        video.status = VideoStatus.PROCESSING.value
        db.commit()
        logger.info(f"Started pipeline processing for video ID {video_id} ({video.filename})")

        # Query active zones configured for this video
        active_zones = db.query(Zone).filter(Zone.video_id == video_id).all()

        analyzer_stage = BehaviourAndEventPipelineStage(video_id=video_id, zones=active_zones)

        proc_engine = pipeline or VideoProcessingPipeline(
            target_fps=target_fps,
            detector=YOLODetector(),
            tracker=ByteTracker(),
            analyzer=analyzer_stage,
        )

        # Hook to persist detections and tracks per frame into database
        def on_frame(frame_data: FrameData, stage_outputs: Dict[str, Any]):
            detections = stage_outputs.get("detections", [])
            tracks = stage_outputs.get("tracks", [])

            if detections:
                from app.vision.detection_service import DetectionService
                DetectionService.bulk_save_detections(
                    db=db,
                    video_id=video_id,
                    detections=detections,
                    frame_id=frame_data.frame_index,
                    timestamp=frame_data.timestamp,
                )

            if tracks:
                from app.services.track_service import TrackService
                TrackService.record_tracks_for_frame(
                    db=db,
                    video_id=video_id,
                    tracks=tracks,
                    frame_id=frame_data.frame_index,
                    timestamp=frame_data.timestamp,
                )

        result = proc_engine.process_file(video_path, on_frame_processed=on_frame)

        # Flush any open behaviour intervals at the end of processing
        final_intervals = analyzer_stage.behaviour_classifier.state_manager.flush_active()
        for interval in final_intervals:
            IntelligenceService.save_behaviour_interval(db, interval)

        # Persist generated events if any
        for evt in result["events"]:
            db_event = Event(
                video_id=video.id,
                track_id=evt.metadata.get("track_id") if evt.metadata else None,
                event_type=evt.event_type,
                severity=evt.severity,
                start_time=evt.start_time,
                end_time=evt.end_time,
                duration=(evt.end_time - evt.start_time) if evt.end_time else None,
                zone_id=evt.metadata.get("zone_id") if evt.metadata else None,
                location_x=evt.metadata.get("location_x") if evt.metadata else None,
                location_y=evt.metadata.get("location_y") if evt.metadata else None,
                confidence=evt.metadata.get("confidence", 1.0) if evt.metadata else 1.0,
                trigger_reason=evt.explanation,
                spatial_zone=evt.spatial_zone,
                evidence_image_path=evt.evidence_image_path,
                explanation=evt.explanation,
                metadata_json=evt.metadata,
            )
            db.add(db_event)
        db.commit()

        # Mark status as COMPLETED
        video.status = VideoStatus.COMPLETED.value
        db.commit()
        logger.info(
            f"Successfully completed video pipeline for video ID {video_id}: "
            f"{result['processed_frames']} frames processed in {result['elapsed_seconds']}s"
        )
        return {
            "success": True,
            "video_id": video_id,
            "processed_frames": result["processed_frames"],
            "events_count": result["events_count"],
            "elapsed_seconds": result["elapsed_seconds"],
        }
    except Exception as e:
        logger.error(f"Exception during processing of video {video_id}: {e}", exc_info=True)
        try:
            video = db.query(Video).filter(Video.id == video_id).first()
            if video:
                video.status = VideoStatus.FAILED.value
                db.commit()
        except Exception:
            pass
        return {"success": False, "error": str(e)}
    finally:
        db.close()
