import React, { useState } from 'react';
import {
  FileSearch,
  Play,
  CheckCircle2,
  ExternalLink,
  Flame,
  ShieldAlert,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { VideoEvent, AlertSeverity } from '../types';
import { api } from '../services/api';

interface EvidencePageProps {
  events: VideoEvent[];
  selectedEvent: VideoEvent | null;
  onSelectEvent: (event: VideoEvent) => void;
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

export const EvidencePage: React.FC<EvidencePageProps> = ({
  events,
  selectedEvent,
  onSelectEvent,
  onSeek,
}) => {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileSearch className="w-4 h-4 text-[#4F46E5]" />
          <span className="text-[11px] font-bold text-[#4338CA] uppercase tracking-wider">
            Traceable AI Evidence Archive
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827]">
          Verifiable Evidence & Audit Proof
        </h2>
        <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
          Every behavioral classification and anomaly alert is anchored to exact video frames and verifiable image clips.
        </p>
      </div>

      {/* Evidence Chain Diagram */}
      <div className="bg-[#FFFFFF] border border-[#EDEDEA] rounded-2xl p-6 shadow-xs">
        <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider mb-4">
          Auditable Chain of Custody
        </h3>
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          {['Raw Sensor Stream', 'YOLO Object Tracking', 'Spatial Polygon Mesh', 'Behaviour Inference', 'Frame Snapshot Clip'].map(
            (step, i, arr) => (
              <React.Fragment key={step}>
                <div className="px-3.5 py-2 bg-[#F8F9FA] border border-[#EDEDEA] rounded-xl text-xs font-semibold text-[#111827]">
                  {step}
                </div>
                {i < arr.length - 1 && (
                  <span className="text-[#9CA3AF] text-xs font-bold">→</span>
                )}
              </React.Fragment>
            )
          )}
        </div>
      </div>

      {/* Events Evidence List */}
      <div className="space-y-3">
        {events.map((evt) => {
          const evidenceUrl = evt.evidence_url || api.getEventEvidenceUrl(evt.id);

          return (
            <div
              key={evt.id}
              className="bg-[#FFFFFF] border border-[#EDEDEA] hover:border-[#D1D2CC] rounded-2xl p-5 shadow-xs transition flex flex-col md:flex-row gap-5 items-center justify-between"
            >
              <div className="flex items-center gap-4 flex-1">
                {/* Snapshot Thumbnail */}
                <div className="w-36 h-20 rounded-xl bg-[#0F172A] overflow-hidden shrink-0 border border-[#EDEDEA] flex items-center justify-center relative">
                  <img
                    src={evidenceUrl}
                    alt={evt.event_type}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-white">
                    {formatSeconds(evt.start_time)}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${severityPill(
                        evt.severity
                      )}`}
                    >
                      {evt.severity}
                    </span>
                    <h4 className="text-sm font-bold text-[#111827]">
                      {evt.event_type.replace(/_/g, ' ')}
                    </h4>
                  </div>
                  <p className="text-xs text-[#4B5563] leading-relaxed max-w-xl">
                    {evt.explanation}
                  </p>
                  <p className="text-[11px] font-mono text-[#8E95A2]">
                    Entity #{evt.track_id} · Confidence: {(evt.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => {
                    onSelectEvent(evt);
                    onSeek(evt.start_time);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#111827] hover:bg-black text-white text-xs font-semibold rounded-xl transition shadow-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Playback</span>
                </button>

                <a
                  href={evidenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 border border-[#EDEDEA] hover:border-[#D1D2CC] rounded-xl text-[#6B7280] hover:text-[#111827] transition"
                  title="Open high-res clip"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
