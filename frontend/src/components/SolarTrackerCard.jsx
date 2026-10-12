import React, { useState } from 'react';
import { 
  Sun, Zap, Clock, Home, ArrowUpRight, TrendingUp, Calendar, 
  PlusCircle, CheckCircle2, ExternalLink, Copy, Check, BatteryCharging,
  ShieldCheck, Leaf
} from 'lucide-react';
import { formatCurrency } from '../utils/format.js';
import { launchTnebQuickPay, launchTnebBbpsPay } from '../utils/tneb.js';

export default function SolarTrackerCard({ 
  solarStats, 
  customer, 
  t, 
  lang, 
  onLogReading,
  isAdmin = false 
}) {
  const [showLogModal, setShowLogModal] = useState(false);
  const [copiedTneb, setCopiedTneb] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state for logging reading
  const [logForm, setLogForm] = useState({
    date: new Date().toISOString().split('T')[0],
    unitsGenerated: '',
    runtimeHours: '',
    unitsConsumed: '',
    gridExport: '',
    notes: ''
  });

  const today = solarStats?.today || {
    unitsGenerated: Math.round((Number(customer?.solarCapacity) || 3) * 4.3 * 10) / 10,
    runtimeHours: 7.5,
    unitsConsumed: Math.round((Number(customer?.solarCapacity) || 3) * 3.1 * 10) / 10,
    gridExport: Math.round((Number(customer?.solarCapacity) || 3) * 1.2 * 10) / 10,
    savingsAmount: Math.round((Number(customer?.solarCapacity) || 3) * 4.3 * 6.5)
  };

  const last7Days = solarStats?.last7Days || [];
  const maxUnits = Math.max(...last7Days.map(d => d.unitsGenerated || 0), 10);
  const tnebNumber = customer?.tnebConsumerNumber || solarStats?.tnebConsumerNumber || '';

  const handleCopyTneb = async () => {
    if (!tnebNumber) return;
    try {
      await navigator.clipboard.writeText(tnebNumber);
      setCopiedTneb(true);
      setTimeout(() => setCopiedTneb(false), 2000);
    } catch {}
  };

  const handleOpenTneb = () => {
    launchTnebQuickPay(tnebNumber, { lang });
    setCopiedTneb(true);
    setTimeout(() => setCopiedTneb(false), 2500);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!onLogReading) return;
    setSubmitting(true);
    try {
      await onLogReading(logForm);
      setShowLogModal(false);
      setLogForm({
        date: new Date().toISOString().split('T')[0],
        unitsGenerated: '',
        runtimeHours: '',
        unitsConsumed: '',
        gridExport: '',
        notes: ''
      });
    } catch (err) {
      alert(err.message || 'Failed to save solar reading.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. TNEB QUICK INTEGRATION CARD */}
      <div className="glass-premium rounded-3xl p-5 md:p-6 border border-amber-300/40 dark:border-amber-700/30 bg-gradient-to-br from-amber-500/[0.04] via-transparent to-yellow-500/[0.04] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-slate-800 dark:text-white">
                  {t.tnebCardTitle || 'TNEB Electricity Bill & Consumer Service'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                  TANGEDCO
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {t.tnebSubtitle || 'Direct 1-click access to official Tamil Nadu Electricity Board payment.'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {tnebNumber ? (
              <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-slate-400 font-medium">No:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-white tracking-wider">{tnebNumber}</span>
                <button
                  type="button"
                  onClick={handleCopyTneb}
                  className="p-1 text-slate-400 hover:text-amber-600 transition-colors"
                  title="Copy Consumer Number"
                >
                  {copiedTneb ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic bg-slate-100 dark:bg-slate-800/50 px-2.5 py-1 rounded-lg">
                Consumer number not yet added
              </span>
            )}

            <button
              type="button"
              onClick={handleOpenTneb}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm shadow-amber-500/20 transition-all active:scale-95"
            >
              {copiedTneb ? <Check className="w-3.5 h-3.5 shrink-0 text-emerald-100" /> : <ExternalLink className="w-3.5 h-3.5 shrink-0" />}
              <span>{copiedTneb ? (lang === 'ta' ? 'நகலெடுக்கப்பட்டு திறக்கப்பட்டது' : 'Copied & Opening...') : (t.openTnebPortal || '⚡ Open TNEB Quick Pay')}</span>
            </button>

            <button
              type="button"
              onClick={() => launchTnebBbpsPay(tnebNumber, { lang })}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all"
              title="Open Bharat Bill Payment System (GPay / PhonePe / Paytm)"
            >
              <span>{t.tnebBbpsPay || 'UPI / BBPS Pay'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. SOLAR DAILY GENERATION, RUNTIME & CONSUMPTION CARD */}
      <div className="glass-premium rounded-3xl p-6 md:p-8 shadow-sm border border-teal-500/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white flex items-center justify-center shadow-md shadow-teal-500/20 shrink-0">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                {t.solarTrackingTitle || 'Daily Solar Generation & Runtime'}
              </h3>
              <p className="text-xs text-slate-500">
                {t.solarTrackingSubtitle || 'Energy produced by your panels, inverter runtime, and daily EB savings.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLogModal(true)}
            className="self-start sm:self-auto px-3.5 py-2 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-teal-200 dark:border-teal-800/50 transition-all shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.logDailyReading || "Log Today's Reading"}</span>
          </button>
        </div>

        {/* METRICS ROW (5 Cards) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 my-6">
          {/* Today's Generation */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t.todayGeneration || "Today's Units"}</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
              {today.unitsGenerated} <span className="text-xs font-semibold text-slate-400">kWh</span>
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center mt-0.5">
              <TrendingUp className="w-3 h-3 mr-0.5" /> High Solar Output
            </span>
          </div>

          {/* Inverter Runtime */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t.inverterRuntime || "Inverter Runtime"}</span>
              <Clock className="w-4 h-4 text-teal-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-400">
              {today.runtimeHours} <span className="text-xs font-semibold text-slate-400">hrs</span>
            </p>
            <span className="text-[10px] text-slate-400 font-medium">
              Active Sunshine Time
            </span>
          </div>

          {/* Today's Consumption */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t.todayConsumption || "Home Usage"}</span>
              <Home className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
              {today.unitsConsumed} <span className="text-xs font-semibold text-slate-400">kWh</span>
            </p>
            <span className="text-[10px] text-slate-400 font-medium">
              Direct Solar Powered
            </span>
          </div>

          {/* Grid Export */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t.gridExport || "Grid Export"}</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
              +{today.gridExport} <span className="text-xs font-semibold text-slate-400">kWh</span>
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              Net Meter Credit
            </span>
          </div>

          {/* Today's Financial Savings */}
          <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/50">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t.todaySavings || "Today's Savings"}</span>
              <BatteryCharging className="w-4 h-4" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300">
              {formatCurrency(today.savingsAmount, false)}
            </p>
            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">
              Saved on TNEB Bill
            </span>
          </div>
        </div>

        {/* 3. 7-DAY INTERACTIVE BAR CHART */}
        <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl p-4 sm:p-6 border border-slate-200/50 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t.sevenDayChartTitle || '7-Day Generation & Inverter Runtime'}
            </span>
            <div className="flex items-center space-x-4 text-[11px]">
              <span className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-3 h-3 rounded bg-teal-500 inline-block"></span>
                <span>Generation (kWh)</span>
              </span>
              <span className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-3 h-3 rounded bg-indigo-400 inline-block"></span>
                <span>Consumption (kWh)</span>
              </span>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-40 pt-6 px-2 border-b border-slate-200 dark:border-slate-800">
            {last7Days.map((d, idx) => {
              const genHeight = Math.min(100, Math.round((d.unitsGenerated / maxUnits) * 100));
              const conHeight = Math.min(100, Math.round((d.unitsConsumed / maxUnits) * 100));
              return (
                <div key={idx} className="flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap z-10 shadow-lg">
                    {d.date}: {d.unitsGenerated} kWh ({d.runtimeHours}h runtime)
                  </div>
                  
                  {/* Pair of bars */}
                  <div className="w-full flex items-end justify-center space-x-1 h-full">
                    {/* Gen Bar */}
                    <div 
                      className="w-1/2 max-w-[16px] bg-gradient-to-t from-teal-600 to-teal-400 rounded-t-md transition-all duration-500 group-hover:brightness-110"
                      style={{ height: `${genHeight}%` }}
                    ></div>
                    {/* Cons Bar */}
                    <div 
                      className="w-1/2 max-w-[16px] bg-gradient-to-t from-indigo-500 to-indigo-300 rounded-t-md transition-all duration-500 group-hover:brightness-110"
                      style={{ height: `${conHeight}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Day Labels */}
          <div className="grid grid-cols-7 gap-2 sm:gap-4 pt-2 text-center text-[10px] font-bold text-slate-400">
            {last7Days.map((d, idx) => (
              <span key={idx}>{d.dayLabel}</span>
            ))}
          </div>
        </div>

        {/* 4. CUMULATIVE LIFETIME SAVINGS PILL BAR */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-2 text-slate-500">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Lifetime Produced: <strong className="text-slate-800 dark:text-white">{(solarStats?.lifetimeUnits || 0).toLocaleString()} kWh</strong></span>
          </div>
          <div className="flex items-center space-x-2 text-slate-500">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Total EB Savings: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(solarStats?.lifetimeSavings || 0, false)}</strong></span>
          </div>
          <div className="flex items-center space-x-2 text-slate-500">
            <Leaf className="w-4 h-4 text-teal-600" />
            <span>CO₂ Reduced: <strong className="text-slate-800 dark:text-white">{solarStats?.co2OffsetKg || 0} kg</strong> (~{solarStats?.treesPlantedEquivalent || 0} trees)</span>
          </div>
        </div>
      </div>

      {/* 5. LOG DAILY READING MODAL */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <Sun className="w-5 h-5 text-teal-600" />
                <h4 className="font-bold text-base text-slate-800 dark:text-white">
                  {t.logReadingModalTitle || 'Record Solar Meter & Inverter Reading'}
                </h4>
              </div>
              <button 
                type="button" 
                onClick={() => setShowLogModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-500 mb-1">Date</label>
                <input 
                  type="date" 
                  required 
                  value={logForm.date} 
                  onChange={(e) => setLogForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">{t.unitsGenLabel || 'Units Generated (kWh) *'}</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    required 
                    placeholder="e.g. 14.5"
                    value={logForm.unitsGenerated} 
                    onChange={(e) => setLogForm(prev => ({ ...prev, unitsGenerated: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">{t.runtimeHoursLabel || 'Inverter Runtime (Hours) *'}</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    required 
                    placeholder="e.g. 7.5"
                    value={logForm.runtimeHours} 
                    onChange={(e) => setLogForm(prev => ({ ...prev, runtimeHours: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">{t.unitsConsumedLabel || 'Home Consumed (kWh)'}</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    placeholder="e.g. 10.2"
                    value={logForm.unitsConsumed} 
                    onChange={(e) => setLogForm(prev => ({ ...prev, unitsConsumed: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">{t.gridExport || 'Grid Export (kWh)'}</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    placeholder="e.g. 4.3"
                    value={logForm.gridExport} 
                    onChange={(e) => setLogForm(prev => ({ ...prev, gridExport: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-500 mb-1">{t.notesLabel || 'Notes / Weather'}</label>
                <input 
                  type="text" 
                  placeholder="e.g. Clear sunny day / Inverter OK"
                  value={logForm.notes} 
                  onChange={(e) => setLogForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-teal-500/20"
                >
                  {submitting ? 'Saving...' : (t.saveReading || 'Save Reading')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
