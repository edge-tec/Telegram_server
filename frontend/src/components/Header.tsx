import React from 'react';
import { TelegramAccount } from '../api/client';
import { Bell, RefreshCw, Smartphone, ChevronDown, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  accounts: TelegramAccount[];
  selectedAccountId: string;
  onSelectAccount: (id: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  accounts,
  selectedAccountId,
  onSelectAccount,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Account Switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
          <Smartphone className="w-4 h-4 text-blue-600" />
          <span className="text-xs text-slate-400 font-medium">Account:</span>
          <select
            value={selectedAccountId}
            onChange={(e) => onSelectAccount(e.target.value)}
            aria-label="Filter by active Telegram account"
            className="bg-transparent font-medium text-slate-800 text-sm focus:outline-none cursor-pointer pr-2"
          >
            <option value="">All Connected Accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.alias} ({acc.phone_masked || '@' + acc.username})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Real-time status */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Telethon MTProto Active</span>
        </div>

        {/* Notifications */}
        <button 
          aria-label="View notifications"
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full"></span>
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center shadow-xs">
            SA
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-semibold text-slate-800">Super Admin</div>
            <div className="text-[10px] text-slate-500">TeleFlow Admin</div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>
    </header>
  );
};
