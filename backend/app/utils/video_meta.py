import os
from pathlib import Path
from typing import Dict, Any, Optional
import cv2

from app.utils.logger import logger


class VideoProcessingError(Exception):
    """Custom exception raised when a video file fails validation or metadata extraction."""
    pass


def extract_video_metadata(file_path: Path | str) -> Dict[str, Any]:
    """
    Extract video metadata using OpenCV (and fallback checks).
    Validates that the file is not corrupted and can be opened and decoded.

    Returns:
        Dict containing:
            - duration (float, in seconds)
            - fps (float)
            - width (int)
            - height (int)
            - frame_count (int)
    """
    path_str = str(file_path)
    if not os.path.exists(path_str):
        raise VideoProcessingError(f"Video file does not exist at {path_str}")

    cap = cv2.VideoCapture(path_str)
    if not cap.isOpened():
        raise VideoProcessingError(
            "Corrupted or invalid video file: unable to open video stream with OpenCV."
        )

    try:
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

        # Test reading at least the first frame to guarantee file is not truncated/corrupted
        ret, frame = cap.read()
        if not ret or frame is None:
            raise VideoProcessingError("Corrupted video file: failed to decode initial video frame.")

        # Re-verify or calculate duration
        if fps > 0 and frame_count > 0:
            duration = round(frame_count / fps, 3)
        else:
            duration = 0.0

        return {
            "duration": duration,
            "fps": round(fps, 2),
            "width": width,
            "height": height,
            "frame_count": frame_count,
        }
    except Exception as e:
        if isinstance(e, VideoProcessingError):
            raise
        logger.error(f"Error reading video metadata: {e}", exc_info=True)
        raise VideoProcessingError(f"Failed to extract video metadata: {str(e)}")
    finally:
        cap.release()
