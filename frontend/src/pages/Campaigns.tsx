import React, { useState, useEffect } from 'react';
import {
  Send,
  Plus,
  Clock,
  Play,
  Pause,
  Trash2,
  Edit,
  ArrowDown,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  XCircle,
  Calendar,
  ShieldCheck,
  Moon,
  Sun,
  Filter,
  Search,
  ChevronRight,
  ExternalLink,
  Smartphone
} from 'lucide-react';
import {
  apiClient,
  TelegramAccount,
  SequentialFollowupQueueItem
} from '../api/client';

interface FollowupStepConfig {
  id?: string;
  step_number: number;
  timing_type: 'relative' | 'exact';
  delay_value: number;
  delay_unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  exact_time?: string;
  content: string;
  media_url?: string;
  media_type?: string;
}

interface FollowupCampaignData {
  id: string;
  name: string;
  telegram_account_id?: string | null;
  status: 'active' | 'paused' | 'draft' | 'completed';
  stop_on_reply: boolean;
  timezone: string;
  working_hours_enabled: boolean;
  working_hours_start?: string;
  working_hours_end?: string;
  working_days?: string[];
  steps?: FollowupStepConfig[];
  pending_queue_count?: number;
  sent_queue_count?: number;
  failed_queue_count?: number;
  cancelled_queue_count?: number;
  created_at?: string;
}

interface CampaignsProps {
  accounts: TelegramAccount[];
}

