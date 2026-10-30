import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api.js';
import { formatCurrency } from '../../utils/format.js';
import { 
  Users, Zap, DollarSign, Wallet, ShieldAlert, Clock, 
  TrendingUp, Activity, BellRing, PlayCircle, RefreshCw, CheckCircle, ChevronRight, Trash2,
  FileSpreadsheet, ShieldCheck, AlertTriangle, Landmark, ArrowDownToLine
} from 'lucide-react';
import { translations, getLanguage } from '../../utils/translations.js';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [leadsCount, setLeadsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [lang, setLang] = useState(getLanguage);

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
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
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

      {/* OWNER LEAD CRM PIPELINE ACTION BANNER */}
      <div 
        onClick={() => navigate('/admin/leads')}
        className="cursor-pointer p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-900/60 via-slate-900 to-indigo-950/60 border border-teal-500/30 hover:border-teal-500/60 shadow-md transition-all hover:scale-[1.01] flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
      >
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                Lead CRM & Inquiries Pipeline
              </h4>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {leadsCount} Active
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Review new prospects from Referral Portal, book site surveys, send 1-click quotations, and advance stages in Kanban view.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 text-xs font-bold text-teal-400 group-hover:text-teal-300 shrink-0">
          <span>Open CRM Board</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

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

    </div>
  );
}
