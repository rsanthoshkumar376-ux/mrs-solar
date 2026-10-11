import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { 
  Sun, DollarSign, Calendar, ShieldCheck, Zap, X,
  QrCode, Landmark, User, FileText, Info, Calculator, MessageCircle,
  Copy, Check, Leaf, Printer, Phone, Download, AlertCircle
} from 'lucide-react';
import { openCustomerSupportChat } from '../../utils/whatsapp.js';
import { translations, getLanguage } from '../../utils/translations.js';

// Lazy load heavy Leaflet map and PDF statement modal for performance
const SolarSiteMap = React.lazy(() => import('../../components/SolarSiteMap.jsx'));
const LoanStatementModal = React.lazy(() => import('../../components/LoanStatementModal.jsx'));

export default function CustomerDashboard() {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedEmi, setSelectedEmi] = useState(null);
  const [customerUtr, setCustomerUtr] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedMobile, setCopiedMobile] = useState(false);
  const [launchingApp, setLaunchingApp] = useState(null);
  const [lang, setLang] = useState(getLanguage);

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

  const handleDownloadQr = () => {
    if (!selectedEmi) return;
    const totalAmount = (selectedEmi.emiAmount + (selectedEmi.lateFee || 0)).toFixed(2);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=upi://pay?pa=rsanthoshkumar376@oksbi%26pn=Mr%20Santhoshkumar%20R%26am=${totalAmount}%26cu=INR%26tn=EMI_${selectedEmi.emiNumber}_${customer?.customerId || ''}`;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `MRS_SOLAR_EMI_${selectedEmi.emiNumber}_Payment_QR.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLaunchUpi = (appKey) => {
    if (!selectedEmi) return;
    setLaunchingApp(appKey);
    const amount = (selectedEmi.emiAmount + (selectedEmi.lateFee || 0)).toFixed(2);
    const payeeVpa = 'rsanthoshkumar376@oksbi';
    const payeeName = 'Mr Santhoshkumar R';
    const cleanCustId = (customer?.customerId || '').replace(/[^a-zA-Z0-9]/g, '');
    const note = `EMI_${selectedEmi.emiNumber}_${cleanCustId}`;

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
      // In mobile Chrome / external Android browser: Use targeted Android Intent
      targetUrl = `intent://pay?${upiQuery}#Intent;scheme=upi;package=${packageMap[appKey]};S.browser_fallback_url=${encodedUniversal};end`;
    } else {
      // In APK (MRSSolarApp) or universal: Use standard upi://pay
      targetUrl = universalUpi;
    }

    // 1. Direct location change
    try {
      window.location.href = targetUrl;
    } catch (e) {
      window.location.href = universalUpi;
    }

    // 2. Dynamic link click fallback
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

    // 3. Fallback to universal UPI if still on page after 1.5s
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

  return (
    <div className="space-y-8 pb-12">
      
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-700 to-emerald-600 dark:from-teal-950 dark:to-emerald-950 rounded-3xl p-6 md:p-8 shadow-lg shadow-teal-700/10 text-white">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-yellow-300/10 rounded-full blur-xl animate-pulse-soft"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-teal-200 bg-teal-800/50 px-3 py-1 rounded-full">{t.activeFinancing}</span>
            <h2 className="text-3xl font-extrabold mt-3">{t.welcome}, {customer.fullName}</h2>
            <p className="text-sm text-teal-100 mt-1">{t.customerId}: {customer.customerId} | {t.installationDate}: {formatDate(customer.installationDate)}</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
            <div className="flex-1 min-w-[130px] bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 border border-white/10 text-center">
              <p className="text-[11px] sm:text-xs text-teal-200">{t.totalOutstanding}</p>
              <p className="text-xl sm:text-2xl font-black mt-0.5">{formatCurrency(outstandingAmount)}</p>
            </div>
            <div className="flex-1 min-w-[130px] bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 border border-white/10 text-center">
              <p className="text-[11px] sm:text-xs text-teal-200">{t.nextEmiDate}</p>
              <p className="text-xl sm:text-2xl font-black mt-0.5">{nextPendingEmi ? formatDate(nextPendingEmi.dueDate) : t.completed}</p>
            </div>
            <div className="w-full flex gap-2">
              <button
                type="button"
                onClick={() => setShowStatementModal(true)}
                className="flex-1 justify-center bg-white/20 hover:bg-white/30 text-white rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3.5 border border-white/20 flex items-center space-x-1.5 sm:space-x-2 text-xs font-bold shadow-lg transition-all"
                title="View & Download official loan amortization statement with stamp"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>{t.loanStatementBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => openCustomerSupportChat({ customer })}
                className="flex-1 justify-center bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3.5 border border-white/20 flex items-center space-x-1.5 sm:space-x-2 text-xs font-bold shadow-lg transition-all"
                title="Chat with MRS SOLAR support on WhatsApp"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>{t.whatsappHelp}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* GREEN ENERGY GENERATION & EB BILL SAVINGS */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-amber-500/10 border border-emerald-500/20 dark:border-emerald-500/20 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-500/20">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Leaf className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">{t.greenTitle}</h3>
              <p className="text-[11px] text-slate-500">{t.greenSubtitle}</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-full self-start sm:self-auto shadow-sm">
            {t.subsidyEligible}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
          <div className="bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400">{t.estGeneration}</span>
            <p className="text-xl font-black text-slate-800 dark:text-white mt-0.5">
              ~{Math.round((Number(customer.solarCapacity) || 3) * 120)} {t.unitsPerMonth}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">{t.sunshineNote}</p>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-2xl border border-emerald-300/40 dark:border-emerald-800/40">
            <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">{t.estSavings}</span>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatCurrency(Math.round((Number(customer.solarCapacity) || 3) * 120 * 6.5), false)} <span className="text-xs font-normal text-slate-400">/ mo</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-1">{t.ebSavingsNote}</p>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400">{t.co2Offset}</span>
            <p className="text-xl font-black text-teal-600 dark:text-teal-400 mt-0.5">
              ~{Math.round((Number(customer.solarCapacity) || 3) * 120 * 0.82)} kg CO₂
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              {t.treesPlantedNote.replace('{trees}', Math.round((Number(customer.solarCapacity) || 3) * 6))}
            </p>
          </div>
        </div>
      </div>

      {/* LOAN PROGRESS TIMELINE */}
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
                className={`border rounded-xl p-2.5 text-center flex flex-col items-center justify-center transition-all hover:scale-105 cursor-help ${color}`}
                title={`Due: ${formatDate(emi.dueDate)}\nAmount: ${formatCurrency(emi.emiAmount + (emi.lateFee || 0))}`}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-85">{t.emiLabel}</span>
                <span className="text-lg font-black mt-0.5">#{emi.emiNumber}</span>
                <span className="text-[9px] font-bold mt-1 uppercase tracking-tight">{statusText}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* THREE PANELS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PANEL 1: PROJECT DETAILS */}
        <div className="glass-premium rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
            <Zap className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-slate-800 dark:text-white">{t.solarProjectDetails}</h3>
          </div>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">{t.capacityKw}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.solarCapacity} kW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t.solarBrand}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.solarBrand || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t.totalSystemCost}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(customer.solarCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t.downPayment}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(customer.downPayment)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t.loanPrincipal}</span>
              <span className="font-semibold text-teal-600 dark:text-teal-400">{formatCurrency(customer.loanAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t.interestRate}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.interestRate}{t.perMonthRate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t.warrantyDetails}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">{customer.warrantyDetails || t.standardWarranty}</span>
            </div>
          </div>
        </div>

        {/* PANEL 2: LOAN TIMING & BANK */}
        <div className="glass-premium rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
            <Landmark className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-slate-800 dark:text-white">{t.financingBanking}</h3>
          </div>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">{t.monthlyEmi}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(customer.monthlyEmi)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t.durationMonths}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.emiDuration} {t.monthsSuffix}</span>
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
                <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.bankDetails?.bankName || 'N/A'}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-slate-500">{t.accountNo}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.bankDetails?.accountNumber || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL 3: CONTACT & DOCUMENTS */}
        <div className="glass-premium rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
            <User className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-slate-800 dark:text-white">{t.customerDocuments}</h3>
          </div>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">{t.mobile}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.mobileNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t.email}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">{customer.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t.installationAddress}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-right truncate max-w-[180px]" title={customer.installationAddress}>
                {customer.installationAddress || 'N/A'}
              </span>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t.uploadedFiles}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
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
                      className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/20 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-xl transition-all border border-slate-200/50 dark:border-slate-700/50 truncate"
                    >
                      <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="capitalize truncate">{docName.replace('File', '')}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* SOLAR ROOFTOP SITE MAP & GPS NAVIGATION */}
      <React.Suspense fallback={<div className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-900 animate-pulse flex items-center justify-center text-xs text-slate-400">Loading Solar Site Map...</div>}>
        <SolarSiteMap customer={customer} />
      </React.Suspense>

      {/* LIVE EMI CALCULATOR SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* EMI CALCULATOR */}
        <div className="glass-premium rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
            <Calculator className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-slate-800 dark:text-white">{t.calculatorTitle}</h3>
          </div>
          
          <div className="space-y-5 text-sm">
            <div>
              <div className="flex justify-between mb-2">
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
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-600 dark:accent-teal-400"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
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
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-600 dark:accent-teal-400"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-500">{t.durationLabel}</span>
                <span className="font-bold text-slate-800 dark:text-white">{calcMonths} {t.monthsSuffix}</span>
              </div>
              <input
                type="range"
                min="3"
                max="36"
                step="3"
                value={calcMonths}
                onChange={(e) => setCalcMonths(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-600 dark:accent-teal-400"
              />
            </div>

            <div className="bg-teal-500/5 dark:bg-teal-400/5 border border-teal-500/20 dark:border-teal-400/10 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">{t.estMonthlyEmi}</p>
                <p className="text-xs text-slate-500 mt-0.5">{t.reducingBalanceNote}</p>
              </div>
              <p className="text-3xl font-black text-teal-600 dark:text-teal-400">{formatCurrency(calcEmiResult)}</p>
            </div>
          </div>
        </div>

        {/* CURRENT DUES & UPI QR QUICK PAY */}
        <div className="glass-premium rounded-3xl p-6 md:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-200/50 dark:border-slate-800/50 mb-6">
              <QrCode className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h3 className="font-bold text-slate-800 dark:text-white">{t.payCurrentInstallment}</h3>
            </div>
            
            {nextPendingEmi ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.currentScheduledEmi}</span>
                    <h4 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{t.emiLabel} #{nextPendingEmi.emiNumber}</h4>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                      customer.requestingEmi === nextPendingEmi.emiNumber
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300/50'
                        : nextPendingEmi.status === 'Overdue' 
                        ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 border border-red-200/30'
                        : nextPendingEmi.status === 'Due Soon'
                        ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400 border border-orange-200/30'
                        : 'bg-teal-50 text-teal-600 dark:bg-teal-950/20 dark:text-teal-400 border border-teal-200/30'
                    }`}>
                      {customer.requestingEmi === nextPendingEmi.emiNumber 
                        ? 'Verification Pending' 
                        : nextPendingEmi.status === 'Overdue' ? t.statusOverdue : nextPendingEmi.status === 'Due Soon' ? t.statusDueSoon : t.statusActive}
                    </span>
                    {customer.requestingEmi === nextPendingEmi.emiNumber && customer.submittedUtr && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">UTR: {customer.submittedUtr}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                  <div>
                    <span className="text-slate-500">{t.emiBaseAmount}</span>
                    <p className="font-bold text-slate-800 dark:text-white mt-0.5">{formatCurrency(nextPendingEmi.emiAmount)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">{t.latePenaltyFee}</span>
                    <p className={`font-bold mt-0.5 ${nextPendingEmi.lateFee > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'}`}>
                      {formatCurrency(nextPendingEmi.lateFee)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">{t.interestPortion}</span>
                    <p className="font-semibold text-slate-800 dark:text-white mt-0.5">{formatCurrency(nextPendingEmi.interestPaid)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">{t.principalPortion}</span>
                    <p className="font-semibold text-slate-800 dark:text-white mt-0.5">{formatCurrency(nextPendingEmi.principalPaid)}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-teal-600 text-white p-4 rounded-2xl shadow-lg shadow-teal-500/10">
                  <div>
                    <p className="text-xs opacity-80 uppercase font-semibold">{t.totalOutstandingDue}</p>
                    <p className="text-lg opacity-70 text-teal-100">{t.includingLateFees}</p>
                  </div>
                  <p className="text-3xl font-black">{formatCurrency(nextPendingEmi.emiAmount + nextPendingEmi.lateFee)}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 space-y-3">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-white">{t.allEmisPaidTitle}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">{t.allEmisPaidDesc}</p>
              </div>
            )}
          </div>

          {nextPendingEmi && (
            <button
              onClick={() => openPaymentModal(nextPendingEmi)}
              className="w-full mt-6 py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-teal-500/10 flex items-center justify-center space-x-2 outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              <QrCode className="w-5 h-5" />
              <span>{t.generateQrBtn}</span>
            </button>
          )}
        </div>

      </div>

      {/* QR PAYMENT POPUP MODAL */}
      {showQrModal && selectedEmi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-6">
            <button 
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t.scanQrToPay}</h3>
              <p className="text-xs text-slate-500">{t.emiLabel} #{selectedEmi.emiNumber} | {customer.fullName}</p>
            </div>

            {/* Simulated UPI QR Code */}
            <div className="w-52 h-52 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center mx-auto relative overflow-hidden p-3 shadow-inner">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=rsanthoshkumar376@oksbi%26pn=Mr%20Santhoshkumar%20R%26am=${(selectedEmi.emiAmount + (selectedEmi.lateFee || 0)).toFixed(2)}%26cu=INR%26tn=EMI_${selectedEmi.emiNumber}_${customer.customerId}`}
                alt="Payment QR Code"
                className="w-full h-full object-contain rounded"
              />
            </div>

            {/* Save QR to Gallery Button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleDownloadQr}
                className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>{t.saveQrImage}</span>
              </button>
            </div>

            <div className="text-center space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{t.amountToTransfer}</p>
              <p className="text-3xl font-black text-teal-600 dark:text-teal-400">{formatCurrency(selectedEmi.emiAmount + (selectedEmi.lateFee || 0))}</p>
              <p className="text-[11px] text-slate-500 font-medium">A/c: Mr Santhoshkumar R (rsanthoshkumar376@oksbi)</p>
            </div>

            {/* MULTI-APP UPI PAYMENT SELECTOR */}
            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                {t.oneTapPayment}
              </p>

              <div className="grid grid-cols-2 gap-2">
                {/* Google Pay */}
                <button
                  type="button"
                  onClick={() => handleLaunchUpi('gpay')}
                  className="py-2.5 px-3 bg-white hover:bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all hover:scale-105 active:scale-95"
                  title="Open Google Pay"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>
                  <span className="truncate">
                    {launchingApp === 'gpay' ? (lang === 'ta' ? 'திறக்கிறது...' : 'Opening...') : t.openGPay}
                  </span>
                </button>

                {/* PhonePe */}
                <button
                  type="button"
                  onClick={() => handleLaunchUpi('phonepe')}
                  className="py-2.5 px-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all hover:scale-105 active:scale-95"
                  title="Open PhonePe"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-white shrink-0"></span>
                  <span className="truncate">
                    {launchingApp === 'phonepe' ? (lang === 'ta' ? 'திறக்கிறது...' : 'Opening...') : t.openPhonePe}
                  </span>
                </button>

                {/* Paytm */}
                <button
                  type="button"
                  onClick={() => handleLaunchUpi('paytm')}
                  className="py-2.5 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all hover:scale-105 active:scale-95"
                  title="Open Paytm"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-200 shrink-0"></span>
                  <span className="truncate">
                    {launchingApp === 'paytm' ? (lang === 'ta' ? 'திறக்கிறது...' : 'Opening...') : t.openPaytm}
                  </span>
                </button>

                {/* Any UPI App */}
                <button
                  type="button"
                  onClick={() => handleLaunchUpi('any')}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all hover:scale-105 active:scale-95"
                  title="Open Any UPI App"
                >
                  <Zap className="w-3.5 h-3.5 text-yellow-300 fill-current shrink-0" />
                  <span className="truncate">
                    {launchingApp === 'any' ? (lang === 'ta' ? 'திறக்கிறது...' : 'Opening...') : t.openAnyUpi}
                  </span>
                </button>
              </div>

              {/* Direct Native Link Anchor (Fallback for WebViews) */}
              <div className="pt-0.5">
                <a
                  href={`upi://pay?pa=rsanthoshkumar376@oksbi&pn=Mr%20Santhoshkumar%20R&am=${(selectedEmi.emiAmount + (selectedEmi.lateFee || 0)).toFixed(2)}&cu=INR&tn=EMI_${selectedEmi.emiNumber}_${(customer?.customerId || '').replace(/[^a-zA-Z0-9]/g, '')}`}
                  className="w-full py-2 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>{lang === 'ta' ? 'நேரடியாக UPI செயலியைத் திறக்க கிளிக் செய்க' : 'Tap here to launch UPI Chooser directly'}</span>
                </a>
              </div>

              {/* Copy Mobile Number (Recommended for Paytm Protect / PhonePe bypass) */}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('8072454996');
                  setCopiedMobile(true);
                  setTimeout(() => setCopiedMobile(false), 2000);
                }}
                className="w-full py-2 px-3 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/40 text-xs text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
              >
                {copiedMobile ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">{t.copiedMobileSuccess}</span>
                  </>
                ) : (
                  <>
                    <Phone className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>{t.copyUpiMobile}</span>
                  </>
                )}
              </button>

              {/* Copy UPI ID Button */}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('rsanthoshkumar376@oksbi');
                  setCopiedUpi(true);
                  setTimeout(() => setCopiedUpi(false), 2000);
                }}
                className="w-full py-1.5 px-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-[11px] text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 flex items-center justify-center space-x-1.5 transition-colors"
              >
                {copiedUpi ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">{t.copiedUpiSuccess}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>{t.copyUpiId}</span>
                  </>
                )}
              </button>

              {/* Helpful Paytm / PhonePe Risk Policy Explainer */}
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-2.5 text-left">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[11px] text-amber-800 dark:text-amber-300">{t.upiRiskHelpTitle}</p>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                      {t.upiRiskHelpDesc}
                    </p>
                  </div>
                </div>
              </div>
              {/* UTR / UPI Reference Number Submission */}
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 space-y-2 text-left">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  {t.enterUtr}
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={customerUtr}
                  onChange={(e) => setCustomerUtr(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                  placeholder={t.utrPlaceholder}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-slate-800 dark:text-white"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  💡 Check your Google Pay, PhonePe, or Paytm receipt for the 12-digit UPI Reference / UTR number.
                </p>
              </div>
            </div>

            <button
              onClick={async () => {
                if (!customerUtr || customerUtr.trim().length < 6) {
                  alert('Please enter your 12-digit UPI UTR / Reference number from your payment app so MRS Solar can verify and credit your installment.');
                  return;
                }
                setSubmittingUtr(true);
                try {
                  await api.post('/customer/notify-payment', { 
                    emiNumber: selectedEmi.emiNumber,
                    utrNumber: customerUtr.trim()
                  });
                  alert(`Payment reference submitted successfully!\nUTR: ${customerUtr.trim()}.\nOur team will verify with bank records and confirm your payment receipt.`);
                  setShowQrModal(false);
                  fetchDashboardData();
                } catch (err) {
                  alert(err.response?.data?.message || 'Error submitting payment reference.');
                } finally {
                  setSubmittingUtr(false);
                }
              }}
              disabled={submittingUtr}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-600/50 text-white font-bold rounded-xl transition-colors text-xs flex items-center justify-center space-x-2 shadow-lg shadow-teal-500/10"
            >
              {submittingUtr ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Submit UTR for Owner Verification</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* OFFICIAL LOAN STATEMENT & CERTIFICATE MODAL */}
      <React.Suspense fallback={<div />}>
        {showStatementModal && (
          <LoanStatementModal
            customer={customer}
            isOpen={showStatementModal}
            onClose={() => setShowStatementModal(false)}
          />
        )}
      </React.Suspense>

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
