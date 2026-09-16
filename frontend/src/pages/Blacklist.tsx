import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import {
  ShieldBan,
  Plus,
  Trash2,
  AlertTriangle,
  UserX,
  X,
  ShieldCheck
} from 'lucide-react';

export const Blacklist: React.FC = () => {
  const [blacklist, setBlacklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [telegramId, setTelegramId] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchBlacklist();
  }, []);

  const fetchBlacklist = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/blacklist');
      setBlacklist(res.data);
    } catch (err) {
      console.error('Error fetching blacklist', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/blacklist', {
        telegram_id: parseInt(telegramId.trim(), 10),
        reason: reason.trim() || 'Manual Admin Restriction',
      });
      setIsModalOpen(false);
      setTelegramId('');
      setReason('');
      fetchBlacklist();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add user to blacklist');
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this user from blacklist and re-enable automated responses?')) return;
    try {
      await apiClient.delete(`/blacklist/${id}`);
      fetchBlacklist();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Blacklist & Stop Automation</h2>
          <p className="text-sm text-slate-500 mt-1">
            Users who send STOP, CANCEL, or UNSUBSCRIBE are automatically blocked from follow-ups and logged here.
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-danger text-sm shadow-xs">
          <Plus className="w-4 h-4" /> Add Manual Blacklist
        </button>
      </div>

      {/* Info Card */}
      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 leading-relaxed">
          <strong>Automated Safety Rule:</strong> When any Telegram user responds with keywords like <code>STOP</code>, <code>CANCEL</code>, or <code>UNSUBSCRIBE</code>, the system automatically cancels all active follow-up steps and halts future automated messaging to comply with anti-spam standards.
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Telegram User</th>
                <th className="px-6 py-3.5 font-semibold">Telegram ID</th>
                <th className="px-6 py-3.5 font-semibold">Restriction Reason</th>
                <th className="px-6 py-3.5 font-semibold">Initiated By</th>
                <th className="px-6 py-3.5 font-semibold">Date Blocked</th>
                <th className="px-6 py-3.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {blacklist.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    No blacklisted users found. All channels are running smoothly.
                  </td>
                </tr>
              ) : (
                blacklist.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {entry.telegram_user?.first_name} {entry.telegram_user?.last_name}{' '}
                      <span className="text-slate-400 font-normal">
                        {entry.telegram_user?.username ? `(@${entry.telegram_user.username})` : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">{entry.telegram_user?.telegram_id}</td>
                    <td className="px-6 py-4">
                      <span className="badge bg-rose-50 text-rose-700 border border-rose-200">
                        {entry.reason}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{entry.creator?.name || 'Automated System Trigger'}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(entry.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRemove(entry.id)}
                        className="btn-secondary text-xs px-2.5 py-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        title="Unblacklist"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Unblock
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Add User to Blacklist</h3>
              <button onClick={() => setIsModalOpen(false)} aria-label="Close dialog" className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBlacklist} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Telegram Numeric ID</label>
                <input
                  type="number"
                  placeholder="e.g. 99120381"
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value)}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Blacklisting</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Requested no further communications or spam behavior"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  className="input-field"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-danger text-xs">
                  Confirm Blacklist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
