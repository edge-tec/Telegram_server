import React, { useState, useEffect } from 'react';
import { FollowupCampaign, ReplyTemplate, TelegramAccount, apiClient } from '../api/client';
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
  X
} from 'lucide-react';

interface CampaignsProps {
  accounts: TelegramAccount[];
}

export const Campaigns: React.FC<CampaignsProps> = ({ accounts }) => {
  const [campaigns, setCampaigns] = useState<FollowupCampaign[]>([]);
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [onReplyAction, setOnReplyAction] = useState<'stop' | 'continue' | 'restart' | 'pause'>('stop');
  const [status, setStatus] = useState<'active' | 'paused'>('active');

  // Steps
  const [steps, setSteps] = useState<{ delayValue: number; delayUnit: 'seconds' | 'minutes' | 'hours' | 'days'; template_id: string }[]>([
    { delayValue: 0, delayUnit: 'seconds', template_id: '' },
    { delayValue: 30, delayUnit: 'minutes', template_id: '' },
    { delayValue: 6, delayUnit: 'hours', template_id: '' },
    { delayValue: 1, delayUnit: 'days', template_id: '' },
  ]);

  useEffect(() => {
    fetchCampaigns();
    fetchTemplates();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/campaigns');
      setCampaigns(res.data);
    } catch (err) {
      console.error('Error fetching campaigns', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await apiClient.get('/templates');
      setTemplates(res.data);
    } catch (err) {
      console.error('Error fetching templates', err);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setAccountId('');
    setOnReplyAction('stop');
    setStatus('active');
    setSteps([
      { delayValue: 0, delayUnit: 'seconds', template_id: templates[0]?.id || '' },
      { delayValue: 30, delayUnit: 'minutes', template_id: templates[1]?.id || '' },
      { delayValue: 6, delayUnit: 'hours', template_id: templates[2]?.id || '' },
      { delayValue: 1, delayUnit: 'days', template_id: templates[3]?.id || '' },
    ]);
    setIsModalOpen(true);
  };

  const addStep = () => {
    setSteps([...steps, { delayValue: 1, delayUnit: 'days', template_id: templates[0]?.id || '' }]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: string, value: any) => {
    const updated = [...steps];
    (updated[index] as any)[field] = value;
    setSteps(updated);
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    const formattedSteps = steps.map((s) => {
      let sec = s.delayValue;
      if (s.delayUnit === 'minutes') sec *= 60;
      else if (s.delayUnit === 'hours') sec *= 3600;
      else if (s.delayUnit === 'days') sec *= 86400;

      return {
        delay_seconds: sec,
        template_id: s.template_id,
      };
    });

    const payload = {
      name,
      description,
      account_id: accountId || null,
      status,
      on_reply_action: onReplyAction,
      steps: formattedSteps,
    };

    try {
      if (editingId) {
        await apiClient.put(`/campaigns/${editingId}`, payload);
      } else {
        await apiClient.post('/campaigns', payload);
      }
      setIsModalOpen(false);
      fetchCampaigns();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save campaign');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await apiClient.post(`/campaigns/${id}/toggle`);
      fetchCampaigns();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, cName: string) => {
    if (!confirm(`Delete campaign "${cName}"?`)) return;
    try {
      await apiClient.delete(`/campaigns/${id}`);
      fetchCampaigns();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Multi-Step Follow-up Campaigns</h2>
          <p className="text-sm text-slate-500 mt-1">
            Automate step-by-step lead nurture drip sequences with delay timers and reply triggers.
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary text-sm shadow-md shadow-blue-500/10">
          <Plus className="w-4 h-4" /> Build Follow-up Campaign
        </button>
      </div>

      {/* Campaigns List */}
      <div className="space-y-6">
        {campaigns.map((camp) => (
          <div key={camp.id} className="card p-6 hover:shadow-hover transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  <Send className="w-5 h-5 -rotate-12" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">{camp.name}</h3>
                    <span className={`badge text-xs ${
                      camp.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {camp.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{camp.description || 'No description'}</p>
                </div>
              </div>

              {/* Behavior & Stats */}
              <div className="flex items-center gap-4 text-xs">
                <div className="text-right">
                  <div className="text-slate-400">On User Reply:</div>
                  <span className="font-semibold text-blue-600 uppercase tracking-wider">{camp.on_reply_action}</span>
                </div>
                <div className="text-right pl-4 border-l border-slate-200">
                  <div className="text-slate-400">Active Contacts:</div>
                  <span className="font-bold text-slate-900">{camp.active_users}</span> / {camp.total_users}
                </div>
                <div className="flex items-center gap-1.5 pl-4 border-l border-slate-200">
                  <button
                    onClick={() => handleToggle(camp.id)}
                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title={camp.status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}
                  >
                    {camp.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(camp.id, camp.name)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Campaign"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Visual Step Sequencer */}
            <div className="pt-6">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                Sequential Steps Timeline ({camp.steps?.length || 0} Steps)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 relative">
                {camp.steps?.map((step, idx) => {
                  const delayDesc =
                    step.delay_seconds === 0
                      ? 'Instant Send'
                      : step.delay_seconds >= 86400
                      ? `${step.delay_seconds / 86400} Day(s) Delay`
                      : step.delay_seconds >= 3600
                      ? `${step.delay_seconds / 3600} Hour(s) Delay`
                      : `${step.delay_seconds / 60} Min(s) Delay`;

                  return (
                    <div
                      key={step.id || idx}
                      className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl relative hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-bold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded">
                          Step {step.step_order}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {delayDesc}
                        </span>
                      </div>
                      <h4 className="font-semibold text-slate-900 text-xs truncate">
                        {step.template?.name || 'Assigned Template'}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                        {step.template?.message_body || 'Message content...'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Build Campaign Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                Build Multi-Step Follow-up Campaign
              </h3>
              <button onClick={() => setIsModalOpen(false)} aria-label="Close dialog" className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Campaign Name</label>
                <input
                  type="text"
                  placeholder="e.g. 5-Step New Lead Nurturing Campaign"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Telegram Account</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="input-field"
                  >
                    <option value="">All Accounts (Global Default)</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.alias} ({a.phone_masked})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">On Contact Reply Action</label>
                  <select
                    value={onReplyAction}
                    onChange={(e) => setOnReplyAction(e.target.value as any)}
                    className="input-field"
                  >
                    <option value="stop">Stop Sequence (Recommended)</option>
                    <option value="continue">Continue Even After Reply</option>
                    <option value="restart">Restart Sequence</option>
                    <option value="pause">Pause Campaign</option>
                  </select>
                </div>
              </div>

              {/* Steps Sequencer */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700">Follow-up Step Sequence</label>
                  <button
                    type="button"
                    onClick={addStep}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Step
                  </button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {steps.map((s, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>

                      <div className="w-24 shrink-0">
                        <input
                          type="number"
                          min="0"
                          value={s.delayValue}
                          onChange={(e) => updateStep(idx, 'delayValue', parseInt(e.target.value, 10) || 0)}
                          className="input-field py-1"
                          placeholder="Delay"
                        />
                      </div>

                      <div className="w-28 shrink-0">
                        <select
                          value={s.delayUnit}
                          onChange={(e) => updateStep(idx, 'delayUnit', e.target.value)}
                          className="input-field py-1"
                        >
                          <option value="seconds">Seconds</option>
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                        </select>
                      </div>

                      <div className="flex-1">
                        <select
                          value={s.template_id}
                          onChange={(e) => updateStep(idx, 'template_id', e.target.value)}
                          required
                          className="input-field py-1"
                        >
                          <option value="">-- Select Reply Template --</option>
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.reply_type})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeStep(idx)}
                        disabled={steps.length <= 1}
                        className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
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
