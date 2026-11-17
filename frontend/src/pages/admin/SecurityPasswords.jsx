import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import { translations, getLanguage } from '../../utils/translations.js';
import { 
  KeyRound, ShieldCheck, ShieldAlert, Users, Clock, 
  Search, Filter, RefreshCw, AlertCircle, CheckCircle2,
  Lock, AlertTriangle, ArrowUpDown, Copy, Check, Eye, EyeOff,
  UserCheck, History, ExternalLink, Shield
} from 'lucide-react';

export default function SecurityPasswords() {
  const [lang, setLang] = useState(getLanguage);
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const handleLangChange = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLangChange);
    return () => window.removeEventListener('language-change', handleLangChange);
  }, []);

  const t = translations[lang] || translations.en;
  const isTa = lang === 'ta';

  // Filters & Search
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts', 'logs', or 'manager_activity'
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Admin Reset Password Modal
  const [resetModalUser, setResetModalUser] = useState(null);
  const [customTempPassword, setCustomTempPassword] = useState('');
  const [resetSuccessData, setResetSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [resetError, setResetError] = useState('');

  // Change User ID Modal
  const [changeUserModalAccount, setChangeUserModalAccount] = useState(null);
  const [newUsernameInput, setNewUsernameInput] = useState('');
  const [changeUserLoading, setChangeUserLoading] = useState(false);
  const [changeUserError, setChangeUserError] = useState('');
  const [changeUserSuccess, setChangeUserSuccess] = useState('');

  // Status toggle state
  const [statusTogglingId, setStatusTogglingId] = useState(null);

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

  const fetchActivityLogs = async () => {
    setActivityLoading(true);
    try {
      const res = await api.get('/admin/password-management/activity-logs');
      setActivityLogs(res.data || []);
    } catch (err) {
      console.error('Failed to load manager activity logs:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'manager_activity') {
      fetchActivityLogs();
    }
  }, [activeTab]);

  const handleOpenChangeUserModal = (acc) => {
    setChangeUserModalAccount(acc);
    setNewUsernameInput(acc.identifier || acc.username || '');
    setChangeUserError('');
    setChangeUserSuccess('');
  };

  const handleExecuteChangeUsername = async () => {
    if (!changeUserModalAccount || !newUsernameInput.trim()) return;
    setChangeUserLoading(true);
    setChangeUserError('');
    setChangeUserSuccess('');
    try {
      const res = await api.put('/admin/password-management/change-username', {
        targetUserId: changeUserModalAccount.id || changeUserModalAccount.identifier,
        targetRole: changeUserModalAccount.role,
        newUsername: newUsernameInput.trim()
      });
      setChangeUserSuccess(res.data?.message || 'User ID updated successfully!');
      setTimeout(() => {
        setChangeUserModalAccount(null);
        setChangeUserSuccess('');
        fetchData();
      }, 1500);
    } catch (err) {
      setChangeUserError(err.response?.data?.message || 'Failed to change User ID');
    } finally {
      setChangeUserLoading(false);
    }
  };

  const handleToggleStatus = async (acc) => {
    const isAct = (acc.status === 'active' || acc.status === 'Active' || !acc.status);
    const actionLabel = isAct ? 'disable' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actionLabel} the account for ${acc.name}?`)) return;

    setStatusTogglingId(acc.id);
    try {
      await api.post('/admin/password-management/toggle-status', {
        targetUserId: acc.id || acc.identifier,
        targetRole: acc.role,
        status: isAct ? (acc.role === 'customer' ? 'Disabled' : 'disabled') : (acc.role === 'customer' ? 'Active' : 'active')
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update account status');
    } finally {
      setStatusTogglingId(null);
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
              <span>{isTa ? 'உரிமையாளர் பாதுகாப்பு கட்டுப்பாட்டு மையம்' : 'Owner Security Command Center'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {t.securityPasswordsTitle || 'Security & Password Management'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              {t.securityPasswordsSubtitle || 'Monitor credential health across all four roles (Owner, Manager, Worker, and Customer). Inspect password last-change timestamps and trigger authorized administrative resets.'}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{isTa ? 'புதுப்பிக்க' : 'Refresh Metrics'}</span>
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
            <span className="text-xs font-semibold">{isTa ? 'மொத்த கணக்குகள்' : 'Total Accounts'}</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">
            {summary?.totalUsers || 0}
          </p>
          <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1.5 font-medium">
            <span>{isTa ? 'நிர்வாகி:' : 'Admin:'} {summary?.roleCounts?.owner || 1}</span>
            <span>•</span>
            <span>{isTa ? 'மேலாளர்:' : 'Mgr:'} {summary?.roleCounts?.manager || 0}</span>
            <span>•</span>
            <span>{isTa ? 'பணியாளர்:' : 'Wrk:'} {summary?.roleCounts?.worker || 0}</span>
            <span>•</span>
            <span>{isTa ? 'வாடிக்கையாளர்:' : 'Cust:'} {summary?.roleCounts?.customer || 0}</span>
          </div>
        </div>

        {/* Changes Today */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">{isTa ? 'இன்று மாற்றப்பட்ட கடவுச்சொற்கள்' : 'Password Changes Today'}</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {summary?.changesToday || 0}
          </p>
          <p className="text-[10px] text-emerald-600 font-semibold mt-1">
            {isTa ? 'இன்று புதுப்பிக்கப்பட்ட கணக்குகள்' : 'Active credentials updated today'}
          </p>
        </div>

        {/* Recent Changes (7 Days) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">{isTa ? 'சமீபத்திய மாற்றங்கள் (7 நாட்கள்)' : 'Recent Changes (7 Days)'}</span>
            <History className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {summary?.recentChanges || 0}
          </p>
          <p className="text-[10px] text-indigo-600 font-semibold mt-1">
            {isTa ? 'கடந்த வாரத்தில் புதுப்பிக்கப்பட்டவை' : 'Updated within the last week'}
          </p>
        </div>

        {/* Requiring Password Reset */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">{isTa ? 'இயல்புநிலை கடவுச்சொல் உள்ளவை' : 'Accounts Needing Update'}</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-500 dark:text-amber-400">
            {summary?.accountsRequiringReset || 0}
          </p>
          <p className="text-[10px] text-amber-600 font-semibold mt-1">
            {isTa ? 'ஆரம்ப கடவுச்சொல் பயன்படுத்தும் கணக்குகள்' : 'Using default password or reset pending'}
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
              <span>{isTa ? `பயனர் கணக்குகள் (${users.length})` : `User Accounts (${users.length})`}</span>
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
              <span>{isTa ? `பாதுகாப்பு ஏடு (${logs.length})` : `Activity History (${logs.length})`}</span>
            </button>
            <button
              onClick={() => setActiveTab('manager_activity')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'manager_activity'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-teal-600" />
              <span>{isTa ? 'மேலாளர் செயல்பாடுகள்' : 'Manager Operations Logs'}</span>
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
                placeholder={isTa ? 'பெயர், பயனர் பெயர், எண் தேடுக...' : 'Search name, username, ID, phone...'}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              {isTa ? 'தேடு' : 'Search'}
            </button>
          </form>
        </div>

        {/* ROLE & STATUS FILTERS */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">{isTa ? 'பொறுப்பு:' : 'Filter Role:'}</span>
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
              {role === 'admin' ? (isTa ? 'நிர்வாகி' : 'Owner / Admin') : role === 'manager' ? (isTa ? 'மேலாளர்' : 'Manager') : role === 'worker' ? (isTa ? 'களப்பணியாளர்' : 'Worker') : role === 'customer' ? (isTa ? 'வாடிக்கையாளர்' : 'Customer') : (isTa ? 'அனைத்தும்' : 'All')}
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
                  <th className="px-5 py-4">Created By / Manager</th>
                  <th className="px-5 py-4">Security & Status</th>
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
                    const isActive = u.status === 'active' || u.status === 'Active' || !u.status;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-950/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-800 dark:text-white flex items-center space-x-1.5">
                            <span>{u.name}</span>
                            {!isActive && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                Disabled
                              </span>
                            )}
                          </div>
                          {u.mobileNumber && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {u.mobileNumber}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                              {u.identifier || u.username}
                            </span>
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => handleOpenChangeUserModal(u)}
                                className="p-1 text-slate-400 hover:text-teal-600 transition-colors"
                                title="Change User ID"
                              >
                                <KeyRound className="w-3 h-3 text-teal-600" />
                              </button>
                            )}
                          </div>
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
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {u.createdByName || u.registeredBy || 'System / Direct'}
                          </div>
                          {u.createdById && (
                            <div className="text-[10px] text-teal-600 font-mono font-medium">
                              MGR: {u.createdById}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="space-y-1">
                            {u.mustChangePassword ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200/40">
                                <AlertCircle className="w-3 h-3" />
                                <span>Reset Required</span>
                              </span>
                            ) : isUpdated ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/40">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Secure / Updated</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/40">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Default Password</span>
                              </span>
                            )}
                            <div className="text-[10px] text-slate-400 flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatDateTime(u.passwordLastChanged)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => handleOpenChangeUserModal(u)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold border border-slate-200 dark:border-slate-700"
                                title="Change User ID"
                              >
                                Edit ID
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenResetModal(u)}
                              className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 rounded-lg text-[11px] font-bold border border-teal-200 dark:border-teal-800 inline-flex items-center space-x-1"
                            >
                              <KeyRound className="w-3 h-3" />
                              <span>Reset</span>
                            </button>
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => handleToggleStatus(u)}
                                disabled={statusTogglingId === u.id}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                                  isActive
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                }`}
                              >
                                {isActive ? 'Disable' : 'Enable'}
                              </button>
                            )}
                          </div>
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

      {/* TAB 3: MANAGER OPERATIONS & ACCOUNT ACTIVITY AUDIT */}
      {activeTab === 'manager_activity' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center space-x-2">
              <Shield className="w-4 h-4 text-teal-600" />
              <span>Manager & System Account Operations Audit</span>
            </h3>
            <button
              onClick={fetchActivityLogs}
              disabled={activityLoading}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              title="Refresh Logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${activityLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-4">Timestamp</th>
                  <th className="px-5 py-4">Action</th>
                  <th className="px-5 py-4">Performed By</th>
                  <th className="px-5 py-4">Target Details</th>
                  <th className="px-5 py-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {activityLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                      No manager activity operations recorded yet.
                    </td>
                  </tr>
                ) : (
                  activityLogs.map((log) => (
                    <tr key={log._id || log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-950/40 transition-colors">
                      <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                          {log.action?.replace(/_/g, ' ') || 'Operation'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-800 dark:text-white">
                          {log.performedByName || log.performedById || 'Manager'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Role: {log.performedByRole}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                        <div className="font-semibold text-slate-800 dark:text-white">
                          {log.details?.targetName || log.targetId} ({log.targetType})
                        </div>
                        {log.details?.newUsername && (
                          <div className="text-[10px] text-teal-600 font-mono">
                            New ID: {log.details.newUsername}
                          </div>
                        )}
                        {log.details?.newStatus && (
                          <div className="text-[10px] text-amber-600">
                            Status: {log.details.newStatus}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CHANGE USERNAME / USER ID MODAL */}
      {changeUserModalAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-teal-50 dark:bg-teal-950/40 rounded-xl text-teal-600 dark:text-teal-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-white">
                    Modify User ID
                  </h3>
                  <p className="text-xs text-slate-500">
                    Owner Centralized Credential Control
                  </p>
                </div>
              </div>
              <button
                onClick={() => setChangeUserModalAccount(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                ✕
              </button>
            </div>

            {changeUserError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{changeUserError}</span>
              </div>
            )}

            {changeUserSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{changeUserSuccess}</span>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Account:</span>
                <span className="font-bold text-slate-800 dark:text-white">{changeUserModalAccount.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current User ID:</span>
                <span className="font-mono text-slate-600 dark:text-slate-300">{changeUserModalAccount.identifier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Role:</span>
                <span className="capitalize font-bold text-teal-600">{changeUserModalAccount.role}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                New User ID / Login Username
              </label>
              <input
                type="text"
                value={newUsernameInput}
                onChange={(e) => setNewUsernameInput(e.target.value)}
                placeholder="e.g. senthil_solar or EMP-104"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Must be at least 3 characters. User will use this new ID to log in.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setChangeUserModalAccount(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={changeUserLoading || !newUsernameInput.trim()}
                onClick={handleExecuteChangeUsername}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold disabled:opacity-50 flex items-center space-x-1.5"
              >
                {changeUserLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save New User ID</span>
              </button>
            </div>
          </div>
        </div>
      )}
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
