import React from 'react';
import {
  Activity,
  Users,
  ChevronRight,
  Clock,
  Zap,
  Flame,
  ShieldAlert,
  Crosshair
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

const severityPill = (sev: AlertSeverity) => {
  switch (sev) {
    case 'critical':
      return 'bg-[#FFF1F2] text-[#BE123C] border-[#FEE2E2]';
    case 'high':
      return 'bg-[#FFF7ED] text-[#C2410C] border-[#FFEDD5]';
    case 'medium':
      return 'bg-[#FFFBEB] text-[#B45309] border-[#FEF3C7]';
    default:
      return 'bg-[#F0FDF4] text-[#15803D] border-[#DCFCE7]';
  }
};

const formatSeconds = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms}`;
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
  const armedTracks = tracks.filter((t) => t.is_armed || (t.held_object && t.held_object.toLowerCase().includes('gun')));

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Handheld Weapon & Object Telemetry HUD Card */}
      <div className="bg-[#FFFFFF] border border-[#EDEDEA] rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-[#F5F5F3] mb-3">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-[#4F46E5]" />
            <h3 className="text-xs font-bold text-[#111827]">Weapon & Hand Object Detection</h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#4338CA] font-semibold border border-[#DDE4FF]">
            AI HUD
          </span>
        </div>

        {armedTracks.length > 0 ? (
          <div className="space-y-2">
            {armedTracks.map((trk) => (
              <div
                key={trk.track_id}
                onClick={() => onSelectTrack(trk.track_id)}
                className="p-3 bg-[#FFF1F2] border border-[#FEE2E2] rounded-xl flex items-center justify-between cursor-pointer hover:border-[#FECDD3] transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#FFE4E6] flex items-center justify-center text-[#E11D48]">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#991B1B]">Track #{trk.track_id}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#EF4444] text-white">
                        ARMED
                      </span>
                    </div>
                    <p className="text-[11px] text-[#BE123C] font-medium mt-0.5">
                      Object: {trk.held_object || 'Handgun / Weapon'} ({(trk.confidence * 100).toFixed(0)}%)
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#FDA4AF]" />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 bg-[#FBFBFA] border border-[#EDEDEA] rounded-xl flex items-center gap-2.5 text-xs text-[#6B7280]">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span>Scanning hands & perimeter: No firearms or concealed weapons detected in frame.</span>
          </div>
        )}
      </div>

      {/* Real-time Detected Events Feed */}
      <div className="bg-[#FFFFFF] border border-[#EDEDEA] rounded-2xl overflow-hidden shadow-xs flex-1 flex flex-col min-h-0">
        <div className="px-4 py-3 border-b border-[#F5F5F3] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#111827]" />
            <h3 className="text-xs font-bold text-[#111827]">Incident Feed</h3>
          </div>
          <span className="text-[11px] font-mono text-[#6B7280] bg-[#F5F5F3] px-2 py-0.5 rounded-lg border border-[#EDEDEA]">
            {events.length} Events
          </span>
        </div>

        <div className="p-3 overflow-y-auto space-y-2 flex-1">
          {events.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#9CA3AF]">
              No events detected in this video stream yet.
            </div>
          ) : (
            events.map((evt) => {
              const isSelected = selectedEvent?.id === evt.id;
              const isCurrentlyActive =
                currentTime >= evt.start_time && currentTime <= evt.end_time;

              return (
                <div
                  key={evt.id}
                  onClick={() => {
                    onSelectEvent(evt);
                    onSeek(evt.start_time);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-[#EEF2FF] border-[#C7D2FE] shadow-xs'
                      : isCurrentlyActive
                      ? 'bg-[#F8F9FA] border-[#D1D5DB]'
                      : 'bg-white border-[#EDEDEA] hover:border-[#D1D2CC] hover:bg-[#FBFBFA]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${severityPill(
                          evt.severity
                        )}`}
                      >
                        {evt.severity}
                      </span>
                      <span className="text-xs font-bold text-[#111827]">
                        {evt.event_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-[#6B7280]">
                      {formatSeconds(evt.start_time)}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#4B5563] line-clamp-2 leading-relaxed">
                    {evt.explanation}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-[#F5F5F3] text-[10px] text-[#8E95A2] font-mono">
                    <span>Subject #{evt.track_id}</span>
                    <span>Conf: {(evt.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
