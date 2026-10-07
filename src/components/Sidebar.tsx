import React from 'react';
import {
  LayoutDashboard,
  PlaySquare,
  Clock,
  Activity,
  Network,
  HelpCircle,
  FileSearch,
  Settings,
  Sparkles,
  ShieldCheck,
  Film
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
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  analyzedVideoCount = 2,
  eventsCount = 5,
}) => {
  const mainNav = [
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'analyze' as NavTab, label: 'Video Analysis', icon: PlaySquare, badge: 'Live' },
    { id: 'timeline' as NavTab, label: 'Timeline', icon: Clock },
    { id: 'behaviour' as NavTab, label: 'Behaviour', icon: Activity },
    { id: 'graph' as NavTab, label: 'Temporal Graph', icon: Network },
    { id: 'ask-ai' as NavTab, label: 'Ask AI', icon: HelpCircle, badge: 'Smart' },
    { id: 'evidence' as NavTab, label: 'Evidence', icon: FileSearch },
  ];

  return (
    <aside className="w-[230px] shrink-0 bg-[#FFFFFF] border-r border-[#E8E9E6] flex flex-col justify-between select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#E8E9E6]">
        <div className="flex items-center gap-3">
          <ChronoLogo size={32} />
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-[#1F2937] tracking-tight leading-none">
              ChronoVision
            </h1>
            <p className="text-[11px] text-[#6B7280] font-normal truncate mt-1">
              Temporal Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <div className="p-3 flex-1 flex flex-col gap-1 overflow-y-auto">
        <div className="px-2.5 py-1.5 text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider">
          Workspace
        </div>

        {mainNav.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-[#F3F1FF] text-[#1F2937] font-semibold shadow-xs'
                  : 'text-[#4B5563] hover:text-[#1F2937] hover:bg-[#F8F9F7]'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-[#6C5CE7]' : 'text-[#6B7280]'
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.75}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    isActive
                      ? 'bg-[#FFFFFF] text-[#4C3CB8] border border-[#E1DCFF]'
                      : 'bg-[#F4F5F2] text-[#6B7280]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="my-2 border-t border-[#E8E9E6]" />

        {/* Quick Diagnostics Indicator */}
        <div className="p-3 bg-[#FAFAF8] border border-[#E8E9E6] rounded-xl text-[11px] space-y-1.5">
          <div className="flex items-center justify-between text-[#6B7280]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              Engine Status
            </span>
            <span className="font-mono text-[#1F2937] text-[10px] font-semibold">Online</span>
          </div>
          <div className="text-[10px] text-[#9CA3AF] flex items-center justify-between">
            <span>Active Events</span>
            <span className="font-mono text-[#4B5563] font-semibold">{eventsCount} recorded</span>
          </div>
        </div>
      </div>

      {/* Footer Settings & User */}
      <div className="p-3 border-t border-[#E8E9E6] flex flex-col gap-1">
        <button
          onClick={() => onTabChange('settings')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
            currentTab === 'settings'
              ? 'bg-[#F3F1FF] text-[#1F2937] font-semibold'
              : 'text-[#4B5563] hover:text-[#1F2937] hover:bg-[#F8F9F7]'
          }`}
        >
          <Settings className="w-4 h-4 text-[#6B7280]" strokeWidth={1.75} />
          <span>System Settings</span>
        </button>

        <div className="mt-2 pt-2 border-t border-[#F0F1EE] flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#C9C2FF] text-[#4C3CB8] font-bold text-[10px] flex items-center justify-center">
              CV
            </div>
            <div className="leading-tight">
              <p className="text-[11px] font-medium text-[#1F2937]">Operator 01</p>
              <p className="text-[9px] text-[#9CA3AF]">AI Researcher</p>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-[#BFE8D0]" title="Connected" />
        </div>
      </div>
    </aside>
  );
};
