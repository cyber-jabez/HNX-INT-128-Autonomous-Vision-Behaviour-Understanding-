import numpy as np
from typing import List, Tuple, Optional
from scipy.optimize import linear_sum_assignment

from app.services.pipeline_types import DetectionResult, TrackResult, FrameData
from app.utils.logger import logger


def calculate_iou(bbox1: List[float], bbox2: List[float]) -> float:
    """Calculate Intersection over Union (IoU) between two [x1, y1, x2, y2] bboxes."""
    x1 = max(bbox1[0], bbox2[0])
    y1 = max(bbox1[1], bbox2[1])
    x2 = min(bbox1[2], bbox2[2])
    y2 = min(bbox1[3], bbox2[3])

    inter_w = max(0.0, x2 - x1)
    inter_h = max(0.0, y2 - y1)
    inter_area = inter_w * inter_h

    area1 = max(0.0, (bbox1[2] - bbox1[0]) * (bbox1[3] - bbox1[1]))
    area2 = max(0.0, (bbox2[2] - bbox2[0]) * (bbox2[3] - bbox2[1]))

    union_area = area1 + area2 - inter_area
    if union_area <= 0:
        return 0.0
    return inter_area / union_area


class KalmanBoxTracker:
    """
    Lightweight constant-velocity Kalman filter for 2D bounding boxes:
    State: [cx, cy, s, r, vx, vy, vs]
    where cx,cy is center, s is scale (area), r is aspect ratio (w/h).
    """
    count = 0

    def __init__(self, bbox: List[float], class_name: str, confidence: float, timestamp: float):
        self.class_name = class_name
        self.confidence = confidence
        self.first_seen = timestamp
        self.last_seen = timestamp

        x1, y1, x2, y2 = bbox
        w = max(1.0, x2 - x1)
        h = max(1.0, y2 - y1)
        cx = x1 + w / 2.0
        cy = y1 + h / 2.0
        area = w * h
        aspect_ratio = w / h

        # State vector [cx, cy, area, aspect_ratio, vx, vy, v_area]
        self.x = np.array([cx, cy, area, aspect_ratio, 0.0, 0.0, 0.0], dtype=float)
        
        # Covariance matrix
        self.P = np.diag([10.0, 10.0, 10.0, 10.0, 1000.0, 1000.0, 1000.0])

        # State transition matrix F (dt=1 per step)
        self.F = np.eye(7)
        self.F[0, 4] = 1.0  # cx += vx
        self.F[1, 5] = 1.0  # cy += vy
        self.F[2, 6] = 1.0  # area += v_area

        # Measurement matrix H [cx, cy, area, aspect_ratio]
        self.H = np.zeros((4, 7))
        self.H[0, 0] = 1.0
        self.H[1, 1] = 1.0
        self.H[2, 2] = 1.0
        self.H[3, 3] = 1.0

        # Measurement noise R
        self.R = np.diag([1.0, 1.0, 10.0, 1.0])

        # Process noise Q
        self.Q = np.diag([1.0, 1.0, 1.0, 1.0, 0.01, 0.01, 0.0001])

        self.time_since_update = 0
        KalmanBoxTracker.count += 1
        self.id = KalmanBoxTracker.count
        self.history: List[List[float]] = []  # trajectory
        self.hits = 1
        self.hit_streak = 1
        self.age = 0

    def update(self, bbox: List[float], confidence: float, timestamp: float):
        """Update tracker state with observed bbox measurement."""
        self.time_since_update = 0
        self.hits += 1
        self.hit_streak += 1
        self.confidence = confidence
        self.last_seen = timestamp

        x1, y1, x2, y2 = bbox
        w = max(1.0, x2 - x1)
        h = max(1.0, y2 - y1)
        cx = x1 + w / 2.0
        cy = y1 + h / 2.0
        z = np.array([cx, cy, w * h, w / h], dtype=float)

        # Innovation
        y = z - (self.H @ self.x)
        S = self.H @ self.P @ self.H.T + self.R
        K = self.P @ self.H.T @ np.linalg.inv(S)

        # State and covariance update
        self.x = self.x + (K @ y)
        I = np.eye(7)
        self.P = (I - K @ self.H) @ self.P

    def predict(self) -> List[float]:
        """Predict next bounding box using Kalman kinematics."""
        self.x = self.F @ self.x
        self.P = self.F @ self.P @ self.F.T + self.Q
        self.age += 1
        if self.time_since_update > 0:
            self.hit_streak = 0
        self.time_since_update += 1
        return self.get_bbox()

    def get_bbox(self) -> List[float]:
        """Convert state [cx, cy, area, r] back to [x1, y1, x2, y2]."""
        cx, cy, area, r = self.x[0], self.x[1], max(1.0, self.x[2]), max(0.01, self.x[3])
        w = np.sqrt(area * r)
        h = area / max(1e-6, w)
        x1 = cx - w / 2.0
        y1 = cy - h / 2.0
        x2 = cx + w / 2.0
        y2 = cy + h / 2.0
        return [float(x1), float(y1), float(x2), float(y2)]

    def get_center_and_size(self) -> Tuple[float, float, float, float]:
        """Return (cx, cy, w, h)."""
        bbox = self.get_bbox()
        w = max(1.0, bbox[2] - bbox[0])
        h = max(1.0, bbox[3] - bbox[1])
        cx = bbox[0] + w / 2.0
        cy = bbox[1] + h / 2.0
        return cx, cy, w, h


