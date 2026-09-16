import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  User,
  Send,
  CalendarDays,
  ListFilter,
} from 'lucide-react';
import { apiClient, ScheduledMessageItem } from '../api/client';

export const SchedulerCalendar: React.FC = () => {
  const [items, setItems] = useState<ScheduledMessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline'>('timeline');

  // Reschedule Modal
  const [reschedulingItem, setReschedulingItem] = useState<ScheduledMessageItem | null>(null);
  const [newDateTime, setNewDateTime] = useState('');

  // Calendar current date navigation
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchSchedule();
  }, [statusFilter]);

  const fetchSchedule = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/scheduler/queue', {
        params: { status: statusFilter === 'all' ? undefined : statusFilter },
      });
      setItems(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to load scheduler queue', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (id: string, action: 'pause' | 'resume' | 'cancel') => {
    try {
      await apiClient.post(`/scheduler/queue/${id}/toggle`, { action });
      fetchSchedule();
    } catch (err) {
      console.error('Failed toggle schedule item', err);
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingItem || !newDateTime) return;

    try {
      await apiClient.post(`/scheduler/queue/${reschedulingItem.id}/reschedule`, {
        scheduled_at: newDateTime,
      });
      setReschedulingItem(null);
      fetchSchedule();
    } catch (err) {
      console.error('Failed to reschedule', err);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header Card */}
      <div className="card-glass p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-[20px] bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <CalendarIcon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Scheduler Calendar</h1>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                Live Timeline
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Visual overview of all queued and delivered follow-ups. Reschedule, pause, or resume any pending task.
            </p>
          </div>
        </div>

        {/* View Switcher & Filters */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'timeline'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            Queue Timeline
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'calendar'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Calendar Grid
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {['all', 'pending', 'sent', 'failed', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize border transition-all ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <span className="text-xs font-medium text-slate-400">
          Showing <b>{items.length}</b> scheduled message items
        </span>
      </div>

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">Loading scheduler queue...</div>
          ) : items.length === 0 ? (
            <div className="card-enterprise p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No scheduled messages</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Automated follow-up steps and delayed auto-replies will appear in this timeline.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="card-enterprise p-4 bg-white border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-indigo-200 transition-all"
                >
                  {/* Left info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                        item.status === 'sent'
                          ? 'bg-emerald-50 text-emerald-600'
                          : item.status === 'pending'
                          ? 'bg-indigo-50 text-indigo-600'
                          : item.status === 'failed'
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.status === 'sent' ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : item.status === 'pending' ? (
                        <Clock className="w-5 h-5" />
                      ) : (
                        <AlertCircle className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {item.template?.name || 'Automated Follow-up Step'}
                        </span>
                        {item.campaign && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                            {item.campaign.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {item.conversation?.telegram_user?.first_name || 'Contact'} (
                          {item.conversation?.telegram_user?.username
                            ? `@${item.conversation.telegram_user.username}`
                            : 'ID:' + item.conversation_id.substring(0, 6)}
                          )
                        </span>
                        <span>•</span>
                        <span className="font-medium text-slate-700">
                          {formatDate(item.scheduled_at)} at {formatTime(item.scheduled_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <span
                      className={`badge text-[10px] font-bold uppercase tracking-wider ${
                        item.status === 'sent'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : item.status === 'pending'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : item.status === 'failed'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {item.status}
                    </span>

                    {item.status === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            setReschedulingItem(item);
                            setNewDateTime(new Date(item.scheduled_at).toISOString().slice(0, 16));
                          }}
                          className="btn-secondary text-[11px] py-1 px-2.5"
                        >
                          Reschedule
                        </button>
                        <button
                          onClick={() => handleToggle(item.id, 'pause')}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg border border-amber-200"
                          title="Pause"
                        >
                          <Pause className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    {item.status === 'cancelled' && (
                      <button
                        onClick={() => handleToggle(item.id, 'resume')}
                        className="btn-secondary text-[11px] py-1 px-2.5 text-indigo-600"
                      >
                        <Play className="w-3 h-3" />
                        Resume
                      </button>
                    )}

                    {item.status === 'failed' && (
                      <button
                        onClick={() => {
                          setReschedulingItem(item);
                          setNewDateTime(new Date().toISOString().slice(0, 16));
                        }}
                        className="btn-secondary text-[11px] py-1 px-2.5 text-rose-600"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Calendar Grid View */}
      {viewMode === 'calendar' && (
        <div className="card-enterprise p-6 bg-white border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-2.5 py-1 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-1">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Simple representative month grid */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 31 }).map((_, i) => {
              const dayNum = i + 1;
              const matchingItems = items.filter((it) => {
                try {
                  return new Date(it.scheduled_at).getDate() === dayNum;
                } catch {
                  return false;
                }
              });

              return (
                <div
                  key={dayNum}
                  className="min-h-24 p-2 rounded-xl border border-slate-100 bg-slate-50/40 hover:border-indigo-200 transition-colors flex flex-col justify-between"
                >
                  <div className="text-xs font-bold text-slate-700">{dayNum}</div>
                  {matchingItems.length > 0 && (
                    <div className="mt-1 space-y-1">
                      <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/70 truncate">
                        {matchingItems.length} message(s)
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {reschedulingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[24px] shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                Reschedule Message
              </h3>
              <button onClick={() => setReschedulingItem(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleReschedule} className="p-5 space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-2">
                  Select new date and time for <b>{reschedulingItem.template?.name || 'Follow-up message'}</b>:
                </p>
                <input
                  type="datetime-local"
                  value={newDateTime}
                  onChange={(e) => setNewDateTime(e.target.value)}
                  required
                  className="input-field text-xs font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReschedulingItem(null)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs font-semibold">
                  Confirm Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
