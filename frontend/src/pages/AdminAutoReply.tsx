import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Play,
  Pause,
  Trash2,
  Copy,
  Edit,
  ChevronUp,
  ChevronDown,
  Clock,
  Layers,
  CheckCircle2,
  Lock,
  Unlock,
  Sparkles,
  Smartphone,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import {
  apiClient,
  TelegramAccount,
  AdminAutoReply,
  AdminAutoReplyStepItem
} from '../api/client';
import { TelegramMessageComposer, ComposerValue } from '../components/TelegramMessageComposer';

interface AdminAutoReplyProps {
  accounts: TelegramAccount[];
}

export const AdminAutoReplyPage: React.FC<AdminAutoReplyProps> = ({ accounts }) => {
  const [replies, setReplies] = useState<AdminAutoReply[]>([]);
  const [selectedReply, setSelectedReply] = useState<AdminAutoReply | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'sequences' | 'simulator'>('sequences');

  // Modal / Form state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formAccount, setFormAccount] = useState('');
  const [formPriority, setFormPriority] = useState(10);
  const [formIsGlobal, setFormIsGlobal] = useState(true);
  const [formForceAutoReply, setFormForceAutoReply] = useState(false);
  const [formVisibility, setFormVisibility] = useState<'admin_only' | 'all_users' | 'selected_users' | 'selected_plans'>('all_users');

  // Active step in sequence editor
  const [editingStepIdx, setEditingStepIdx] = useState<number>(0);

  // Simulator
  const [simHistory, setSimHistory] = useState<Array<{ sender: 'traffic' | 'bot'; text: string; step?: number; time: string }>>([]);
  const [simInput, setSimInput] = useState('Hi, I need pricing information!');
  const [simStepNum, setSimStepNum] = useState(0);

  useEffect(() => {
    fetchAdminReplies();
  }, []);

  const fetchAdminReplies = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/admin/auto-replies');
      const data = res.data?.data?.data || res.data?.data || res.data;
      if (Array.isArray(data)) {
        setReplies(data);
        if (data.length > 0 && !selectedReply) {
          setSelectedReply(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load admin auto replies', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    try {
      setIsSaving(true);
      const payload = {
        name: formName,
        description: formDesc,
        account_id: formAccount || null,
        priority: formPriority,
        is_global: formIsGlobal,
        force_auto_reply: formForceAutoReply,
        visibility: formVisibility,
        status: 'active',
        steps: [
          {
            step_number: 1,
            step_name: 'Initial Admin Welcome',
            delay_value: 0,
            delay_unit: 'seconds',
            message_format: 'markdown',
            message_text: 'Hello {{first_name}} 👋\n\nThank you for contacting our enterprise support! How can we assist you today?',
            is_active: true,
            links: [{ label: 'View Website', url: 'https://metmco.net', link_type: 'inline_url' }],
            buttons: [
              { row_index: 0, col_index: 0, label: 'Join Community', button_type: 'url', data: 'https://t.me/teleflow' },
              { row_index: 0, col_index: 1, label: 'Support Desk', button_type: 'url', data: 'https://metmco.net/support' }
            ]
          },
          {
            step_number: 2,
            step_name: 'Follow-Up Step 2',
            delay_value: 2,
            delay_unit: 'minutes',
            message_format: 'markdown',
            message_text: 'Glad you reached out, {{first_name}}! Here are our available plans and solutions.',
            is_active: true,
          }
        ]
      };

      const res = await apiClient.post('/admin/auto-replies', payload);
      setIsCreateModalOpen(false);
      setFormName('');
      setFormDesc('');
      await fetchAdminReplies();
      if (res.data?.data) {
        setSelectedReply(res.data.data);
      }
    } catch (err) {
      console.error('Failed to create admin auto reply', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSequence = async () => {
    if (!selectedReply) return;
    try {
      setIsSaving(true);
      await apiClient.put(`/admin/auto-replies/${selectedReply.id}`, {
        name: selectedReply.name,
        description: selectedReply.description,
        status: selectedReply.status,
        priority: selectedReply.priority,
        account_id: selectedReply.account_id,
        is_global: selectedReply.is_global,
        force_auto_reply: selectedReply.force_auto_reply,
        disable_user_editing: selectedReply.disable_user_editing,
        lock_message: selectedReply.lock_message,
        lock_media: selectedReply.lock_media,
        lock_links: selectedReply.lock_links,
        visibility: selectedReply.visibility,
        steps: selectedReply.steps,
      });
      await fetchAdminReplies();
    } catch (err) {
      console.error('Failed to update admin auto reply', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await apiClient.post(`/admin/auto-replies/${id}/toggle`);
      setReplies((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: r.status === 'active' ? 'paused' : 'active' } : r))
      );
      if (selectedReply?.id === id) {
        setSelectedReply((prev) => prev ? { ...prev, status: prev.status === 'active' ? 'paused' : 'active' } : null);
      }
    } catch (err) {
      console.error('Failed to toggle auto reply', err);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      setIsLoading(true);
      await apiClient.post(`/admin/auto-replies/${id}/duplicate`);
      await fetchAdminReplies();
    } catch (err) {
      console.error('Failed to duplicate admin auto reply', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this admin auto reply?')) return;
    try {
      await apiClient.delete(`/admin/auto-replies/${id}`);
      setReplies((prev) => prev.filter((r) => r.id !== id));
      if (selectedReply?.id === id) {
        const remaining = replies.filter((r) => r.id !== id);
        setSelectedReply(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err) {
      console.error('Failed to delete admin auto reply', err);
    }
  };

  // Step Management
  const handleAddStep = () => {
    if (!selectedReply) return;
    const currentSteps = selectedReply.steps || [];
    const nextNum = currentSteps.length + 1;
    const newStep: AdminAutoReplyStepItem = {
      step_number: nextNum,
      step_name: `Admin Step ${nextNum}`,
      delay_value: 5,
      delay_unit: 'minutes',
      message_format: 'markdown',
      message_text: `Step ${nextNum} response for {{first_name}}.\n\nLet us know if you have any questions!`,
      is_active: true,
      media: [],
      links: [],
      buttons: [],
    };

    setSelectedReply({
      ...selectedReply,
      steps: [...currentSteps, newStep],
    });
    setEditingStepIdx(currentSteps.length);
  };

  const handleRemoveStep = (idx: number) => {
    if (!selectedReply || selectedReply.steps.length <= 1) return;
    const updated = selectedReply.steps.filter((_, i) => i !== idx).map((s, i) => ({
      ...s,
      step_number: i + 1,
    }));
    setSelectedReply({
      ...selectedReply,
      steps: updated,
    });
    if (editingStepIdx >= updated.length) {
      setEditingStepIdx(Math.max(0, updated.length - 1));
    }
  };

  const handleMoveStep = (idx: number, direction: 'up' | 'down') => {
    if (!selectedReply) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= selectedReply.steps.length) return;

    const list = [...selectedReply.steps];
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;

    const reordered = list.map((s, i) => ({ ...s, step_number: i + 1 }));
    setSelectedReply({ ...selectedReply, steps: reordered });
    setEditingStepIdx(targetIdx);
  };

  const handleCurrentStepComposerChange = (composerVal: ComposerValue) => {
    if (!selectedReply || !selectedReply.steps[editingStepIdx]) return;
    const steps = [...selectedReply.steps];
    steps[editingStepIdx] = {
      ...steps[editingStepIdx],
      message_text: composerVal.messageText,
      message_format: composerVal.messageFormat || 'markdown',
      media: composerVal.media,
      links: composerVal.links,
      buttons: composerVal.buttons,
    };

    // Also update admin override locks on master object if modified
    const updatedReply = {
      ...selectedReply,
      lock_message: composerVal.lockMessage ?? selectedReply.lock_message,
      lock_media: composerVal.lockMedia ?? selectedReply.lock_media,
      lock_links: composerVal.lockLinks ?? selectedReply.lock_links,
      steps,
    };

    setSelectedReply(updatedReply);
  };

  const handleCurrentStepFieldChange = (field: keyof AdminAutoReplyStepItem, val: any) => {
    if (!selectedReply || !selectedReply.steps[editingStepIdx]) return;
    const steps = [...selectedReply.steps];
    steps[editingStepIdx] = {
      ...steps[editingStepIdx],
      [field]: val,
    };
    setSelectedReply({ ...selectedReply, steps });
  };

  // Simulator
  const handleSimulate = () => {
    if (!simInput.trim() || !selectedReply || !selectedReply.steps.length) return;

    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nextStep = simStepNum + 1;
    const stepToSend = selectedReply.steps.find((s) => s.step_number === nextStep && s.is_active);

    const newHist = [
      ...simHistory,
      { sender: 'traffic' as const, text: simInput.trim(), time: timeNow }
    ];

    if (stepToSend) {
      let botText = stepToSend.message_text.replace(/{{first_name}}/g, 'Alex').replace(/{{username}}/g, '@alex');
      newHist.push({
        sender: 'bot' as const,
        text: botText,
        step: stepToSend.step_number,
        time: timeNow
      });
      setSimStepNum(nextStep);
    } else {
      newHist.push({
        sender: 'bot' as const,
        text: '🏁 Sequence Completed: All admin auto reply steps for this conversation have ended.',
        time: timeNow
      });
    }

    setSimHistory(newHist);
    setSimInput('');
  };

  const currentStep = selectedReply?.steps[editingStepIdx];

  const composerValue: ComposerValue = {
    messageText: currentStep?.message_text || '',
    messageFormat: currentStep?.message_format || 'markdown',
    media: currentStep?.media || [],
    links: currentStep?.links || [],
    buttons: currentStep?.buttons || [],
    lockMessage: selectedReply?.lock_message,
    lockMedia: selectedReply?.lock_media,
    lockLinks: selectedReply?.lock_links,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 rounded-2xl text-white shadow-md shadow-indigo-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Admin Auto Reply Composer</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                Enterprise v3.0
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Administrator-level Auto Reply composer with global override, lock permissions, template visibility, and live simulator
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('sequences')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'sequences'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sequence Builder
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'simulator'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live Simulator
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Auto Reply
          </button>
        </div>
      </div>

      {activeTab === 'sequences' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT SIDE: Sequences Selector & Steps List */}
          <div className="lg:col-span-4 space-y-4">
            {/* Auto Reply Picker */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs space-y-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Admin Sequences ({replies.length})
              </label>

              {replies.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">No admin auto replies found.</div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {replies.map((rep) => (
                    <div
                      key={rep.id}
                      onClick={() => {
                        setSelectedReply(rep);
                        setEditingStepIdx(0);
                      }}
                      className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                        selectedReply?.id === rep.id
                          ? 'border-indigo-400 bg-indigo-50/60 font-semibold text-indigo-950 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="font-bold truncate">{rep.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{rep.steps?.length || 0} Steps</span>
                          <span>•</span>
                          <span className={rep.status === 'active' ? 'text-emerald-600 font-bold' : 'text-amber-600'}>
                            {rep.status.toUpperCase()}
                          </span>
                          {rep.is_global && <span className="text-purple-600 font-bold">• GLOBAL</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggle(rep.id)}
                          title={rep.status === 'active' ? 'Pause' : 'Activate'}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                        >
                          {rep.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDuplicate(rep.id)}
                          title="Duplicate"
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(rep.id)}
                          title="Delete"
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sequence Steps Timeline */}
            {selectedReply && (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Sequence Progression ({selectedReply.steps.length} Steps)
                    </h3>
                    <p className="text-[11px] text-slate-400">Reply-driven progression</p>
                  </div>
                  <button
                    onClick={handleAddStep}
                    className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Step
                  </button>
                </div>

                <div className="space-y-3">
                  {selectedReply.steps.map((st, idx) => (
                    <React.Fragment key={idx}>
                      <div
                        onClick={() => setEditingStepIdx(idx)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                          editingStepIdx === idx
                            ? 'border-indigo-500 bg-indigo-50/40 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {st.step_number}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 truncate">
                                {st.step_name || `Step ${st.step_number}`}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {st.delay_value === 0 ? 'Instant Reply' : `${st.delay_value} ${st.delay_unit}`}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              disabled={idx === 0}
                              onClick={() => handleMoveStep(idx, 'up')}
                              className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={idx === selectedReply.steps.length - 1}
                              onClick={() => handleMoveStep(idx, 'down')}
                              className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveStep(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {idx < selectedReply.steps.length - 1 && (
                        <div className="flex flex-col items-center my-0.5">
                          <div className="w-0.5 h-2 bg-indigo-200" />
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                            💬 Traffic Contact Replies
                          </span>
                          <div className="w-0.5 h-2 bg-indigo-200" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDE: TelegramMessageComposer (Unified Reusable Component) */}
          <div className="lg:col-span-8 space-y-6">
            {selectedReply && currentStep ? (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
                {/* Step Header & Save Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                      {currentStep.step_number}
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        {currentStep.step_name || `Admin Step ${currentStep.step_number}`}
                      </h2>
                      <p className="text-xs text-slate-400">
                        Configuring automated reply step #{currentStep.step_number}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentStep.is_active}
                        onChange={(e) => handleCurrentStepFieldChange('is_active', e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Active Step</span>
                    </label>

                    <button
                      onClick={handleSaveSequence}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isSaving ? 'Saving...' : 'Save Sequence'}
                    </button>
                  </div>
                </div>

                {/* Step Delay & Identifier */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Step Name / Title</label>
                    <input
                      type="text"
                      value={currentStep.step_name || ''}
                      onChange={(e) => handleCurrentStepFieldChange('step_name', e.target.value)}
                      placeholder={`Admin Step ${currentStep.step_number}`}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Sending Delay Before Dispatch</span>
                      <span className="text-[10px] text-slate-400 font-normal">0 = instant</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        value={currentStep.delay_value}
                        onChange={(e) => handleCurrentStepFieldChange('delay_value', parseInt(e.target.value) || 0)}
                        className="w-24 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <select
                        value={currentStep.delay_unit}
                        onChange={(e) => handleCurrentStepFieldChange('delay_unit', e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="seconds">Seconds</option>
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* UNIFIED COMPOSER (Rule 19) */}
                <div className="pt-2">
                  <TelegramMessageComposer
                    value={composerValue}
                    onChange={handleCurrentStepComposerChange}
                    isAdmin={true}
                    senderName="TeleFlow Enterprise"
                    senderHandle="@teleflow_admin"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center text-slate-400">
                Select an admin sequence from the left to edit its steps and composer settings.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Live Simulator */
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Admin Conversation Simulator</h2>
              <p className="text-xs text-slate-500">Test how incoming replies progress through your configured admin steps</p>
            </div>
            <button
              onClick={() => {
                setSimHistory([]);
                setSimStepNum(0);
                setSimInput('Hello, interested in your enterprise package!');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Reset Chat
            </button>
          </div>

          <div className="h-96 overflow-y-auto bg-slate-100/70 p-4 rounded-2xl border border-slate-200 space-y-3">
            {simHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                Chat is empty. Send a message to simulate reply trigger!
              </div>
            ) : (
              simHistory.map((item, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${item.sender === 'traffic' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-xs md:max-w-md p-3 rounded-2xl text-xs leading-relaxed ${
                      item.sender === 'traffic'
                        ? 'bg-indigo-600 text-white rounded-br-xs'
                        : 'bg-white text-slate-800 rounded-bl-xs border border-slate-200 shadow-xs'
                    }`}
                  >
                    {item.step && (
                      <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 mb-1 border border-indigo-200">
                        ⚡ Step {item.step} Triggered
                      </span>
                    )}
                    <div className="whitespace-pre-line">{item.text}</div>
                    <div className={`text-[9px] mt-1 text-right ${item.sender === 'traffic' ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {item.time}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={simInput}
              onChange={(e) => setSimInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSimulate()}
              placeholder="Type user reply..."
              className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl"
            />
            <button
              onClick={handleSimulate}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Modal: Create Admin Auto Reply */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Create Admin Auto Reply</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNew} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sequence Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. VIP Global Welcome Sequence"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Objective or notes..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Telegram Account</label>
                  <select
                    value={formAccount}
                    onChange={(e) => setFormAccount(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="">All Accounts (Global)</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.alias || a.phone_masked}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Visibility</label>
                  <select
                    value={formVisibility}
                    onChange={(e) => setFormVisibility(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="all_users">All Users</option>
                    <option value="admin_only">Admin Only</option>
                    <option value="selected_plans">Selected Plans</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsGlobal}
                    onChange={(e) => setFormIsGlobal(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span>Set as Global Campaign (Applied across all accounts)</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formForceAutoReply}
                    onChange={(e) => setFormForceAutoReply(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span>Force Auto Reply (Overrides user conflicting auto-replies)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  {isSaving ? 'Creating...' : 'Create Sequence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
