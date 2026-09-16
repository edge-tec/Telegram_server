import React, { useState, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Quote,
  List,
  Link2,
  Smile,
  Plus,
  Trash2,
  Image as ImageIcon,
  Film,
  FileText,
  FolderOpen,
  Eye,
  CheckCheck,
  ExternalLink,
  Phone,
  ChevronUp,
  ChevronDown,
  Layers,
  Lock,
  Unlock,
  AlertCircle,
  HelpCircle,
  Hash,
  Copy,
  Sparkles,
  UploadCloud,
  X
} from 'lucide-react';
import { apiClient, MediaItem, AdminAutoReplyMediaItem, AdminAutoReplyLinkItem, AdminAutoReplyButtonItem } from '../api/client';

export interface ComposerValue {
  messageText: string;
  messageFormat?: 'markdown' | 'html' | 'rich';
  media?: AdminAutoReplyMediaItem[];
  links?: AdminAutoReplyLinkItem[];
  buttons?: AdminAutoReplyButtonItem[];
  lockMessage?: boolean;
  lockMedia?: boolean;
  lockLinks?: boolean;
}

interface TelegramMessageComposerProps {
  value: ComposerValue;
  onChange: (val: ComposerValue) => void;
  isAdmin?: boolean;
  senderName?: string;
  senderHandle?: string;
  minHeight?: string;
}

