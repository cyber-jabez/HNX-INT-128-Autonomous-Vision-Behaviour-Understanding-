import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { VideoEvent, AlertSeverity } from '../types';

interface EventTimelineProps {
  events: VideoEvent[];
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  selectedEventId: string | null;
  onSelectEvent: (event: VideoEvent) => void;
}

const getSeverityColor = (sev: AlertSeverity) => {
  switch (sev) {
    case 'critical': return '#F5C8CF';
    case 'high': return '#FFDCC5';
    case 'medium': return '#F7E7AE';
    default: return '#C7DBFF';
  }
};

const getSeverityDark = (sev: AlertSeverity) => {
  switch (sev) {
    case 'critical': return '#9C1F2E';
    case 'high': return '#9A4B10';
    case 'medium': return '#7A6200';
    default: return '#1E4D8C';
  }
};

const getSeverityBg = (sev: AlertSeverity) => {
  switch (sev) {
    case 'critical': return '#FDF2F4';
    case 'high': return '#FFF7F0';
    case 'medium': return '#FEFCEE';
    default: return '#EEF4FF';
  }
};

const formatTime = (s: number) => {
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

  // Timestamp labels
  const labels = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    pct: f * 100,
    label: formatTime(f * effectiveDuration),
  }));

  return (
    <div className="bg-white border border-[#E7E7E3] rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#F0F1EE] mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#6B7280]" />
          <span className="text-xs font-semibold text-[#1F2937]">Event Timeline</span>
          <span className="text-[11px] text-[#9CA3AF]">· click to seek</span>
        </div>
        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-[#6B7280]">
          {[
            { label: 'Critical', color: '#F5C8CF' },
            { label: 'High', color: '#FFDCC5' },
            { label: 'Medium', color: '#F7E7AE' },
            { label: 'Normal', color: '#C7DBFF' },
          ].map((item) => (
            <span key={item.label} className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* Scrub Bar */}
      <div
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const frac = (e.clientX - rect.left) / rect.width;
          onSeek(frac * effectiveDuration);
        }}
        className="relative h-10 bg-[#F5F5F2] rounded-xl border border-[#E7E7E3] cursor-pointer overflow-hidden mb-2"
      >
        {/* Progress fill */}
        <div
          className="absolute top-0 left-0 h-full bg-[#F3F1FF] pointer-events-none transition-all duration-75"
          style={{ width: `${currentPercentage}%` }}
        />

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 z-20 pointer-events-none"
          style={{ left: `${currentPercentage}%` }}
        >
          <div className="w-0.5 h-full bg-[#4C3CB8]" />
          <div className="w-3 h-3 bg-[#4C3CB8] rounded-full -ml-1.5 -mt-0.5 shadow-sm" />
        </div>

        {/* Event segments */}
        {events.map((evt) => {
          const leftPct = (evt.start_time / effectiveDuration) * 100;
          const widthPct = Math.max(1.5, ((evt.end_time - evt.start_time) / effectiveDuration) * 100);
          const isSelected = selectedEventId === evt.id;
          return (
            <div
              key={evt.id}
              onClick={(e) => {
                e.stopPropagation();
                onSeek(evt.start_time);
                onSelectEvent(evt);
              }}
              title={`${evt.event_type} (${evt.start_time.toFixed(1)}s–${evt.end_time.toFixed(1)}s)`}
              className={`absolute top-2 bottom-2 rounded-md transition-all cursor-pointer ${
                isSelected ? 'ring-2 ring-[#4C3CB8] ring-offset-1 z-10' : 'opacity-80 hover:opacity-100'
              }`}
              style={{
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                backgroundColor: getSeverityColor(evt.severity),
              }}
            />
          );
        })}
      </div>

      {/* Time labels */}
      <div className="relative h-4 mb-3">
        {labels.map((l) => (
          <span
            key={l.pct}
            className="absolute font-mono text-[10px] text-[#9CA3AF] transform -translate-x-1/2"
            style={{ left: `${l.pct}%` }}
          >
            {l.label}
          </span>
        ))}
      </div>

      {/* Scrollable Event Chips */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
        {events.map((evt) => {
          const isSelected = selectedEventId === evt.id;
          const isCurrent = currentTime >= evt.start_time && currentTime <= evt.end_time;
          return (
            <button
              key={evt.id}
              onClick={() => {
                onSeek(evt.start_time);
                onSelectEvent(evt);
              }}
              className={`flex-shrink-0 text-left px-3 py-2.5 rounded-xl border transition-all duration-150 min-w-[180px] ${
                isSelected
                  ? 'bg-[#F3F1FF] border-[#C9C2FF] shadow-sm'
                  : isCurrent
                  ? 'bg-[#F0FAF4] border-[#C8EBD8]'
                  : 'bg-[#FAFAF8] border-[#E7E7E3] hover:border-[#DCDDD9] hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#1F2937] truncate max-w-[120px]">
                  {evt.event_type}
                </span>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: getSeverityColor(evt.severity) }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-[#6B7280]">
                <span>#{evt.track_id}</span>
                <span className="font-mono">{formatTime(evt.start_time)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
