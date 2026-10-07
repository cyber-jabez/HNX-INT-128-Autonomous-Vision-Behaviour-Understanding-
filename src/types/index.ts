export type BehaviourType = 'Walking' | 'Standing' | 'Running' | 'Stationary' | 'Loitering';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface BoundingBox {
  x: number; // normalized [0, 1] or pixel coordinates
  y: number;
  width: number;
  height: number;
}

export interface TrackDetection {
  track_id: number;
  class_name: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2] normalized 0-1
  behaviour: BehaviourType;
  speed?: number; // m/s or px/s
  zone?: string;
}

export interface VideoMetadata {
  id: string;
  title: string;
  filename: string;
  size_bytes: number;
  duration_seconds: number;
  fps: number;
  resolution: string;
  status: 'processing' | 'ready' | 'failed' | 'uploaded';
  created_at: string;
  thumbnail_url?: string;
  stream_url?: string;
}

export interface ZonePoint {
  x: number; // normalized 0-1
  y: number; // normalized 0-1
}

export interface Zone {
  id: string;
  video_id: string;
  name: string;
  color: string;
  polygon: ZonePoint[];
  type: 'Restricted Zone' | 'Machine Area' | 'Safe Zone' | 'Custom';
}

export interface VideoEvent {
  id: string;
  video_id: string;
  track_id: number;
  event_type: string;
  behaviour: BehaviourType;
  start_time: number; // in seconds
  end_time: number;   // in seconds
  severity: AlertSeverity;
  zone?: string;
  confidence: number;
  explanation: string;
  evidence_url?: string;
}

export interface TrackHistoryPoint {
  timestamp: number;
  bbox: [number, number, number, number];
  behaviour: BehaviourType;
  speed: number;
}

export interface TrackHistory {
  track_id: number;
  class_name: string;
  start_time: number;
  end_time: number;
  history: TrackHistoryPoint[];
}

export interface AIQuestionAnswer {
  id: string;
  question: string;
  answer: string;
  sequence: {
    time: string;
    seconds: number;
    description: string;
  }[];
  evidenceTimestamps: {
    time: string;
    seconds: number;
    label: string;
    frameNumber?: number;
  }[];
}

export interface TemporalGraphNode {
  id: string;
  label: string;
  category: 'entity' | 'action' | 'zone' | 'object' | 'state';
  timestamp?: number;
  description?: string;
  details?: Record<string, string | number>;
}

export interface TemporalGraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: 'BEFORE' | 'AFTER' | 'DURING' | 'INTERACTS_WITH' | 'ENTERS' | 'EXITS';
  label?: string;
}

export interface EntitySummary {
  track_id: number;
  class_name: string;
  first_seen: number;
  last_seen: number;
  duration: number;
  primary_behaviour: BehaviourType;
  confidence: number;
  event_count: number;
  zone: string;
}
