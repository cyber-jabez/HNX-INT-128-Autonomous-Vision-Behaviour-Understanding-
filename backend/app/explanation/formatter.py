from typing import Dict, Any


def format_duration(seconds: float) -> str:
    secs = int(seconds)
    mins = secs // 60
    rem_secs = secs % 60
    if mins > 0 and rem_secs > 0:
        return f"{mins} minute{'s' if mins > 1 else ''} {rem_secs} second{'s' if rem_secs > 1 else ''}"
    elif mins > 0:
        return f"{mins} minute{'s' if mins > 1 else ''}"
    else:
        return f"{secs} second{'s' if secs != 1 else ''}"


def format_timestamp(seconds: float) -> str:
    s = max(0, int(seconds))
    hrs = s // 3600
    mins = (s % 3600) // 60
    secs = s % 60
    if hrs > 0:
        return f"{hrs:02d}:{mins:02d}:{secs:02d}"
    return f"{mins:02d}:{secs:02d}"


def generate_deterministic_explanation(context_dict: Dict[str, Any]) -> str:
    """
    Deterministic rule-based explanation formatter used as reliable ground truth
    and guaranteed fallback if LLM is unavailable.
    Does NOT invent Track IDs, timestamps, locations, or behaviors.
    """
    track_id = context_dict.get("track_id")
    event_type = context_dict.get("event_type", "ANOMALY")
    start_ts = format_timestamp(context_dict.get("start_time", 0.0))
    end_ts = format_timestamp(context_dict.get("end_time") or context_dict.get("start_time", 0.0))
    duration_str = format_duration(context_dict.get("duration", 0.0))
    zone = context_dict.get("zone") or "the monitored scene"
    trigger = context_dict.get("trigger_reason") or ""
    confidence = context_dict.get("confidence", 1.0)

    if event_type == "LOITERING":
        return (
            f"Person #{track_id} was detected in {zone} from {start_ts} to {end_ts} "
            f"and remained stationary for approximately {duration_str}. "
            f"This triggered a LOITERING alert ({trigger}). (Confidence: {confidence * 100:.0f}%)"
        )
    elif event_type == "RESTRICTED_ZONE_ENTRY":
        return (
            f"Person #{track_id} unauthorized entry was detected in {zone} at {start_ts}. "
            f"This breached perimeter security protocols: {trigger}. (Confidence: {confidence * 100:.0f}%)"
        )
    else:
        return (
            f"Security event {event_type} involving Track #{track_id} was observed in {zone} "
            f"starting at {start_ts} for {duration_str}: {trigger}."
        )
