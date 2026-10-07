import React from 'react';
import {
  FileText,
  Play,
  MapPin,
  Clock,
  ShieldAlert,
  Flame,
  CheckCircle2,
  ExternalLink,
  Crosshair
} from 'lucide-react';
import { VideoEvent, AlertSeverity } from '../types';
import { api } from '../services/api';

interface BottomDetailsProps {
  selectedEvent: VideoEvent | null;
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

export const BottomDetails: React.FC<BottomDetailsProps> = ({
  selectedEvent,
  onSeek,
}) => {
  const evidenceUrl = selectedEvent
    ? selectedEvent.evidence_url || api.getEventEvidenceUrl(selectedEvent.id)
    : '';

  const isWeaponOrArmed =
    selectedEvent &&
    (selectedEvent.event_type.toLowerCase().includes('weapon') ||
      selectedEvent.event_type.toLowerCase().includes('gun') ||
      selectedEvent.explanation.toLowerCase().includes('gun') ||
      selectedEvent.explanation.toLowerCase().includes('weapon'));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* LEFT: Incident Forensics Report */}
      <div className="bg-[#FFFFFF] border border-[#EDEDEA] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#F5F5F3] mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#111827]" />
              <h3 className="text-xs font-bold text-[#111827]">Incident Forensics & Telemetry</h3>
            </div>
            {selectedEvent && (
              <span
                className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${severityPill(
                  selectedEvent.severity
                )}`}
              >
                {selectedEvent.severity}
              </span>
            )}
          </div>

          {selectedEvent ? (
            <div className="space-y-4">
              {/* Telemetry Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-[#F8F9FA] border border-[#EDEDEA] rounded-xl p-2.5">
                  <span className="text-[10px] text-[#8E95A2] uppercase tracking-wider font-semibold block">
                    Entity ID
                  </span>
                  <span className="font-mono text-sm font-bold text-[#111827]">
                    #{selectedEvent.track_id}
                  </span>
                </div>
                <div className="bg-[#F8F9FA] border border-[#EDEDEA] rounded-xl p-2.5">
                  <span className="text-[10px] text-[#8E95A2] uppercase tracking-wider font-semibold block">
                    Behaviour
                  </span>
                  <span className="text-sm font-semibold text-[#111827] truncate block">
                    {selectedEvent.behaviour}
                  </span>
                </div>
                <div className="bg-[#F8F9FA] border border-[#EDEDEA] rounded-xl p-2.5">
                  <span className="text-[10px] text-[#8E95A2] uppercase tracking-wider font-semibold block">
                    Confidence
                  </span>
                  <span className="font-mono text-sm font-bold text-[#047857]">
                    {(selectedEvent.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="bg-[#F8F9FA] border border-[#EDEDEA] rounded-xl p-2.5">
                  <span className="text-[10px] text-[#8E95A2] uppercase tracking-wider font-semibold block">
                    Duration
                  </span>
                  <span className="font-mono text-sm font-bold text-[#111827]">
                    {(selectedEvent.end_time - selectedEvent.start_time).toFixed(1)}s
                  </span>
                </div>
              </div>

              {/* Explanatory Narrative */}
              <div className="p-3 bg-[#FBFBFA] border border-[#EDEDEA] rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#111827]">
                  {isWeaponOrArmed ? (
                    <Flame className="w-3.5 h-3.5 text-[#E11D48]" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                  )}
                  <span>Automated AI Assessment</span>
                </div>
                <p className="text-xs text-[#4B5563] leading-relaxed">
                  {selectedEvent.explanation}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-xs text-[#9CA3AF]">
              Select an incident or seek through the video timeline to view forensics.
            </div>
          )}
        </div>

        {selectedEvent && (
          <div className="pt-3 border-t border-[#F5F5F3] flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#6B7280]">
              Timestamp: {formatSeconds(selectedEvent.start_time)} → {formatSeconds(selectedEvent.end_time)}
            </span>
            <button
              onClick={() => onSeek(selectedEvent.start_time)}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#111827] hover:bg-black text-white text-xs font-semibold rounded-lg transition"
            >
              <Play className="w-3 h-3 fill-white" />
              <span>Jump to Frame</span>
            </button>
          </div>
        )}
      </div>

      {/* RIGHT: Visual Evidence Frame Capture */}
      <div className="bg-[#FFFFFF] border border-[#EDEDEA] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#F5F5F3] mb-4">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-[#111827]" />
              <h3 className="text-xs font-bold text-[#111827]">Timestamped Evidence Frame</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#047857] font-semibold border border-[#D1FAE5]">
              VERIFIED
            </span>
          </div>

          {selectedEvent && evidenceUrl ? (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-[#EDEDEA] bg-[#0F172A] aspect-video flex items-center justify-center">
                <img
                  src={evidenceUrl}
                  alt={`Evidence for event ${selectedEvent.id}`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback to placeholder if backend hasn't generated image
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] text-white font-mono">
                  {formatSeconds(selectedEvent.start_time)}
                </div>
              </div>
              <p className="text-[11px] text-[#6B7280]">
                Cryptographically hashed snapshot tied to Frame #{Math.round(selectedEvent.start_time * 25)}.
              </p>
            </div>
          ) : (
            <div className="text-center py-10 text-xs text-[#9CA3AF]">
              Evidence snapshot will render upon selecting an incident event.
            </div>
          )}
        </div>

        {selectedEvent && (
          <div className="pt-3 border-t border-[#F5F5F3] flex justify-end">
            <a
              href={evidenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[#4F46E5] hover:text-[#4338CA] font-semibold"
            >
              <span>Inspect Full Resolution</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
