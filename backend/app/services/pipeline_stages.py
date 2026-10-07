from typing import Protocol, List
from app.services.pipeline_types import FrameData, DetectionResult, TrackResult, PipelineEvent


class DetectorStage(Protocol):
    def detect(self, frame_data: FrameData) -> List[DetectionResult]:
        ...


class TrackerStage(Protocol):
    def track(self, frame_data: FrameData, detections: List[DetectionResult]) -> List[TrackResult]:
        ...


class BehaviourAnalyzerStage(Protocol):
    def analyze(self, frame_data: FrameData, tracks: List[TrackResult]) -> List[PipelineEvent]:
        ...


# Default pass-through / modular implementations before Phase 4 & Phase 5 models are plugged in

class PassthroughDetector:
    def detect(self, frame_data: FrameData) -> List[DetectionResult]:
        return []


class PassthroughTracker:
    def track(self, frame_data: FrameData, detections: List[DetectionResult]) -> List[TrackResult]:
        return []


class PassthroughAnalyzer:
    def analyze(self, frame_data: FrameData, tracks: List[TrackResult]) -> List[PipelineEvent]:
        return []
