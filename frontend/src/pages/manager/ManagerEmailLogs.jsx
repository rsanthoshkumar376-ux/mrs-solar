import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import { translations, getLanguage } from '../../utils/translations.js';
import {
  Mail, CheckCircle2, ShieldAlert, Clock, RefreshCw,
  Search, Filter, Send, ArrowUpRight
} from 'lucide-react';

export default function ManagerEmailLogs() {
  const [lang, setLang] = useState(getLanguage);
  useEffect(() => {
    const handleLang = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLang);
    return () => window.removeEventListener('language-change', handleLang);
  }, []);

  const isTa = lang === 'ta';

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('all');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/manager/email-notifications');
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to load email notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = filterRole === 'all' 
    ? logs 
    : logs.filter(l => l.recipientRole?.toLowerCase() === filterRole.toLowerCase());

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center space-x-2">
            <Mail className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span>{isTa ? 'ஜிமெயில் அழைப்பு & அறிவிப்பு பதிவுகள்' : 'Gmail Invitation & Notification Audit'}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isTa ? 'வாடிக்கையாளர்கள் மற்றும் பணியாளர்களுக்கு அனுப்பப்பட்ட அனைத்து மின்னஞ்சல் அழைப்புகளின் விநியோக நிலை.' : 'Live tracking of account onboarding invitations dispatched to Gmail addresses.'}
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
        
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center space-x-2">
            {['all', 'customer', 'worker'].map(r => (
              <button
                key={r}
                onClick={() => setFilterRole(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                  filterRole === r ? 'bg-teal-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {r === 'all' ? 'All Emails' : `${r} Invites`}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 font-semibold">
            {filtered.length} Dispatched
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Recipient & Gmail</th>
                <th className="px-5 py-3.5">Registration ID</th>
                <th className="px-5 py-3.5">Email Subject</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Delivery Status</th>
                <th className="px-5 py-3.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-500" />
                    Loading email records...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    No email notification records found.
                  </td>
                </tr>
              ) : (
                filtered.map(l => (
                  <tr key={l._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900 dark:text-white text-xs">{l.recipientName}</p>
                      <p className="text-teal-600 dark:text-teal-400 font-mono text-[11px]">{l.recipientEmail}</p>
                    </td>

                    <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-400 text-xs">
                      {l.targetId || '—'}
                    </td>

                    <td className="px-5 py-3.5 text-slate-800 dark:text-slate-200 text-xs max-w-xs truncate">
                      {l.subject}
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase">
                        {l.recipientRole || 'User'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      {l.deliveryStatus === 'sent' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center space-x-1 w-max">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Delivered</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/60 dark:text-red-400 flex items-center space-x-1 w-max">
                          <ShieldAlert className="w-3 h-3" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right text-slate-400 font-mono text-[11px]">
                      {l.sentAt ? new Date(l.sentAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}