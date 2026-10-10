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
        <div className="p-8 sm:p-10 space-y-6 text-slate-800 dark:text-slate-100 bg-white print:text-black print:bg-white print:p-0">
          
          {/* LETTERHEAD */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-teal-600 pb-6 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 bg-teal-600 rounded-2xl flex items-center justify-center text-white shadow-md print:border print:border-teal-700">
                <Sun className="w-9 h-9 text-yellow-300" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 print:text-black">
                  MRS <span className="text-teal-600">SOLAR</span> ASSOCIATES
                </h1>
                <p className="text-xs font-semibold text-slate-600 print:text-slate-700">
                  {t.companySubtitle}
                </p>
                <p className="text-[11px] text-slate-500">
                  {t.companyContact}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs space-y-1">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200 print:border-black">
                {isCompleted ? t.loanFullySettled : t.activeLoanStatement}
              </span>
              <p className="font-mono text-slate-500 text-[11px]">
                {t.statementDate} {formatDate(new Date().toISOString())}
              </p>
              <p className="font-mono text-slate-500 text-[11px]">
                {t.accountId} <strong>{customer.customerId}</strong>
              </p>
            </div>
          </div>

          {/* CUSTOMER & SOLAR METADATA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 print:bg-slate-50 print:border-slate-300 text-xs">
            <div className="space-y-1.5">
              <h4 className="font-bold text-teal-700 uppercase tracking-wider text-[11px] border-b pb-1">
                {t.customerProfile}
              </h4>
              <p><strong>{t.nameLabel}</strong> {customer.fullName}</p>
              <p><strong>{t.mobileLabel}</strong> {customer.mobileNumber}</p>
              <p><strong>{t.emailLabel}</strong> {customer.email || '—'}</p>
              <p><strong>{t.aadhaarLabel}</strong> {customer.aadhaarNumber ? (customer.aadhaarNumber.includes('XXXX') ? customer.aadhaarNumber : `XXXX-XXXX-${String(customer.aadhaarNumber).slice(-4)}`) : '—'}</p>
              <p><strong>{t.addressLabel}</strong> {customer.installationAddress || customer.address || '—'}</p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-teal-700 uppercase tracking-wider text-[11px] border-b pb-1">
                {t.solarFinancingDetails}
              </h4>
              <p><strong>{t.solarCapacity}:</strong> {customer.solarCapacity} kW ({customer.solarBrand || 'Standard Solar'})</p>
              <p><strong>{t.totalSystemCost}:</strong> {formatCurrency(customer.solarCost, false)}</p>
              <p><strong>{t.downPayment}:</strong> {formatCurrency(customer.downPayment, false)}</p>
              <p><strong>{t.loanPrincipal}:</strong> {formatCurrency(customer.loanAmount, false)}</p>
              <p><strong>{t.interestTenure}</strong> {customer.interestRate}% / mo for {customer.emiDuration} {t.monthsSuffix}</p>
            </div>
          </div>

          {/* FINANCIAL SUMMARY HIGHLIGHTS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500">{t.loanPrincipal}</span>
              <p className="text-base font-bold text-slate-900 mt-0.5">{formatCurrency(customer.loanAmount, false)}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-700">{t.totalCollected}</span>
              <p className="text-base font-bold text-emerald-800 mt-0.5">{formatCurrency(totalPaid, false)}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
              <span className="text-[10px] uppercase font-bold text-orange-700">{t.monthlyEmi}</span>
              <p className="text-base font-bold text-orange-900 mt-0.5">{formatCurrency(customer.monthlyEmi, false)}</p>
            </div>
            <div className="p-3 bg-teal-50 rounded-xl border border-teal-200">
              <span className="text-[10px] uppercase font-bold text-teal-700">{t.netOutstanding}</span>
              <p className="text-base font-bold text-teal-900 mt-0.5">{formatCurrency(customer.totalOutstandingAmount, false)}</p>
            </div>
          </div>

          {/* AMORTIZATION REPAYMENT TABLE */}
          <div>
            <h4 className="font-bold text-sm text-slate-800 mb-2">{t.amortizationLedger}</h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <th className="p-2.5">{t.emiLabel}</th>
                    <th className="p-2.5">{t.dueDate}</th>
                    <th className="p-2.5 text-right">{t.installmentAmount}</th>
                    <th className="p-2.5 text-right">{t.interestPaid}</th>
                    <th className="p-2.5 text-right">{t.principalPaid}</th>
                    <th className="p-2.5 text-right">{t.lateFee}</th>
                    <th className="p-2.5 text-right">{t.remainingBalance}</th>
                    <th className="p-2.5 text-center">{t.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(customer.emiSchedule || []).map((emi) => (
                    <tr key={emi.emiNumber} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold">#{emi.emiNumber}</td>
                      <td className="p-2.5">{formatDate(emi.dueDate)}</td>
                      <td className="p-2.5 text-right font-semibold">{formatCurrency(emi.emiAmount, false)}</td>
                      <td className="p-2.5 text-right text-slate-500">{formatCurrency(emi.interestPaid, false)}</td>
                      <td className="p-2.5 text-right text-slate-500">{formatCurrency(emi.principalPaid, false)}</td>
                      <td className="p-2.5 text-right text-slate-500">{emi.lateFee > 0 ? formatCurrency(emi.lateFee, false) : '—'}</td>
                      <td className="p-2.5 text-right font-medium">{formatCurrency(emi.remainingBalance, false)}</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          emi.status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : emi.status === 'Overdue'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-700'
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
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs text-slate-500">
            <div className="max-w-md space-y-1">
              <p className="font-semibold text-slate-700">{t.officialCertification}</p>
              <p className="text-[10px] leading-relaxed">
                {t.statementDisclaimer}
              </p>
            </div>

            <div className="text-center sm:text-right space-y-8 min-w-[200px]">
              <p className="font-semibold text-slate-800">{t.forCompany}</p>
              <div className="border-t border-slate-400 pt-1">
                <p className="text-[11px] font-bold text-slate-800">{t.authorizedSignatorySeal}</p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
