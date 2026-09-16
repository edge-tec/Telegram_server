import React, { useState, useEffect } from 'react';
import {
  Settings,
  Clock,
  Moon,
  Calendar,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  Save,
  Globe,
  Zap,
} from 'lucide-react';
import { apiClient, AutomationSettings as IAutomationSettings } from '../api/client';

export const AutomationSettings: React.FC = () => {
  const [settings, setSettings] = useState<IAutomationSettings>({
    timezone: 'UTC',
    working_hours_enabled: false,
    working_hours_start: '09:00',
    working_hours_end: '18:00',
    quiet_hours_enabled: true,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    weekend_skip: false,
    holiday_skip: false,
    max_followups_per_contact: 5,
    stop_after_reply: true,
    resume_after_days: 0,
    human_delay_simulation: true,
    typing_delay_per_char_ms: 30,
    read_delay_seconds: 5,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/settings/automation');
      if (res.data) {
        setSettings(res.data);
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await apiClient.post('/settings/automation', settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header Card */}
      <div className="card-glass p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-[20px] bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Settings className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Campaign & Automation Settings</h1>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                v3.0 Rules
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Configure working hours, quiet time restrictions, human typing emulation, and stop rules.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Settings saved successfully!
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* 1. Timezone & General */}
        <div className="card-enterprise p-6 bg-white border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Globe className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">Timezone Configuration</h3>
          </div>

          <div className="max-w-md">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              System Automation Timezone
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="input-field text-xs font-medium"
            >
              <option value="UTC">UTC (Universal Coordinated Time)</option>
              <option value="America/New_York">America/New_York (EST/EDT)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
            </select>
          </div>
        </div>

        {/* 2. Working Hours & Quiet Hours */}
        <div className="card-enterprise p-6 bg-white border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">Timing & Quiet Hours</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Working Hours */}
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold text-slate-800">Enforce Working Hours</span>
                <input
                  type="checkbox"
                  checked={settings.working_hours_enabled}
                  onChange={(e) =>
                    setSettings({ ...settings, working_hours_enabled: e.target.checked })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </label>
              <p className="text-[11px] text-slate-500">
                Only dispatch automated messages during designated business operating hours.
              </p>

              {settings.working_hours_enabled && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Start</label>
                    <input
                      type="time"
                      value={settings.working_hours_start}
                      onChange={(e) =>
                        setSettings({ ...settings, working_hours_start: e.target.value })
                      }
                      className="input-field text-xs py-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">End</label>
                    <input
                      type="time"
                      value={settings.working_hours_end}
                      onChange={(e) =>
                        setSettings({ ...settings, working_hours_end: e.target.value })
                      }
                      className="input-field text-xs py-1.5"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quiet Hours */}
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  Quiet Hours (Sleep Protection)
                </span>
                <input
                  type="checkbox"
                  checked={settings.quiet_hours_enabled}
                  onChange={(e) =>
                    setSettings({ ...settings, quiet_hours_enabled: e.target.checked })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </label>
              <p className="text-[11px] text-slate-500">
                Hold pending follow-up steps during night time to avoid disturbing contacts.
              </p>

              {settings.quiet_hours_enabled && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">From</label>
                    <input
                      type="time"
                      value={settings.quiet_hours_start}
                      onChange={(e) =>
                        setSettings({ ...settings, quiet_hours_start: e.target.value })
                      }
                      className="input-field text-xs py-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Until</label>
                    <input
                      type="time"
                      value={settings.quiet_hours_end}
                      onChange={(e) =>
                        setSettings({ ...settings, quiet_hours_end: e.target.value })
                      }
                      className="input-field text-xs py-1.5"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Weekend & Holiday Skip */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between cursor-pointer hover:bg-slate-100/60 transition-colors">
              <div>
                <p className="text-xs font-bold text-slate-800">Skip Weekends (Sat & Sun)</p>
                <p className="text-[11px] text-slate-400">Postpone scheduled steps to Monday morning</p>
              </div>
              <input
                type="checkbox"
                checked={settings.weekend_skip}
                onChange={(e) => setSettings({ ...settings, weekend_skip: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
            </label>

            <label className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between cursor-pointer hover:bg-slate-100/60 transition-colors">
              <div>
                <p className="text-xs font-bold text-slate-800">Skip Public Holidays</p>
                <p className="text-[11px] text-slate-400">Avoid sending during observed calendar holidays</p>
              </div>
              <input
                type="checkbox"
                checked={settings.holiday_skip}
                onChange={(e) => setSettings({ ...settings, holiday_skip: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
            </label>
          </div>
        </div>

        {/* 3. Follow-Up Nurture Rules */}
        <div className="card-enterprise p-6 bg-white border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">Anti-Spam & Stop Rules</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-slate-800">Stop Sequence After Reply</p>
                  <p className="text-[11px] text-slate-500">
                    Automatically cancel all future pending drip steps when the user texts back.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.stop_after_reply}
                  onChange={(e) => setSettings({ ...settings, stop_after_reply: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Follow-ups Per Contact
              </label>
              <input
                type="number"
                value={settings.max_followups_per_contact}
                onChange={(e) =>
                  setSettings({ ...settings, max_followups_per_contact: Number(e.target.value) })
                }
                min={1}
                max={20}
                className="input-field text-xs"
              />
              <span className="text-[11px] text-slate-400">Hard limit on total follow-up messages sent</span>
            </div>
          </div>
        </div>

        {/* 4. Human Emulation & Typing Simulation */}
        <div className="card-enterprise p-6 bg-white border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Zap className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">Human Delay & Typing Simulation</h3>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 cursor-pointer">
              <div>
                <p className="text-xs font-bold text-slate-800">Simulate Authentic Human Typing</p>
                <p className="text-[11px] text-slate-500">
                  Sends 'typing...' status to Telegram chat proportional to text length before dispatching.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.human_delay_simulation}
                onChange={(e) =>
                  setSettings({ ...settings, human_delay_simulation: e.target.checked })
                }
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
            </label>

            {settings.human_delay_simulation && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Typing Speed (Milliseconds per character)
                  </label>
                  <input
                    type="number"
                    value={settings.typing_delay_per_char_ms}
                    onChange={(e) =>
                      setSettings({ ...settings, typing_delay_per_char_ms: Number(e.target.value) })
                    }
                    min={10}
                    max={100}
                    className="input-field text-xs"
                  />
                  <span className="text-[10px] text-slate-400">Recommended: 30ms (mimics 60 WPM)</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Read Delay (Seconds before typing starts)
                  </label>
                  <input
                    type="number"
                    value={settings.read_delay_seconds}
                    onChange={(e) =>
                      setSettings({ ...settings, read_delay_seconds: Number(e.target.value) })
                    }
                    min={1}
                    max={60}
                    className="input-field text-xs"
                  />
                  <span className="text-[10px] text-slate-400">Emulates user reading message</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="submit" disabled={isSaving} className="btn-primary text-sm font-semibold py-3 px-6">
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving Settings...' : 'Save Automation Rules'}
          </button>
        </div>
      </form>
    </div>
  );
};
