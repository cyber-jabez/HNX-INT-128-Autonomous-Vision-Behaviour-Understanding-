import time
from pathlib import Path
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.entities import Video, VideoStatus, Event, Zone
from app.services.pipeline_types import FrameData, DetectionResult, TrackResult, PipelineEvent
from app.services.video_pipeline import VideoProcessingPipeline
from app.services.integrated_pipeline_stage import BehaviourAndEventPipelineStage
from app.services.intelligence_service import IntelligenceService
from app.services.track_service import TrackService
from app.services.progress_tracker import VideoProgressTracker
from app.vision.detector import YOLODetector
from app.vision.tracker import ByteTracker
from app.vision.detection_service import DetectionService
from app.events.context import EventContext
from app.evidence.generator import evidence_generator
from app.explanation.llm import llm_explanation_engine
from app.utils.logger import logger


class EndToEndProcessingService:
    """
    Coordinator coordinating the entire multi-phase processing pipeline:
    UPLOAD VIDEO
         ↓
    VIDEO METADATA
         ↓
    FRAME PROCESSING
         ↓
    YOLO DETECTION
         ↓
    BYTE TRACK
         ↓
    TRACK HISTORY
         ↓
    TEMPORAL FEATURES
         ↓
    BEHAVIOUR RECOGNITION
         ↓
    ZONE ANALYSIS
         ↓
    ANOMALY / EVENT ENGINE
         ↓
    EVENT CONTEXT
         ↓
    EVIDENCE GENERATION
         ↓
    LLM EXPLANATION
         ↓
    DATABASE PERSISTENCE
         ↓
    COMPLETED
    """

    @classmethod
    def execute_pipeline(
        cls,
        video_id: int,
        target_fps: Optional[float] = None,
        generate_evidence: bool = True,
        generate_explanations: bool = True,
    ) -> Dict[str, Any]:
        db: Session = SessionLocal()
        start_clock = time.time()

        try:
            video = db.query(Video).filter(Video.id == video_id).first()
            if not video:
                logger.error(f"Cannot process video: ID {video_id} not found.")
                return {"success": False, "error": "Video not found"}

            video_path = Path(video.filepath)
            if not video_path.is_file():
                video.status = VideoStatus.FAILED.value
                db.commit()
                return {"success": False, "error": "Video file missing on disk"}

            # Stage 1: QUEUED
            video.status = VideoStatus.QUEUED.value
            db.commit()
            VideoProgressTracker.set_stage(video_id, VideoStatus.QUEUED, 5, "QUEUED")

            # Stage 2: DETECTING & TRACKING Setup
            video.status = VideoStatus.DETECTING.value
            db.commit()
            VideoProgressTracker.set_stage(video_id, VideoStatus.DETECTING, 25, "OBJECT_DETECTION")

            active_zones = db.query(Zone).filter(Zone.video_id == video_id).all()
            analyzer_stage = BehaviourAndEventPipelineStage(video_id=video_id, zones=active_zones)

            proc_engine = VideoProcessingPipeline(
                target_fps=target_fps,
                detector=YOLODetector(),
                tracker=ByteTracker(),
                analyzer=analyzer_stage,
            )

            # Frame hook saving detections and tracking points
            def on_frame(frame_data: FrameData, stage_outputs: Dict[str, Any]):
                detections = stage_outputs.get("detections", [])
                tracks = stage_outputs.get("tracks", [])

                if detections:
                    DetectionService.bulk_save_detections(
                        db=db,
                        video_id=video_id,
                        detections=detections,
                        frame_id=frame_data.frame_index,
                        timestamp=frame_data.timestamp,
                    )

                if tracks:
                    TrackService.record_tracks_for_frame(
                        db=db,
                        video_id=video_id,
                        tracks=tracks,
                        frame_id=frame_data.frame_index,
                        timestamp=frame_data.timestamp,
                    )

            # Stage 3: TRACKING & ANALYZING
            video.status = VideoStatus.ANALYZING.value
            db.commit()
            VideoProgressTracker.set_stage(video_id, VideoStatus.ANALYZING, 55, "BEHAVIOUR_AND_ZONE_ANALYSIS")

            pipeline_result = proc_engine.process_file(video_path, on_frame_processed=on_frame)

            # Flush behaviour intervals
            final_intervals = analyzer_stage.behaviour_classifier.state_manager.flush_active()
            for interval in final_intervals:
                IntelligenceService.save_behaviour_interval(db, interval)

            # Stage 4: GENERATING_EVENTS
            video.status = VideoStatus.GENERATING_EVENTS.value
            db.commit()
            VideoProgressTracker.set_stage(video_id, VideoStatus.GENERATING_EVENTS, 75, "ANOMALY_EVENT_CREATION")

            persisted_events: List[Event] = []
            for evt in pipeline_result["events"]:
                duration_val = (evt.end_time - evt.start_time) if evt.end_time else 0.0
                db_event = Event(
                    video_id=video.id,
                    track_id=evt.metadata.get("track_id") if evt.metadata else None,
                    event_type=evt.event_type,
                    severity=evt.severity,
                    start_time=evt.start_time,
                    end_time=evt.end_time,
                    duration=round(duration_val, 2),
                    zone_id=evt.metadata.get("zone_id") if evt.metadata else None,
                    location_x=evt.metadata.get("location_x") if evt.metadata else None,
                    location_y=evt.metadata.get("location_y") if evt.metadata else None,
                    confidence=evt.metadata.get("confidence", 1.0) if evt.metadata else 1.0,
                    trigger_reason=evt.explanation,
                    spatial_zone=evt.spatial_zone,
                    status="ACTIVE",
                    metadata_json=evt.metadata,
                )
                db.add(db_event)
                db.flush()
                persisted_events.append(db_event)

            # Stage 5: GENERATING_EVIDENCE
            if generate_evidence and persisted_events:
                video.status = VideoStatus.GENERATING_EVIDENCE.value
                db.commit()
                VideoProgressTracker.set_stage(video_id, VideoStatus.GENERATING_EVIDENCE, 85, "EVIDENCE_EXTRACTION")

                for db_event in persisted_events:
                    try:
                        ctx = EventContext(
                            event_id=db_event.id,
                            video_id=video_id,
                            track_id=db_event.track_id,
                            event_type=db_event.event_type,
                            start_time=db_event.start_time,
                            end_time=db_event.end_time,
                            duration=db_event.duration or 0.0,
                            zone=db_event.spatial_zone,
                            severity=db_event.severity,
                            confidence=db_event.confidence,
                            trigger_reason=db_event.trigger_reason or "",
                            location_x=db_event.location_x,
                            location_y=db_event.location_y,
                        )
                        clip_path = evidence_generator.generate_clip(
                            video_path=video_path,
                            context=ctx,
                            video_duration=video.duration,
                            video_fps=video.fps,
                        )
                        db_event.evidence_image_path = str(clip_path)
                    except Exception as ev_err:
                        logger.warning(f"Failed generating evidence clip for event {db_event.id}: {ev_err}")

            # Stage 6: GENERATING_EXPLANATIONS
            if generate_explanations and persisted_events:
                video.status = VideoStatus.GENERATING_EXPLANATIONS.value
                db.commit()
                VideoProgressTracker.set_stage(video_id, VideoStatus.GENERATING_EXPLANATIONS, 95, "LLM_EXPLANATION")

                for db_event in persisted_events:
                    try:
                        ctx_dict = {
                            "event_id": db_event.id,
                            "video_id": video_id,
                            "track_id": db_event.track_id,
                            "event_type": db_event.event_type,
                            "start_time": db_event.start_time,
                            "end_time": db_event.end_time,
                            "duration": db_event.duration,
                            "zone": db_event.spatial_zone,
                            "severity": db_event.severity,
                            "confidence": db_event.confidence,
                            "trigger_reason": db_event.trigger_reason,
                        }
                        explanation_text = llm_explanation_engine.explain_event(ctx_dict)
                        db_event.explanation = explanation_text
                    except Exception as expl_err:
                        logger.warning(f"Explanation synthesis failed for event {db_event.id}: {expl_err}")

            # Stage 7: COMPLETED
            video.status = VideoStatus.COMPLETED.value
            db.commit()
            elapsed_tot = round(time.time() - start_clock, 2)
            VideoProgressTracker.set_stage(
                video_id,
                VideoStatus.COMPLETED,
                100,
                "FINISHED",
                {"processed_frames": pipeline_result["processed_frames"], "events": len(persisted_events)},
            )

            logger.info(
                f"End-to-end pipeline finished for video {video_id}: "
                f"{pipeline_result['processed_frames']} frames, {len(persisted_events)} events in {elapsed_tot}s"
            )

            return {
                "success": True,
                "video_id": video_id,
                "processed_frames": pipeline_result["processed_frames"],
                "events_count": len(persisted_events),
                "elapsed_seconds": elapsed_tot,
            }
        except Exception as e:
            logger.error(f"Error in EndToEndProcessingService for video {video_id}: {e}", exc_info=True)
            try:
                vid = db.query(Video).filter(Video.id == video_id).first()
                if vid:
                    vid.status = VideoStatus.FAILED.value
                    db.commit()
            except Exception:
                pass
            VideoProgressTracker.set_stage(video_id, VideoStatus.FAILED, 0, "FAILED", {"error": str(e)})
            return {"success": False, "error": str(e)}
        finally:
            db.close()
