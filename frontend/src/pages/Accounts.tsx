import React, { useState } from 'react';
import { TelegramAccount, apiClient } from '../api/client';
import { OtpModal } from '../components/OtpModal';
import {
  Smartphone,
  Plus,
  Play,
  Square,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  MessageSquare,
  Layers
} from 'lucide-react';

interface AccountsProps {
  accounts: TelegramAccount[];
  onRefresh: () => void;
}

export const Accounts: React.FC<AccountsProps> = ({ accounts, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggleListener = async (id: string) => {
    try {
      setLoadingId(id);
      await apiClient.post(`/accounts/${id}/toggle-listener`);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to toggle account listener');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string, alias: string) => {
    if (!confirm(`Are you sure you want to remove account "${alias}"? This will terminate its background listener.`)) {
      return;
    }

    try {
      setLoadingId(id);
      await apiClient.delete(`/accounts/${id}`);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete account');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Telegram MTProto Accounts</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage your personal Telegram accounts. Sessions are encrypted with AES-256-GCM and listened to via Telethon daemon.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary text-sm shadow-md shadow-blue-500/10"
        >
          <Plus className="w-4 h-4" />
          Connect New Account
        </button>
      </div>

      {/* Account Cards */}
      {accounts.length === 0 ? (
        <div className="card p-12 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">No Telegram Accounts Connected</h3>
          <p className="text-xs text-slate-500 mt-1 mb-6 leading-relaxed">
            Connect your personal Telegram account with your Phone Number and API ID/Hash to begin listening for inbound messages and sending auto-responses.
          </p>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary text-xs mx-auto">
            <Plus className="w-4 h-4" /> Connect Your First Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((acc) => {
            const isConnected = acc.status === 'connected';
            const isExpired = acc.status === 'expired';

            return (
              <div key={acc.id} className="card p-6 flex flex-col justify-between hover:shadow-hover transition-all">
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                        {acc.first_name ? acc.first_name[0].toUpperCase() : 'TG'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{acc.alias}</h4>
                        <p className="text-xs text-slate-400 font-medium">{acc.phone_masked || 'No phone'}</p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {isConnected ? (
                      <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Listening
                      </span>
                    ) : isExpired ? (
                      <span className="badge bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertCircle className="w-3 h-3" /> Expired
                      </span>
                    ) : (
                      <span className="badge bg-slate-100 text-slate-600 border border-slate-200">
                        <XCircle className="w-3 h-3" /> Inactive
                      </span>
                    )}
                  </div>

                  {/* Account Metadata */}
                  <div className="space-y-2 py-3 border-y border-slate-100 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Username:</span>
                      <span className="font-semibold text-slate-800">{acc.username ? `@${acc.username}` : 'None'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Active Inquiries:</span>
                      <span className="font-semibold text-slate-800">{acc.conversations_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Campaigns Linked:</span>
                      <span className="font-semibold text-slate-800">{acc.campaigns_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Security:</span>
                      <span className="font-semibold text-emerald-600 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> AES-256-GCM Encrypted
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 flex items-center justify-between gap-2 mt-2">
                  <button
                    onClick={() => handleToggleListener(acc.id)}
                    disabled={loadingId === acc.id}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium border flex items-center gap-1.5 transition-colors ${
                      isConnected
                        ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    {loadingId === acc.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : isConnected ? (
                      <>
                        <Square className="w-3.5 h-3.5" /> Stop Listener
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" /> Start Listener
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDelete(acc.id, acc.alias)}
                    disabled={loadingId === acc.id}
                    title="Remove Account"
                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* OTP Add Account Modal */}
      <OtpModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={onRefresh}
      />
    </div>
  );
};
