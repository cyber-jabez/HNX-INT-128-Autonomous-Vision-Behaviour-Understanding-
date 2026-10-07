import React, { useState } from 'react';
import {
  Network,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
  ArrowRight,
  ShieldAlert,
  Play
} from 'lucide-react';
import { TemporalGraphNode, TemporalGraphEdge } from '../types';
import { MOCK_TEMPORAL_NODES, MOCK_TEMPORAL_EDGES } from '../services/mockData';

interface TemporalGraphViewProps {
  onSeek: (seconds: number) => void;
  onNavigateToAnalysis?: () => void;
}

export const TemporalGraphView: React.FC<TemporalGraphViewProps> = ({
  onSeek,
  onNavigateToAnalysis,
}) => {
  const [nodes] = useState<TemporalGraphNode[]>(MOCK_TEMPORAL_NODES);
  const [edges] = useState<TemporalGraphEdge[]>(MOCK_TEMPORAL_EDGES);
  const [selectedNode, setSelectedNode] = useState<TemporalGraphNode>(MOCK_TEMPORAL_NODES[0]);
  const [zoomLevel, setZoomLevel] = useState(1);

  const getNodeColor = (cat: TemporalGraphNode['category']) => {
    switch (cat) {
      case 'entity':
        return 'bg-[#F3F1FF] text-[#4C3CB8] border-[#C9C2FF]';
      case 'action':
        return 'bg-[#FFF7F0] text-[#9A4B10] border-[#FFD6B8]';
      case 'zone':
        return 'bg-[#F0FAF4] text-[#1B663E] border-[#BFE8D0]';
      case 'object':
        return 'bg-[#F0F5FF] text-[#1E4D8C] border-[#BFD7FF]';
      default:
        return 'bg-[#FAFAF8] text-[#374151] border-[#E8E9E6]';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header and Controls */}
      <div className="bg-[#FFFFFF] border border-[#E8E9E6] rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#4C3CB8]">
            <Network className="w-4 h-4 text-[#C9C2FF]" />
            <span>INTERACTIVE TEMPORAL REASONING GRAPH</span>
          </div>
          <h2 className="text-xl font-bold text-[#1F2937] tracking-tight mt-1">
            Causal & Relational Event Topology
          </h2>
          <p className="text-xs text-[#6B7280]">
            Click any node to inspect temporal associations, intervals, and related evidence timestamps.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="px-2 py-0.5 rounded-md bg-[#F3F1FF] text-[#4C3CB8] border border-[#E1DCFF]">
            Entity
          </span>
          <span className="px-2 py-0.5 rounded-md bg-[#FFF7F0] text-[#9A4B10] border border-[#FFE4CE]">
            Action
          </span>
          <span className="px-2 py-0.5 rounded-md bg-[#F0FAF4] text-[#1B663E] border border-[#D1F0DE]">
            Zone
          </span>
        </div>
      </div>

      {/* Main Graph Canvas & Node Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Visual Interactive Node Sequence */}
        <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E8E9E6] rounded-2xl p-6 shadow-xs relative overflow-hidden min-h-[460px] flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0F1EE]">
            <span className="text-xs font-semibold text-[#1F2937]">Temporal Node Hierarchy</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.1))}
                className="p-1 rounded-lg border border-[#E8E9E6] hover:bg-[#F4F5F2] text-[#6B7280]"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                className="p-1 rounded-lg border border-[#E8E9E6] hover:bg-[#F4F5F2] text-[#6B7280]"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Graph Visualization Container */}
          <div
            className="flex-1 py-6 overflow-x-auto flex items-center justify-start gap-4 select-none"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
          >
            {nodes.map((node, i) => {
              const isSelected = selectedNode?.id === node.id;
              const relatedEdge = edges.find((e) => e.source === node.id);

              return (
                <div key={node.id} className="flex items-center gap-4 shrink-0">
                  <div
                    onClick={() => setSelectedNode(node)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 min-w-[150px] shadow-xs ${getNodeColor(
                      node.category
                    )} ${isSelected ? 'ring-2 ring-[#4C3CB8] scale-105' : 'hover:scale-102'}`}
                  >
                    <div className="flex items-center justify-between text-[10px] uppercase font-mono tracking-wider opacity-70">
                      <span>{node.category}</span>
                      {node.timestamp !== undefined && (
                        <span>{node.timestamp.toFixed(1)}s</span>
                      )}
                    </div>
                    <div className="mt-1 text-xs font-bold truncate">{node.label}</div>
                    <div className="text-[11px] opacity-80 truncate mt-0.5">
                      {node.description}
                    </div>
                  </div>

                  {/* Edge Arrow to Next Node */}
                  {i < nodes.length - 1 && (
                    <div className="flex flex-col items-center justify-center shrink-0 text-[#9CA3AF]">
                      <span className="text-[9px] font-mono font-medium uppercase px-1.5 py-0.5 rounded bg-[#F4F5F2] border border-[#E8E9E6] text-[#6B7280]">
                        {relatedEdge ? relatedEdge.relationship : 'THEN'}
                      </span>
                      <div className="w-8 h-0.5 bg-[#E8E9E6] my-1" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#F0F1EE] text-[11px] text-[#9CA3AF] flex items-center justify-between">
            <span>Graph contains {nodes.length} entities & events</span>
            <span>Relationships: BEFORE • AFTER • ENTERS • EXITS • DWELLS</span>
          </div>
        </div>

        {/* Right: Selected Node Detail Card */}
        <div className="bg-[#FFFFFF] border border-[#E8E9E6] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F1EE]">
              <span className="text-xs font-semibold text-[#1F2937]">Node Detail</span>
              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${getNodeColor(
                  selectedNode.category
                )}`}
              >
                {selectedNode.category}
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#1F2937]">{selectedNode.label}</h3>
              <p className="text-xs text-[#6B7280]">{selectedNode.description}</p>
            </div>

            <div className="space-y-2 text-xs bg-[#FAFAF8] p-3.5 rounded-xl border border-[#E8E9E6]">
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">Node ID</span>
                <span className="font-mono text-[#1F2937]">{selectedNode.id}</span>
              </div>
              {selectedNode.timestamp !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7280]">Timestamp Anchor</span>
                  <span className="font-mono font-semibold text-[#4C3CB8]">
                    00:{selectedNode.timestamp.toFixed(1).padStart(4, '0')}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">Confidence Tier</span>
                <span className="font-mono text-[#10B981]">High (96.4%)</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                Related Graph Relations
              </h4>
              <div className="space-y-1.5">
                {edges
                  .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                  .map((e) => (
                    <div
                      key={e.id}
                      className="p-2 rounded-lg bg-[#F8F9F7] border border-[#E8E9E6] text-[11px] flex items-center justify-between"
                    >
                      <span className="font-mono text-[#4C3CB8]">{e.relationship}</span>
                      <span className="text-[#6B7280]">{e.label || 'Connected'}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {selectedNode.timestamp !== undefined && (
            <div className="pt-4 border-t border-[#F0F1EE]">
              <button
                onClick={() => {
                  onSeek(selectedNode.timestamp!);
                  if (onNavigateToAnalysis) onNavigateToAnalysis();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#1F2937] hover:bg-[#111827] text-white rounded-xl text-xs font-semibold transition"
              >
                <Play className="w-3.5 h-3.5 text-[#C9C2FF] fill-[#C9C2FF]" />
                <span>Jump to Frame ({selectedNode.timestamp.toFixed(1)}s)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
