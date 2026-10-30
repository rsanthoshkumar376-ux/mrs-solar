import React, { useState, useEffect } from 'react';
import { 
  X, Printer, Download, Sun, Award, Zap, ShieldCheck, 
  MessageCircle, Phone, MapPin, CheckCircle2, IndianRupee, FileText, ArrowRight 
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/format.js';
import { getLanguage } from '../utils/translations.js';

export default function SolarQuotationModal({ isOpen, onClose, quoteData = {} }) {
  const lang = getLanguage();
  const isTa = lang === 'ta';

  if (!isOpen) return null;

  // Defaults & Calculated values
  const customerName = quoteData.customerName || quoteData.fullName || 'Valued Customer';
  const mobileNumber = quoteData.mobileNumber || '';
  const district = quoteData.district || 'Thiruvallur, Tamil Nadu';
  const roofType = quoteData.roofType || 'RCC Flat Concrete Roof';
  const capacityKw = Number(quoteData.systemCapacity || quoteData.solarCapacity) || 3;
  const tnebNumber = quoteData.tnebConsumerNumber || 'To be integrated';
  const tenureMonths = Number(quoteData.loanTenureMonths || quoteData.emiDuration) || 60;

  // Calculations
  const grossCost = capacityKw * 65000;
  const centralSubsidy = capacityKw >= 3 ? 78000 : capacityKw >= 2 ? 60000 : 30000;
  const netInvestment = Math.max(0, grossCost - centralSubsidy);

  // EMI at concessional rate 7% p.a.
  const r = 0.07 / 12;
  const emiNumerator = netInvestment * r * Math.pow(1 + r, tenureMonths);
  const emiDenominator = Math.pow(1 + r, tenureMonths) - 1;
  const monthlyEmi = emiDenominator > 0 ? Math.round(emiNumerator / emiDenominator) : 0;

  // Monthly generation & bill savings
  const monthlyUnits = Math.round(capacityKw * 4.4 * 30);
  const monthlySavings = Math.round(monthlyUnits * 6.5);
  const netPocketCashflow = Math.max(0, monthlySavings - monthlyEmi);
  const lifetime25YrSavings = Math.round(monthlySavings * 12 * 25 * 0.95);

  // Bill of materials
  const panelCount = Math.round((capacityKw * 1000) / 550);
  const quoteRefNo = `MRS/QUOT/2026/${Math.floor(1000 + Math.random() * 9000)}`;
  const quoteDate = formatDate(new Date().toISOString());

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `☀️ *MRS SOLAR — Official Solar Quotation & ROI Proposal*
━━━━━━━━━━━━━━━━━
👤 *Customer*: ${customerName}
📞 *Mobile*: ${mobileNumber}
📍 *Location*: ${district}
⚡ *Proposed System*: ${capacityKw} kWp On-Grid Battery-Free Solar

💰 *Commercial Investment Breakdown:*
• Gross Turnkey Project Cost: *${formatCurrency(grossCost, false)}*
• PM Surya Ghar Central Subsidy: *-₹${centralSubsidy.toLocaleString('en-IN')} (100% Direct DBT)*
• Net Investment: *${formatCurrency(netInvestment, false)}*
• Bank Loan EMI (${tenureMonths} Mo @ 7%): *${formatCurrency(monthlyEmi, false)} / month*

⚡ *Monthly Electricity Bill Savings:*
• Solar Generation: *~${monthlyUnits} Units / month*
• Monthly TNEB Bill Offset: *${formatCurrency(monthlySavings, false)}*
• Net Monthly Cashflow Gain: *+${formatCurrency(netPocketCashflow, false)} / month!*
• 25-Year Cumulative Savings: *₹${(lifetime25YrSavings / 100000).toFixed(1)} Lakhs+*

📋 *Turnkey Scope of Work:*
✓ ${panelCount} x 550W Tier-1 Mono PERC Bifacial DCR Solar PV Modules
✓ 1 x ${capacityKw} kW On-Grid String Inverter with Wi-Fi IoT Monitoring
✓ Hot-Dip Galvanized Elevated Structure (150 km/h wind resilience)
✓ TNEB Net Metering Approvals & PM Surya Ghar Subsidy Processing Support

Official Proposal Reference: *${quoteRefNo}*
Contact: MRS SOLAR | 📞 +91 97894 48979 / +91 80724 54996`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl shadow-2xl overflow-hidden my-6 print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        
        {/* NO-PRINT ACTION HEADER */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 print:hidden">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              {isTa ? 'அதிகாரப்பூர்வ சோலார் விலைப்பட்டியல் & திட்ட மதிப்பீடு' : 'Official Solar Proposal & Quotation'}
            </h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#00a884] hover:bg-[#009272] text-white text-xs font-bold transition-all shadow-sm"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isTa ? 'அச்சிடுக / PDF சேமி' : 'Print / Save PDF'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE QUOTATION SHEET CONTENT */}
        <div className="p-6 sm:p-10 text-slate-800 dark:text-slate-100 print:text-black print:p-8 space-y-6 bg-white dark:bg-slate-900 print:bg-white text-xs">
          
          {/* CORPORATE LETTERHEAD */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b-2 border-amber-500 gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md print:border print:border-black shrink-0">
                <Sun className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white print:text-black tracking-tight uppercase">
                  MRS SOLAR GREEN ENERGY
                </h1>
                <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 print:text-gray-700 uppercase tracking-wider">
                  Rooftop Solar EPC • TNEB Net Metering • PM Surya Ghar Channel Partner
                </p>
                <p className="text-[10px] text-slate-500 print:text-gray-600 mt-0.5">
                  74, Gandhi Road, MGM Nagar, Thiruvallur, Tamil Nadu – 602001
                </p>
                <p className="text-[10px] text-slate-500 print:text-gray-600">
                  📞 +91 97894 48979 / +91 80724 54996 | ✉️ mrssolarassociates@gmail.com
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right text-[11px] space-y-1 shrink-0 bg-slate-50 dark:bg-slate-800/60 print:bg-transparent p-3 rounded-xl border border-slate-200 dark:border-slate-700 print:border-none">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 print:text-black font-extrabold uppercase text-[10px] tracking-wider border border-amber-500/30">
                Turnkey Solar Proposal
              </span>
              <p className="font-mono font-black text-slate-900 dark:text-white print:text-black mt-1">
                Ref: {quoteRefNo}
              </p>
              <p className="text-slate-500 print:text-gray-600">Date: <strong>{quoteDate}</strong></p>
              <p className="text-slate-500 print:text-gray-600">Validity: <strong>30 Days</strong></p>
            </div>
          </div>

          {/* PROSPECT & SYSTEM METRICS SUMMARY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/60 print:bg-slate-50 border border-slate-200 dark:border-slate-800 print:border-slate-300">
              <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600 block mb-1">
                Client & Site Information
              </span>
              <h3 className="font-black text-sm text-slate-900 dark:text-white print:text-black">{customerName}</h3>
              <p className="text-slate-600 dark:text-slate-300 print:text-gray-800 mt-0.5">Mobile: <strong>{mobileNumber || 'Provided'}</strong></p>
              <p className="text-slate-600 dark:text-slate-300 print:text-gray-800">Site Location: <strong>{district}</strong></p>
              <p className="text-slate-600 dark:text-slate-300 print:text-gray-800">Rooftop Type: <strong>{roofType}</strong></p>
              <p className="text-slate-600 dark:text-slate-300 print:text-gray-800">TNEB Consumer No: <strong>{tnebNumber}</strong></p>
            </div>

            <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 print:bg-teal-50 border border-teal-200 dark:border-teal-800 print:border-teal-300">
              <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400 print:text-teal-800 block mb-1">
                Proposed Plant Capacity & Generation
              </span>
              <h3 className="font-black text-sm text-teal-900 dark:text-teal-200 print:text-teal-900 flex items-center space-x-1">
                <Sun className="w-4 h-4 text-amber-500" />
                <span>{capacityKw} kWp Grid-Tied Battery-Free System</span>
              </h3>
              <p className="text-slate-600 dark:text-slate-300 print:text-gray-800 mt-0.5">Daily Est. Generation: <strong>~{(capacityKw * 4.4).toFixed(1)} Units / day</strong></p>
              <p className="text-slate-600 dark:text-slate-300 print:text-gray-800">Monthly Est. Generation: <strong>~{monthlyUnits} Units / month</strong></p>
              <p className="text-slate-600 dark:text-slate-300 print:text-gray-800">Annual CO₂ Offset: <strong>~{Math.round(capacityKw * 4.4 * 365 * 0.82)} kg CO₂</strong></p>
              <p className="text-slate-600 dark:text-slate-300 print:text-gray-800">Rooftop Area Required: <strong>~{capacityKw * 100} sq.ft shadow-free</strong></p>
            </div>
          </div>

          {/* BILL OF MATERIALS & SPECIFICATIONS TABLE */}
          <div>
            <h4 className="font-black uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300 print:text-black mb-2 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Turnkey Bill of Materials (Tier-1 Quality Standard)</span>
            </h4>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 print:border-slate-300 rounded-2xl">
              <table className="w-full text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 text-slate-700 dark:text-slate-300 print:text-black font-extrabold text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Item / Component</th>
                    <th className="py-2.5 px-3">Technical Specification</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Warranty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 print:divide-slate-300 text-[11px]">
                  <tr>
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white print:text-black">Solar PV Modules</td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300 print:text-gray-800">Tier-1 DCR Mono-PERC Bifacial 550W High-Efficiency Modules (MNRE Approved)</td>
                    <td className="py-2 px-3 text-center font-mono font-bold">{panelCount} Nos</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-600">25 Years</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white print:text-black">On-Grid Inverter</td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300 print:text-gray-800">{capacityKw} kW High-Efficiency MPPT String Inverter with IP65 & Wi-Fi IoT Logger</td>
                    <td className="py-2 px-3 text-center font-mono font-bold">1 Unit</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-600">5-10 Years</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white print:text-black">Mounting Structure</td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300 print:text-gray-800">Hot-Dip Galvanized GI / Anodized Aluminum elevated structure (150 km/h wind certified)</td>
                    <td className="py-2 px-3 text-center font-mono font-bold">1 Set</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-600">30+ Years</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white print:text-black">AC/DC Safety DBs</td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300 print:text-gray-800">Dual SPD AC/DC Distribution Boxes, MCB, MC4 Connectors & Copper Solar Cables</td>
                    <td className="py-2 px-3 text-center font-mono font-bold">Turnkey</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-600">5 Years</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white print:text-black">Earthing & Protection</td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300 print:text-gray-800">3 Chemical Copper Earthing Pits (Inverter, DC, Lightning) + Class-1 Arrestor</td>
                    <td className="py-2 px-3 text-center font-mono font-bold">3 Pits</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-600">5 Years</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white print:text-black">Net Metering Liasoning</td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300 print:text-gray-800">Complete TANGEDCO application, safety inspection, net meter sync & subsidy DBT filing</td>
                    <td className="py-2 px-3 text-center font-mono font-bold">Turnkey</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-600">Guaranteed</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* FINANCIAL SUMMARY TABLE */}
          <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 print:bg-amber-50 border border-amber-300 dark:border-amber-700/60 print:border-amber-400">
            <h4 className="font-black uppercase tracking-wider text-[11px] text-amber-900 dark:text-amber-200 print:text-black mb-3">
              Commercial Quotation & PM Surya Ghar Subsidy Breakdown
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-amber-200/60 print:border-gray-300">
                <span className="text-slate-700 dark:text-slate-300 print:text-black font-semibold">1. Gross Turnkey Project Cost (Supply, Structural Civil, Cabling & TNEB Sync):</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white print:text-black">{formatCurrency(grossCost, false)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-amber-200/60 print:border-gray-300 text-emerald-700 dark:text-emerald-400 print:text-emerald-800 font-bold">
                <span>2. PM Surya Ghar Central Direct DBT Subsidy (Directly Credited to Customer Bank):</span>
                <span className="font-mono">- {formatCurrency(centralSubsidy, false)}</span>
              </div>
              <div className="flex justify-between py-2 border-b-2 border-amber-400 print:border-black font-black text-sm text-slate-900 dark:text-white print:text-black">
                <span>3. Net Customer Investment (After Central Government Subsidy):</span>
                <span className="font-mono text-base text-amber-600 dark:text-amber-400 print:text-black">{formatCurrency(netInvestment, false)}</span>
              </div>
            </div>

            {/* LOAN OPTIONS BANNER */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 pt-3 border-t border-amber-200 print:border-gray-300 text-center">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 print:bg-white border border-amber-200 print:border-gray-300">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">36-Month Bank Loan</span>
                <span className="font-black text-xs text-slate-900 dark:text-white font-mono mt-0.5 block">
                  ~{formatCurrency(Math.round(netInvestment * 0.0308), false)} / mo
                </span>
                <span className="text-[9px] text-slate-400">SBI / Canara @ ~7%</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 print:bg-white border border-amber-200 print:border-gray-300">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">60-Month Bank Loan</span>
                <span className="font-black text-xs text-teal-600 dark:text-teal-400 font-mono mt-0.5 block">
                  ~{formatCurrency(Math.round(netInvestment * 0.0198), false)} / mo
                </span>
                <span className="text-[9px] text-teal-600 font-bold">Most Popular</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 print:bg-white border border-amber-200 print:border-gray-300">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">120-Month (10-Yr Loan)</span>
                <span className="font-black text-xs text-indigo-600 dark:text-indigo-400 font-mono mt-0.5 block">
                  ~{formatCurrency(Math.round(netInvestment * 0.0116), false)} / mo
                </span>
                <span className="text-[9px] text-slate-400">Lowest Monthly EMI</span>
              </div>
            </div>
          </div>

          {/* RETURN ON INVESTMENT HIGHLIGHT */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 print:bg-emerald-50 border border-emerald-300 print:border-emerald-400 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-black text-emerald-900 dark:text-emerald-300 print:text-emerald-900 block uppercase tracking-wide">
                Guaranteed Positive Cashflow from Day 1
              </span>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-200 print:text-emerald-950 mt-0.5">
                Your estimated monthly electricity bill savings (<strong>{formatCurrency(monthlySavings, false)}</strong>) exceed your bank loan EMI, saving you money from Month 1 while creating <strong>₹{(lifetime25YrSavings / 100000).toFixed(1)} Lakhs+</strong> in lifetime 25-year wealth!
              </p>
            </div>
            <div className="shrink-0 text-center sm:text-right font-black font-mono text-emerald-700 dark:text-emerald-400 print:text-emerald-900 text-lg">
              +{formatCurrency(netPocketCashflow, false)} / mo
            </div>
          </div>

          {/* SIGNATURE & LEGAL DISCLAIMER */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 print:border-gray-400 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 text-[10px] text-slate-500 print:text-gray-600">
            <div className="space-y-1 max-w-md">
              <p className="font-bold text-slate-700 dark:text-slate-300 print:text-black">Terms & Payment Schedule:</p>
              <p>1. 10% advance upon site feasibility survey & structural drawing approval.</p>
              <p>2. 70% against delivery of solar modules and inverter to site (or bank loan disbursement).</p>
              <p>3. 20% upon mechanical completion & TANGEDCO net meter synchronisation.</p>
              <p>4. Central government PM Surya Ghar subsidy will be directly credited via DBT to your Aadhaar-seeded bank account post net-metering commissioning.</p>
            </div>

            <div className="text-center sm:text-right space-y-1">
              <div className="inline-block p-2 border border-slate-300 dark:border-slate-700 print:border-black rounded-lg mb-1">
                <span className="font-black font-serif uppercase tracking-widest text-slate-800 dark:text-white print:text-black text-[11px] block">
                  MRS SOLAR GREEN ENERGY
                </span>
                <span className="text-[9px] text-teal-600 dark:text-teal-400 print:text-black font-mono block">
                  AUTHORIZED SIGNATORY
                </span>
              </div>
              <p className="font-semibold text-slate-700 dark:text-slate-300 print:text-black">Mr. Santhoshkumar R (Founder / EPC Lead)</p>
              <p className="text-[9px]">Government Certified Solar Energy Professional</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
