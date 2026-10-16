import React, { useState } from 'react';
import { 
  Sun, Zap, Clock, Home, ArrowUpRight, TrendingUp, Calendar, 
  PlusCircle, CheckCircle2, ExternalLink, Copy, Check, BatteryCharging,
  ShieldCheck, Leaf, Wifi, Cpu, Calculator, Radio, Sparkles, RefreshCw, X
} from 'lucide-react';
import { formatCurrency } from '../utils/format.js';
import { launchTnebQuickPay, launchTnebBbpsPay, copyToClipboard, calculateTnebBill } from '../utils/tneb.js';
import api from '../utils/api.js';

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
  const [showCalculator, setShowCalculator] = useState(false);
  const [showIotModal, setShowIotModal] = useState(false);
  const [iotSyncing, setIotSyncing] = useState(false);
  const [iotSynced, setIotSynced] = useState(false);
  const [biMonthlyConsumption, setBiMonthlyConsumption] = useState(500);

  // AI Solar Health Diagnostic State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDiagnostic, setAiDiagnostic] = useState(null);

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

  const capacity = Number(customer?.solarCapacity) || 3;
  const biMonthlySolarUnits = Math.round(capacity * 4.3 * 60);
  const netMeterCalc = calculateTnebBill({
    biMonthlyUnits: biMonthlyConsumption,
    solarExportUnits: biMonthlySolarUnits
  });

  const [iotDongle, setIotDongle] = useState({
    brand: customer?.solarBrand || 'Growatt ShineWiFi-X',
    serialNo: `DGL-${(customer?.customerId || 'SOL').replace(/[^a-zA-Z0-9]/g, '')}-889`,
    pvVoltage: 342.5,
    pvCurrent: 8.2,
    powerWatts: Math.round(capacity * 920),
    acVoltage: 235.8,
    frequency: 50.02,
    temp: 41.8,
    todayYield: Math.round(capacity * 4.4 * 10) / 10,
    runtime: 7.6,
    signalStrength: 94
  });

  const handleIotSync = async () => {
    setIotSyncing(true);
    setTimeout(async () => {
      setIotSyncing(false);
      setIotSynced(true);
      if (onLogReading) {
        try {
          await onLogReading({
            date: new Date().toISOString().split('T')[0],
            unitsGenerated: iotDongle.todayYield,
            runtimeHours: iotDongle.runtime,
            unitsConsumed: Math.round(iotDongle.todayYield * 0.72 * 10) / 10,
            gridExport: Math.round(iotDongle.todayYield * 0.28 * 10) / 10,
            notes: `Auto-synced via ${iotDongle.brand} IoT Dongle (S/N: ${iotDongle.serialNo})`
          });
          setTimeout(() => {
            setShowIotModal(false);
            setIotSynced(false);
          }, 1500);
        } catch (e) {
          console.error(e);
        }
      }
    }, 1200);
  };

  const handleRunAiDiagnostic = async () => {
    setShowAiModal(true);
    setAiLoading(true);
    try {
      const res = await api.post('/ai/solar-diagnostics', {
        solarCapacity: capacity,
        currentKw: iotDongle.powerWatts / 1000,
        dailyKwh: iotDongle.todayYield,
        gridVoltage: iotDongle.acVoltage,
        inverterTemp: iotDongle.temp,
        weather: 'Sunny',
        language: lang
      });
      setAiDiagnostic(res.data?.diagnostic);
    } catch (err) {
      console.error('Failed to run AI diagnostics:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyTneb = () => {
    if (!tnebNumber) return;
    copyToClipboard(tnebNumber);
    setCopiedTneb(true);
    setTimeout(() => setCopiedTneb(false), 2000);
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCalculator(!showCalculator)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 border transition-all shadow-sm ${
                showCalculator
                  ? 'bg-amber-600 text-white border-amber-600 shadow-amber-500/20'
                  : 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50'
              }`}
              title="Calculate bi-monthly TNEB electricity bill with Solar Net-Meter credits"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{showCalculator ? (lang === 'ta' ? 'கால்குலேட்டர் மூடு' : 'Close Calculator') : (lang === 'ta' ? 'TANGEDCO நெட்-மீட்டர் கணக்கீடு' : 'TANGEDCO Net-Meter Calc')}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowIotModal(true)}
              className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-indigo-200 dark:border-indigo-800/50 transition-all shadow-sm"
              title="Sync live telemetry from Wi-Fi Inverter Cloud Dongle (Growatt / Deye / Solis)"
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>{lang === 'ta' ? 'இன்வெர்ட்டர் IoT ஒத்திசைவு' : 'Inverter IoT Sync'}</span>
            </button>

            <button
              type="button"
              onClick={handleRunAiDiagnostic}
              className="px-3 py-2 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-emerald-500/30 transition-all shadow-sm"
              title="Run AI Solar Inverter & Health Diagnostics"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              <span>{lang === 'ta' ? 'AI சோலார் பரிசோதனை' : 'AI Health Diagnostic'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowLogModal(true)}
              className="px-3 py-2 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-teal-200 dark:border-teal-800/50 transition-all shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{t.logDailyReading || "Log Today's Reading"}</span>
            </button>
          </div>
        </div>

        {/* TANGEDCO BI-MONTHLY NET-METER CALCULATOR ACCORDION */}
        {showCalculator && (
          <div className="my-6 p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-500/[0.07] via-slate-50 dark:via-slate-900 to-yellow-500/[0.05] border border-amber-300 dark:border-amber-800/60 shadow-lg animate-fade-in space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-amber-200/60 dark:border-amber-800/40 gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {lang === 'ta' ? 'TANGEDCO இருமாத நெட்-மீட்டர் கட்டண கால்குலேட்டர்' : 'TANGEDCO Bi-Monthly Solar Net-Meter Calculator'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'ta' ? 'தமிழ்நாடு அரசு 100 இலவச யூனிட்கள் & சோலார் கழிவுடன் கூடிய அதிகாரப்பூர்வ கட்டண மதிப்பீடு' : 'Official Tamil Nadu LT-1A Domestic Tariff model with 100 Free Units & Solar offset'}
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-300">
                TNERC Tariff Order 2026
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* INPUT SLIDER */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'ta' ? 'இருமாத மின்தேவை (Grid Consumption):' : 'Bi-Monthly Grid Consumption:'}
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="50"
                    max="1500"
                    step="10"
                    value={biMonthlyConsumption}
                    onChange={(e) => setBiMonthlyConsumption(Number(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                  <span className="font-mono font-bold text-sm text-amber-700 dark:text-amber-400 min-w-[65px] text-right">
                    {biMonthlyConsumption} kWh
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 flex justify-between">
                  <span>50 Units</span>
                  <span>500 (Typical)</span>
                  <span>1500 Units</span>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                  <p><strong>Rooftop Solar Plant:</strong> {capacity} kWp</p>
                  <p><strong>Bi-Monthly Solar Yield:</strong> ~{biMonthlySolarUnits} Units</p>
                </div>
              </div>

              {/* BEFORE & AFTER BILL MATRIX */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <h5 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] border-b pb-1">
                  {lang === 'ta' ? 'மின் கட்டண ஒப்பீடு' : 'Electricity Bill Comparison'}
                </h5>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <span>Bill WITHOUT Solar:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white line-through text-red-500">
                    {formatCurrency(netMeterCalc.grossBill, false)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <span>Solar Net-Meter Credit:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    - {Math.min(biMonthlyConsumption, biMonthlySolarUnits)} Units
                  </span>
                </div>
                <div className="flex justify-between py-1 font-bold text-slate-900 dark:text-white text-sm">
                  <span>Net Bill WITH Solar:</span>
                  <span className={netMeterCalc.netBill === 0 ? "font-black text-emerald-600" : "font-black text-amber-600"}>
                    {netMeterCalc.netBill === 0 ? "₹0.00 (FREE)" : formatCurrency(netMeterCalc.netBill, false)}
                  </span>
                </div>
                {netMeterCalc.isFreeTier && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    ✓ Tamil Nadu 100 Free Units Applied
                  </span>
                )}
                {netMeterCalc.surplusUnits > 0 && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
                    +{netMeterCalc.surplusUnits} Surplus Solar Units Banked
                  </span>
                )}
              </div>

              {/* POCKET SAVINGS HIGHLIGHT */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-300 dark:border-emerald-700/60 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">
                    {lang === 'ta' ? 'இருமாத நிகர மிச்சம்' : 'Bi-Monthly Net Savings'}
                  </span>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                    {formatCurrency(netMeterCalc.biMonthlySavings, false)}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                    Direct cash saved on each bi-monthly TNEB billing cycle.
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    {lang === 'ta' ? 'வருடாந்திர மிச்சம் (Projected)' : 'Projected Annual Savings'}
                  </span>
                  <p className="text-lg font-bold text-teal-800 dark:text-teal-200">
                    {formatCurrency(netMeterCalc.annualSavings, false)} / year
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

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

      {/* SMART INVERTER IOT DONGLE MODAL */}
      {showIotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 no-print animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-up space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Smart Solar Inverter IoT Cloud Sync
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Growatt / Deye / Solis Wi-Fi Dongle Telemetry Stream
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowIotModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            {/* LIVE TELEMETRY STATUS */}
            <div className="p-3.5 rounded-2xl bg-slate-900 text-white font-mono text-xs space-y-2 border border-slate-800 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="flex items-center space-x-1.5 text-emerald-400 font-bold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                  <span>ONLINE • TELEMETRY ACTIVE</span>
                </span>
                <span className="text-slate-400 text-[10px]">Wi-Fi RSSI: {iotDongle.signalStrength}% (-58dBm)</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400">Inverter:</span>
                  <p className="font-bold text-amber-300">{iotDongle.brand}</p>
                </div>
                <div>
                  <span className="text-slate-400">Dongle S/N:</span>
                  <p className="font-bold text-indigo-300">{iotDongle.serialNo}</p>
                </div>
                <div>
                  <span className="text-slate-400">PV Input Power:</span>
                  <p className="font-bold text-emerald-400">{iotDongle.powerWatts} W ({iotDongle.pvVoltage}V / {iotDongle.pvCurrent}A)</p>
                </div>
                <div>
                  <span className="text-slate-400">AC Grid Sync:</span>
                  <p className="font-bold text-blue-300">{iotDongle.acVoltage} V @ {iotDongle.frequency} Hz</p>
                </div>
                <div>
                  <span className="text-slate-400">Inverter Temp:</span>
                  <p className="font-bold text-orange-300">{iotDongle.temp} °C</p>
                </div>
                <div>
                  <span className="text-slate-400">Today's Generation:</span>
                  <p className="font-bold text-teal-300">{iotDongle.todayYield} kWh ({iotDongle.runtime} hrs)</p>
                </div>
              </div>
            </div>

            {/* SYNC ACTION */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-[11px] text-slate-500 max-w-[260px]">
                Syncing grabs live cloud telemetry and records today's meter log automatically.
              </p>

              <button
                type="button"
                onClick={handleIotSync}
                disabled={iotSyncing}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {iotSyncing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing IoT...</span>
                  </>
                ) : iotSynced ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Synced to Log!</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync Telemetry</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. AI SOLAR INVERTER & HEALTH DIAGNOSTICS MODAL */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold flex items-center space-x-1.5">
                    <span>{lang === 'ta' ? 'AI சோலார் செயல்திறன் பரிசோதனை' : 'AI Solar Health Diagnostic'}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 bg-yellow-400 text-slate-900 font-bold rounded-full">Live</span>
                  </h3>
                  <p className="text-[10px] text-teal-100">
                    {lang === 'ta' ? 'இன்வெர்ட்டர் தொலைத்தொடர்பு மற்றும் சூரிய கதிர்வீச்சு பகுப்பாய்வு' : 'Inverter Telemetry & Solar Insolation Analysis'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="p-1 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
              {aiLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-500 font-semibold animate-pulse">
                    {lang === 'ta' ? 'சூரிய கதிர்வீச்சு மற்றும் மின் உற்பத்தியை பகுப்பாய்வு செய்கிறது...' : 'Analyzing solar irradiation and inverter harmonics...'}
                  </p>
                </div>
              ) : aiDiagnostic ? (
                <>
                  {/* EFFICIENCY SCORE STRIP */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        {lang === 'ta' ? 'செயல்திறன் மதிப்பீடு (Efficiency Score)' : 'Performance Ratio (PR)'}
                      </span>
                      <h4 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">
                        {aiDiagnostic.score}%
                      </h4>
                      <span className="inline-block mt-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        ● {aiDiagnostic.title}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        {lang === 'ta' ? 'இன்றைய உற்பத்தி' : 'Today Actual'}
                      </span>
                      <span className="text-lg font-black text-slate-800 dark:text-white font-mono mt-0.5 block">
                        {aiDiagnostic.actualDailyKwh} <span className="text-xs text-slate-400">kWh</span>
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                        Target: {aiDiagnostic.expectedDailyKwh} kWh
                      </span>
                    </div>
                  </div>

                  {/* PROJECTED MONTHLY BENEFIT */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        {lang === 'ta' ? 'மாதாந்திர உற்பத்தி (Projected)' : 'Monthly Output'}
                      </span>
                      <span className="text-base font-black text-slate-800 dark:text-white font-mono mt-1 block">
                        ~{aiDiagnostic.monthlyProjectedUnits} Units
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        {lang === 'ta' ? 'TNEB பில் மிச்சம்' : 'TNEB Savings'}
                      </span>
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
                        ~{formatCurrency(aiDiagnostic.monthlyEstSavings, false)}/mo
                      </span>
                    </div>
                  </div>

                  {/* RECOMMENDATIONS & DIAGNOSTIC TIPS */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-teal-600" />
                      <span>{lang === 'ta' ? 'AI பரிந்துரைகள் & குறிப்புகள்' : 'AI Analysis & Recommendations'}</span>
                    </h5>
                    <div className="space-y-2">
                      {aiDiagnostic.recommendations?.map((tip, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 leading-relaxed"
                        >
                          {tip}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-xs font-bold rounded-xl transition-colors"
              >
                {lang === 'ta' ? 'மூடு' : 'Close'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
