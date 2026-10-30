import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { 
  Sun, DollarSign, Calendar, ShieldCheck, Zap, X,
  QrCode, Landmark, User, FileText, Info, Calculator, MessageCircle,
  Copy, Check, Leaf, Printer, Phone, Download, AlertCircle, Send,
  ChevronDown, ChevronUp, Award, Wrench, Folder, CreditCard, ChevronRight,
  ExternalLink, CheckCircle2, History
} from 'lucide-react';
import { 
  openCustomerSupportChat,
  openPaymentWhatsAppToOwner,
  sendPaymentLinkToCustomerWhatsApp,
  generateWhatsAppPaymentRequest,
  OWNER_PAYMENT_PHONE
} from '../../utils/whatsapp.js';
import { translations, getLanguage } from '../../utils/translations.js';

// Lazy load heavy Leaflet map and PDF statement modal for performance
const SolarSiteMap = React.lazy(() => import('../../components/SolarSiteMap.jsx'));
const LoanStatementModal = React.lazy(() => import('../../components/LoanStatementModal.jsx'));
const TaxInvoiceModal = React.lazy(() => import('../../components/TaxInvoiceModal.jsx'));
const SanctionLetterModal = React.lazy(() => import('../../components/SanctionLetterModal.jsx'));
import SolarTrackerCard from '../../components/SolarTrackerCard.jsx';
import SubsidyTrackerCard from '../../components/SubsidyTrackerCard.jsx';
import ReferralShareCard from '../../components/ReferralShareCard.jsx';
import ServiceTicketModal from '../../components/ServiceTicketModal.jsx';
import SolarCalculatorModal from '../../components/SolarCalculatorModal.jsx';
import AutoPayModal from '../../components/AutoPayModal.jsx';

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedEmi, setSelectedEmi] = useState(null);
  const [customerUtr, setCustomerUtr] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showSanctionModal, setShowSanctionModal] = useState(false);
  const [showServiceTicketModal, setShowServiceTicketModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showAutoPayModal, setShowAutoPayModal] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedPaymentLink, setCopiedPaymentLink] = useState(false);
  const [launchingApp, setLaunchingApp] = useState(null);
  const [lang, setLang] = useState(getLanguage);

  // 4 FOLDERS STATE (solar, payments, subsidy, documents)
  const [activeFolder, setActiveFolder] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const f = params.get('folder') || params.get('tab');
    return ['solar', 'payments', 'subsidy', 'documents'].includes(f) ? f : 'solar';
  });

  const switchFolder = (folderId) => {
    setActiveFolder(folderId);
    const url = new URL(window.location);
    url.searchParams.set('folder', folderId);
    window.history.replaceState({}, '', url);
  };

  useEffect(() => {
    const handleLangChange = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLangChange);
    return () => window.removeEventListener('language-change', handleLangChange);
  }, []);

  const t = translations[lang] || translations.en;
  
  // Amortisation Calculator States (Live EMI Calculator)
  const [calcCost, setCalcCost] = useState(150000);
  const [calcDownPayment, setCalcDownPayment] = useState(30000);
  const [calcMonths, setCalcMonths] = useState(12);
  const [calcEmiResult, setCalcEmiResult] = useState(0);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/customer/dashboard');
      setCustomer(response.data);
    } catch (error) {
      console.error('Error fetching customer dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogReading = async (logData) => {
    try {
      await api.post('/customer/solar-log', logData);
      alert(lang === 'ta' ? 'சோலார் அளவீடு வெற்றிகரமாக சேமிக்கப்பட்டது!' : 'Solar meter reading saved successfully!');
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save solar reading.');
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Update live calculator result
  useEffect(() => {
    const principal = calcCost - calcDownPayment;
    const r = 0.02; // 2% per month
    const n = calcMonths;
    if (principal > 0 && n > 0) {
      const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      setCalcEmiResult(Math.round(emi * 100) / 100);
    } else {
      setCalcEmiResult(0);
    }
  }, [calcCost, calcDownPayment, calcMonths]);

  const copyPaymentLink = (emiToPay = selectedEmi) => {
    if (!emiToPay) return;
    const activeUpiId = customer?.activeUpi?.upiId || 'rsanthoshkumar376@oksbi';
    const activePayeeName = customer?.activeUpi?.payeeName || 'Mr Santhoshkumar R';
    const totalAmount = (emiToPay.emiAmount + (emiToPay.lateFee || 0)).toFixed(2);
    const cleanCustId = (customer?.customerId || '').replace(/[^a-zA-Z0-9]/g, '');
    const upiLink = `upi://pay?pa=${activeUpiId}&pn=${encodeURIComponent(activePayeeName)}&am=${totalAmount}&cu=INR&tn=EMI_${emiToPay.emiNumber}_${cleanCustId}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(upiLink).catch(() => {});
    }
    setCopiedPaymentLink(true);
    setTimeout(() => setCopiedPaymentLink(false), 2500);
  };

  const handleDownloadQr = (emiToPay = selectedEmi) => {
    if (!emiToPay) return;
    const activeUpiId = customer?.activeUpi?.upiId || 'rsanthoshkumar376@oksbi';
    const activePayeeName = customer?.activeUpi?.payeeName || 'Mr Santhoshkumar R';
    const totalAmount = (emiToPay.emiAmount + (emiToPay.lateFee || 0)).toFixed(2);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=upi://pay?pa=${activeUpiId}%26pn=${encodeURIComponent(activePayeeName)}%26am=${totalAmount}%26cu=INR%26tn=EMI_${emiToPay.emiNumber}_${customer?.customerId || ''}`;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `MRS_SOLAR_EMI_${emiToPay.emiNumber}_Payment_QR.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLaunchUpi = (appKey, emiToPay = selectedEmi) => {
    if (!emiToPay) return;
    setLaunchingApp(appKey);
    const amount = (emiToPay.emiAmount + (emiToPay.lateFee || 0)).toFixed(2);
    const payeeVpa = customer?.activeUpi?.upiId || 'rsanthoshkumar376@oksbi';
    const payeeName = customer?.activeUpi?.payeeName || 'Mr Santhoshkumar R';
    const cleanCustId = (customer?.customerId || '').replace(/[^a-zA-Z0-9]/g, '');
    const note = `EMI_${emiToPay.emiNumber}_${cleanCustId}`;

    const upiQuery = `pa=${payeeVpa}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
    const universalUpi = `upi://pay?${upiQuery}`;
    const encodedUniversal = encodeURIComponent(universalUpi);

    // Auto-copy UPI ID to clipboard as convenience
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(payeeVpa).catch(() => {});
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 3000);
    }

    const ua = (navigator.userAgent || '').toLowerCase();
    const isAndroid = ua.includes('android');
    const isApp = ua.includes('mrssolarapp');

    const packageMap = {
      gpay: 'com.google.android.apps.nbu.paisa.user',
      phonepe: 'com.phonepe.app',
      paytm: 'net.one97.paytm'
    };

    let targetUrl = universalUpi;

    if (isAndroid && !isApp && packageMap[appKey]) {
      targetUrl = `intent://pay?${upiQuery}#Intent;scheme=upi;package=${packageMap[appKey]};S.browser_fallback_url=${encodedUniversal};end`;
    } else {
      targetUrl = universalUpi;
    }

    try {
      window.location.href = targetUrl;
    } catch (e) {
      window.location.href = universalUpi;
    }

    try {
      const link = document.createElement('a');
      link.href = targetUrl;
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
      }, 500);
    } catch (err) {}

    setTimeout(() => {
      setLaunchingApp(null);
      if (document.visibilityState === 'visible' && targetUrl !== universalUpi) {
        try {
          window.location.href = universalUpi;
        } catch (err) {}
      }
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!customer || !customer.emiSchedule) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl">
        <div className="w-12 h-12 bg-red-50 dark:bg-red-950 text-red-400 rounded-full flex items-center justify-center mx-auto mb-3">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <p className="text-slate-600 dark:text-slate-400 font-medium">Could not load your loan details.</p>
        <p className="text-sm text-slate-400 mt-1">Please try refreshing the page or contact MRS SOLAR support.</p>
      </div>
    );
  }

  const emiSchedule = customer.emiSchedule || [];
  const emisPaidCount = emiSchedule.filter(e => e.status === 'Paid').length;
  const totalEmisCount = emiSchedule.length;
  const progressPercentage = totalEmisCount > 0 ? Math.round((emisPaidCount / totalEmisCount) * 100) : 0;

  // Next due date logic
  const nextPendingEmi = emiSchedule.find(e => e.status !== 'Paid');
  const outstandingAmount = customer.totalOutstandingAmount || 0;

  const openPaymentModal = (emi) => {
    setSelectedEmi(emi);
    setCustomerUtr(customer?.submittedUtr || '');
    setShowQrModal(true);
  };

  // 4 FOLDERS DEFINITION
  const folders = [
    {
      id: 'solar',
      number: '1',
      label: t.folderSolar || 'Solar & Generation',
      desc: t.folderOverviewDesc || 'Generation, readings & rooftop site map',
      icon: Sun,
      badge: `${customer.solarCapacity || 3} kW System`,
      badgeAlert: false
    },
    {
      id: 'payments',
      number: '2',
      label: t.folderPayments || 'Payment Option & EMI',
      desc: t.folderPaymentsDesc || 'UPI Quick Pay, loan schedule & calculator',
      icon: CreditCard,
      badge: nextPendingEmi 
        ? (nextPendingEmi.status === 'Overdue' ? 'Overdue Due' : formatCurrency(nextPendingEmi.emiAmount + (nextPendingEmi.lateFee || 0))) 
        : 'All Paid Off',
      badgeAlert: nextPendingEmi?.status === 'Overdue'
    },
    {
      id: 'subsidy',
      number: '3',
      label: t.folderSubsidy || 'PM Surya Ghar Subsidy',
      desc: t.folderSubsidyDesc || '5-Stage PM Surya Ghar subsidy tracker',
      icon: Award,
      badge: '₹78,000 Subsidy',
      badgeAlert: false
    },
    {
      id: 'documents',
      number: '4',
      label: t.folderDocs || 'Documents & Profile',
      desc: t.folderDocsDesc || 'Tax invoice, sanction letter & KYC files',
      icon: Folder,
      badge: 'Tax & Legal',
      badgeAlert: false
    }
  ];

  return (
    <div className="space-y-6 pb-16">
      
      {/* 1. PERSISTENT HEADER BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-700 dark:from-teal-950 dark:via-slate-900 dark:to-emerald-950 rounded-3xl p-6 md:p-8 shadow-xl shadow-teal-900/15 text-white">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-yellow-300/15 rounded-full blur-2xl animate-pulse-soft"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-teal-200 bg-teal-800/60 border border-teal-600/40 px-3 py-1 rounded-full">
                {t.activeFinancing}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-200 bg-emerald-800/50 border border-emerald-600/40 px-3 py-1 rounded-full">
                {customer.solarCapacity} kW Rooftop Solar
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mt-3 tracking-tight">
              {t.welcome}, {customer.fullName}
            </h2>
            <p className="text-xs sm:text-sm text-teal-100 mt-1 font-medium">
              {t.customerId}: <span className="font-mono font-bold text-white">{customer.customerId}</span> | {t.installationDate}: {formatDate(customer.installationDate)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 sm:gap-3 items-center">
            {/* Metric 1: Total Outstanding */}
            <div className="flex-1 min-w-[125px] bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 border border-white/10 text-center">
              <p className="text-[10px] sm:text-xs font-semibold text-teal-200 uppercase tracking-wider">{t.totalOutstanding}</p>
              <p className="text-xl sm:text-2xl font-black mt-0.5">{formatCurrency(outstandingAmount)}</p>
            </div>

            {/* Metric 2: Next EMI Date */}
            <div className="flex-1 min-w-[125px] bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 border border-white/10 text-center">
              <p className="text-[10px] sm:text-xs font-semibold text-teal-200 uppercase tracking-wider">{t.nextEmiDate}</p>
              <p className="text-xl sm:text-2xl font-black mt-0.5">
                {nextPendingEmi ? formatDate(nextPendingEmi.dueDate) : t.completed}
              </p>
            </div>

            {/* HIGH-VISIBILITY PAYMENT OPTION BUTTON */}
            <button
              type="button"
              onClick={() => {
                switchFolder('payments');
                if (nextPendingEmi) {
                  openPaymentModal(nextPendingEmi);
                }
              }}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-300 hover:from-amber-300 hover:to-teal-200 text-slate-900 font-black rounded-2xl px-5 py-3 sm:py-3.5 flex items-center justify-center space-x-2 text-xs sm:text-sm shadow-xl shadow-teal-950/40 transition-all hover:scale-[1.02] active:scale-95 border border-white/30"
              title="Open Payment Option & Pay Current Installment"
            >
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-slate-900 fill-current" />
              <span>{t.paymentOptionBtn || 'Payment Option'}</span>
              {nextPendingEmi && (
                <span className="bg-slate-900/15 px-2 py-0.5 rounded-full text-[11px] font-mono">
                  {formatCurrency(nextPendingEmi.emiAmount + (nextPendingEmi.lateFee || 0))}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. THE 4 FOLDERS NAVIGATION TABS */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl p-2 sm:p-2.5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {folders.map(folder => {
            const isActive = activeFolder === folder.id;
            const Icon = folder.icon;
            return (
              <button
                key={folder.id}
                type="button"
                onClick={() => switchFolder(folder.id)}
                className={`flex flex-col sm:flex-row items-center sm:items-start text-left p-3 sm:p-4 rounded-2xl transition-all relative overflow-hidden group ${
                  isActive
                    ? 'bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-600/25 scale-[1.01]'
                    : 'bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3 w-full">
                  <div className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                    isActive 
                      ? 'bg-white/20 text-white shadow-inner' 
                      : 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/40'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-[10px] font-black uppercase tracking-wider block ${
                        isActive ? 'text-teal-200' : 'text-slate-400 dark:text-slate-500'
                      }`}>
                        Folder #{folder.number}
                      </span>
                      {folder.badge && (
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap ${
                          isActive 
                            ? 'bg-white/20 text-white' 
                            : folder.badgeAlert
                            ? 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400 font-bold animate-pulse'
                            : 'bg-teal-100/80 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300'
                        }`}>
                          {folder.badge}
                        </span>
                      )}
                    </div>
                    <h4 className="font-black text-xs sm:text-sm truncate mt-0.5">{folder.label}</h4>
                    <p className={`text-[11px] truncate hidden sm:block mt-0.5 ${
                      isActive ? 'text-teal-100' : 'text-slate-400'
                    }`}>
                      {folder.desc}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* FOLDER 1: SOLAR & GENERATION                                   */}
      {/* ============================================================== */}
      {activeFolder === 'solar' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Solar Project Quick Specifications Banner */}
          <div className="glass-premium rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800/50 mb-4">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="font-bold text-slate-800 dark:text-white">{t.solarProjectDetails}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowServiceTicketModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 hover:bg-teal-100 text-xs font-bold flex items-center space-x-1.5 transition-all"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>{lang === 'ta' ? 'பழுது நீக்கம் / சேவை' : 'Service Request'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCalculatorModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 hover:bg-orange-100 text-xs font-bold flex items-center space-x-1.5 transition-all"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>{lang === 'ta' ? 'சேமிப்பு கணக்கீடு' : 'Solar Calculator'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/40 dark:border-slate-800/40">
                <p className="text-[11px] font-semibold text-slate-400 uppercase">{t.capacityKw}</p>
                <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{customer.solarCapacity} kW</p>
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">On-Grid Rooftop</span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/40 dark:border-slate-800/40">
                <p className="text-[11px] font-semibold text-slate-400 uppercase">{t.solarBrand}</p>
                <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5 truncate">{customer.solarBrand || 'MRS Solar'}</p>
                <span className="text-[10px] text-slate-500">Tier-1 Mono PERC</span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/40 dark:border-slate-800/40">
                <p className="text-[11px] font-semibold text-slate-400 uppercase">{t.totalSystemCost}</p>
                <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{formatCurrency(customer.solarCost)}</p>
                <span className="text-[10px] text-slate-500">Down Pay: {formatCurrency(customer.downPayment)}</span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/40 dark:border-slate-800/40">
                <p className="text-[11px] font-semibold text-slate-400 uppercase">{t.warrantyDetails}</p>
                <p className="text-lg font-black text-teal-600 dark:text-teal-400 mt-0.5 truncate">25 Years</p>
                <span className="text-[10px] text-slate-500">Performance Warranty</span>
              </div>
            </div>
          </div>

          {/* SOLAR USAGE, RUNTIME, CONSUMPTION & TNEB INTEGRATION */}
          <SolarTrackerCard 
            solarStats={customer.solarStats}
            customer={customer}
            t={t}
            lang={lang}
            onLogReading={handleLogReading}
            isAdmin={false}
          />

          {/* SOLAR ROOFTOP SITE MAP & GPS NAVIGATION */}
          <React.Suspense fallback={<div className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-900 animate-pulse flex items-center justify-center text-xs text-slate-400">Loading Solar Site Map...</div>}>
            <SolarSiteMap customer={customer} />
          </React.Suspense>

          {/* REFER A NEIGHBOR & FRIEND (NO 1000 OFF) */}
          <ReferralShareCard customer={customer} lang={lang} />
        </div>
      )}

      {/* ============================================================== */}
      {/* FOLDER 2: PAYMENT OPTION & EMI                                 */}
      {/* ============================================================== */}
      {activeFolder === 'payments' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* AUTOPAY BANNER & SETUP CARD */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-indigo-500/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 flex-shrink-0">
                  <Zap className="w-6 h-6 text-yellow-300 fill-current" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-extrabold text-lg sm:text-xl text-white">
                      {lang === 'ta' ? 'தானியங்கி கட்டணம் (Set Up AutoPay)' : 'Never Miss an EMI — Set Up AutoPay'}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      customer?.autoPay?.status === 'Active'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40' 
                        : 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/30'
                    }`}>
                      {customer?.autoPay?.status === 'Active' 
                        ? (lang === 'ta' ? 'செயலில் உள்ளது (Active)' : 'Active') 
                        : (lang === 'ta' ? 'பரிந்துரைக்கப்படுகிறது' : 'Zero Penalty')}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
                    {customer?.autoPay?.status === 'Active' ? (
                      lang === 'ta' 
                        ? `தானியங்கி கட்டணம் செயலில் உள்ளது (${customer?.autoPay?.type === 'UPI_AUTOPAY' ? 'UPI AutoPay' : 'வங்கி eNACH/SI'}). தவணை தேதியில் தானாகவே கழிக்கப்படும்.`
                        : `AutoPay is currently ACTIVE via ${customer?.autoPay?.type === 'UPI_AUTOPAY' ? 'UPI AutoPay' : 'Bank Mandate / eNACH'}. Your monthly solar EMI is automated with zero penalty.`
                    ) : (
                      lang === 'ta'
                        ? 'Google Pay, PhonePe அல்லது உங்கள் வங்கி (SBI / Canara) மூலம் ஒருமுறை AutoPay அமைக்கவும். ஒவ்வொரு மாதமும் தானாகவே பாதுகாப்பாக செலுத்தப்படும்!'
                        : 'Automate your monthly solar EMI via UPI AutoPay (Google Pay, PhonePe, Paytm) or SBI/Canara Standing Instruction. 100% automated, safe & hassle-free.'
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAutoPayModal(true)}
                  className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-black rounded-2xl text-xs sm:text-sm shadow-lg shadow-teal-500/25 flex items-center justify-center space-x-2 transition-all hover:scale-105 active:scale-95"
                >
                  <Zap className="w-4 h-4 fill-current text-yellow-300" />
                  <span>
                    {customer?.autoPay?.status === 'Active' 
                      ? (lang === 'ta' ? 'AutoPay மாற்ற / பார்க்க' : 'Manage AutoPay') 
                      : (lang === 'ta' ? 'AutoPay அமைக்கவும்' : 'Set Up AutoPay')}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* HERO PAYMENT OPTION HUB */}
          <div className="glass-premium rounded-3xl p-6 sm:p-8 shadow-md border-2 border-teal-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/60 dark:border-slate-800/60 gap-3 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xl text-slate-900 dark:text-white">
                    {t.payCurrentInstallment} (Payment Option)
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'ta' ? 'UPI, கூகுள் பே, போன்பே அல்லது வங்கி கணக்கு மூலம் எளிதாக கட்டணம் செலுத்தலாம்' : 'Pay seamlessly via UPI, Google Pay, PhonePe, Paytm, or Direct Bank Transfer'}
                  </p>
                </div>
              </div>

              {nextPendingEmi && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAutoPayModal(true)}
                    className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-all"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current text-yellow-300" />
                    <span>{customer?.autoPay?.status === 'Active' ? 'AutoPay Active' : 'Set Up AutoPay'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openPaymentModal(nextPendingEmi)}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-md transition-all"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>{t.generateQrBtn || 'Scan QR Code'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/customer/payments')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all"
                  >
                    <History className="w-4 h-4" />
                    <span>{t.paymentHistory}</span>
                  </button>
                </div>
              )}
            </div>

            {nextPendingEmi ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left: EMI Summary & 1-Tap UPI Launch */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.currentScheduledEmi}</span>
                        <h4 className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                          {t.emiLabel} #{nextPendingEmi.emiNumber}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {t.dueDate || 'Due Date'}: <strong className="text-slate-700 dark:text-slate-300">{formatDate(nextPendingEmi.dueDate)}</strong>
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase ${
                        customer.requestingEmi === nextPendingEmi.emiNumber
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300/50'
                          : nextPendingEmi.status === 'Overdue' 
                          ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 border border-red-200/30 font-black animate-pulse'
                          : nextPendingEmi.status === 'Due Soon'
                          ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400 border border-orange-200/30'
                          : 'bg-teal-50 text-teal-600 dark:bg-teal-950/20 dark:text-teal-400 border border-teal-200/30'
                      }`}>
                        {customer.requestingEmi === nextPendingEmi.emiNumber 
                          ? 'Verification Pending' 
                          : nextPendingEmi.status === 'Overdue' ? t.statusOverdue : nextPendingEmi.status === 'Due Soon' ? t.statusDueSoon : t.statusActive}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                      <div>
                        <span className="text-slate-400">{t.emiBaseAmount}</span>
                        <p className="font-bold text-slate-800 dark:text-white mt-0.5">{formatCurrency(nextPendingEmi.emiAmount)}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">{t.latePenaltyFee}</span>
                        <p className={`font-bold mt-0.5 ${nextPendingEmi.lateFee > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'}`}>
                          {formatCurrency(nextPendingEmi.lateFee)}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">{t.interestPortion}</span>
                        <p className="font-semibold text-slate-800 dark:text-white mt-0.5">{formatCurrency(nextPendingEmi.interestPaid)}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">{t.principalPortion}</span>
                        <p className="font-semibold text-slate-800 dark:text-white mt-0.5">{formatCurrency(nextPendingEmi.principalPaid)}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-4 sm:p-5 rounded-2xl shadow-lg shadow-teal-600/20">
                      <div>
                        <p className="text-xs uppercase font-bold tracking-wider text-teal-100">{t.totalOutstandingDue}</p>
                        <p className="text-[11px] text-teal-200 mt-0.5">{t.includingLateFees}</p>
                      </div>
                      <p className="text-3xl font-black">
                        {formatCurrency(nextPendingEmi.emiAmount + (nextPendingEmi.lateFee || 0))}
                      </p>
                    </div>
                  </div>

                  {/* Instant 1-Tap UPI Launch Buttons */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {lang === 'ta' ? 'நேரடி UPI கட்டண விருப்பங்கள் (1-Tap Pay):' : '1-Tap Direct UPI Payment Options:'}
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleLaunchUpi('gpay', nextPendingEmi)}
                        className="py-3 px-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white font-bold rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center space-x-2 text-xs transition-all hover:scale-[1.02]"
                      >
                        <span className="text-blue-500 font-black">G</span>
                        <span className="text-red-500 font-black">P</span>
                        <span className="text-yellow-500 font-black">a</span>
                        <span className="text-green-500 font-black">y</span>
                        <span>Google Pay</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLaunchUpi('phonepe', nextPendingEmi)}
                        className="py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center space-x-1.5 text-xs transition-all hover:scale-[1.02]"
                      >
                        <Zap className="w-3.5 h-3.5 text-white fill-current" />
                        <span>PhonePe</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLaunchUpi('paytm', nextPendingEmi)}
                        className="py-3 px-4 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-md flex items-center justify-center space-x-1.5 text-xs transition-all hover:scale-[1.02]"
                      >
                        <Landmark className="w-3.5 h-3.5 text-white" />
                        <span>Paytm</span>
                      </button>
                    </div>

                    <a
                      href={`upi://pay?pa=${customer?.activeUpi?.upiId || 'rsanthoshkumar376@oksbi'}&pn=${encodeURIComponent(customer?.activeUpi?.payeeName || 'Mr Santhoshkumar R')}&am=${(nextPendingEmi.emiAmount + (nextPendingEmi.lateFee || 0)).toFixed(2)}&cu=INR&tn=EMI_${nextPendingEmi.emiNumber}_${(customer?.customerId || '').replace(/[^a-zA-Z0-9]/g, '')}`}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 text-xs sm:text-sm"
                    >
                      <Zap className="w-4 h-4 text-yellow-300 fill-current" />
                      <span>{lang === 'ta' ? 'அனைத்து UPI செயலிகள் மூலம் செலுத்தவும்' : 'Pay via Any UPI App (BHIM / Cred / Amazon Pay)'}</span>
                    </a>
                  </div>
                </div>

                {/* Right: Embedded QR Code, Bank Details & UTR Submission */}
                <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between space-y-4">
                  <div className="text-center space-y-3">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                      {lang === 'ta' ? 'ஸ்கேன் செய்து செலுத்த QR குறியீடு' : 'Scan QR to Pay Now'}
                    </p>

                    <div className="w-44 h-44 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center mx-auto p-2.5 shadow-sm">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=${customer?.activeUpi?.upiId || 'rsanthoshkumar376@oksbi'}%26pn=${encodeURIComponent(customer?.activeUpi?.payeeName || 'Mr Santhoshkumar R')}%26am=${(nextPendingEmi.emiAmount + (nextPendingEmi.lateFee || 0)).toFixed(2)}%26cu=INR%26tn=EMI_${nextPendingEmi.emiNumber}_${(customer?.customerId || '').replace(/[^a-zA-Z0-9]/g, '')}`}
                        alt="Payment QR Code"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </div>

                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadQr(nextPendingEmi)}
                        className="py-1.5 px-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 flex items-center space-x-1 shadow-sm transition-all"
                      >
                        <Download className="w-3 h-3" />
                        <span>{t.saveQrImage || 'Save QR'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(customer?.activeUpi?.upiId || 'rsanthoshkumar376@oksbi');
                          setCopiedUpi(true);
                          setTimeout(() => setCopiedUpi(false), 2000);
                        }}
                        className="py-1.5 px-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 flex items-center space-x-1 shadow-sm transition-all"
                      >
                        {copiedUpi ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy UPI ID</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-[11px] font-mono text-slate-500 font-bold">
                      UPI ID: {customer?.activeUpi?.upiId || 'rsanthoshkumar376@oksbi'}
                    </p>
                  </div>

                  {/* Bank & UTR Reference Box */}
                  <div className="space-y-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                    <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/50 space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {t.enterUtr || 'After Payment, Enter 12-Digit UPI UTR:'}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={16}
                          value={customerUtr}
                          onChange={(e) => setCustomerUtr(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                          placeholder="12-digit UTR No"
                          className="flex-1 px-3 py-1.5 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-teal-500 text-slate-800 dark:text-white"
                        />
                        <button
                          type="button"
                          disabled={submittingUtr}
                          onClick={async () => {
                            setSubmittingUtr(true);
                            try {
                              await api.post('/customer/notify-payment', { 
                                emiNumber: nextPendingEmi.emiNumber,
                                utrNumber: customerUtr ? customerUtr.trim() : undefined
                              });
                              alert(lang === 'ta' ? 'கட்டண அறிவிப்பு அனுப்பப்பட்டது! நிர்வாகி சரிபார்த்து ரசீதை உறுதி செய்வார்.' : "Payment notification sent! Admin will verify and confirm your receipt.");
                              fetchDashboardData();
                            } catch (err) {
                              alert(lang === 'ta' ? 'கட்டண விபரம் பதிவு செய்யப்பட்டது.' : "Payment recorded! Administrator will verify shortly.");
                            } finally {
                              setSubmittingUtr(false);
                            }
                          }}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-xs transition-colors shrink-0"
                        >
                          {submittingUtr ? '...' : 'Notify'}
                        </button>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              <div className="text-center py-10 space-y-3">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-black text-slate-800 dark:text-white">{t.allEmisPaidTitle}</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">{t.allEmisPaidDesc}</p>
              </div>
            )}
          </div>

          {/* LOAN REPAYMENT PROGRESS TIMELINE */}
          <div className="glass-premium rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">{t.loanRepaymentProgress}</h3>
              <span className="text-sm font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-3 py-1 rounded-full">
                {t.paidOfText.replace('{paid}', emisPaidCount).replace('{total}', totalEmisCount).replace('{percent}', progressPercentage)}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-6 p-0.5 border border-slate-200/50 dark:border-slate-700/50">
              <div 
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-1000 ease-out shadow-inner"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>

            {/* Installment Progress Timeline */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-3">
              {emiSchedule.map((emi) => {
                let color = 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-600';
                let statusText = emi.status;
                if (emi.status === 'Paid') {
                  color = 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50';
                  statusText = t.statusPaid;
                } else if (emi.status === 'Overdue') {
                  color = 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50 animate-pulse';
                  statusText = t.statusOverdue;
                } else if (emi.status === 'Due Soon') {
                  color = 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/50';
                  statusText = t.statusDueSoon;
                }
                
                return (
                  <div 
                    key={emi.emiNumber}
                    onClick={() => {
                      if (emi.status !== 'Paid') {
                        openPaymentModal(emi);
                      }
                    }}
                    className={`border rounded-xl p-2.5 text-center flex flex-col items-center justify-center transition-all hover:scale-105 cursor-pointer ${color}`}
                    title={`Due: ${formatDate(emi.dueDate)}\nAmount: ${formatCurrency(emi.emiAmount + (emi.lateFee || 0))}\nClick to pay`}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-85">{t.emiLabel}</span>
                    <span className="text-lg font-black mt-0.5">#{emi.emiNumber}</span>
                    <span className="text-[9px] font-bold mt-1 uppercase tracking-tight">{statusText}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FINANCING & BANK DETAILS + AMORTIZATION CALCULATOR */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Panel: Loan Terms & Registered Bank Account */}
            <div className="glass-premium rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
                <Landmark className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="font-bold text-slate-800 dark:text-white">{t.financingBanking}</h3>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t.loanPrincipal}</span>
                  <span className="font-semibold text-teal-600 dark:text-teal-400">{formatCurrency(customer.loanAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t.monthlyEmi}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(customer.monthlyEmi)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t.durationMonths}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.emiDuration} {t.monthsSuffix} {Number(customer.emiDuration) >= 12 ? `(${(Number(customer.emiDuration) / 12).toFixed(1).replace('.0', '')} ${lang === 'ta' ? 'ஆண்டுகள்' : 'Yrs'})` : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t.loanStartDate}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(customer.loanStartDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t.loanEndDate}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(customer.loanEndDate)}</span>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t.repaymentBankAccount}</p>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t.bankName}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.bankDetails?.bankName || 'State Bank of India'}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-slate-500">{t.accountNo}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{customer.bankDetails?.accountNumber || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel: Interactive Loan Amortization Calculator */}
            <div className="glass-premium rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
                <Calculator className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="font-bold text-slate-800 dark:text-white">{t.calculatorTitle}</h3>
              </div>
              
              <div className="space-y-4 text-sm">
                <div>
                  <div className="flex justify-between mb-1 text-xs">
                    <span className="text-slate-500">{t.projectCostLabel}</span>
                    <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(calcCost, false)}</span>
                  </div>
                  <input
                    type="range"
                    min="50000"
                    max="500000"
                    step="10000"
                    value={calcCost}
                    onChange={(e) => setCalcCost(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1 text-xs">
                    <span className="text-slate-500">{t.downPaymentLabel}</span>
                    <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(calcDownPayment, false)}</span>
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max={calcCost - 20000}
                    step="5000"
                    value={calcDownPayment}
                    onChange={(e) => setCalcDownPayment(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1 text-xs">
                    <span className="text-slate-500">{t.durationLabel}</span>
                    <span className="font-bold text-slate-800 dark:text-white">
                      {calcMonths} {t.monthsSuffix} {calcMonths >= 12 ? `(${(calcMonths / 12).toFixed(1).replace('.0', '')} ${lang === 'ta' ? 'ஆண்டுகள்' : 'Yrs'})` : ''}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="120"
                    step="3"
                    value={calcMonths}
                    onChange={(e) => setCalcMonths(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                    <span>3 Mo</span>
                    <span>36M (3Y)</span>
                    <span>60M (5Y)</span>
                    <span>84M (7Y)</span>
                    <span>120M (10Y)</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {[12, 24, 36, 48, 60, 72, 84, 96, 108, 120].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setCalcMonths(m)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                          calcMonths === m
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {m}M ({m / 12}Y)
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl p-4 flex justify-between items-center">
                  <div>
                    <p className="text-[11px] text-slate-400 uppercase tracking-wider">{t.estMonthlyEmi}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{t.reducingBalanceNote}</p>
                  </div>
                  <p className="text-2xl font-black text-teal-600 dark:text-teal-400">{formatCurrency(calcEmiResult)}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FOLDER 3: PM SURYA GHAR CENTRAL SUBSIDY TRACKER                */}
      {/* ============================================================== */}
      {activeFolder === 'subsidy' && (
        <div className="space-y-6 animate-fade-in">
          {/* PM SURYA GHAR MUFT BIJLI YOJANA CENTRAL SUBSIDY TRACKER */}
          <SubsidyTrackerCard customer={customer} />

          {/* REFER A NEIGHBOR & FRIEND (NO 1000 OFF) */}
          <ReferralShareCard customer={customer} lang={lang} />
        </div>
      )}

      {/* ============================================================== */}
      {/* FOLDER 4: DOCUMENTS, CONTRACT & PROFILE                        */}
      {/* ============================================================== */}
      {activeFolder === 'documents' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Official Printable Legal Documents Hub */}
          <div className="glass-premium rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
              <Award className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h3 className="font-bold text-slate-800 dark:text-white">
                {lang === 'ta' ? 'அதிகாரப்பூர்வ சட்ட & வரி ஆவணங்கள்' : 'Official Legal & Tax Documents'}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setShowStatementModal(true)}
                className="p-4 bg-slate-50 dark:bg-slate-900/50 hover:bg-teal-50 dark:hover:bg-teal-950/20 rounded-2xl border border-slate-200 dark:border-slate-800 text-left transition-all group flex items-start space-x-3"
              >
                <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm">{t.loanStatementBtn}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Stamped amortization ledger with official seal</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setShowInvoiceModal(true)}
                className="p-4 bg-slate-50 dark:bg-slate-900/50 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-2xl border border-slate-200 dark:border-slate-800 text-left transition-all group flex items-start space-x-3"
              >
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm">{t.taxInvoiceBtn}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Official GST invoice and supply bill</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setShowSanctionModal(true)}
                className="p-4 bg-slate-50 dark:bg-slate-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-2xl border border-slate-200 dark:border-slate-800 text-left transition-all group flex items-start space-x-3"
              >
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm">{t.sanctionLetterBtn}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Solar loan sanction & 25-yr performance warranty</p>
                </div>
              </button>
            </div>
          </div>

          {/* KYC Documents & Uploaded Files */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Customer Contact & Installation Details */}
            <div className="glass-premium rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
                <User className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="font-bold text-slate-800 dark:text-white">{t.customerDocuments}</h3>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t.fullName || 'Customer Name'}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t.customerId}</span>
                  <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{customer.customerId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t.mobile}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.mobileNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t.email}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{customer.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t.installationAddress}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-right truncate max-w-[200px]" title={customer.installationAddress}>
                    {customer.installationAddress || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Uploaded Site & Legal Files */}
            <div className="glass-premium rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
                <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="font-bold text-slate-800 dark:text-white">{t.uploadedFiles}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {customer.documents && Object.keys(customer.documents).map((docName) => {
                  const url = customer.documents[docName];
                  if (!url) return null;
                  const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
                  return (
                    <a
                      key={docName}
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 px-3.5 py-3 bg-slate-50 dark:bg-slate-900/40 hover:bg-teal-50 dark:hover:bg-teal-950/20 text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 rounded-xl transition-all border border-slate-200/50 dark:border-slate-700/50 truncate"
                    >
                      <FileText className="w-4 h-4 flex-shrink-0 text-teal-600 dark:text-teal-400" />
                      <span className="capitalize truncate font-semibold">{docName.replace('File', '')}</span>
                    </a>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* UNIVERSAL POPUP MODALS                                         */}
      {/* ============================================================== */}

      {/* ORIGINAL QUICK PAY QR PAYMENT POPUP MODAL */}
      {showQrModal && selectedEmi && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in no-print">
          <div className="w-full max-w-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-5 animate-scale-up my-auto max-h-[92vh] overflow-y-auto">
            <button 
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t.scanQrToPay || 'Scan QR to Pay'}</h3>
              <p className="text-xs text-slate-500">{t.emiLabel || 'EMI'} #{selectedEmi.emiNumber} | {customer.fullName}</p>
            </div>

            {/* UPI QR Code */}
            <div className="w-52 h-52 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center mx-auto relative overflow-hidden p-3 shadow-inner">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=${customer?.activeUpi?.upiId || 'rsanthoshkumar376@oksbi'}%26pn=${encodeURIComponent(customer?.activeUpi?.payeeName || 'Mr Santhoshkumar R')}%26am=${(selectedEmi.emiAmount + (selectedEmi.lateFee || 0)).toFixed(2)}%26cu=INR%26tn=EMI_${selectedEmi.emiNumber}_${(customer?.customerId || '').replace(/[^a-zA-Z0-9]/g, '')}`}
                alt="Payment QR Code"
                className="w-full h-full object-contain rounded"
              />
            </div>

            {/* Save QR to Gallery Button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => handleDownloadQr(selectedEmi)}
                className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>{t.saveQrImage || 'Save QR Image'}</span>
              </button>
            </div>

            <div className="text-center space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{t.amountToTransfer || 'Amount to transfer'}</p>
              <p className="text-3xl font-black text-teal-600 dark:text-teal-400">{formatCurrency(selectedEmi.emiAmount + (selectedEmi.lateFee || 0))}</p>
              <p className="text-[11px] text-slate-500 font-medium">
                A/c: {customer?.activeUpi?.payeeName || 'Mr Santhoshkumar R'} ({customer?.activeUpi?.upiId || 'rsanthoshkumar376@oksbi'})
              </p>
            </div>

            {/* DIRECT UPI APP LINK FOR MOBILE */}
            <div className="space-y-2">
              <a
                href={`upi://pay?pa=${customer?.activeUpi?.upiId || 'rsanthoshkumar376@oksbi'}&pn=${encodeURIComponent(customer?.activeUpi?.payeeName || 'Mr Santhoshkumar R')}&am=${(selectedEmi.emiAmount + (selectedEmi.lateFee || 0)).toFixed(2)}&cu=INR&tn=EMI_${selectedEmi.emiNumber}_${(customer?.customerId || '').replace(/[^a-zA-Z0-9]/g, '')}`}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 text-sm"
              >
                <Zap className="w-4 h-4 text-yellow-300 fill-current" />
                <span>Pay via GPay / PhonePe / Paytm</span>
              </a>

              {/* Copy UPI ID Button */}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(customer?.activeUpi?.upiId || 'rsanthoshkumar376@oksbi');
                  setCopiedUpi(true);
                  setTimeout(() => setCopiedUpi(false), 2000);
                }}
                className="w-full py-1.5 px-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-[11px] text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 flex items-center justify-center space-x-1.5 transition-colors"
              >
                {copiedUpi ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">{t.copiedUpiSuccess || 'UPI ID Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy UPI ID ({customer?.activeUpi?.upiId || 'rsanthoshkumar376@oksbi'})</span>
                  </>
                )}
              </button>
            </div>

            {/* UTR Reference Input */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 space-y-1 text-left">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                {t.enterUtr || 'UPI UTR / Reference No. (Optional)'}
              </label>
              <input
                type="text"
                maxLength={16}
                value={customerUtr}
                onChange={(e) => setCustomerUtr(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                placeholder="12-digit UTR number"
                className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-slate-800 dark:text-white"
              />
            </div>

            {/* I HAVE COMPLETED PAYMENT BUTTON */}
            <button
              onClick={async () => {
                setSubmittingUtr(true);
                try {
                  await api.post('/customer/notify-payment', { 
                    emiNumber: selectedEmi.emiNumber,
                    utrNumber: customerUtr ? customerUtr.trim() : undefined
                  });
                  alert(lang === 'ta' ? 'கட்டண அறிவிப்பு அனுப்பப்பட்டது! நிர்வாகி சரிபார்த்து ரசீதை உறுதி செய்வார்.' : "Payment notification sent! The owner/administrator has been notified to verify your payment.");
                  setShowQrModal(false);
                  fetchDashboardData();
                } catch (err) {
                  alert(lang === 'ta' ? 'கட்டண விபரம் பதிவு செய்யப்பட்டது.' : "Payment recorded! Owner/administrator will verify your payment shortly.");
                  setShowQrModal(false);
                } finally {
                  setSubmittingUtr(false);
                }
              }}
              disabled={submittingUtr}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-colors text-xs flex items-center justify-center space-x-1.5"
            >
              {submittingUtr ? (
                <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>{t.iHaveCompletedPayment || 'I Have Completed Payment'}</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* OFFICIAL LOAN STATEMENT, TAX INVOICE & SANCTION LETTER MODALS */}
      <React.Suspense fallback={<div />}>
        {showStatementModal && (
          <LoanStatementModal
            customer={customer}
            isOpen={showStatementModal}
            onClose={() => setShowStatementModal(false)}
          />
        )}
        {showInvoiceModal && (
          <TaxInvoiceModal
            customer={customer}
            isOpen={showInvoiceModal}
            onClose={() => setShowInvoiceModal(false)}
          />
        )}
        {showSanctionModal && (
          <SanctionLetterModal
            customer={customer}
            isOpen={showSanctionModal}
            onClose={() => setShowSanctionModal(false)}
          />
        )}
      </React.Suspense>

      {/* CUSTOMER SERVICE & MAINTENANCE TICKET MODAL */}
      <ServiceTicketModal 
        isOpen={showServiceTicketModal} 
        onClose={() => setShowServiceTicketModal(false)} 
        customer={customer} 
      />

      {/* SOLAR ROI & PM SURYA GHAR CALCULATOR MODAL */}
      <SolarCalculatorModal 
        isOpen={showCalculatorModal} 
        onClose={() => setShowCalculatorModal(false)} 
      />

      {/* AUTOPAY SETUP & MANAGEMENT MODAL */}
      <AutoPayModal
        isOpen={showAutoPayModal}
        onClose={() => setShowAutoPayModal(false)}
        customer={customer}
        onSuccess={() => fetchDashboardData()}
      />

      {/* FLOATING WHATSAPP SUPPORT BUTTON */}
      <button
        type="button"
        onClick={() => openCustomerSupportChat({ customer })}
        className="fixed bottom-6 right-6 z-40 flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-full shadow-2xl shadow-emerald-600/40 hover:scale-105 active:scale-95 transition-all"
        title="Chat with MRS SOLAR on WhatsApp"
        aria-label="Chat with MRS SOLAR on WhatsApp"
      >
        <MessageCircle className="w-5 h-5 text-white" />
        <span className="hidden sm:inline">{t.whatsappHelp}</span>
      </button>

    </div>
  );
}
