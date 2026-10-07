from dataclasses import dataclass
from typing import Dict, List, Optional
from app.behaviour.rules import BehaviourType


@dataclass
class BehaviourInterval:
    track_id: int
    behaviour: BehaviourType
    start_time: float
    end_time: float
    duration: float
    confidence: float = 1.0


class BehaviourStateManager:
    """
    Maintains behaviour intervals per track.
    Crucial requirement: Does NOT generate a new record every frame.
    Continues existing active interval as long as behaviour remains the same.
    Emits closed interval when behaviour transitions.
    """

    def __init__(self):
        # track_id -> current active interval
        self.active_intervals: Dict[int, BehaviourInterval] = {}
        # Completed history of closed intervals per track
        self.completed_intervals: Dict[int, List[BehaviourInterval]] = {}

    def update(
        self,
        track_id: int,
        behaviour: BehaviourType,
        timestamp: float,
        confidence: float = 1.0,
    ) -> Optional[BehaviourInterval]:
        """
        Updates behaviour state for track.
        If behaviour continues unchanged: extends end_time and duration.
        If behaviour changed: finalizes and returns previous interval, begins new interval.
        """
        closed_interval = None

        if track_id not in self.active_intervals:
            self.active_intervals[track_id] = BehaviourInterval(
                track_id=track_id,
                behaviour=behaviour,
                start_time=timestamp,
                end_time=timestamp,
                duration=0.0,
                confidence=confidence,
            )
            return None

        current = self.active_intervals[track_id]

        if current.behaviour == behaviour:
            # Continue interval
            current.end_time = timestamp
            current.duration = round(current.end_time - current.start_time, 3)
        else:
            # Transition! Close previous interval
            current.end_time = timestamp
            current.duration = round(current.end_time - current.start_time, 3)
            closed_interval = current

            if track_id not in self.completed_intervals:
                self.completed_intervals[track_id] = []
            self.completed_intervals[track_id].append(closed_interval)

            # Start new interval
            self.active_intervals[track_id] = BehaviourInterval(
                track_id=track_id,
                behaviour=behaviour,
                start_time=timestamp,
                end_time=timestamp,
                duration=0.0,
                confidence=confidence,
            )

        return closed_interval

    def flush_active(self) -> List[BehaviourInterval]:
        """Finalize all currently open intervals (e.g. at end of video)."""
        all_final = []
        for interval in self.active_intervals.values():
            all_final.append(interval)
        self.active_intervals.clear()
        return all_final
