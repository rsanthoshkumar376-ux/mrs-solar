import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '../utils/format.js';
import { Printer, Download, X, Sun, CheckCircle, ShieldCheck } from 'lucide-react';
import { translations, getLanguage } from '../utils/translations.js';

export default function LoanStatementModal({ customer, isOpen, onClose }) {
  const [lang, setLang] = useState(getLanguage);

  useEffect(() => {
    const handleLangChange = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLangChange);
    return () => window.removeEventListener('language-change', handleLangChange);
  }, []);

  const t = translations[lang] || translations.en;

  if (!isOpen || !customer) return null;

  const totalPaid = (customer.emiSchedule || [])
    .filter(e => e.status === 'Paid')
    .reduce((sum, e) => sum + (Number(e.paidAmount) || (Number(e.emiAmount) + (Number(e.lateFee) || 0))), 0);

  const isCompleted = customer.loanStatus === 'Completed' || 
    (customer.emiSchedule && customer.emiSchedule.length > 0 && customer.emiSchedule.every(e => e.status === 'Paid'));

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
            <Printer className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">{t.statementModalTitle}</h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all"
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

        {/* PRINTABLE STATEMENT BODY */}
        <div className="p-6 sm:p-10 space-y-6 text-slate-900 bg-white print:text-black print:bg-white print:p-0 text-xs">
          
          {/* LETTERHEAD */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-teal-600 pb-5 gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-14 h-14 bg-gradient-to-tr from-teal-600 to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-500/20 print:border print:border-teal-700">
                <Sun className="w-9 h-9 text-yellow-300" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 print:text-black">
                  MRS <span className="text-teal-600">SOLAR</span> ASSOCIATES
                </h1>
                <p className="text-xs font-semibold text-slate-700 print:text-slate-800">
                  {t.companySubtitle}
                </p>
                <p className="text-[11px] text-slate-600 font-medium">
                  {t.companyContact}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs space-y-1 bg-gradient-to-br from-teal-50 to-emerald-50/50 p-3.5 rounded-2xl border-2 border-teal-200 print:border-slate-300 min-w-[220px] shadow-sm">
              <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                isCompleted ? 'bg-emerald-600 text-white shadow-xs' : 'bg-teal-600 text-white shadow-xs'
              } print:border-black`}>
                {isCompleted ? t.loanFullySettled : t.activeLoanStatement}
              </span>
              <p className="font-mono text-slate-800 text-[11px]">
                <strong className="text-teal-950">{t.statementDate}</strong> <span className="font-semibold text-slate-950">{formatDate(new Date().toISOString())}</span>
              </p>
              <p className="font-mono text-slate-800 text-[11px]">
                <strong className="text-teal-950">{t.accountId}</strong> <span className="font-bold text-teal-950 bg-teal-100/80 px-2 py-0.5 rounded border border-teal-300">{customer.customerId}</span>
              </p>
            </div>
          </div>

          {/* CUSTOMER & SOLAR METADATA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/90 via-sky-50/40 to-slate-50 border-2 border-blue-200 print:bg-slate-50 print:border-slate-300 space-y-1.5 shadow-sm">
              <h4 className="font-extrabold text-blue-950 uppercase tracking-wider text-[11px] border-b border-blue-200 pb-1.5">
                {t.customerProfile}
              </h4>
              <p className="text-slate-900 font-medium"><strong className="text-blue-950">{t.nameLabel}</strong> <span className="font-black text-blue-950 text-sm">{customer.fullName}</span></p>
              <p className="text-slate-900 font-medium"><strong className="text-blue-950">{t.mobileLabel}</strong> <span className="font-bold text-blue-950 font-mono bg-blue-100/90 px-2 py-0.5 rounded border border-blue-300">{customer.mobileNumber}</span></p>
              <p className="text-slate-900 font-medium"><strong className="text-blue-950">{t.emailLabel}</strong> <span className="text-slate-800">{customer.email || '—'}</span></p>
              <p className="text-slate-900 font-medium"><strong className="text-blue-950">{t.aadhaarLabel}</strong> <span className="font-mono font-semibold text-slate-800">{customer.aadhaarNumber ? (customer.aadhaarNumber.includes('XXXX') ? customer.aadhaarNumber : `XXXX-XXXX-${String(customer.aadhaarNumber).slice(-4)}`) : '—'}</span></p>
              <p className="text-slate-900 font-medium"><strong className="text-blue-950">{t.addressLabel}</strong> <span className="text-slate-800">{customer.installationAddress || customer.address || '—'}</span></p>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50/90 via-emerald-50/40 to-slate-50 border-2 border-teal-200 print:bg-slate-50 print:border-slate-300 space-y-1.5 shadow-sm">
              <h4 className="font-extrabold text-teal-950 uppercase tracking-wider text-[11px] border-b border-teal-200 pb-1.5">
                {t.solarFinancingDetails}
              </h4>
              <p className="text-slate-900 font-medium"><strong className="text-teal-950">{t.solarCapacity}:</strong> <span className="font-bold text-teal-950 bg-teal-100/90 px-2 py-0.5 rounded border border-teal-300">{customer.solarCapacity} kW ({customer.solarBrand || 'Standard Solar'})</span></p>
              <p className="text-slate-900 font-medium"><strong className="text-teal-950">{t.totalSystemCost}:</strong> <span className="font-black text-slate-950 font-mono">{formatCurrency(customer.solarCost, false)}</span></p>
              <p className="text-slate-900 font-medium"><strong className="text-teal-950">{t.downPayment}:</strong> <span className="font-black text-emerald-800 font-mono">{formatCurrency(customer.downPayment, false)}</span></p>
              <p className="text-slate-900 font-medium"><strong className="text-teal-950">{t.loanPrincipal}:</strong> <span className="font-black text-indigo-900 font-mono">{formatCurrency(customer.loanAmount, false)}</span></p>
              <p className="text-slate-900 font-medium"><strong className="text-teal-950">{t.interestTenure}</strong> <span className="font-bold text-slate-900">{customer.interestRate}% / mo for {customer.emiDuration} {t.monthsSuffix} {Number(customer.emiDuration) >= 12 ? `(${(Number(customer.emiDuration) / 12).toFixed(1).replace('.0', '')} ${lang === 'ta' ? 'ஆண்டுகள்' : 'Years'})` : ''}</span></p>
            </div>
          </div>

          {/* FINANCIAL SUMMARY HIGHLIGHTS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-gradient-to-br from-indigo-50 to-blue-50/50 rounded-2xl border-2 border-indigo-200 shadow-sm">
              <span className="text-[10px] uppercase font-extrabold text-indigo-800">{t.loanPrincipal}</span>
              <p className="text-base font-black text-indigo-950 mt-1 font-mono">{formatCurrency(customer.loanAmount, false)}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-2xl border-2 border-emerald-200 shadow-sm">
              <span className="text-[10px] uppercase font-extrabold text-emerald-800">{t.totalCollected}</span>
              <p className="text-base font-black text-emerald-950 mt-1 font-mono">{formatCurrency(totalPaid, false)}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-orange-50 to-amber-50/50 rounded-2xl border-2 border-orange-200 shadow-sm">
              <span className="text-[10px] uppercase font-extrabold text-orange-800">{t.monthlyEmi}</span>
              <p className="text-base font-black text-orange-950 mt-1 font-mono">{formatCurrency(customer.monthlyEmi, false)}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-teal-50 to-emerald-50/50 rounded-2xl border-2 border-teal-200 shadow-sm">
              <span className="text-[10px] uppercase font-extrabold text-teal-800">{t.netOutstanding}</span>
              <p className="text-base font-black text-teal-950 mt-1 font-mono">{formatCurrency(customer.totalOutstandingAmount, false)}</p>
            </div>
          </div>

          {/* AMORTIZATION REPAYMENT TABLE */}
          <div>
            <h4 className="font-extrabold text-xs text-slate-950 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <span>{t.amortizationLedger}</span>
            </h4>
            <div className="overflow-x-auto rounded-2xl border-2 border-slate-300 shadow-sm">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white font-bold border-b-2 border-teal-500">
                    <th className="p-3 text-white">{t.emiLabel}</th>
                    <th className="p-3 text-white">{t.dueDate}</th>
                    <th className="p-3 text-right text-white">{t.installmentAmount}</th>
                    <th className="p-3 text-right text-teal-300">{t.interestPaid}</th>
                    <th className="p-3 text-right text-teal-300">{t.principalPaid}</th>
                    <th className="p-3 text-right text-amber-300">{t.lateFee}</th>
                    <th className="p-3 text-right text-white">{t.remainingBalance}</th>
                    <th className="p-3 text-center text-white">{t.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(customer.emiSchedule || []).map((emi, idx) => (
                    <tr key={emi.emiNumber} className={idx % 2 === 0 ? 'bg-white hover:bg-teal-50/30 transition-colors' : 'bg-slate-50/60 hover:bg-teal-50/30 transition-colors'}>
                      <td className="p-3 font-black text-slate-950">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-200 text-slate-900 font-mono font-bold text-[10px]">
                          #{emi.emiNumber}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-900">{formatDate(emi.dueDate)}</td>
                      <td className="p-3 text-right font-black font-mono text-slate-950">{formatCurrency(emi.emiAmount, false)}</td>
                      <td className="p-3 text-right font-mono font-bold text-teal-800">{formatCurrency(emi.interestPaid, false)}</td>
                      <td className="p-3 text-right font-mono font-bold text-indigo-800">{formatCurrency(emi.principalPaid, false)}</td>
                      <td className="p-3 text-right font-mono font-bold text-orange-800">{emi.lateFee > 0 ? formatCurrency(emi.lateFee, false) : '—'}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">{formatCurrency(emi.remainingBalance, false)}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase shadow-xs ${
                          emi.status === 'Paid'
                            ? 'bg-emerald-600 text-white'
                            : emi.status === 'Overdue'
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-200 text-slate-800 border border-slate-300'
                        }`}>
                          {emi.status === 'Paid' ? t.statusPaid : emi.status === 'Overdue' ? t.statusOverdue : emi.status === 'Due Soon' ? t.statusDueSoon : emi.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SIGNATURE & LEGAL DISCLAIMER */}
          <div className="pt-6 border-t-2 border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs text-slate-600">
            <div className="max-w-md space-y-1">
              <p className="font-bold text-slate-900">{t.officialCertification}</p>
              <p className="text-[10px] leading-relaxed font-medium text-slate-600">
                {t.statementDisclaimer}
              </p>
            </div>

            <div className="text-center sm:text-right space-y-8 min-w-[200px]">
              <p className="font-bold text-slate-900">{t.forCompany}</p>
              <div className="border-t-2 border-slate-400 pt-1.5">
                <p className="text-[11px] font-black text-slate-950">{t.authorizedSignatorySeal}</p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
