import React from 'react';
import { Clock, AlertTriangle, Layers, Play } from 'lucide-react';
import { VideoEvent, AlertSeverity } from '../types';

interface EventTimelineProps {
  events: VideoEvent[];
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  selectedEventId: string | null;
  onSelectEvent: (event: VideoEvent) => void;
}

const severityColor = (sev: AlertSeverity) => {
  switch (sev) {
    case 'critical':
      return '#EF4444';
    case 'high':
      return '#F97316';
    case 'medium':
      return '#F59E0B';
    default:
      return '#3B82F6';
  }
};

const formatSeconds = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms}`;
};

export const EventTimeline: React.FC<EventTimelineProps> = ({
  events,
  duration,
  currentTime,
  onSeek,
  selectedEventId,
  onSelectEvent,
}) => {
  const effectiveDuration = duration > 0 ? duration : 60;
  const currentPercentage = Math.min(100, (currentTime / effectiveDuration) * 100);

  // Tick markers
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
    pct: frac * 100,
    label: formatSeconds(frac * effectiveDuration),
  }));

  return (
    <div className="bg-[#FFFFFF] border border-[#EDEDEA] rounded-2xl p-4 shadow-xs">
      {/* Header & Legend */}
      <div className="flex items-center justify-between pb-3 border-b border-[#F5F5F3] mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#111827]" />
          <h3 className="text-xs font-bold text-[#111827]">Incident Chronology</h3>
          <span className="text-[11px] text-[#8E95A2] font-mono">({events.length} markers)</span>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-[11px] font-medium text-[#6B7280]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> Critical / Weapon
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F97316]" /> High
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Medium
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3B82F6]" /> Normal
          </span>
        </div>
      </div>

      {/* Interactive Timeline Track */}
      <div
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          onSeek(frac * effectiveDuration);
        }}
        className="relative h-12 bg-[#F8F9FA] rounded-xl border border-[#EDEDEA] cursor-pointer overflow-hidden mb-2 select-none group"
      >
        {/* Subtle timeline grid marks */}
        <div className="absolute inset-0 flex justify-between px-3 pointer-events-none opacity-40">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="w-[1px] h-full bg-[#E5E7EB]" />
          ))}
        </div>

        {/* Current Playhead Scrubber */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-[#111827] z-20 pointer-events-none transition-all duration-75"
          style={{ left: `${currentPercentage}%` }}
        >
          <div className="w-3 h-3 rounded-full bg-[#111827] -translate-x-[5px] -translate-y-1 shadow-md" />
        </div>

        {/* Render Event Spans & Indicators */}
        {events.map((evt) => {
          const startPct = Math.min(100, Math.max(0, (evt.start_time / effectiveDuration) * 100));
          const endPct = Math.min(100, Math.max(startPct + 1.5, (evt.end_time / effectiveDuration) * 100));
          const widthPct = Math.max(2, endPct - startPct);
          const isSelected = selectedEventId === evt.id;
          const color = severityColor(evt.severity);

          return (
            <div
              key={evt.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectEvent(evt);
                onSeek(evt.start_time);
              }}
              title={`${evt.event_type} at ${formatSeconds(evt.start_time)}`}
              className={`absolute top-2 bottom-2 rounded-lg cursor-pointer transition-transform hover:scale-y-110 flex items-center justify-center ${
                isSelected ? 'ring-2 ring-black ring-offset-1 z-10' : 'z-5'
              }`}
              style={{
                left: `${startPct}%`,
                width: `${widthPct}%`,
                backgroundColor: `${color}35`,
                border: `1.5px solid ${color}`,
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: color }}
              />
            </div>
          );
        })}
      </div>

      {/* Axis Timestamps */}
      <div className="flex justify-between px-1 text-[10px] font-mono text-[#8E95A2]">
        {ticks.map((t, idx) => (
          <span key={idx}>{t.label}</span>
        ))}
      </div>
    </div>
  );
};
