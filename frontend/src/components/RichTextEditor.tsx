import React, { useState, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Quote,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link,
  AtSign,
  Hash,
  Smile,
  Sparkles,
  Undo,
  Redo,
  RemoveFormatting,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { AiAssistantModal } from './AiAssistantModal';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Type your message or use merge tags...',
  minHeight = '180px',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [history, setHistory] = useState<string[]>([value]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showVariablePicker, setShowVariablePicker] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  // Common Telegram variables
  const variables = [
    { tag: '<first_name>', label: 'First Name' },
    { tag: '<last_name>', label: 'Last Name' },
    { tag: '<username>', label: 'Username' },
    { tag: '<phone>', label: 'Phone Number' },
    { tag: '<telegram_id>', label: 'Telegram User ID' },
    { tag: '<country>', label: 'Country' },
    { tag: '<city>', label: 'City' },
    { tag: '<language>', label: 'Language' },
    { tag: '<current_date>', label: 'Current Date' },
    { tag: '<current_time>', label: 'Current Time' },
    { tag: '<campaign_name>', label: 'Campaign Name' },
  ];

  const emojis = ['👋', '🔥', '🚀', '✨', '💬', '🎉', '💡', '✅', '❤️', '🙌', '⭐', '⚡', '🎁', '📌', '📞', '🤝'];

  const pushHistory = (newVal: string) => {
    const updated = history.slice(0, historyIndex + 1);
    updated.push(newVal);
    setHistory(updated);
    setHistoryIndex(updated.length - 1);
    onChange(newVal);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      onChange(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      onChange(history[historyIndex + 1]);
    }
  };

  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const before = value.substring(0, start);
    const after = value.substring(end);

    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;
    const newVal = before + replacement + after;
    pushHistory(newVal);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText ? selectedText.length : 4));
    }, 0);
  };

  const insertVariable = (tag: string) => {
    insertFormatting(tag, '');
    setShowVariablePicker(false);
  };

  const insertEmoji = (emoji: string) => {
    insertFormatting(emoji, '');
    setShowEmojiPicker(false);
  };

  const clearFormatting = () => {
    // Strip markdown formatting symbols
    const clean = value.replace(/[*_~`#]/g, '');
    pushHistory(clean);
  };

  return (
    <div className="border border-slate-200 rounded-[18px] bg-white overflow-hidden shadow-2xs focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
      {/* Editor Toolbar */}
      <div className="p-2 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center gap-1">
        {/* Undo / Redo */}
        <div className="flex items-center border-r border-slate-200 pr-1.5 mr-1">
          <button
            type="button"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md disabled:opacity-30"
            title="Undo"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md disabled:opacity-30"
            title="Redo"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Text Formatting */}
        <button
          type="button"
          onClick={() => insertFormatting('*', '*')}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-md font-bold"
          title="Bold (*text*)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => insertFormatting('_', '_')}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-md italic"
          title="Italic (_text_)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => insertFormatting('<u>', '</u>')}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-md"
          title="Underline (<u>text</u>)"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => insertFormatting('~', '~')}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-md"
          title="Strikethrough (~text~)"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => insertFormatting('`', '`')}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-md font-mono"
          title="Monospace Code (`code`)"
        >
          <Code className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => insertFormatting('> ', '')}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-md"
          title="Quote Block (> quote)"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Headings & Lists */}
        <button
          type="button"
          onClick={() => insertFormatting('# ')}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-md"
          title="Heading 1"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => insertFormatting('## ')}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-md"
          title="Heading 2"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => insertFormatting('• ')}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-md"
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => insertFormatting('1. ')}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-md"
          title="Numbered List"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => insertFormatting('[Link Text](https://example.com)')}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-md"
          title="Hyperlink"
        >
          <Link className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => insertFormatting('@')}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-md"
          title="Telegram Mention (@username)"
        >
          <AtSign className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => insertFormatting('#')}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-md"
          title="Hashtag"
        >
          <Hash className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Emojis Picker Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-md transition-colors"
            title="Insert Emoji"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>
          {showEmojiPicker && (
            <div className="absolute top-full left-0 mt-1.5 p-2 bg-white rounded-xl shadow-xl border border-slate-200 grid grid-cols-4 gap-1 z-30 w-44 animate-in fade-in">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="p-1 text-lg hover:bg-slate-100 rounded-md text-center transition-transform hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Variables Picker Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowVariablePicker(!showVariablePicker)}
            className="px-2 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors flex items-center gap-1"
          >
            <span>+ Variable</span>
          </button>
          {showVariablePicker && (
            <div className="absolute top-full left-0 mt-1.5 p-1.5 bg-white rounded-xl shadow-xl border border-slate-200 w-52 z-30 max-h-56 overflow-y-auto animate-in fade-in">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Insert Merge Tag
              </div>
              {variables.map((v) => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => insertVariable(v.tag)}
                  className="w-full text-left px-2 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 rounded-lg flex items-center justify-between transition-colors"
                >
                  <span className="font-medium">{v.label}</span>
                  <code className="text-[10px] text-indigo-500 font-mono">{v.tag}</code>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear formatting */}
        <button
          type="button"
          onClick={clearFormatting}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md ml-auto"
          title="Clear formatting"
        >
          <RemoveFormatting className="w-3.5 h-3.5" />
        </button>

        {/* AI Copilot Button */}
        <button
          type="button"
          onClick={() => setShowAiModal(true)}
          className="px-2.5 py-1 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg shadow-2xs shadow-indigo-500/20 flex items-center gap-1.5 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Copilot</span>
        </button>
      </div>

      {/* Editor Content Area */}
      <div className="p-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            pushHistory(e.target.value);
          }}
          placeholder={placeholder}
          style={{ minHeight }}
          className="w-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none resize-y font-sans leading-relaxed bg-transparent"
        />
      </div>

      {/* Footer Info & Char Count */}
      <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between text-[11px] text-slate-400">
        <span>Supports Markdown, HTML & Merge Tags (`&lt;first_name&gt;`)</span>
        <span>{value.length} chars</span>
      </div>

      {/* AI Assistant Modal */}
      <AiAssistantModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        initialText={value}
        onApply={(text) => pushHistory(text)}
      />
    </div>
  );
};
