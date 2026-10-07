import React, { useState } from 'react';
import {
  FileText,
  Video,
  ExternalLink,
  ShieldAlert,
  MapPin,
  Clock,
  Gauge,
  Info,
  Maximize2,
  X
} from 'lucide-react';
import { VideoEvent, AlertSeverity } from '../types';
import { api } from '../services/api';

interface BottomDetailsProps {
  selectedEvent: VideoEvent | null;
  onSeek: (time: number) => void;
}

export const BottomDetails: React.FC<BottomDetailsProps> = ({
  selectedEvent,
  onSeek,
}) => {
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);

  const getSeverityBadge = (sev: AlertSeverity) => {
    switch (sev) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'high':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }
  };

  const evidenceUrl = selectedEvent
    ? selectedEvent.evidence_url || api.getEventEvidenceUrl(selectedEvent.id)
    : '';

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: EVENT DETAILS */}
        <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white">Event Details & AI Diagnostics</h3>
              </div>
              {selectedEvent && (
                <span
                  className={`text-[11px] uppercase font-bold px-2 py-0.5 rounded border ${getSeverityBadge(
                    selectedEvent.severity
                  )}`}
                >
                  {selectedEvent.severity}
                </span>
              )}
            </div>

            {/* Content */}
            {selectedEvent ? (
              <div className="mt-4 space-y-4">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">TRACK ID</span>
                    <span className="font-mono font-bold text-white text-sm">#{selectedEvent.track_id}</span>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">BEHAVIOUR</span>
                    <span className="font-semibold text-indigo-300">{selectedEvent.behaviour}</span>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">CONFIDENCE</span>
                    <span className="font-mono font-semibold text-emerald-400">
                      {(selectedEvent.confidence * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">DURATION</span>
                    <span className="font-mono text-white">
                      {(selectedEvent.end_time - selectedEvent.start_time).toFixed(1)}s
                    </span>
                  </div>
                </div>

                {/* Additional Info Rows */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border border-slate-800">
                    <span className="text-slate-400 flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Timestamp Interval</span>
                    </span>
                    <span className="font-mono text-slate-200">
                      {selectedEvent.start_time.toFixed(2)}s — {selectedEvent.end_time.toFixed(2)}s
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border border-slate-800">
                    <span className="text-slate-400 flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>Zone / Location</span>
                    </span>
                    <span className="text-slate-200 font-medium">
                      {selectedEvent.zone || 'Global Frame Area'}
                    </span>
                  </div>
                </div>

                {/* AI Explanation from Backend */}
                <div className="bg-slate-900/90 border border-indigo-500/20 rounded-xl p-3.5">
                  <div className="flex items-center space-x-1.5 text-xs text-indigo-400 font-semibold mb-1.5">
                    <Info className="w-3.5 h-3.5" />
                    <span>Backend Neural Reasoner Output</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedEvent.explanation}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                Select an event from the timeline or active alerts above to view diagnostics.
              </div>
            )}
          </div>

          {selectedEvent && (
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-end">
              <button
                onClick={() => onSeek(selectedEvent.start_time)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-lg transition"
              >
                Jump to Event Start ({selectedEvent.start_time.toFixed(1)}s)
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: EVIDENCE VIEWER */}
        <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg">
                  <Video className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white">Evidence Video Clip</h3>
              </div>
              {selectedEvent && (
                <button
                  onClick={() => setShowEvidenceModal(true)}
                  className="flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 transition"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Expand Clip</span>
                </button>
              )}
            </div>

            {selectedEvent ? (
              <div className="mt-4 space-y-3">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center group">
                  <video
                    src={evidenceUrl}
                    controls
                    autoPlay
                    loop
                    muted
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 left-2 bg-rose-600/90 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow">
                    EVIDENCE CLIP • #{selectedEvent.id}
                  </div>
                </div>

                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>Backend Clip URL: <code className="text-slate-300 text-[11px]">/events/{selectedEvent.id}/evidence</code></span>
                  <button
                    onClick={() => setShowEvidenceModal(true)}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs transition"
                  >
                    View Full Evidence
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-500 text-xs">
                No event selected. Select an incident to load automated evidence video snippet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Evidence Modal */}
      {showEvidenceModal && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#111726] border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0d121f]">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Evidence Viewer — {selectedEvent.event_type}
                </h3>
                <p className="text-xs text-slate-400">
                  Track #{selectedEvent.track_id} • Interval {selectedEvent.start_time.toFixed(1)}s -{' '}
                  {selectedEvent.end_time.toFixed(1)}s
                </p>
              </div>
              <button
                onClick={() => setShowEvidenceModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 bg-black flex items-center justify-center">
              <video
                src={evidenceUrl}
                controls
                autoPlay
                className="w-full max-h-[60vh] object-contain rounded-lg"
              />
            </div>

            <div className="px-6 py-4 bg-[#0d121f] border-t border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <span>{selectedEvent.explanation}</span>
              <button
                onClick={() => setShowEvidenceModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition"
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
