import React, { useState, useEffect } from 'react';
import { ReplyTemplate, MediaItem, apiClient } from '../api/client';
import {
  FileText,
  Plus,
  Clock,
  Trash2,
  Edit2,
  Paperclip,
  CheckCircle2,
  Zap,
  Sparkles,
  X,
  FileCode
} from 'lucide-react';

export const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<'auto_reply' | 'keyword' | 'followup' | 'rule'>('auto_reply');
  const [delayType, setDelayType] = useState<'instant' | 'fixed' | 'random'>('instant');
  const [delayValue, setDelayValue] = useState(0);
  const [delayUnit, setDelayUnit] = useState<'seconds' | 'minutes' | 'hours' | 'days'>('seconds');
  const [randomMin, setRandomMin] = useState(20);
  const [randomMax, setRandomMax] = useState(40);
  const [replyType, setReplyType] = useState<ReplyTemplate['reply_type']>('text');
  const [messageBody, setMessageBody] = useState('');
  const [mediaId, setMediaId] = useState<string>('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchTemplates();
    fetchMedia();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/templates');
      setTemplates(res.data);
    } catch (err) {
      console.error('Error fetching templates', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMedia = async () => {
    try {
      const res = await apiClient.get('/media');
      setMediaList(res.data);
    } catch (err) {
      console.error('Error fetching media', err);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setTriggerType('auto_reply');
    setDelayType('instant');
    setDelayValue(0);
    setDelayUnit('seconds');
    setRandomMin(20);
    setRandomMax(40);
    setReplyType('text');
    setMessageBody('');
    setMediaId('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (t: ReplyTemplate) => {
    setEditingId(t.id);
    setName(t.name);
    setTriggerType(t.trigger_type);
    setDelayType(t.delay_type);
    setRandomMin(t.random_delay_min || 20);
    setRandomMax(t.random_delay_max || 40);
    setReplyType(t.reply_type);
    setMessageBody(t.message_body || '');
    setMediaId(t.media_id || '');
    setIsActive(t.is_active);

    // Calculate delay value and unit
    const totalSec = t.delay_seconds || 0;
    if (totalSec >= 86400 && totalSec % 86400 === 0) {
      setDelayValue(totalSec / 86400);
      setDelayUnit('days');
    } else if (totalSec >= 3600 && totalSec % 3600 === 0) {
      setDelayValue(totalSec / 3600);
      setDelayUnit('hours');
    } else if (totalSec >= 60 && totalSec % 60 === 0) {
      setDelayValue(totalSec / 60);
      setDelayUnit('minutes');
    } else {
      setDelayValue(totalSec);
      setDelayUnit('seconds');
    }

    setIsModalOpen(true);
  };

  const insertVariable = (variable: string) => {
    setMessageBody((prev) => prev + ` {{${variable}}} `);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    let calculatedSeconds = 0;
    if (delayType === 'fixed') {
      if (delayUnit === 'minutes') calculatedSeconds = delayValue * 60;
      else if (delayUnit === 'hours') calculatedSeconds = delayValue * 3600;
      else if (delayUnit === 'days') calculatedSeconds = delayValue * 86400;
      else calculatedSeconds = delayValue;
    }

    const payload = {
      name,
      trigger_type: triggerType,
      delay_type: delayType,
      delay_seconds: calculatedSeconds,
      random_delay_min: randomMin,
      random_delay_max: randomMax,
      reply_type: replyType,
      message_body: messageBody,
      media_id: mediaId || null,
      is_active: isActive,
    };

    try {
      if (editingId) {
        await apiClient.put(`/templates/${editingId}`, payload);
      } else {
        await apiClient.post('/templates', payload);
      }
      setIsModalOpen(false);
      fetchTemplates();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save template');
    }
  };

  const handleDelete = async (id: string, tName: string) => {
    if (!confirm(`Delete template "${tName}"?`)) return;
    try {
      await apiClient.delete(`/templates/${id}`);
      fetchTemplates();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete template');
    }
  };

  const dynamicVariables = [
    { label: 'First Name', var: 'first_name' },
    { label: 'Last Name', var: 'last_name' },
    { label: 'Username', var: 'username' },
    { label: 'Phone', var: 'phone' },
    { label: 'Current Date', var: 'current_date' },
    { label: 'Current Time', var: 'current_time' },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Auto Reply Templates</h2>
          <p className="text-sm text-slate-500 mt-1">
            Build reusable response templates with dynamic variables, delays, and multimedia attachments.
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary text-sm shadow-md shadow-blue-500/10">
          <Plus className="w-4 h-4" /> Create New Template
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((tpl) => (
          <div key={tpl.id} className="card p-6 flex flex-col justify-between hover:shadow-hover transition-all">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-xs">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-tight">{tpl.name}</h3>
                    <span className="text-[11px] text-slate-400 capitalize">{tpl.trigger_type.replace('_', ' ')}</span>
                  </div>
                </div>

                <span className={`badge text-[10px] ${tpl.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                  {tpl.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Delay Pill */}
              <div className="flex items-center gap-2 mb-3">
                <span className="badge bg-slate-100 text-slate-700 text-[11px]">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {tpl.delay_type === 'instant' && 'Instant Send'}
                  {tpl.delay_type === 'random' && `Random (${tpl.random_delay_min}-${tpl.random_delay_max}s)`}
                  {tpl.delay_type === 'fixed' && `Fixed Delay (${tpl.delay_seconds}s)`}
                </span>

                <span className="badge bg-blue-50 text-blue-700 border border-blue-100 text-[11px] uppercase">
                  {tpl.reply_type}
                </span>
              </div>

              {/* Body snippet */}
              <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 line-clamp-3 whitespace-pre-wrap font-sans border border-slate-100">
                {tpl.message_body || '<No text body>'}
              </div>

              {tpl.media && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span className="truncate">{tpl.media.file_name}</span>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {new Date(tpl.created_at).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(tpl)}
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit Template"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(tpl.id, tpl.name)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Delete Template"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for Create/Edit Template */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingId ? 'Edit Reply Template' : 'Create New Reply Template'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} aria-label="Close dialog" className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Template Name</label>
                <input
                  type="text"
                  placeholder="e.g. Price Quotation & Catalog"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trigger Context</label>
                  <select
                    value={triggerType}
                    onChange={(e) => setTriggerType(e.target.value as any)}
                    className="input-field"
                  >
                    <option value="auto_reply">Instant Welcome Auto-Reply</option>
                    <option value="keyword">Keyword Match Reply</option>
                    <option value="followup">Campaign Follow-up Step</option>
                    <option value="rule">IF/THEN Rule Engine</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Message Format</label>
                  <select
                    value={replyType}
                    onChange={(e) => setReplyType(e.target.value as any)}
                    className="input-field"
                  >
                    <option value="text">Text Only</option>
                    <option value="photo">Photo + Caption</option>
                    <option value="video">Video + Caption</option>
                    <option value="voice">Voice Note</option>
                    <option value="audio">Audio / MP3</option>
                    <option value="document">PDF / Doc Attachment</option>
                  </select>
                </div>
              </div>

              {/* Delay Controls */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <label className="block text-xs font-semibold text-slate-700">Reply Delay Strategy</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'instant', label: 'Instant' },
                    { id: 'fixed', label: 'Fixed Delay' },
                    { id: 'random', label: 'Random Jitter' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDelayType(opt.id as any)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
                        delayType === opt.id
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {delayType === 'fixed' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <input
                      type="number"
                      min="1"
                      value={delayValue}
                      onChange={(e) => setDelayValue(parseInt(e.target.value, 10) || 0)}
                      className="input-field"
                      placeholder="Duration"
                    />
                    <select
                      value={delayUnit}
                      onChange={(e) => setDelayUnit(e.target.value as any)}
                      className="input-field"
                    >
                      <option value="seconds">Seconds</option>
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                )}

                {delayType === 'random' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] text-slate-500">Min Seconds:</span>
                      <input
                        type="number"
                        value={randomMin}
                        onChange={(e) => setRandomMin(parseInt(e.target.value, 10) || 0)}
                        className="input-field mt-0.5"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Max Seconds:</span>
                      <input
                        type="number"
                        value={randomMax}
                        onChange={(e) => setRandomMax(parseInt(e.target.value, 10) || 0)}
                        className="input-field mt-0.5"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Variables Quick Inserter */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">Message Body</label>
                  <span className="text-[11px] text-slate-400">Click to insert tag</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {dynamicVariables.map((v) => (
                    <button
                      key={v.var}
                      type="button"
                      onClick={() => insertVariable(v.var)}
                      className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md text-[10px] font-medium transition-colors"
                    >
                      +{v.label}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={4}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Type your message content with {{first_name}}, {{username}}..."
                  className="input-field"
                />
              </div>

              {/* Media Picker */}
              {replyType !== 'text' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Attached Media</label>
                  <select
                    value={mediaId}
                    onChange={(e) => setMediaId(e.target.value)}
                    className="input-field"
                  >
                    <option value="">-- Choose from Media Library --</option>
                    {mediaList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.file_name} ({m.file_type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="templateActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="templateActive" className="text-xs font-medium text-slate-700">
                  Template is Active for automation
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
