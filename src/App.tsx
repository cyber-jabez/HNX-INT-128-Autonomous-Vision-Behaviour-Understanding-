import React, { useState, useEffect, useCallback } from 'react';
import { TopBar } from './components/TopBar';
import { VideoPlayer } from './components/VideoPlayer';
import { MiddlePanels } from './components/MiddlePanels';
import { EventTimeline } from './components/EventTimeline';
import { BottomDetails } from './components/BottomDetails';
import { ZoneEditorPanel } from './components/ZoneEditorPanel';
import { VideoUploadModal } from './components/VideoUploadModal';
import { VideoMetadata, TrackDetection, Zone, VideoEvent } from './types';
import { api } from './services/api';

export function App() {
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoMetadata | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Playback state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Detections & Tracking
  const [tracks, setTracks] = useState<TrackDetection[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);

  // Zones & Drawing
  const [zones, setZones] = useState<Zone[]>([]);
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [drawingZoneType, setDrawingZoneType] = useState('Restricted Zone');

  // Events & Alerts
  const [events, setEvents] = useState<VideoEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<VideoEvent | null>(null);

  // Load real backend videos on mount
  const refreshVideos = useCallback(async () => {
    try {
      const fetchedVideos = await api.getVideos();
      setVideos(fetchedVideos || []);
      if (fetchedVideos && fetchedVideos.length > 0) {
        setSelectedVideo((prev) => {
          if (!prev) return fetchedVideos[0];
          const exists = fetchedVideos.find((v) => v.id === prev.id);
          return exists || fetchedVideos[0];
        });
      } else {
        setSelectedVideo(null);
      }
    } catch (err) {
      console.error('Failed to load videos from backend:', err);
      setVideos([]);
      setSelectedVideo(null);
    }
  }, []);

  useEffect(() => {
    refreshVideos();
  }, [refreshVideos]);

  // When selected video changes, load its real duration, zones, and events
  useEffect(() => {
    if (!selectedVideo) {
      setZones([]);
      setEvents([]);
      setSelectedEvent(null);
      setTracks([]);
      setDuration(0);
      return;
    }

    const currentVid = selectedVideo;
    if (currentVid.duration_seconds > 0) {
      setDuration(currentVid.duration_seconds);
    }

    async function loadVideoContext() {
      try {
        const [fetchedZones, fetchedEvents] = await Promise.all([
          api.getZones(currentVid.id),
          api.getVideoEvents(currentVid.id),
        ]);
        setZones(fetchedZones || []);
        setEvents(fetchedEvents || []);
        setSelectedEvent((prev) => {
          if (prev && fetchedEvents?.some((e) => e.id === prev.id)) return prev;
          return fetchedEvents && fetchedEvents.length > 0 ? fetchedEvents[0] : null;
        });
      } catch (err) {
        console.error('Error fetching video zones or events:', err);
      }
    }

    loadVideoContext();

    // Periodically sync events and check processing completion
    const interval = setInterval(async () => {
      try {
        await loadVideoContext();
        const statusResp = await api.getVideoStatus(currentVid.id);
        if (statusResp && statusResp.status && statusResp.status.toLowerCase() === 'completed') {
          clearInterval(interval);
        }
      } catch {
        // quiet ignore
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedVideo]);

  // Fetch real tracks from backend based on currentTime
  useEffect(() => {
    if (!selectedVideo) {
      setTracks([]);
      return;
    }

    let isCancelled = false;
    api
      .getVideoTracks(selectedVideo.id, currentTime)
      .then((backendTracks) => {
        if (!isCancelled) {
          setTracks(backendTracks || []);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setTracks([]);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [currentTime, selectedVideo]);

  // Handle new zone creation
  const handleZoneCreated = async (zoneData: Omit<Zone, 'id' | 'video_id'>) => {
    if (!selectedVideo) return;
    setIsDrawingZone(false);

    try {
      const created = await api.createZone(selectedVideo.id, zoneData);
      setZones((prev) => [...prev, created]);
    } catch (err) {
      console.error('Failed to create zone on backend:', err);
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    setZones((prev) => prev.filter((z) => z.id !== zoneId));
    try {
      await api.deleteZone(zoneId);
    } catch (err) {
      console.error('Failed to delete zone on backend:', err);
    }
  };

  const handleVideoUploaded = (newVideo: VideoMetadata) => {
    setVideos((prev) => [newVideo, ...prev]);
    setSelectedVideo(newVideo);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
  };

  const currentStreamUrl = selectedVideo
    ? selectedVideo.stream_url || api.getVideoStreamUrl(selectedVideo.id)
    : '';

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col p-4 md:p-6 lg:p-8 space-y-5 max-w-[1720px] mx-auto">
      {/* 1. Header & Video Switcher */}
      <TopBar
        videos={videos}
        selectedVideo={selectedVideo}
        onSelectVideo={(v) => {
          setSelectedVideo(v);
          setCurrentTime(0);
        }}
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      {/* 2. Main Surveillance Video Player with HUD Overlays */}
      <VideoPlayer
        videoUrl={currentStreamUrl}
        currentTime={currentTime}
        onTimeUpdate={setCurrentTime}
        onDurationChange={setDuration}
        tracks={tracks}
        zones={zones}
        isZoneDrawingActive={isDrawingZone}
        drawingZoneType={drawingZoneType}
        onZoneCreated={handleZoneCreated}
        onCancelZoneDrawing={() => setIsDrawingZone(false)}
        selectedTrackId={selectedTrackId}
        onSelectTrack={(id) => setSelectedTrackId(id === selectedTrackId ? null : id)}
      />

      {/* 3. Zone Editor Toolbar */}
      <ZoneEditorPanel
        zones={zones}
        isDrawing={isDrawingZone}
        onStartDrawing={(type) => {
          setDrawingZoneType(type);
          setIsDrawingZone(true);
        }}
        onCancelDrawing={() => setIsDrawingZone(false)}
        onDeleteZone={handleDeleteZone}
      />

      {/* 4. Active Alerts, Tracked Objects, and Current Behaviours */}
      <MiddlePanels
        events={events}
        tracks={tracks}
        currentTime={currentTime}
        onSelectEvent={(evt) => {
          setSelectedEvent(evt);
          setCurrentTime(evt.start_time);
        }}
        selectedTrackId={selectedTrackId}
        onSelectTrack={(id) => setSelectedTrackId(id === selectedTrackId ? null : id)}
      />

      {/* 5. Chronological Event Timeline */}
      <EventTimeline
        events={events}
        duration={duration}
        currentTime={currentTime}
        onSeek={handleSeek}
        selectedEventId={selectedEvent?.id || null}
        onSelectEvent={(evt) => setSelectedEvent(evt)}
      />

      {/* 6. Event Details Diagnostics & Evidence Video Viewer */}
      <BottomDetails
        selectedEvent={selectedEvent}
        onSeek={handleSeek}
      />

      {/* Upload Modal */}
      <VideoUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onVideoUploaded={handleVideoUploaded}
      />
    </div>
  );
}

export default App;
