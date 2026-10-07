import axios from 'axios';
import { VideoMetadata, TrackDetection, Zone, VideoEvent, TrackHistory } from '../types';

// Configure backend base URL (customizable via Vite env)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Accept': 'application/json',
  },
});

export const api = {
  // Video Endpoints
  async uploadVideo(file: File, onProgress?: (pct: number) => void): Promise<VideoMetadata> {
    const formData = new FormData();
    formData.append('video', file);
    const res = await client.post<VideoMetadata>('/videos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
    return res.data;
  },

  async getVideos(): Promise<VideoMetadata[]> {
    const res = await client.get<VideoMetadata[]>('/videos');
    return res.data;
  },

  async getVideo(id: string): Promise<VideoMetadata> {
    const res = await client.get<VideoMetadata>(`/videos/${id}`);
    return res.data;
  },

  getVideoStreamUrl(id: string): string {
    return `${API_BASE_URL}/videos/${id}/stream`;
  },

  // Tracks & Detections
  async getVideoTracks(id: string, timestamp?: number): Promise<TrackDetection[]> {
    const res = await client.get<TrackDetection[]>(`/videos/${id}/tracks`, {
      params: timestamp !== undefined ? { timestamp } : {},
    });
    return res.data;
  },

  async getTrackHistory(trackId: number): Promise<TrackHistory> {
    const res = await client.get<TrackHistory>(`/tracks/${trackId}/history`);
    return res.data;
  },

  // Behaviours
  async getVideoBehaviours(id: string): Promise<Record<string, number>> {
    const res = await client.get<Record<string, number>>(`/videos/${id}/behaviours`);
    return res.data;
  },

  // Zones
  async getZones(videoId: string): Promise<Zone[]> {
    const res = await client.get<Zone[]>(`/videos/${videoId}/zones`);
    return res.data;
  },

  async createZone(videoId: string, zone: Omit<Zone, 'id' | 'video_id'>): Promise<Zone> {
    const res = await client.post<Zone>(`/videos/${videoId}/zones`, zone);
    return res.data;
  },

  // Events & Alerts
  async getVideoEvents(videoId: string): Promise<VideoEvent[]> {
    const res = await client.get<VideoEvent[]>(`/videos/${videoId}/events`);
    return res.data;
  },

  async getEvent(eventId: string): Promise<VideoEvent> {
    const res = await client.get<VideoEvent>(`/events/${eventId}`);
    return res.data;
  },

  getEventEvidenceUrl(eventId: string): string {
    return `${API_BASE_URL}/events/${eventId}/evidence`;
  },
};
