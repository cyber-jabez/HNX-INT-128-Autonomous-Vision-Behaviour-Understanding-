import React, { useState } from 'react';
import {
  FileSearch,
  Play,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Maximize2,
  X,
} from 'lucide-react';
import { VideoEvent, AlertSeverity } from '../types';
import { api } from '../services/api';

interface EvidencePageProps {
  events: VideoEvent[];
  selectedEvent: VideoEvent | null;
  onSelectEvent: (event: VideoEvent) => void;
  onSeek: (time: number) => void;
}

const severityStyle = (sev: AlertSeverity) => {
  switch (sev) {
    case 'critical':
      return { bg: '#FDF2F4', text: '#9C1F2E', border: '#F5C8CF', dot: '#F5C8CF' };
    case 'high':
      return { bg: '#FFF7F0', text: '#9A4B10', border: '#FFDCC5', dot: '#FFDCC5' };
    case 'medium':
      return { bg: '#FEFCEE', text: '#7A6200', border: '#F7E7AE', dot: '#F7E7AE' };
    default:
      return { bg: '#F0FAF4', text: '#1B663E', border: '#C8EBD8', dot: '#C8EBD8' };
  }
};

const formatTime = (s: number) => {
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
  const [expandedEventId, setExpandedEventId] = useState<string | null>(
    selectedEvent?.id || events[0]?.id || null
  );
  const [modalEvent, setModalEvent] = useState<VideoEvent | null>(null);

  const displayEvents = events;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileSearch className="w-4 h-4 text-[#C9C2FF]" />
          <span className="text-[11px] font-semibold text-[#4C3CB8] uppercase tracking-wider">
            Traceable AI Evidence
          </span>
        </div>
        <h2 className="text-3xl font-bold text-[#1F2937]">Evidence</h2>
        <p className="text-sm text-[#6B7280] mt-1 max-w-xl">
          Every AI inference is bound to precise frames and timestamps. Nothing is a black box.
        </p>
      </div>

      {/* Evidence Chain Visual */}
      <div className="bg-white border border-[#E7E7E3] rounded-2xl p-5 shadow-sm">
        <h3 className="text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-4">
          Evidence Chain
        </h3>
        <div className="flex items-center gap-3 flex-wrap">
          {['AI Claim', 'Detected Event', 'Timestamp', 'Video Frame', 'Confidence'].map(
            (step, i, arr) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="px-4 py-2 bg-[#F3F1FF] border border-[#E1DCFF] rounded-xl text-xs font-semibold text-[#4C3CB8]">
                    {step}
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <svg
                    className="w-4 h-4 text-[#C9C2FF] shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </React.Fragment>
            )
          )}
        </div>
      </div>

      {/* Evidence Cards */}
      <div className="space-y-4">
        {displayEvents.map((evt) => {
          const sty = severityStyle(evt.severity);
          const isExpanded = expandedEventId === evt.id;
          const evidenceUrl = evt.evidence_url || api.getEventEvidenceUrl(evt.id);

          return (
            <div
              key={evt.id}
              className="bg-white border border-[#E7E7E3] rounded-2xl overflow-hidden shadow-sm transition-all duration-200"
            >
              {/* Card Header */}
              <button
                onClick={() => {
                  setExpandedEventId(isExpanded ? null : evt.id);
                  onSelectEvent(evt);
                }}
                className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-[#FAFAF8] transition"
              >
                <div className="flex items-center gap-4">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: sty.dot }}
                  />
                  <div>
                    <div className="flex items-center gap-2.5">
                      <p className="text-sm font-bold text-[#1F2937]">{evt.event_type}</p>
                      <span
                        className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border"
                        style={{ backgroundColor: sty.bg, color: sty.text, borderColor: sty.border }}
                      >
                        {evt.severity}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      Track #{evt.track_id} · {evt.zone || 'Global Scene'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="font-mono text-xs font-semibold text-[#4C3CB8]">
                      {formatTime(evt.start_time)}
                    </p>
                    <p className="text-[11px] text-[#9CA3AF]">
                      {(evt.confidence * 100).toFixed(0)}% conf
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#6B7280]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#6B7280]" />
                  )}
                </div>
              </button>

              {/* Expanded Evidence Details */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-[#F0F1EE] space-y-5 animate-slide-up">
                  {/* AI Claim */}
                  <div className="pt-4">
                    <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">
                      AI Claim
                    </p>
                    <div className="bg-[#FAFAF8] border border-[#E7E7E3] rounded-xl p-4">
                      <p className="text-sm text-[#1F2937] leading-relaxed">{evt.explanation}</p>
                    </div>
                  </div>

                  {/* Evidence Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Timestamp', value: formatTime(evt.start_time), mono: true },
                      { label: 'Duration', value: `${(evt.end_time - evt.start_time).toFixed(1)}s`, mono: true },
                      { label: 'Confidence', value: `${(evt.confidence * 100).toFixed(1)}%`, mono: true },
                      { label: 'Behaviour', value: evt.behaviour, mono: false },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="bg-[#FAFAF8] border border-[#E7E7E3] rounded-xl p-3"
                      >
                        <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-medium">
                          {item.label}
                        </p>
                        <p
                          className={`text-sm font-bold text-[#1F2937] mt-1 ${
                            item.mono ? 'font-mono text-[#4C3CB8]' : ''
                          }`}
                        >
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => onSeek(evt.start_time)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#1F2937] hover:bg-[#111827] text-white text-xs font-semibold rounded-xl transition"
                    >
                      <Play className="w-3.5 h-3.5 text-[#C9C2FF] fill-[#C9C2FF]" />
                      Jump to Video
                    </button>
                    <button
                      onClick={() => setModalEvent(evt)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#F3F1FF] hover:bg-[#E1DCFF] text-[#4C3CB8] text-xs font-semibold rounded-xl transition border border-[#E1DCFF]"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      View Evidence Clip
                    </button>
                  </div>

                  {/* Inline Evidence Video */}
                  <div>
                    <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">
                      Evidence Frame
                    </p>
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-[#E7E7E3] max-h-48">
                      <video
                        src={evidenceUrl}
                        controls
                        muted
                        loop
                        autoPlay
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute top-2 left-2 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-black/70 text-white">
                        {formatTime(evt.start_time)} · #{evt.id}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Evidence Video Modal */}
      {modalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#E7E7E3] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E7E3]">
              <div>
                <h3 className="text-base font-bold text-[#1F2937]">
                  Evidence — {modalEvent.event_type}
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Track #{modalEvent.track_id} · {formatTime(modalEvent.start_time)} –{' '}
                  {formatTime(modalEvent.end_time)}
                </p>
              </div>
              <button
                onClick={() => setModalEvent(null)}
                className="p-2 rounded-xl text-[#6B7280] hover:bg-[#F5F5F2] hover:text-[#1F2937] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="bg-black flex items-center justify-center">
              <video
                src={modalEvent.evidence_url || api.getEventEvidenceUrl(modalEvent.id)}
                controls
                autoPlay
                className="w-full max-h-[60vh] object-contain"
              />
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#E7E7E3] flex items-center justify-between">
              <p className="text-xs text-[#6B7280] max-w-[60%] leading-relaxed">
                {modalEvent.explanation}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    onSeek(modalEvent.start_time);
                    setModalEvent(null);
                  }}
                  className="px-4 py-2 bg-[#1F2937] text-white text-xs font-semibold rounded-xl hover:bg-[#111827] transition"
                >
                  Jump to Video
                </button>
                <button
                  onClick={() => setModalEvent(null)}
                  className="px-4 py-2 bg-[#F5F5F2] text-[#1F2937] text-xs font-medium rounded-xl hover:bg-[#EBEBEB] transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
