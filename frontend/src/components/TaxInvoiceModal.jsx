import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '../utils/format.js';
import { Printer, Download, X, Sun, CheckCircle, ShieldCheck, Building2, Zap, FileText } from 'lucide-react';
import { translations, getLanguage } from '../utils/translations.js';

export default function TaxInvoiceModal({ customer, isOpen, onClose }) {
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
  const capacity = Number(customer.solarCapacity) || 1;
  const brand = customer.solarBrand || 'Standard Tier-1 Solar';

  // Calculate subsidy estimate (PM Surya Ghar scheme in India)
  // 1kW = 30k, 2kW = 60k, >=3kW = 78k (capped at 40% of system cost if realistic)
  const estimatedSubsidy = solarCost > 60000 
    ? Math.min(capacity >= 3 ? 78000 : capacity >= 2 ? 60000 : 30000, Math.round(solarCost * 0.4))
    : 0;

  // Breakdown items (60% modules, 20% inverter, 10% BOS, 10% installation)
  const modulesTaxable = Math.round(solarCost * 0.60 / 1.12);
  const modulesGst = Math.round(solarCost * 0.60 - modulesTaxable);

  const inverterTaxable = Math.round(solarCost * 0.20 / 1.12);
  const inverterGst = Math.round(solarCost * 0.20 - inverterTaxable);

  const bosTaxable = Math.round(solarCost * 0.10 / 1.18);
  const bosGst = Math.round(solarCost * 0.10 - bosTaxable);

  const installTaxable = Math.round(solarCost * 0.10 / 1.18);
  const installGst = Math.round(solarCost * 0.10 - installTaxable);

  const totalTaxable = modulesTaxable + inverterTaxable + bosTaxable + installTaxable;
  const totalCgst = Math.round((modulesGst + inverterGst) / 2) + Math.round((bosGst + installGst) / 2);
  const totalSgst = (modulesGst + inverterGst + bosGst + installGst) - totalCgst;
  const totalTax = totalCgst + totalSgst;

  const invoiceNumber = `INV-2026-${customer.customerId || 'SOL'}`;
  const invoiceDate = formatDate(customer.loanStartDate || customer.createdAt || new Date().toISOString());

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
            <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              {t.taxInvoiceModalTitle}
            </h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all"
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

        {/* PRINTABLE INVOICE BODY */}
        <div className="p-8 sm:p-10 space-y-6 text-slate-800 dark:text-slate-100 bg-white print:text-black print:bg-white print:p-0 text-xs">
          
          {/* LETTERHEAD */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-amber-600 pb-5 gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-md print:border print:border-amber-700">
                <Sun className="w-9 h-9 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 print:text-black">
                    MRS <span className="text-amber-600">SOLAR</span> ASSOCIATES
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                    TAX INVOICE
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-600 print:text-slate-700">
                  Solar Rooftop EPC, Clean Energy Systems & Asset Financing
                </p>
                <p className="text-[11px] text-slate-500">
                  Head Office: No. 12, Main Road, Tirunelveli, Tamil Nadu - 627001 | Phone: +91 80724 54996
                </p>
                <div className="flex flex-wrap gap-x-4 text-[11px] font-mono text-slate-600 mt-1">
                  <span><strong>{t.gstinLabel}</strong> 33AAACM1234F1Z5</span>
                  <span><strong>{t.stateCodeLabel}</strong> 33 (Tamil Nadu)</span>
                  <span><strong>PAN:</strong> AAACM1234F</span>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right space-y-1 bg-amber-50/60 print:bg-white p-3 rounded-xl border border-amber-200/60 print:border-slate-300 min-w-[220px]">
              <p className="font-mono text-slate-900 print:text-black font-bold text-sm">
                {invoiceNumber}
              </p>
              <p className="text-slate-600 text-[11px]">
                <strong>{t.invoiceDate}</strong> {invoiceDate}
              </p>
              <p className="text-slate-600 text-[11px]">
                <strong>{t.placeOfSupply}</strong> Tamil Nadu (33)
              </p>
              <p className="text-slate-600 text-[11px]">
                <strong>{t.reverseCharge}</strong> No
              </p>
            </div>
          </div>

          {/* BILLED TO (CUSTOMER DETAILS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 print:bg-slate-50 print:border-slate-300">
            <div className="space-y-1">
              <h4 className="font-bold text-amber-800 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1 flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-600" />
                <span>{t.billTo}</span>
              </h4>
              <p className="font-bold text-sm text-slate-900">{customer.fullName} {customer.fatherName ? `(S/O ${customer.fatherName})` : ''}</p>
              <p><strong>{t.addressLabel}</strong> {customer.installationAddress || customer.address || '—'}</p>
              <p><strong>District / State:</strong> {customer.district || 'Tamil Nadu'}, PIN: {customer.pinCode || '602001'}</p>
              <p><strong>{t.mobileLabel}</strong> {customer.mobileNumber} {customer.alternateNumber ? ` / ${customer.alternateNumber}` : ''}</p>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-amber-800 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1 flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>Solar Project & Utility Link</span>
              </h4>
              <p><strong>{t.customerId}:</strong> <span className="font-mono font-bold text-amber-700">{customer.customerId}</span></p>
              <p><strong>{t.tnebConsumerNumberLabel}</strong> <span className="font-mono font-bold text-slate-800">{customer.tnebConsumerNumber || customer.electricityConsumerNumber || '—'}</span></p>
              <p><strong>{t.aadhaarLabel}</strong> {customer.aadhaarNumber ? (customer.aadhaarNumber.includes('XXXX') ? customer.aadhaarNumber : `XXXX-XXXX-${String(customer.aadhaarNumber).slice(-4)}`) : '—'}</p>
              <p><strong>Solar Capacity:</strong> {capacity} kWp Grid-Tied PV System ({brand})</p>
            </div>
          </div>

          {/* LINE ITEMS TABLE */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-2.5 w-8">#</th>
                  <th className="p-2.5">{t.itemDescription}</th>
                  <th className="p-2.5 text-center">{t.hsnSac}</th>
                  <th className="p-2.5 text-center">{t.qty}</th>
                  <th className="p-2.5 text-right">{t.unitRate}</th>
                  <th className="p-2.5 text-center">{t.taxRate}</th>
                  <th className="p-2.5 text-right">{t.taxAmount}</th>
                  <th className="p-2.5 text-right">{t.totalItemAmount}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* 1. Solar PV Modules */}
                <tr className="hover:bg-slate-50">
                  <td className="p-2.5 font-bold">1</td>
                  <td className="p-2.5">
                    <p className="font-bold text-slate-900">High-Efficiency Solar Photovoltaic Modules</p>
                    <p className="text-[10px] text-slate-500">Tier-1 Mono-PERC / TopCon Half-Cut Modules ({capacity} kWp Capacity, 25-Year Linear Warranty)</p>
                  </td>
                  <td className="p-2.5 text-center font-mono">8541</td>
                  <td className="p-2.5 text-center">{Math.max(2, Math.round(capacity * 1000 / 540))} Nos</td>
                  <td className="p-2.5 text-right font-mono">{formatCurrency(modulesTaxable, false)}</td>
                  <td className="p-2.5 text-center">12%</td>
                  <td className="p-2.5 text-right font-mono">{formatCurrency(modulesGst, false)}</td>
                  <td className="p-2.5 text-right font-bold font-mono">{formatCurrency(modulesTaxable + modulesGst, false)}</td>
                </tr>

                {/* 2. Solar Inverter */}
                <tr className="hover:bg-slate-50">
                  <td className="p-2.5 font-bold">2</td>
                  <td className="p-2.5">
                    <p className="font-bold text-slate-900">Grid-Tied String Inverter with Smart IoT Monitoring</p>
                    <p className="text-[10px] text-slate-500">{brand} On-Grid Pure Sine-Wave Inverter with Built-in Wi-Fi & MPPT Tracking</p>
                  </td>
                  <td className="p-2.5 text-center font-mono">8504</td>
                  <td className="p-2.5 text-center">1 Set</td>
                  <td className="p-2.5 text-right font-mono">{formatCurrency(inverterTaxable, false)}</td>
                  <td className="p-2.5 text-center">12%</td>
                  <td className="p-2.5 text-right font-mono">{formatCurrency(inverterGst, false)}</td>
                  <td className="p-2.5 text-right font-bold font-mono">{formatCurrency(inverterTaxable + inverterGst, false)}</td>
                </tr>

                {/* 3. Balance of System (BOS) */}
                <tr className="hover:bg-slate-50">
                  <td className="p-2.5 font-bold">3</td>
                  <td className="p-2.5">
                    <p className="font-bold text-slate-900">Balance of System (BOS) & Structural Hardware</p>
                    <p className="text-[10px] text-slate-500">HDGI High-Wind Elevated Rooftop Structure, ACDB/DCDB with SPD, Copper Earthing Electrodes & Lightning Arrestor</p>
                  </td>
                  <td className="p-2.5 text-center font-mono">8537</td>
                  <td className="p-2.5 text-center">1 Lot</td>
                  <td className="p-2.5 text-right font-mono">{formatCurrency(bosTaxable, false)}</td>
                  <td className="p-2.5 text-center">18%</td>
                  <td className="p-2.5 text-right font-mono">{formatCurrency(bosGst, false)}</td>
                  <td className="p-2.5 text-right font-bold font-mono">{formatCurrency(bosTaxable + bosGst, false)}</td>
                </tr>

                {/* 4. Installation & Commissioning */}
                <tr className="hover:bg-slate-50">
                  <td className="p-2.5 font-bold">4</td>
                  <td className="p-2.5">
                    <p className="font-bold text-slate-900">Turnkey Rooftop EPC Installation & TANGEDCO Net-Meter Liaisoning</p>
                    <p className="text-[10px] text-slate-500">Civil grouting, AC/DC cabling, CEIG/TANGEDCO safety testing, bi-directional net-meter sync & commissioning</p>
                  </td>
                  <td className="p-2.5 text-center font-mono">995461</td>
                  <td className="p-2.5 text-center">1 Job</td>
                  <td className="p-2.5 text-right font-mono">{formatCurrency(installTaxable, false)}</td>
                  <td className="p-2.5 text-center">18%</td>
                  <td className="p-2.5 text-right font-mono">{formatCurrency(installGst, false)}</td>
                  <td className="p-2.5 text-right font-bold font-mono">{formatCurrency(installTaxable + installGst, false)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TOTALS & SUBSIDY / LOAN FINANCING RECONCILIATION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* TAX SPLIT-UP */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
              <h5 className="font-bold text-[11px] text-slate-700 uppercase tracking-wider mb-2">
                {t.taxSummaryHeading}
              </h5>
              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex justify-between py-0.5 border-b border-slate-200">
                  <span className="text-slate-600">Total Taxable Value:</span>
                  <span className="font-semibold">{formatCurrency(totalTaxable, false)}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-200">
                  <span className="text-slate-600">Central GST (CGST):</span>
                  <span className="font-semibold">{formatCurrency(totalCgst, false)}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-200">
                  <span className="text-slate-600">State GST (SGST):</span>
                  <span className="font-semibold">{formatCurrency(totalSgst, false)}</span>
                </div>
                <div className="flex justify-between py-1 font-bold text-slate-900 text-xs">
                  <span>Total GST Levied:</span>
                  <span className="text-amber-700">{formatCurrency(totalTax, false)}</span>
                </div>
              </div>
            </div>

            {/* FINANCIAL SETTLEMENT SUMMARY */}
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40">
              <h5 className="font-bold text-[11px] text-amber-900 uppercase tracking-wider mb-2">
                System Price & Financing Reconciliation
              </h5>
              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">{t.grossTotal}</span>
                  <span className="font-bold text-slate-900">{formatCurrency(solarCost, false)}</span>
                </div>

                {estimatedSubsidy > 0 && (
                  <div className="flex justify-between py-0.5 text-emerald-700">
                    <span>{t.pmSuryaGharSubsidy}</span>
                    <span className="font-bold">- {formatCurrency(estimatedSubsidy, false)}</span>
                  </div>
                )}

                <div className="flex justify-between py-1 border-t border-dashed border-amber-300 text-xs font-bold text-slate-900">
                  <span>{t.netCustomerPrice}</span>
                  <span>{formatCurrency(solarCost - estimatedSubsidy, false)}</span>
                </div>

                <div className="flex justify-between py-0.5 text-teal-700">
                  <span>{t.customerDownPaymentPaid}</span>
                  <span className="font-bold">{formatCurrency(downPayment, false)}</span>
                </div>

                <div className="flex justify-between py-1 border-t border-amber-300 font-bold text-slate-900 bg-amber-100/60 px-2 rounded">
                  <span className="text-amber-900">{t.balanceFinancedEpc}</span>
                  <span className="text-amber-900 text-xs">{formatCurrency(loanAmount, false)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* TERMS & CONDITIONS */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-[10px] text-slate-600 space-y-1">
            <h5 className="font-bold text-slate-800 uppercase tracking-wider">
              {t.termsAndConditionsHeading}
            </h5>
            <p>{t.invoiceTerm1}</p>
            <p>{t.invoiceTerm2}</p>
            <p>{t.invoiceTerm3}</p>
            <p>{t.invoiceTerm4}</p>
          </div>

          {/* SIGNATURES & DIGITAL COMPANY SEAL */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-6">
            
            {/* CUSTOMER ACCEPTANCE */}
            <div className="text-center space-y-8 min-w-[200px]">
              <div className="h-10" />
              <div className="border-t border-slate-400 pt-1">
                <p className="text-[11px] font-bold text-slate-800">{t.customerSignature}</p>
                <p className="text-[10px] text-slate-500">{customer.fullName}</p>
              </div>
            </div>

            {/* DIGITAL COMPANY SEAL BADGE */}
            <div className="flex flex-col items-center justify-center p-3 rounded-full border-2 border-dashed border-amber-600 bg-amber-50/50 w-36 h-36 text-center select-none shadow-sm print:border-amber-800">
              <Sun className="w-5 h-5 text-amber-600 mb-0.5" />
              <span className="text-[8px] font-black uppercase text-amber-900 tracking-tighter leading-tight">
                MRS SOLAR ASSOCIATES
              </span>
              <span className="text-[7px] font-bold text-emerald-700 uppercase my-0.5 bg-emerald-100 px-1 py-0.2 rounded-full border border-emerald-300">
                DIGITALLY VERIFIED
              </span>
              <span className="text-[7px] text-slate-600 uppercase font-mono">
                CIN/GST APPROVED
              </span>
              <span className="text-[6.5px] text-slate-400 font-mono mt-0.5">
                TN-EPC-2026
              </span>
            </div>

            {/* AUTHORIZED SIGNATORY */}
            <div className="text-center sm:text-right space-y-8 min-w-[200px]">
              <p className="font-semibold text-slate-800 text-[11px]">{t.forCompany}</p>
              <div className="border-t border-slate-400 pt-1">
                <p className="text-[11px] font-bold text-slate-800">{t.authorizedSignatorySeal}</p>
                <p className="text-[10px] text-slate-500">Managing Partner / Operations Head</p>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
