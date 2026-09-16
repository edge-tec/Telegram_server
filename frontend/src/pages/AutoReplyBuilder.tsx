import React, { useState, useEffect } from 'react';
import {
  Zap,
  Plus,
  Search,
  Filter,
  Copy,
  Trash2,
  Play,
  Pause,
  Edit,
  Clock,
  Sparkles,
  ChevronRight,
  Send,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Hash,
  Eye,
  Sliders,
  Smartphone,
} from 'lucide-react';
import { apiClient, TelegramAccount, TelegramAutoReply, TelegramButton } from '../api/client';
import { RichTextEditor } from '../components/RichTextEditor';
import { MediaAttachmentUploader, AttachedMedia } from '../components/MediaAttachmentUploader';
import { TelegramButtonsBuilder } from '../components/TelegramButtonsBuilder';
import { TelegramChatPreview } from '../components/TelegramChatPreview';

interface AutoReplyBuilderProps {
  accounts: TelegramAccount[];
}

export const AutoReplyBuilder: React.FC<AutoReplyBuilderProps> = ({ accounts }) => {
  const [replies, setReplies] = useState<TelegramAutoReply[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTrigger, setFilterTrigger] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<TelegramAutoReply | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [accountId, setAccountId] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'draft' | 'paused'>('active');
  const [priority, setPriority] = useState<number>(10);
  const [triggerType, setTriggerType] = useState<string>('first_message');
  const [triggerKeywords, setTriggerKeywords] = useState<string>('');
  const [isCaseSensitive, setIsCaseSensitive] = useState<boolean>(false);
  const [delayType, setDelayType] = useState<'instant' | 'fixed' | 'random'>('instant');
  const [delaySeconds, setDelaySeconds] = useState<number>(5);
  const [randomDelayMin, setRandomDelayMin] = useState<number>(10);
  const [randomDelayMax, setRandomDelayMax] = useState<number>(30);
  const [messageBody, setMessageBody] = useState<string>('');
  const [attachments, setAttachments] = useState<AttachedMedia[]>([]);
  const [isAlbum, setIsAlbum] = useState<boolean>(false);
  const [buttons, setButtons] = useState<TelegramButton[]>([]);

  // Test Simulation State
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testInput, setTestInput] = useState('hi what is your price?');
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    fetchReplies();
  }, []);

  const fetchReplies = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/auto-replies');
      setReplies(res.data);
    } catch (err) {
      console.error('Failed to load auto replies', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingReply(null);
    setName('');
    setAccountId(accounts.length > 0 ? accounts[0].id : '');
    setStatus('active');
    setPriority(10);
    setTriggerType('first_message');
    setTriggerKeywords('');
    setIsCaseSensitive(false);
    setDelayType('instant');
    setDelaySeconds(5);
    setRandomDelayMin(10);
    setRandomDelayMax(30);
    setMessageBody('Hello <first_name>! 👋\n\nThanks for messaging us. How can I help you today?');
    setAttachments([]);
    setIsAlbum(false);
    setButtons([]);
    setIsModalOpen(true);
  };

  const openEditModal = (reply: TelegramAutoReply) => {
    setEditingReply(reply);
    setName(reply.name);
    setAccountId(reply.account_id || (accounts.length > 0 ? accounts[0].id : ''));
    setStatus(reply.status);
    setPriority(reply.priority);
    setTriggerType(reply.trigger_type);
    setTriggerKeywords(reply.trigger_keywords ? reply.trigger_keywords.join(', ') : '');
    setIsCaseSensitive(reply.is_case_sensitive);
    setDelayType(reply.delay_type);
    setDelaySeconds(reply.delay_seconds);
    setRandomDelayMin(reply.random_delay_min);
    setRandomDelayMax(reply.random_delay_max);
    setMessageBody(reply.message_body || '');
    setAttachments(
      (reply.media_attachments as any[]) ||
        (reply.media
          ? [
              {
                id: reply.media.id,
                url: reply.media.url,
                file_name: reply.media.file_name,
                file_type: reply.media.file_type,
                caption: reply.media_caption,
              },
            ]
          : [])
    );
    setIsAlbum(reply.is_album || false);
    setButtons(reply.inline_buttons || []);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const keywordsArray = triggerKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const payload = {
      name,
      account_id: accountId || null,
      status,
      priority: Number(priority),
      trigger_type: triggerType,
      trigger_keywords: keywordsArray,
      is_case_sensitive: isCaseSensitive,
      delay_type: delayType,
      delay_seconds: Number(delaySeconds),
      random_delay_min: Number(randomDelayMin),
      random_delay_max: Number(randomDelayMax),
      message_body: messageBody,
      media_id: attachments.length > 0 ? attachments[0].id : null,
      media_caption: attachments.length > 0 ? attachments[0].caption : null,
      is_album: isAlbum,
      media_attachments: attachments,
      inline_buttons: buttons,
    };

    try {
      if (editingReply) {
        await apiClient.put(`/auto-replies/${editingReply.id}`, payload);
      } else {
        await apiClient.post('/auto-replies', payload);
      }
      setIsModalOpen(false);
      fetchReplies();
    } catch (err) {
      console.error('Failed to save auto reply', err);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await apiClient.post(`/auto-replies/${id}/toggle`);
      fetchReplies();
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await apiClient.post(`/auto-replies/${id}/duplicate`);
      fetchReplies();
    } catch (err) {
      console.error('Failed to duplicate auto reply', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this auto-reply?')) return;
    try {
      await apiClient.delete(`/auto-replies/${id}`);
      fetchReplies();
    } catch (err) {
      console.error('Failed to delete auto reply', err);
    }
  };

  const handleRunSimulation = async () => {
    try {
      const res = await apiClient.post('/auto-replies/test-trigger', {
        message_body: messageBody,
        test_input: testInput,
      });
      setTestResult(res.data);
    } catch (err) {
      console.error('Failed test simulation', err);
    }
  };

  const triggersList = [
    { id: 'first_message', label: 'First Message', desc: 'Trigger on contact’s very first incoming message' },
    { id: 'keyword_match', label: 'Keyword Match', desc: 'Match keywords in message text' },
    { id: 'keyword_exact', label: 'Exact Keyword', desc: 'Message exactly matches keyword phrase' },
    { id: 'keyword_contains', label: 'Contains Keyword', desc: 'Message contains any of the target words' },
    { id: 'keyword_regex', label: 'Regex Keyword', desc: 'Advanced regular expression evaluation' },
    { id: 'command_start', label: 'Command /start', desc: 'User sends the /start bot command' },
    { id: 'command_help', label: 'Command /help', desc: 'User sends the /help bot command' },
    { id: 'group_join', label: 'Group Join', desc: 'Trigger when user joins connected Telegram group' },
    { id: 'channel_join', label: 'Channel Join', desc: 'Trigger when user subscribes to channel' },
    { id: 'button_click', label: 'Button Click', desc: 'Trigger upon clicking an inline keyboard action' },
    { id: 'callback_query', label: 'Callback Query', desc: 'Trigger upon custom callback data payload' },
    { id: 'reply_to_user', label: 'Reply to User', desc: 'Auto reply to any subsequent user message' },
    { id: 'new_conversation', label: 'New Conversation', desc: 'Trigger on new chat thread opened' },
    { id: 'returning_user', label: 'Returning User', desc: 'User messaging after 7+ days of inactivity' },
  ];

  const filteredReplies = replies.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.message_body && r.message_body.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchTrigger = filterTrigger === 'all' || r.trigger_type === filterTrigger;
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchTrigger && matchStatus;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Top Banner Header */}
      <div className="card-glass p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-[20px] bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Zap className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Auto Reply Engine</h1>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                Enterprise v3.0
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Build intelligent multi-trigger Telegram auto responders with delay jitter, media, and inline keyboards.
            </p>
          </div>
        </div>

        <button onClick={openCreateModal} className="btn-primary text-sm font-semibold py-3 px-5">
          <Plus className="w-4 h-4" />
          Create Auto Reply
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search auto replies by name or message..."
            className="input-field pl-9"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Filter Trigger */}
          <select
            value={filterTrigger}
            onChange={(e) => setFilterTrigger(e.target.value)}
            className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Triggers</option>
            {triggersList.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>

          {/* Filter Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="paused">Paused</option>
          </select>
        </div>
      </div>

      {/* Rules Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Loading auto replies...</div>
      ) : filteredReplies.length === 0 ? (
        <div className="card-enterprise p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No auto replies found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Create your first automated response rule to engage contacts the second they send a message.
          </p>
          <button onClick={openCreateModal} className="btn-primary text-xs font-semibold">
            <Plus className="w-3.5 h-3.5" />
            Create Auto Reply
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReplies.map((reply) => {
            const triggerInfo = triggersList.find((t) => t.id === reply.trigger_type) || {
              label: reply.trigger_type,
            };
            return (
              <div
                key={reply.id}
                className="card-enterprise p-5 flex flex-col justify-between border border-slate-200/80 bg-white"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`badge text-[10px] font-bold uppercase tracking-wider ${
                        reply.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : reply.status === 'draft'
                          ? 'bg-slate-100 text-slate-600 border border-slate-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {reply.status}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                      Priority: {reply.priority}
                    </span>
                  </div>

                  {/* Title & Trigger */}
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{reply.name}</h3>

                  <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-600 font-semibold bg-indigo-50/70 w-fit px-2 py-1 rounded-lg border border-indigo-100/60">
                    <Zap className="w-3 h-3" />
                    <span>{triggerInfo.label}</span>
                  </div>

                  {/* Delay Info */}
                  <div className="mt-2.5 flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>
                      {reply.delay_type === 'instant'
                        ? 'Instant reply'
                        : reply.delay_type === 'fixed'
                        ? `Fixed delay: ${reply.delay_seconds}s`
                        : `Random delay: ${reply.random_delay_min}-${reply.random_delay_max}s`}
                    </span>
                  </div>

                  {/* Message Preview snippet */}
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 line-clamp-3 font-normal border border-slate-100 leading-relaxed">
                    {reply.message_body || <span className="italic text-slate-400">Media only reply</span>}
                  </div>

                  {/* Media / Buttons tags */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px]">
                    {reply.media_attachments && reply.media_attachments.length > 0 && (
                      <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md font-semibold border border-purple-100">
                        📎 {reply.media_attachments.length} Media {reply.is_album && '(Album)'}
                      </span>
                    )}
                    {reply.inline_buttons && reply.inline_buttons.length > 0 && (
                      <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-semibold border border-blue-100">
                        🔘 {reply.inline_buttons.length} Buttons
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    Triggered: <b className="text-slate-700">{reply.triggered_count}</b>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleStatus(reply.id)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        reply.status === 'active'
                          ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200'
                          : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                      }`}
                      title={reply.status === 'active' ? 'Pause' : 'Activate'}
                    >
                      {reply.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => handleDuplicate(reply.id)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => openEditModal(reply)}
                      className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg border border-indigo-200 transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(reply.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Fullscreen Modal with Live Simulator */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-[24px] shadow-2xl border border-slate-100 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {editingReply ? 'Edit Auto Reply' : 'Create Auto Reply'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Configure multi-trigger rules, rich text response, delays, and inline keyboard buttons
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Split Screen (Left: Builder / Right: Live Simulator) */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form Controls (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                {/* 1. Basic Info */}
                <div className="card p-4 space-y-3.5 border-slate-200">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    1. Basic Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Reply Name *
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Welcome Pricing Bot"
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Telegram Account
                      </label>
                      <select
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        className="input-field"
                      >
                        <option value="">All Connected Accounts</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.alias} ({a.username ? `@${a.username}` : a.phone_masked})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Status
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="input-field"
                      >
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="paused">Paused</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Priority (Higher = Evaluated First)
                      </label>
                      <input
                        type="number"
                        value={priority}
                        onChange={(e) => setPriority(Number(e.target.value))}
                        className="input-field"
                        min={1}
                        max={100}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Trigger Type & Rules */}
                <div className="card p-4 space-y-3.5 border-slate-200">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    2. Trigger Type & Condition
                  </h3>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Trigger Type
                    </label>
                    <select
                      value={triggerType}
                      onChange={(e) => setTriggerType(e.target.value)}
                      className="input-field font-semibold text-indigo-700"
                    >
                      {triggersList.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label} — {t.desc}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Keywords Input if applicable */}
                  {(triggerType.includes('keyword') || triggerType === 'reply_to_user') && (
                    <div className="pt-1 space-y-2">
                      <label className="block text-xs font-semibold text-slate-700">
                        Trigger Keywords (Comma separated)
                      </label>
                      <input
                        type="text"
                        value={triggerKeywords}
                        onChange={(e) => setTriggerKeywords(e.target.value)}
                        placeholder="price, cost, pricing, packages, buy"
                        className="input-field"
                      />
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={isCaseSensitive}
                          onChange={(e) => setIsCaseSensitive(e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span>Case-sensitive match</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* 3. Delay & Typing Strategy */}
                <div className="card p-4 space-y-3 border-slate-200">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    3. Delay Strategy
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'instant', label: 'Instant', desc: 'No delay' },
                      { id: 'fixed', label: 'Fixed Delay', desc: 'Exact seconds' },
                      { id: 'random', label: 'Random Jitter', desc: 'Human-like delay' },
                    ].map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDelayType(d.id as any)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          delayType === d.id
                            ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xs">{d.label}</div>
                        <div className="text-[10px] text-slate-400">{d.desc}</div>
                      </button>
                    ))}
                  </div>

                  {delayType === 'fixed' && (
                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Delay in Seconds
                      </label>
                      <input
                        type="number"
                        value={delaySeconds}
                        onChange={(e) => setDelaySeconds(Number(e.target.value))}
                        className="input-field"
                        min={1}
                        max={3600}
                      />
                    </div>
                  )}

                  {delayType === 'random' && (
                    <div className="pt-2 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Min Seconds
                        </label>
                        <input
                          type="number"
                          value={randomDelayMin}
                          onChange={(e) => setRandomDelayMin(Number(e.target.value))}
                          className="input-field"
                          min={1}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Max Seconds
                        </label>
                        <input
                          type="number"
                          value={randomDelayMax}
                          onChange={(e) => setRandomDelayMax(Number(e.target.value))}
                          className="input-field"
                          min={1}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Rich Text Message Composer */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    4. Response Message Composer
                  </label>
                  <RichTextEditor
                    value={messageBody}
                    onChange={setMessageBody}
                    placeholder="Type your response message... Supports <first_name>, @mentions, markdown and AI copilot"
                  />
                </div>

                {/* 5. Media Attachments */}
                <MediaAttachmentUploader
                  attachments={attachments}
                  onChange={setAttachments}
                  isAlbum={isAlbum}
                  onToggleAlbum={setIsAlbum}
                />

                {/* 6. Inline Keyboard Buttons */}
                <TelegramButtonsBuilder buttons={buttons} onChange={setButtons} />
              </div>

              {/* Right Column: Live Telegram Chat Simulator (5 cols sticky) */}
              <div className="lg:col-span-5 flex flex-col">
                <div className="sticky top-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                      Live Telegram Simulator
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsTestModalOpen(true)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Test Simulation
                    </button>
                  </div>

                  <div className="h-[520px]">
                    <TelegramChatPreview
                      messageText={messageBody}
                      senderName={accounts.find((a) => a.id === accountId)?.alias || 'TeleFlow Bot'}
                      senderHandle={
                        accounts.find((a) => a.id === accountId)?.username
                          ? `@${accounts.find((a) => a.id === accountId)?.username}`
                          : '@teleflow_bot'
                      }
                      mediaUrl={attachments.length > 0 ? attachments[0].url : undefined}
                      mediaCaption={attachments.length > 0 ? attachments[0].caption : undefined}
                      mediaType={attachments.length > 0 ? attachments[0].file_type : undefined}
                      buttons={buttons}
                      isAlbum={isAlbum}
                      albumItems={attachments}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button onClick={handleSave} className="btn-primary text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                {editingReply ? 'Save Changes' : 'Create Auto Reply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Simulation Modal */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[24px] shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-indigo-50/40">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Simulate Inbound Message Evaluation
              </h3>
              <button onClick={() => setIsTestModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sample Inbound Message from User
                </label>
                <input
                  type="text"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  className="input-field text-xs"
                />
              </div>

              <button
                onClick={handleRunSimulation}
                className="btn-primary text-xs w-full py-2.5 font-semibold"
              >
                Run Evaluation
              </button>

              {testResult && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="font-semibold text-slate-800">Rendered Output:</div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap font-sans">
                    {testResult.rendered}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    All dynamic tags successfully parsed. Delay simulated: {testResult.simulated_delay_seconds}s.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
