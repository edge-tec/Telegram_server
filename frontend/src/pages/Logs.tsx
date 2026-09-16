import React, { useState, useEffect } from 'react';
import { ScheduledMessageItem, apiClient } from '../api/client';
import {
  Activity,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  RefreshCw
} from 'lucide-react';

export const Logs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'queue' | 'activity' | 'messages'>('queue');
  const [scheduledList, setScheduledList] = useState<ScheduledMessageItem[]>([]);
  const [activityList, setActivityList] = useState<any[]>([]);
  const [messageLogs, setMessageLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [activeTab]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      if (activeTab === 'queue') {
        const res = await apiClient.get('/logs/scheduled');
        setScheduledList(res.data.data || []);
      } else if (activeTab === 'activity') {
        const res = await apiClient.get('/logs/activity');
        setActivityList(res.data.data || []);
      } else if (activeTab === 'messages') {
        const res = await apiClient.get('/logs/messages');
        setMessageLogs(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching logs', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (id: string) => {
    try {
      setRetryingId(id);
      await apiClient.post(`/logs/scheduled/${id}/retry`);
      fetchLogs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to retry message send');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System Logs & Queue Engine</h2>
          <p className="text-sm text-slate-500 mt-1">
            Monitor background Redis queues, scheduled message dispatch status, and audit trails.
          </p>
        </div>
        <button onClick={fetchLogs} className="btn-secondary text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Live Queue
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'queue', label: 'Scheduled Follow-up Queue' },
          { id: 'activity', label: 'Security & Activity Logs' },
          { id: 'messages', label: 'Inbound / Outbound Audit' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === t.id
                ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 1. Scheduled Queue Table */}
      {activeTab === 'queue' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Recipient Contact</th>
                  <th className="px-6 py-3.5 font-semibold">Campaign Step</th>
                  <th className="px-6 py-3.5 font-semibold">Scheduled Target Time</th>
                  <th className="px-6 py-3.5 font-semibold">Queue Status</th>
                  <th className="px-6 py-3.5 font-semibold">Retries</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scheduledList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                      No scheduled messages pending in the queue.
                    </td>
                  </tr>
                ) : (
                  scheduledList.map((item) => {
                    const u = item.conversation?.telegram_user;
                    const name = u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || `@${u.username}` : 'User';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          {name} <span className="text-[11px] text-slate-400 font-mono">({u?.telegram_id})</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">{item.template?.name || 'Auto-Reply'}</div>
                          <div className="text-[10px] text-slate-400">Step {item.step_id ? 'in Campaign' : 'Single'}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">
                          {new Date(item.scheduled_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`badge ${
                            item.status === 'sent' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            item.status === 'processing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            item.status === 'failed' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            item.status === 'cancelled' ? 'bg-slate-100 text-slate-500' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-600">
                          {item.retry_count} / 3
                        </td>
                        <td className="px-6 py-4 text-right">
                          {item.status === 'failed' && (
                            <button
                              onClick={() => handleRetry(item.id)}
                              disabled={retryingId === item.id}
                              className="btn-secondary text-xs px-2.5 py-1"
                              title="Retry Dispatch"
                            >
                              <RotateCcw className={`w-3.5 h-3.5 ${retryingId === item.id ? 'animate-spin' : ''}`} />
                              Retry Now
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Activity Logs Table */}
      {activeTab === 'activity' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Action</th>
                  <th className="px-6 py-3.5 font-semibold">Description</th>
                  <th className="px-6 py-3.5 font-semibold">User Agent / Initiator</th>
                  <th className="px-6 py-3.5 font-semibold">IP Address</th>
                  <th className="px-6 py-3.5 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activityList.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-blue-600 uppercase tracking-wider text-[10px]">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 text-slate-800 font-medium">{log.description}</td>
                    <td className="px-6 py-4 text-slate-500">{log.user?.email || 'System'}</td>
                    <td className="px-6 py-4 font-mono text-slate-400">{log.ip_address || '127.0.0.1'}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Messages Audit Table */}
      {activeTab === 'messages' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Event Type</th>
                  <th className="px-6 py-3.5 font-semibold">Telegram Account</th>
                  <th className="px-6 py-3.5 font-semibold">Execution Status</th>
                  <th className="px-6 py-3.5 font-semibold">Payload Data</th>
                  <th className="px-6 py-3.5 font-semibold">Recorded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {messageLogs.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{m.event_type}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{m.account?.alias || 'Global'}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${m.status === 'success' || m.status === 'processed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-slate-500 max-w-xs truncate">
                      {JSON.stringify(m.payload)}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{new Date(m.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
