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
import { MOCK_VIDEOS, MOCK_ZONES, MOCK_EVENTS, generateMockTracksAtTime } from './services/mockData';

export function App() {
  const [videos, setVideos] = useState<VideoMetadata[]>(MOCK_VIDEOS);
  const [selectedVideo, setSelectedVideo] = useState<VideoMetadata | null>(MOCK_VIDEOS[0]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Playback state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(64);

  // Detections & Tracking
  const [tracks, setTracks] = useState<TrackDetection[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);

  // Zones & Drawing
  const [zones, setZones] = useState<Zone[]>(MOCK_ZONES);
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [drawingZoneType, setDrawingZoneType] = useState('Restricted Zone');

  // Events & Alerts
  const [events, setEvents] = useState<VideoEvent[]>(MOCK_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState<VideoEvent | null>(MOCK_EVENTS[0]);

  // Load backend videos on mount (fallback to mock)
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const fetchedVideos = await api.getVideos();
        if (fetchedVideos && fetchedVideos.length > 0) {
          setVideos(fetchedVideos);
          setSelectedVideo(fetchedVideos[0]);
        }
      } catch (err) {
        console.info('Backend offline or initializing; using built-in mock streams');
      }
    }
    fetchInitialData();
  }, []);

  // When selected video changes, load its zones and events
  useEffect(() => {
    if (!selectedVideo) return;
    const currentVid = selectedVideo;

    async function loadVideoContext() {
      try {
        const [fetchedZones, fetchedEvents] = await Promise.all([
          api.getZones(currentVid.id),
          api.getVideoEvents(currentVid.id),
        ]);
        if (fetchedZones?.length) setZones(fetchedZones);
        if (fetchedEvents?.length) {
          setEvents(fetchedEvents);
          setSelectedEvent(fetchedEvents[0]);
        }
      } catch {
        // Fallback to demo video data
        if (currentVid.id === 'vid-demo-01') {
          setZones(MOCK_ZONES);
          setEvents(MOCK_EVENTS);
          setSelectedEvent(MOCK_EVENTS[0]);
        }
      }
    }

    loadVideoContext();
  }, [selectedVideo]);

  // Continuously update tracking data based on currentTime
  useEffect(() => {
    if (!selectedVideo) return;

    // Check if real backend API provides tracks
    let isCancelled = false;
    api
      .getVideoTracks(selectedVideo.id, currentTime)
      .then((backendTracks) => {
        if (!isCancelled && backendTracks && backendTracks.length > 0) {
          setTracks(backendTracks);
        } else {
          // Generate realistic time-varying mock tracks
          setTracks(generateMockTracksAtTime(currentTime));
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setTracks(generateMockTracksAtTime(currentTime));
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [currentTime, selectedVideo]);

  // Handle new zone creation
  const handleZoneCreated = async (zoneData: Omit<Zone, 'id' | 'video_id'>) => {
    if (!selectedVideo) return;
    const newZone: Zone = {
      ...zoneData,
      id: `zone-${Date.now()}`,
      video_id: selectedVideo.id,
    };

    setZones((prev) => [...prev, newZone]);
    setIsDrawingZone(false);

    try {
      await api.createZone(selectedVideo.id, zoneData);
    } catch (err) {
      console.info('Zone saved to local state');
    }
  };

  const handleDeleteZone = (zoneId: string) => {
    setZones((prev) => prev.filter((z) => z.id !== zoneId));
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
