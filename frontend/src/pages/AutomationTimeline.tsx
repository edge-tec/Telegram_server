import React, { useState, useEffect } from 'react';
import {
  History,
  ArrowDownLeft,
  ArrowUpRight,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pause,
  Filter,
  RefreshCw,
  Search,
  MessageSquare,
  FileText,
  User,
} from 'lucide-react';
import { apiClient, TimelineEvent } from '../api/client';

export const AutomationTimeline: React.FC = () => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchTimeline();
  }, []);

  const fetchTimeline = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/logs/timeline');
      setEvents(res.data || []);
    } catch (err) {
      console.error('Failed to load timeline', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'incoming_message':
        return {
          icon: <ArrowDownLeft className="w-3.5 h-3.5 text-blue-600" />,
          label: 'Incoming Message',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'outbound_reply':
        return {
          icon: <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />,
          label: 'Auto Reply Sent',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'media_sent':
        return {
          icon: <FileText className="w-3.5 h-3.5 text-purple-600" />,
          label: 'Media Delivered',
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'followup_sent':
        return {
          icon: <Clock className="w-3.5 h-3.5 text-indigo-600" />,
          label: 'Follow-Up #1 Sent',
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        };
      case 'sequence_paused':
        return {
          icon: <Pause className="w-3.5 h-3.5 text-amber-600" />,
          label: 'Sequence Paused',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      default:
        return {
          icon: <Zap className="w-3.5 h-3.5 text-slate-600" />,
          label: type.replace(/_/g, ' '),
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' • ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  const filteredEvents = events.filter((e) => {
    const matchSearch =
      (e.contact && e.contact.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.content && e.content.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchType = filterType === 'all' || e.event_type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Top Banner Header */}
      <div className="card-glass p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-[20px] bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <History className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Conversation Timeline</h1>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                Full History
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Event-by-event automation audit log: incoming inquiries, automated replies, media dispatches, and follow-up nurture events.
            </p>
          </div>
        </div>

        <button
          onClick={fetchTimeline}
          disabled={isLoading}
          className="btn-secondary text-xs font-semibold py-2.5 px-4 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Timeline
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search contact or content..."
            className="input-field pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Event Types</option>
            <option value="incoming_message">Incoming Message</option>
            <option value="outbound_reply">Auto Reply Sent</option>
            <option value="media_sent">Media Sent</option>
            <option value="followup_sent">Follow-Up Sent</option>
            <option value="sequence_paused">Sequence Paused</option>
          </select>
        </div>
      </div>

      {/* Timeline Stream */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Loading timeline events...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="card-enterprise p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No events recorded</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            As Telegram inquiries are received and automations trigger, they will stream here in real time.
          </p>
        </div>
      ) : (
        <div className="card-enterprise p-6 bg-white border border-slate-200/80">
          <div className="relative border-l-2 border-slate-100 ml-4 space-y-6">
            {filteredEvents.map((evt, idx) => {
              const badge = getEventBadge(evt.event_type);
              return (
                <div key={evt.id || idx} className="relative pl-6 group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center group-hover:scale-125 transition-transform" />

                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-100 hover:shadow-xs transition-all space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={`badge text-[10px] font-bold border capitalize ${badge.bg}`}>
                          {badge.icon}
                          {badge.label}
                        </span>
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {evt.contact} {evt.contact_handle && <span className="text-indigo-600 font-medium">({evt.contact_handle})</span>}
                        </span>
                      </div>

                      <span className="text-[11px] font-medium text-slate-400">
                        {formatTimestamp(evt.timestamp)}
                      </span>
                    </div>

                    {evt.content && (
                      <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/70 font-normal leading-relaxed">
                        {evt.content}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Account: <b className="text-slate-600">{evt.account}</b></span>
                      <button
                        onClick={() => setSelectedEvent(evt)}
                        className="text-indigo-600 hover:underline font-semibold"
                      >
                        Inspect Event Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event Details Inspector Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[24px] shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="text-sm font-bold text-slate-900">Automation Event Inspector</h3>
              <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Event Type:</span>
                <span className="font-bold text-slate-800">{selectedEvent.event_type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Contact:</span>
                <span className="font-bold text-slate-800">{selectedEvent.contact}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Account:</span>
                <span className="font-bold text-slate-800">{selectedEvent.account}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Timestamp:</span>
                <span className="font-mono text-slate-700">{selectedEvent.timestamp}</span>
              </div>
              {selectedEvent.content && (
                <div>
                  <span className="text-slate-500 font-medium block mb-1">Message Content:</span>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 whitespace-pre-wrap">
                    {selectedEvent.content}
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
