import React, { useState } from 'react';
import { 
  Award, CheckCircle2, Clock, Landmark, ExternalLink, 
  Copy, Check, Zap, Sun, ShieldCheck, FileText, ChevronRight
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/format.js';
import { getLanguage } from '../utils/translations.js';

export default function SubsidyTrackerCard({ customer }) {
  const [copiedAppNo, setCopiedAppNo] = useState(false);
  const lang = getLanguage();
  const isTa = lang === 'ta';

  if (!customer) return null;

  const capacity = Number(customer.solarCapacity) || 1;
  const eligibleAmount = capacity >= 3 ? 78000 : capacity >= 2 ? 60000 : 30000;
  const subsidy = customer.subsidyDetails || {};
  const currentStage = Number(subsidy.currentStage) || 3;
  const appNo = subsidy.applicationNumber || `PMSGY-TN-2026-${(customer.customerId || 'SOL').replace(/[^a-zA-Z0-9]/g, '')}`;

  const stages = [
    {
      id: 1,
      title: isTa ? 'விண்ணப்பம் & சாத்தியக்கூறு சமர்ப்பிப்பு' : 'Application & Feasibility Submitted',
      desc: isTa ? 'தேசிய சோலார் போர்ட்டலில் விண்ணப்பிக்கப்பட்டது' : 'Registered on National Solar Portal (pmsuryaghar.gov.in)',
      icon: FileText
    },
    {
      id: 2,
      title: isTa ? 'TANGEDCO தொழில்நுட்ப அனுமதி' : 'TANGEDCO Feasibility Sanctioned',
      desc: isTa ? 'மின்வாரிய பொறியாளர் கள ஆய்வு ஒப்புதல்' : 'Division grid feasibility approved for net-metering',
      icon: ShieldCheck
    },
    {
      id: 3,
      title: isTa ? 'சோலார் மேற்கூரை பொருத்துதல்' : 'Rooftop Solar Plant Commissioned',
      desc: isTa ? 'MRS SOLAR குழுமத்தால் பேனல்கள் நிறுவப்பட்டது' : 'Panels, Inverter & Earthing installed by MRS SOLAR',
      icon: Sun
    },
    {
      id: 4,
      title: isTa ? 'இருவழி நெட்-மீட்டர் ஆய்வு (JIR)' : 'Net-Meter Inspection & Sync (JIR)',
      desc: isTa ? 'TNEB அதிகாரிகளால் இருவழி மீட்டர் பொருத்துதல்' : 'Bidirectional net-meter synced & JIR uploaded to portal',
      icon: Zap
    },
    {
      id: 5,
      title: isTa ? 'மானியம் வங்கியில் வரவு (DBT)' : 'Central Subsidy Credited via DBT',
      desc: isTa ? 'ஆதார் இணைக்கப்பட்ட வங்கிக் கணக்கில் நேரடி வரவு' : 'CFA subsidy credited directly to your bank account',
      icon: Landmark
    }
  ];

  const stageDates = subsidy.stageDates || {};
  const progressPercent = Math.min(100, Math.round((currentStage / 5) * 100));

  const copyApplicationNumber = () => {
    navigator.clipboard?.writeText(appNo);
    setCopiedAppNo(true);
    setTimeout(() => setCopiedAppNo(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-amber-500/10 via-white to-orange-500/10 dark:from-amber-950/20 dark:via-slate-900 dark:to-orange-950/20 rounded-3xl p-5 sm:p-7 border-2 border-amber-300/80 dark:border-amber-700/60 shadow-xl shadow-amber-500/5 relative overflow-hidden">
      
      {/* BACKGROUND DECORATIVE GLOW */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-400/20 blur-3xl pointer-events-none"></div>

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-amber-200/80 dark:border-slate-800 pb-5">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/30 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {isTa ? 'PM சூர்யா கர்: மத்திய அரசு மானியக் கண்காணிப்பு' : 'PM Surya Ghar: Central Subsidy Tracker'}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Direct DBT</span>
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
              {isTa 
                ? 'முஃப்ட் பிஜ்லி யோஜனா (Muft Bijli Yojana) நேரடி மத்திய அரசு நிதியுதவி' 
                : 'National Rooftop Solar Scheme Direct Financial Assistance'}
            </p>
          </div>
        </div>

        {/* APPLICATION NUMBER CHIP */}
        <div className="flex items-center space-x-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-3.5 py-2 rounded-2xl border border-amber-300/80 dark:border-slate-700 shadow-sm">
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block leading-tight">
              {isTa ? 'போர்ட்டல் விண்ணப்ப எண்' : 'National Portal Ref'}
            </span>
            <span className="font-mono font-black text-xs text-amber-900 dark:text-amber-400">
              {appNo}
            </span>
          </div>
          <button
            type="button"
            onClick={copyApplicationNumber}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
            title="Copy Application Number"
          >
            {copiedAppNo ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* SUBSIDY FINANCIAL HIGHLIGHTS BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
        
        {/* ELIGIBLE SUBSIDY AMOUNT */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/60 dark:from-slate-800/60 dark:to-slate-800/40 border border-amber-200 dark:border-slate-700">
          <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-400 block">
            {isTa ? 'உரித்தான மத்திய அரசு மானியம்' : 'Eligible Central Subsidy'}
          </span>
          <div className="flex items-baseline space-x-2 mt-0.5">
            <span className="text-xl sm:text-2xl font-black text-amber-950 dark:text-amber-300 font-mono">
              {formatCurrency(eligibleAmount, false)}
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
              ({capacity} kWp PV)
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {isTa ? 'நேரடியாக வங்கிக் கணக்கில் வரவு' : '100% Direct Credit to Bank Account'}
          </p>
        </div>

        {/* CURRENT STATUS */}
        <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
            {isTa ? 'தற்போதைய நிலை' : 'Current Stage'}
          </span>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
              currentStage === 5 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'bg-amber-500 text-white shadow-sm'
            }`}>
              {currentStage === 5 
                ? (isTa ? 'முழுமை பெற்றது' : 'Disbursed') 
                : `${isTa ? 'நிலை' : 'Stage'} ${currentStage} of 5`}
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              {stages[currentStage - 1]?.title}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {currentStage === 5 
              ? (isTa ? 'மானியம் கணக்கில் சேர்க்கப்பட்டது' : 'Subsidy credited successfully') 
              : (isTa ? 'அடுத்த கட்ட ஆய்வு தொடர்கிறது' : 'Under active liaisoning with TANGEDCO')}
          </p>
        </div>

        {/* BANK DESTINATION */}
        <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
            {isTa ? 'வரவு சேரும் வங்கிக் கணக்கு' : 'Direct DBT Bank Account'}
          </span>
          <div className="flex items-center space-x-2 mt-1">
            <Landmark className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {customer.bankDetails?.bankName || 'Aadhaar-Linked Bank'}
            </span>
          </div>
          <p className="text-[10px] font-mono text-slate-500 mt-1">
            A/c: {customer.bankDetails?.accountNumber ? `•••• ${String(customer.bankDetails.accountNumber).slice(-4)}` : 'Aadhaar NPCI Map'}
          </p>
        </div>

      </div>

      {/* OVERALL PROGRESS BAR */}
      <div className="mb-6 space-y-1.5">
        <div className="flex justify-between items-center text-[11px] font-bold">
          <span className="text-slate-700 dark:text-slate-300">
            {isTa ? 'மானிய ஒப்புதல் முன்னேற்றம்' : 'Subsidy Approval Progress'}
          </span>
          <span className="text-amber-700 dark:text-amber-400 font-mono">
            {progressPercent}% Complete
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 rounded-full transition-all duration-1000 shadow-sm"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 5-STAGE INTERACTIVE STEPPER */}
      <div className="space-y-3">
        {stages.map((stg) => {
          const isCompleted = stg.id < currentStage || (stg.id === 5 && currentStage === 5);
          const isCurrent = stg.id === currentStage && currentStage !== 5;
          const isPending = stg.id > currentStage;
          const IconComponent = stg.icon;
          const stageDate = stageDates[stg.id] || (isCompleted ? customer.loanStartDate : null);

          return (
            <div 
              key={stg.id}
              className={`flex items-start space-x-3.5 p-3 rounded-2xl transition-all ${
                isCurrent 
                  ? 'bg-amber-100/70 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-600 shadow-md'
                  : isCompleted
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60'
                  : 'bg-white/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 opacity-60'
              }`}
            >
              {/* STAGE ICON BADGE */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                isCompleted 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : isCurrent
                  ? 'bg-amber-500 text-white animate-pulse shadow-md shadow-amber-500/30'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <span className="font-black text-xs">{stg.id}</span>
                )}
              </div>

              {/* STAGE TEXT */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className={`text-xs font-bold ${
                    isCurrent 
                      ? 'text-amber-950 dark:text-amber-200' 
                      : isCompleted
                      ? 'text-emerald-950 dark:text-emerald-200'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}>
                    {stg.title}
                  </h4>
                  
                  {/* DATE OR STATUS BADGE */}
                  {stageDate && isCompleted && (
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                      ✓ {formatDate(stageDate)}
                    </span>
                  )}
                  {isCurrent && (
                    <span className="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-white uppercase tracking-wider self-start sm:self-auto">
                      {isTa ? 'செயலில் உள்ளது' : 'In Progress'}
                    </span>
                  )}
                  {isPending && (
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                      {isTa ? 'நிலுவையில் உள்ளது' : 'Pending'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                  {stg.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER ACTION BUTTONS */}
      <div className="mt-5 pt-4 border-t border-amber-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 text-[11px]">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>
            {isTa ? 'கடைசியாக புதுப்பிக்கப்பட்டது:' : 'Status Last Verified:'}{' '}
            <strong className="text-slate-800 dark:text-slate-200 font-mono">
              {formatDate(subsidy.lastUpdated || new Date().toISOString())}
            </strong>
          </span>
        </div>

        <a
          href="https://pmsuryaghar.gov.in"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all hover:scale-[1.02] active:scale-95"
        >
          <span>{isTa ? 'தேசிய போர்ட்டலில் சரிபார்க்கவும்' : 'Track on National Portal'}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

    </div>
  );
}
