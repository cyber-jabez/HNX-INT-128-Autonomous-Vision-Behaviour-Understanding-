import React from 'react';
import { Clock, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import { VideoEvent, AlertSeverity } from '../types';

interface EventTimelineProps {
  events: VideoEvent[];
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  selectedEventId: string | null;
  onSelectEvent: (event: VideoEvent) => void;
}

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

  const getSeverityColor = (sev: AlertSeverity) => {
    switch (sev) {
      case 'critical':
        return '#f43f5e'; // rose-500
      case 'high':
        return '#f59e0b'; // amber-500
      case 'medium':
        return '#eab308'; // yellow-500
      default:
        return '#3b82f6'; // blue-500
    }
  };

  return (
    <div className="bg-[#111726] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Event Timeline</h3>
            <p className="text-[11px] text-slate-400">
              Chronological interactive events. Click bar or event badge to seek video timestamp.
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-[11px] text-slate-400">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Critical</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>High</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>Medium</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Low</span>
          </span>
        </div>
      </div>

      {/* Visual Timeline Track Bar */}
      <div
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickFraction = (e.clientX - rect.left) / rect.width;
          onSeek(clickFraction * effectiveDuration);
        }}
        className="relative h-10 bg-slate-900/90 rounded-lg border border-slate-800 cursor-pointer overflow-hidden group select-none"
      >
        {/* Playhead indicator */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-20 pointer-events-none transition-all duration-75 shadow-[0_0_8px_#22d3ee]"
          style={{ left: `${currentPercentage}%` }}
        >
          <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full -ml-1 -mt-0.5" />
        </div>

        {/* Event Intervals plotted on bar */}
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
              title={`${evt.event_type} (${evt.start_time}s - ${evt.end_time}s)`}
              className={`absolute top-1 bottom-1 rounded transition-all hover:brightness-125 ${
                isSelected ? 'ring-2 ring-white scale-y-105 z-10' : 'opacity-85'
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

      {/* Horizontal Scrollable Event Cards */}
      <div className="flex items-center space-x-3 overflow-x-auto pb-1 pt-1">
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
              className={`flex-shrink-0 text-left p-3 rounded-xl border transition-all duration-150 min-w-[210px] ${
                isSelected
                  ? 'bg-indigo-600/25 border-indigo-400 shadow-md shadow-indigo-500/20'
                  : isCurrent
                  ? 'bg-slate-800/90 border-cyan-500/50'
                  : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white truncate max-w-[130px]">
                  {evt.event_type}
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: getSeverityColor(evt.severity) }}
                />
              </div>

              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                <span>Track #{evt.track_id}</span>
                <span className="font-mono text-slate-300">
                  {evt.start_time.toFixed(1)}s - {evt.end_time.toFixed(1)}s
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
