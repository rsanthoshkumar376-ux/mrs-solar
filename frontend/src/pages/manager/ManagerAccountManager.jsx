import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import { translations, getLanguage } from '../../utils/translations.js';
import {
  KeyRound, Users, Search, Filter, ShieldCheck, ShieldAlert,
  Clock, CheckCircle2, RefreshCw, Send, Shield, X, AlertCircle
} from 'lucide-react';

export default function ManagerAccountManager() {
  const [lang, setLang] = useState(getLanguage);
  useEffect(() => {
    const handleLang = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLang);
    return () => window.removeEventListener('language-change', handleLang);
  }, []);

  const isTa = lang === 'ta';

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ success: '', error: '' });

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/manager/accounts', {
        params: { search, role: roleFilter, status: statusFilter }
      });
      setAccounts(res.data);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [roleFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAccounts();
  };

  const handleResend = async (acc) => {
    setActionLoading(true);
    setFeedback({ success: '', error: '' });
    try {
      const endpoint = acc.role === 'worker' 
        ? `/manager/workers/${acc.id}/resend-invite` 
        : `/manager/customers/${acc.id}/resend-invite`;
      const res = await api.post(endpoint);
      setFeedback({ success: res.data.message, error: '' });
      fetchAccounts();
    } catch (err) {
      setFeedback({ success: '', error: err.response?.data?.message || 'Failed to resend invite' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggle = async (acc) => {
    const next = acc.accountStatus === 'Active' ? 'Disabled' : 'Active';
    if (!window.confirm(`Set account ${acc.identifier} to ${next}?`)) return;

    setActionLoading(true);
    setFeedback({ success: '', error: '' });
    try {
      const endpoint = acc.role === 'worker' 
        ? `/manager/workers/${acc.id}/toggle-status` 
        : `/manager/customers/${acc.id}/toggle-status`;
      const res = await api.post(endpoint, { status: next });
      setFeedback({ success: res.data.message, error: '' });
      fetchAccounts();
    } catch (err) {
      setFeedback({ success: '', error: err.response?.data?.message || 'Failed to update status' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {feedback.success && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>{feedback.success}</span>
          </div>
          <button onClick={() => setFeedback({ ...feedback, success: '' })}><X className="w-4 h-4" /></button>
        </div>
      )}

      {feedback.error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <span>{feedback.error}</span>
          </div>
          <button onClick={() => setFeedback({ ...feedback, error: '' })}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center space-x-2">
            <KeyRound className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span>{isTa ? 'பயனர் ஐடி & கணக்கு மேலாண்மை' : 'User ID & Account Management'}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isTa ? 'பதிவுசெய்யப்பட்ட பயனர் ஐடிகள், கணக்கு செயல்படுத்துதல் நிலைகள் மற்றும் கடவுச்சொல் மாற்றங்களைக் கண்காணிக்கவும்.' : 'Monitor registered User IDs, activation status, and access permissions for customers and field workers.'}
          </p>
        </div>

        <button
          onClick={fetchAccounts}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-4">
        
        {/* Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3 justify-between items-center bg-slate-50/50 dark:bg-slate-950/40">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search User ID, name, email, ID..."
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-teal-500"
            />
          </form>

          <div className="flex items-center space-x-2 w-full md:w-auto">
            {['all', 'customer', 'worker'].map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                  roleFilter === r ? 'bg-teal-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {r === 'all' ? 'All Roles' : `${r}s`}
              </button>
            ))}

            {['all', 'active', 'pending', 'disabled'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                  statusFilter === s ? 'bg-slate-800 text-white dark:bg-slate-700' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Accounts Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">User ID / Name</th>
                <th className="px-5 py-3.5">System Identifier</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Gmail & Mobile</th>
                <th className="px-5 py-3.5">Activation Status</th>
                <th className="px-5 py-3.5">Created By</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-500" />
                    Loading accounts...
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">No accounts found.</td>
                </tr>
              ) : (
                accounts.map(acc => {
                  const isPending = acc.accountStatus === 'Pending Activation' || acc.invitationStatus === 'pending';
                  const isDisabled = acc.accountStatus === 'Disabled';

                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4">
                        {acc.username ? (
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-xs">
                              {acc.username}
                            </span>
                            <span className="text-[9px] bg-teal-500/10 text-teal-600 dark:text-teal-400 px-1.5 py-0.2 rounded font-semibold">User ID</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 italic">Not set (Pending Activation)</span>
                        )}
                        <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs mt-0.5">{acc.fullName}</p>
                      </td>

                      <td className="px-5 py-4 font-mono text-slate-600 dark:text-slate-400 text-xs">
                        {acc.identifier}
                      </td>

                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          acc.role === 'worker'
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            : 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                        }`}>
                          {acc.role}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-slate-800 dark:text-slate-200 text-xs font-mono">{acc.mobileNumber}</p>
                        <p className="text-slate-500 text-[11px] truncate max-w-[170px]">{acc.email}</p>
                      </td>

                      <td className="px-5 py-4">
                        {isDisabled ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/60 dark:text-red-400">
                            Disabled
                          </span>
                        ) : isPending ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 flex items-center space-x-1 w-max">
                            <Clock className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center space-x-1 w-max">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-500 text-[11px]">
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{acc.createdByName || 'Direct'}</p>
                        {acc.createdAt && (
                          <p className="text-[10px] text-slate-400">{new Date(acc.createdAt).toLocaleDateString()}</p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                        {isPending && acc.email && acc.email.includes('@') && (
                          <button
                            onClick={() => handleResend(acc)}
                            disabled={actionLoading}
                            className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-bold hover:bg-teal-100 transition-colors"
                          >
                            Resend Link
                          </button>
                        )}

                        <button
                          onClick={() => handleToggle(acc)}
                          disabled={actionLoading}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isDisabled ? 'border-emerald-300 text-emerald-600' : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-red-500'
                          }`}
                          title={isDisabled ? 'Reactivate Account' : 'Disable Account'}
                        >
                          <Shield className="w-3.5 h-3.5" />
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
    </div>
  );
}