import React, { useState } from 'react';
import {
  Activity,
  Footprints,
  Users,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { BehaviourType, VideoEvent, EntitySummary } from '../types';
import { MOCK_ENTITIES } from '../services/mockData';

interface BehaviourViewProps {
  events: VideoEvent[];
  onSeek: (seconds: number) => void;
  onNavigateToAnalysis?: () => void;
  onSelectTrackId?: (trackId: number) => void;
}

export const BehaviourView: React.FC<BehaviourViewProps> = ({
  events,
  onSeek,
  onNavigateToAnalysis,
  onSelectTrackId,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'normal' | 'unusual' | 'critical'>('all');

  const entities = MOCK_ENTITIES;

  const normalEvents = events.filter((e) => e.severity === 'low');
  const unusualEvents = events.filter((e) => e.severity === 'medium');
  const criticalEvents = events.filter((e) => e.severity === 'high' || e.severity === 'critical');

  const behaviourSequence = [
    { time: '00:04.2', entity: 'Person #12', action: 'Entered Vault Area', tag: 'Perimeter Breach', type: 'critical' },
    { time: '00:07.5', entity: 'Person #12', action: 'Approached Workstation', tag: 'Dwell Initiated', type: 'high' },
    { time: '00:09.1', entity: 'Person #12', action: 'Interacted with Object/Panel', tag: 'Direct Engagement', type: 'high' },
    { time: '00:14.5', entity: 'Person #12', action: 'Exited Restricted Area', tag: 'Egress Boundary', type: 'medium' },
    { time: '00:28.5', entity: 'Person #19', action: 'Vertical Collapse / Fall', tag: 'Kinematic Abnormality', type: 'critical' },
    { time: '00:52.0', entity: 'Officer #4', action: 'Patrol Walkway East', tag: 'Nominal Route', type: 'normal' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-[#FFFFFF] border border-[#E8E9E6] rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#4C3CB8]">
            <Activity className="w-4 h-4 text-[#C9C2FF]" />
            <span>BEHAVIOUR & KINEMATIC INTELLIGENCE</span>
          </div>
          <h2 className="text-xl font-bold text-[#1F2937] tracking-tight mt-1">
            Behaviour Overview & Sequences
          </h2>
          <p className="text-xs text-[#6B7280]">
            Autonomous classification of spatial transitions, kinematics, and anomalous trajectories.
          </p>
        </div>

        {/* 3 Overview Badges */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-[#F0FAF4] border border-[#D1F0DE] text-xs">
            <span className="text-[#1B663E] font-medium">Normal: </span>
            <span className="font-mono font-bold text-[#1B663E]">{normalEvents.length}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#FFF7F0] border border-[#FFE4CE] text-xs">
            <span className="text-[#9A4B10] font-medium">Unusual: </span>
            <span className="font-mono font-bold text-[#9A4B10]">{unusualEvents.length}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#FDF2F4] border border-[#FAD3D8] text-xs">
            <span className="text-[#9C1F2E] font-medium">Critical: </span>
            <span className="font-mono font-bold text-[#9C1F2E]">{criticalEvents.length}</span>
          </div>
        </div>
      </div>

      {/* Behaviour Sequence Flow */}
      <div className="bg-[#FFFFFF] border border-[#E8E9E6] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0F1EE]">
          <div>
            <h3 className="text-xs font-semibold text-[#1F2937] uppercase tracking-wider">
              Behavioural Progression Sequence
            </h3>
            <p className="text-[11px] text-[#6B7280]">
              Chronological transition graph from entry to exit
            </p>
          </div>
          <span className="text-[11px] text-[#9CA3AF]">Click step to inspect video</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {behaviourSequence.map((seq, idx) => (
            <div
              key={idx}
              onClick={() => {
                const parts = seq.time.split(':');
                const secs = parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
                onSeek(secs);
                if (onNavigateToAnalysis) onNavigateToAnalysis();
              }}
              className="p-3.5 rounded-xl bg-[#FAFAF8] hover:bg-[#F3F1FF] border border-[#E8E9E6] hover:border-[#C9C2FF] cursor-pointer transition flex flex-col justify-between gap-3 group"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-[#4C3CB8] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#E8E9E6]">
                  {seq.time}
                </span>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    seq.type === 'critical'
                      ? 'bg-[#FDF2F4] text-[#9C1F2E] border border-[#FAD3D8]'
                      : seq.type === 'high'
                      ? 'bg-[#FFF7F0] text-[#9A4B10] border border-[#FFE4CE]'
                      : 'bg-[#F0FAF4] text-[#1B663E] border border-[#D1F0DE]'
                  }`}
                >
                  {seq.tag}
                </span>
              </div>

              <div>
                <p className="text-xs font-bold text-[#1F2937] group-hover:text-[#4C3CB8] transition">
                  {seq.action}
                </p>
                <p className="text-[11px] text-[#6B7280]">{seq.entity}</p>
              </div>

              <div className="text-[10px] text-[#9CA3AF] flex items-center justify-between pt-1 border-t border-[#F0F1EE]">
                <span>Step {idx + 1}</span>
                <span className="text-[#4C3CB8] opacity-0 group-hover:opacity-100 transition">
                  Jump to video →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tracked Entities Explorer */}
      <div className="bg-[#FFFFFF] border border-[#E8E9E6] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0F1EE]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#6B7280]" />
            <h3 className="text-xs font-semibold text-[#1F2937] uppercase tracking-wider">
              Tracked Entities
            </h3>
          </div>
          <span className="text-[11px] text-[#6B7280]">{entities.length} Persistent IDs</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {entities.map((ent) => (
            <div
              key={ent.track_id}
              onClick={() => {
                if (onSelectTrackId) onSelectTrackId(ent.track_id);
                onSeek(ent.first_seen);
                if (onNavigateToAnalysis) onNavigateToAnalysis();
              }}
              className="p-3.5 rounded-xl bg-[#FAFAF8] hover:bg-[#FFFFFF] border border-[#E8E9E6] hover:border-[#C9C2FF] cursor-pointer transition space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#1F2937]">
                  Track #{ent.track_id}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F3F1FF] text-[#4C3CB8] border border-[#E1DCFF]">
                  {ent.primary_behaviour}
                </span>
              </div>

              <div className="text-xs text-[#6B7280] space-y-1">
                <div className="flex justify-between">
                  <span>Class</span>
                  <span className="text-[#1F2937] font-medium">{ent.class_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Window</span>
                  <span className="font-mono text-[#1F2937]">
                    {ent.first_seen.toFixed(1)}s – {ent.last_seen.toFixed(1)}s ({ent.duration}s)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Primary Zone</span>
                  <span className="text-[#1F2937] truncate max-w-[140px]">{ent.zone}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#F0F1EE] flex items-center justify-between text-[11px]">
                <span className="text-[#10B981] font-mono">
                  {(ent.confidence * 100).toFixed(0)}% Conf
                </span>
                <span className="text-[#4C3CB8] font-medium group-hover:underline">
                  Filter timeline →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
