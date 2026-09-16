import React, { useState, useEffect } from 'react';
import { Conversation, TelegramMessage, apiClient } from '../api/client';
import {
  Search,
  Send,
  Paperclip,
  CheckCircle2,
  Clock,
  Tag,
  FileText,
  ShieldAlert,
  ShieldCheck,
  User,
  MoreVertical,
  Plus,
  Trash2,
  File,
  Image as ImageIcon
} from 'lucide-react';

interface InboxProps {
  selectedAccountId: string;
}

export const Inbox: React.FC<InboxProps> = ({ selectedAccountId }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'active' | 'completed' | 'blacklisted'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  // CRM sidebar edit state
  const [notes, setNotes] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    fetchConversations();
  }, [selectedAccountId, activeTab, searchQuery]);

  const fetchConversations = async () => {
    try {
      setLoadingList(true);
      const params: any = { status: activeTab };
      if (selectedAccountId) params.account_id = selectedAccountId;
      if (searchQuery) params.search = searchQuery;

      const res = await apiClient.get('/conversations', { params });
      const items = res.data.data || [];
      setConversations(items);

      if (items.length > 0 && !selectedConversation) {
        selectAndLoadConversation(items[0].id);
      }
    } catch (err) {
      console.error('Error fetching conversations', err);
    } finally {
      setLoadingList(false);
    }
  };

  const selectAndLoadConversation = async (id: string) => {
    try {
      const res = await apiClient.get(`/conversations/${id}`);
      setSelectedConversation(res.data);
      setNotes(res.data.notes || '');
    } catch (err) {
      console.error('Error loading conversation details', err);
    }
  };

  const handleSendManualReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversation || !replyText.trim() || sending) return;

    try {
      setSending(true);
      await apiClient.post(`/conversations/${selectedConversation.id}/reply`, {
        content: replyText.trim(),
        message_type: 'text',
      });
      setReplyText('');
      // Reload active conversation
      selectAndLoadConversation(selectedConversation.id);
      fetchConversations();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to dispatch reply');
    } finally {
      setSending(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedConversation) return;
    try {
      await apiClient.put(`/conversations/${selectedConversation.id}/notes`, { notes });
    } catch (err) {
      console.error('Error saving notes', err);
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversation || !newTag.trim()) return;

    const existingTags = selectedConversation.tags?.map((t) => t.tag_name) || [];
    if (existingTags.includes(newTag.trim())) return;

    const updated = [...existingTags, newTag.trim()];
    try {
      await apiClient.put(`/conversations/${selectedConversation.id}/tags`, { tags: updated });
      setNewTag('');
      selectAndLoadConversation(selectedConversation.id);
    } catch (err) {
      console.error('Error updating tags', err);
    }
  };

  const handleToggleBlacklist = async () => {
    if (!selectedConversation) return;
    try {
      await apiClient.post(`/conversations/${selectedConversation.id}/toggle-blacklist`);
      selectAndLoadConversation(selectedConversation.id);
      fetchConversations();
    } catch (err) {
      console.error('Error toggling blacklist', err);
    }
  };

  const filterTabs = [
    { id: 'all', label: 'All' },
    { id: 'new', label: 'New' },
    { id: 'active', label: 'Active Campaign' },
    { id: 'completed', label: 'Completed' },
    { id: 'blacklisted', label: 'Blacklisted' },
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-slate-50">
      {/* 1. Left List Pane */}
      <div className="w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0">
        {/* Search & Tabs */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search contacts, username, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none text-xs">
            {filterTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                  activeTab === t.id
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loadingList ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No conversations found for this filter.
            </div>
          ) : (
            conversations.map((c) => {
              const isSelected = selectedConversation?.id === c.id;
              const user = c.telegram_user;
              const name = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || `User #${user.telegram_id}` : 'Unknown';

              return (
                <button
                  key={c.id}
                  onClick={() => selectAndLoadConversation(c.id)}
                  className={`w-full p-4 text-left flex items-start gap-3 transition-colors ${
                    isSelected ? 'bg-blue-50/70 border-l-4 border-blue-600' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">
                    {name[0]?.toUpperCase() || 'U'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-slate-900 text-xs truncate">{name}</h4>
                      <span className="text-[10px] text-slate-400">
                        {c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 truncate">
                      {c.latest_message?.content || (c.latest_message?.message_type ? `[${c.latest_message.message_type}]` : 'No messages yet')}
                    </p>

                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`badge text-[10px] py-0 px-1.5 ${
                        c.status === 'active' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        c.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        c.status === 'blacklisted' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {c.status}
                      </span>

                      {c.unread_count > 0 && (
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Center Chat Stream Pane */}
      <div className="flex-1 flex flex-col bg-slate-50/50">
        {selectedConversation ? (
          <>
            {/* Chat Top Header */}
            <div className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                  {selectedConversation.telegram_user?.first_name?.[0] || 'U'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {selectedConversation.telegram_user?.first_name} {selectedConversation.telegram_user?.last_name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedConversation.telegram_user?.username ? `@${selectedConversation.telegram_user.username}` : `ID: ${selectedConversation.telegram_user?.telegram_id}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  Via: <strong>{selectedConversation.account?.alias}</strong>
                </span>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {selectedConversation.messages?.map((msg: TelegramMessage) => {
                const isInbound = msg.direction === 'inbound';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}
                  >
                    <div
                      className={`max-w-md px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                        isInbound
                          ? 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                          : 'bg-blue-600 text-white rounded-tr-xs'
                      }`}
                    >
                      {msg.media_path && (
                        <div className="mb-2 p-2 bg-black/10 rounded-lg flex items-center gap-2 text-[11px]">
                          <File className="w-4 h-4" />
                          <span>Media Attachment ({msg.message_type})</span>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 px-1">
                      <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {!isInbound && <span>• {msg.status}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Composer */}
            <div className="p-4 bg-white border-t border-slate-200">
              {selectedConversation.telegram_user?.is_blacklisted ? (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg text-center font-medium">
                  This user is currently blacklisted. Automated follow-ups and manual replies are disabled.
                </div>
              ) : (
                <form onSubmit={handleSendManualReply} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type an instant reply message..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={sending || !replyText.trim()}
                    className="btn-primary text-xs px-5 py-2.5 rounded-xl"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </button>
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
            Select a conversation from the left to view messages
          </div>
        )}
      </div>

      {/* 3. Right Contact Details & CRM Drawer */}
      {selectedConversation && (
        <div className="w-72 lg:w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto p-6 space-y-6">
          {/* Profile Details */}
          <div className="text-center pb-4 border-b border-slate-100">
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 font-bold text-lg flex items-center justify-center mx-auto mb-3 shadow-xs">
              {selectedConversation.telegram_user?.first_name?.[0] || 'U'}
            </div>
            <h3 className="font-bold text-slate-900 text-sm">
              {selectedConversation.telegram_user?.first_name} {selectedConversation.telegram_user?.last_name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedConversation.telegram_user?.username ? `@${selectedConversation.telegram_user.username}` : 'No username'}
            </p>
            <div className="text-[11px] text-slate-500 mt-2 font-mono">
              Telegram ID: {selectedConversation.telegram_user?.telegram_id}
            </div>
          </div>

          {/* CRM Tags */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5">
              {selectedConversation.tags?.map((t) => (
                <span key={t.id} className="badge bg-slate-100 text-slate-700 border border-slate-200 text-[11px]">
                  {t.tag_name}
                </span>
              ))}
            </div>
            <form onSubmit={handleAddTag} className="flex gap-1.5 pt-1">
              <input
                type="text"
                placeholder="+ Add tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="input-field text-xs py-1"
              />
              <button type="submit" className="btn-secondary text-xs px-2.5 py-1">
                Add
              </button>
            </form>
          </div>

          {/* CRM Notes */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Internal Agent Notes
            </label>
            <textarea
              rows={4}
              placeholder="Add client requirements, follow-up preferences, or deals..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleSaveNotes}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-[10px] text-slate-400 block">Auto-saves on blur</span>
          </div>

          {/* Blacklist Control */}
          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={handleToggleBlacklist}
              className={`w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 border transition-colors ${
                selectedConversation.telegram_user?.is_blacklisted
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
            >
              {selectedConversation.telegram_user?.is_blacklisted ? (
                <>
                  <ShieldCheck className="w-4 h-4" /> Remove from Blacklist
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" /> Add to Blacklist & Stop
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
