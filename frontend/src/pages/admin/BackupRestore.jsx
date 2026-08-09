import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import { formatDate } from '../../utils/format.js';
import { Database, PlusCircle, RefreshCw, CheckCircle, Clock, Archive } from 'lucide-react';

export default function BackupRestore() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBackups = async () => {
    try {
      const response = await api.get('/admin/backups');
      setBackups(response.data);
    } catch (error) {
      console.error('Error fetching backups list:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setActionLoading(true);
    try {
      const response = await api.post('/admin/backup/create', {});
      alert(`Backup successfully generated: ${response.data.backupName}`);
      fetchBackups();
    } catch (error) {
      console.error('Backup creation failed:', error);
      alert('Failed to generate database backup.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadMdb = async () => {
    try {
      const response = await api.get('/admin/backup/export-mdb', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `MRS_SOLAR_Backup_${Date.now()}.mdb`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download MDB failed:', error);
      alert('Failed to download database backup file.');
    }
  };

  const handleRestore = async (backupName) => {
    if (!confirm(`WARNING: Restoring will overwrite all current customer ledgers, payment schedules, and user credentials with the state stored in:\n"${backupName}"\n\nDo you want to proceed?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await api.post('/admin/backup/restore', { backupName });
      alert(`Database successfully restored to: ${backupName}`);
      fetchBackups();
    } catch (error) {
      console.error('Database restore failed:', error);
      alert(`Restore failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Database Backup & Recovery</h2>
          <p className="text-sm text-slate-500">Generate secure database recovery restore points and roll back data states.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownloadMdb}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl flex items-center space-x-2 text-sm font-bold transition-all shadow outline-none cursor-pointer"
          >
            <Archive className="w-4 h-4 text-yellow-400" />
            <span>Download .MDB Database</span>
          </button>

          <button
            onClick={handleCreateBackup}
            disabled={actionLoading}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-600/60 text-white rounded-xl flex items-center space-x-2 text-sm font-bold transition-all shadow shadow-teal-500/10 outline-none"
          >
            {actionLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <PlusCircle className="w-4 h-4" />
            )}
            <span>Create New Backup Point</span>
          </button>
        </div>
      </div>

      {/* BACKUPS DIRECTORY LIST */}
      <div className="glass-premium rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900/30 flex items-center space-x-2">
          <Database className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <span className="font-bold text-slate-800 dark:text-white">Available Recovery Points</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/50 dark:border-slate-800/50">
                <th className="px-6 py-4">Restore Folder Directory Name</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                    No database backups found. Click "Create New Backup Point" to create one.
                  </td>
                </tr>
              ) : (
                backups.map((name, index) => {
                  // Parse date from backup name (e.g. backup-2026-07-22T03-05-37-000Z)
                  const dateStr = name.replace('backup-', '').replace(/-(?=[^-]*$)/, '.').replace(/-/g, ':').replace('T', ' ');
                  
                  return (
                    <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        <div className="flex items-center space-x-2">
                          <Archive className="w-4 h-4 text-teal-600" />
                          <span>{name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {dateStr.substring(0, 19)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200/50">
                          <CheckCircle className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleRestore(name)}
                          disabled={actionLoading}
                          className="inline-flex items-center space-x-1 text-[10px] font-bold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 bg-red-50 dark:bg-red-950/20 border border-red-200/30 px-3 py-1.5 rounded-xl transition-all outline-none"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Rollback Database</span>
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
