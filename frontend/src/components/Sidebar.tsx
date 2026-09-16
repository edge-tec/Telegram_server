import React from 'react';
import {
  Zap,
  Shield,
  Send,
  FileText,
  FolderOpen,
  Tag,
  Calendar,
  BarChart3,
  History,
  Settings,
  Smartphone,
  MessageSquare,
  ShieldBan,
  Users,
  Radio,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  connectedCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, connectedCount }) => {
  // Telegram Automation Menu items
  const automationItems = [
    { id: 'auto_replies', label: 'Auto Reply', icon: Zap, badge: 'v3.0', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { id: 'admin_auto_replies', label: 'Admin Auto Reply', icon: Shield, badge: 'Admin', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200' },
    { id: 'campaigns', label: 'Follow-Up Campaigns', icon: Send },
    { id: 'templates', label: 'Message Templates', icon: FileText },
    { id: 'media', label: 'Media Library', icon: FolderOpen },
    { id: 'variables', label: 'Variables Manager', icon: Tag },
    { id: 'scheduler', label: 'Scheduler Calendar', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'logs', label: 'Logs & Timeline', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Core Management items
  const coreItems = [
    { id: 'accounts', label: 'Telegram Accounts', icon: Smartphone, badge: connectedCount > 0 ? `${connectedCount} Active` : undefined, badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 'inbox', label: 'Conversation CRM', icon: MessageSquare },
    { id: 'blacklist', label: 'Blacklist & Anti-Spam', icon: ShieldBan },
    { id: 'users', label: 'Team & Roles', icon: Users },
  ];

  return (
    <aside className="w-64 bg-white/95 backdrop-blur-md border-r border-slate-200/80 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
          <Send className="w-5 h-5 -rotate-12" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-bold text-slate-900 text-base leading-tight tracking-tight">TeleFlow</h1>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              v3.0
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">Enterprise Automation</p>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="p-3 space-y-6 flex-1 overflow-y-auto">
        {/* Telegram Automation Section */}
        <div>
          <div className="px-3 py-1 text-[11px] font-bold text-indigo-600/90 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span>Telegram Automation</span>
          </div>
          <div className="mt-1.5 space-y-1">
            {automationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-900 font-bold shadow-xs border border-indigo-100/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${item.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Platform & CRM Section */}
        <div>
          <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Platform & CRM
          </div>
          <div className="mt-1.5 space-y-1">
            {coreItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-900 font-bold shadow-xs border border-indigo-100/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${item.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer System Status */}
      <div className="p-4 border-t border-slate-100/80 bg-slate-50/50">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span className="flex items-center gap-1.5 font-medium">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            MTProto Bridge
          </span>
          <span className="font-bold text-emerald-600">Online</span>
        </div>
        <div className="text-[11px] text-slate-400">
          Personal Account Daemon v3.0
        </div>
      </div>
    </aside>
  );
};
