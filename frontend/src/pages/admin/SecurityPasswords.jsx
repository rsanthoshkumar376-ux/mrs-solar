import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import { 
  KeyRound, ShieldCheck, ShieldAlert, Users, Clock, 
  Search, Filter, RefreshCw, AlertCircle, CheckCircle2,
  Lock, AlertTriangle, ArrowUpDown, Copy, Check, Eye, EyeOff,
  UserCheck, History, ExternalLink, Shield
} from 'lucide-react';

export default function SecurityPasswords() {
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters & Search
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts' or 'logs'

  // Admin Reset Password Modal
  const [resetModalUser, setResetModalUser] = useState(null);
  const [customTempPassword, setCustomTempPassword] = useState('');
  const [resetSuccessData, setResetSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [resetError, setResetError] = useState('');

  // Fetch summary and accounts
  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, usersRes, logsRes] = await Promise.all([
        api.get('/admin/password-management/summary'),
        api.get('/admin/password-management/users', {
          params: { role: selectedRole, search: searchQuery, status: selectedStatus }
        }),
        api.get('/admin/password-management/logs', {
          params: { role: selectedRole, search: searchQuery, limit: 100 }
        })
      ]);

      setSummary(sumRes.data);
      setUsers(usersRes.data);
      setLogs(logsRes.data);
    } catch (err) {
      console.error('Error fetching password management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedRole, selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleOpenResetModal = (user) => {
    setResetModalUser(user);
    setCustomTempPassword(`Solar@${Math.floor(1000 + Math.random() * 9000)}`);
    setResetSuccessData(null);
    setResetError('');
    setCopied(false);
  };

  const handleExecuteReset = async () => {
    if (!resetModalUser) return;
    setActionLoading(true);
    setResetError('');
    try {
      const res = await api.post('/admin/password-management/reset-user', {
        targetUserId: resetModalUser.id,
        targetRole: resetModalUser.role,
        newPassword: customTempPassword
      });

      setResetSuccessData({
        user: resetModalUser,
        tempPassword: res.data.tempPassword || customTempPassword,
        message: res.data.message
      });

      // Refresh list
      fetchData();
    } catch (err) {
      console.error('Reset password error:', err);
      setResetError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDateTime = (isoStr) => {
    if (!isoStr) return 'Never / Default';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return 'Never / Default';
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadge = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'manager':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'worker':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'customer':
        return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30';
      default:
        return 'bg-slate-500/10 text-slate-600 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white border border-slate-800 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold mb-3 border border-white/10">
              <Shield className="w-3.5 h-3.5 text-teal-400" />
              <span>Owner Security Command Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Security & Password Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Monitor credential health across all four roles (Owner, Manager, Worker, and Customer). Inspect password last-change timestamps and trigger authorized administrative resets.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
          </div>
        </div>

        <div className="absolute right-[-20px] bottom-[-20px] opacity-5 pointer-events-none">
          <KeyRound className="w-64 h-64 text-white" />
        </div>
      </div>

      {/* DASHBOARD METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total Accounts</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">
            {summary?.totalUsers || 0}
          </p>
          <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1.5 font-medium">
            <span>Admin: {summary?.roleCounts?.owner || 1}</span>
            <span>•</span>
            <span>Mgr: {summary?.roleCounts?.manager || 0}</span>
            <span>•</span>
            <span>Wrk: {summary?.roleCounts?.worker || 0}</span>
            <span>•</span>
            <span>Cust: {summary?.roleCounts?.customer || 0}</span>
          </div>
        </div>

        {/* Changes Today */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Password Changes Today</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {summary?.changesToday || 0}
          </p>
          <p className="text-[10px] text-emerald-600 font-semibold mt-1">
            Active credentials updated today
          </p>
        </div>

        {/* Recent Changes (7 Days) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Recent Changes (7 Days)</span>
            <History className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {summary?.recentChanges || 0}
          </p>
          <p className="text-[10px] text-indigo-600 font-semibold mt-1">
            Updated within the last week
          </p>
        </div>

        {/* Requiring Password Reset */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Accounts Needing Update</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-500 dark:text-amber-400">
            {summary?.accountsRequiringReset || 0}
          </p>
          <p className="text-[10px] text-amber-600 font-semibold mt-1">
            Using default password or reset pending
          </p>
        </div>
      </div>

      {/* CONTROLS & TABS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* TAB BUTTONS */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('accounts')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'accounts'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>User Accounts ({users.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'logs'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Activity History ({logs.length})</span>
            </button>
          </div>

          {/* SEARCH FORM */}
          <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 w-full sm:w-80">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, username, ID, phone..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* ROLE & STATUS FILTERS */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Filter Role:</span>
          {['all', 'admin', 'manager', 'worker', 'customer'].map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-3 py-1 rounded-xl text-xs font-bold capitalize transition-all border ${
                selectedRole === role
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              {role === 'admin' ? 'Owner / Admin' : role}
            </button>
          ))}

          {activeTab === 'accounts' && (
            <div className="ml-auto flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="changed">Updated / Secure</option>
                <option value="default">Default Password</option>
                <option value="reset_required">Reset Required</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: USER ACCOUNTS TABLE */}
      {activeTab === 'accounts' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-4">User Name</th>
                  <th className="px-5 py-4">Username / ID</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Department / Designation</th>
                  <th className="px-5 py-4">Last Password Changed</th>
                  <th className="px-5 py-4">Security Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      No user accounts found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isUpdated = Boolean(u.passwordLastChanged && !u.isDefaultPassword);
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-950/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-800 dark:text-white">
                            {u.name}
                          </div>
                          {u.mobileNumber && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {u.mobileNumber}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                            {u.identifier || u.username}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getRoleBadge(u.role)}`}>
                            {u.role === 'admin' ? 'Owner' : u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                          <div>{u.department}</div>
                          <div className="text-[10px] text-slate-400">{u.designation}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatDateTime(u.passwordLastChanged)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {u.mustChangePassword ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200/40">
                              <AlertCircle className="w-3 h-3" />
                              <span>Reset Required</span>
                            </span>
                          ) : isUpdated ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/40">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Secure / Updated</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/40">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Default Password</span>
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => handleOpenResetModal(u)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors inline-flex items-center space-x-1"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Reset Password</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED ACTIVITY LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center space-x-2">
              <History className="w-4 h-4 text-teal-600" />
              <span>Password Change Audit Trail</span>
            </h3>
            <span className="text-xs text-slate-400">
              Showing last {logs.length} logged events
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-4">Timestamp</th>
                  <th className="px-5 py-4">User</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Activity Description</th>
                  <th className="px-5 py-4">IP Address</th>
                  <th className="px-5 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                      No password change events recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const isSuccess = log.changeStatus === 'Completed';
                    return (
                      <tr key={log._id || log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-950/40 transition-colors">
                        <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">
                          {formatDateTime(log.changedAt)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-800 dark:text-white">
                            {log.userName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {log.username}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${getRoleBadge(log.userRole)}`}>
                            {log.userRole}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                          <div>{log.activity || 'Password Change'}</div>
                          {log.failureReason && (
                            <div className="text-[10px] text-rose-500 font-medium">
                              Reason: {log.failureReason}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">
                          {log.ipAddress || '127.0.0.1'}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            isSuccess
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200/40'
                              : 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200/40'
                          }`}>
                            {isSuccess ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            <span>{log.changeStatus || (isSuccess ? 'Completed' : 'Failed')}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADMINISTRATIVE RESET PASSWORD MODAL */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-teal-50 dark:bg-teal-950/40 rounded-xl text-teal-600 dark:text-teal-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-white">
                    Reset User Password
                  </h3>
                  <p className="text-xs text-slate-500">
                    Administrative Override for {resetModalUser.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResetModalUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                ✕
              </button>
            </div>

            {resetError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            {!resetSuccessData ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Account:</span>
                    <span className="font-bold text-slate-800 dark:text-white">{resetModalUser.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Identifier:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{resetModalUser.identifier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Role:</span>
                    <span className="capitalize font-bold text-teal-600">{resetModalUser.role}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Temporary / New Password
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customTempPassword}
                      onChange={(e) => setCustomTempPassword(e.target.value)}
                      placeholder="e.g. Solar@4821"
                      className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomTempPassword(`Solar@${Math.floor(1000 + Math.random() * 9000)}`)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-teal-600 hover:text-teal-700 p-1"
                      title="Generate new random password"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    The user will be flagged with "Reset Required" and will be asked to update their password.
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setResetModalUser(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading || !customTempPassword}
                    onClick={handleExecuteReset}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-900/20 disabled:opacity-50 transition-all flex items-center space-x-1.5"
                  >
                    {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                    <span>Confirm Reset</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs space-y-2">
                  <div className="flex items-center space-x-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Password Reset Completed!</span>
                  </div>
                  <p>{resetSuccessData.message}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Temporary Password Credentials:
                  </span>
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl">
                    <span className="font-mono text-sm font-bold text-slate-800 dark:text-white">
                      {resetSuccessData.tempPassword}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(resetSuccessData.tempPassword)}
                      className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center space-x-1 p-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Share this temporary password with {resetSuccessData.user.name}. They will be prompted to change it upon signing in.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setResetModalUser(null)}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
