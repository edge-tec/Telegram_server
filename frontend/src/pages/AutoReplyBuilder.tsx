import React, { useState, useEffect } from 'react';
import {
  Zap,
  Plus,
  Play,
  Pause,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Clock,
  MessageSquare,
  Link2,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Send,
  Eye,
  Smartphone,
  Layers,
  HelpCircle,
  Tag,
  AlertCircle
} from 'lucide-react';
import {
  apiClient,
  TelegramAccount,
  SequentialAutoReplySequence,
  SequentialAutoReplyStep
} from '../api/client';

interface AutoReplyBuilderProps {
  accounts: TelegramAccount[];
}

export const AutoReplyBuilder: React.FC<AutoReplyBuilderProps> = ({ accounts }) => {
  const [sequences, setSequences] = useState<SequentialAutoReplySequence[]>([]);
  const [selectedSequence, setSelectedSequence] = useState<SequentialAutoReplySequence | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'sequences' | 'simulator'>('sequences');

  // New sequence modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSeqName, setNewSeqName] = useState('');
  const [newSeqDesc, setNewSeqDesc] = useState('');
  const [newSeqAccount, setNewSeqAccount] = useState('');

  // Active step editing in builder
  const [editingStepIdx, setEditingStepIdx] = useState<number>(0);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');

  // Simulator state
  const [simHistory, setSimHistory] = useState<Array<{ sender: 'traffic' | 'bot'; text: string; step?: number; time: string }>>([]);
  const [simInput, setSimInput] = useState('Hello, interested in your services!');
  const [simCurrentStep, setSimCurrentStep] = useState(0);

  useEffect(() => {
    fetchSequences();
  }, []);

  const fetchSequences = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/sequential-auto-replies');
      const data = res.data?.data?.data || res.data?.data || res.data;
      if (Array.isArray(data)) {
        setSequences(data);
        if (data.length > 0 && !selectedSequence) {
          setSelectedSequence(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load sequences', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeqName.trim()) return;

    try {
      setIsSaving(true);
      const res = await apiClient.post('/sequential-auto-replies', {
        name: newSeqName,
        description: newSeqDesc,
        account_id: newSeqAccount || null,
        steps: [
          {
            step_number: 1,
            step_name: 'Initial Welcome Reply',
            delay_value: 0,
            delay_unit: 'seconds',
            message_text: 'Hello {{first_name}}! 👋\n\nThanks for reaching out to us. How can we help you today?',
            is_active: true,
          },
          {
            step_number: 2,
            step_name: 'Follow-Up Offer & Details',
            delay_value: 5,
            delay_unit: 'seconds',
            message_text: 'Great to hear! Here is our catalog and full price list.\n\nLet me know which package fits your needs.',
            is_active: true,
          },
          {
            step_number: 3,
            step_name: 'Closing & Support Assistance',
            delay_value: 10,
            delay_unit: 'seconds',
            message_text: 'Would you like our representative to give you a quick call or help you place an order right away?',
            is_active: true,
          }
        ]
      });

      setIsCreateModalOpen(false);
      setNewSeqName('');
      setNewSeqDesc('');
      await fetchSequences();
      if (res.data?.data) {
        setSelectedSequence(res.data.data);
      }
    } catch (err) {
      console.error('Failed to create sequence', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSequence = async () => {
    if (!selectedSequence) return;
    try {
      setIsSaving(true);
      await apiClient.put(`/sequential-auto-replies/${selectedSequence.id}`, {
        name: selectedSequence.name,
        description: selectedSequence.description,
        status: selectedSequence.status,
        account_id: selectedSequence.account_id,
        steps: selectedSequence.steps,
      });
      await fetchSequences();
    } catch (err) {
      console.error('Failed to update sequence', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (seqId: string) => {
    try {
      await apiClient.post(`/sequential-auto-replies/${seqId}/toggle`);
      setSequences((prev) =>
        prev.map((s) => (s.id === seqId ? { ...s, status: s.status === 'active' ? 'paused' : 'active' } : s))
      );
      if (selectedSequence?.id === seqId) {
        setSelectedSequence((prev) => prev ? { ...prev, status: prev.status === 'active' ? 'paused' : 'active' } : null);
      }
    } catch (err) {
      console.error('Failed to toggle sequence status', err);
    }
  };

  const handleDuplicate = async (seqId: string) => {
    try {
      setIsLoading(true);
      await apiClient.post(`/sequential-auto-replies/${seqId}/duplicate`);
      await fetchSequences();
    } catch (err) {
      console.error('Failed to duplicate sequence', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (seqId: string) => {
    if (!window.confirm('Are you sure you want to delete this sequence?')) return;
    try {
      await apiClient.delete(`/sequential-auto-replies/${seqId}`);
      setSequences((prev) => prev.filter((s) => s.id !== seqId));
      if (selectedSequence?.id === seqId) {
        const remaining = sequences.filter((s) => s.id !== seqId);
        setSelectedSequence(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err) {
      console.error('Failed to delete sequence', err);
    }
  };

  // Step operations on selectedSequence
  const handleAddStep = () => {
    if (!selectedSequence) return;
    const currentSteps = selectedSequence.steps || [];
    const nextNum = currentSteps.length + 1;
    const newStep: SequentialAutoReplyStep = {
      step_number: nextNum,
      step_name: `Auto Reply Step ${nextNum}`,
      delay_value: 5,
      delay_unit: 'seconds',
      message_text: `Step ${nextNum} response message for {{first_name}}.\n\nThank you for continuing the conversation!`,
      is_active: true,
      links: [],
    };
    setSelectedSequence({
      ...selectedSequence,
      steps: [...currentSteps, newStep],
    });
    setEditingStepIdx(currentSteps.length);
  };

  const handleRemoveStep = (idx: number) => {
    if (!selectedSequence || selectedSequence.steps.length <= 1) return;
    const updated = selectedSequence.steps.filter((_, i) => i !== idx).map((s, i) => ({
      ...s,
      step_number: i + 1,
    }));
    setSelectedSequence({
      ...selectedSequence,
      steps: updated,
    });
    if (editingStepIdx >= updated.length) {
      setEditingStepIdx(Math.max(0, updated.length - 1));
    }
  };

  const handleMoveStep = (idx: number, direction: 'up' | 'down') => {
    if (!selectedSequence) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= selectedSequence.steps.length) return;

    const list = [...selectedSequence.steps];
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;

    // renumber
    const reordered = list.map((s, i) => ({ ...s, step_number: i + 1 }));
    setSelectedSequence({ ...selectedSequence, steps: reordered });
    setEditingStepIdx(targetIdx);
  };

  const handleUpdateCurrentStep = (field: keyof SequentialAutoReplyStep, value: any) => {
    if (!selectedSequence || !selectedSequence.steps[editingStepIdx]) return;
    const steps = [...selectedSequence.steps];
    steps[editingStepIdx] = {
      ...steps[editingStepIdx],
      [field]: value,
    };
    setSelectedSequence({ ...selectedSequence, steps });
  };

  const handleAddLink = () => {
    if (!newLinkUrl.trim() || !selectedSequence) return;
    const curStep = selectedSequence.steps[editingStepIdx];
    const curLinks = curStep.links || [];
    const updatedLinks = [...curLinks, { label: newLinkLabel.trim() || newLinkUrl.trim(), url: newLinkUrl.trim() }];
    handleUpdateCurrentStep('links', updatedLinks);
    setNewLinkUrl('');
    setNewLinkLabel('');
  };

  const handleRemoveLink = (linkIdx: number) => {
    if (!selectedSequence) return;
    const curStep = selectedSequence.steps[editingStepIdx];
    const curLinks = curStep.links || [];
    const updatedLinks = curLinks.filter((_, i) => i !== linkIdx);
    handleUpdateCurrentStep('links', updatedLinks);
  };

  const insertVariable = (variableKey: string) => {
    if (!selectedSequence || !selectedSequence.steps[editingStepIdx]) return;
    const curText = selectedSequence.steps[editingStepIdx].message_text || '';
    handleUpdateCurrentStep('message_text', curText + ` {{${variableKey}}}`);
  };

  // Simulator logic
  const handleSimulateReply = () => {
    if (!simInput.trim() || !selectedSequence || !selectedSequence.steps.length) return;

    const trafficMsg = simInput.trim();
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nextStepNum = simCurrentStep + 1;
    const stepToSend = selectedSequence.steps.find((s) => s.step_number === nextStepNum && s.is_active);

    const newHistory = [
      ...simHistory,
      { sender: 'traffic' as const, text: trafficMsg, time: timeNow }
    ];

    if (stepToSend) {
      let botText = stepToSend.message_text.replace(/{{first_name}}/g, 'Alex').replace(/{{username}}/g, '@alex_user');
      if (stepToSend.links && stepToSend.links.length > 0) {
        botText += '\n\n🔗 Links:\n' + stepToSend.links.map((l) => `• ${l.label}: ${l.url}`).join('\n');
      }
      newHistory.push({
        sender: 'bot' as const,
        text: botText,
        step: stepToSend.step_number,
        time: timeNow
      });
      setSimCurrentStep(nextStepNum);
    } else {
      newHistory.push({
        sender: 'bot' as const,
        text: '🏁 Sequence Complete: All automated reply steps for this conversation have been completed.',
        time: timeNow
      });
    }

    setSimHistory(newHistory);
    setSimInput('');
  };

  const handleResetSimulator = () => {
    setSimHistory([]);
    setSimCurrentStep(0);
    setSimInput('Hello, I would like to know more!');
  };

  const currentStep = selectedSequence?.steps[editingStepIdx];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl text-white shadow-sm shadow-indigo-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Sequential Auto Reply Engine</h1>
              <p className="text-xs text-slate-500 font-medium">
                Reply-driven messaging flow: Traffic sends message ➔ Bot sends Step 1 ➔ Traffic replies ➔ Bot sends Step 2 (unlimited steps)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('sequences')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'sequences'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Visual Sequence Builder
              </span>
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'simulator'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                Live Conversation Simulator
              </span>
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Sequence
          </button>
        </div>
      </div>

      {activeTab === 'sequences' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Sequence Selector & Steps Timeline */}
          <div className="lg:col-span-4 space-y-4">
            {/* Sequence Selector Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Active Sequence
              </label>
              {sequences.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No sequences found. Create your first sequential auto reply!
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {sequences.map((seq) => (
                    <div
                      key={seq.id}
                      onClick={() => {
                        setSelectedSequence(seq);
                        setEditingStepIdx(0);
                      }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                        selectedSequence?.id === seq.id
                          ? 'border-indigo-300 bg-indigo-50/60 font-semibold text-indigo-950'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="font-bold truncate">{seq.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{seq.steps?.length || 0} Steps</span>
                          <span>•</span>
                          <span className={seq.status === 'active' ? 'text-emerald-600 font-semibold' : 'text-amber-600'}>
                            {seq.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleStatus(seq.id)}
                          title={seq.status === 'active' ? 'Pause' : 'Activate'}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                        >
                          {seq.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDuplicate(seq.id)}
                          title="Duplicate Sequence"
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(seq.id)}
                          title="Delete Sequence"
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

            {/* Visual Step Timeline List */}
            {selectedSequence && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Sequence Progression ({selectedSequence.steps.length} Steps)
                    </h3>
                    <p className="text-[11px] text-slate-400">Strict reply-driven order</p>
                  </div>
                  <button
                    onClick={handleAddStep}
                    className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Add Step
                  </button>
                </div>

                {/* Initial Trigger Node */}
                <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-[10px]">
                    0
                  </div>
                  <div className="text-slate-600">
                    <span className="font-semibold text-slate-800">Traffic Message</span>
                    <p className="text-[10px] text-slate-400">Contact sends initial inbound greeting</p>
                  </div>
                </div>

                {/* Animated Down Flow */}
                <div className="flex justify-center">
                  <div className="w-0.5 h-3 bg-indigo-300" />
                </div>

                {/* Steps List */}
                <div className="space-y-3">
                  {selectedSequence.steps.map((step, idx) => {
                    const isSelected = editingStepIdx === idx;
                    return (
                      <React.Fragment key={idx}>
                        <div
                          onClick={() => setEditingStepIdx(idx)}
                          className={`relative p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50/40 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                  step.is_active
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-200 text-slate-500'
                                }`}
                              >
                                {step.step_number}
                              </span>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-800 truncate">
                                  {step.step_name || `Auto Reply Step ${step.step_number}`}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span>
                                    {step.delay_value === 0
                                      ? 'Instant Reply'
                                      : `${step.delay_value} ${step.delay_unit} delay`}
                                  </span>
                                  {step.links && step.links.length > 0 && (
                                    <span className="text-indigo-600 font-medium">
                                      • {step.links.length} links
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                disabled={idx === 0}
                                onClick={() => handleMoveStep(idx, 'up')}
                                className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20"
                                title="Move Up"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                disabled={idx === selectedSequence.steps.length - 1}
                                onClick={() => handleMoveStep(idx, 'down')}
                                className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20"
                                title="Move Down"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleRemoveStep(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600"
                                title="Delete Step"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Step Connection: Traffic Replies */}
                        {idx < selectedSequence.steps.length - 1 && (
                          <div className="flex flex-col items-center my-0.5">
                            <div className="w-0.5 h-2 bg-indigo-200" />
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              💬 Traffic User Replies
                            </span>
                            <div className="w-0.5 h-2 bg-indigo-200" />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleAddStep}
                    className="w-full py-2.5 border-2 border-dashed border-indigo-200 hover:border-indigo-400 text-indigo-600 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add Another Auto Reply Step (Unlimited)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Step Editor & Live Telegram Chat Preview */}
          <div className="lg:col-span-8 space-y-6">
            {selectedSequence && currentStep ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                      {currentStep.step_number}
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Configuring Step {currentStep.step_number}
                      </h2>
                      <p className="text-xs text-slate-500">
                        Dispatched automatically when contact sends reply #{currentStep.step_number - 1}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentStep.is_active}
                        onChange={(e) => handleUpdateCurrentStep('is_active', e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Active Step</span>
                    </label>

                    <button
                      onClick={handleSaveSequence}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isSaving ? 'Saving...' : 'Save Sequence'}
                    </button>
                  </div>
                </div>

                {/* Step Name & Delay Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Step Title / Identifier
                    </label>
                    <input
                      type="text"
                      value={currentStep.step_name || ''}
                      onChange={(e) => handleUpdateCurrentStep('step_name', e.target.value)}
                      placeholder={`Auto Reply Step ${currentStep.step_number}`}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                        onChange={(e) => handleUpdateCurrentStep('delay_value', parseInt(e.target.value) || 0)}
                        className="w-24 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                      <select
                        value={currentStep.delay_unit}
                        onChange={(e) => handleUpdateCurrentStep('delay_unit', e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                      >
                        <option value="seconds">Seconds</option>
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Message Content Composer */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Auto Reply Message Content
                    </label>
                    {/* Variable Quick Inserter */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-semibold">Variables:</span>
                      {['first_name', 'username', 'phone', 'current_date'].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => insertVariable(v)}
                          className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-md border border-slate-200 transition-colors"
                        >
                          +{v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={6}
                    value={currentStep.message_text}
                    onChange={(e) => handleUpdateCurrentStep('message_text', e.target.value)}
                    placeholder="Type the message to send when user replies..."
                    className="w-full px-3 py-2.5 text-xs font-mono border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* Media Attachment & Links Manager */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Media Link */}
                  <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 bg-slate-50/50">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Attach Media (URL or Path)</span>
                    </div>
                    <input
                      type="text"
                      value={currentStep.media_url || ''}
                      onChange={(e) => handleUpdateCurrentStep('media_url', e.target.value)}
                      placeholder="https://example.com/banner.jpg or video url"
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <div className="flex items-center gap-2">
                      <select
                        value={currentStep.media_type || 'text'}
                        onChange={(e) => handleUpdateCurrentStep('media_type', e.target.value)}
                        className="text-[11px] px-2 py-1 border border-slate-200 rounded-md bg-white"
                      >
                        <option value="text">Plain Text (No Media)</option>
                        <option value="photo">Image / Photo</option>
                        <option value="video">Video</option>
                        <option value="document">Document / PDF</option>
                      </select>
                      <span className="text-[10px] text-slate-400">Supported by MTProto bridge</span>
                    </div>
                  </div>

                  {/* Clickable Links */}
                  <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 bg-slate-50/50">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Link2 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Clickable Links / Buttons</span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newLinkLabel}
                        onChange={(e) => setNewLinkLabel(e.target.value)}
                        placeholder="Label (e.g. Website)"
                        className="w-1/3 px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden"
                      />
                      <input
                        type="text"
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        placeholder="https://t.me/yourchannel"
                        className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={handleAddLink}
                        className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                      >
                        Add
                      </button>
                    </div>

                    {currentStep.links && currentStep.links.length > 0 && (
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {currentStep.links.map((link, lIdx) => (
                          <div
                            key={lIdx}
                            className="flex items-center justify-between text-[11px] bg-white px-2 py-1 rounded border border-slate-200"
                          >
                            <span className="font-semibold text-slate-700 truncate">{link.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 truncate max-w-36">{link.url}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveLink(lIdx)}
                                className="text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Message Preview Card */}
                <div className="border border-indigo-100 bg-gradient-to-br from-indigo-50/40 to-purple-50/20 rounded-xl p-4">
                  <div className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Live Message Preview (Telegram Style)</span>
                  </div>
                  <div className="max-w-md bg-white p-3 rounded-2xl rounded-bl-xs border border-slate-200 shadow-xs space-y-2">
                    {currentStep.media_url && (
                      <div className="w-full h-32 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center text-slate-400 text-xs">
                        [Media Preview: {currentStep.media_url}]
                      </div>
                    )}
                    <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                      {currentStep.message_text
                        ? currentStep.message_text
                            .replace(/{{first_name}}/g, 'Alex')
                            .replace(/{{username}}/g, '@alex_user')
                            .replace(/{{phone}}/g, '+1 (555) 019-2834')
                            .replace(/{{current_date}}/g, new Date().toLocaleDateString())
                        : 'Message text will appear here...'}
                    </div>

                    {currentStep.links && currentStep.links.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                        {currentStep.links.map((l, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100"
                          >
                            <Link2 className="w-2.5 h-2.5" />
                            {l.label}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400 text-right">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
                Select a sequence from the left to start configuring its steps.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Conversation Simulator View */
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Sequential Reply Simulator</h2>
              <p className="text-xs text-slate-500">
                Simulate how the traffic user replies advance through Step 1 ➔ Step 2 ➔ Step 3
              </p>
            </div>
            <button
              onClick={handleResetSimulator}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Reset Chat
            </button>
          </div>

          {/* Telegram Chat Bubble Window */}
          <div className="h-96 overflow-y-auto bg-slate-100/70 p-4 rounded-2xl border border-slate-200 space-y-3">
            {simHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300" />
                <p>Chat is empty. Send a greeting to trigger Step 1!</p>
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
                        ? 'bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white rounded-br-xs shadow-xs'
                        : 'bg-white text-slate-800 rounded-bl-xs border border-slate-200 shadow-xs'
                    }`}
                  >
                    {item.step && (
                      <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 mb-1.5">
                        ⚡ Step {item.step} Triggered
                      </span>
                    )}
                    <div className="whitespace-pre-line">{item.text}</div>
                    <div
                      className={`text-[9px] mt-1 text-right ${
                        item.sender === 'traffic' ? 'text-indigo-200' : 'text-slate-400'
                      }`}
                    >
                      {item.time}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chat Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={simInput}
              onChange={(e) => setSimInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSimulateReply()}
              placeholder="Type traffic user reply here..."
              className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              onClick={handleSimulateReply}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Reply
            </button>
          </div>
        </div>
      )}

      {/* Modal: Create Sequence */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Create Sequential Auto Reply</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSequence} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sequence Name</label>
                <input
                  type="text"
                  required
                  value={newSeqName}
                  onChange={(e) => setNewSeqName(e.target.value)}
                  placeholder="e.g. Sales Funnel Inbound Sequence"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newSeqDesc}
                  onChange={(e) => setNewSeqDesc(e.target.value)}
                  placeholder="Optional notes or sequence objective..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Telegram Account</label>
                <select
                  value={newSeqAccount}
                  onChange={(e) => setNewSeqAccount(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 bg-white"
                >
                  <option value="">All Accounts (Global)</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.alias || acc.phone_masked}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
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
