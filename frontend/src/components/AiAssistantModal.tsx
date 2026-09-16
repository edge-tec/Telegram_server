import React, { useState } from 'react';
import { Sparkles, Wand2, ArrowRight, Languages, Check, X, Loader2, Volume2 } from 'lucide-react';
import { apiClient } from '../api/client';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText: string;
  onApply: (transformedText: string) => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  initialText,
  onApply,
}) => {
  const [inputText, setInputText] = useState(initialText);
  const [resultText, setResultText] = useState('');
  const [activeAction, setActiveAction] = useState<string>('improve');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initialText when modal opens
  React.useEffect(() => {
    setInputText(initialText);
    setResultText('');
    setError(null);
  }, [initialText, isOpen]);

  if (!isOpen) return null;

  const tools = [
    { id: 'improve', label: 'Improve Message', icon: Sparkles, desc: 'Polish grammar, clarity & flow' },
    { id: 'tone_professional', label: 'Professional Tone', icon: Wand2, desc: 'Formal, polite, enterprise style' },
    { id: 'tone_friendly', label: 'Friendly Tone', icon: Wand2, desc: 'Warm, welcoming & cheerful' },
    { id: 'tone_sales', label: 'Sales & Offer Tone', icon: Wand2, desc: 'High-converting & action-oriented' },
    { id: 'tone_support', label: 'Support Tone', icon: Wand2, desc: 'Empathetic & customer-centric' },
    { id: 'english_to_bangla', label: 'English ➔ Bangla', icon: Languages, desc: 'Translate into natural Bengali' },
    { id: 'bangla_to_english', label: 'Bangla ➔ English', icon: Languages, desc: 'Translate into fluent English' },
    { id: 'shorten', label: 'Shorten & Condense', icon: Wand2, desc: 'Brief, concise & punchy' },
    { id: 'expand', label: 'Expand & Nurture', icon: Wand2, desc: 'Add helpful bullet points & details' },
    { id: 'grammar_fix', label: 'Grammar Fix', icon: Check, desc: 'Correct typos and punctuation' },
    { id: 'emoji_suggestion', label: 'Add Emojis', icon: Sparkles, desc: 'Enhance visual engagement' },
  ];

  const handleExecute = async (actionId: string) => {
    if (!inputText.trim()) {
      setError('Please provide message text to transform.');
      return;
    }
    setActiveAction(actionId);
    setIsLoading(true);
    setError(null);

    try {
      const res = await apiClient.post('/ai-assistant/transform', {
        action: actionId,
        text: inputText,
      });
      setResultText(res.data.result || '');
    } catch (err: any) {
      console.error('AI assistant error', err);
      setError(err.response?.data?.message || 'Failed to transform message with AI');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[24px] shadow-2xl border border-slate-100 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Telegram AI Message Copilot
                <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 tracking-wider">
                  Enterprise
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Rewrite, translate, optimize tone, or convert Bangla ↔ English with one click
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Action Pills Grid */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Choose AI Transformation
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {tools.map((tool) => {
                const Icon = tool.icon;
                const isSelected = activeAction === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => handleExecute(tool.id)}
                    disabled={isLoading}
                    className={`p-3 text-left rounded-xl border transition-all flex flex-col gap-1.5 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold flex items-center gap-1.5">
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                        {tool.label}
                      </span>
                      {isSelected && isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{tool.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Before & After Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input / Before */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                <span>Original Message</span>
                <span className="text-[11px] text-slate-400">{inputText.length} characters</span>
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type or paste message here..."
                rows={7}
                className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none bg-slate-50/50"
              />
            </div>

            {/* Output / After */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                <span className="text-indigo-700 font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  AI Suggested Result
                </span>
                {resultText && (
                  <span className="text-[11px] text-emerald-600 font-semibold">Ready to apply</span>
                )}
              </label>
              <div className="relative flex-1">
                <textarea
                  value={resultText}
                  onChange={(e) => setResultText(e.target.value)}
                  placeholder={isLoading ? 'AI is processing your message...' : 'AI result will appear here...'}
                  rows={7}
                  readOnly={isLoading}
                  className={`w-full h-full p-3.5 border rounded-xl text-sm outline-none resize-none transition-all ${
                    resultText
                      ? 'border-indigo-300 bg-indigo-50/20 text-slate-800'
                      : 'border-slate-200 bg-white text-slate-400'
                  }`}
                />
                {isLoading && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center rounded-xl">
                    <div className="flex items-center gap-2 text-indigo-600 text-xs font-semibold">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating AI response...
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <button
            onClick={() => handleExecute(activeAction)}
            disabled={isLoading || !inputText.trim()}
            className="btn-secondary text-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Re-generate
          </button>

          <div className="flex items-center gap-2.5">
            <button onClick={onClose} className="btn-secondary text-xs">
              Cancel
            </button>
            <button
              onClick={() => {
                if (resultText) {
                  onApply(resultText);
                  onClose();
                }
              }}
              disabled={!resultText.trim()}
              className="btn-primary text-xs"
            >
              <Check className="w-3.5 h-3.5" />
              Apply to Editor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