export const TelegramMessageComposer: React.FC<TelegramMessageComposerProps> = ({
  value,
  onChange,
  isAdmin = false,
  senderName = 'TeleFlow Bot',
  senderHandle = '@teleflow_bot',
  minHeight = '180px',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<'editor' | 'media' | 'links' | 'buttons'>('editor');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showVariablePicker, setShowVariablePicker] = useState(false);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [mediaLibraryItems, setMediaLibraryItems] = useState<MediaItem[]>([]);
  const [mediaLibraryLoading, setMediaLibraryLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Link form state
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkType, setNewLinkType] = useState<'inline_url' | 'raw_url' | 'telegram_channel' | 'telegram_user'>('inline_url');

  // Button form state
  const [newBtnLabel, setNewBtnLabel] = useState('');
  const [newBtnType, setNewBtnType] = useState<'url' | 'telegram_url' | 'callback' | 'deep_link'>('url');
  const [newBtnData, setNewBtnData] = useState('');
  const [newBtnRow, setNewBtnRow] = useState(0);

  const variables = [
    { tag: '{{first_name}}', label: 'First Name', preview: 'Alex' },
    { tag: '{{last_name}}', label: 'Last Name', preview: 'Carter' },
    { tag: '{{username}}', label: 'Username', preview: '@alex_carter' },
    { tag: '{{telegram_id}}', label: 'Telegram ID', preview: '987654321' },
    { tag: '{{country}}', label: 'Country', preview: 'United States' },
    { tag: '{{language}}', label: 'Language', preview: 'en' },
    { tag: '{{current_date}}', label: 'Current Date', preview: new Date().toLocaleDateString() },
    { tag: '{{current_time}}', label: 'Current Time', preview: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    { tag: '{{custom_field}}', label: 'Custom Field', preview: 'VIP-Tier' },
  ];

  const emojis = ['👋', '🚀', '🔥', '✨', '💡', '✅', '💬', '🎉', '📌', '⭐', '⚡', '❤️', '🎁', '📞', '🤝', '🔒'];

  // Text formatting
  const insertFormatting = (prefix: string, suffix: string = prefix, defaultPlaceholder: string = 'text') => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.substring(start, end) || defaultPlaceholder;
    const replacement = `${prefix}${selected}${suffix}`;
    const newText = el.value.substring(0, start) + replacement + el.value.substring(end);

    onChange({ ...value, messageText: newText });

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const insertVariable = (tag: string) => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newText = el.value.substring(0, start) + tag + el.value.substring(end);

    onChange({ ...value, messageText: newText });
    setShowVariablePicker(false);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  // Upload Media
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      const currentMedia = value.media || [];
      const newMediaList: AdminAutoReplyMediaItem[] = [...currentMedia];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const res = await apiClient.post('/admin/auto-replies/upload-media', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const item = res.data?.data;
        if (item) {
          newMediaList.push({
            id: item.id,
            media_library_id: item.id,
            media_type: item.media_type,
            file_name: item.file_name,
            file_path: item.file_path,
            file_url: item.url,
            mime_type: item.mime_type,
            file_size: item.file_size,
            caption: '',
            order_index: newMediaList.length,
          });
        }
      }

      onChange({ ...value, media: newMediaList });
    } catch (err) {
      console.error('Failed to upload media', err);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Drag and drop image upload
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileList = e.dataTransfer.files;
      const fakeEvent = { target: { files: fileList, value: '' } } as any;
      handleFileUpload(fakeEvent);
    }
  };

  // Browse Media Library
  const openMediaLibrary = async () => {
    setIsMediaLibraryOpen(true);
    try {
      setMediaLibraryLoading(true);
      const res = await apiClient.get('/media');
      setMediaLibraryItems(res.data || []);
    } catch (err) {
      console.error('Failed to fetch media library', err);
    } finally {
      setMediaLibraryLoading(false);
    }
  };

  const selectMediaFromLibrary = (item: MediaItem) => {
    const currentMedia = value.media || [];
    const newMediaItem: AdminAutoReplyMediaItem = {
      id: item.id,
      media_library_id: item.id,
      media_type: (item.file_type as any) || 'photo',
      file_name: item.file_name,
      file_path: item.file_path,
      file_url: item.url || `/storage/${item.file_path}`,
      file_size: item.file_size,
      caption: '',
      order_index: currentMedia.length,
    };

    onChange({ ...value, media: [...currentMedia, newMediaItem] });
    setIsMediaLibraryOpen(false);
  };

  const removeMedia = (idx: number) => {
    const currentMedia = value.media || [];
    const updated = currentMedia.filter((_, i) => i !== idx);
    onChange({ ...value, media: updated });
  };

  const moveMedia = (idx: number, direction: 'up' | 'down') => {
    const currentMedia = [...(value.media || [])];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentMedia.length) return;

    const temp = currentMedia[idx];
    currentMedia[idx] = currentMedia[targetIdx];
    currentMedia[targetIdx] = temp;
    onChange({ ...value, media: currentMedia });
  };

  // Link manager
  const addLink = () => {
    if (!newLinkUrl.trim()) return;
    const currentLinks = value.links || [];
    const newLink: AdminAutoReplyLinkItem = {
      label: newLinkLabel.trim() || newLinkUrl.trim(),
      url: newLinkUrl.trim(),
      link_type: newLinkType,
      order_index: currentLinks.length,
    };

    onChange({ ...value, links: [...currentLinks, newLink] });
    setNewLinkUrl('');
    setNewLinkLabel('');
  };

  const removeLink = (idx: number) => {
    const currentLinks = value.links || [];
    onChange({ ...value, links: currentLinks.filter((_, i) => i !== idx) });
  };

  // Button manager
  const addButton = () => {
    if (!newBtnLabel.trim() || !newBtnData.trim()) return;
    const currentBtns = value.buttons || [];
    const newBtn: AdminAutoReplyButtonItem = {
      row_index: newBtnRow,
      col_index: currentBtns.filter((b) => b.row_index === newBtnRow).length,
      label: newBtnLabel.trim(),
      button_type: newBtnType,
      data: newBtnData.trim(),
      order_index: currentBtns.length,
    };

    onChange({ ...value, buttons: [...currentBtns, newBtn] });
    setNewBtnLabel('');
    setNewBtnData('');
  };

  const removeButton = (idx: number) => {
    const currentBtns = value.buttons || [];
    onChange({ ...value, buttons: currentBtns.filter((_, i) => i !== idx) });
  };

  // Live variable replacement for Telegram preview
  const renderPreviewText = (text: string) => {
    let res = text || '';
    variables.forEach((v) => {
      const reg = new RegExp(v.tag, 'g');
      res = res.replace(reg, v.preview);
    });
    return res;
  };

  // Group buttons by row for realistic Telegram keyboard preview
  const groupedButtons: { [row: number]: AdminAutoReplyButtonItem[] } = {};
  (value.buttons || []).forEach((b) => {
    const r = b.row_index || 0;
    if (!groupedButtons[r]) groupedButtons[r] = [];
    groupedButtons[r].push(b);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT COLUMN: Composer Controls & Editors */}
      <div className="lg:col-span-7 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'editor'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Rich Text Editor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('media')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'media'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Media ({value.media?.length || 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('links')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'links'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Links ({value.links?.length || 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('buttons')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'buttons'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Buttons ({value.buttons?.length || 0})</span>
            </button>
          </div>

          {/* Admin Override Locks */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Admin Locks:</span>
              <button
                type="button"
                onClick={() => onChange({ ...value, lockMessage: !value.lockMessage })}
                title="Lock Message Content"
                className={`p-1 rounded-md border ${
                  value.lockMessage ? 'bg-amber-50 text-amber-700 border-amber-200' : 'text-slate-400 border-slate-200'
                }`}
              >
                {value.lockMessage ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...value, lockMedia: !value.lockMedia })}
                title="Lock Media Attachments"
                className={`p-1 rounded-md border ${
                  value.lockMedia ? 'bg-amber-50 text-amber-700 border-amber-200' : 'text-slate-400 border-slate-200'
                }`}
              >
                {value.lockMedia ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...value, lockLinks: !value.lockLinks })}
                title="Lock Links & Buttons"
                className={`p-1 rounded-md border ${
                  value.lockLinks ? 'bg-amber-50 text-amber-700 border-amber-200' : 'text-slate-400 border-slate-200'
                }`}
              >
                {value.lockLinks ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: Rich Text Editor */}
        {activeTab === 'editor' && (
          <div className="space-y-3">
            {/* Formatting Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border border-slate-200 rounded-xl">
              <button
                type="button"
                onClick={() => insertFormatting('**')}
                title="Bold"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('*')}
                title="Italic"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('<u>', '</u>')}
                title="Underline"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('~')}
                title="Strikethrough"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('`')}
                title="Inline Code"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('> ', '')}
                title="Quote"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('- ', '')}
                title="Bullet List"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              >
                <List className="w-3.5 h-3.5" />
              </button>

              <div className="w-px h-4 bg-slate-200 mx-1" />

              {/* Variables Picker Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowVariablePicker(!showVariablePicker)}
                  className="px-2.5 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Insert Variable</span>
                </button>

                {showVariablePicker && (
                  <div className="absolute left-0 mt-1 w-52 bg-white rounded-xl border border-slate-200 shadow-lg p-2 z-20 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                      Select Variable
                    </div>
                    {variables.map((v) => (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => insertVariable(v.tag)}
                        className="w-full text-left px-2 py-1.5 text-xs hover:bg-indigo-50 rounded-lg flex items-center justify-between text-slate-700"
                      >
                        <span className="font-semibold">{v.label}</span>
                        <span className="font-mono text-[10px] text-indigo-600">{v.tag}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Emoji Picker Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1.5 text-slate-600 hover:text-amber-500 hover:bg-white rounded-lg transition-colors"
                >
                  <Smile className="w-3.5 h-3.5" />
                </button>

                {showEmojiPicker && (
                  <div className="absolute left-0 mt-1 p-2 bg-white rounded-xl border border-slate-200 shadow-lg grid grid-cols-4 gap-1.5 z-20">
                    {emojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          insertFormatting(emoji, '', '');
                          setShowEmojiPicker(false);
                        }}
                        className="p-1.5 text-base hover:bg-slate-100 rounded"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Message Textarea */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="relative"
            >
              <textarea
                ref={textareaRef}
                rows={8}
                value={value.messageText}
                onChange={(e) => onChange({ ...value, messageText: e.target.value })}
                placeholder="Type your automated message here... Supports Markdown, HTML, and {{variables}}."
                style={{ minHeight }}
                className="w-full p-3.5 text-xs font-mono border border-slate-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed bg-white shadow-xs"
              />
              <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Tip: Drag & drop an image or paste anywhere in this box to attach media.</span>
                <span>{value.messageText?.length || 0} characters</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Media Management (Images, Videos, GIFs, Documents) */}
        {activeTab === 'media' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Media Attachments</h4>
                <p className="text-[11px] text-slate-500">Attach photos, MP4 videos, animated GIFs, or documents</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openMediaLibrary}
                  className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-indigo-600" />
                  Media Library
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.docx,.xlsx,.zip,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  {isUploading ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </div>

            {/* Media List */}
            {(!value.media || value.media.length === 0) ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-2 bg-slate-50/50"
              >
                <UploadCloud className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Drag and drop images, videos, or files here</p>
                <p className="text-[11px] text-slate-400">Supports JPG, PNG, WEBP, GIF, MP4, PDF, DOCX, ZIP up to 50MB</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {value.media.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {m.media_type === 'photo' || m.media_type === 'gif' ? (
                        <img
                          src={m.file_url || m.file_path}
                          alt={m.file_name}
                          className="w-12 h-12 object-cover rounded-lg border border-slate-100"
                        />
                      ) : m.media_type === 'video' ? (
                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-indigo-600">
                          <Film className="w-6 h-6" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                          <FileText className="w-6 h-6" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">{m.file_name || 'Attached File'}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span className="uppercase font-semibold text-indigo-600">{m.media_type}</span>
                          {m.file_size && <span>• {Math.round(m.file_size / 1024)} KB</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveMedia(idx, 'up')}
                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === (value.media?.length || 1) - 1}
                        onClick={() => moveMedia(idx, 'down')}
                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMedia(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Clickable Links */}
        {activeTab === 'links' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900">Clickable Message Links</h4>
              <p className="text-[11px] text-slate-500">Append structured URL or Telegram links at the bottom of the message</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newLinkLabel}
                  onChange={(e) => setNewLinkLabel(e.target.value)}
                  placeholder="Link Title (e.g. Website)"
                  className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                />
                <input
                  type="text"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="https://t.me/example"
                  className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                />
                <div className="flex gap-1.5">
                  <select
                    value={newLinkType}
                    onChange={(e) => setNewLinkType(e.target.value as any)}
                    className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="inline_url">Web URL</option>
                    <option value="telegram_channel">TG Channel</option>
                    <option value="telegram_user">TG User</option>
                  </select>
                  <button
                    type="button"
                    onClick={addLink}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {value.links && value.links.length > 0 && (
              <div className="space-y-1.5">
                {value.links.map((link, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Link2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="font-bold text-slate-800">{link.label}</span>
                      <span className="text-slate-400 truncate">{link.url}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLink(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Inline Buttons */}
        {activeTab === 'buttons' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900">Telegram Inline Buttons</h4>
              <p className="text-[11px] text-slate-500">Interactive inline keyboard buttons rendered below the chat bubble</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={newBtnLabel}
                  onChange={(e) => setNewBtnLabel(e.target.value)}
                  placeholder="Button Label"
                  className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                />
                <select
                  value={newBtnType}
                  onChange={(e) => setNewBtnType(e.target.value as any)}
                  className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="url">URL</option>
                  <option value="telegram_url">Telegram Channel/Bot</option>
                  <option value="callback">Callback Action</option>
                  <option value="deep_link">Deep Link</option>
                </select>
                <input
                  type="text"
                  value={newBtnData}
                  onChange={(e) => setNewBtnData(e.target.value)}
                  placeholder="URL or payload"
                  className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                />
                <div className="flex gap-1.5">
                  <select
                    value={newBtnRow}
                    onChange={(e) => setNewBtnRow(parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value={0}>Row 1</option>
                    <option value={1}>Row 2</option>
                    <option value={2}>Row 3</option>
                  </select>
                  <button
                    type="button"
                    onClick={addButton}
                    className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {value.buttons && value.buttons.length > 0 && (
              <div className="space-y-1.5">
                {value.buttons.map((btn, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        Row {(btn.row_index || 0) + 1}
                      </span>
                      <span className="font-bold text-slate-800">{btn.label}</span>
                      <span className="text-slate-400 truncate max-w-xs">{btn.data}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeButton(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Real-Time Telegram Chat Preview */}
      <div className="lg:col-span-5 sticky top-6">
        <div className="bg-[#7ba4c9]/25 border border-slate-200/80 rounded-3xl p-4 shadow-sm space-y-3">
          {/* Chat Window Header */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3 flex items-center justify-between border border-slate-200/60 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                {senderName.charAt(0)}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 leading-tight">{senderName}</h4>
                <span className="text-[10px] text-blue-600 font-medium">bot • {senderHandle}</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Live Preview
            </span>
          </div>

          {/* Telegram Chat Bubble */}
          <div className="bg-white rounded-2xl rounded-bl-xs p-3.5 border border-slate-200 shadow-xs space-y-3 max-w-sm">
            {/* Media Rendering */}
            {value.media && value.media.length > 0 && (
              <div className="space-y-2">
                {value.media.map((m, i) => (
                  <div key={i} className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                    {m.media_type === 'photo' || m.media_type === 'gif' ? (
                      <img
                        src={m.file_url || m.file_path}
                        alt={m.file_name}
                        className="w-full max-h-48 object-cover"
                      />
                    ) : m.media_type === 'video' ? (
                      <video
                        src={m.file_url || m.file_path}
                        controls
                        className="w-full max-h-48 object-cover"
                      />
                    ) : (
                      <div className="p-3 flex items-center gap-2.5">
                        <FileText className="w-8 h-8 text-indigo-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate">{m.file_name}</div>
                          <div className="text-[10px] text-slate-400">{Math.round((m.file_size || 0) / 1024)} KB Document</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Formatted Text */}
            <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-line font-sans">
              {renderPreviewText(value.messageText) || (
                <span className="text-slate-300 italic">Message preview will appear here...</span>
              )}
            </div>

            {/* Links Block */}
            {value.links && value.links.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                {value.links.map((l, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    {l.label}
                  </span>
                ))}
              </div>
            )}

            {/* Message Meta */}
            <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1 pt-1">
              <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
            </div>
          </div>

          {/* Inline Buttons Rendering in Grid */}
          {Object.keys(groupedButtons).length > 0 && (
            <div className="space-y-1.5 max-w-sm">
              {Object.keys(groupedButtons).map((rowKey) => {
                const rowBtns = groupedButtons[parseInt(rowKey)];
                return (
                  <div key={rowKey} className="flex gap-1.5">
                    {rowBtns.map((btn, bIdx) => (
                      <div
                        key={bIdx}
                        className="flex-1 py-2 px-2.5 bg-white/95 hover:bg-white text-blue-600 rounded-xl font-bold text-xs text-center border border-slate-200/80 shadow-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 text-blue-400" />
                        <span className="truncate">{btn.label}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Media Library Browser */}
      {isMediaLibraryOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Select From Media Library</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMediaLibraryOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {mediaLibraryLoading ? (
              <div className="text-center py-12 text-xs text-slate-400">Loading media library...</div>
            ) : mediaLibraryItems.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">No media found in library.</div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-1">
                {mediaLibraryItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => selectMediaFromLibrary(item)}
                    className="p-2 border border-slate-200 hover:border-indigo-500 rounded-xl cursor-pointer group transition-all text-center space-y-1.5 bg-slate-50/50 hover:bg-indigo-50/30"
                  >
                    {item.file_type === 'photo' ? (
                      <img
                        src={item.url || `/storage/${item.file_path}`}
                        alt={item.file_name}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                    ) : item.file_type === 'video' ? (
                      <div className="w-full h-20 bg-slate-100 rounded-lg flex items-center justify-center text-indigo-600">
                        <Film className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="w-full h-20 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}
                    <div className="text-[10px] font-bold text-slate-700 truncate">{item.file_name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
