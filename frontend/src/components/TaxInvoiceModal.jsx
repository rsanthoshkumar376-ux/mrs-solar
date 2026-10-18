import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '../utils/format.js';
import { Printer, Download, X, Sun, CheckCircle, ShieldCheck, Building2, Zap, FileText, Receipt } from 'lucide-react';
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
        <div className="p-6 sm:p-10 space-y-6 text-slate-900 bg-white print:text-black print:bg-white print:p-0 text-xs">
          
          {/* LETTERHEAD */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-amber-500 pb-5 gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-14 h-14 bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20 print:border print:border-amber-700">
                <Sun className="w-9 h-9 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 print:text-black">
                    MRS <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600 print:text-amber-600">SOLAR</span> ASSOCIATES
                  </h1>
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm border border-amber-600">
                    TAX INVOICE
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-700 print:text-slate-800">
                  Solar Rooftop EPC, Clean Energy Systems & Asset Financing
                </p>
                <p className="text-[11px] text-slate-600 font-medium">
                  Head Office: No. 12, Main Road, Tirunelveli, Tamil Nadu - 627001 | Phone: +91 80724 54996
                </p>
                <div className="flex flex-wrap gap-x-4 text-[11px] font-mono text-slate-800 mt-1.5 bg-slate-100/90 px-3 py-1 rounded-lg border border-slate-200">
                  <span><strong className="text-amber-900">{t.gstinLabel}</strong> <span className="font-bold text-slate-950">33AAACM1234F1Z5</span></span>
                  <span><strong className="text-slate-700">{t.stateCodeLabel}</strong> <span className="font-bold text-slate-950">33 (Tamil Nadu)</span></span>
                  <span><strong className="text-slate-700">PAN:</strong> <span className="font-bold text-slate-950">AAACM1234F</span></span>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right space-y-1 bg-gradient-to-br from-amber-50 via-orange-50/50 to-amber-100/40 print:bg-white p-3.5 rounded-2xl border-2 border-amber-300 print:border-slate-300 min-w-[220px] shadow-sm">
              <div className="inline-block px-2.5 py-1 bg-amber-600 text-white font-mono font-black text-sm rounded-lg shadow-sm">
                {invoiceNumber}
              </div>
              <p className="text-slate-800 text-[11px]">
                <strong className="text-amber-950">{t.invoiceDate}</strong> <span className="font-semibold text-slate-950">{invoiceDate}</span>
              </p>
              <p className="text-slate-800 text-[11px]">
                <strong className="text-amber-950">{t.placeOfSupply}</strong> <span className="font-semibold text-slate-950">Tamil Nadu (33)</span>
              </p>
              <p className="text-slate-800 text-[11px]">
                <strong className="text-amber-950">{t.reverseCharge}</strong> <span className="font-semibold text-slate-950">No</span>
              </p>
            </div>
          </div>

          {/* BILLED TO (CUSTOMER DETAILS) & SOLAR PROJECT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card 1: Customer Details */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/90 via-sky-50/40 to-slate-50 border-2 border-blue-200 shadow-sm space-y-2">
              <h4 className="font-extrabold text-blue-900 uppercase tracking-wider text-[11px] border-b border-blue-200 pb-1.5 flex items-center space-x-1.5">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>{t.billTo}</span>
              </h4>
              <p className="font-black text-sm text-blue-950">
                {customer.fullName} {customer.fatherName ? <span className="text-xs font-semibold text-slate-600">(S/O {customer.fatherName})</span> : ''}
              </p>
              <div className="text-[11px] text-slate-800 space-y-1">
                <p><strong className="text-blue-950">{t.addressLabel}</strong> <span className="font-medium text-slate-900">{customer.installationAddress || customer.address || '—'}</span></p>
                <p><strong className="text-blue-950">District / State:</strong> <span className="font-medium text-slate-900">{customer.district || 'Tamil Nadu'}, PIN: {customer.pinCode || '602001'}</span></p>
                <p className="pt-0.5">
                  <strong className="text-blue-950">{t.mobileLabel}</strong>{' '}
                  <span className="font-bold text-blue-950 bg-blue-100/90 px-2 py-0.5 rounded border border-blue-300 font-mono">
                    {customer.mobileNumber} {customer.alternateNumber ? ` / ${customer.alternateNumber}` : ''}
                  </span>
                </p>
              </div>
            </div>

            {/* Card 2: Solar Project & Utility Link */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-yellow-50/40 border-2 border-amber-200 shadow-sm space-y-2">
              <h4 className="font-extrabold text-amber-900 uppercase tracking-wider text-[11px] border-b border-amber-200 pb-1.5 flex items-center space-x-1.5">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>Solar Project & Utility Link</span>
              </h4>
              <div className="text-[11px] text-slate-800 space-y-1.5">
                <p className="flex items-center justify-between">
                  <strong className="text-amber-950">{t.customerId}:</strong>
                  <span className="font-mono font-bold text-amber-950 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-md text-xs">
                    {customer.customerId}
                  </span>
                </p>
                <p className="flex items-center justify-between">
                  <strong className="text-amber-950">{t.tnebConsumerNumberLabel}</strong>
                  <span className="font-mono font-black text-slate-950 bg-white border border-amber-300 px-2.5 py-0.5 rounded-md text-xs shadow-xs">
                    {customer.tnebConsumerNumber || customer.electricityConsumerNumber || '—'}
                  </span>
                </p>
                <p className="flex items-center justify-between">
                  <strong className="text-amber-950">{t.aadhaarLabel}</strong>
                  <span className="font-mono font-semibold text-slate-900">
                    {customer.aadhaarNumber ? (customer.aadhaarNumber.includes('XXXX') ? customer.aadhaarNumber : `XXXX-XXXX-${String(customer.aadhaarNumber).slice(-4)}`) : '—'}
                  </span>
                </p>
                <p className="flex items-center justify-between">
                  <strong className="text-amber-950">Solar Capacity:</strong>
                  <span className="font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-md text-xs">
                    {capacity} kWp Grid-Tied PV System ({brand})
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* LINE ITEMS TABLE */}
          <div className="overflow-x-auto rounded-2xl border-2 border-slate-300 shadow-sm">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white font-bold border-b-2 border-amber-500">
                  <th className="p-3 w-8 text-center text-white">#</th>
                  <th className="p-3 text-white">{t.itemDescription}</th>
                  <th className="p-3 text-center text-amber-300">{t.hsnSac}</th>
                  <th className="p-3 text-center text-white">{t.qty}</th>
                  <th className="p-3 text-right text-white">{t.unitRate}</th>
                  <th className="p-3 text-center text-amber-300">{t.taxRate}</th>
                  <th className="p-3 text-right text-white">{t.taxAmount}</th>
                  <th className="p-3 text-right text-amber-300">{t.totalItemAmount}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* 1. Solar PV Modules */}
                <tr className="bg-white hover:bg-amber-50/30 transition-colors">
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-black text-[10px] border border-amber-300">1</span>
                  </td>
                  <td className="p-3">
                    <p className="font-bold text-slate-950 text-xs">High-Efficiency Solar Photovoltaic Modules</p>
                    <p className="text-[10px] text-slate-600 font-medium">Tier-1 Mono-PERC / TopCon Half-Cut Modules ({capacity} kWp Capacity, 25-Year Linear Warranty)</p>
                  </td>
                  <td className="p-3 text-center font-mono">
                    <span className="bg-indigo-50 border border-indigo-200 text-indigo-900 font-mono font-bold px-2 py-0.5 rounded text-[10px]">8541</span>
                  </td>
                  <td className="p-3 text-center font-bold text-slate-900">{Math.max(2, Math.round(capacity * 1000 / 540))} Nos</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">{formatCurrency(modulesTaxable, false)}</td>
                  <td className="p-3 text-center">
                    <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-300 text-[10px]">12%</span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-800">{formatCurrency(modulesGst, false)}</td>
                  <td className="p-3 text-right font-bold font-mono text-slate-950 text-xs bg-slate-50/80">{formatCurrency(modulesTaxable + modulesGst, false)}</td>
                </tr>

                {/* 2. Solar Inverter */}
                <tr className="bg-slate-50/60 hover:bg-amber-50/30 transition-colors">
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-black text-[10px] border border-amber-300">2</span>
                  </td>
                  <td className="p-3">
                    <p className="font-bold text-slate-950 text-xs">Grid-Tied String Inverter with Smart IoT Monitoring</p>
                    <p className="text-[10px] text-slate-600 font-medium">{brand} On-Grid Pure Sine-Wave Inverter with Built-in Wi-Fi & MPPT Tracking</p>
                  </td>
                  <td className="p-3 text-center font-mono">
                    <span className="bg-indigo-50 border border-indigo-200 text-indigo-900 font-mono font-bold px-2 py-0.5 rounded text-[10px]">8504</span>
                  </td>
                  <td className="p-3 text-center font-bold text-slate-900">1 Set</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">{formatCurrency(inverterTaxable, false)}</td>
                  <td className="p-3 text-center">
                    <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-300 text-[10px]">12%</span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-800">{formatCurrency(inverterGst, false)}</td>
                  <td className="p-3 text-right font-bold font-mono text-slate-950 text-xs bg-slate-50/80">{formatCurrency(inverterTaxable + inverterGst, false)}</td>
                </tr>

                {/* 3. Balance of System (BOS) */}
                <tr className="bg-white hover:bg-amber-50/30 transition-colors">
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-black text-[10px] border border-amber-300">3</span>
                  </td>
                  <td className="p-3">
                    <p className="font-bold text-slate-950 text-xs">Balance of System (BOS) & Structural Hardware</p>
                    <p className="text-[10px] text-slate-600 font-medium">HDGI High-Wind Elevated Rooftop Structure, ACDB/DCDB with SPD, Copper Earthing Electrodes & Lightning Arrestor</p>
                  </td>
                  <td className="p-3 text-center font-mono">
                    <span className="bg-indigo-50 border border-indigo-200 text-indigo-900 font-mono font-bold px-2 py-0.5 rounded text-[10px]">8537</span>
                  </td>
                  <td className="p-3 text-center font-bold text-slate-900">1 Lot</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">{formatCurrency(bosTaxable, false)}</td>
                  <td className="p-3 text-center">
                    <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-300 text-[10px]">18%</span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-800">{formatCurrency(bosGst, false)}</td>
                  <td className="p-3 text-right font-bold font-mono text-slate-950 text-xs bg-slate-50/80">{formatCurrency(bosTaxable + bosGst, false)}</td>
                </tr>

                {/* 4. Installation & Commissioning */}
                <tr className="bg-slate-50/60 hover:bg-amber-50/30 transition-colors">
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-black text-[10px] border border-amber-300">4</span>
                  </td>
                  <td className="p-3">
                    <p className="font-bold text-slate-950 text-xs">Turnkey Rooftop EPC Installation & TANGEDCO Net-Meter Liaisoning</p>
                    <p className="text-[10px] text-slate-600 font-medium">Civil grouting, AC/DC cabling, CEIG/TANGEDCO safety testing, bi-directional net-meter sync & commissioning</p>
                  </td>
                  <td className="p-3 text-center font-mono">
                    <span className="bg-indigo-50 border border-indigo-200 text-indigo-900 font-mono font-bold px-2 py-0.5 rounded text-[10px]">995461</span>
                  </td>
                  <td className="p-3 text-center font-bold text-slate-900">1 Job</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">{formatCurrency(installTaxable, false)}</td>
                  <td className="p-3 text-center">
                    <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-300 text-[10px]">18%</span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-800">{formatCurrency(installGst, false)}</td>
                  <td className="p-3 text-right font-bold font-mono text-slate-950 text-xs bg-slate-50/80">{formatCurrency(installTaxable + installGst, false)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TOTALS & SUBSIDY / LOAN FINANCING RECONCILIATION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* TAX SPLIT-UP */}
            <div className="p-4 rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-slate-50 to-blue-50/50 shadow-sm">
              <h5 className="font-extrabold text-[11px] text-indigo-950 uppercase tracking-wider mb-2.5 flex items-center space-x-1.5 border-b border-indigo-200 pb-1.5">
                <Receipt className="w-3.5 h-3.5 text-indigo-700" />
                <span>{t.taxSummaryHeading}</span>
              </h5>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between py-1 border-b border-indigo-100">
                  <span className="text-slate-700 font-medium">Total Taxable Value:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(totalTaxable, false)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-indigo-100">
                  <span className="text-slate-700 font-medium">Central GST (CGST):</span>
                  <span className="font-bold text-slate-900">{formatCurrency(totalCgst, false)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-indigo-100">
                  <span className="text-slate-700 font-medium">State GST (SGST):</span>
                  <span className="font-bold text-slate-900">{formatCurrency(totalSgst, false)}</span>
                </div>
                <div className="flex justify-between items-center py-2 px-3 mt-1 font-bold text-white bg-indigo-700 rounded-xl shadow-sm text-xs">
                  <span>Total GST Levied:</span>
                  <span className="text-amber-300 font-mono text-sm font-black">{formatCurrency(totalTax, false)}</span>
                </div>
              </div>
            </div>

            {/* FINANCIAL SETTLEMENT SUMMARY */}
            <div className="p-4 rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50/40 to-yellow-50/40 shadow-sm">
              <h5 className="font-extrabold text-[11px] text-amber-950 uppercase tracking-wider mb-2.5 flex items-center space-x-1.5 border-b border-amber-200 pb-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>System Price & Financing Reconciliation</span>
              </h5>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between py-1 border-b border-amber-200/60">
                  <span className="text-slate-800 font-medium">{t.grossTotal}</span>
                  <span className="font-bold text-slate-950 text-sm">{formatCurrency(solarCost, false)}</span>
                </div>

                {estimatedSubsidy > 0 && (
                  <div className="flex justify-between py-1 items-center px-2 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-950 font-bold">
                    <span>{t.pmSuryaGharSubsidy}</span>
                    <span className="font-black text-emerald-800">- {formatCurrency(estimatedSubsidy, false)}</span>
                  </div>
                )}

                <div className="flex justify-between py-1 text-xs font-bold text-slate-900 border-t border-dashed border-amber-300">
                  <span>{t.netCustomerPrice}</span>
                  <span className="text-slate-950 font-black">{formatCurrency(solarCost - estimatedSubsidy, false)}</span>
                </div>

                <div className="flex justify-between py-1 items-center px-2 rounded-lg bg-teal-100/90 border border-teal-300 text-teal-950 font-bold">
                  <span>{t.customerDownPaymentPaid}</span>
                  <span className="font-black text-teal-900">{formatCurrency(downPayment, false)}</span>
                </div>

                <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black shadow-md mt-1">
                  <span>{t.balanceFinancedEpc}</span>
                  <span className="text-sm font-mono text-yellow-200">{formatCurrency(loanAmount, false)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* TERMS & CONDITIONS */}
          <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50 text-[10px] text-slate-700 space-y-1 shadow-xs">
            <h5 className="font-extrabold text-slate-900 uppercase tracking-wider">
              {t.termsAndConditionsHeading}
            </h5>
            <p className="font-medium text-slate-700">{t.invoiceTerm1}</p>
            <p className="font-medium text-slate-700">{t.invoiceTerm2}</p>
            <p className="font-medium text-slate-700">{t.invoiceTerm3}</p>
            <p className="font-medium text-slate-700">{t.invoiceTerm4}</p>
          </div>

          {/* SIGNATURES & DIGITAL COMPANY SEAL */}
          <div className="pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-6">
            
            {/* CUSTOMER ACCEPTANCE */}
            <div className="text-center space-y-8 min-w-[200px]">
              <div className="h-8" />
              <div className="border-t-2 border-slate-400 pt-1.5">
                <p className="text-[11px] font-bold text-slate-900">{t.customerSignature}</p>
                <p className="text-[10px] text-slate-600 font-medium">{customer.fullName}</p>
              </div>
            </div>

            {/* DIGITAL COMPANY SEAL BADGE */}
            <div className="flex flex-col items-center justify-center p-3 rounded-full border-2 border-dashed border-amber-600 bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 w-36 h-36 text-center select-none shadow-md print:border-amber-800">
              <Sun className="w-5 h-5 text-amber-700 mb-0.5" />
              <span className="text-[8px] font-black uppercase text-amber-950 tracking-tighter leading-tight">
                MRS SOLAR ASSOCIATES
              </span>
              <span className="text-[7px] font-bold text-emerald-800 uppercase my-0.5 bg-emerald-200/80 px-1.5 py-0.5 rounded-full border border-emerald-400">
                DIGITALLY VERIFIED
              </span>
              <span className="text-[7px] text-slate-800 uppercase font-mono font-bold">
                CIN/GST APPROVED
              </span>
              <span className="text-[6.5px] text-slate-600 font-mono mt-0.5 font-semibold">
                TN-EPC-2026
              </span>
            </div>

            {/* AUTHORIZED SIGNATORY */}
            <div className="text-center sm:text-right space-y-8 min-w-[200px]">
              <p className="font-bold text-slate-900 text-[11px]">{t.forCompany}</p>
              <div className="border-t-2 border-slate-400 pt-1.5">
                <p className="text-[11px] font-bold text-slate-900">{t.authorizedSignatorySeal}</p>
                <p className="text-[10px] text-slate-600 font-medium">Managing Partner / Operations Head</p>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
