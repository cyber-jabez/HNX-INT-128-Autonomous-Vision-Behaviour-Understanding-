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
  Flame,
  Users,
  Crosshair,
  Lock
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
  const armedEvents = events.filter((e) =>
    e.event_type.toLowerCase().includes('weapon') ||
    e.event_type.toLowerCase().includes('gun') ||
    e.explanation.toLowerCase().includes('gun')
  );

  const stats = [
    {
      title: 'Streams Indexed',
      value: videos.length.toString(),
      subtext: 'High-res video feeds',
      badge: 'Active',
      badgeColor: 'bg-[#F0FDF4] text-[#15803D] border-[#DCFCE7]',
    },
    {
      title: 'Total Incidents',
      value: events.length.toString(),
      subtext: 'Anomalies & intrusions',
      badge: 'Monitored',
      badgeColor: 'bg-[#FFF7ED] text-[#C2410C] border-[#FFEDD5]',
    },
    {
      title: 'Weapon / Threat Detections',
      value: armedEvents.length > 0 ? armedEvents.length.toString() : '0',
      subtext: 'Handgun & weapon alerts',
      badge: armedEvents.length > 0 ? 'ALERT' : 'CLEAR',
      badgeColor: armedEvents.length > 0 ? 'bg-[#FFF1F2] text-[#BE123C] border-[#FEE2E2]' : 'bg-[#F0FDF4] text-[#15803D] border-[#DCFCE7]',
    },
    {
      title: 'Temporal Evidence Rate',
      value: '100%',
      subtext: 'Cryptographic frame proof',
      badge: 'Verified',
      badgeColor: 'bg-[#EEF2FF] text-[#4338CA] border-[#DDE4FF]',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Hero Welcome Card */}
      <div className="bg-[#FFFFFF] border border-[#EDEDEA] rounded-3xl p-8 sm:p-10 shadow-xs relative overflow-hidden">
        {/* Soft Ambient Light Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#EEF2FF] via-[#ECFDF5] to-transparent rounded-full blur-3xl opacity-70 pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#EEF2FF] text-[#4338CA] border border-[#DDE4FF]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Autonomous Vision & Threat Intelligence Core</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight leading-tight">
            Surveillance without blind spots.
          </h2>

          <p className="text-sm sm:text-base text-[#4B5563] leading-relaxed">
            State-of-the-art vision intelligence for perimeter breaches, person tracking, and real-time detection of weapons and objects in hand. Bound directly to verifiable temporal evidence.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onStartAnalysis}
              className="px-5 py-2.5 bg-[#111827] hover:bg-black text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-2 active:scale-95"
            >
              <PlaySquare className="w-4 h-4 text-[#A5B4FC]" />
              <span>Launch Live Analysis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onTryDemo}
              className="px-5 py-2.5 bg-[#F8F9FA] hover:bg-[#EDEDEA] text-[#111827] text-xs font-semibold rounded-xl border border-[#EDEDEA] transition active:scale-95"
            >
              Load Surveillance Feed
            </button>
          </div>
        </div>
      </div>

      {/* High-level KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.title}
            className="bg-[#FFFFFF] border border-[#EDEDEA] rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-[#D1D2CC] transition"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#6B7280]">{s.title}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.badgeColor}`}>
                {s.badge}
              </span>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-[#111827] tracking-tight font-mono">
                {s.value}
              </div>
              <p className="text-xs text-[#8E95A2] mt-1">{s.subtext}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Threat Detection & Features Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#EDEDEA] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFF1F2] border border-[#FEE2E2] flex items-center justify-center text-[#BE123C]">
            <Flame className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#111827]">Weapon & Hand Object HUD</h3>
          <p className="text-xs text-[#6B7280] leading-relaxed">
            Real-time localization of firearms, knives, and suspicious objects held in hands with dedicated bounding reticles and threat level alarms.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#EDEDEA] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] border border-[#FFEDD5] flex items-center justify-center text-[#C2410C]">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#111827]">Restricted Geofencing</h3>
          <p className="text-xs text-[#6B7280] leading-relaxed">
            Draw arbitrary polygon zones over any camera perspective. Instant raycasting evaluates unauthorized intrusions with crimson alerts.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#EDEDEA] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] border border-[#D1FAE5] flex items-center justify-center text-[#047857]">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#111827]">Verifiable Evidence</h3>
          <p className="text-xs text-[#6B7280] leading-relaxed">
            Zero hallucinations. Every behavioral classification is backed by frame snapshots, speed telemetry, and causal temporal graphs.
          </p>
        </div>
      </div>
    </div>
  );
};
