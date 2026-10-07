import React, { useState, useEffect } from 'react';
import {
  Activity,
  Users,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  Crosshair
} from 'lucide-react';
import { BehaviourType, VideoEvent, EntitySummary, TrackDetection } from '../types';
import { MOCK_ENTITIES } from '../services/mockData';
import { api } from '../services/api';

interface BehaviourViewProps {
  videoId?: string;
  events: VideoEvent[];
  tracks?: TrackDetection[];
  onSeek: (seconds: number) => void;
  onNavigateToAnalysis?: () => void;
  onSelectTrackId?: (trackId: number) => void;
}

export const BehaviourView: React.FC<BehaviourViewProps> = ({
  videoId,
  events,
  tracks = [],
  onSeek,
  onNavigateToAnalysis,
  onSelectTrackId,
}) => {
  const [backendEntities, setBackendEntities] = useState<EntitySummary[]>([]);

  useEffect(() => {
    if (!videoId || videoId.startsWith('vid-demo')) {
      setBackendEntities(MOCK_ENTITIES);
      return;
    }

    let isMounted = true;
    api
      .getVideoTrackSummaries(videoId)
      .then((summaries) => {
        if (!isMounted || !summaries || summaries.length === 0) {
          setBackendEntities(MOCK_ENTITIES);
          return;
        }

        const realEntities: EntitySummary[] = summaries.map((s: any) => {
          const matchingEvent = events.find((e) => e.track_id === s.track_id);
          const firstSeen = s.first_seen ?? 0;
          const lastSeen = s.last_seen ?? firstSeen + 1;
          return {
            track_id: s.track_id,
            class_name: s.object_type || 'person',
            first_seen: firstSeen,
            last_seen: lastSeen,
            duration: Math.max(1, Math.round((lastSeen - firstSeen) * 10) / 10),
            primary_behaviour: (matchingEvent?.behaviour || 'Walking') as any,
            confidence: 0.94,
            event_count: events.filter((e) => e.track_id === s.track_id).length,
            zone: matchingEvent?.zone || 'Monitored Perimeter',
          };
        });

        setBackendEntities(realEntities);
      })
      .catch(() => {
        if (isMounted) setBackendEntities(MOCK_ENTITIES);
      });

    return () => {
      isMounted = false;
    };
  }, [videoId, events]);

  const entities = backendEntities.length > 0 ? backendEntities : MOCK_ENTITIES;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-[#4F46E5]" />
          <span className="text-[11px] font-bold text-[#4338CA] uppercase tracking-wider">
            Spatial Behaviour Intelligence
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827]">
          Entity Behaviour & Tracks
        </h2>
        <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
          Detailed profile and progression logs for every persistent track identified across the feed.
        </p>
      </div>

      {/* Tracked Entities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {entities.map((ent) => {
          const hasIncident = events.some((e) => e.track_id === ent.track_id);

          return (
            <div
              key={ent.track_id}
              onClick={() => {
                if (onSelectTrackId) onSelectTrackId(ent.track_id);
                onSeek(ent.first_seen);
                if (onNavigateToAnalysis) onNavigateToAnalysis();
              }}
              className="bg-[#FFFFFF] border border-[#EDEDEA] hover:border-[#D1D2CC] p-5 rounded-2xl shadow-xs cursor-pointer transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#F5F5F3] mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                    <span className="font-mono text-xs font-bold text-[#111827]">
                      Entity #{ent.track_id}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#4B5563]">
                    {ent.class_name}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-[#6B7280]">
                    <span>Primary Action:</span>
                    <span className="font-semibold text-[#111827]">{ent.primary_behaviour}</span>
                  </div>
                  <div className="flex justify-between text-[#6B7280]">
                    <span>Active Span:</span>
                    <span className="font-mono text-[#111827]">
                      {ent.first_seen.toFixed(1)}s → {ent.last_seen.toFixed(1)}s ({ent.duration}s)
                    </span>
                  </div>
                  <div className="flex justify-between text-[#6B7280]">
                    <span>Zone Location:</span>
                    <span className="font-medium text-[#111827]">{ent.zone}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-[#F5F5F3] flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  hasIncident
                    ? 'bg-[#FFF7ED] text-[#C2410C] border-[#FFEDD5]'
                    : 'bg-[#F0FDF4] text-[#15803D] border-[#DCFCE7]'
                }`}>
                  {hasIncident ? 'Incident Logged' : 'Normal Track'}
                </span>

                <div className="flex items-center gap-1 text-xs font-semibold text-[#4F46E5]">
                  <span>Track View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
