import React, { useState, useEffect } from 'react';
import { 
  Sun, Gift, ShieldCheck, Zap, Award, CheckCircle2, 
  ArrowRight, MessageCircle, Phone, Calculator, X, Sparkles,
  Check, Copy, ChevronRight, HelpCircle, Layers, Play, ExternalLink
} from 'lucide-react';
import { OWNER_PAYMENT_PHONE } from '../utils/whatsapp.js';

export default function NewCustomerReferralModal({ isOpen, onClose, initialCode = '', onOpenCalculator }) {
  const [selectedKw, setSelectedKw] = useState(3);
  const [copiedCode, setCopiedCode] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem('appLanguage') || 'en');

  const isTa = lang === 'ta';

  // Available Solar Capacity Packages
  const packages = [
    {
      kw: 1,
      label: '1 kW Compact',
      subsidy: 30000,
      dailyUnits: '4 - 5 Units/day',
      monthlyUnits: '120 - 150 Units/mo',
      monthlySavings: '₹800 - ₹1,200',
      roofArea: '100 sq.ft',
      emiFrom: '₹999/mo',
      idealFor: isTa ? '1-2 BHK வீடு (விசிறி, விளக்கு, டிவி)' : '1-2 BHK Home (Fans, Lights, TV, Fridge)'
    },
    {
      kw: 2,
      label: '2 kW Standard',
      subsidy: 60000,
      dailyUnits: '8 - 10 Units/day',
      monthlyUnits: '240 - 300 Units/mo',
      monthlySavings: '₹1,800 - ₹2,500',
      roofArea: '200 sq.ft',
      emiFrom: '₹1,599/mo',
      idealFor: isTa ? '2-3 BHK வீடு (1 குளிர்சாதன பெட்டி, 1 வாஷிங் மெஷின்)' : '2-3 BHK Home (1 AC, Washing Machine, Fridge)'
    },
    {
      kw: 3,
      popular: true,
      label: '3 kW Most Popular',
      subsidy: 78000,
      dailyUnits: '12 - 15 Units/day',
      monthlyUnits: '360 - 450 Units/mo',
      monthlySavings: '₹3,200 - ₹4,500',
      roofArea: '300 sq.ft',
      emiFrom: '₹2,199/mo',
      idealFor: isTa ? 'முழுமையான குடும்ப வீடு (2 ஏசி, வாட்டர் ஹீட்டர், 100% இலவச மின்சாரம்)' : 'Full Family Home (2 ACs, Geyser, 100% Free Power & Max Subsidy)'
    },
    {
      kw: 5,
      label: '5 kW Premium',
      subsidy: 78000,
      dailyUnits: '20 - 25 Units/day',
      monthlyUnits: '600 - 750 Units/mo',
      monthlySavings: '₹5,500 - ₹8,000',
      roofArea: '500 sq.ft',
      emiFrom: '₹3,899/mo',
      idealFor: isTa ? 'பெரிய வில்லா அல்லது வணிக அலுவலகம்' : 'Large Villa, Independent House or Small Office'
    },
    {
      kw: 10,
      label: '10 kW Commercial',
      subsidy: 78000,
      dailyUnits: '40 - 50 Units/day',
      monthlyUnits: '1,200 - 1,500 Units/mo',
      monthlySavings: '₹11,000 - ₹16,000',
      roofArea: '1,000 sq.ft',
      emiFrom: '₹7,999/mo',
      idealFor: isTa ? 'தொழிற்சாலைகள், திருமண மண்டபங்கள் & வணிக வளாகங்கள்' : 'Commercial Workshops, Marriage Halls, Hospitals'
    }
  ];

  const currentPkg = packages.find(p => p.kw === selectedKw) || packages[2];

  const referralCode = initialCode || 'MRS-GUEST';

  const handleCopyCode = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(referralCode).catch(() => {});
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleBookSurveyWhatsApp = () => {
    const text = isTa
      ? `வணக்கம் MRS SOLAR! எனக்கு ஒரு வாடிக்கையாளர் பரிந்துரைக் குறியீடு கொடுத்துள்ளார்:
👉 பரிந்துரைக் குறியீடு: *${referralCode}*

எனது வீட்டில் *${currentPkg.kw} kW* கூரை சோலார் அமைக்க விரும்புகிறேன் (மத்திய அரசு மானியம் ₹${currentPkg.subsidy.toLocaleString('en-IN')}).
இலவச கூரை சோலார் ஆய்வுக்கு (Free Roof Survey) முன்பதிவு செய்ய உதவவும்.`
      : `Hello MRS SOLAR! I was referred by a customer with:
👉 Referral Code: *${referralCode}*

I am interested in installing a *${currentPkg.kw} kW* Rooftop Solar System (with PM Surya Ghar Subsidy of ₹${currentPkg.subsidy.toLocaleString('en-IN')}).
Please help me book a Free Rooftop Solar Survey & Consultation for my property.`;

    const cleanPhone = OWNER_PAYMENT_PHONE.replace(/[^0-9]/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] overflow-y-auto p-3 sm:p-4 flex items-center justify-center bg-slate-950/85 backdrop-blur-md animate-fade-in no-print"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-teal-500/30 rounded-3xl shadow-2xl relative overflow-hidden my-auto max-h-[94vh] flex flex-col text-white"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="relative z-10 px-6 py-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
              <Sun className="w-5 h-5 text-white animate-spin" style={{ animationDuration: '30s' }} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-950/60 border border-teal-800/80 px-2.5 py-0.5 rounded-full">
                  {isTa ? 'புதிய வாடிக்கையாளர் வழிகாட்டி' : 'New Customer Welcome'}
                </span>
                {initialCode && (
                  <span className="text-[10px] font-bold text-purple-300 bg-purple-950/60 border border-purple-800/80 px-2 py-0.5 rounded-full">
                    {initialCode}
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-base sm:text-lg text-white mt-0.5">
                {isTa ? 'MRS சோலார் புதிய வாடிக்கையாளர் சலுகைகள்' : 'MRS Solar Referral & Benefits Showcase'}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-teal-400 border border-slate-700 transition-colors"
            >
              {lang === 'en' ? 'தமிழ்' : 'English'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="relative z-10 p-5 sm:p-7 overflow-y-auto space-y-6 flex-1 text-slate-200">
          
          {/* 1. WELCOME REFERRAL HERO BANNER */}
          <div className="rounded-2xl p-5 bg-gradient-to-br from-indigo-950/80 via-purple-950/60 to-slate-900 border border-purple-500/30 relative overflow-hidden shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-purple-300">
                    {isTa ? 'வாடிக்கையாளர் பரிந்துரை அழைப்பு' : 'Special Customer Referral Invitation'}
                  </span>
                </div>
                <h4 className="text-lg sm:text-xl font-black text-white">
                  {isTa ? 'உங்கள் கூரையை மின் உற்பத்தி நிலையமாக மாற்றுங்கள்' : 'Turn Your Rooftop into a Free Power Station'}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed max-w-lg">
                  {isTa
                    ? 'மத்திய அரசின் PM சூர்யா கர் திட்டத்தின் கீழ் ₹78,000 வரை நேரடி மானியம், 100 TNEB இலவச அலகுகள் மற்றும் ஜீரோ முன்பண கடன் வசதி!'
                    : 'Get up to ₹78,000 Direct Central Subsidy under PM Surya Ghar Yojana, zero electricity bills, and 100% bank financing with easy EMIs.'}
                </p>
              </div>

              {/* Referral Code Badge */}
              <div className="bg-slate-900/90 border border-purple-400/40 rounded-xl p-3 text-center sm:text-right shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  {isTa ? 'பரிந்துரைக் குறியீடு' : 'REFERRAL CODE'}
                </span>
                <div className="flex items-center justify-center sm:justify-end space-x-2 mt-0.5">
                  <span className="font-mono font-black text-purple-300 text-sm sm:text-base">{referralCode}</span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    title="Copy Code"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. THE 4 BIG BENEFITS FOR NEW USERS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-1">
                <Award className="w-4 h-4" />
              </div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">{isTa ? 'மத்திய அரசு மானியம்' : 'Central Subsidy'}</p>
              <p className="text-base font-black text-amber-300">₹78,000</p>
              <p className="text-[10px] text-slate-400">{isTa ? 'நேரடி வங்கி வரவு' : 'Direct to Bank (DBT)'}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-1">
                <Zap className="w-4 h-4" />
              </div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">{isTa ? 'மின் கட்டண சேமிப்பு' : 'EB Bill Savings'}</p>
              <p className="text-base font-black text-emerald-400">~90% - 100%</p>
              <p className="text-[10px] text-slate-400">{isTa ? '100 இலவச யூனிட்' : '+ 100 Free Units'}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto mb-1">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">{isTa ? 'சோலார் பேனல் உத்தரவாதம்' : 'Panel Warranty'}</p>
              <p className="text-base font-black text-teal-300">25 Years</p>
              <p className="text-[10px] text-slate-400">Tier-1 Mono PERC</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-1">
                <Layers className="w-4 h-4" />
              </div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">{isTa ? 'வங்கி கடன் தவணை' : 'Bank Solar EMI'}</p>
              <p className="text-base font-black text-indigo-300">₹999/mo</p>
              <p className="text-[10px] text-slate-400">{isTa ? '0 முன்பணம்' : '0-Down Payment'}</p>
            </div>
          </div>

          {/* 3. VIDEO SHOWCASE SECTION */}
          <div className="rounded-2xl p-4 sm:p-5 bg-slate-950/80 border border-teal-500/30 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400">
                  <Play className="w-4 h-4 fill-current" />
                </div>
                <h4 className="font-extrabold text-sm sm:text-base text-white">
                  {isTa ? 'வீடியோ: கூரை சோலார் அமைப்பது எப்படி?' : 'Watch: How Rooftop Solar Works for You'}
                </h4>
              </div>
              <span className="text-[10px] text-teal-300 font-bold bg-teal-950/60 border border-teal-800/80 px-2.5 py-0.5 rounded-full">
                HD Video
              </span>
            </div>

            {/* Responsive 16:9 Video Player */}
            <div className="rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl relative aspect-video flex items-center justify-center">
              <video
                controls
                playsInline
                preload="metadata"
                className="w-full h-full object-cover"
              >
                <source src="/solar-video.mp4" type="video/mp4" />
                Your browser does not support HTML5 video.
              </video>
            </div>
            <p className="text-[11px] text-slate-400 text-center">
              {isTa ? 'முழுத்திரையில் பார்க்க வீடியோவின் கீழ் வலது மூலையில் உள்ள ஐகானை அழுத்தவும்' : 'Click the full-screen icon at the bottom right of the player to watch full screen'}
            </p>
          </div>

          {/* 4. INTERACTIVE SYSTEM PACKAGES (1kW to 10kW) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sun className="w-4 h-4 text-teal-400" />
                <h4 className="font-extrabold text-sm sm:text-base text-white">
                  {isTa ? 'சோலார் அமைப்பு திட்டங்கள் & மானியம்' : 'Explore Solar System Packages & Subsidies'}
                </h4>
              </div>
              <span className="text-[11px] text-teal-400 font-bold">
                {isTa ? 'தேர்ந்தெடுக்க கிளிக் செய்யவும்:' : 'Select Capacity:'}
              </span>
            </div>

            {/* Capacity Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
              {packages.map(p => (
                <button
                  key={p.kw}
                  type="button"
                  onClick={() => setSelectedKw(p.kw)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                    selectedKw === p.kw
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 scale-[1.02]'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                  }`}
                >
                  <span>{p.kw} kW</span>
                  {p.popular && (
                    <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                      ★ Best
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Selected Package Card Details */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-teal-500/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                    {currentPkg.label}
                  </span>
                  <h5 className="text-xl font-black text-white mt-0.5">{currentPkg.kw} kW Rooftop System</h5>
                  <p className="text-xs text-slate-400 mt-0.5">{currentPkg.idealFor}</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 text-center sm:text-right">
                  <p className="text-[10px] uppercase font-bold text-amber-300">{isTa ? 'மத்திய அரசு மானியம்' : 'Direct Subsidy'}</p>
                  <p className="text-xl font-black text-amber-400">₹{currentPkg.subsidy.toLocaleString('en-IN')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">{isTa ? 'தினசரி மின் உற்பத்தி' : 'Daily Output'}</span>
                  <p className="font-bold text-slate-100 mt-0.5">{currentPkg.dailyUnits}</p>
                </div>
                <div>
                  <span className="text-slate-400">{isTa ? 'மாதாந்திர உற்பத்தி' : 'Monthly Output'}</span>
                  <p className="font-bold text-slate-100 mt-0.5">{currentPkg.monthlyUnits}</p>
                </div>
                <div>
                  <span className="text-slate-400">{isTa ? 'மாதாந்திர சேமிப்பு' : 'Monthly EB Savings'}</span>
                  <p className="font-bold text-emerald-400 mt-0.5">{currentPkg.monthlySavings}/mo</p>
                </div>
                <div>
                  <span className="text-slate-400">{isTa ? 'தேவையான கூரை பரப்பு' : 'Roof Area Needed'}</span>
                  <p className="font-bold text-slate-100 mt-0.5">{currentPkg.roofArea}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. TURNKEY STEP-BY-STEP PROCESS */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              {isTa ? 'எப்படி தொடங்குவது? (5 எளிய படிகள்):' : 'How It Works (5 Easy Steps):'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono font-bold text-teal-400">01</span>
                <p className="font-bold text-white">{isTa ? 'இலவச ஆய்வு' : 'Roof Survey'}</p>
                <p className="text-[10px] text-slate-400">{isTa ? 'நிழல் & கூரை வலிமை' : 'Free Shadow analysis'}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono font-bold text-teal-400">02</span>
                <p className="font-bold text-white">{isTa ? 'அரசு பதிவு' : 'Govt Portal'}</p>
                <p className="text-[10px] text-slate-400">{isTa ? 'PM சூர்யா கர் ஒப்புதல்' : 'Feasibility approval'}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono font-bold text-teal-400">03</span>
                <p className="font-bold text-white">{isTa ? 'சோலார் நிறுவல்' : 'Installation'}</p>
                <p className="text-[10px] text-slate-400">{isTa ? '48 மணி நேரத்தில்' : 'Within 48 hours'}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono font-bold text-teal-400">04</span>
                <p className="font-bold text-white">{isTa ? 'TNEB மீட்டர்' : 'Net Meter'}</p>
                <p className="text-[10px] text-slate-400">{isTa ? 'இருவழி மின் மீட்டர்' : 'Bi-directional meter'}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-1">
                <span className="text-[10px] font-mono font-bold text-emerald-400">05</span>
                <p className="font-bold text-emerald-300">{isTa ? 'மானியம் வரவு' : 'Subsidy DBT'}</p>
                <p className="text-[10px] text-slate-400">{isTa ? '₹78,000 வங்கியில்' : '₹78,000 into Bank'}</p>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="relative z-10 p-4 sm:p-6 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <a
              href={`/referral?ref=${referralCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-xs font-bold text-purple-200 hover:text-white flex items-center justify-center space-x-1.5 transition-all shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5 text-pink-400" />
              <span>{isTa ? 'பரிந்துரை இணையதளம்' : 'Open Referral Site'}</span>
            </a>

            {onOpenCalculator && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCalculator();
                }}
                className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center space-x-1.5 transition-colors border border-slate-700"
              >
                <Calculator className="w-3.5 h-3.5 text-amber-400" />
                <span>{isTa ? 'சேமிப்பு கணக்கிடு' : 'Solar Calculator'}</span>
              </button>
            )}

            <a
              href="tel:+918072454996"
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-teal-400 hover:text-white flex items-center justify-center space-x-1.5 transition-colors border border-slate-700"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{isTa ? 'அழைக்க' : 'Call'}</span>
            </a>
          </div>

          <button
            type="button"
            onClick={handleBookSurveyWhatsApp}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#00a884] hover:bg-[#009272] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-xl shadow-emerald-950/40 transition-all hover:scale-[1.02] active:scale-95"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>
              {isTa ? 'இலவச கூரை ஆய்வுக்கு பதிவு செய்யவும் (WhatsApp)' : 'Book Free Roof Survey on WhatsApp'}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
}
