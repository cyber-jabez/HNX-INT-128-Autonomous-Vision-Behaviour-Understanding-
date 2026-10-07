import React, { useState } from 'react';
import { PenTool, Plus, Trash2, Check, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';
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
  const [selectedType, setSelectedType] = useState<'Restricted Zone' | 'Machine Area' | 'Safe Zone'>('Restricted Zone');

  return (
    <div className="bg-[#111726] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <PenTool className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Zone Editor</h3>
            <p className="text-[11px] text-slate-400">Define polygon zones on the surveillance canvas</p>
          </div>
        </div>

        {isDrawing ? (
          <button
            onClick={onCancelDrawing}
            className="px-3 py-1 bg-rose-600/20 border border-rose-500/40 text-rose-300 text-xs rounded-lg hover:bg-rose-600/30 transition"
          >
            Cancel Drawing
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500"
            >
              <option value="Restricted Zone">Restricted Zone</option>
              <option value="Machine Area">Machine Area</option>
              <option value="Safe Zone">Safe Zone</option>
            </select>

            <button
              onClick={() => onStartDrawing(selectedType)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition shadow-md shadow-indigo-600/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Draw Zone</span>
            </button>
          </div>
        )}
      </div>

      {/* List of configured zones */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {zones.length === 0 ? (
          <div className="col-span-3 text-center py-3 text-slate-500 text-xs">
            No zones defined yet. Click "Draw Zone" and place points on the video above.
          </div>
        ) : (
          zones.map((zone) => (
            <div
              key={zone.id}
              className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between group hover:border-slate-700 transition"
            >
              <div className="flex items-center space-x-2 truncate">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: zone.color }}
                />
                <div className="truncate">
                  <p className="text-xs font-medium text-white truncate">{zone.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {zone.type} • {zone.polygon.length} vertices
                  </p>
                </div>
              </div>

              <button
                onClick={() => onDeleteZone(zone.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition rounded"
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
