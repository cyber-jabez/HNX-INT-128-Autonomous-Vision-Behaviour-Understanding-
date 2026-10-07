import React from 'react';
import {
  AlertTriangle,
  Users,
  Activity,
  ChevronRight,
  Clock,
  Zap,
} from 'lucide-react';
import { VideoEvent, TrackDetection, BehaviourType, AlertSeverity } from '../types';

interface AnalysisPanelRightProps {
  events: VideoEvent[];
  tracks: TrackDetection[];
  currentTime: number;
  selectedEvent: VideoEvent | null;
  selectedTrackId: number | null;
  onSelectEvent: (event: VideoEvent) => void;
  onSelectTrack: (trackId: number) => void;
  onSeek: (time: number) => void;
}

const severityStyle = (sev: AlertSeverity) => {
  switch (sev) {
    case 'critical':
      return {
        dot: '#F5C8CF',
        badge: 'bg-[#FDF2F4] text-[#9C1F2E] border-[#F5C8CF]',
        label: 'Critical',
      };
    case 'high':
      return {
        dot: '#FFDCC5',
        badge: 'bg-[#FFF7F0] text-[#9A4B10] border-[#FFDCC5]',
        label: 'High',
      };
    case 'medium':
      return {
        dot: '#F7E7AE',
        badge: 'bg-[#FEFCEE] text-[#7A6200] border-[#F7E7AE]',
        label: 'Medium',
      };
    default:
      return {
        dot: '#C8EBD8',
        badge: 'bg-[#F0FAF4] text-[#1B663E] border-[#C8EBD8]',
        label: 'Normal',
      };
  }
};

const behaviourStyle = (b: BehaviourType) => {
  switch (b) {
    case 'Running':
      return 'bg-[#FFF7F0] text-[#9A4B10] border-[#FFDCC5]';
    case 'Loitering':
      return 'bg-[#FDF2F4] text-[#9C1F2E] border-[#F5C8CF]';
    case 'Stationary':
      return 'bg-[#FEFCEE] text-[#7A6200] border-[#F7E7AE]';
    case 'Walking':
      return 'bg-[#F0FAF4] text-[#1B663E] border-[#C8EBD8]';
    default:
      return 'bg-[#EEF4FF] text-[#1E4D8C] border-[#C7DBFF]';
  }
};

export const AnalysisPanelRight: React.FC<AnalysisPanelRightProps> = ({
  events,
  tracks,
  currentTime,
  selectedEvent,
  selectedTrackId,
  onSelectEvent,
  onSelectTrack,
  onSeek,
}) => {
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Behaviour Analysis Header */}
      <div className="bg-white border border-[#E7E7E3] rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-4 h-4 text-[#C9C2FF]" />
          <span className="text-[11px] font-semibold text-[#4C3CB8] uppercase tracking-wider">
            Behaviour Analysis
          </span>
        </div>
        <p className="text-xs text-[#9CA3AF]">Live detected events — click to seek</p>
      </div>

      {/* Live Detected Events */}
      <div className="bg-white border border-[#E7E7E3] rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col min-h-0">
        <div className="px-4 py-3 border-b border-[#F0F1EE] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-[#6B7280]" />
            <span className="text-xs font-semibold text-[#1F2937]">Detected Events</span>
          </div>
          <span className="text-[10px] font-mono text-[#6B7280] bg-[#F5F5F2] px-2 py-0.5 rounded-full">
            {events.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {events.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-xs text-[#9CA3AF]">No events detected yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F5F5F2]">
              {events.map((evt) => {
                const isSelected = selectedEvent?.id === evt.id;
                const isCurrent = currentTime >= evt.start_time && currentTime <= evt.end_time;
                const sty = severityStyle(evt.severity);

                return (
                  <button
                    key={evt.id}
                    onClick={() => onSelectEvent(evt)}
                    className={`w-full text-left px-4 py-3.5 transition-all duration-150 group ${
                      isSelected
                        ? 'bg-[#F3F1FF] border-l-[3px] border-l-[#C9C2FF]'
                        : isCurrent
                        ? 'bg-[#F0FAF4]'
                        : 'hover:bg-[#FAFAF8]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                        style={{ backgroundColor: sty.dot }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-[#1F2937] truncate group-hover:text-[#4C3CB8] transition">
                            {evt.event_type}
                          </p>
                          <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full border shrink-0 ${sty.badge}`}>
                            {sty.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6B7280] mt-0.5">
                          Person {evt.track_id.toString().padStart(2, '0')}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="font-mono text-[10px] text-[#4C3CB8] bg-[#F3F1FF] px-1.5 py-0.5 rounded border border-[#E1DCFF]">
                            {formatTime(evt.start_time)}
                          </span>
                          <span className="text-[10px] text-[#9CA3AF]">
                            {(evt.confidence * 100).toFixed(0)}% confidence
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tracked Objects Panel */}
      <div className="bg-white border border-[#E7E7E3] rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-[#F0F1EE] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-[#6B7280]" />
            <span className="text-xs font-semibold text-[#1F2937]">In Scene</span>
          </div>
          <span className="text-[10px] font-mono text-[#6B7280] bg-[#F5F5F2] px-2 py-0.5 rounded-full">
            {tracks.length} objects
          </span>
        </div>

        {tracks.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs text-[#9CA3AF]">No subjects in current frame</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F5F5F2]">
            {tracks.map((t) => {
              const isSelected = selectedTrackId === t.track_id;
              return (
                <button
                  key={t.track_id}
                  onClick={() => onSelectTrack(t.track_id)}
                  className={`w-full text-left px-4 py-3 transition-all flex items-center justify-between group ${
                    isSelected ? 'bg-[#F3F1FF]' : 'hover:bg-[#FAFAF8]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#F3F1FF] border border-[#E1DCFF] flex items-center justify-center font-mono text-[10px] font-bold text-[#4C3CB8]">
                      #{t.track_id}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#1F2937]">{t.class_name}</p>
                      <p className="text-[10px] text-[#9CA3AF]">
                        {(t.confidence * 100).toFixed(0)}% conf
                        {t.speed ? ` · ${t.speed} m/s` : ''}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${behaviourStyle(t.behaviour)}`}>
                    {t.behaviour}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
