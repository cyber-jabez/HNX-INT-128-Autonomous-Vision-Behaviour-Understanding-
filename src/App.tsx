import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { VideoPlayer } from './components/VideoPlayer';
import { EventTimeline } from './components/EventTimeline';
import { BottomDetails } from './components/BottomDetails';
import { ZoneEditorPanel } from './components/ZoneEditorPanel';
import { VideoUploadModal } from './components/VideoUploadModal';
import { DashboardOverview } from './components/DashboardOverview';
import { AskAIPanel } from './components/AskAIPanel';
import { BehaviourView } from './components/BehaviourView';
import { TemporalGraphView } from './components/TemporalGraphView';
import { EvidencePage } from './components/EvidencePage';
import { AnalysisPanelRight } from './components/AnalysisPanelRight';
import { VideoMetadata, TrackDetection, Zone, VideoEvent } from './types';
import { api } from './services/api';
import { MOCK_VIDEOS, MOCK_ZONES, MOCK_EVENTS, generateMockTracksAtTime } from './services/mockData';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [videos, setVideos] = useState<VideoMetadata[]>(MOCK_VIDEOS);
  const [selectedVideo, setSelectedVideo] = useState<VideoMetadata | null>(MOCK_VIDEOS[0]);
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

  // When selected video changes, load its duration, zones, and events
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
        if (fetchedZones?.length) {
          setZones(fetchedZones);
        } else if (currentVid.id === 'vid-demo-01') {
          setZones(MOCK_ZONES);
        } else {
          setZones([]);
        }

        if (fetchedEvents?.length) {
          setEvents(fetchedEvents);
          setSelectedEvent((prev) => {
            if (prev && fetchedEvents.some((e) => e.id === prev.id)) return prev;
            return fetchedEvents[0];
          });
        } else if (currentVid.id === 'vid-demo-01') {
          setEvents(MOCK_EVENTS);
          setSelectedEvent(MOCK_EVENTS[0]);
        } else {
          setEvents([]);
          setSelectedEvent(null);
        }
      } catch {
        if (currentVid.id === 'vid-demo-01') {
          setZones(MOCK_ZONES);
          setEvents(MOCK_EVENTS);
          setSelectedEvent(MOCK_EVENTS[0]);
        }
      }
    }
    loadVideoContext();

    // Check status if video is processing
    if (currentVid.status === 'processing' || currentVid.status === 'uploaded') {
      const interval = setInterval(async () => {
        try {
          const status = await api.getVideoStatus(currentVid.id);
          if (status.status === 'ready' || status.status === 'completed') {
            refreshVideos();
            clearInterval(interval);
          }
        } catch {
          // ignore polling failure
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedVideo, refreshVideos]);

  // Fetch real tracks at current timestamp, or generate mock tracks
  useEffect(() => {
    if (!selectedVideo) {
      setTracks([]);
      return;
    }

    let isSubscribed = true;

    if (selectedVideo.id.startsWith('vid-demo')) {
      const mockDetections = generateMockTracksAtTime(currentTime);
      setTracks(mockDetections);
      return;
    }

    api
      .getVideoTracks(selectedVideo.id, currentTime)
      .then((realTracks) => {
        if (!isSubscribed) return;
        if (realTracks && realTracks.length > 0) {
          // Enrich with handheld object or weapon tags if events or keywords correlate
          const enriched = realTracks.map((trk) => {
            const hasWeaponEvent = events.some(
              (e) =>
                e.track_id === trk.track_id &&
                (e.event_type.toLowerCase().includes('weapon') ||
                  e.explanation.toLowerCase().includes('gun') ||
                  e.explanation.toLowerCase().includes('weapon'))
            );
            return {
              ...trk,
              held_object: hasWeaponEvent ? 'Handgun / Weapon' : undefined,
              is_armed: hasWeaponEvent,
            };
          });
          setTracks(enriched);
        } else {
          const fallback = generateMockTracksAtTime(currentTime);
          setTracks(fallback);
        }
      })
      .catch(() => {
        if (isSubscribed) {
          const fallback = generateMockTracksAtTime(currentTime);
          setTracks(fallback);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [selectedVideo, currentTime, duration, events]);

  // Zone creation handler
  const handleZoneCreated = async (zoneData: Omit<Zone, 'id' | 'video_id'>) => {
    if (!selectedVideo) return;
    try {
      const newZone = await api.createZone(selectedVideo.id, zoneData);
      setZones((prev) => [...prev, newZone]);
      setIsDrawingZone(false);
    } catch {
      const localZone: Zone = {
        ...zoneData,
        id: `zone-local-${Date.now()}`,
        video_id: selectedVideo.id,
      };
      setZones((prev) => [...prev, localZone]);
      setIsDrawingZone(false);
    }
  };

  // Zone delete handler
  const handleDeleteZone = async (zoneId: string) => {
    try {
      await api.deleteZone(zoneId);
      setZones((prev) => prev.filter((z) => z.id !== zoneId));
    } catch {
      setZones((prev) => prev.filter((z) => z.id !== zoneId));
    }
  };

  // Check if any weapon is currently detected
  const hasWeaponDetected = useMemo(() => {
    return (
      tracks.some((t) => t.is_armed || (t.held_object && t.held_object.toLowerCase().includes('gun'))) ||
      events.some((e) => e.event_type.toLowerCase().includes('weapon') || e.explanation.toLowerCase().includes('gun'))
    );
  }, [tracks, events]);

  const activeVideoUrl = selectedVideo
    ? selectedVideo.stream_url || api.getVideoStreamUrl(selectedVideo.id)
    : '';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FBFBFA]">
      {/* 1. Sleek Minimalist Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        analyzedVideoCount={videos.length}
        eventsCount={events.length}
        hasWeaponDetected={hasWeaponDetected}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 2. Top Header Navigation Bar */}
        <Header
          videos={videos}
          selectedVideo={selectedVideo}
          onSelectVideo={setSelectedVideo}
          onOpenUpload={() => setIsUploadOpen(true)}
          activeTabTitle={
            currentTab === 'overview'
              ? 'Dashboard'
              : currentTab === 'analyze'
              ? 'Video Analysis & Threat HUD'
              : currentTab === 'timeline'
              ? 'Incident Timeline'
              : currentTab === 'behaviour'
              ? 'Behaviour Tracks'
              : currentTab === 'graph'
              ? 'Temporal Graph'
              : currentTab === 'ask-ai'
              ? 'Ask AI Agent'
              : 'Verifiable Evidence'
          }
          hasWeaponDetected={hasWeaponDetected}
        />

        {/* 3. Tab Body Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 min-w-0">
          {/* TAB: DASHBOARD OVERVIEW */}
          {currentTab === 'overview' && (
            <DashboardOverview
              videos={videos}
              events={events}
              tracks={tracks}
              onStartAnalysis={() => setCurrentTab('analyze')}
              onTryDemo={() => {
                if (videos.length > 0) setSelectedVideo(videos[0]);
                setCurrentTab('analyze');
              }}
              onSelectEvent={(evt) => {
                setSelectedEvent(evt);
                setCurrentTime(evt.start_time);
                setCurrentTab('analyze');
              }}
            />
          )}

          {/* TAB: VIDEO ANALYSIS & THREAT HUD */}
          {currentTab === 'analyze' && (
            <div className="space-y-4 max-w-[1720px] mx-auto animate-in fade-in duration-200">
              {/* Primary Visual Cockpit: 2-column layout */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                {/* Left (8 cols): Video Player + Geofence Zone Editor */}
                <div className="xl:col-span-8 flex flex-col gap-4">
                  <VideoPlayer
                    videoUrl={activeVideoUrl}
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
                    onSelectTrack={setSelectedTrackId}
                  />

                  {/* Geofence Zone Editor */}
                  <ZoneEditorPanel
                    zones={zones}
                    isDrawing={isDrawingZone}
                    onStartDrawing={(zType) => {
                      setDrawingZoneType(zType);
                      setIsDrawingZone(true);
                    }}
                    onCancelDrawing={() => setIsDrawingZone(false)}
                    onDeleteZone={handleDeleteZone}
                  />
                </div>

                {/* Right (4 cols): Weapon HUD & Incident Feed */}
                <div className="xl:col-span-4">
                  <AnalysisPanelRight
                    events={events}
                    tracks={tracks}
                    currentTime={currentTime}
                    selectedEvent={selectedEvent}
                    selectedTrackId={selectedTrackId}
                    onSelectEvent={setSelectedEvent}
                    onSelectTrack={setSelectedTrackId}
                    onSeek={setCurrentTime}
                  />
                </div>
              </div>

              {/* Chronological Incident Timeline Scrubber */}
              <EventTimeline
                events={events}
                duration={duration}
                currentTime={currentTime}
                onSeek={setCurrentTime}
                selectedEventId={selectedEvent?.id || null}
                onSelectEvent={setSelectedEvent}
              />

              {/* Bottom Forensic Telemetry & Verified Snapshot Cards */}
              <BottomDetails
                selectedEvent={selectedEvent}
                onSeek={setCurrentTime}
              />
            </div>
          )}

          {/* TAB: TIMELINE VIEW */}
          {currentTab === 'timeline' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <EventTimeline
                events={events}
                duration={duration}
                currentTime={currentTime}
                onSeek={(t) => {
                  setCurrentTime(t);
                  setCurrentTab('analyze');
                }}
                selectedEventId={selectedEvent?.id || null}
                onSelectEvent={(evt) => {
                  setSelectedEvent(evt);
                  setCurrentTime(evt.start_time);
                  setCurrentTab('analyze');
                }}
              />
              <BottomDetails selectedEvent={selectedEvent} onSeek={setCurrentTime} />
            </div>
          )}

          {/* TAB: BEHAVIOUR VIEW */}
          {currentTab === 'behaviour' && (
            <BehaviourView
              videoId={selectedVideo?.id}
              events={events}
              tracks={tracks}
              onSeek={(t) => {
                setCurrentTime(t);
                setCurrentTab('analyze');
              }}
              onNavigateToAnalysis={() => setCurrentTab('analyze')}
              onSelectTrackId={setSelectedTrackId}
            />
          )}

          {/* TAB: TEMPORAL GRAPH */}
          {currentTab === 'graph' && (
            <TemporalGraphView
              events={events}
              zones={zones}
              onSeek={(t) => {
                setCurrentTime(t);
                setCurrentTab('analyze');
              }}
              onNavigateToAnalysis={() => setCurrentTab('analyze')}
            />
          )}

          {/* TAB: ASK AI REASONER */}
          {currentTab === 'ask-ai' && (
            <AskAIPanel
              selectedVideo={selectedVideo}
              events={events}
              tracks={tracks}
              onSeek={(t) => {
                setCurrentTime(t);
                setCurrentTab('analyze');
              }}
              onNavigateToAnalysis={() => setCurrentTab('analyze')}
            />
          )}

          {/* TAB: EVIDENCE ARCHIVE */}
          {currentTab === 'evidence' && (
            <EvidencePage
              events={events}
              selectedEvent={selectedEvent}
              onSelectEvent={setSelectedEvent}
              onSeek={(t) => {
                setCurrentTime(t);
                setCurrentTab('analyze');
              }}
            />
          )}
        </main>
      </div>

      {/* Video Upload Modal */}
      {isUploadOpen && (
        <VideoUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onVideoUploaded={(newVideo: VideoMetadata) => {
            setVideos((prev) => [newVideo, ...prev]);
            setSelectedVideo(newVideo);
            setIsUploadOpen(false);
            setCurrentTab('analyze');
          }}
        />
      )}
    </div>
  );
}
export default App;
