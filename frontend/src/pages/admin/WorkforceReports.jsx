import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import {
  TrendingUp, Award, Download, Printer, Filter,
  Users, CheckCircle2, Target, Calendar, Sparkles, RefreshCw
} from 'lucide-react';

export default function WorkforceReports() {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.get('/workforce/reports/performance');
      const perfList = Array.isArray(res.data) ? res.data : (res.data?.performance || []);
      setReports({ performance: perfList });
    } catch (err) {
      console.error('Failed to load performance reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reports?.performance) return;
    const headers = ['Employee ID', 'Full Name', 'Department', 'Designation', 'Total Tasks', 'Approved Work', 'Target Achievement %'];
    const rows = reports.performance.map(p => [
      p.employeeId,
      `"${p.fullName}"`,
      `"${p.department}"`,
      `"${p.designation}"`,
      p.totalTasks,
      p.approvedTasks,
      `${p.achievementPercentage}%`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MRS_SOLAR_Workforce_Performance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500">Generating Performance Analytics...</p>
      </div>
    );
  }

  const performanceList = reports?.performance || [];
  const topPerformer = performanceList.reduce((top, curr) => (curr.achievementPercentage > (top?.achievementPercentage || 0) ? curr : top), null);

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center space-x-2.5">
            <TrendingUp className="w-7 h-7 text-teal-600 dark:text-teal-400" />
            <span>Workforce Performance & Target Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Audited performance reports, quota achievement rankings, and workforce productivity insights.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center space-x-2 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center space-x-2 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button
            onClick={fetchReports}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TOP PERFORMER HIGHLIGHT BANNER */}
      {topPerformer && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-2xl border border-white/30 shadow-inner">
              👑
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-950 text-yellow-400">
                Star Performer of the Month
              </span>
              <h2 className="text-xl font-black mt-1">{topPerformer.fullName} ({topPerformer.employeeId})</h2>
              <p className="text-xs font-medium text-slate-900">
                {topPerformer.designation} • {topPerformer.department}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-6 text-center">
            <div>
              <p className="text-3xl font-black">{topPerformer.approvedTasks}</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-800">Completed Work</p>
            </div>
            <div>
              <p className="text-3xl font-black">{topPerformer.achievementPercentage}%</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-800">Target Achieved</p>
            </div>
          </div>
        </div>
      )}

      {/* PERFORMANCE RANKINGS TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center space-x-2">
            <Award className="w-4 h-4 text-purple-600" />
            <span>Individual Employee Achievement Rankings</span>
          </h3>
          <span className="text-xs text-slate-500">Live database audit</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Rank & Employee</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Total Assigned</th>
                <th className="p-3.5">Approved Work</th>
                <th className="p-3.5">Achievement Rate</th>
                <th className="p-3.5">Performance Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {performanceList.map((p, idx) => {
                const ach = p.achievementPercentage || 0;
                return (
                  <tr key={p.employeeId} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                    <td className="p-3.5">
                      <div className="flex items-center space-x-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                          idx === 0 ? 'bg-yellow-400 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white text-xs">{p.fullName}</p>
                          <p className="font-mono text-[10px] text-slate-400">{p.employeeId} • {p.designation}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300 font-medium">
                      {p.department}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300 font-bold">
                      {p.totalTasks} tasks
                    </td>
                    <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-bold">
                      {p.approvedTasks} units
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              ach >= 80 ? 'bg-emerald-500' : ach >= 50 ? 'bg-teal-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, ach)}%` }}
                          />
                        </div>
                        <span className="font-black text-xs text-slate-800 dark:text-white">{ach}%</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        ach >= 80
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : ach >= 50
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {ach >= 80 ? '🌟 Outstanding' : ach >= 50 ? '⚡ Good Progress' : '⏳ On Track'}
                      </span>
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
}
