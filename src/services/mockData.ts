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
