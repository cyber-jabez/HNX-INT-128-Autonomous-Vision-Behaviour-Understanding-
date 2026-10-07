import React, { useState, useEffect, useCallback } from 'react';
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
        if (!isCancelled && backendTracks && backendTracks.length > 0) {
          setTracks(backendTracks);
        } else if (selectedVideo.id === 'vid-demo-01') {
          setTracks(generateMockTracksAtTime(currentTime));
        } else {
          setTracks(backendTracks || []);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          if (selectedVideo.id === 'vid-demo-01') {
            setTracks(generateMockTracksAtTime(currentTime));
          } else {
            setTracks([]);
          }
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
      console.warn('Backend zone create failed or offline, saving to local state:', err);
      const newZone: Zone = {
        ...zoneData,
        id: `zone-${Date.now()}`,
        video_id: selectedVideo.id,
      };
      setZones((prev) => [...prev, newZone]);
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

  const tabTitles: Record<NavTab, string> = {
    overview: 'Overview',
    analyze: 'Video Analysis',
    timeline: 'Event Timeline',
    behaviour: 'Behaviour Intelligence',
    graph: 'Temporal Graph',
    'ask-ai': 'Ask AI',
    evidence: 'Evidence',
    settings: 'Settings',
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAF8]">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        analyzedVideoCount={videos.length}
        eventsCount={events.length}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          videos={videos}
          selectedVideo={selectedVideo}
          onSelectVideo={(v) => {
            setSelectedVideo(v);
            setCurrentTime(0);
          }}
          onOpenUpload={() => setIsUploadOpen(true)}
          activeTabTitle={tabTitles[currentTab]}
        />

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto">
          {/* ── Overview / Dashboard ── */}
          {currentTab === 'overview' && (
            <div className="p-6 lg:p-8">
              <DashboardOverview
                onStartAnalysis={() => setCurrentTab('analyze')}
                onTryDemo={() => {
                  setSelectedVideo(MOCK_VIDEOS[0]);
                  setCurrentTab('analyze');
                }}
                videos={videos}
                events={events}
                tracks={tracks}
                onSelectEvent={(evt) => {
                  setSelectedEvent(evt);
                  setCurrentTime(evt.start_time);
                  setCurrentTab('analyze');
                }}
              />
            </div>
          )}

          {/* ── Analyze / Main Workspace ── */}
          {currentTab === 'analyze' && (
            <div className="flex flex-col h-full">
              {/* Video + Analysis Panel — Two Columns */}
              <div className="flex flex-col lg:flex-row flex-1 gap-0 min-h-0">
                {/* Left: Video Player (65%) */}
                <div className="flex flex-col flex-1 min-w-0 p-4 lg:p-5 lg:pr-2.5 gap-4">
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
                    onSelectTrack={(id) =>
                      setSelectedTrackId(id === selectedTrackId ? null : id)
                    }
                  />

                  {/* Zone Editor */}
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

                  {/* Timeline */}
                  <EventTimeline
                    events={events}
                    duration={duration}
                    currentTime={currentTime}
                    onSeek={handleSeek}
                    selectedEventId={selectedEvent?.id || null}
                    onSelectEvent={(evt) => setSelectedEvent(evt)}
                  />
                </div>

                {/* Right: Analysis Panel (35%) */}
                <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0 p-4 lg:p-5 lg:pl-2.5 flex flex-col gap-4">
                  <AnalysisPanelRight
                    events={events}
                    tracks={tracks}
                    currentTime={currentTime}
                    selectedEvent={selectedEvent}
                    selectedTrackId={selectedTrackId}
                    onSelectEvent={(evt) => {
                      setSelectedEvent(evt);
                      setCurrentTime(evt.start_time);
                    }}
                    onSelectTrack={(id) =>
                      setSelectedTrackId(id === selectedTrackId ? null : id)
                    }
                    onSeek={handleSeek}
                  />
                </div>
              </div>

              {/* Bottom: Event Details + Evidence */}
              <div className="p-4 lg:p-5 lg:pt-0 border-t border-[#E7E7E3]">
                <BottomDetails
                  selectedEvent={selectedEvent}
                  onSeek={handleSeek}
                />
              </div>
            </div>
          )}

          {/* ── Timeline Page ── */}
          {currentTab === 'timeline' && (
            <div className="p-6 lg:p-8 space-y-6">
              {/* Hero heading */}
              <div>
                <h2 className="text-2xl font-bold text-[#1F2937]">Event Timeline</h2>
                <p className="text-sm text-[#6B7280] mt-1">
                  All detected events plotted chronologically. Click to seek and inspect.
                </p>
              </div>

              {/* Full-width timeline */}
              <EventTimeline
                events={events}
                duration={duration}
                currentTime={currentTime}
                onSeek={(t) => {
                  handleSeek(t);
                  setCurrentTab('analyze');
                }}
                selectedEventId={selectedEvent?.id || null}
                onSelectEvent={(evt) => {
                  setSelectedEvent(evt);
                  setCurrentTime(evt.start_time);
                }}
              />

              {/* All events list */}
              <div className="bg-white border border-[#E7E7E3] rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-[#F0F1EE]">
                  <h3 className="text-sm font-semibold text-[#1F2937]">All Events</h3>
                  <p className="text-xs text-[#6B7280]">{events.length} events recorded</p>
                </div>
                <div className="divide-y divide-[#F0F1EE]">
                  {events.map((evt) => {
                    const severityMap: Record<string, { bg: string; text: string; dot: string }> = {
                      critical: { bg: '#FDF2F4', text: '#9C1F2E', dot: '#F5C8CF' },
                      high: { bg: '#FFF7F0', text: '#9A4B10', dot: '#FFDCC5' },
                      medium: { bg: '#FEFCEE', text: '#7A6200', dot: '#F7E7AE' },
                      low: { bg: '#F0FAF4', text: '#1B663E', dot: '#C8EBD8' },
                    };
                    const s = severityMap[evt.severity] || severityMap.low;
                    return (
                      <button
                        key={evt.id}
                        onClick={() => {
                          setSelectedEvent(evt);
                          setCurrentTime(evt.start_time);
                          setCurrentTab('analyze');
                        }}
                        className="w-full text-left px-5 py-4 hover:bg-[#FAFAF8] transition flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-4">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: s.dot }}
                          />
                          <div>
                            <p className="text-sm font-semibold text-[#1F2937] group-hover:text-[#4C3CB8] transition">
                              {evt.event_type}
                            </p>
                            <p className="text-xs text-[#6B7280] mt-0.5">
                              Track #{evt.track_id} · {evt.zone || 'Global Scene'} · {(evt.confidence * 100).toFixed(0)}% confidence
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className="text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full"
                            style={{ backgroundColor: s.bg, color: s.text }}
                          >
                            {evt.severity}
                          </span>
                          <span className="font-mono text-xs text-[#6B7280]">
                            {evt.start_time.toFixed(1)}s
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Behaviour Page ── */}
          {currentTab === 'behaviour' && (
            <div className="p-6 lg:p-8">
              <BehaviourView
                events={events}
                onSeek={(t) => {
                  handleSeek(t);
                  setCurrentTab('analyze');
                }}
                onNavigateToAnalysis={() => setCurrentTab('analyze')}
                onSelectTrackId={(id) => {
                  setSelectedTrackId(id);
                  setCurrentTab('analyze');
                }}
              />
            </div>
          )}

          {/* ── Temporal Graph Page ── */}
          {currentTab === 'graph' && (
            <div className="p-6 lg:p-8">
              <TemporalGraphView
                onSeek={(t) => {
                  handleSeek(t);
                  setCurrentTab('analyze');
                }}
                onNavigateToAnalysis={() => setCurrentTab('analyze')}
              />
            </div>
          )}

          {/* ── Ask AI Page ── */}
          {currentTab === 'ask-ai' && (
            <div className="p-6 lg:p-8">
              <AskAIPanel
                onSeek={(t) => {
                  handleSeek(t);
                  setCurrentTab('analyze');
                }}
                onNavigateToAnalysis={() => setCurrentTab('analyze')}
              />
            </div>
          )}

          {/* ── Evidence Page ── */}
          {currentTab === 'evidence' && (
            <div className="p-6 lg:p-8">
              <EvidencePage
                events={events}
                selectedEvent={selectedEvent}
                onSelectEvent={(evt) => {
                  setSelectedEvent(evt);
                  setCurrentTime(evt.start_time);
                }}
                onSeek={(t) => {
                  handleSeek(t);
                  setCurrentTab('analyze');
                }}
              />
            </div>
          )}

          {/* ── Settings Page ── */}
          {currentTab === 'settings' && (
            <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#1F2937]">System Settings</h2>
                <p className="text-sm text-[#6B7280] mt-1">
                  Configure ChronoVision analysis parameters and integrations.
                </p>
              </div>

              {[
                { label: 'API Endpoint', value: 'http://localhost:8000', desc: 'Backend vision processing server' },
                { label: 'Detection Model', value: 'YOLOv8-x (Ultralytics)', desc: 'Object detection architecture' },
                { label: 'Tracking Algorithm', value: 'ByteTrack v2', desc: 'Multi-object tracker' },
                { label: 'Behaviour Engine', value: 'Kinematic Rules v1.3', desc: 'Anomaly classification logic' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-white border border-[#E7E7E3] rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#1F2937]">{item.label}</p>
                    <p className="text-xs text-[#9CA3AF]">{item.desc}</p>
                  </div>
                  <span className="font-mono text-xs text-[#4C3CB8] bg-[#F3F1FF] px-3 py-1 rounded-lg border border-[#E1DCFF]">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

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
