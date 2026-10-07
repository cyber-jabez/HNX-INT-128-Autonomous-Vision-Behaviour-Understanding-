import React, { useMemo } from 'react';
import { Network, ShieldAlert, Play, Info, ArrowRight, Share2 } from 'lucide-react';
import { TemporalGraphNode, TemporalGraphEdge, VideoEvent, Zone } from '../types';
import { MOCK_TEMPORAL_NODES, MOCK_TEMPORAL_EDGES } from '../services/mockData';

interface TemporalGraphViewProps {
  events?: VideoEvent[];
  zones?: Zone[];
  onSeek: (seconds: number) => void;
  onNavigateToAnalysis?: () => void;
}

export const TemporalGraphView: React.FC<TemporalGraphViewProps> = ({
  events = [],
  zones = [],
  onSeek,
  onNavigateToAnalysis,
}) => {
  const { nodes, edges } = useMemo(() => {
    if (!events || events.length === 0) {
      return { nodes: MOCK_TEMPORAL_NODES, edges: MOCK_TEMPORAL_EDGES };
    }

    const gNodes: TemporalGraphNode[] = [];
    const gEdges: TemporalGraphEdge[] = [];

    const trackIds = Array.from(new Set(events.map((e) => e.track_id)));
    trackIds.forEach((tid) => {
      gNodes.push({
        id: `node-entity-${tid}`,
        label: `Person #${tid}`,
        category: 'entity',
        description: `Subject #${tid} tracked across frames`,
      });
    });

    if (zones.length > 0) {
      zones.forEach((z) => {
        gNodes.push({
          id: `node-zone-${z.id}`,
          label: z.name,
          category: 'zone',
          description: `Perimeter Polygon: ${z.type}`,
        });
      });
    }

    events.forEach((evt) => {
      const evtNodeId = `node-evt-${evt.id}`;
      gNodes.push({
        id: evtNodeId,
        label: evt.event_type.replace(/_/g, ' '),
        category: 'action',
        timestamp: evt.start_time,
        description: evt.explanation,
      });

      gEdges.push({
        id: `edge-ent-act-${evt.id}`,
        source: `node-entity-${evt.track_id}`,
        target: evtNodeId,
        relationship: 'DURING',
        label: 'exhibits',
      });

      if (zones.length > 0) {
        gEdges.push({
          id: `edge-act-zone-${evt.id}`,
          source: evtNodeId,
          target: `node-zone-${zones[0].id}`,
          relationship: 'ENTERS',
          label: 'within',
        });
      }
    });

    return { nodes: gNodes, edges: gEdges };
  }, [events, zones]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Network className="w-4 h-4 text-[#4F46E5]" />
          <span className="text-[11px] font-bold text-[#4338CA] uppercase tracking-wider">
            Causal Event Graph
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827]">
          Temporal Knowledge Topology
        </h2>
        <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
          Connected causal relationships between entities, observed actions, and spatial polygons.
        </p>
      </div>

      {/* Nodes Map View */}
      <div className="bg-[#FFFFFF] border border-[#EDEDEA] rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
          Active Topology Graph Elements ({nodes.length} Nodes, {edges.length} Relationships)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {nodes.map((node) => {
            let catColor = 'bg-[#F0F9FF] text-[#0369A1] border-[#E0F2FE]';
            if (node.category === 'entity') catColor = 'bg-[#EEF2FF] text-[#4338CA] border-[#DDE4FF]';
            if (node.category === 'zone') catColor = 'bg-[#ECFDF5] text-[#047857] border-[#D1FAE5]';
            if (node.category === 'action') catColor = 'bg-[#FFF7ED] text-[#C2410C] border-[#FFEDD5]';

            return (
              <div
                key={node.id}
                className="p-4 bg-[#FBFBFA] border border-[#EDEDEA] rounded-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#111827]">{node.label}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${catColor}`}>
                      {node.category}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B7280] leading-relaxed">
                    {node.description || 'Monitored topological node'}
                  </p>
                </div>

                {node.timestamp !== undefined && (
                  <div className="pt-3 mt-2 border-t border-[#EDEDEA] flex items-center justify-between">
                    <span className="font-mono text-[11px] text-[#8E95A2]">
                      @{node.timestamp.toFixed(1)}s
                    </span>
                    <button
                      onClick={() => {
                        onSeek(node.timestamp!);
                        if (onNavigateToAnalysis) onNavigateToAnalysis();
                      }}
                      className="flex items-center gap-1 text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA]"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Inspect</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
