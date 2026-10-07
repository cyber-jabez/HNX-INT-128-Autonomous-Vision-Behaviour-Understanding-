import React from 'react';
import { Video, Upload, Bell, Shield, ChevronDown, Sparkles } from 'lucide-react';
import { VideoMetadata } from '../types';

interface HeaderProps {
  videos: VideoMetadata[];
  selectedVideo: VideoMetadata | null;
  onSelectVideo: (video: VideoMetadata) => void;
  onOpenUpload: () => void;
  activeTabTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  videos,
  selectedVideo,
  onSelectVideo,
  onOpenUpload,
  activeTabTitle,
}) => {
  return (
    <header className="h-14 bg-[#FFFFFF] border-b border-[#E8E9E6] px-6 flex items-center justify-between shrink-0">
      {/* Left: Breadcrumb / Active Context */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-[#1F2937] tracking-tight">
          {activeTabTitle || 'Video Analysis'}
        </span>
        <span className="text-[#D1D5DB] text-xs">/</span>
        <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#BFE8D0]" />
          <span className="font-mono text-[11px] text-[#4B5563] truncate max-w-[220px]">
            {selectedVideo ? selectedVideo.title : 'No active stream'}
          </span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Stream Selector */}
        <div className="flex items-center gap-2 bg-[#F4F5F2] border border-[#E8E9E6] rounded-xl px-2.5 py-1.5 text-xs">
          <Video className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
          <select
            value={selectedVideo?.id || ''}
            onChange={(e) => {
              const vid = videos.find((v) => v.id === e.target.value);
              if (vid) onSelectVideo(vid);
            }}
            className="bg-transparent text-[#1F2937] text-xs font-medium outline-none cursor-pointer max-w-[190px] truncate"
          >
            {videos.map((vid) => (
              <option key={vid.id} value={vid.id} className="bg-white text-[#1F2937]">
                {vid.title}
              </option>
            ))}
          </select>
        </div>

        {/* Upload Button */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-[#1F2937] hover:bg-[#111827] text-white text-xs font-medium rounded-xl transition shadow-xs active:scale-98"
        >
          <Upload className="w-3.5 h-3.5 text-[#C9C2FF]" />
          <span>Upload Video</span>
        </button>

        {/* System Ready Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#F0FAF4] border border-[#D1F0DE] rounded-lg text-[11px] text-[#1B663E] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          <span>System Ready</span>
        </div>
      </div>
    </header>
  );
};
