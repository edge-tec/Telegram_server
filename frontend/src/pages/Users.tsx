import React, { useState, useEffect } from 'react';
import { apiClient, UserAccount, UserManagementData } from '../api/client';
import {
  Users as UsersIcon,
  Shield,
  CheckCircle2,
  XCircle,
  Plus,
  Sliders,
  Edit2,
  Trash2,
  Key,
  Mail,
  User,
  Radio,
  Sparkles,
  AlertTriangle,
  X,
  RefreshCw,
  Send,
  Layers,
  Smartphone
} from 'lucide-react';

export const Users: React.FC = () => {
  const [data, setData] = useState<UserManagementData>({
    users: [],
    system_limit: 10,
    total_users: 0,
    active_users: 0,
    is_limit_reached: false,
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'manager' as 'super_admin' | 'admin' | 'manager' | 'support_agent',
    is_active: true,
    max_telegram_accounts: 5,
    max_campaigns: 10,
    daily_message_limit: 1000,
  });

  const [systemLimitInput, setSystemLimitInput] = useState<number>(10);

  useEffect(() => {
    fetchUsers();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/users');
      setData(res.data);
      setSystemLimitInput(res.data.system_limit || 10);
    } catch (err: any) {
      console.error('Error fetching users', err);
      showToast('error', err.response?.data?.message || 'Failed to load team users');
    } finally {
      setLoading(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: pass }));
  };

  const openAddModal = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'manager',
      is_active: true,
      max_telegram_accounts: 5,
      max_campaigns: 10,
      daily_message_limit: 1000,
    });
    generateRandomPassword();
    setIsAddModalOpen(true);
  };

  const openEditModal = (user: UserAccount) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      is_active: user.is_active,
      max_telegram_accounts: user.max_telegram_accounts || 5,
      max_campaigns: user.max_campaigns || 10,
      daily_message_limit: user.daily_message_limit || 1000,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (user: UserAccount) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await apiClient.post('/users', formData);
      showToast('success', res.data.message || 'User created successfully');
      setIsAddModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setSubmitting(true);
      const payload: any = { ...formData };
      if (!payload.password) delete payload.password;

      const res = await apiClient.put(`/users/${selectedUser.id}`, payload);
      showToast('success', res.data.message || 'User updated successfully');
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      setSubmitting(true);
      const res = await apiClient.delete(`/users/${selectedUser.id}`);
      showToast('success', res.data.message || 'User deleted successfully');
      setIsDeleteModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to delete user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      await apiClient.put(`/users/${id}/role`, { role: newRole });
      showToast('success', 'User role updated');
      fetchUsers();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to update user role');
    }
  };

  const handleToggleStatus = async (user: UserAccount) => {
    try {
      await apiClient.put(`/users/${user.id}/role`, {
        role: user.role,
        is_active: !user.is_active,
      });
      showToast('success', `User account ${!user.is_active ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleUpdateSystemLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await apiClient.post('/users/system-limit', {
        max_system_users: systemLimitInput,
      });
      showToast('success', res.data.message || 'System user limit updated');
      setIsLimitModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to update system limit');
    } finally {
      setSubmitting(false);
    }
  };

  const roles = [
    { id: 'super_admin', label: 'Super Admin', desc: 'Full root access to all accounts, secrets, and system configs' },
    { id: 'admin', label: 'Admin', desc: 'Can manage accounts, templates, campaigns and view analytics' },
    { id: 'manager', label: 'Manager', desc: 'Can manage templates, rules, and reply in CRM inbox' },
    { id: 'support_agent', label: 'Support Agent', desc: 'Read and send replies in conversation inbox only' },
  ];

  const usedPercentage = Math.min(
    100,
    Math.round((data.total_users / (data.system_limit || 1)) * 100)
  );

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-slate-600"
            aria-label="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Team & Role Management</h2>
          <p className="text-sm text-slate-500 mt-1">
            Control team member access levels, roles, and granular permissions across Telegram automation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLimitModalOpen(true)}
            className="btn-secondary flex items-center gap-2 text-xs font-semibold px-3.5 py-2"
            title="Configure System User Seat Limit"
          >
            <Sliders className="w-4 h-4 text-slate-500" />
            <span>Seat Limit: {data.system_limit}</span>
          </button>

          <button
            onClick={openAddModal}
            className="btn-primary flex items-center gap-2 text-xs font-semibold px-4 py-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add User Account</span>
          </button>
        </div>
      </div>

      {/* Quota & Guardrail Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Team Seat Quota */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <UsersIcon className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Team Seat Quota</span>
            </div>
            <span
              className={`badge text-[11px] font-bold ${
                data.is_limit_reached
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {data.is_limit_reached ? 'Limit Reached' : `${data.system_limit - data.total_users} Available`}
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div className="text-2xl font-black text-slate-900">
              {data.total_users}{' '}
              <span className="text-sm font-semibold text-slate-400">/ {data.system_limit} seats</span>
            </div>
            <span className="text-xs font-bold text-slate-500">{usedPercentage}% used</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                usedPercentage >= 90
                  ? 'bg-rose-500'
                  : usedPercentage >= 70
                  ? 'bg-amber-500'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${usedPercentage}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
            <span>{data.active_users} active accounts</span>
            <button
              onClick={() => setIsLimitModalOpen(true)}
              className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              Adjust Limit &rarr;
            </button>
          </div>
        </div>

        {/* Card 2: Role Distribution */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Role Breakdown</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-400 font-medium">Super Admins</div>
              <div className="text-lg font-bold text-slate-800">
                {data.users.filter((u) => u.role === 'super_admin').length}
              </div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-400 font-medium">Admins</div>
              <div className="text-lg font-bold text-slate-800">
                {data.users.filter((u) => u.role === 'admin').length}
              </div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-400 font-medium">Managers</div>
              <div className="text-lg font-bold text-slate-800">
                {data.users.filter((u) => u.role === 'manager').length}
              </div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-400 font-medium">Agents</div>
              <div className="text-lg font-bold text-slate-800">
                {data.users.filter((u) => u.role === 'support_agent').length}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Per-User Limits Overview */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Sliders className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resource Guardrails</span>
          </div>
          <div className="space-y-2.5 pt-1 text-xs">
            <div className="flex items-center justify-between text-slate-600 pb-1.5 border-b border-slate-100">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Smartphone className="w-3.5 h-3.5 text-blue-500" /> Telegram Accounts
              </span>
              <span className="font-bold text-slate-800">1 - 50 per user</span>
            </div>
            <div className="flex items-center justify-between text-slate-600 pb-1.5 border-b border-slate-100">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Layers className="w-3.5 h-3.5 text-indigo-500" /> Drip Campaigns
              </span>
              <span className="font-bold text-slate-800">1 - 100 per user</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Send className="w-3.5 h-3.5 text-emerald-500" /> Daily Outbound Volume
              </span>
              <span className="font-bold text-slate-800">Up to 50k msgs/day</span>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 font-semibold">User Name</th>
                <th className="px-6 py-3.5 font-semibold">Email Address</th>
                <th className="px-6 py-3.5 font-semibold">Assigned Role</th>
                <th className="px-6 py-3.5 font-semibold">User Resource Limits</th>
                <th className="px-6 py-3.5 font-semibold">Account Status</th>
                <th className="px-6 py-3.5 font-semibold">Created Date</th>
                <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading team members...
                  </td>
                </tr>
              ) : data.users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                    No team members found. Click "+ Add User Account" to add your first user.
                  </td>
                </tr>
              ) : (
                data.users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-xs ring-1 ring-blue-100 shrink-0">
                        {u.name ? u.name[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{u.name}</div>
                        {u.role === 'super_admin' && (
                          <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Root</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-600 font-medium">{u.email}</td>

                    <td className="px-6 py-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        aria-label="User role assignment"
                        className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="support_agent">Support Agent</option>
                      </select>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold"
                          title="Max Telegram Accounts"
                        >
                          📱 {u.max_telegram_accounts || 5} Accts
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold"
                          title="Max Followup Campaigns"
                        >
                          🎯 {u.max_campaigns || 10} Camp
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold"
                          title="Daily Outbound Message Limit"
                        >
                          💬 {(u.daily_message_limit || 1000).toLocaleString()}/day
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`badge cursor-pointer transition-all ${
                          u.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Click to toggle account status"
                      >
                        {u.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    <td className="px-6 py-4 text-slate-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit User & Limits"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(u)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="card p-6">
        <h3 className="font-bold text-slate-900 text-sm mb-4">Roles & Capabilities Matrix</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {roles.map((r) => (
            <div key={r.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-slate-800 text-xs">{r.label}</h4>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal 1: Add User Account ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Add Team User Account</h3>
                  <p className="text-[11px] text-slate-400">Create new user account and configure resource limits</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {data.is_limit_reached && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Warning: Platform seat limit reached ({data.system_limit} users). Increase seat limit first or
                    deactivate accounts.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@company.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700">Account Password</label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Generate Strong
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Assigned Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white cursor-pointer"
                  >
                    <option value="super_admin">Super Admin (Full Root)</option>
                    <option value="admin">Admin (Accounts & Rules)</option>
                    <option value="manager">Manager (Templates & CRM)</option>
                    <option value="support_agent">Support Agent (Inbox Only)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Account Status</label>
                  <select
                    value={formData.is_active ? '1' : '0'}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value === '1' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white cursor-pointer"
                  >
                    <option value="1">Active (Allowed Login)</option>
                    <option value="0">Inactive (Suspended)</option>
                  </select>
                </div>
              </div>

              {/* Resource Limits Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    User Resource Quotas & Limits
                  </h4>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">Telegram Accts</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={formData.max_telegram_accounts}
                      onChange={(e) =>
                        setFormData({ ...formData, max_telegram_accounts: parseInt(e.target.value) || 1 })
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white"
                    />
                    <span className="text-[10px] text-slate-400">Max accounts</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">Campaigns</label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={formData.max_campaigns}
                      onChange={(e) => setFormData({ ...formData, max_campaigns: parseInt(e.target.value) || 1 })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white"
                    />
                    <span className="text-[10px] text-slate-400">Max campaigns</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">Daily Msgs</label>
                    <input
                      type="number"
                      min={10}
                      max={500000}
                      step={100}
                      value={formData.daily_message_limit}
                      onChange={(e) =>
                        setFormData({ ...formData, daily_message_limit: parseInt(e.target.value) || 500 })
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white"
                    />
                    <span className="text-[10px] text-slate-400">Per 24h</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Create User Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 2: Edit User Account & Limits ── */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Edit User: {selectedUser.name}</h3>
                  <p className="text-[11px] text-slate-400">Update credentials, assigned role and resource limits</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700">New Password (optional)</label>
                  <span className="text-[10px] text-slate-400">Leave blank to keep existing password</span>
                </div>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter new password or leave blank"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Assigned Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white cursor-pointer"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="support_agent">Support Agent</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Account Status</label>
                  <select
                    value={formData.is_active ? '1' : '0'}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value === '1' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white cursor-pointer"
                  >
                    <option value="1">Active</option>
                    <option value="0">Inactive (Suspended)</option>
                  </select>
                </div>
              </div>

              {/* Resource Limits Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Adjust User Resource Limits
                  </h4>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">Telegram Accts</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={formData.max_telegram_accounts}
                      onChange={(e) =>
                        setFormData({ ...formData, max_telegram_accounts: parseInt(e.target.value) || 1 })
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">Campaigns</label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={formData.max_campaigns}
                      onChange={(e) => setFormData({ ...formData, max_campaigns: parseInt(e.target.value) || 1 })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">Daily Messages</label>
                    <input
                      type="number"
                      min={10}
                      max={500000}
                      step={100}
                      value={formData.daily_message_limit}
                      onChange={(e) =>
                        setFormData({ ...formData, daily_message_limit: parseInt(e.target.value) || 500 })
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Edit2 className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 3: System Seat Limit Configuration ── */}
      {isLimitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Configure Platform User Limit</h3>
                  <p className="text-[11px] text-slate-400">Manage maximum allowed team user accounts</p>
                </div>
              </div>
              <button
                onClick={() => setIsLimitModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSystemLimit} className="p-6 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-900 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-600" /> Platform License & Seat Capacity
                </div>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Currently, <strong>{data.total_users}</strong> team member accounts are registered. New accounts
                  cannot be created once this limit is reached.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Maximum Allowed Team Accounts</label>
                <input
                  type="number"
                  min={data.total_users || 1}
                  max={1000}
                  required
                  value={systemLimitInput}
                  onChange={(e) => setSystemLimitInput(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400">
                  Recommended: Set at least {Math.max(data.total_users + 2, 10)} seats
                </span>
              </div>

              {/* Preset buttons */}
              <div className="flex gap-2">
                {[5, 10, 25, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSystemLimitInput(preset)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                      systemLimitInput === preset
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLimitModalOpen(false)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sliders className="w-3.5 h-3.5" />}
                  <span>Update Seat Limit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 4: Delete Confirmation ── */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-slate-900">Delete User Account?</h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to delete <strong>{selectedUser.name}</strong> ({selectedUser.email})? This
                  will permanently revoke their access to the automation dashboard.
                </p>
              </div>

              <div className="flex gap-2 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={submitting}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
