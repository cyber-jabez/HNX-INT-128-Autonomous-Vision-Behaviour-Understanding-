import React from 'react';
import {
  AlertTriangle,
  Flame,
  Users,
  Activity,
  Footprints,
  Clock,
  ArrowUpRight,
  Shield,
  Eye
} from 'lucide-react';
import { VideoEvent, TrackDetection, BehaviourType, AlertSeverity } from '../types';

interface MiddlePanelsProps {
  events: VideoEvent[];
  tracks: TrackDetection[];
  currentTime: number;
  onSelectEvent: (event: VideoEvent) => void;
  selectedTrackId: number | null;
  onSelectTrack: (trackId: number) => void;
}

export const MiddlePanels: React.FC<MiddlePanelsProps> = ({
  events,
  tracks,
  currentTime,
  onSelectEvent,
  selectedTrackId,
  onSelectTrack,
}) => {
  // Filter active alerts around current playback time or critical events
  const activeAlerts = events.filter(
    (e) => (e.severity === 'critical' || e.severity === 'high') || (currentTime >= e.start_time && currentTime <= e.end_time)
  );

  // Group behaviour summary counts
  const behaviourCounts: Record<BehaviourType, number> = {
    Walking: 0,
    Standing: 0,
    Running: 0,
    Stationary: 0,
    Loitering: 0,
  };

  tracks.forEach((t) => {
    const raw = String(t.behaviour || '').toLowerCase();
    if (raw.includes('walk')) behaviourCounts['Walking']++;
    else if (raw.includes('run')) behaviourCounts['Running']++;
    else if (raw.includes('loiter')) behaviourCounts['Loitering']++;
    else if (raw.includes('station')) behaviourCounts['Stationary']++;
    else behaviourCounts['Standing']++;
  });

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

  const getBehaviourColor = (b: BehaviourType) => {
    switch (b) {
      case 'Running':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'Loitering':
        return 'text-pink-400 bg-pink-500/10 border-pink-500/30';
      case 'Stationary':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'Walking':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. ACTIVE ALERTS PANEL */}
      <div className="bg-[#111726] border border-slate-800 rounded-xl p-4 flex flex-col shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Active Alerts</h3>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
            {activeAlerts.length} Active
          </span>
        </div>

        <div className="mt-3 space-y-2.5 max-h-56 overflow-y-auto pr-1">
          {activeAlerts.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No critical anomalies detected at current frame
            </div>
          ) : (
            activeAlerts.map((evt) => (
              <div
                key={evt.id}
                onClick={() => onSelectEvent(evt)}
                className="group p-2.5 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800/90 hover:border-slate-700 rounded-lg cursor-pointer transition flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white group-hover:text-indigo-300 transition">
                    {evt.event_type}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${getSeverityBadge(
                      evt.severity
                    )}`}
                  >
                    {evt.severity}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Track #{evt.track_id} • {evt.zone || 'Global'}</span>
                  <span className="font-mono text-slate-300">
                    {evt.start_time.toFixed(1)}s - {evt.end_time.toFixed(1)}s
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. TRACKED OBJECTS PANEL */}
      <div className="bg-[#111726] border border-slate-800 rounded-xl p-4 flex flex-col shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Tracked Objects</h3>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {tracks.length} in Scene
          </span>
        </div>

        <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
          {tracks.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No subjects currently tracked in frame
            </div>
          ) : (
            tracks.map((t) => {
              const isSelected = selectedTrackId === t.track_id;
              return (
                <div
                  key={t.track_id}
                  onClick={() => onSelectTrack(t.track_id)}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500/80 text-white'
                      : 'bg-slate-900/60 hover:bg-slate-800/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center font-mono text-[11px] font-bold text-indigo-400">
                      #{t.track_id}
                    </div>
                    <div>
                      <p className="font-medium text-white">{t.class_name}</p>
                      <p className="text-[10px] text-slate-400">
                        Conf: {(t.confidence * 100).toFixed(0)}% {t.speed ? `• ${t.speed} m/s` : ''}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${getBehaviourColor(
                      t.behaviour
                    )}`}
                  >
                    {t.behaviour}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. BEHAVIOUR SUMMARY PANEL */}
      <div className="bg-[#111726] border border-slate-800 rounded-xl p-4 flex flex-col shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Current Behaviours</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Live Aggregate</span>
        </div>

        <div className="mt-3 space-y-2">
          {(Object.entries(behaviourCounts) as [BehaviourType, number][]).map(([beh, count]) => (
            <div
              key={beh}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80"
            >
              <div className="flex items-center space-x-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    count > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                  }`}
                />
                <span className="text-xs text-slate-200">{beh}</span>
              </div>
              <span className="font-mono text-xs font-semibold text-slate-300 px-2 py-0.5 bg-slate-800 rounded">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
