import React from 'react';
import {
  Video,
  Upload,
  ShieldCheck,
  Flame,
  Radio,
  Search,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { VideoMetadata } from '../types';

interface HeaderProps {
  videos: VideoMetadata[];
  selectedVideo: VideoMetadata | null;
  onSelectVideo: (video: VideoMetadata) => void;
  onOpenUpload: () => void;
  activeTabTitle?: string;
  hasWeaponDetected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  videos,
  selectedVideo,
  onSelectVideo,
  onOpenUpload,
  activeTabTitle,
  hasWeaponDetected = false,
}) => {
  return (
    <header className="h-14 bg-[#FFFFFF] border-b border-[#EDEDEA] px-6 flex items-center justify-between shrink-0 select-none">
      {/* Left: Section Path & Current Feed */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-[#111827]">
          {activeTabTitle || 'Video Analysis'}
        </span>
        <span className="text-[#D1D5DB] text-xs">/</span>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
          <span className="font-mono text-[11px] text-[#4B5563] truncate max-w-[240px]">
            {selectedVideo ? selectedVideo.title : 'No active feed'}
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Weapon Threat Alert Indicator */}
        {hasWeaponDetected && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FFF1F2] border border-[#FEE2E2] rounded-xl text-[11px] text-[#BE123C] font-semibold animate-pulse">
            <Flame className="w-3.5 h-3.5 text-[#E11D48]" />
            <span>Weapon Detected</span>
          </div>
        )}

        {/* Video Selector Dropdown */}
        <div className="flex items-center gap-2 bg-[#F8F9FA] border border-[#EDEDEA] rounded-xl px-3 py-1.5 text-xs hover:border-[#D1D2CC] transition">
          <Video className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
          <select
            value={selectedVideo?.id || ''}
            onChange={(e) => {
              const vid = videos.find((v) => v.id === e.target.value);
              if (vid) onSelectVideo(vid);
            }}
            className="bg-transparent text-[#111827] text-xs font-medium outline-none cursor-pointer max-w-[200px] truncate"
          >
            {videos.map((vid) => (
              <option key={vid.id} value={vid.id} className="bg-white text-[#111827]">
                {vid.title}
              </option>
            ))}
          </select>
        </div>

        {/* Upload Feed Action */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-[#111827] hover:bg-[#000000] text-white text-xs font-semibold rounded-xl transition shadow-xs active:scale-95"
        >
          <Upload className="w-3.5 h-3.5 text-[#A5B4FC]" />
          <span>Upload Stream</span>
        </button>

        {/* Status Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#ECFDF5] border border-[#D1FAE5] rounded-xl text-[11px] text-[#047857] font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
          <span>Surveillance Online</span>
        </div>
      </div>
    </header>
  );
};
