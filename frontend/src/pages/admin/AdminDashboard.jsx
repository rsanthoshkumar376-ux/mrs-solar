import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import { formatCurrency } from '../../utils/format.js';
import { 
  Users, Zap, DollarSign, Wallet, ShieldAlert, Clock, 
  TrendingUp, Activity, BellRing, PlayCircle, RefreshCw, CheckCircle
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schedulerRunning, setSchedulerRunning] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const statsRes = await api.get('/admin/dashboard-stats');
      setStats(statsRes.data);

      const notificationsRes = await api.get('/customer/notifications');
      // Fetch only top 5 recent notifications for dashboard activity
      setNotifications(notificationsRes.data.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const triggerScheduler = async () => {
    setSchedulerRunning(true);
    try {
      const response = await api.post('/admin/trigger-scheduler', {});
      alert(`Midnight audit simulation completed successfully!\nCustomers Checked: ${response.data.details.checkedCount}`);
      await fetchDashboardData();
    } catch (error) {
      console.error('Scheduler execution failed:', error);
      alert('Failed to execute daily status audit check.');
    } finally {
      setSchedulerRunning(false);
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
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white">Owner Dashboard</h2>
          <p className="text-sm text-slate-500">Real-time solar project metrics, collections, and financial audits.</p>
        </div>

        <button
          onClick={triggerScheduler}
          disabled={schedulerRunning}
          className="bg-teal-600 hover:bg-teal-700 disabled:bg-teal-600/60 text-white font-bold px-4 py-3 rounded-2xl flex items-center space-x-2 transition-colors shadow-lg shadow-teal-500/10 outline-none"
        >
          {schedulerRunning ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <PlayCircle className="w-5 h-5" />
          )}
          <span>Run Midnight Audit Check</span>
        </button>
      </div>

      {/* DASHBOARD STATS CARD GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* STAT 1: Customers */}
        <div className="glass-premium rounded-3xl p-6 shadow-sm flex items-center space-x-4 border-l-4 border-l-teal-600 hover-scale">
          <div className="p-3 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Customers</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats?.totalCustomers}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{stats?.activeCustomers} Active | {stats?.completedCustomers} Paid Off</p>
          </div>
        </div>

        {/* STAT 2: Solar Projects */}
        <div className="glass-premium rounded-3xl p-6 shadow-sm flex items-center space-x-4 border-l-4 border-l-yellow-500 hover-scale">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/40 text-yellow-500 dark:text-yellow-400 rounded-2xl">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Solar Installations</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats?.totalSolarCapacityKw} kW</h3>
            <p className="text-xs text-slate-500 mt-0.5">Total capacity installed to date</p>
          </div>
        </div>

        {/* STAT 3: Loan Volume */}
        <div className="glass-premium rounded-3xl p-6 shadow-sm flex items-center space-x-4 border-l-4 border-l-indigo-600 hover-scale">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Loan Capital</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{formatCurrency(stats?.totalLoanAmount, false)}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Funded solar panel financing</p>
          </div>
        </div>

        {/* STAT 4: Collected */}
        <div className="glass-premium rounded-3xl p-6 shadow-sm flex items-center space-x-4 border-l-4 border-l-emerald-500 hover-scale">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 dark:text-emerald-400 rounded-2xl">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Capital Collected</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{formatCurrency(stats?.totalAmountCollected, false)}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Total EMIs + Penalties paid</p>
          </div>
        </div>

        {/* STAT 5: Overdue Count */}
        <div className="glass-premium rounded-3xl p-6 shadow-sm flex items-center space-x-4 border-l-4 border-l-red-500 hover-scale">
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 rounded-2xl">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Overdue Customers</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats?.overdueCustomers}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Customers with unpaid overdue EMIs</p>
          </div>
        </div>

        {/* STAT 6: Pending EMIs */}
        <div className="glass-premium rounded-3xl p-6 shadow-sm flex items-center space-x-4 border-l-4 border-l-orange-500 hover-scale">
          <div className="p-3 bg-orange-50 dark:bg-orange-950/40 text-orange-50 dark:text-orange-400 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Outstanding Dues</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{formatCurrency(stats?.totalOutstandingAmount, false)}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{stats?.pendingPaymentsCount} unpaid installments</p>
          </div>
        </div>

        {/* STAT 7: Profit */}
        <div className="glass-premium rounded-3xl p-6 shadow-sm flex items-center space-x-4 border-l-4 border-l-amber-500 hover-scale">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Profit</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{formatCurrency(stats?.totalProfit, false)}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Interest earned + late fee penalties</p>
          </div>
        </div>

        {/* STAT 8: Activity */}
        <div className="glass-premium rounded-3xl p-6 shadow-sm flex items-center space-x-4 border-l-4 border-l-slate-500 hover-scale">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Monthly Collection</p>
            {/* Display current month's collection */}
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">
              {formatCurrency(stats?.chartData?.collections[new Date().getMonth()] || 0, false)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Revenue collected in {stats?.chartData?.months[new Date().getMonth()]}</p>
          </div>
        </div>

      </div>

      {/* CHARTS & RECENT ALERTS SPLIT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CHART: COLLECTIONS IN CURRENT YEAR */}
        <div className="lg:col-span-2 glass-premium rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-lg">Monthly Income Progression</h3>
            <p className="text-xs text-slate-500">Collected repayments split by month during {new Date().getFullYear()}.</p>
          </div>

          {/* SVG/HTML Bar Chart */}
          <div className="h-64 flex items-end justify-between gap-1 pt-6 px-4">
            {stats?.chartData?.collections.map((val, idx) => {
              const heightPct = Math.max(8, Math.round((val / maxCollection) * 100));
              const monthName = stats.chartData.months[idx];
              const isCurrentMonth = new Date().getMonth() === idx;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap shadow">
                    Coll: {formatCurrency(val, false)}
                  </div>
                  
                  {/* Bar */}
                  <div 
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-lg transition-all duration-500 cursor-pointer ${
                      isCurrentMonth
                        ? 'bg-gradient-to-t from-yellow-500 to-amber-400 glow-yellow'
                        : 'bg-gradient-to-t from-teal-600 to-emerald-500 group-hover:from-teal-500 group-hover:to-emerald-400'
                    }`}
                  ></div>
                  
                  {/* Month Label */}
                  <span className={`text-[10px] font-bold mt-2 ${isCurrentMonth ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`}>
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
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
              <BellRing className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h3 className="font-bold text-slate-800 dark:text-white">Recent Activity Alerts</h3>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[220px]">
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No alerts logged today.</p>
              ) : (
                notifications.map((n) => (
                  <div key={n._id} className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex items-start space-x-2.5 text-[11px] leading-relaxed">
                    {n.type?.includes('Overdue') ? (
                      <ShieldAlert className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    ) : n.type?.includes('Payment') ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Users className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-bold text-slate-700 dark:text-slate-200">{n.title}</p>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5">{n.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