export const Campaigns: React.FC<CampaignsProps> = ({ accounts }) => {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'queue'>('campaigns');
  const [campaigns, setCampaigns] = useState<FollowupCampaignData[]>([]);
  const [queueItems, setQueueItems] = useState<SequentialFollowupQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueLoading, setQueueLoading] = useState(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  // Filter state for queue
  const [queueStatusFilter, setQueueStatusFilter] = useState('all');
  const [queueSearch, setQueueSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<FollowupCampaignData | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [status, setStatus] = useState<'active' | 'paused'>('active');
  const [stopOnReply, setStopOnReply] = useState(true);
  const [timezone, setTimezone] = useState('UTC');
  const [workingHoursEnabled, setWorkingHoursEnabled] = useState(false);
  const [workingHoursStart, setWorkingHoursStart] = useState('09:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('21:00');
  const [steps, setSteps] = useState<FollowupStepConfig[]>([
    {
      step_number: 1,
      timing_type: 'relative',
      delay_value: 10,
      delay_unit: 'minutes',
      content: 'Hi {{first_name}}, following up on our earlier chat! Did you have any questions?',
    },
    {
      step_number: 2,
      timing_type: 'relative',
      delay_value: 2,
      delay_unit: 'hours',
      content: 'Just wanted to share a quick video demo with you: https://example.com/demo',
    },
    {
      step_number: 3,
      timing_type: 'relative',
      delay_value: 1,
      delay_unit: 'days',
      content: 'Special promo expiring soon for {{first_name}}! Let me know if you want me to reserve your spot.',
    },
  ]);

  useEffect(() => {
    fetchCampaigns();
    if (activeTab === 'queue') {
      fetchQueue();
    }
  }, [activeTab]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/sequential-followups');
      const data = res.data?.data?.data || res.data?.data || res.data;
      if (Array.isArray(data)) {
        setCampaigns(data);
      }
    } catch (err) {
      console.error('Error fetching campaigns', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQueue = async () => {
    try {
      setQueueLoading(true);
      const params: any = {};
      if (queueStatusFilter !== 'all') params.status = queueStatusFilter;
      if (queueSearch.trim()) params.search = queueSearch.trim();

      const res = await apiClient.get('/sequential-followups/queue/items', { params });
      const data = res.data?.data?.data || res.data?.data || res.data;
      if (Array.isArray(data)) {
        setQueueItems(data);
      }
    } catch (err) {
      console.error('Error fetching queue items', err);
    } finally {
      setQueueLoading(false);
    }
  };

  const handleProcessQueueNow = async () => {
    try {
      setIsProcessingQueue(true);
      const res = await apiClient.post('/sequential-followups/queue/process-now');
      alert(res.data?.message || 'Queue processed successfully.');
      await fetchQueue();
      await fetchCampaigns();
    } catch (err) {
      console.error('Failed to process queue', err);
    } finally {
      setIsProcessingQueue(false);
    }
  };

  const handleRetryQueueItem = async (itemId: string) => {
    try {
      await apiClient.post(`/sequential-followups/queue/${itemId}/retry`);
      await fetchQueue();
    } catch (err) {
      console.error('Failed to retry queue item', err);
    }
  };

  const handleCancelQueueItem = async (itemId: string) => {
    try {
      await apiClient.post(`/sequential-followups/queue/${itemId}/cancel`);
      await fetchQueue();
    } catch (err) {
      console.error('Failed to cancel queue item', err);
    }
  };

  const openCreateModal = () => {
    setEditingCampaign(null);
    setName('');
    setAccountId('');
    setStatus('active');
    setStopOnReply(true);
    setTimezone('UTC');
    setWorkingHoursEnabled(false);
    setWorkingHoursStart('09:00');
    setWorkingHoursEnd('21:00');
    setSteps([
      {
        step_number: 1,
        timing_type: 'relative',
        delay_value: 15,
        delay_unit: 'minutes',
        content: 'Hi {{first_name}}, following up on our conversation!',
      },
      {
        step_number: 2,
        timing_type: 'relative',
        delay_value: 4,
        delay_unit: 'hours',
        content: 'Here are more details regarding what we discussed.',
      },
      {
        step_number: 3,
        timing_type: 'relative',
        delay_value: 1,
        delay_unit: 'days',
        content: 'Last call for our exclusive weekly discount, {{first_name}}!',
      },
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (camp: FollowupCampaignData) => {
    setEditingCampaign(camp);
    setName(camp.name);
    setAccountId(camp.telegram_account_id || '');
    setStatus(camp.status === 'active' ? 'active' : 'paused');
    setStopOnReply(camp.stop_on_reply);
    setTimezone(camp.timezone || 'UTC');
    setWorkingHoursEnabled(camp.working_hours_enabled);
    setWorkingHoursStart(camp.working_hours_start || '09:00');
    setWorkingHoursEnd(camp.working_hours_end || '21:00');
    if (camp.steps && camp.steps.length > 0) {
      setSteps(camp.steps.map((s, idx) => ({
        id: s.id,
        step_number: idx + 1,
        timing_type: s.timing_type || 'relative',
        delay_value: s.delay_value || 10,
        delay_unit: s.delay_unit || 'minutes',
        exact_time: s.exact_time,
        content: s.content || '',
        media_url: s.media_url,
      })));
    } else {
      setSteps([
        {
          step_number: 1,
          timing_type: 'relative',
          delay_value: 10,
          delay_unit: 'minutes',
          content: 'Follow-up step 1 content...',
        }
      ]);
    }
    setIsModalOpen(true);
  };

  const handleAddStep = () => {
    const nextNum = steps.length + 1;
    setSteps([
      ...steps,
      {
        step_number: nextNum,
        timing_type: 'relative',
        delay_value: 1,
        delay_unit: 'days',
        content: `Follow-up Step ${nextNum} content for {{first_name}}...`,
      },
    ]);
  };

  const handleRemoveStep = (idx: number) => {
    if (steps.length <= 1) return;
    const updated = steps.filter((_, i) => i !== idx).map((s, i) => ({
      ...s,
      step_number: i + 1,
    }));
    setSteps(updated);
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name,
      telegram_account_id: accountId || null,
      status,
      stop_on_reply: stopOnReply,
      timezone,
      working_hours_enabled: workingHoursEnabled,
      working_hours_start: workingHoursStart,
      working_hours_end: workingHoursEnd,
      steps: steps.map((s, idx) => ({
        ...s,
        step_number: idx + 1,
      })),
    };

    try {
      if (editingCampaign) {
        await apiClient.put(`/sequential-followups/${editingCampaign.id}`, payload);
      } else {
        await apiClient.post('/sequential-followups', payload);
      }
      setIsModalOpen(false);
      await fetchCampaigns();
    } catch (err) {
      console.error('Failed to save campaign', err);
    }
  };

  const handleToggleCampaign = async (campId: string) => {
    try {
      await apiClient.post(`/sequential-followups/${campId}/toggle`);
      await fetchCampaigns();
    } catch (err) {
      console.error('Failed to toggle campaign', err);
    }
  };

  const handleDeleteCampaign = async (campId: string) => {
    if (!window.confirm('Delete this sequential follow-up campaign?')) return;
    try {
      await apiClient.delete(`/sequential-followups/${campId}`);
      await fetchCampaigns();
    } catch (err) {
      console.error('Failed to delete campaign', err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl text-white shadow-sm shadow-purple-500/20">
              <Send className="w-5 h-5 -rotate-12" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Sequential Follow-Up Campaigns</h1>
              <p className="text-xs text-slate-500 font-medium">
                Time-driven timeline engine: Step 1 ➔ Step 2 ➔ Step 3 with automatic "Stop On Reply" & quiet hours
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'campaigns'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Active Campaigns
              </span>
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'queue'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Live Dispatch Queue
              </span>
            </button>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-purple-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>
      </div>

      {activeTab === 'campaigns' ? (
        /* Campaigns List View */
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
              <Send className="w-10 h-10 text-slate-300 mx-auto -rotate-12" />
              <h3 className="text-sm font-bold text-slate-700">No Follow-Up Campaigns Yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Create automated sequential drip campaigns to nurture leads over time with automatic cancellation when leads reply.
              </p>
              <button
                onClick={openCreateModal}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Create First Campaign
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">{camp.name}</h3>
                        <span className="text-[11px] text-slate-400">
                          {camp.steps?.length || 0} Sequential Steps
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          camp.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {camp.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Timeline Mini Flow */}
                    <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 space-y-2">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Timeline Sequence
                      </div>
                      <div className="space-y-1 text-xs">
                        {camp.steps?.slice(0, 3).map((st, sIdx) => (
                          <div key={sIdx} className="flex items-center gap-2 text-slate-600">
                            <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 font-bold text-[9px] flex items-center justify-center shrink-0">
                              {st.step_number}
                            </span>
                            <span className="truncate flex-1 font-mono text-[11px]">
                              {st.timing_type === 'exact'
                                ? `At ${st.exact_time}`
                                : `+${st.delay_value} ${st.delay_unit}`}
                            </span>
                          </div>
                        ))}
                        {(camp.steps?.length || 0) > 3 && (
                          <div className="text-[10px] text-purple-600 font-semibold pl-6">
                            +{(camp.steps?.length || 0) - 3} more steps
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Feature Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {camp.stop_on_reply && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                          <ShieldCheck className="w-3 h-3 text-indigo-500" />
                          Stop On Reply
                        </span>
                      )}
                      {camp.working_hours_enabled && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-100">
                          <Sun className="w-3 h-3 text-amber-500" />
                          {camp.working_hours_start}-{camp.working_hours_end}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        {camp.timezone || 'UTC'}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                      <div className="p-1.5 bg-slate-50 rounded-lg">
                        <div className="text-[10px] text-slate-400 font-medium">Pending</div>
                        <div className="text-xs font-bold text-indigo-600">{camp.pending_queue_count ?? 0}</div>
                      </div>
                      <div className="p-1.5 bg-slate-50 rounded-lg">
                        <div className="text-[10px] text-slate-400 font-medium">Sent</div>
                        <div className="text-xs font-bold text-emerald-600">{camp.sent_queue_count ?? 0}</div>
                      </div>
                      <div className="p-1.5 bg-slate-50 rounded-lg">
                        <div className="text-[10px] text-slate-400 font-medium">Cancelled</div>
                        <div className="text-xs font-bold text-slate-500">{camp.cancelled_queue_count ?? 0}</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
                    <button
                      onClick={() => handleToggleCampaign(camp.id)}
                      className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        camp.status === 'active'
                          ? 'text-amber-600 hover:bg-amber-50'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {camp.status === 'active' ? (
                        <>
                          <Pause className="w-3 h-3" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" /> Activate
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(camp)}
                        className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Edit Campaign"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(camp.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Live Dispatch Queue Tab */
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Sequential Follow-Up Dispatch Queue</h2>
              <p className="text-xs text-slate-500">
                Live inspection of scheduled messages, auto-cancellations upon reply, and retry mechanism
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleProcessQueueNow}
                disabled={isProcessingQueue}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isProcessingQueue ? 'animate-spin' : ''}`} />
                {isProcessingQueue ? 'Processing...' : 'Process Due Now'}
              </button>

              <button
                onClick={fetchQueue}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg border border-slate-200"
                title="Refresh Queue"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchQueue()}
                placeholder="Search by contact, username, or phone..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <select
              value={queueStatusFilter}
              onChange={(e) => setQueueStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="cancelled">Cancelled</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">Campaign / Step</th>
                  <th className="py-2.5 px-3">Scheduled At</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queueLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Loading queue...
                    </td>
                  </tr>
                ) : queueItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Queue is clear. No items found.
                    </td>
                  </tr>
                ) : (
                  queueItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">
                          {item.conversation?.telegramUser?.first_name || item.telegram_user_id}
                        </div>
                        {item.conversation?.telegramUser?.username && (
                          <div className="text-[11px] text-slate-400">
                            @{item.conversation.telegramUser.username}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">
                          {item.campaign?.name || 'Campaign'}
                        </div>
                        <div className="text-[11px] text-purple-600 font-medium">
                          Step #{item.step_order}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-mono text-slate-700">
                          {new Date(item.scheduled_at).toLocaleString()}
                        </div>
                        {item.sent_at && (
                          <div className="text-[10px] text-emerald-600">
                            Sent: {new Date(item.sent_at).toLocaleTimeString()}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            item.status === 'sent'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : item.status === 'pending'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : item.status === 'cancelled'
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {item.status.toUpperCase()}
                        </span>
                        {item.error_message && (
                          <div className="text-[10px] text-slate-500 max-w-xs truncate mt-0.5" title={item.error_message}>
                            {item.error_message}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right space-x-1">
                        {item.status === 'pending' && (
                          <button
                            onClick={() => handleCancelQueueItem(item.id)}
                            className="px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 rounded border border-rose-200"
                          >
                            Cancel
                          </button>
                        )}
                        {(item.status === 'failed' || item.status === 'cancelled') && (
                          <button
                            onClick={() => handleRetryQueueItem(item.id)}
                            className="px-2 py-1 text-[10px] font-bold text-purple-600 hover:bg-purple-50 rounded border border-purple-200"
                          >
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create or Edit Sequential Follow-Up Campaign */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full p-6 shadow-xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingCampaign ? 'Edit Sequential Follow-Up Campaign' : 'New Sequential Follow-Up Campaign'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="space-y-6">
              {/* Campaign Base Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Campaign Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. 7-Day Lead Nurture Funnel"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Telegram Account</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 bg-white"
                  >
                    <option value="">All Accounts (Global)</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.alias || acc.phone_masked}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Automation Rules: Stop On Reply & Working Hours */}
              <div className="p-4 bg-purple-50/40 rounded-xl border border-purple-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Stop Follow-Up When User Replies
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Instantly cancels remaining pending follow-up steps as soon as the contact responds
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={stopOnReply}
                    onChange={(e) => setStopOnReply(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-purple-100/60">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="UTC">UTC (Universal)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                      <option value="Asia/Dhaka">Asia/Dhaka (+06)</option>
                      <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-slate-700">
                        Working Hours Window
                      </span>
                      <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={workingHoursEnabled}
                          onChange={(e) => setWorkingHoursEnabled(e.target.checked)}
                          className="rounded border-slate-300 text-purple-600"
                        />
                        <span>Enable</span>
                      </label>
                    </div>
                    {workingHoursEnabled ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={workingHoursStart}
                          onChange={(e) => setWorkingHoursStart(e.target.value)}
                          className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white"
                        />
                        <span className="text-xs text-slate-400">to</span>
                        <input
                          type="time"
                          value={workingHoursEnd}
                          onChange={(e) => setWorkingHoursEnd(e.target.value)}
                          className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400">Sends 24/7 at scheduled delay times</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sequential Steps Builder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Sequential Steps (Strict Order N+1)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg"
                  >
                    <Plus className="w-3 h-3" /> Add Follow-Up
                  </button>
                </div>

                <div className="space-y-4">
                  {steps.map((st, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            Follow-Up {idx + 1}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveStep(idx)}
                            className="text-slate-400 hover:text-rose-600 text-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Timing Option: Relative vs Exact */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Timing Mode
                          </label>
                          <select
                            value={st.timing_type}
                            onChange={(e) => {
                              const updated = [...steps];
                              updated[idx].timing_type = e.target.value as any;
                              setSteps(updated);
                            }}
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white"
                          >
                            <option value="relative">Relative Delay</option>
                            <option value="exact">Exact Date & Time</option>
                          </select>
                        </div>

                        {st.timing_type === 'relative' ? (
                          <>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Wait Delay
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={st.delay_value}
                                onChange={(e) => {
                                  const updated = [...steps];
                                  updated[idx].delay_value = parseInt(e.target.value) || 1;
                                  setSteps(updated);
                                }}
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Delay Unit
                              </label>
                              <select
                                value={st.delay_unit}
                                onChange={(e) => {
                                  const updated = [...steps];
                                  updated[idx].delay_unit = e.target.value as any;
                                  setSteps(updated);
                                }}
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white"
                              >
                                <option value="seconds">Seconds</option>
                                <option value="minutes">Minutes</option>
                                <option value="hours">Hours</option>
                                <option value="days">Days</option>
                                <option value="weeks">Weeks</option>
                                <option value="months">Months</option>
                              </select>
                            </div>
                          </>
                        ) : (
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Target Date / Time
                            </label>
                            <input
                              type="datetime-local"
                              value={st.exact_time || ''}
                              onChange={(e) => {
                                const updated = [...steps];
                                updated[idx].exact_time = e.target.value;
                                setSteps(updated);
                              }}
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white"
                            />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Message Body (Supports {'{{first_name}}'}, {'{{username}}'})
                        </label>
                        <textarea
                          rows={2}
                          required
                          value={st.content}
                          onChange={(e) => {
                            const updated = [...steps];
                            updated[idx].content = e.target.value;
                            setSteps(updated);
                          }}
                          placeholder="Type follow-up message..."
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Save Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
