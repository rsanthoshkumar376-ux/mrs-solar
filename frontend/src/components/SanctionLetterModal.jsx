import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '../utils/format.js';
import { Printer, Download, X, Sun, CheckCircle, ShieldCheck, Award, Landmark, Zap, FileText } from 'lucide-react';
import { translations, getLanguage } from '../utils/translations.js';

export default function SanctionLetterModal({ customer, isOpen, onClose }) {
  const [lang, setLang] = useState(getLanguage);

  useEffect(() => {
    const handleLangChange = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLangChange);
    return () => window.removeEventListener('language-change', handleLangChange);
  }, []);

  const t = translations[lang] || translations.en;

  if (!isOpen || !customer) return null;

  const solarCost = Number(customer.solarCost) || 0;
  const downPayment = Number(customer.downPayment) || 0;
  const loanAmount = Number(customer.loanAmount) || 0;
  const monthlyEmi = Number(customer.monthlyEmi) || 0;
  const duration = Number(customer.emiDuration) || 36;
  const rate = customer.interestRate || 2;
  const capacity = Number(customer.solarCapacity) || 1;
  const brand = customer.solarBrand || 'Standard Solar';

  const sanctionRef = `REF: MRS/SANCTION/2026/${customer.customerId || 'SOL'}`;
  const sanctionDate = formatDate(customer.loanStartDate || customer.createdAt || new Date().toISOString());
  const firstDueDate = customer.emiSchedule?.[0]?.dueDate 
    ? formatDate(customer.emiSchedule[0].dueDate) 
    : '12th of next month';

  const expectedUnitsPerMonth = Math.round(capacity * 120);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      
      {/* MODAL WRAPPER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl relative print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        
        {/* NO-PRINT HEADER ACTIONS */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 print:hidden">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              {t.sanctionModalTitle}
            </h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t.printSavePdf}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE LETTER BODY */}
        <div className="p-6 sm:p-10 space-y-6 text-slate-900 bg-white print:text-black print:bg-white print:p-0 text-xs">
          
          {/* LETTERHEAD */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-indigo-600 pb-5 gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-indigo-800 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 print:border print:border-indigo-700">
                <Sun className="w-9 h-9 text-yellow-300" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 print:text-black">
                    MRS <span className="text-indigo-600">SOLAR</span> ASSOCIATES
                  </h1>
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-sm border border-indigo-700">
                    SANCTION & WARRANTY
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-700 print:text-slate-800">
                  Clean Energy Project Finance & 25-Year Performance Guarantee Division
                </p>
                <p className="text-[11px] text-slate-600 font-medium">
                  Corporate Office: No. 12, Main Road, Tirunelveli, Tamil Nadu - 627001 | Phone: +91 80724 54996
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right space-y-1 bg-gradient-to-br from-indigo-50 via-blue-50/60 to-slate-50 print:bg-white p-3.5 rounded-2xl border-2 border-indigo-200 print:border-slate-300 min-w-[220px] shadow-sm">
              <div className="inline-block px-2.5 py-1 bg-indigo-600 text-white font-mono font-black text-xs rounded-lg shadow-sm">
                {sanctionRef}
              </div>
              <p className="text-slate-800 text-[11px]">
                <strong className="text-indigo-950">{t.sanctionDate}</strong> <span className="font-semibold text-slate-950">{sanctionDate}</span>
              </p>
              <p className="text-slate-800 text-[11px]">
                <strong className="text-indigo-950">Category:</strong> <span className="font-semibold text-slate-950">Rooftop On-Grid Solar</span>
              </p>
            </div>
          </div>

          {/* ADDRESSED TO & SUBJECT */}
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 via-sky-50/40 to-slate-50 border-2 border-blue-200 print:bg-slate-50 print:border-slate-300 shadow-sm space-y-1">
              <p className="font-black text-blue-950 text-base">{customer.fullName} {customer.fatherName ? <span className="text-xs font-semibold text-slate-600">(S/O {customer.fatherName})</span> : ''}</p>
              <p className="text-slate-800 font-medium text-[11px]">{customer.installationAddress || customer.address || '—'}, {customer.district || 'Tamil Nadu'} - {customer.pinCode || '602001'}</p>
              <p className="text-slate-800 text-[11px] pt-0.5">
                <strong className="text-blue-950">Mobile:</strong> <span className="font-bold text-blue-950 font-mono bg-blue-100/90 px-2 py-0.5 rounded border border-blue-200">{customer.mobileNumber}</span>
                <span className="mx-2 text-slate-400">|</span>
                <strong className="text-blue-950">TNEB Consumer No:</strong> <span className="font-extrabold text-slate-950 font-mono bg-white px-2 py-0.5 rounded border border-blue-200 shadow-2xs">{customer.tnebConsumerNumber || customer.electricityConsumerNumber || '—'}</span>
              </p>
            </div>

            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-3.5 rounded-xl border-2 border-indigo-200 font-bold text-indigo-950 text-xs shadow-xs">
              {t.sanctionSubject
                .replace('{amount}', formatCurrency(loanAmount, false))
                .replace('{capacity}', capacity)}
            </div>

            <p className="text-slate-800 leading-relaxed text-[11px] font-medium">
              {t.sanctionSalutation.replace('{name}', customer.fullName)} {t.sanctionIntro}
            </p>
          </div>

          {/* KEY FINANCIAL MATRIX */}
          <div>
            <h4 className="font-extrabold text-indigo-950 uppercase tracking-wider text-[11px] mb-2.5 flex items-center space-x-1.5 border-b border-indigo-200 pb-1.5">
              <Landmark className="w-4 h-4 text-indigo-700" />
              <span>{t.sanctionKeyTerms}</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-gradient-to-br from-indigo-50 to-blue-50/50 rounded-2xl border-2 border-indigo-200 shadow-sm">
                <span className="text-[10px] uppercase font-extrabold text-indigo-800">{t.sanctionLoanAmount}</span>
                <p className="text-base font-black text-indigo-950 mt-1 font-mono">{formatCurrency(loanAmount, false)}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-2xl border-2 border-emerald-200 shadow-sm">
                <span className="text-[10px] uppercase font-extrabold text-emerald-800">{t.downPayment}</span>
                <p className="text-base font-black text-emerald-950 mt-1 font-mono">{formatCurrency(downPayment, false)}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-orange-50 to-amber-50/50 rounded-2xl border-2 border-orange-200 shadow-sm">
                <span className="text-[10px] uppercase font-extrabold text-orange-800">{t.sanctionEmi}</span>
                <p className="text-base font-black text-orange-950 mt-1 font-mono">{formatCurrency(monthlyEmi, false)}</p>
              </div>
              <div className="p-3 bg-slate-100/90 rounded-2xl border-2 border-slate-300 shadow-sm">
                <span className="text-[10px] uppercase font-extrabold text-slate-700">{t.sanctionTenure}</span>
                <p className="text-base font-black text-slate-950 mt-1">{duration} {t.monthsSuffix || 'Months'} {duration >= 12 ? `(${(duration / 12).toFixed(1).replace('.0', '')} Yrs)` : ''}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3 text-[11px]">
              <div className="p-2.5 rounded-xl bg-indigo-50/80 border border-indigo-200 text-slate-900 font-semibold">
                <strong className="text-indigo-900">{t.sanctionInterestRate}</strong> {rate}% / month (Simple Reducing)
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50/80 border border-indigo-200 text-slate-900 font-semibold">
                <strong className="text-indigo-900">First EMI Due:</strong> {firstDueDate}
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50/80 border border-indigo-200 text-slate-900 font-semibold">
                <strong className="text-indigo-900">Payment Channel:</strong> UPI / Direct Bank Transfer
              </div>
            </div>
          </div>

          {/* TECHNICAL & 25-YEAR PERFORMANCE WARRANTY COVENANT */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 via-indigo-50/30 to-blue-50/30 border-2 border-slate-300 space-y-2.5 shadow-sm">
            <h4 className="font-extrabold text-indigo-950 uppercase tracking-wider text-[11px] flex items-center space-x-1.5 border-b border-indigo-200 pb-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-700" />
              <span>{t.sanctionTechWarranty}</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-bold border-b border-slate-200 pb-2 text-slate-900">
              <p><strong className="text-indigo-900">{t.sanctionCapacity}</strong> {capacity} kWp On-Grid</p>
              <p><strong className="text-indigo-900">PV Technology:</strong> Tier-1 Mono PERC</p>
              <p><strong className="text-indigo-900">{t.sanctionExpectedGen}</strong> ~{expectedUnitsPerMonth} kWh / month</p>
            </div>

            <div className="space-y-2 text-[10px] text-slate-800 leading-relaxed font-medium">
              <p className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong className="text-slate-950">25-Year Linear Power Warranty:</strong> Guaranteed minimum 90% peak power output for first 10 years and 80% peak power output up to Year 25.</span>
              </p>
              <p className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong className="text-slate-950">5-Year Complete Inverter & Workmanship Warranty:</strong> Free on-site replacement for solar inverter, mounting structures, and wiring defects.</span>
              </p>
              <p className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong className="text-slate-950">TANGEDCO Net-Metering Integration:</strong> Full commissioning support for bi-directional energy meter installation and export billing credits.</span>
              </p>
            </div>
          </div>

          {/* LEGAL CLAUSES & HYPOTHECATION */}
          <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50/50 text-[10.5px] text-slate-800 space-y-1.5 shadow-xs">
            <h5 className="font-black text-amber-950 uppercase tracking-wider text-[11px] border-b border-amber-200 pb-1">
              Financing Covenants & Asset Hypothecation
            </h5>
            <p className="font-medium"><strong className="text-amber-950">1. Hypothecation:</strong> {t.sanctionCovenant1}</p>
            <p className="font-medium"><strong className="text-amber-950">2. Prepayment & Foreclosure:</strong> {t.sanctionCovenant2}</p>
            <p className="font-medium"><strong className="text-amber-950">3. Statutory Approvals:</strong> Installation adheres strictly to MNRE technical guidelines, CEA safety regulations, and TNERC rooftop solar interconnection mandates.</p>
          </div>

          {/* ACCEPTANCE & SIGNATURES */}
          <div className="pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-6">
            
            {/* BORROWER ACCEPTANCE */}
            <div className="text-center space-y-6 min-w-[220px]">
              <p className="text-[10px] text-slate-600 italic font-medium max-w-xs">{t.sanctionAcceptance}</p>
              <div className="border-t-2 border-slate-400 pt-1.5">
                <p className="text-[11px] font-black text-slate-950">{customer.fullName}</p>
                <p className="text-[9.5px] text-slate-600 font-medium">Borrower / Rooftop Owner Acceptance</p>
              </div>
            </div>

            {/* DIGITAL SANCTION STAMP */}
            <div className="flex flex-col items-center justify-center p-3 rounded-full border-2 border-dashed border-indigo-600 bg-gradient-to-br from-indigo-100 via-blue-50 to-indigo-50 w-36 h-36 text-center select-none shadow-md print:border-indigo-800">
              <Award className="w-5 h-5 text-indigo-700 mb-0.5" />
              <span className="text-[8px] font-black uppercase text-indigo-950 tracking-tighter leading-tight">
                MRS SOLAR ASSOCIATES
              </span>
              <span className="text-[7px] font-bold text-emerald-800 uppercase my-0.5 bg-emerald-200/90 px-1.5 py-0.5 rounded-full border border-emerald-400">
                SANCTION APPROVED
              </span>
              <span className="text-[7px] text-slate-800 uppercase font-mono font-bold">
                CREDIT COMMITTEE
              </span>
              <span className="text-[6.5px] text-slate-600 font-mono mt-0.5 font-semibold">
                DISBURSED-2026
              </span>
            </div>

            {/* AUTHORIZED SANCTIONING AUTHORITY */}
            <div className="text-center sm:text-right space-y-8 min-w-[200px]">
              <p className="font-bold text-slate-900 text-[11px]">{t.forCompany}</p>
              <div className="border-t-2 border-slate-400 pt-1.5">
                <p className="text-[11px] font-black text-slate-950">{t.authorizedSignatorySeal}</p>
                <p className="text-[10px] text-slate-600 font-medium">Credit Head / Authorized Officer</p>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