class ByteTracker:
    """
    Two-stage ByteTrack-inspired association tracker.
    Maintains persistent object track IDs across frames and handles occlusion.
    """

    def __init__(
        self,
        high_thresh: float = 0.5,
        low_thresh: float = 0.1,
        match_thresh: float = 0.7,  # IoU cost threshold
        max_time_lost: int = 30,    # Tolerates up to 30 frames of occlusion / missing detections
    ):
        self.high_thresh = high_thresh
        self.low_thresh = low_thresh
        self.match_thresh = match_thresh
        self.max_time_lost = max_time_lost
        self.trackers: List[KalmanBoxTracker] = []

    def reset(self):
        self.trackers = []
        KalmanBoxTracker.count = 0

    def track(self, frame_data: FrameData, detections: List[DetectionResult]) -> List[TrackResult]:
        """
        Associate detections to existing tracks using Kalman prediction and Hungarian IoU matching.
        Returns persistent TrackResult objects for currently tracked entities.
        """
        # 1. Predict new locations for existing trackers
        for t in self.trackers:
            t.predict()

        # 2. Split detections into high confidence and low confidence
        high_dets = [d for d in detections if d.confidence >= self.high_thresh]
        low_dets = [d for d in detections if self.low_thresh <= d.confidence < self.high_thresh]

        # 3. First association: match high confidence detections to all active trackers
        unmatched_trackers, unmatched_high_dets = self._associate(
            self.trackers, high_dets, iou_threshold=1.0 - self.match_thresh
        )

        # 4. Second association: match remaining unmatched trackers to low confidence detections
        remaining_trackers = [self.trackers[i] for i in unmatched_trackers]
        still_unmatched_trackers, _ = self._associate(
            remaining_trackers, low_dets, iou_threshold=0.5
        )

        # 5. Initialize new trackers for high confidence unmatched detections
        for det_idx in unmatched_high_dets:
            d = high_dets[det_idx]
            new_tr = KalmanBoxTracker(
                bbox=d.bbox,
                class_name=d.class_name,
                confidence=d.confidence,
                timestamp=frame_data.timestamp,
            )
            self.trackers.append(new_tr)

        # 6. Remove lost trackers exceeding max_time_lost
        active_trackers = []
        for t in self.trackers:
            if t.time_since_update <= self.max_time_lost:
                active_trackers.append(t)
        self.trackers = active_trackers

        # 7. Formulate output results
        results: List[TrackResult] = []
        for t in self.trackers:
            if t.time_since_update == 0 or (t.hits >= 2 and t.time_since_update <= 3):
                cx, cy, w, h = t.get_center_and_size()
                bbox = t.get_bbox()
                results.append(
                    TrackResult(
                        track_id=t.id,
                        class_name=t.class_name,
                        bbox=bbox,
                        velocity=[float(t.x[4]), float(t.x[5])],
                        state={
                            "center_x": round(cx, 2),
                            "center_y": round(cy, 2),
                            "width": round(w, 2),
                            "height": round(h, 2),
                            "confidence": round(t.confidence, 4),
                            "first_seen": round(t.first_seen, 3),
                            "last_seen": round(t.last_seen, 3),
                            "frame_id": frame_data.frame_index,
                            "timestamp": frame_data.timestamp,
                        },
                    )
                )

        return results

    def _associate(
        self,
        trackers: List[KalmanBoxTracker],
        detections: List[DetectionResult],
        iou_threshold: float,
    ) -> Tuple[List[int], List[int]]:
        """Hungarian matching between trackers and detections based on IoU."""
        if len(trackers) == 0 or len(detections) == 0:
            return list(range(len(trackers))), list(range(len(detections)))

        iou_matrix = np.zeros((len(trackers), len(detections)), dtype=np.float32)
        for t_idx, trk in enumerate(trackers):
            t_bbox = trk.get_bbox()
            for d_idx, det in enumerate(detections):
                iou_matrix[t_idx, d_idx] = calculate_iou(t_bbox, det.bbox)

        # Cost matrix is 1 - IoU
        cost_matrix = 1.0 - iou_matrix
        row_ind, col_ind = linear_sum_assignment(cost_matrix)

        unmatched_trackers = set(range(len(trackers)))
        unmatched_detections = set(range(len(detections)))

        for r, c in zip(row_ind, col_ind):
            if iou_matrix[r, c] >= iou_threshold:
                trackers[r].update(
                    bbox=detections[c].bbox,
                    confidence=detections[c].confidence,
                    timestamp=detections[c].extra.get("timestamp", 0.0),
                )
                # Assign track ID back to detection
                detections[c].track_id = trackers[r].id
                unmatched_trackers.discard(r)
                unmatched_detections.discard(c)

        return list(unmatched_trackers), list(unmatched_detections)
