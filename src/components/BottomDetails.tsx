import React, { useState } from 'react';
import {
  FileText,
  Play,
  MapPin,
  Clock,
  Info,
  Maximize2,
  X,
  FileSearch,
} from 'lucide-react';
import { VideoEvent, AlertSeverity } from '../types';
import { api } from '../services/api';

interface BottomDetailsProps {
  selectedEvent: VideoEvent | null;
  onSeek: (time: number) => void;
}

const severityStyle = (sev: AlertSeverity) => {
  switch (sev) {
    case 'critical':
      return { bg: '#FDF2F4', text: '#9C1F2E', border: '#F5C8CF' };
    case 'high':
      return { bg: '#FFF7F0', text: '#9A4B10', border: '#FFDCC5' };
    case 'medium':
      return { bg: '#FEFCEE', text: '#7A6200', border: '#F7E7AE' };
    default:
      return { bg: '#F0FAF4', text: '#1B663E', border: '#C8EBD8' };
  }
};

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms}`;
};

export const BottomDetails: React.FC<BottomDetailsProps> = ({
  selectedEvent,
  onSeek,
}) => {
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);

  const evidenceUrl = selectedEvent
    ? selectedEvent.evidence_url || api.getEventEvidenceUrl(selectedEvent.id)
    : '';

  const sty = selectedEvent ? severityStyle(selectedEvent.severity) : null;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Event Details */}
        <div className="bg-white border border-[#E7E7E3] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F1EE] mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#6B7280]" />
                <span className="text-xs font-semibold text-[#1F2937]">Event Details</span>
              </div>
              {selectedEvent && sty && (
                <span
                  className="text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full border"
                  style={{ backgroundColor: sty.bg, color: sty.text, borderColor: sty.border }}
                >
                  {selectedEvent.severity}
                </span>
              )}
            </div>

            {selectedEvent ? (
              <div className="space-y-4">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { label: 'Track ID', value: `#${selectedEvent.track_id}`, mono: true },
                    { label: 'Behaviour', value: selectedEvent.behaviour, mono: false },
                    {
                      label: 'Confidence',
                      value: `${(selectedEvent.confidence * 100).toFixed(1)}%`,
                      mono: true,
                      green: true,
                    },
                    {
                      label: 'Duration',
                      value: `${(selectedEvent.end_time - selectedEvent.start_time).toFixed(1)}s`,
                      mono: true,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="bg-[#FAFAF8] border border-[#E7E7E3] rounded-xl p-3"
                    >
                      <span className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-medium block">
                        {item.label}
                      </span>
                      <span
                        className={`text-sm font-bold mt-0.5 block ${
                          item.green
                            ? 'text-[#1B663E]'
                            : item.mono
                            ? 'font-mono text-[#4C3CB8]'
                            : 'text-[#1F2937]'
                        }`}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Info rows */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAFAF8] border border-[#E7E7E3] text-xs">
                    <span className="text-[#6B7280] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Timestamp Interval
                    </span>
                    <span className="font-mono text-[#1F2937] font-medium">
                      {formatTime(selectedEvent.start_time)} — {formatTime(selectedEvent.end_time)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAFAF8] border border-[#E7E7E3] text-xs">
                    <span className="text-[#6B7280] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      Zone
                    </span>
                    <span className="text-[#1F2937] font-medium">
                      {selectedEvent.zone || 'Global Frame'}
                    </span>
                  </div>
                </div>

                {/* AI Explanation */}
                <div className="bg-[#F3F1FF] border border-[#E1DCFF] rounded-xl p-3.5">
                  <div className="flex items-center gap-1.5 text-xs text-[#4C3CB8] font-semibold mb-2">
                    <Info className="w-3.5 h-3.5" />
                    <span>AI Reasoning</span>
                  </div>
                  <p className="text-xs text-[#374151] leading-relaxed">
                    {selectedEvent.explanation}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-2">
                <FileText className="w-8 h-8 text-[#E7E7E3] mx-auto" />
                <p className="text-xs text-[#9CA3AF]">
                  Select an event from the timeline to view details
                </p>
              </div>
            )}
          </div>

          {selectedEvent && (
            <div className="mt-4 pt-3 border-t border-[#F0F1EE] flex justify-end">
              <button
                onClick={() => onSeek(selectedEvent.start_time)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1F2937] hover:bg-[#111827] text-white text-xs font-semibold rounded-xl transition"
              >
                <Play className="w-3.5 h-3.5 text-[#C9C2FF] fill-[#C9C2FF]" />
                Jump to {formatTime(selectedEvent.start_time)}
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: Evidence Viewer */}
        <div className="bg-white border border-[#E7E7E3] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F1EE] mb-4">
              <div className="flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-[#6B7280]" />
                <span className="text-xs font-semibold text-[#1F2937]">Evidence Clip</span>
              </div>
              {selectedEvent && (
                <button
                  onClick={() => setShowEvidenceModal(true)}
                  className="flex items-center gap-1.5 text-xs text-[#4C3CB8] hover:text-[#3D2FA3] transition font-medium"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Expand
                </button>
              )}
            </div>

            {selectedEvent ? (
              <div className="space-y-3">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-[#E7E7E3]">
                  <video
                    src={evidenceUrl}
                    controls
                    autoPlay
                    loop
                    muted
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 left-2 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-black/70 text-white">
                    {formatTime(selectedEvent.start_time)} · {selectedEvent.event_type}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
                  <span className="font-mono">
                    /events/{selectedEvent.id}/evidence
                  </span>
                  <button
                    onClick={() => setShowEvidenceModal(true)}
                    className="px-3 py-1.5 bg-[#F3F1FF] text-[#4C3CB8] font-semibold rounded-lg border border-[#E1DCFF] hover:bg-[#E1DCFF] transition text-[11px]"
                  >
                    View Full Evidence
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-[#F3F1FF] border border-[#E1DCFF] flex items-center justify-center mx-auto">
                  <FileSearch className="w-6 h-6 text-[#C9C2FF]" />
                </div>
                <p className="text-xs text-[#9CA3AF]">
                  No event selected — choose an incident to load the evidence clip.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Evidence Modal */}
      {showEvidenceModal && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#E7E7E3] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E7E3]">
              <div>
                <h3 className="text-base font-bold text-[#1F2937]">
                  Evidence — {selectedEvent.event_type}
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Track #{selectedEvent.track_id} · {formatTime(selectedEvent.start_time)} –{' '}
                  {formatTime(selectedEvent.end_time)}
                </p>
              </div>
              <button
                onClick={() => setShowEvidenceModal(false)}
                className="p-2 rounded-xl text-[#6B7280] hover:bg-[#F5F5F2] hover:text-[#1F2937] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-black flex items-center justify-center">
              <video
                src={evidenceUrl}
                controls
                autoPlay
                className="w-full max-h-[60vh] object-contain"
              />
            </div>

            <div className="px-6 py-4 border-t border-[#E7E7E3] flex items-center justify-between">
              <p className="text-xs text-[#6B7280] max-w-[60%] leading-relaxed">
                {selectedEvent.explanation}
              </p>
              <button
                onClick={() => setShowEvidenceModal(false)}
                className="px-4 py-2 bg-[#F5F5F2] text-[#1F2937] text-xs font-medium rounded-xl hover:bg-[#EBEBEB] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
