import { VideoMetadata, Zone, VideoEvent, TrackDetection } from '../types';

export const MOCK_VIDEOS: VideoMetadata[] = [
  {
    id: 'vid-demo-01',
    title: 'Surveillance_Perimeter_Sector_A.mp4',
    filename: 'Surveillance_Perimeter_Sector_A.mp4',
    size_bytes: 42500000,
    duration_seconds: 64,
    fps: 30,
    resolution: '1920x1080',
    status: 'ready',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    // Standard high-quality sample video link for HTML5 playback demo
    stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
  {
    id: 'vid-demo-02',
    title: 'Warehouse_Loading_Bay_04.mp4',
    filename: 'Warehouse_Loading_Bay_04.mp4',
    size_bytes: 18400000,
    duration_seconds: 48,
    fps: 25,
    resolution: '1280x720',
    status: 'ready',
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  },
];

export const MOCK_ZONES: Zone[] = [
  {
    id: 'zone-1',
    video_id: 'vid-demo-01',
    name: 'Restricted Vault Access',
    type: 'Restricted Zone',
    color: '#ef4444', // Red
    polygon: [
      { x: 0.65, y: 0.2 },
      { x: 0.95, y: 0.2 },
      { x: 0.92, y: 0.75 },
      { x: 0.62, y: 0.7 },
    ],
  },
  {
    id: 'zone-2',
    video_id: 'vid-demo-01',
    name: 'Automated Machinery Corridor',
    type: 'Machine Area',
    color: '#f59e0b', // Amber
    polygon: [
      { x: 0.05, y: 0.4 },
      { x: 0.38, y: 0.4 },
      { x: 0.35, y: 0.88 },
      { x: 0.02, y: 0.85 },
    ],
  },
  {
    id: 'zone-3',
    video_id: 'vid-demo-01',
    name: 'Safe Walkway East',
    type: 'Safe Zone',
    color: '#10b981', // Emerald
    polygon: [
      { x: 0.42, y: 0.15 },
      { x: 0.58, y: 0.15 },
      { x: 0.56, y: 0.92 },
      { x: 0.40, y: 0.92 },
    ],
  },
];

export const MOCK_EVENTS: VideoEvent[] = [
  {
    id: 'evt-101',
    video_id: 'vid-demo-01',
    track_id: 12,
    event_type: 'Restricted-zone entry',
    behaviour: 'Running',
    start_time: 4.2,
    end_time: 14.5,
    severity: 'critical',
    zone: 'Restricted Vault Access',
    confidence: 0.96,
    explanation: 'Track #12 breached perimeter boundary of Restricted Vault Access at 4.2s moving at high velocity without authorization badge.',
    evidence_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  },
  {
    id: 'evt-102',
    video_id: 'vid-demo-01',
    track_id: 7,
    event_type: 'Loitering',
    behaviour: 'Loitering',
    start_time: 12.0,
    end_time: 26.8,
    severity: 'medium',
    zone: 'Safe Walkway East',
    confidence: 0.88,
    explanation: 'Track #7 remained stationary within walkway boundary exceeding dwell threshold of 10s with no directional movement vector.',
    evidence_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  },
  {
    id: 'evt-103',
    video_id: 'vid-demo-01',
    track_id: 19,
    event_type: 'Falling',
    behaviour: 'Stationary',
    start_time: 28.5,
    end_time: 39.0,
    severity: 'high',
    zone: 'Automated Machinery Corridor',
    confidence: 0.94,
    explanation: 'Sudden vertical bounding box aspect-ratio collapse followed by zero displacement indicates potential slip/fall in machine sector.',
    evidence_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  },
  {
    id: 'evt-104',
    video_id: 'vid-demo-01',
    track_id: 23,
    event_type: 'Unsafe running',
    behaviour: 'Running',
    start_time: 42.1,
    end_time: 51.3,
    severity: 'high',
    zone: 'Automated Machinery Corridor',
    confidence: 0.91,
    explanation: 'Speed metrics exceeded 4.8m/s limit adjacent to active conveyor hazard area.',
    evidence_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
  },
  {
    id: 'evt-105',
    video_id: 'vid-demo-01',
    track_id: 4,
    event_type: 'Routine Patrol Walk',
    behaviour: 'Walking',
    start_time: 52.0,
    end_time: 62.5,
    severity: 'low',
    zone: 'Safe Walkway East',
    confidence: 0.98,
    explanation: 'Uniform linear trajectory following designated yellow walkway route at standard 1.2m/s walking pace.',
    evidence_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  },
];

// Helper to simulate time-varying tracking bounding boxes based on playback timestamp
export function generateMockTracksAtTime(time: number): TrackDetection[] {
  const tracks: TrackDetection[] = [];

  // Track 12: Running towards or inside restricted zone
  if (time >= 2 && time <= 20) {
    const progress = (time - 2) / 18;
    const x1 = 0.55 + progress * 0.25;
    const y1 = 0.3 + Math.sin(progress * 6) * 0.05;
    tracks.push({
      track_id: 12,
      class_name: 'Person',
      confidence: 0.95,
      bbox: [x1, y1, x1 + 0.09, y1 + 0.28],
      behaviour: progress > 0.15 ? 'Running' : 'Walking',
      speed: 4.6,
      zone: x1 > 0.65 ? 'Restricted Vault Access' : 'Transition Zone',
    });
  }

  // Track 7: Loitering in center walkway
  if (time >= 10 && time <= 32) {
    const wobble = Math.sin(time * 1.5) * 0.015;
    tracks.push({
      track_id: 7,
      class_name: 'Person',
      confidence: 0.92,
      bbox: [0.46 + wobble, 0.42, 0.54 + wobble, 0.72],
      behaviour: time > 18 ? 'Loitering' : 'Standing',
      speed: 0.1,
      zone: 'Safe Walkway East',
    });
  }

  // Track 19: Falling / down
  if (time >= 25 && time <= 45) {
    const isDown = time >= 28.5;
    tracks.push({
      track_id: 19,
      class_name: 'Person',
      confidence: 0.89,
      bbox: isDown ? [0.15, 0.68, 0.32, 0.78] : [0.18, 0.45, 0.26, 0.75],
      behaviour: isDown ? 'Stationary' : 'Walking',
      speed: isDown ? 0.0 : 1.1,
      zone: 'Automated Machinery Corridor',
    });
  }

  // Track 4: Walking patrol
  if (time >= 48 && time <= 64) {
    const progress = (time - 48) / 16;
    const yPos = 0.2 + progress * 0.55;
    tracks.push({
      track_id: 4,
      class_name: 'Person',
      confidence: 0.97,
      bbox: [0.45, yPos, 0.52, yPos + 0.22],
      behaviour: 'Walking',
      speed: 1.3,
      zone: 'Safe Walkway East',
    });
  }

  return tracks;
}

export const MOCK_AI_QA: import('../types').AIQuestionAnswer[] = [
  {
    id: 'qa-1',
    question: 'What happened after the person entered the restricted area?',
    answer: 'Person 12 breached the perimeter of Restricted Vault Access at 00:04.2 moving at high velocity (4.6 m/s). They approached the terminal console at 00:07.5, interacted with the containment panel at 00:09.1, and exited toward Sector B at 00:14.5.',
    sequence: [
      { time: '00:04.2', seconds: 4.2, description: 'Breached perimeter of Restricted Vault Access' },
      { time: '00:07.5', seconds: 7.5, description: 'Approached vault terminal workstation' },
      { time: '00:09.1', seconds: 9.1, description: 'Interacted with containment panel' },
      { time: '00:14.5', seconds: 14.5, description: 'Exited restricted perimeter toward Corridor B' },
    ],
    evidenceTimestamps: [
      { time: '00:04.2', seconds: 4.2, label: 'Perimeter Breach', frameNumber: 126 },
      { time: '00:07.5', seconds: 7.5, label: 'Workstation Approach', frameNumber: 225 },
      { time: '00:09.1', seconds: 9.1, label: 'Object / Panel Interaction', frameNumber: 273 },
      { time: '00:14.5', seconds: 14.5, label: 'Vault Boundary Exit', frameNumber: 435 },
    ],
  },
  {
    id: 'qa-2',
    question: 'Who entered the restricted area and how long were they inside?',
    answer: 'Track #12 (classified as Person, 96% confidence) entered the Restricted Vault Access at 00:04.2 and departed at 00:14.5, remaining inside for exactly 10.3 seconds before traversing eastward.',
    sequence: [
      { time: '00:04.2', seconds: 4.2, description: 'Entered Restricted Vault Access' },
      { time: '00:10.0', seconds: 10.0, description: 'Peak velocity inside vault zone (4.8 m/s)' },
      { time: '00:14.5', seconds: 14.5, description: 'Departed restricted zone boundary' },
    ],
    evidenceTimestamps: [
      { time: '00:04.2', seconds: 4.2, label: 'Zone Ingress', frameNumber: 126 },
      { time: '00:14.5', seconds: 14.5, label: 'Zone Egress', frameNumber: 435 },
    ],
  },
  {
    id: 'qa-3',
    question: 'Was there any unusual or abnormal activity detected?',
    answer: 'Yes, three abnormal incidents were detected: (1) Track #12 entered Restricted Vault Access without authorization at 00:04.2 (Critical severity); (2) Track #7 loitered stationary in Safe Walkway East for 14.8s exceeding threshold (Medium severity); (3) Track #19 suffered a vertical aspect-ratio collapse indicative of a slip/fall in Automated Machinery Corridor at 00:28.5 (High severity).',
    sequence: [
      { time: '00:04.2', seconds: 4.2, description: 'Critical perimeter breach: Track #12' },
      { time: '00:12.0', seconds: 12.0, description: 'Loitering threshold exceeded: Track #7' },
      { time: '00:28.5', seconds: 28.5, description: 'Aspect-ratio collapse (fall): Track #19' },
    ],
    evidenceTimestamps: [
      { time: '00:04.2', seconds: 4.2, label: 'Vault Breach (Critical)', frameNumber: 126 },
      { time: '00:12.0', seconds: 12.0, label: 'Walkway Loitering (Medium)', frameNumber: 360 },
      { time: '00:28.5', seconds: 28.5, label: 'Worker Fall (High)', frameNumber: 855 },
    ],
  },
  {
    id: 'qa-4',
    question: 'What happened first in the recording?',
    answer: 'The initial detected event was Track #12 entering the camera field of view in the Transition Zone at 00:02.1, rapidly transitioning from Walking to Running pace before breaching the Restricted Vault Access at 00:04.2.',
    sequence: [
      { time: '00:02.1', seconds: 2.1, description: 'First tracked entity enters camera FOV' },
      { time: '00:04.2', seconds: 4.2, description: 'Breaches restricted vault zone' },
    ],
    evidenceTimestamps: [
      { time: '00:02.1', seconds: 2.1, label: 'Camera Entry', frameNumber: 63 },
      { time: '00:04.2', seconds: 4.2, label: 'Vault Ingress', frameNumber: 126 },
    ],
  },
  {
    id: 'qa-5',
    question: 'Which object or entity had high velocity in the machinery sector?',
    answer: 'Track #23 exhibited rapid acceleration reaching 4.9 m/s at 00:42.1 within the Automated Machinery Corridor, triggering an Unsafe Running hazard flag adjacent to active conveyor equipment.',
    sequence: [
      { time: '00:42.1', seconds: 42.1, description: 'Velocity spike detected (4.9 m/s)' },
      { time: '00:46.8', seconds: 46.8, description: 'Conveyor proximity hazard registered' },
      { time: '00:51.3', seconds: 51.3, description: 'Decelerated to nominal walkway speed' },
    ],
    evidenceTimestamps: [
      { time: '00:42.1', seconds: 42.1, label: 'Speed Trigger (4.9 m/s)', frameNumber: 1263 },
      { time: '00:51.3', seconds: 51.3, label: 'Speed Normalized', frameNumber: 1539 },
    ],
  },
];

export const MOCK_TEMPORAL_NODES: import('../types').TemporalGraphNode[] = [
  { id: 'n-person-12', label: 'Person #12', category: 'entity', timestamp: 2.1, description: 'Primary unauthorized subject' },
  { id: 'n-vault-entry', label: 'Vault Ingress', category: 'action', timestamp: 4.2, description: 'Perimeter breached at 4.6 m/s' },
  { id: 'n-zone-vault', label: 'Restricted Vault', category: 'zone', description: 'High security sector zone' },
  { id: 'n-workstation', label: 'Console Interaction', category: 'action', timestamp: 9.1, description: 'Accessed terminal keypad' },
  { id: 'n-vault-exit', label: 'Vault Egress', category: 'action', timestamp: 14.5, description: 'Exited toward Corridor East' },
  { id: 'n-person-7', label: 'Person #7', category: 'entity', timestamp: 10.0, description: 'Loitering subject' },
  { id: 'n-zone-walkway', label: 'Safe Walkway East', category: 'zone', description: 'Designated pedestrian path' },
  { id: 'n-fall-event', label: 'Aspect Ratio Drop', category: 'action', timestamp: 28.5, description: 'Sudden vertical collapse' },
  { id: 'n-person-19', label: 'Person #19', category: 'entity', timestamp: 25.0, description: 'Maintenance operative' },
  { id: 'n-person-4', label: 'Security Patrol #4', category: 'entity', timestamp: 52.0, description: 'Scheduled routine inspection' },
];

export const MOCK_TEMPORAL_EDGES: import('../types').TemporalGraphEdge[] = [
  { id: 'e1', source: 'n-person-12', target: 'n-vault-entry', relationship: 'BEFORE', label: 'at 00:04.2' },
  { id: 'e2', source: 'n-vault-entry', target: 'n-zone-vault', relationship: 'ENTERS', label: 'breaches' },
  { id: 'e3', source: 'n-zone-vault', target: 'n-workstation', relationship: 'DURING', label: 'dwells inside' },
  { id: 'e4', source: 'n-workstation', target: 'n-vault-exit', relationship: 'BEFORE', label: 'at 00:14.5' },
  { id: 'e5', source: 'n-vault-exit', target: 'n-zone-vault', relationship: 'EXITS', label: 'leaves' },
  { id: 'e6', source: 'n-person-7', target: 'n-zone-walkway', relationship: 'DURING', label: 'dwell 14.8s' },
  { id: 'e7', source: 'n-person-19', target: 'n-fall-event', relationship: 'BEFORE', label: 'at 00:28.5' },
  { id: 'e8', source: 'n-fall-event', target: 'n-person-4', relationship: 'BEFORE', label: 'prior to patrol' },
];

export const MOCK_ENTITIES: import('../types').EntitySummary[] = [
  {
    track_id: 12,
    class_name: 'Person',
    first_seen: 2.1,
    last_seen: 18.4,
    duration: 16.3,
    primary_behaviour: 'Running',
    confidence: 0.96,
    event_count: 2,
    zone: 'Restricted Vault Access',
  },
  {
    track_id: 7,
    class_name: 'Person',
    first_seen: 10.0,
    last_seen: 32.0,
    duration: 22.0,
    primary_behaviour: 'Loitering',
    confidence: 0.92,
    event_count: 1,
    zone: 'Safe Walkway East',
  },
  {
    track_id: 19,
    class_name: 'Person',
    first_seen: 25.0,
    last_seen: 45.0,
    duration: 20.0,
    primary_behaviour: 'Stationary',
    confidence: 0.94,
    event_count: 1,
    zone: 'Automated Machinery Corridor',
  },
  {
    track_id: 23,
    class_name: 'Person',
    first_seen: 40.5,
    last_seen: 52.0,
    duration: 11.5,
    primary_behaviour: 'Running',
    confidence: 0.91,
    event_count: 1,
    zone: 'Automated Machinery Corridor',
  },
  {
    track_id: 4,
    class_name: 'Security Officer',
    first_seen: 48.0,
    last_seen: 64.0,
    duration: 16.0,
    primary_behaviour: 'Walking',
    confidence: 0.98,
    event_count: 1,
    zone: 'Safe Walkway East',
  },
];
