import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import { formatDate } from '../../utils/format.js';
import { FolderLock, Shield, User, Clock, Terminal } from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const response = await api.get('/admin/audit-logs');
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Admin Activity Audits</h2>
        <p className="text-sm text-slate-500">Chronological ledger recording owner administrative events and adjustments.</p>
      </div>

      {/* AUDITS TABLE */}
      <div className="glass-premium rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900/30 flex items-center space-x-2">
          <FolderLock className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <span className="font-bold text-slate-800 dark:text-white">Administrative Event Logs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/50 dark:border-slate-800/50">
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Admin Username</th>
                <th className="px-6 py-4">Action Event</th>
                <th className="px-6 py-4">Target Entity</th>
                <th className="px-6 py-4">Action Metadata / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    No activity logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                      {new Date(log.timestamp).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">
                      <div className="flex items-center space-x-1">
                        <User className="w-3.5 h-3.5 text-teal-600" />
                        <span>{log.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-md font-bold font-mono text-[9px] uppercase border ${
                        log.action.includes('DELETE') 
                          ? 'bg-red-50 text-red-600 border-red-200/50 dark:bg-red-950/20'
                          : log.action.includes('CREATE') 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200/50 dark:bg-emerald-950/20'
                          : 'bg-teal-50 text-teal-600 border-teal-200/50 dark:bg-teal-950/20'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-800 dark:text-slate-200">{log.target}</td>
                    <td className="px-6 py-4 font-mono text-[10px] text-slate-500 dark:text-slate-400 max-w-xs truncate">
                      {JSON.stringify(log.details)}
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
