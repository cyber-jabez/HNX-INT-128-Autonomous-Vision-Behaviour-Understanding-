import React from 'react';
import {
  LayoutDashboard,
  PlaySquare,
  Clock,
  Activity,
  Network,
  HelpCircle,
  FileSearch,
  Crosshair,
  ShieldAlert,
  Sliders,
  ChevronRight
} from 'lucide-react';
import { ChronoLogo } from './ChronoLogo';

export type NavTab =
  | 'overview'
  | 'analyze'
  | 'timeline'
  | 'behaviour'
  | 'graph'
  | 'ask-ai'
  | 'evidence'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  analyzedVideoCount?: number;
  eventsCount?: number;
  hasWeaponDetected?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  analyzedVideoCount = 3,
  eventsCount = 5,
  hasWeaponDetected = false,
}) => {
  const primaryNav = [
    { id: 'overview' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analyze' as NavTab, label: 'Video Analysis', icon: PlaySquare, badge: 'Live' },
    { id: 'timeline' as NavTab, label: 'Incident Timeline', icon: Clock },
    { id: 'behaviour' as NavTab, label: 'Behaviour Tracks', icon: Activity },
    { id: 'graph' as NavTab, label: 'Temporal Graph', icon: Network },
    { id: 'ask-ai' as NavTab, label: 'Ask AI Agent', icon: HelpCircle, badge: 'Smart' },
    { id: 'evidence' as NavTab, label: 'Evidence Clips', icon: FileSearch },
  ];

  return (
    <aside className="w-[240px] shrink-0 bg-[#FFFFFF] border-r border-[#EDEDEA] flex flex-col justify-between select-none">
      {/* Brand Header */}
      <div>
        <div className="p-4 border-b border-[#EDEDEA] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0F172A] flex items-center justify-center text-white shadow-xs">
            <ChronoLogo size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-[#111827] tracking-tight leading-none">
              ChronoVision
            </h1>
            <p className="text-[11px] text-[#6B7280] font-medium truncate mt-1">
              Autonomous Intelligence
            </p>
          </div>
        </div>

        {/* Threat Alert Status Widget */}
        <div className="p-3">
          <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#EDEDEA] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${hasWeaponDetected ? 'bg-[#EF4444] animate-ping' : 'bg-[#10B981]'}`} />
              <span className="text-[11px] font-semibold text-[#111827]">
                {hasWeaponDetected ? 'Weapon Alert' : 'System Secure'}
              </span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-[#6B7280] border border-[#EDEDEA]">
              v2.4
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <div className="px-3 py-1 flex flex-col gap-1">
          <div className="px-2.5 py-1 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
            Surveillance Hub
          </div>

          {primaryNav.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#EEF2FF] text-[#4338CA] font-semibold shadow-xs'
                    : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F8F9FA]'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#4F46E5]' : 'text-[#6B7280]'
                    }`}
                    strokeWidth={isActive ? 2.2 : 1.75}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      isActive
                        ? 'bg-[#E0E7FF] text-[#4338CA]'
                        : 'bg-[#F3F4F6] text-[#6B7280]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer System Telemetry */}
      <div className="p-3 border-t border-[#EDEDEA]">
        <div className="p-3 rounded-xl bg-[#FBFBFA] border border-[#EDEDEA] space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#6B7280]">Indexed Feeds</span>
            <span className="font-semibold text-[#111827]">{analyzedVideoCount}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#6B7280]">Active Events</span>
            <span className="font-semibold text-[#111827]">{eventsCount}</span>
          </div>
          <div className="h-1 bg-[#E5E7EB] rounded-full overflow-hidden">
            <div className="w-4/5 h-full bg-[#10B981] rounded-full" />
          </div>
        </div>
      </div>
    </aside>
  );
};
