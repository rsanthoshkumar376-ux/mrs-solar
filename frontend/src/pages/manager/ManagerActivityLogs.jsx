import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import { translations, getLanguage } from '../../utils/translations.js';
import {
  History, Clock, CheckCircle2, ShieldAlert, RefreshCw,
  Search, User, KeyRound, Wrench, Shield
} from 'lucide-react';

export default function ManagerActivityLogs() {
  const [lang, setLang] = useState(getLanguage);
  useEffect(() => {
    const handleLang = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLang);
    return () => window.removeEventListener('language-change', handleLang);
  }, []);

  const isTa = lang === 'ta';

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/manager/activity-logs');
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionBadge = (action) => {
    if (action.includes('INVITATION')) {
      return { label: 'Invitation Sent', color: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300' };
    }
    if (action.includes('ACTIVATED')) {
      return { label: 'Account Activated', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300' };
    }
    if (action.includes('USER_ID') || action.includes('PASSWORD')) {
      return { label: 'Credential Modified', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300' };
    }
    if (action.includes('ASSIGNED')) {
      return { label: 'Worker Assigned', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300' };
    }
    if (action.includes('DISABLED')) {
      return { label: 'Account Disabled', color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-400' };
    }
    return { label: action, color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300' };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center space-x-2">
            <History className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span>{isTa ? 'செயல்பாட்டு பதிவுகள் & தணிக்கை' : 'Manager Operations & Account Activity Audit'}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isTa ? 'வாடிக்கையாளர் பதிவுகள், அழைப்புகள் மற்றும் மேலாளர் செயல்பாடுகளின் முழுமையான வரலாறு.' : 'Chronological audit trail of customer registrations, invitations, activations, and staff assignments.'}
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-5 py-3.5">Target Identifier</th>
                <th className="px-5 py-3.5">Performed By</th>
                <th className="px-5 py-3.5">Details</th>
                <th className="px-5 py-3.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-500" />
                    Loading activity history...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">No activity logs recorded yet.</td>
                </tr>
              ) : (
                logs.map(l => {
                  const badge = getActionBadge(l.action);
                  return (
                    <tr key={l._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 font-mono text-slate-700 dark:text-slate-300 font-bold text-xs">
                        {l.targetId || '—'}
                      </td>

                      <td className="px-5 py-3.5 text-slate-800 dark:text-slate-200">
                        <p className="font-semibold text-xs">{l.performedByName || 'System'}</p>
                        <p className="text-[10px] text-slate-400 uppercase">{l.performedByRole || 'Manager'}</p>
                      </td>

                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 text-xs max-w-sm">
                        {typeof l.details === 'object' ? (
                          <div className="space-y-0.5 font-mono text-[11px]">
                            {Object.entries(l.details).map(([k, v]) => (
                              <p key={k}><strong className="text-slate-400">{k}:</strong> {String(v)}</p>
                            ))}
                          </div>
                        ) : (
                          String(l.details || '—')
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {l.timestamp ? new Date(l.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}
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