import os
import re
from pathlib import Path
from typing import Generator
from fastapi import Request, HTTPException, status
from fastapi.responses import StreamingResponse


def parse_range_header(range_header: str, file_size: int):
    """
    Parse HTTP Range header string (e.g. 'bytes=0-1024' or 'bytes=1024-').
    """
    match = re.match(r"bytes=(\d+)-(\d*)", range_header)
    if not match:
        return 0, file_size - 1

    start_str, end_str = match.groups()
    start = int(start_str) if start_str else 0
    end = int(end_str) if end_str else file_size - 1

    if start >= file_size or end >= file_size or start > end:
        raise HTTPException(
            status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
            detail="Requested Range Not Satisfiable",
        )
    return start, end


def stream_video_file(file_path: Path | str, request: Request, chunk_size: int = 1024 * 1024):
    """
    Stream a video file supporting HTTP 206 Partial Content for seeking.
    """
    path = Path(file_path)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Video file not found on disk")

    file_size = path.stat().st_size
    range_header = request.headers.get("range")

    # Determine media type based on extension
    ext = path.suffix.lower()
    media_types = {
        ".mp4": "video/mp4",
        ".avi": "video/x-msvideo",
        ".mov": "video/quicktime",
        ".mkv": "video/x-matroska",
    }
    media_type = media_types.get(ext, "application/octet-stream")

    if range_header:
        start, end = parse_range_header(range_header, file_size)
        content_length = end - start + 1

        def iter_chunks() -> Generator[bytes, None, None]:
            with open(path, "rb") as f:
                f.seek(start)
                bytes_left = content_length
                while bytes_left > 0:
                    read_bytes = min(chunk_size, bytes_left)
                    chunk = f.read(read_bytes)
                    if not chunk:
                        break
                    bytes_left -= len(chunk)
                    yield chunk

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(content_length),
            "Content-Type": media_type,
        }
        return StreamingResponse(
            iter_chunks(),
            status_code=status.HTTP_206_PARTIAL_CONTENT,
            headers=headers,
            media_type=media_type,
        )
    else:
        def iter_file() -> Generator[bytes, None, None]:
            with open(path, "rb") as f:
                while chunk := f.read(chunk_size):
                    yield chunk

        headers = {
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
            "Content-Type": media_type,
        }
        return StreamingResponse(
            iter_file(),
            status_code=status.HTTP_200_OK,
            headers=headers,
            media_type=media_type,
        )
