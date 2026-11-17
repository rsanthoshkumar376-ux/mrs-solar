import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api.js';
import { formatCurrency } from '../../utils/format.js';
import { 
  Users, Zap, DollarSign, Wallet, ShieldAlert, Clock, 
  TrendingUp, Activity, BellRing, PlayCircle, RefreshCw, CheckCircle, ChevronRight, Trash2,
  FileSpreadsheet, ShieldCheck, AlertTriangle, Landmark, ArrowDownToLine, Target, Award, Sparkles,
  Headphones, Star, MessageSquare, ChevronDown, ChevronUp, UserCheck, MessageSquareShare, X
} from 'lucide-react';
import { translations, getLanguage } from '../../utils/translations.js';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [leadsCount, setLeadsCount] = useState(0);
  const [workforceStats, setWorkforceStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [lang, setLang] = useState(getLanguage);

  // Customer Live Support Monitoring States
  const [supportData, setSupportData] = useState(null);
  const [supportSearch, setSupportSearch] = useState('');
  const [supportFilter, setSupportFilter] = useState('all');
  const [inspectingTicket, setInspectingTicket] = useState(null);
  const [inspectingMessages, setInspectingMessages] = useState([]);
  const [reassigningTicket, setReassigningTicket] = useState(null);
  const [selectedNewManager, setSelectedNewManager] = useState('');
  const [reassignLoading, setReassignLoading] = useState(false);
  const [managersList, setManagersList] = useState([]);

  useEffect(() => {
    const handleLangChange = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLangChange);
    return () => window.removeEventListener('language-change', handleLangChange);
  }, []);

  const t = translations[lang] || translations.en;

  const fetchDashboardData = async () => {
    try {
      const statsRes = await api.get('/admin/dashboard-stats');
      setStats(statsRes.data);

      const notificationsRes = await api.get('/customer/notifications');
      // Fetch only top 5 recent notifications for dashboard activity
      setNotifications(notificationsRes.data.slice(0, 5));

      try {
        const leadsRes = await api.get('/admin/leads');
        setLeadsCount(Array.isArray(leadsRes.data) ? leadsRes.data.filter(l => l.status !== 'Lost' && l.status !== 'Installed').length : 0);
      } catch (lErr) {}

      try {
        const wfRes = await api.get('/workforce/reports/overview');
        setWorkforceStats(wfRes.data);
      } catch (wfErr) {}

      try {
        const supportRes = await api.get('/support/owner/monitoring');
        setSupportData(supportRes.data);
      } catch (sErr) {}

      try {
        const empRes = await api.get('/workforce/employees');
        const list = Array.isArray(empRes.data) ? empRes.data : (empRes.data?.employees || []);
        setManagersList(list.filter(e => e.role === 'manager' || (e.designation && e.designation.toLowerCase().includes('manager'))));
      } catch (eErr) {}
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInspectTicket = async (ticket) => {
    setInspectingTicket(ticket);
    try {
      const res = await api.get(`/support/tickets/${ticket._id}/messages`);
      setInspectingMessages(res.data?.messages || []);
    } catch (e) {
      setInspectingMessages([]);
    }
  };

  const handleReassignSubmit = async () => {
    if (!reassigningTicket?._id || !selectedNewManager) return;
    try {
      setReassignLoading(true);
      const mgr = managersList.find(m => m.employeeId === selectedNewManager);
      await api.post(`/support/tickets/${reassigningTicket._id}/reassign`, {
        newManagerId: selectedNewManager,
        newManagerName: mgr?.fullName || 'Assigned Manager'
      });
      alert(`Ticket ${reassigningTicket.ticketId} successfully reassigned to ${mgr?.fullName || selectedNewManager}`);
      setReassigningTicket(null);
      setSelectedNewManager('');
      fetchDashboardData();
    } catch (err) {
      alert('Failed to reassign ticket');
    } finally {
      setReassignLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const triggerScheduler = async (force = false) => {
    setSchedulerRunning(true);
    try {
      const response = await api.post('/admin/trigger-scheduler', { force });
      const details = response.data?.details || {};

      if (details.alreadyRun && !force) {
        const baseMsg = t.auditAlreadyRunAlert
          ? t.auditAlreadyRunAlert
              .replace('{date}', details.auditDate || '')
              .replace('{count}', details.lastRun?.checkedCount || details.checkedCount || 0)
          : `Today's midnight audit (${details.auditDate}) has already completed successfully.\n\nIdempotency protected: Duplicate penalties prevented.`;

        const confirmMsg = baseMsg + (language === 'ta' 
          ? '\n\nகட்டாயமாக மீண்டும் இயக்க விரும்புகிறீர்களா?' 
          : '\n\nDo you want to force a re-run anyway?');

        const wantForce = window.confirm(confirmMsg);
        if (wantForce) {
          return await triggerScheduler(true);
        }
      } else {
        alert(
          t.auditCompletedAlert
            ? t.auditCompletedAlert.replace('{count}', details.checkedCount || 0)
            : `Midnight audit completed successfully!\nCustomers Checked: ${details.checkedCount || 0}`
        );
      }
      await fetchDashboardData();
    } catch (error) {
      console.error('Scheduler execution failed:', error);
      alert(t.auditFailedAlert || 'Failed to execute daily status audit check.');
    } finally {
      setSchedulerRunning(false);
    }
  };

  const handleClearNotifications = async (e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(t.clearAllConfirm || 'Are you sure you want to clear all notifications?')) return;
    try {
      await api.delete('/customer/notifications');
      setNotifications([]);
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  const handleDeleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/customer/notifications?id=${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleExportCsv = async () => {
    setExportLoading(true);
    try {
      const response = await api.get('/admin/backup/export-csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `MRS_SOLAR_Tally_Audit_Ledger_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download CSV failed:', error);
      alert('Failed to export CA/Tally CSV ledger.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const response = await api.get('/admin/backup/export-mdb', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `MRS_SOLAR_Financial_Ledger_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download Excel failed:', error);
      alert('Failed to export Excel ledger.');
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Find max value in monthly collections for sizing the chart
  const maxCollection = stats?.chartData?.collections.length > 0
    ? Math.max(...stats.chartData.collections, 10000)
    : 10000;

  return (
    <div className="space-y-8 pb-12">
      
      {/* HEADER WITH RUN MANUAL CALCULATIONS BUTTON */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white">{t.ownerDashboard}</h2>
          <p className="text-sm text-slate-500">{t.ownerDashboardSubtitle}</p>
        </div>

        <button
          onClick={triggerScheduler}
          disabled={schedulerRunning}
          className="w-full sm:w-auto justify-center bg-teal-600 hover:bg-teal-700 disabled:bg-teal-600/60 text-white font-bold px-4 py-2.5 sm:py-3 rounded-2xl flex items-center space-x-2 transition-colors shadow-lg shadow-teal-500/10 outline-none text-xs sm:text-sm"
        >
          {schedulerRunning ? (
            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin shrink-0" />
          ) : (
            <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          )}
          <span>{schedulerRunning ? t.runningMidnightAudit : t.runMidnightAuditCheck}</span>
        </button>
      </div>

      {/* WORKFORCE & TEAM MANAGEMENT QUICK ACCESS */}
      {workforceStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div 
            onClick={() => navigate('/admin/employees')}
            className="cursor-pointer p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-teal-500 transition-all group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Total Workforce</span>
              <Users className="w-4 h-4 text-teal-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-xl font-black text-slate-800 dark:text-white">
              {workforceStats.workforce?.totalEmployees || 0}
            </p>
            <p className="text-[10px] text-teal-600 font-semibold mt-0.5">
              {workforceStats.workforce?.activeEmployees || 0} Active Staff • Manage →
            </p>
          </div>

          <div 
            onClick={() => navigate('/admin/tasks')}
            className="cursor-pointer p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-500 transition-all group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Field Tasks</span>
              <Clock className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-xl font-black text-blue-600 dark:text-blue-400">
              {workforceStats.tasks?.inProgress || 0} In Progress
            </p>
            <p className="text-[10px] text-amber-500 font-semibold mt-0.5">
              {workforceStats.tasks?.pendingApproval || 0} Awaiting Review • View →
            </p>
          </div>

          <div 
            onClick={() => navigate('/admin/projects')}
            className="cursor-pointer p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-yellow-500 transition-all group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Solar Installations</span>
              <Zap className="w-4 h-4 text-yellow-500 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-xl font-black text-yellow-600 dark:text-yellow-400">
              {workforceStats.projects?.ongoingInstallations || 0} Ongoing
            </p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
              {workforceStats.projects?.completedInstallations || 0} Commissioned • Track →
            </p>
          </div>

          <div 
            onClick={() => navigate('/admin/targets')}
            className="cursor-pointer p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-purple-500 transition-all group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Target Achievement</span>
              <Target className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-xl font-black text-purple-600 dark:text-purple-400">
              {workforceStats.targets?.monthlyAchievementPercentage || 0}%
            </p>
            <p className="text-[10px] text-purple-600 font-semibold mt-0.5">
              {workforceStats.targets?.approvedUnits || 0} / {workforceStats.targets?.totalTargetUnits || 0} Units • Quotas →
            </p>
          </div>
        </div>
      )}

      {/* DASHBOARD STATS CARD GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        
        {/* STAT 1: Customers */}
        <div className="glass-premium rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm flex items-center space-x-3.5 border-l-4 border-l-teal-600 hover-scale">
          <div className="p-3 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t.totalCustomers}</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats?.totalCustomers}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.activePaidOffDesc 
                ? t.activePaidOffDesc.replace('{active}', stats?.activeCustomers || 0).replace('{completed}', stats?.completedCustomers || 0)
                : `${stats?.activeCustomers} Active | ${stats?.completedCustomers} Paid Off`}
            </p>
          </div>
        </div>

        {/* STAT 2: Solar Projects */}
        <div className="glass-premium rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm flex items-center space-x-3.5 border-l-4 border-l-yellow-500 hover-scale">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/40 text-yellow-500 dark:text-yellow-400 rounded-2xl">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t.solarInstallations}</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats?.totalSolarCapacityKw} kW</h3>
            <p className="text-xs text-slate-500 mt-0.5">{t.totalCapacityInstalled}</p>
          </div>
        </div>

        {/* STAT 3: Loan Volume */}
        <div className="glass-premium rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm flex items-center space-x-3.5 border-l-4 border-l-indigo-600 hover-scale">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t.totalLoanCapital}</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{formatCurrency(stats?.totalLoanAmount, false)}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{t.fundedSolarFinancing}</p>
          </div>
        </div>

        {/* STAT 4: Collected */}
        <div className="glass-premium rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm flex items-center space-x-3.5 border-l-4 border-l-emerald-500 hover-scale">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 dark:text-emerald-400 rounded-2xl">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t.capitalCollected}</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{formatCurrency(stats?.totalAmountCollected, false)}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{t.totalEmisPenaltiesPaid}</p>
          </div>
        </div>

        {/* STAT 5: Overdue Count */}
        <div className="glass-premium rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm flex items-center space-x-3.5 border-l-4 border-l-red-500 hover-scale">
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 rounded-2xl">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t.overdueCustomers}</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats?.overdueCustomers}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{t.unpaidOverdueNote}</p>
          </div>
        </div>

        {/* STAT 6: Pending EMIs */}
        <div className="glass-premium rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm flex items-center space-x-3.5 border-l-4 border-l-orange-500 hover-scale">
          <div className="p-3 bg-orange-50 dark:bg-orange-950/40 text-orange-50 dark:text-orange-400 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t.outstandingDues}</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{formatCurrency(stats?.totalOutstandingAmount, false)}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.unpaidInstallmentsCount 
                ? t.unpaidInstallmentsCount.replace('{count}', stats?.pendingPaymentsCount || 0)
                : `${stats?.pendingPaymentsCount} unpaid installments`}
            </p>
          </div>
        </div>

        {/* STAT 7: Profit */}
        <div className="glass-premium rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm flex items-center space-x-3.5 border-l-4 border-l-amber-500 hover-scale">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t.totalProfit}</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{formatCurrency(stats?.totalProfit, false)}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{t.interestLateFeeProfitNote}</p>
          </div>
        </div>

        {/* STAT 8: Activity */}
        <div className="glass-premium rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm flex items-center space-x-3.5 border-l-4 border-l-slate-500 hover-scale">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t.monthlyCollection}</p>
            {/* Display current month's collection */}
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">
              {formatCurrency(stats?.chartData?.collections[new Date().getMonth()] || 0, false)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {(() => {
                const curMonthIdx = new Date().getMonth();
                const curMonthName = (t.monthsFull && t.monthsFull[curMonthIdx]) || (stats?.chartData?.months && stats.chartData.months[curMonthIdx]) || '';
                return t.revenueCollectedIn 
                  ? t.revenueCollectedIn.replace('{month}', curMonthName)
                  : `Revenue collected in ${curMonthName}`;
              })()}
            </p>
          </div>
        </div>

      </div>

      {/* PHASE 4: PORTFOLIO-AT-RISK (PAR) & FINANCIAL P&L ANALYTICS */}
      <div className="glass-premium rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/60 dark:border-slate-800/80 space-y-6">
        
        {/* SECTION HEADER WITH EXPORT ACTIONS */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Landmark className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center space-x-2">
                  <span>{t.portfolioAtRiskTitle}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-full">
                    Banking / NBFC Grade
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{t.portfolioAtRiskSubtitle}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportCsv}
              disabled={exportLoading}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center space-x-1.5 transition-colors border border-slate-200 dark:border-slate-700 disabled:opacity-60"
              title="Download CA / Tally compatible ledger with HSN 8541 and state codes"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{exportLoading ? t.exportingAudit : t.exportTallyCsvBtn}</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={exportLoading}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white flex items-center space-x-1.5 transition-colors shadow-sm shadow-teal-500/20 disabled:opacity-60"
              title="Download complete multi-sheet Excel financial ledger"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>{exportLoading ? t.exportingAudit : t.exportExcelLedgerBtn}</span>
            </button>
          </div>
        </div>

        {/* 4-TIER PAR DELINQUENCY METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* PAR 0: Standard / Performing */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">{t.par0Title}</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="mt-2 text-xl font-black text-slate-800 dark:text-white">
              {formatCurrency(stats?.parMetrics?.par0Amount || 0, false)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{t.par0Desc}</p>
          </div>

          {/* PAR 30: Watchlist */}
          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">{t.par30Title}</span>
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="mt-2 text-xl font-black text-slate-800 dark:text-white">
              {formatCurrency(stats?.parMetrics?.par30Amount || 0, false)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{t.par30Desc}</p>
          </div>

          {/* PAR 60: Substandard */}
          <div className="p-4 rounded-2xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-800/40 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider">{t.par60Title}</span>
              <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="mt-2 text-xl font-black text-slate-800 dark:text-white">
              {formatCurrency(stats?.parMetrics?.par60Amount || 0, false)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{t.par60Desc}</p>
          </div>

          {/* PAR 90+: NPA */}
          <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">{t.par90Title}</span>
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 animate-pulse" />
            </div>
            <div className="mt-2 text-xl font-black text-slate-800 dark:text-white">
              {formatCurrency(stats?.parMetrics?.npaAmount || 0, false)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{t.par90Desc}</p>
          </div>

        </div>

        {/* PAR RATIO & CAPITAL RECOVERY EFFICIENCY STRIP */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          
          {/* Collection Efficiency */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">{t.collectionEfficiency}</p>
              <p className="text-xs text-slate-400 mt-0.5">Total collected vs scheduled billing volume</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-teal-600 dark:text-teal-400 font-mono">
                {stats?.parMetrics?.collectionEfficiencyPct || '100.0'}%
              </span>
            </div>
          </div>

          {/* Gross NPA Ratio */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">{t.npaRatio}</p>
              <p className="text-xs text-slate-400 mt-0.5">PAR 90+ non-performing loans vs total book</p>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-black font-mono ${
                Number(stats?.parMetrics?.npaRatioPct || 0) > 5 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {stats?.parMetrics?.npaRatioPct || '0.0'}%
              </span>
            </div>
          </div>

        </div>

        {/* FINANCIAL P&L REVENUE & EXPENSES BREAKDOWN */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t.financialPnLTitle}
            </h4>
            <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">
              {t.netProfitMargin}: {stats?.parMetrics?.netProfitMarginPct || '0.0'}%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">{t.disbursedPrincipal}</span>
              <span className="text-sm sm:text-base font-black text-slate-800 dark:text-white font-mono mt-1 block">
                {formatCurrency(stats?.parMetrics?.totalPrincipalDisbursed || stats?.totalLoanAmount || 0, false)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">{t.recoveredPrincipal}</span>
              <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
                {formatCurrency(stats?.parMetrics?.totalPrincipalCollected || 0, false)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">{t.realizedInterest}</span>
              <span className="text-sm sm:text-base font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1 block">
                {formatCurrency(stats?.parMetrics?.totalInterestIncome || 0, false)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">{t.recoveredLateFees}</span>
              <span className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 font-mono mt-1 block">
                {formatCurrency(stats?.parMetrics?.totalLateFeeIncome || 0, false)}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* CHARTS & RECENT ALERTS SPLIT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHART: COLLECTIONS IN CURRENT YEAR */}
        <div className="lg:col-span-2 glass-premium rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base sm:text-lg">{t.monthlyIncomeProgression}</h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                {t.collectedRepaymentsSplit 
                  ? t.collectedRepaymentsSplit.replace('{year}', new Date().getFullYear())
                  : `Collected repayments split by month during ${new Date().getFullYear()}.`}
              </p>
            </div>

            {/* Quick summary metrics */}
            <div className="flex items-center space-x-2">
              <div className="bg-teal-50 dark:bg-teal-950/60 border border-teal-200/50 dark:border-teal-800/50 px-2.5 py-1 rounded-xl text-right">
                <span className="text-[9px] uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold block">{t.annualTotal || 'Year Total'}</span>
                <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white font-mono">
                  {formatCurrency((stats?.chartData?.collections || []).reduce((a, b) => a + b, 0), false)}
                </span>
              </div>
            </div>
          </div>

          {/* SVG/HTML Bar Chart with Reference Grid */}
          <div className="relative h-44 sm:h-52 md:h-60 flex items-end justify-between gap-1 pt-6 px-1 sm:px-4">
            {/* Background reference lines */}
            <div className="absolute inset-x-0 top-6 bottom-7 pointer-events-none flex flex-col justify-between opacity-30 dark:opacity-20">
              <div className="border-b border-dashed border-slate-300 dark:border-slate-700 w-full flex justify-end">
                <span className="text-[9px] font-mono text-slate-400 pr-1 -mt-3">{formatCurrency(maxCollection, false)}</span>
              </div>
              <div className="border-b border-dashed border-slate-300 dark:border-slate-700 w-full flex justify-end">
                <span className="text-[9px] font-mono text-slate-400 pr-1 -mt-3">{formatCurrency(Math.round(maxCollection / 2), false)}</span>
              </div>
              <div className="border-b border-slate-300 dark:border-slate-700 w-full"></div>
            </div>

            {stats?.chartData?.collections.map((val, idx) => {
              const heightPct = val > 0 
                ? Math.max(12, Math.round((val / maxCollection) * 100))
                : 4; // Minimal baseline dot for zero months
              const defaultMonthName = stats.chartData.months[idx];
              const monthName = (t.monthsShort && t.monthsShort[idx]) || defaultMonthName;
              const isCurrentMonth = new Date().getMonth() === idx;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end z-10">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 whitespace-nowrap shadow-lg pointer-events-none">
                    {monthName}: {formatCurrency(val, false)}
                  </div>

                  {/* Value callout for peak or active months on mobile */}
                  {val > 0 && (
                    <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400 mb-1 scale-90 sm:scale-100 hidden sm:block">
                      {val >= 1000 ? `₹${Math.round(val / 1000)}k` : `₹${val}`}
                    </span>
                  )}
                  
                  {/* Bar */}
                  <div 
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[28px] rounded-t-lg transition-all duration-500 cursor-pointer ${
                      val === 0 
                        ? 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700' 
                        : isCurrentMonth
                        ? 'bg-gradient-to-t from-yellow-500 to-amber-400 glow-yellow shadow-md shadow-amber-500/20'
                        : 'bg-gradient-to-t from-teal-600 to-emerald-500 group-hover:from-teal-500 group-hover:to-emerald-400 shadow-sm'
                    }`}
                  ></div>
                  
                  {/* Month Label */}
                  <span className={`text-[9px] sm:text-[10px] font-bold mt-2 truncate ${isCurrentMonth ? 'text-teal-600 dark:text-teal-400 underline decoration-2' : 'text-slate-400'}`}>
                    {monthName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* RECENT ALERTS */}
        <div className="glass-premium rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
              <div className="flex items-center space-x-2">
                <BellRing className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="font-bold text-slate-800 dark:text-white">{t.recentActivityAlerts}</h3>
              </div>
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearNotifications}
                  className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 font-semibold flex items-center space-x-1 hover:underline"
                  title={t.clearAllNotifications || 'Clear All'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.clearAllNotifications || 'Clear All'}</span>
                </button>
              )}
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[220px]">
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">{t.noAlertsToday}</p>
              ) : (
                notifications.map((n) => {
                  const targetCustomerId = n.customerId || n.message?.match(/SOL-\d+/)?.[0];
                  return (
                    <div 
                      key={n._id} 
                      onClick={() => {
                        if (targetCustomerId) {
                          navigate(`/admin/customers/${targetCustomerId}`);
                        } else {
                          navigate('/admin/customers');
                        }
                      }}
                      title={t.clickToOpenFile || "Click to open customer file"}
                      className="p-3 bg-slate-50 dark:bg-slate-900/50 hover:bg-teal-50/60 dark:hover:bg-slate-800/80 border border-slate-200/50 dark:border-slate-800/50 hover:border-teal-500/40 rounded-2xl flex items-start justify-between text-[11px] leading-relaxed cursor-pointer group transition-all"
                    >
                      <div className="flex items-start space-x-2.5 flex-1 min-w-0 pr-2">
                        {n.type?.includes('Overdue') ? (
                          <ShieldAlert className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        ) : n.type?.includes('Payment') ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Users className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{n.title}</p>
                          <p className="text-slate-500 dark:text-slate-400 mt-0.5">{n.message}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0 mt-0.5">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteNotification(n._id, e)}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors opacity-70 group-hover:opacity-100"
                          title="Clear this alert"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SECTION: CUSTOMER LIVE SUPPORT & SLA PERFORMANCE MONITORING (OWNER VIEW) */}
      {/* ========================================================================= */}
      <div id="support-monitoring" className="glass-premium rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/60 dark:border-slate-800/80 space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-black text-slate-800 dark:text-white">
                  Customer Live Support & SLA Escalation Monitoring
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded-full font-mono">
                  Owner Audit
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time human manager dispatch, AI-to-staff escalations, customer satisfaction ratings, and response SLA tracking.
              </p>
            </div>
          </div>

          <button
            onClick={fetchDashboardData}
            className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Monitoring</span>
          </button>
        </div>

        {/* 6 KPI METRICS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Total Requests</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white font-mono mt-1 block">
              {supportData?.kpis?.totalTickets ?? 0}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">AI Escalated</span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 block tracking-wider">New & Pending</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1 block">
              {supportData?.kpis?.openTickets ?? 0}
            </span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 block">In Dispatch Queue</span>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400 block tracking-wider">In Progress</span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono mt-1 block">
              {supportData?.kpis?.inProgressTickets ?? 0}
            </span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 block">Manager Chat Active</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 block tracking-wider">Resolved Tickets</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
              {(supportData?.kpis?.resolvedTickets ?? 0) + (supportData?.kpis?.closedTickets ?? 0)}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 block">Customer Satisfied</span>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-300 dark:border-amber-700 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-amber-800 dark:text-amber-300 block tracking-wider">Satisfaction</span>
            <div className="flex items-center space-x-1.5 mt-1">
              <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
              <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">
                {supportData?.kpis?.avgRating ? Number(supportData.kpis.avgRating).toFixed(1) : '5.0'}
              </span>
            </div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 block">Average Rating / 5.0</span>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-400 block tracking-wider">Avg Response Time</span>
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono mt-1 block">
              {supportData?.kpis?.avgResponseMinutes ?? 12}m
            </span>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5 block">Manager Pickup SLA</span>
          </div>
        </div>

        {/* MANAGER SUPPORT PERFORMANCE TABLE */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center space-x-1.5">
              <Users className="w-4 h-4 text-teal-500" />
              <span>Individual Manager Support Performance</span>
            </h4>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="p-3">Manager Name & ID</th>
                  <th className="p-3 text-center">Assigned</th>
                  <th className="p-3 text-center">Active Now</th>
                  <th className="p-3 text-center">Resolved</th>
                  <th className="p-3 text-center">Satisfaction</th>
                  <th className="p-3 text-center">Avg Response</th>
                  <th className="p-3 text-right">Performance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                {(supportData?.managerPerformance || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-slate-400 italic">
                      No manager assignments logged yet.
                    </td>
                  </tr>
                ) : (
                  supportData.managerPerformance.map((mgr, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center font-black text-xs">
                          {mgr.managerName?.charAt(0) || 'M'}
                        </div>
                        <div>
                          <span>{mgr.managerName}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">({mgr.managerId})</span>
                        </div>
                      </td>
                      <td className="p-3 text-center font-mono font-bold">{mgr.assignedCount}</td>
                      <td className="p-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400">{mgr.activeCount}</td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{mgr.resolvedCount}</td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center space-x-1 font-bold text-amber-500 font-mono">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{Number(mgr.avgRating || 5).toFixed(1)}/5</span>
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">
                        {mgr.avgResponseMinutes || 10} mins
                      </td>
                      <td className="p-3 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          Optimal SLA
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SUPPORT TICKETS AUDIT LOG WITH SEARCH & REASSIGN ACTION */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center space-x-1.5">
              <MessageSquare className="w-4 h-4 text-amber-500" />
              <span>Master Support Requests & Audit Stream</span>
            </h4>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={supportSearch}
                onChange={(e) => setSupportSearch(e.target.value)}
                placeholder="Filter by ticket, customer, manager..."
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 w-52 sm:w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="p-3">Ticket ID</th>
                  <th className="p-3">Customer Profile</th>
                  <th className="p-3">Solar Specs</th>
                  <th className="p-3">AI Issue Summary</th>
                  <th className="p-3">Assigned Manager</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                {(supportData?.tickets || []).filter(t => {
                  if (!supportSearch.trim()) return true;
                  const q = supportSearch.toLowerCase();
                  return (t.ticketId || '').toLowerCase().includes(q)
                    || (t.customerName || '').toLowerCase().includes(q)
                    || (t.customerMobile || '').toLowerCase().includes(q)
                    || (t.assignedManagerName || '').toLowerCase().includes(q)
                    || (t.issueSummary || '').toLowerCase().includes(q);
                }).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-slate-400 italic">
                      No support tickets logged.
                    </td>
                  </tr>
                ) : (
                  (supportData?.tickets || []).filter(t => {
                    if (!supportSearch.trim()) return true;
                    const q = supportSearch.toLowerCase();
                    return (t.ticketId || '').toLowerCase().includes(q)
                      || (t.customerName || '').toLowerCase().includes(q)
                      || (t.customerMobile || '').toLowerCase().includes(q)
                      || (t.assignedManagerName || '').toLowerCase().includes(q)
                      || (t.issueSummary || '').toLowerCase().includes(q);
                  }).map((ticket) => (
                    <tr key={ticket._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                        {ticket.ticketId}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-800 dark:text-white block">{ticket.customerName}</span>
                        <span className="text-[10px] text-slate-400">{ticket.customerMobile}</span>
                      </td>
                      <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                        {ticket.systemCapacityKw || 3} kWp • {ticket.district || 'Thiruvallur'}
                      </td>
                      <td className="p-3 max-w-xs truncate text-slate-600 dark:text-slate-300" title={ticket.issueSummary}>
                        {ticket.issueSummary}
                      </td>
                      <td className="p-3 font-bold text-teal-600 dark:text-teal-400">
                        {ticket.assignedManagerName || 'Unassigned'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ticket.status === 'open' || ticket.status === 'pending'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : ticket.status === 'in_progress'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleInspectTicket(ticket)}
                          className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-[11px] font-bold hover:bg-teal-100 transition-colors"
                        >
                          Inspect Chat
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReassigningTicket(ticket);
                            setSelectedNewManager(managersList[0]?.employeeId || '');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-200 transition-colors"
                        >
                          Reassign
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CUSTOMER SATISFACTION REVIEWS & FEEDBACK STREAM */}
        {(supportData?.feedbackReviews || []).length > 0 && (
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <h4 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center space-x-1.5">
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              <span>Customer Satisfaction Reviews & Manager Feedback</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {supportData.feedbackReviews.map((rev) => (
                <div key={rev._id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">{rev.customerName}</span>
                    <div className="flex items-center space-x-0.5 text-amber-500">
                      {[...Array(rev.customerRating || 5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                  {rev.customerFeedback && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 italic">
                      "{rev.customerFeedback}"
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                    <span>Ticket: <strong className="font-mono text-slate-600 dark:text-slate-300">{rev.ticketId}</strong></span>
                    <span>Manager: <strong className="text-teal-600">{rev.assignedManagerName || 'Support'}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* INSPECTION AUDIT MODAL */}
      {inspectingTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-black text-sm px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  {inspectingTicket.ticketId}
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Support Audit: {inspectingTicket.customerName}
                </h3>
              </div>
              <button onClick={() => setInspectingTicket(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
                <p>Customer: <strong>{inspectingTicket.customerName}</strong> ({inspectingTicket.customerMobile})</p>
                <p>Solar Capacity: <strong>{inspectingTicket.systemCapacityKw || 3} kWp Rooftop</strong></p>
                <p>Assigned Manager: <strong className="text-teal-600">{inspectingTicket.assignedManagerName || 'Unassigned'}</strong></p>
                <p>Status: <strong className="capitalize">{inspectingTicket.status}</strong></p>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs space-y-1">
                <p className="font-bold text-amber-800 dark:text-amber-300">AI Issue Summary:</p>
                <p className="text-slate-700 dark:text-slate-300">{inspectingTicket.issueSummary}</p>
              </div>
            </div>

            {/* PREVIOUS AI TRANSCRIPT */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Original AI Chat Transcript:</h4>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 max-h-40 overflow-y-auto space-y-1.5 text-xs">
                {(inspectingTicket.aiConversationTranscript || []).map((m, i) => (
                  <div key={i}>
                    <strong className={m.role === 'user' ? 'text-teal-600' : 'text-slate-500'}>
                      {m.role === 'user' ? inspectingTicket.customerName : 'AI Copilot'}:
                    </strong>{' '}
                    <span>{m.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* LIVE CONVERSATION MESSAGES */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Manager Support Chat Log:</h4>
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-60 overflow-y-auto space-y-2 text-xs">
                {inspectingMessages.length === 0 ? (
                  <p className="text-slate-400 italic">No live messages recorded in this support session.</p>
                ) : (
                  inspectingMessages.map((msg, i) => (
                    <div key={i} className={`p-2.5 rounded-xl ${msg.senderRole === 'manager' ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200' : 'bg-slate-100 dark:bg-slate-800'}`}>
                      <span className="font-bold text-[10px] uppercase text-slate-400 block mb-0.5">
                        {msg.senderRole === 'manager' ? `${msg.senderName || 'Manager'}` : inspectingTicket.customerName} • {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ''}
                      </span>
                      <p>{msg.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInspectingTicket(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
              >
                Close Audit Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REASSIGN TICKET MODAL */}
      {reassigningTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Reassign Support Ticket: {reassigningTicket.ticketId}
              </h3>
              <button onClick={() => setReassigningTicket(null)}>
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Customer: <strong className="text-slate-800 dark:text-slate-200">{reassigningTicket.customerName}</strong> • Current Manager: <strong className="text-amber-600">{reassigningTicket.assignedManagerName || 'Unassigned'}</strong>
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Select New Support Manager *
              </label>
              <select
                value={selectedNewManager}
                onChange={(e) => setSelectedNewManager(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              >
                {managersList.map((m) => (
                  <option key={m.employeeId} value={m.employeeId}>
                    {m.fullName} ({m.employeeId}) — {m.department || 'Management'}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setReassigningTicket(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReassignSubmit}
                disabled={reassignLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md transition-colors"
              >
                {reassignLoading ? 'Reassigning...' : 'Confirm Reassignment'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
