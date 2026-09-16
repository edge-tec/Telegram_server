import React, { useState, useEffect } from 'react';
import { KeywordRule, ReplyTemplate, TelegramAccount, apiClient } from '../api/client';
import {
  Zap,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Sliders,
  X
} from 'lucide-react';

interface RulesProps {
  accounts: TelegramAccount[];
}

export const Rules: React.FC<RulesProps> = ({ accounts }) => {
  const [rules, setRules] = useState<KeywordRule[]>([]);
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [keywordsInput, setKeywordsInput] = useState('');
  const [matchType, setMatchType] = useState<'contains' | 'exact'>('contains');
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [priority, setPriority] = useState(10);
  const [templateId, setTemplateId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchRules();
    fetchTemplates();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/rules');
      setRules(res.data);
    } catch (err) {
      console.error('Error fetching rules', err);
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
    setKeywordsInput('');
    setMatchType('contains');
    setIsCaseSensitive(false);
    setPriority(10);
    setTemplateId(templates[0]?.id || '');
    setAccountId('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();

    const kwArray = keywordsInput
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (kwArray.length === 0) {
      alert('Please enter at least one keyword');
      return;
    }

    const payload = {
      keywords: kwArray,
      match_type: matchType,
      is_case_sensitive: isCaseSensitive,
      priority,
      template_id: templateId,
      account_id: accountId || null,
      is_active: isActive,
    };

    try {
      if (editingId) {
        await apiClient.put(`/rules/${editingId}`, payload);
      } else {
        await apiClient.post('/rules', payload);
      }
      setIsModalOpen(false);
      fetchRules();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save rule');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this keyword rule?')) return;
    try {
      await apiClient.delete(`/rules/${id}`);
      fetchRules();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Keyword & IF / THEN Rules</h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure automated keyword triggers, exact or contains matching, and priority ordering.
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary text-sm shadow-md shadow-blue-500/10">
          <Plus className="w-4 h-4" /> Create Keyword Rule
        </button>
      </div>

      {/* Rules Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Priority</th>
                <th className="px-6 py-3.5 font-semibold">Trigger Keywords</th>
                <th className="px-6 py-3.5 font-semibold">Match Condition</th>
                <th className="px-6 py-3.5 font-semibold">Assigned Response Template</th>
                <th className="px-6 py-3.5 font-semibold">Target Account</th>
                <th className="px-6 py-3.5 font-semibold">Status</th>
                <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-blue-600">
                    #{r.priority}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {r.keywords.map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-md font-mono text-[11px]">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="badge bg-slate-100 text-slate-700 capitalize">
                      {r.match_type} Match {r.is_case_sensitive ? '(Case-Sensitive)' : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{r.template?.name}</div>
                    <div className="text-[11px] text-slate-400 uppercase">{r.template?.reply_type}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">
                    {r.account ? r.account.alias : 'All Accounts (Global)'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge ${r.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                      {r.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Create Keyword Trigger Rule</h3>
              <button onClick={() => setIsModalOpen(false)} aria-label="Close dialog" className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trigger Keywords (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. price, cost, quotation, package, discount"
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  required
                  className="input-field"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Separate multiple triggers with commas.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Match Type</label>
                  <select
                    value={matchType}
                    onChange={(e) => setMatchType(e.target.value as any)}
                    className="input-field"
                  >
                    <option value="contains">Contains Keyword</option>
                    <option value="exact">Exact Phrase Match</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority (Higher runs first)</label>
                  <input
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value, 10) || 0)}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Response Template</label>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  required
                  className="input-field"
                >
                  <option value="">-- Choose Template --</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.reply_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Account</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="input-field"
                >
                  <option value="">All Connected Accounts</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.alias} ({a.phone_masked})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCaseSensitive}
                    onChange={(e) => setIsCaseSensitive(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  Case-Sensitive Matching
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  Rule Active
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
