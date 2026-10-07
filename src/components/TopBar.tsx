import React from 'react';
import { Film, CheckCircle2, Clock, Upload, Video } from 'lucide-react';
import { VideoMetadata } from '../types';

interface TopBarProps {
  videos: VideoMetadata[];
  selectedVideo: VideoMetadata | null;
  onSelectVideo: (video: VideoMetadata) => void;
  onOpenUpload: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  videos,
  selectedVideo,
  onSelectVideo,
  onOpenUpload,
}) => {
  return (
    <div className="bg-[#111726] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Brand Title */}
      <div className="flex items-center space-x-3 w-full md:w-auto">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
          <Film className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold text-white tracking-tight">
              Autonomous Vision & Behaviour Understanding System
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              v1.0-LIVE
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time Object Tracking • Behaviour Classification • Anomaly & Zone Threat Analysis
          </p>
        </div>
      </div>

      {/* Action: Video Dropdown selector + Upload Video Button */}
      <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
        {/* Video Selector */}
        <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs">
          <Video className="w-4 h-4 text-cyan-400 shrink-0" />
          <select
            value={selectedVideo?.id || ''}
            onChange={(e) => {
              const vid = videos.find((v) => v.id === e.target.value);
              if (vid) onSelectVideo(vid);
            }}
            className="bg-transparent text-slate-200 outline-none cursor-pointer max-w-[200px] truncate"
          >
            {videos.length === 0 ? (
              <option value="" disabled className="bg-slate-900 text-slate-500">
                No videos available
              </option>
            ) : (
              videos.map((vid) => (
                <option key={vid.id} value={vid.id} className="bg-slate-900 text-white">
                  {vid.title}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Upload Button */}
        <button
          onClick={onOpenUpload}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/25 transition active:scale-95 shrink-0"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Video</span>
        </button>
      </div>
    </div>
  );
};
