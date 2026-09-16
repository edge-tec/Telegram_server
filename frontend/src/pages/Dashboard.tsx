import React, { useEffect, useState } from 'react';
import { apiClient, DashboardData } from '../api/client';
import {
  MessageSquare,
  Send,
  Clock,
  AlertTriangle,
  Smartphone,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Percent,
  Calendar
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/analytics/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Error fetching dashboard metrics', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse p-4"></div>
          ))}
        </div>
        <div className="h-80 bg-white border border-slate-200 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  const kpiCards = [
    {
      label: 'Incoming Inquiries',
      value: data.kpis.total_incoming_messages,
      sub: `${data.kpis.today_replies} replies today`,
      icon: MessageSquare,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      label: 'Total Auto Replies',
      value: data.kpis.total_auto_replies,
      sub: `${data.kpis.weekly_replies} this week`,
      icon: Send,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      label: 'Pending Follow-ups',
      value: data.kpis.pending_followups,
      sub: 'Active in Queue',
      icon: Clock,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      label: 'Success Delivery Rate',
      value: `${data.kpis.success_rate}%`,
      sub: `${data.kpis.failed_messages} failed retries`,
      icon: Percent,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Overview & Analytics</h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time MTProto response metrics, queue status, and follow-up campaign analytics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 shadow-xs">
            <Smartphone className="w-3.5 h-3.5 text-blue-600" />
            <span>{data.kpis.connected_accounts} Connected Accounts</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 shadow-xs">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>{data.kpis.active_campaigns} Active Campaigns</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiCards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <div key={idx} className="card p-5 hover:shadow-hover transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{c.label}</span>
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${c.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{c.value}</div>
              <div className="text-xs text-slate-500 mt-1 font-medium">{c.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Volume Area Chart (2 cols) */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Message Activity Trend</h3>
              <p className="text-xs text-slate-500">Incoming inquiries vs automated replies (Last 7 days)</p>
            </div>
            <span className="badge bg-blue-50 text-blue-700 border border-blue-200">
              <TrendingUp className="w-3 h-3" /> Live
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.daily_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="inbound" name="Inbound Messages" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorInbound)" />
                <Area type="monotone" dataKey="outbound" name="Auto Replies" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorOutbound)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Queue Breakdown Pie Chart (1 col) */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 text-base mb-1">Queue Status Health</h3>
          <p className="text-xs text-slate-500 mb-4">Current follow-up scheduler states</p>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.queue_breakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                >
                  {data.queue_breakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
            {data.queue_breakdown.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-slate-600 font-medium">{item.name}:</span>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Campaign Performance Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Active Follow-up Campaigns</h3>
            <p className="text-xs text-slate-500">Live conversion funnel and participant progress</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-semibold">Campaign Name</th>
                <th className="px-6 py-3 font-semibold">Total Leads Enrolled</th>
                <th className="px-6 py-3 font-semibold">Currently In Sequence</th>
                <th className="px-6 py-3 font-semibold">Completed Drip</th>
                <th className="px-6 py-3 font-semibold">Progress Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.campaign_performance.map((c) => {
                const pct = c.total_users > 0 ? Math.round((c.completed_users / c.total_users) * 100) : 0;
                return (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{c.name}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{c.total_users}</td>
                    <td className="px-6 py-4">
                      <span className="badge bg-blue-50 text-blue-700 border border-blue-200">
                        {c.active_users} Active
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {c.completed_users} Done
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-36 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">{pct}% Complete</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
