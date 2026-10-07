import axios from 'axios';
import { VideoMetadata, TrackDetection, Zone, VideoEvent, TrackHistory } from '../types';

// Configure backend base URL (customizable via Vite env)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_V1_PREFIX = `${API_BASE_URL}/api/v1`;

const client = axios.create({
  baseURL: API_V1_PREFIX,
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
  },
});

export const api = {
  // Video Endpoints
  async uploadVideo(file: File, onProgress?: (pct: number) => void): Promise<VideoMetadata> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('video', file);
    const res = await client.post<any>('/videos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });

    const v = res.data;
    return {
      id: String(v.id),
      title: v.filename || 'Uploaded Video',
      filename: v.filename || 'video.mp4',
      size_bytes: v.file_size_bytes || 0,
      duration_seconds: v.duration || 0,
      fps: v.fps || 25,
      resolution: v.width && v.height ? `${v.width}x${v.height}` : '1920x1080',
      status: (v.status ? v.status.toLowerCase() : 'uploaded') as any,
      created_at: v.created_at || new Date().toISOString(),
      stream_url: `${API_V1_PREFIX}/videos/${v.id}/stream`,
    };
  },

  async processVideo(id: string, targetFps?: number): Promise<any> {
    const res = await client.post(`/videos/${id}/process`, {
      target_fps: targetFps || 15.0,
      generate_evidence: true,
      generate_explanations: true,
    });
    return res.data;
  },

  async getVideoStatus(id: string): Promise<{ status: string; progress: number; current_stage: string }> {
    const res = await client.get(`/videos/${id}/status`);
    return res.data;
  },

  async getVideos(): Promise<VideoMetadata[]> {
    const res = await client.get<any[]>('/videos');
    return res.data.map((v) => ({
      id: String(v.id),
      title: v.filename || `Video #${v.id}`,
      filename: v.filename || 'video.mp4',
      size_bytes: v.file_size_bytes || 0,
      duration_seconds: v.duration || 0,
      fps: v.fps || 25,
      resolution: v.width && v.height ? `${v.width}x${v.height}` : '1920x1080',
      status: (v.status ? v.status.toLowerCase() : 'ready') as any,
      created_at: v.created_at || new Date().toISOString(),
      stream_url: `${API_V1_PREFIX}/videos/${v.id}/stream`,
    }));
  },

  async getVideo(id: string): Promise<VideoMetadata> {
    const res = await client.get<any>(`/videos/${id}`);
    const v = res.data;
    return {
      id: String(v.id),
      title: v.filename || `Video #${v.id}`,
      filename: v.filename || 'video.mp4',
      size_bytes: v.file_size_bytes || 0,
      duration_seconds: v.duration || 0,
      fps: v.fps || 25,
      resolution: v.width && v.height ? `${v.width}x${v.height}` : '1920x1080',
      status: (v.status ? v.status.toLowerCase() : 'ready') as any,
      created_at: v.created_at || new Date().toISOString(),
      stream_url: `${API_V1_PREFIX}/videos/${v.id}/stream`,
    };
  },

  async deleteVideo(id: string): Promise<void> {
    await client.delete(`/videos/${id}`);
  },

  getVideoStreamUrl(id: string): string {
    return `${API_V1_PREFIX}/videos/${id}/stream`;
  },

  // Tracks & Detections
  async getVideoTracks(id: string, timestamp?: number): Promise<TrackDetection[]> {
    const res = await client.get<any[]>(`/videos/${id}/tracks`, {
      params: timestamp !== undefined ? { timestamp } : {},
    });
    if (!Array.isArray(res.data)) return [];
    return res.data.map((t) => ({
      track_id: t.track_id,
      class_name: t.class_name || 'person',
      confidence: t.confidence ?? 1.0,
      bbox: t.bbox || [0, 0, 0, 0],
      behaviour: (t.behaviour || 'Standing') as any,
      speed: t.speed ?? 0,
      zone: t.zone,
    }));
  },

  async getTrackHistory(trackId: number): Promise<TrackHistory> {
    const res = await client.get<any[]>(`/tracks/${trackId}/history`);
    const points = res.data || [];
    return {
      track_id: trackId,
      class_name: 'person',
      start_time: points.length > 0 ? points[0].timestamp : 0,
      end_time: points.length > 0 ? points[points.length - 1].timestamp : 0,
      history: points.map((p) => ({
        timestamp: p.timestamp,
        bbox: [
          Math.max(0, p.x - p.width / 2),
          Math.max(0, p.y - p.height / 2),
          p.x + p.width / 2,
          p.y + p.height / 2,
        ],
        behaviour: 'Standing',
        speed: 0,
      })),
    };
  },

  // Behaviours
  async getVideoBehaviours(id: string): Promise<Record<string, number>> {
    const res = await client.get<any[]>(`/videos/${id}/behaviours`);
    const counts: Record<string, number> = {};
    (res.data || []).forEach((b) => {
      const name = b.behaviour || 'Standing';
      counts[name] = (counts[name] || 0) + 1;
    });
    return counts;
  },

  async getVideoBehaviourList(id: string): Promise<any[]> {
    const res = await client.get<any[]>(`/videos/${id}/behaviours`);
    return Array.isArray(res.data) ? res.data : [];
  },

  async getVideoTrackSummaries(id: string): Promise<any[]> {
    const res = await client.get<any>(`/videos/${id}/tracks`);
    if (res.data && Array.isArray(res.data.tracks)) {
      return res.data.tracks;
    }
    return Array.isArray(res.data) ? res.data : [];
  },

  // Zones
  async getZones(videoId: string): Promise<Zone[]> {
    const res = await client.get<any[]>(`/videos/${videoId}/zones`);
    return (res.data || []).map((z) => {
      let color = '#3b82f6';
      if (z.zone_type === 'Restricted Zone') color = '#ef4444';
      else if (z.zone_type === 'Machine Area') color = '#f59e0b';
      else if (z.zone_type === 'Safe Zone') color = '#10b981';

      const polygon = (z.polygon_coordinates || []).map((coords: number[]) => ({
        x: coords[0] > 1 ? coords[0] / 1920 : coords[0],
        y: coords[1] > 1 ? coords[1] / 1080 : coords[1],
      }));

      return {
        id: String(z.id),
        video_id: String(z.video_id),
        name: z.name,
        color,
        polygon,
        type: z.zone_type as any,
      };
    });
  },

  async createZone(videoId: string, zone: Omit<Zone, 'id' | 'video_id'>): Promise<Zone> {
    const payload = {
      name: zone.name,
      zone_type: zone.type,
      polygon_coordinates: zone.polygon.map((p) => [p.x, p.y]),
    };
    const res = await client.post<any>(`/videos/${videoId}/zones`, payload);
    const z = res.data;
    return {
      id: String(z.id),
      video_id: String(z.video_id),
      name: z.name,
      color: zone.color,
      polygon: zone.polygon,
      type: z.zone_type as any,
    };
  },

  async deleteZone(zoneId: string): Promise<void> {
    await client.delete(`/zones/${zoneId}`);
  },

  // Events & Alerts
  async getVideoEvents(videoId: string): Promise<VideoEvent[]> {
    const res = await client.get<any[]>(`/videos/${videoId}/events`);
    return (res.data || []).map((e) => {
      let beh = 'Stationary';
      if (e.event_type.toLowerCase().includes('loitering')) beh = 'Loitering';
      else if (e.event_type.toLowerCase().includes('restricted')) beh = 'Walking';

      return {
        id: String(e.id),
        video_id: String(e.video_id),
        track_id: e.track_id || 0,
        event_type: e.event_type,
        behaviour: beh as any,
        start_time: e.start_time,
        end_time: e.end_time || e.start_time + 5,
        severity: (e.severity ? e.severity.toLowerCase() : 'medium') as any,
        zone: e.spatial_zone || undefined,
        confidence: e.confidence ?? 1.0,
        explanation: e.explanation || e.trigger_reason || 'Anomaly detected by computer vision pipeline.',
        evidence_url: `${API_V1_PREFIX}/events/${e.id}/evidence`,
      };
    });
  },

  async getEvent(eventId: string): Promise<VideoEvent> {
    const res = await client.get<any>(`/events/${eventId}`);
    const e = res.data;
    return {
      id: String(e.id),
      video_id: String(e.video_id),
      track_id: e.track_id || 0,
      event_type: e.event_type,
      behaviour: 'Stationary',
      start_time: e.start_time,
      end_time: e.end_time || e.start_time + 5,
      severity: (e.severity ? e.severity.toLowerCase() : 'medium') as any,
      zone: e.spatial_zone || undefined,
      confidence: e.confidence ?? 1.0,
      explanation: e.explanation || e.trigger_reason || 'Anomaly detected by computer vision pipeline.',
      evidence_url: `${API_V1_PREFIX}/events/${e.id}/evidence`,
    };
  },

  getEventEvidenceUrl(eventId: string): string {
    return `${API_V1_PREFIX}/events/${eventId}/evidence`;
  },
};
