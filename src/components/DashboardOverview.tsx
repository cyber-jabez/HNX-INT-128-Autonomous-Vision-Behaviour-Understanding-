import React from 'react';
import {
  PlaySquare,
  Sparkles,
  ShieldCheck,
  Activity,
  ArrowRight,
  Clock,
  Eye,
  CheckCircle2,
  FileSearch,
  Users
} from 'lucide-react';
import { VideoMetadata, VideoEvent, TrackDetection } from '../types';

interface DashboardOverviewProps {
  onStartAnalysis: () => void;
  onTryDemo: () => void;
  videos: VideoMetadata[];
  events: VideoEvent[];
  tracks: TrackDetection[];
  onSelectEvent: (event: VideoEvent) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onStartAnalysis,
  onTryDemo,
  videos,
  events,
  tracks,
  onSelectEvent,
}) => {
  const stats = [
    {
      title: 'Videos Analyzed',
      value: videos.length.toString(),
      subtext: 'Indexed streams',
      accent: 'border-[#BFD7FF] bg-[#F0F5FF]',
      pill: 'bg-[#E3EDFF] text-[#1D4ED8]',
    },
    {
      title: 'Events Detected',
      value: events.length.toString(),
      subtext: 'Anomalies & actions',
      accent: 'border-[#FFD6B8] bg-[#FFF7F0]',
      pill: 'bg-[#FFE6D4] text-[#C2410C]',
    },
    {
      title: 'Entities Tracked',
      value: '28',
      subtext: 'Persistent IDs',
      accent: 'border-[#C9C2FF] bg-[#F3F1FF]',
      pill: 'bg-[#E4DEFF] text-[#5B21B6]',
    },
    {
      title: 'Evidence Verified',
      value: '100%',
      subtext: 'Timestamped clips',
      accent: 'border-[#BFE8D0] bg-[#F0FAF4]',
      pill: 'bg-[#D7F3E2] text-[#15803D]',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Hero Section */}
      <div className="bg-[#FFFFFF] border border-[#E8E9E6] rounded-2xl p-8 sm:p-10 shadow-xs relative overflow-hidden">
        {/* Subtle decorative pastel accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#F3F1FF] via-[#F0FAF4] to-transparent rounded-full blur-3xl opacity-60 pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[#F3F1FF] text-[#4C3CB8] border border-[#E1DCFF]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ChronoVision Intelligence Core</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-[#1F2937] tracking-tight leading-tight">
            Understand what happened.
          </h2>

          <p className="text-sm sm:text-base text-[#6B7280] leading-relaxed">
            Analyze video, reconstruct behavior over time, and ask questions backed by visual evidence.
            Zero black boxes — every AI inference is bound to precise frames and temporal graphs.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onStartAnalysis}
              className="px-5 py-2.5 bg-[#1F2937] hover:bg-[#111827] text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-2 active:scale-98"
            >
              <PlaySquare className="w-4 h-4 text-[#C9C2FF]" />
              <span>Analyze Video</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onTryDemo}
              className="px-5 py-2.5 bg-[#F4F5F2] hover:bg-[#EAEBE7] text-[#1F2937] text-xs font-medium rounded-xl border border-[#E8E9E6] transition active:scale-98"
            >
              Try Demo Video
            </button>
          </div>
        </div>
      </div>

      {/* 4 Compact Stat Surfaces */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, idx) => (
          <div
            key={idx}
            className="bg-[#FFFFFF] border border-[#E8E9E6] rounded-xl p-4 shadow-xs transition hover:border-[#DCDDD9]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#6B7280] font-medium">{s.title}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${s.pill}`}>
                {s.subtext}
              </span>
            </div>
            <div className="mt-3 text-2xl font-bold text-[#1F2937] tracking-tight font-mono">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline Visual Flow */}
      <div className="bg-[#FFFFFF] border border-[#E8E9E6] rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0F1EE]">
          <span className="text-xs font-semibold text-[#1F2937] tracking-tight">
            Reasoning Architecture Pipeline
          </span>
          <span className="text-[11px] text-[#6B7280]">Real-Time Processing</span>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
          {[
            { step: '01', name: 'Video Upload', desc: 'Frame extraction' },
            { step: '02', name: 'Detection', desc: 'YOLOv8 Objects' },
            { step: '03', name: 'Tracking', desc: 'ByteTrack Vectors' },
            { step: '04', name: 'Behaviour', desc: 'Kinematic states' },
            { step: '05', name: 'Temporal Logic', desc: 'Interval relations' },
            { step: '06', name: 'Evidence', desc: 'Traceable proof' },
          ].map((item, i) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-[#FAFAF8] border border-[#E8E9E6] flex flex-col items-center justify-center gap-1"
            >
              <span className="text-[10px] font-mono text-[#9CA3AF] font-bold">{item.step}</span>
              <span className="font-semibold text-[#1F2937] text-[11px]">{item.name}</span>
              <span className="text-[10px] text-[#6B7280]">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Incidents & Quick Evidence Cards */}
      <div className="bg-[#FFFFFF] border border-[#E8E9E6] rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0F1EE]">
          <div>
            <h3 className="text-xs font-semibold text-[#1F2937]">Recent Temporal Incidents</h3>
            <p className="text-[11px] text-[#6B7280]">
              Identified by autonomous behavioural rules and spatial containment
            </p>
          </div>
          <button
            onClick={onStartAnalysis}
            className="text-xs text-[#4C3CB8] hover:underline font-medium"
          >
            View in workspace →
          </button>
        </div>

        <div className="space-y-2">
          {events.slice(0, 3).map((evt) => (
            <div
              key={evt.id}
              onClick={() => {
                onSelectEvent(evt);
                onStartAnalysis();
              }}
              className="p-3 rounded-xl bg-[#FAFAF8] hover:bg-[#F4F5F2] border border-[#E8E9E6] cursor-pointer transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    evt.severity === 'critical'
                      ? 'bg-[#F6C1C7]'
                      : evt.severity === 'high'
                      ? 'bg-[#FFD6B8]'
                      : 'bg-[#C9C2FF]'
                  }`}
                />
                <div>
                  <p className="text-xs font-semibold text-[#1F2937] group-hover:text-[#4C3CB8] transition">
                    {evt.event_type}
                  </p>
                  <p className="text-[11px] text-[#6B7280]">
                    Track #{evt.track_id} • {evt.zone || 'Global Scene'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-[#4B5563] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#E8E9E6]">
                  {evt.start_time.toFixed(1)}s – {evt.end_time.toFixed(1)}s
                </span>
                <span className="text-[11px] text-[#4C3CB8] opacity-0 group-hover:opacity-100 transition font-medium">
                  Inspect
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
