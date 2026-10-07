import React, { useState } from 'react';
import { PenTool, Plus, Trash2 } from 'lucide-react';
import { Zone } from '../types';

interface ZoneEditorPanelProps {
  zones: Zone[];
  isDrawing: boolean;
  onStartDrawing: (zoneType: string) => void;
  onCancelDrawing: () => void;
  onDeleteZone: (zoneId: string) => void;
}

export const ZoneEditorPanel: React.FC<ZoneEditorPanelProps> = ({
  zones,
  isDrawing,
  onStartDrawing,
  onCancelDrawing,
  onDeleteZone,
}) => {
  const [selectedType, setSelectedType] = useState<'Restricted Zone' | 'Machine Area' | 'Safe Zone'>(
    'Restricted Zone'
  );

  return (
    <div className="bg-white border border-[#E7E7E3] rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#F0F1EE] mb-3">
        <div className="flex items-center gap-2">
          <PenTool className="w-3.5 h-3.5 text-[#6B7280]" />
          <span className="text-xs font-semibold text-[#1F2937]">Zone Editor</span>
          <span className="text-[11px] text-[#9CA3AF]">· draw polygon zones on the video</span>
        </div>

        {isDrawing ? (
          <button
            onClick={onCancelDrawing}
            className="px-3 py-1 text-xs font-medium text-[#9C1F2E] bg-[#FDF2F4] border border-[#F5C8CF] rounded-xl hover:bg-[#FAD3D8] transition"
          >
            Cancel Drawing
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="bg-[#FAFAF8] border border-[#E7E7E3] text-[#1F2937] text-xs rounded-xl px-2.5 py-1.5 outline-none focus:border-[#C9C2FF] transition"
            >
              <option value="Restricted Zone">Restricted Zone</option>
              <option value="Machine Area">Machine Area</option>
              <option value="Safe Zone">Safe Zone</option>
            </select>
            <button
              onClick={() => onStartDrawing(selectedType)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1F2937] hover:bg-[#111827] text-white rounded-xl text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Draw Zone
            </button>
          </div>
        )}
      </div>

      {/* Zones List */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {zones.length === 0 ? (
          <div className="col-span-3 text-center py-3 text-xs text-[#9CA3AF]">
            No zones defined yet. Click &quot;Draw Zone&quot; and place points on the video.
          </div>
        ) : (
          zones.map((zone) => (
            <div
              key={zone.id}
              className="p-2.5 bg-[#FAFAF8] border border-[#E7E7E3] rounded-xl flex items-center justify-between group hover:border-[#DCDDD9] transition"
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: zone.color }}
                />
                <div className="truncate">
                  <p className="text-xs font-semibold text-[#1F2937] truncate">{zone.name}</p>
                  <p className="text-[10px] text-[#9CA3AF]">
                    {zone.type} · {zone.polygon.length} pts
                  </p>
                </div>
              </div>
              <button
                onClick={() => onDeleteZone(zone.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-[#9CA3AF] hover:text-[#9C1F2E] transition rounded-lg"
                title="Delete zone"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
