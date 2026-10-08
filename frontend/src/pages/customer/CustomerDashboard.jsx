import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { 
  Sun, DollarSign, Calendar, ShieldCheck, Zap, X,
  QrCode, Landmark, User, FileText, Info, Calculator, MessageCircle,
  Copy, Check, Leaf, Printer
} from 'lucide-react';
import { openCustomerSupportChat } from '../../utils/whatsapp.js';
import SolarSiteMap from '../../components/SolarSiteMap.jsx';
import LoanStatementModal from '../../components/LoanStatementModal.jsx';
import { translations, getLanguage } from '../../utils/translations.js';

export default function CustomerDashboard() {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedEmi, setSelectedEmi] = useState(null);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
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
          <div className="flex flex-wrap gap-3 items-center">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/10 text-center">
              <p className="text-xs text-teal-200">{t.totalOutstanding}</p>
              <p className="text-2xl font-black mt-1">{formatCurrency(outstandingAmount)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/10 text-center">
              <p className="text-xs text-teal-200">{t.nextEmiDate}</p>
              <p className="text-2xl font-black mt-1">{nextPendingEmi ? formatDate(nextPendingEmi.dueDate) : t.completed}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowStatementModal(true)}
              className="bg-white/20 hover:bg-white/30 text-white rounded-2xl px-4 py-3.5 border border-white/20 flex items-center space-x-2 text-xs font-bold shadow-lg transition-all"
              title="View & Download official loan amortization statement with stamp"
            >
              <Printer className="w-4 h-4" />
              <span>{t.loanStatementBtn}</span>
            </button>
            <button
              type="button"
              onClick={() => openCustomerSupportChat({ customer })}
              className="bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl px-4 py-3.5 border border-white/20 flex items-center space-x-2 text-xs font-bold shadow-lg transition-all"
              title="Chat with MRS SOLAR support on WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{t.whatsappHelp}</span>
            </button>
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
      <SolarSiteMap customer={customer} />

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
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                    nextPendingEmi.status === 'Overdue' 
                      ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 border border-red-200/30'
                      : nextPendingEmi.status === 'Due Soon'
                      ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400 border border-orange-200/30'
                      : 'bg-teal-50 text-teal-600 dark:bg-teal-950/20 dark:text-teal-400 border border-teal-200/30'
                  }`}>
                    {nextPendingEmi.status === 'Overdue' ? t.statusOverdue : nextPendingEmi.status === 'Due Soon' ? t.statusDueSoon : t.statusActive}
                  </span>
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
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=rsanthoshkumar376@oksbi%26pn=MRS_SOLAR%26am=${selectedEmi.emiAmount + selectedEmi.lateFee}%26cu=INR%26tn=EMI_${selectedEmi.emiNumber}_${customer.customerId}`}
                alt="Payment QR Code"
                className="w-full h-full object-contain rounded"
              />
            </div>

            <div className="text-center space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{t.amountToTransfer}</p>
              <p className="text-3xl font-black text-teal-600 dark:text-teal-400">{formatCurrency(selectedEmi.emiAmount + selectedEmi.lateFee)}</p>
              <p className="text-[10px] text-slate-400 italic">UPI: rsanthoshkumar376@oksbi</p>
            </div>

            {/* MULTI-APP UPI PAYMENT SELECTOR */}
            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                {t.oneTapPayment}
              </p>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`gpay://upi/pay?pa=rsanthoshkumar376@oksbi&pn=MRS%20SOLAR&am=${selectedEmi.emiAmount + selectedEmi.lateFee}&cu=INR&tn=EMI%20${selectedEmi.emiNumber}%20${customer.customerId}`}
                  className="py-2.5 px-3 bg-white hover:bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all hover:scale-105"
                  title="Open Google Pay"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span>{t.openGPay}</span>
                </a>

                <a
                  href={`phonepe://pay?pa=rsanthoshkumar376@oksbi&pn=MRS%20SOLAR&am=${selectedEmi.emiAmount + selectedEmi.lateFee}&cu=INR&tn=EMI%20${selectedEmi.emiNumber}%20${customer.customerId}`}
                  className="py-2.5 px-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all hover:scale-105"
                  title="Open PhonePe"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
                  <span>{t.openPhonePe}</span>
                </a>

                <a
                  href={`paytmmp://pay?pa=rsanthoshkumar376@oksbi&pn=MRS%20SOLAR&am=${selectedEmi.emiAmount + selectedEmi.lateFee}&cu=INR&tn=EMI%20${selectedEmi.emiNumber}%20${customer.customerId}`}
                  className="py-2.5 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all hover:scale-105"
                  title="Open Paytm"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-200"></span>
                  <span>{t.openPaytm}</span>
                </a>

                <a
                  href={`upi://pay?pa=rsanthoshkumar376@oksbi&pn=MRS%20SOLAR&am=${selectedEmi.emiAmount + selectedEmi.lateFee}&cu=INR&tn=EMI%20${selectedEmi.emiNumber}%20${customer.customerId}`}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all hover:scale-105"
                  title="Open Any UPI App"
                >
                  <Zap className="w-3.5 h-3.5 text-yellow-300 fill-current" />
                  <span>{t.openAnyUpi}</span>
                </a>
              </div>

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
            </div>

            <button
              onClick={async () => {
                try {
                  await api.post('/customer/notify-payment', { emiNumber: selectedEmi.emiNumber });
                  alert(t.paymentNotifyAlert);
                } catch (err) {
                  alert(t.paymentRecordAlert);
                } finally {
                  setShowQrModal(false);
                }
              }}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-colors text-xs"
            >
              {t.iHaveCompletedPayment}
            </button>
          </div>
        </div>
      )}

      {/* OFFICIAL LOAN STATEMENT & CERTIFICATE MODAL */}
      <LoanStatementModal
        customer={customer}
        isOpen={showStatementModal}
        onClose={() => setShowStatementModal(false)}
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
