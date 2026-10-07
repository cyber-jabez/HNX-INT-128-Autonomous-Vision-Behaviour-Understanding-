import os
import shutil
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any, List
import cv2

from app.config import settings
from app.events.context import EventContext
from app.utils.logger import logger


class EvidenceGenerator:
    """
    Generates video evidence clips for detected events:
    Includes [start_time - 10s] to [end_time + 10s] with boundary clamping.
    Uses FFmpeg if available on the system PATH; falls back seamlessly to
    OpenCV VideoWriter with optional visual HUD overlays.
    """

    def __init__(
        self,
        evidence_dir: Optional[Path | str] = None,
        padding_seconds: float = 10.0,
        enable_overlays: bool = True,
    ):
        self.evidence_dir = Path(evidence_dir) if evidence_dir is not None else settings.EVIDENCE_DIR
        self.padding_seconds = padding_seconds
        self.enable_overlays = enable_overlays
        self.evidence_dir.mkdir(parents=True, exist_ok=True)
        self.ffmpeg_cmd = shutil.which("ffmpeg")

    def generate_clip(
        self,
        video_path: Path | str,
        context: EventContext,
        video_duration: Optional[float] = None,
        video_fps: Optional[float] = None,
    ) -> Path:
        """
        Extracts bounded clip (event_time +/- 10s) and saves to evidence/
        """
        source_path = Path(video_path)
        if not source_path.exists():
            raise FileNotFoundError(f"Video file not found at {source_path}")

        # Compute safely bounded start and end timestamps
        raw_start = max(0.0, context.start_time - self.padding_seconds)
        end_mark = context.end_time if context.end_time is not None else context.start_time
        raw_end = end_mark + self.padding_seconds

        if video_duration is not None and video_duration > 0:
            clip_end = min(video_duration, raw_end)
        else:
            clip_end = raw_end

        clip_start = raw_start
        clip_duration = max(1.0, clip_end - clip_start)

        output_filename = f"evidence_evt_{context.event_id or 'temp'}_track_{context.track_id or '0'}.mp4"
        output_filepath = self.evidence_dir / output_filename

        # If FFmpeg is installed and no custom overlay is required, use fast FFmpeg stream copy
        if self.ffmpeg_cmd and not self.enable_overlays:
            try:
                cmd = [
                    self.ffmpeg_cmd,
                    "-y",
                    "-ss", str(clip_start),
                    "-i", str(source_path),
                    "-t", str(clip_duration),
                    "-c", "copy",
                    str(output_filepath),
                ]
                subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
                logger.info(f"Generated FFmpeg evidence clip at {output_filepath}")
                return output_filepath
            except Exception as e:
                logger.warning(f"FFmpeg extraction failed ({e}), falling back to OpenCV generator.")

        # OpenCV extraction with HUD overlays
        return self._generate_with_opencv(
            source_path=source_path,
            output_filepath=output_filepath,
            clip_start=clip_start,
            clip_end=clip_end,
            context=context,
        )

    def _generate_with_opencv(
        self,
        source_path: Path,
        output_filepath: Path,
        clip_start: float,
        clip_end: float,
        context: EventContext,
    ) -> Path:
        cap = cv2.VideoCapture(str(source_path))
        if not cap.isOpened():
            raise RuntimeError(f"Unable to open video: {source_path}")

        fps = float(cap.get(cv2.CAP_PROP_FPS) or 25.0)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 640)
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 480)

        start_frame = int(clip_start * fps)
        end_frame = int(clip_end * fps)

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(str(output_filepath), fourcc, fps, (width, height))

        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
        current_frame = start_frame

        try:
            while current_frame <= end_frame:
                ret, frame = cap.read()
                if not ret or frame is None:
                    break

                if self.enable_overlays:
                    # Draw HUD overlay
                    ts = current_frame / fps
                    hud_text = f"EVENT: {context.event_type} | TRACK: #{context.track_id} | TIME: {ts:.1f}s"
                    cv2.rectangle(frame, (10, 10), (min(width - 10, 480), 45), (0, 0, 0), -1)
                    cv2.putText(
                        frame,
                        hud_text,
                        (15, 35),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.55,
                        (0, 0, 255) if "RESTRICTED" in context.event_type else (0, 215, 255),
                        2,
                    )
                    if context.location_x and context.location_y:
                        cv2.circle(
                            frame,
                            (int(context.location_x), int(context.location_y)),
                            12,
                            (0, 0, 255),
                            2,
                        )

                out.write(frame)
                current_frame += 1
        finally:
            cap.release()
            out.release()

        logger.info(f"Generated OpenCV evidence clip with HUD overlay at {output_filepath}")
        return output_filepath


evidence_generator = EvidenceGenerator()
