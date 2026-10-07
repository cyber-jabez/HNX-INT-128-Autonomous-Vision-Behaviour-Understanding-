import React, { useState } from 'react';
import { ShieldAlert, Plus, Trash2, Crosshair, Sparkles } from 'lucide-react';
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
    <div className="bg-[#FFFFFF] border border-[#EDEDEA] rounded-2xl p-4 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#F5F5F3] mb-3">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-[#111827]" />
          <h3 className="text-xs font-bold text-[#111827]">Geofence Zone Perimeter Editor</h3>
          <span className="text-[11px] text-[#8E95A2]">· Draw polygons directly on stream</span>
        </div>

        {isDrawing ? (
          <button
            onClick={onCancelDrawing}
            className="px-3 py-1 text-xs font-semibold text-[#BE123C] bg-[#FFF1F2] border border-[#FEE2E2] rounded-xl hover:bg-[#FFE4E6] transition active:scale-95"
          >
            Cancel Drawing
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="bg-[#F8F9FA] border border-[#EDEDEA] text-[#111827] text-xs font-medium rounded-xl px-3 py-1.5 outline-none cursor-pointer hover:border-[#D1D2CC] transition"
            >
              <option value="Restricted Zone">Restricted Zone (Intrusion Alert)</option>
              <option value="Machine Area">Hazard / Machine Area</option>
              <option value="Safe Zone">Safe / Pedestrian Zone</option>
            </select>
            <button
              onClick={() => onStartDrawing(selectedType)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#111827] hover:bg-[#000000] text-white rounded-xl text-xs font-semibold transition active:scale-95 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#A5B4FC]" />
              <span>Draw Polygon</span>
            </button>
          </div>
        )}
      </div>

      {/* Defined Zones Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {zones.length === 0 ? (
          <div className="col-span-3 text-center py-3 text-xs text-[#9CA3AF]">
            No zones defined yet. Click "Draw Polygon" and click on the stream to enclose a zone.
          </div>
        ) : (
          zones.map((zone) => (
            <div
              key={zone.id}
              className="p-3 bg-[#FBFBFA] border border-[#EDEDEA] rounded-xl flex items-center justify-between group hover:border-[#D1D2CC] transition"
            >
              <div className="flex items-center gap-2.5 truncate">
                <span
                  className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: zone.color }}
                />
                <div className="truncate">
                  <p className="text-xs font-bold text-[#111827] truncate">{zone.name}</p>
                  <p className="text-[10px] text-[#6B7280] font-mono">
                    {zone.type} · {zone.polygon.length} vertices
                  </p>
                </div>
              </div>
              <button
                onClick={() => onDeleteZone(zone.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-[#9CA3AF] hover:text-[#BE123C] transition rounded-lg"
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
