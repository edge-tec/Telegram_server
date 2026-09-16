import React, { useState, useEffect } from 'react';
import { Tag, Plus, Copy, Check, Trash2, Edit, Search, Sparkles, RefreshCw, HelpCircle } from 'lucide-react';
import { apiClient, TelegramVariable } from '../api/client';

export const VariablesManager: React.FC = () => {
  const [variables, setVariables] = useState<TelegramVariable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVar, setEditingVar] = useState<TelegramVariable | null>(null);
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'system' | 'custom' | 'contact' | 'ecommerce'>('custom');
  const [fallbackValue, setFallbackValue] = useState('');
  const [description, setDescription] = useState('');

  // Live Sandbox Preview State
  const [sandboxText, setSandboxText] = useState(
    'Hello <first_name> <last_name> (@<username>)!\nYour Telegram ID is <telegram_id> and registered phone is <phone>.\nToday is <current_date> and we have a special offer for <city> residents!'
  );
  const [previewOutput, setPreviewOutput] = useState('');

  useEffect(() => {
    fetchVariables();
  }, []);

  useEffect(() => {
    runPreview();
  }, [sandboxText, variables]);

  const fetchVariables = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/variables');
      setVariables(res.data);
    } catch (err) {
      console.error('Failed to load variables', err);
    } finally {
      setIsLoading(false);
    }
  };

  const runPreview = async () => {
    try {
      const res = await apiClient.post('/variables/preview', {
        template_text: sandboxText,
      });
      setPreviewOutput(res.data.rendered);
    } catch (err) {
      console.error('Failed preview', err);
    }
  };

  const handleCopy = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedKey(tag);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const openCreateModal = () => {
    setEditingVar(null);
    setKey('');
    setName('');
    setCategory('custom');
    setFallbackValue('');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (v: TelegramVariable) => {
    setEditingVar(v);
    setKey(v.key);
    setName(v.name);
    setCategory(v.category);
    setFallbackValue(v.fallback_value || '');
    setDescription(v.description || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || !name.trim()) return;

    try {
      if (editingVar) {
        await apiClient.put(`/variables/${editingVar.id}`, {
          name,
          category,
          fallback_value: fallbackValue,
          description,
        });
      } else {
        await apiClient.post('/variables', {
          key: key.toLowerCase().replace(/\s+/g, '_'),
          name,
          category,
          fallback_value: fallbackValue,
          description,
        });
      }
      setIsModalOpen(false);
      fetchVariables();
    } catch (err) {
      console.error('Failed to save variable', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this custom variable?')) return;
    try {
      await apiClient.delete(`/variables/${id}`);
      fetchVariables();
    } catch (err) {
      console.error('Failed to delete variable', err);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header Card */}
      <div className="card-glass p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-[20px] bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Tag className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Variables & Merge Tags</h1>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                v3.0 Placeholders
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Personalize every auto-reply and follow-up campaign with dynamic contact attributes and custom merge tags.
            </p>
          </div>
        </div>

        <button onClick={openCreateModal} className="btn-primary text-sm font-semibold py-3 px-5">
          <Plus className="w-4 h-4" />
          Add Custom Variable
        </button>
      </div>

      {/* Main Grid: Variables List & Live Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Variables Table (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="card-enterprise p-5 bg-white border border-slate-200/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>Available Variables</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {variables.length}
                </span>
              </h3>
              <span className="text-[11px] text-slate-400">Click any tag to copy</span>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-slate-400 text-xs">Loading variables...</div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                {variables.map((v) => {
                  const tagSyntax = `<${v.key}>`;
                  const isCopied = copiedKey === tagSyntax;
                  return (
                    <div
                      key={v.id}
                      className="py-3 px-1.5 flex items-center justify-between hover:bg-slate-50/60 rounded-xl transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(tagSyntax)}
                          className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200/60 flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Click to copy tag"
                        >
                          <span>{tagSyntax}</span>
                          {isCopied ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-indigo-400 group-hover:text-indigo-600" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{v.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{v.description || 'Dynamic variable'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {v.category}
                        </span>

                        {!v.is_system ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(v)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded-md transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(v.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                            System
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Resolution Sandbox (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="card-enterprise p-5 bg-white border border-slate-200/80 space-y-4 sticky top-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Live Variable Sandbox
              </h3>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Real-time
              </span>
            </div>

            {/* Template Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Template with Merge Tags:
              </label>
              <textarea
                value={sandboxText}
                onChange={(e) => setSandboxText(e.target.value)}
                rows={5}
                className="w-full p-3 border border-slate-200 rounded-xl text-xs font-mono bg-slate-50/50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Simulated Live Output */}
            <div>
              <label className="block text-xs font-semibold text-indigo-700 mb-1 flex items-center justify-between">
                <span>Simulated Output:</span>
                <span className="text-[10px] text-slate-400">Sample: Alex Carter (@alex)</span>
              </label>
              <div className="p-3.5 bg-gradient-to-tr from-indigo-50/40 to-purple-50/30 rounded-xl border border-indigo-100 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed shadow-2xs font-sans">
                {previewOutput || <span className="italic text-slate-400">No output</span>}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 leading-normal border border-slate-100">
              💡 <b>Tip:</b> Both <code>&lt;variable&gt;</code> and <code>&#123;&#123;variable&#125;&#125;</code> tags are seamlessly parsed by TeleFlow's messaging engine before sending to Telegram.
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[24px] shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="text-sm font-bold text-slate-900">
                {editingVar ? 'Edit Variable' : 'Create Custom Variable'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3.5">
              {!editingVar && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tag Key (Used inside &lt;...&gt;) *
                  </label>
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="e.g. promo_code"
                    required
                    className="input-field font-mono text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Variable Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Promotional Discount Code"
                  required
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="input-field text-xs"
                >
                  <option value="custom">Custom</option>
                  <option value="contact">Contact</option>
                  <option value="ecommerce">E-Commerce</option>
                  <option value="system">System</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fallback Value (If contact has no data)
                </label>
                <input
                  type="text"
                  value={fallbackValue}
                  onChange={(e) => setFallbackValue(e.target.value)}
                  placeholder="e.g. SAVE20"
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what this variable represents..."
                  rows={2}
                  className="input-field text-xs resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs font-semibold">
                  {editingVar ? 'Save Changes' : 'Create Variable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
