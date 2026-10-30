import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Sun, Gift, ShieldCheck, Zap, Award, CheckCircle2, 
  ArrowRight, MessageCircle, Phone, Calculator, Sparkles,
  Check, Copy, ChevronDown, ChevronUp, Layers, Play,
  FileText, Home, DollarSign, Trees, Leaf, HelpCircle,
  ExternalLink, User, MapPin, IndianRupee, ArrowDown,
  Lock, Percent, CheckSquare, Clock, AlertCircle, Share2
} from 'lucide-react';
import api from '../utils/api.js';
import { formatCurrency } from '../utils/format.js';
import { OWNER_PAYMENT_PHONE } from '../utils/whatsapp.js';
import { translations, getLanguage, setLanguage } from '../utils/translations.js';

export default function ReferralPortal() {
  const navigate = useNavigate();
  const location = useLocation();

  // Language state (en / ta)
  const [lang, setLang] = useState(() => getLanguage() || 'en');
  const isTa = lang === 'ta';

  // Referral code extraction from URL query parameter
  const [referralCode, setReferralCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('ref') || params.get('code') || params.get('referral') || '';
  });
  const [copiedRefLink, setCopiedRefLink] = useState(false);

  // EMI Calculator State
  const [monthlyEbBill, setMonthlyEbBill] = useState(2500);
  const [selectedKw, setSelectedKw] = useState(3);
  const [loanTenureMonths, setLoanTenureMonths] = useState(36); // 36 or 60 months
  const [calcMode, setCalcMode] = useState('bill'); // 'bill' | 'kw'

  // FAQ accordion active item
  const [activeFaq, setActiveFaq] = useState(null);

  // Lead Booking Form State
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [district, setDistrict] = useState('Thiruvallur');
  const [roofType, setRoofType] = useState('RCC Concrete');
  const [customNotes, setCustomNotes] = useState('');
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [leadError, setLeadError] = useState('');

  // Switch language helper
  const handleToggleLanguage = () => {
    const next = lang === 'en' ? 'ta' : 'en';
    setLanguage(next);
    setLang(next);
  };

  // Smooth scroll to an element by ID
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Copy referral landing page link
  const handleCopyLandingLink = () => {
    const url = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopiedRefLink(true);
    setTimeout(() => setCopiedRefLink(false), 2200);
  };

  // Calculations for Solar Sizing & Financial Model
  // Average EB tariff slab in TN ~ ₹6.50/kWh
  const calculatedKw = Math.max(1, Math.min(10, Math.round((monthlyEbBill / 6.5) / 120)));
  const activeKw = calcMode === 'bill' ? calculatedKw : selectedKw;

  // Central Subsidy PM Surya Ghar
  const centralSubsidy = activeKw >= 3 ? 78000 : activeKw >= 2 ? 60000 : 30000;

  // Turnkey project cost estimate (approx ₹65,000 - ₹70,000 per kW in TN)
  const grossCost = activeKw * 65000;
  const netInvestment = Math.max(0, grossCost - centralSubsidy);

  // Monthly EMI Calculation (estimated ~7% to 8% reducing balance solar financing)
  const monthlyInterestRate = 0.075 / 12;
  const emiNumerator = netInvestment * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, loanTenureMonths);
  const emiDenominator = Math.pow(1 + monthlyInterestRate, loanTenureMonths) - 1;
  const estimatedMonthlyEmi = netInvestment > 0 ? Math.round(emiNumerator / emiDenominator) : 0;

  // Expected solar generation
  const dailyGenUnits = (activeKw * 4.4).toFixed(1);
  const monthlyGenUnits = Math.round(activeKw * 4.4 * 30);
  const annualGenUnits = Math.round(activeKw * 4.4 * 365);

  // TNEB Bill savings calculation
  const monthlySavings = Math.round(monthlyGenUnits * 6.5);
  const netMonthlyPocketGain = Math.max(0, monthlySavings - estimatedMonthlyEmi);
  const lifetime25YearSavings = Math.round(monthlySavings * 12 * 25 * 0.95);

  // Environmental impact
  const annualCo2Kg = Math.round(annualGenUnits * 0.82);
  const treesEquiv = Math.round(annualCo2Kg / 22);

  // Handle Lead Form Submission
  const handleSubmitLead = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !mobileNumber.trim()) {
      setLeadError(isTa ? 'தயவுசெய்து உங்கள் பெயர் மற்றும் வாட்ஸ்அப் எண்ணை உள்ளிடவும்.' : 'Please enter your Full Name and Mobile Number.');
      return;
    }

    setSubmittingLead(true);
    setLeadError('');

    try {
      await api.post('/leads', {
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        district,
        roofType,
        monthlyEbBill,
        systemCapacity: activeKw,
        estimatedSubsidy: centralSubsidy,
        loanTenureMonths,
        referralCode: referralCode || 'DIRECT_PORTAL',
        notes: customNotes || `Referred Lead from Referral Portal (${referralCode || 'Direct'})`
      });

      setLeadSuccess(true);
      setTimeout(() => {
        setLeadSuccess(false);
        setFullName('');
        setMobileNumber('');
        setCustomNotes('');
      }, 5000);
    } catch (err) {
      console.error('Lead error:', err);
      setLeadError(err.response?.data?.message || 'Failed to submit inquiry. Please try again.');
    } finally {
      setSubmittingLead(false);
    }
  };

  // Launch WhatsApp direct conversation with MRS SOLAR
  const handleOpenWhatsAppConsultation = () => {
    const text = isTa
      ? `வணக்கம் MRS SOLAR! நான் உங்கள் சோலார் பரிந்துரை தளம் (Referral Portal) மூலம் தொடர்பு கொள்கிறேன்.
${referralCode ? `👉 பரிந்துரைக் குறியீடு: *${referralCode}*\n` : ''}
எனது வீட்டிற்கு *${activeKw} kW* கூரை சோலார் அமைத்து மத்திய அரசு மானியம் *₹${centralSubsidy.toLocaleString('en-IN')}* பெற விரும்புகிறேன்.
இலவச கூரை ஆய்வு (Free Roof Survey) மற்றும் கடன் ஒப்புதல் பெற உதவவும்.`
      : `Hello MRS SOLAR! I am visiting your official Referral & New Customer Portal.
${referralCode ? `👉 Referral Code: *${referralCode}*\n` : ''}
I am interested in installing a *${activeKw} kW* Rooftop Solar System with PM Surya Ghar Central Subsidy of *₹${centralSubsidy.toLocaleString('en-IN')}*.
Please help me schedule a Free Rooftop Site Survey and Loan Consultation.`;

    const cleanPhone = OWNER_PAYMENT_PHONE.replace(/[^0-9]/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Packages list (1 kW to 10 kW)
  const packagesList = [
    {
      kw: 1,
      label: '1 kW Compact',
      subsidy: 30000,
      dailyUnits: '4 - 5 Units/day',
      monthlyUnits: '120 - 150 Units/mo',
      monthlySavings: '₹800 - ₹1,200',
      roofArea: '100 sq.ft',
      emiFrom: '₹999/mo',
      appliances: isTa ? 'விசிறி, விளக்குகள், டிவி, 1 குளிர்சாதன பெட்டி' : 'Fans, LED Lights, TV, Fridge'
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
      appliances: isTa ? '1 குளிர்சாதன பெட்டி, 1 ஏசி (பகல்), வாஷிங் மெஷின்' : '1 Inverter AC (Day), Fridge, Washing Machine'
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
      appliances: isTa ? '2 ஏசி, வாட்டர் ஹீட்டர், 100% இலவச மின்சாரம் & உச்சக்கட்ட மானியம்' : '2 ACs, Water Heater, Fridge, 100% Free Power & Max Subsidy'
    },
    {
      kw: 5,
      label: '5 kW Premium Villa',
      subsidy: 78000,
      dailyUnits: '20 - 25 Units/day',
      monthlyUnits: '600 - 750 Units/mo',
      monthlySavings: '₹5,500 - ₹8,000',
      roofArea: '500 sq.ft',
      emiFrom: '₹3,899/mo',
      appliances: isTa ? 'பெரிய வில்லா, 3-4 ஏசி, தண்ணீர் மோட்டார் & அலுவலகம்' : '3-4 ACs, Heavy Water Pump, Multiple Floors, Large Home'
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
      appliances: isTa ? 'தொழிற்சாலைகள், திருமண மண்டபங்கள் & வணிக வளாகங்கள்' : 'Commercial Workshops, Marriage Halls, Clinics, Schools'
    }
  ];

  // FAQs list
  const faqs = [
    {
      qEn: 'What is a Battery-Free On-Grid Rooftop Solar System?',
      qTa: 'பேட்டரி இல்லாத ஆன்-கிரிட் சோலார் என்றால் என்ன?',
      aEn: 'In an on-grid system, the solar panels generate direct current (DC) that is converted by a string inverter into alternating current (AC) to power your home loads directly. Any surplus electricity not consumed by your home flows automatically into the TANGEDCO grid through a bi-directional net meter. At night, you seamlessly draw power from the grid. Because there are no chemical batteries to maintain or replace every 3-5 years, you save over ₹80,000 in battery replacement costs!',
      aTa: 'ஆன்-கிரிட் அமைப்பில் சோலார் பேனல்கள் உற்பத்தி செய்யும் மின்சாரம் உங்கள் வீட்டு உபயோகத்திற்கு நேரடியாகப் பயன்படுகிறது. மீதமுள்ள உபரி மின்சாரம் தானாகவே TNEB கிரிட்டுக்கு இருவழி நெட்-மீட்டர் மூலம் ஏற்றுமதி செய்யப்படுகிறது. இரவில் கிரிட் மூலம் மின்சாரம் பெறப்படும். 3-5 ஆண்டுகளுக்கு ஒருமுறை மாற்ற வேண்டிய விலை உயர்ந்த பேட்டரிகள் இதில் இல்லாததால் ₹80,000+ பராமரிப்பு செலவு முற்றிலும் மிச்சமாகிறது!'
    },
    {
      qEn: 'What happens during a TNEB power cut / grid outage?',
      qTa: 'TNEB மின்வெட்டு (Power Cut) ஏற்படும்போது என்ன நடக்கும்?',
      aEn: 'As mandated by the Central Electricity Authority (CEA) and TNERC electrical safety standards, all grid-tied on-grid inverters have an automatic "Anti-Islanding" safety mechanism. When the grid loses power, the inverter temporarily shuts down to prevent electricity from back-feeding into external power lines, ensuring the safety of TNEB linesmen repairing the poles.',
      aTa: 'மத்திய மின்சார ஆணையத்தின் (CEA) பாதுகாப்பு விதிகளின்படி, TNEB மின்கம்பங்களில் வேலை செய்யும் ஊழியர்களின் பாதுகாப்பிற்காக (Anti-Islanding Safety), மின்கட்டமைப்பில் மின்வெட்டு ஏற்படும்போது ஆன்-கிரிட் இன்வெர்ட்டர் தானாகவே பாதுகாப்பாக நின்றுவிடும்.'
    },
    {
      qEn: 'How does Net Metering work with Tamil Nadu 100 Free Units?',
      qTa: 'தமிழ்நாட்டின் 100 இலவச யூனிட்களுடன் நெட்-மீட்டர் எவ்வாறு கணக்கிடப்படுகிறது?',
      aEn: 'Under TNERC LT-1A domestic billing rules, you are billed only on Net Units (Grid Import minus Solar Export). Tamil Nadu’s 100 Free Units domestic subsidy is applied directly to this Net figure. If your Net Units are 100 or less, your bi-monthly electricity bill is ₹0.00! Any surplus exported units roll over to subsequent billing cycles.',
      aTa: 'தமிழ்நாடு மின்சார ஒழுங்குமுறை ஆணையத்தின்படி (TNERC LT-1A), உங்கள் இருமாத பில்லில் நீங்கள் பயன்படுத்திய மின்சாரத்தில் இருந்து சோலார் ஏற்றுமதி கழிக்கப்பட்டு (Import - Export), வரும் நிகர அலகுகளுக்கு தமிழக அரசின் 100 இலவச யூனிட்களும் கழிக்கப்படும். இதனால் கரண்ட் பில் கிட்டத்தட்ட ₹0 ஆக குறைகிறது!'
    },
    {
      qEn: 'When and how will I receive the ₹78,000 Central Government Subsidy?',
      qTa: 'மத்திய அரசின் ₹78,000 மானியம் எப்போது, எப்படி எனது வங்கிக் கணக்கிற்கு வரும்?',
      aEn: 'After installation, TANGEDCO engineers inspect the plant and install the bi-directional net meter. MRS SOLAR uploads the Joint Inspection Report (JIR) on the National PM Surya Ghar Portal. The Ministry of New and Renewable Energy (MNRE) credits the subsidy directly (DBT) into your Aadhaar-seeded bank account within 30 days of commissioning.',
      aTa: 'நிறுவல் முடிந்ததும் TANGEDCO அலுவலர்கள் ஆய்வு செய்து இருவழி நெட்-மீட்டரை பொருத்துவார்கள். MRS SOLAR குழுவினர் ஆய்வு அறிக்கையை தேசிய போர்ட்டலில் பதிவேற்றம் செய்வார்கள். அதன் பிறகு 30 நாட்களுக்குள் உங்கள் ஆதாருடன் இணைக்கப்பட்ட வங்கிக் கணக்கிற்கு ₹78,000 மானியம் நேரடியாக வரவு வைக்கப்படும்.'
    },
    {
      qEn: 'Can I get bank financing with zero downpayment?',
      qTa: 'முன்பணம் இல்லாமல் (Zero Downpayment) வங்கி கடன் பெற முடியுமா?',
      aEn: 'Yes! Nationalized banks (SBI, Canara Bank, Indian Bank, PNB) offer dedicated PM Surya Ghar residential solar loans at low interest rates (around 7% p.a.) with zero collateral, zero downpayment, and flexible repayment tenures from 12 months up to 10 years (120 months) for up to 10 kW. The monthly EMI is often lower than your current electricity bill savings!',
      aTa: 'நிச்சயமாக! பாரத ஸ்டேட் வங்கி (SBI), கனரா வங்கி, இந்தியன் வங்கி போன்ற முன்னணி வங்கிகள் PM சூர்யா கர் திட்டத்தின் கீழ் குறைந்த வட்டியில் (~7%), பிணை சொத்து ஏதுமின்றி (Zero Collateral) 10 ஆண்டுகள் வரை (12 முதல் 120 மாதங்கள்) தவணை வசதியுடன் கடன் வழங்குகின்றன. நீங்கள் செலுத்தும் மாத EMI உங்கள் மின் கட்டண சேமிப்பை விட குறைவாகவே இருக்கும்!'
    },
    {
      qEn: 'What is the lifespan and warranty of the equipment?',
      qTa: 'சோலார் உபகரணங்களின் ஆயுட்காலம் மற்றும் உத்தரவாதம் என்ன?',
      aEn: 'The Tier-1 Mono-PERC / TopCon DCR Solar PV Modules come with a 25-Year Linear Manufacturer Performance Warranty (guaranteeing at least 80% output at Year 25). The On-Grid String Inverter comes with a 5 to 10-Year replacement warranty with built-in Wi-Fi IoT monitoring. The hot-dip galvanized mounting structures have a 30+ year lifespan against rust.',
      aTa: 'சோலார் பேனல்களுக்கு உற்பத்தியாளரின் 25 ஆண்டு கால செயல்முறை உத்தரவாதம் (25-Year Linear Performance Warranty) வழங்கப்படுகிறது. ஆன்-கிரிட் இன்வெர்ட்டருக்கு 5 முதல் 10 ஆண்டு மாற்று உத்தரவாதம் மற்றும் Wi-Fi நேரலை கண்காணிப்பு வசதி உண்டு. ஜி.ஐ இரும்பு சட்டங்கள் துருப்பிடிக்காமல் 30 ஆண்டுகளுக்கும் மேல் உழைக்கும்.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-white relative overflow-x-hidden">
      
      {/* ============================================================== */}
      {/* 1. TOP ANNOUNCEMENT & REFERRAL STATUS TICKER                   */}
      {/* ============================================================== */}
      <div className="bg-gradient-to-r from-teal-700 via-indigo-900 to-purple-950 text-white text-[11px] sm:text-xs py-2 px-4 shadow-md border-b border-teal-500/30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-4">
          <div className="flex items-center space-x-2 text-center sm:text-left">
            <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse shrink-0 hidden sm:inline" />
            <span>
              {isTa 
                ? '☀️ PM சூர்யா கர் தேசிய திட்டம்: ₹78,000 நேரடி மத்திய மானியம் + 100% பேட்டரி இல்லாத ஆன்-கிரிட் சோலார்'
                : '☀️ PM Surya Ghar Muft Bijli Yojana: Up to ₹78,000 Direct Central Subsidy + Zero-Downpayment Loan'}
            </span>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {referralCode ? (
              <div className="flex items-center space-x-1.5 bg-yellow-400/20 border border-yellow-300/40 text-yellow-200 px-2.5 py-0.5 rounded-full font-bold">
                <Gift className="w-3.5 h-3.5 text-yellow-300" />
                <span>{isTa ? `பரிந்துரை: ${referralCode}` : `Referred by: ${referralCode}`}</span>
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleToggleLanguage}
              className="text-[11px] font-bold text-teal-200 hover:text-white underline transition-colors"
            >
              {isTa ? 'English Version' : 'தமிழ் பதிப்பு'}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. STICKY NAVBAR                                               */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-teal-400 p-0.5 shadow-lg shadow-teal-500/25 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Sun className="w-5 h-5 text-yellow-400 animate-spin" style={{ animationDuration: '30s' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-black text-lg text-white tracking-wider">MRS <span className="text-teal-400">SOLAR</span></span>
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30">
                  Referral Portal
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Tamil Nadu Rooftop EPC & PM Surya Ghar Partner</p>
            </div>
          </div>

          {/* Quick Nav Anchors (Desktop) */}
          <nav className="hidden lg:flex items-center space-x-6 text-xs font-bold text-slate-300">
            <button onClick={() => scrollToSection('requirements')} className="hover:text-teal-400 transition-colors">
              {isTa ? 'தேவையானவை (Checklist)' : 'What You Need'}
            </button>
            <button onClick={() => scrollToSection('calculator')} className="hover:text-teal-400 transition-colors">
              {isTa ? 'EMI & சேமிப்பு கால்குலேட்டர்' : 'EMI & Savings Calc'}
            </button>
            <button onClick={() => scrollToSection('packages')} className="hover:text-teal-400 transition-colors">
              {isTa ? 'திட்டங்கள் (1-10kW)' : 'Solar Packages'}
            </button>
            <button onClick={() => scrollToSection('installation-steps')} className="hover:text-teal-400 transition-colors">
              {isTa ? '5 எளிய படிகள்' : '5-Step Process'}
            </button>
            <button onClick={() => scrollToSection('video-showcase')} className="hover:text-teal-400 transition-colors">
              {isTa ? 'வீடியோ' : 'Video Showcase'}
            </button>
            <button onClick={() => scrollToSection('faqs')} className="hover:text-teal-400 transition-colors">
              FAQ
            </button>
          </nav>

          {/* Action Buttons: Customer Login & Book Survey */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="px-3 sm:px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center space-x-1.5"
            >
              <User className="w-3.5 h-3.5 text-teal-400" />
              <span>{isTa ? 'உள்நுழைவு' : 'Login'}</span>
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('booking-form')}
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white text-xs font-black rounded-xl shadow-lg shadow-teal-500/25 transition-all flex items-center space-x-1.5 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>{isTa ? 'இலவச ஆய்வு பதிவு' : 'Book Free Survey'}</span>
            </button>
          </div>

        </div>
      </header>

      {/* ============================================================== */}
      {/* 3. HERO SECTION WITH REFERRAL WELCOME                          */}
      {/* ============================================================== */}
      <section className="relative pt-10 sm:pt-16 pb-16 sm:pb-24 px-4 sm:px-6 overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 sm:w-[600px] h-96 sm:h-[600px] bg-gradient-to-br from-teal-600/15 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          
          {/* Referral Badge */}
          {referralCode ? (
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-900/60 to-indigo-900/60 border border-purple-400/50 text-purple-200 px-4 py-1.5 rounded-full text-xs font-extrabold shadow-lg shadow-purple-950/40 animate-fade-in">
              <Gift className="w-4 h-4 text-pink-400 animate-bounce" />
              <span>
                {isTa 
                  ? `வாழ்த்துகள்! நீங்கள் பரிந்துரைக் குறியீடு [${referralCode}] மூலம் அழைக்கப்பட்டுள்ளீர்கள்!`
                  : `Exclusive Invitation! You were referred with code: ${referralCode}`}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-2 bg-teal-950/60 border border-teal-500/40 text-teal-300 px-4 py-1.5 rounded-full text-xs font-extrabold shadow-lg">
              <Award className="w-4 h-4 text-teal-400" />
              <span>{isTa ? 'அங்கீகரிக்கப்பட்ட PM சூர்யா கர் கூரை சோலார் நிறுவல் சேவை' : 'Official PM Surya Ghar Rooftop Solar EPC Partner'}</span>
            </div>
          )}

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto">
            {isTa ? (
              <>
                உங்கள் கூரையை <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 bg-clip-text text-transparent">இலவச மின்சார நிலையமாக</span> மாற்றுங்கள்!
              </>
            ) : (
              <>
                Transform Your Rooftop into a <span className="bg-gradient-to-r from-teal-400 via-emerald-300 to-yellow-300 bg-clip-text text-transparent">Zero-Cost Power Plant</span>.
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {isTa
              ? 'மத்திய அரசின் ₹78,000 நேரடி வங்கி மானியம், 100% பேட்டரி இல்லாத ஆன்-கிரிட் நெட்-மீட்டரிங் மற்றும் குறைந்த EMI மூலம் உங்கள் TNEB மின்கட்டணத்தை ₹0 ஆக்குங்கள்.'
              : 'Claim up to ₹78,000 Direct Central Subsidy under PM Surya Ghar. 100% Battery-free on-grid system with zero battery maintenance, 1:1 net metering, and 0-downpayment bank loans.'}
          </p>

          {/* Key Metric Highlights Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto pt-4 text-left">
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Central Subsidy</span>
              <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">₹78,000</p>
              <span className="text-[10px] text-slate-400">Direct Bank Credit (DBT)</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">EB Bill Reduction</span>
              <p className="text-xl sm:text-2xl font-black text-yellow-400 mt-0.5">Up to 100%</p>
              <span className="text-[10px] text-slate-400">100 Free Units + Net Meter</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly EMI</span>
              <p className="text-xl sm:text-2xl font-black text-teal-400 mt-0.5">From ₹999</p>
              <span className="text-[10px] text-slate-400">Zero Downpayment Loans</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Warranty</span>
              <p className="text-xl sm:text-2xl font-black text-indigo-400 mt-0.5">25 Years</p>
              <span className="text-[10px] text-slate-400">Tier-1 DCR PV Modules</span>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-4">
            <button
              type="button"
              onClick={() => scrollToSection('calculator')}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-black text-sm shadow-xl shadow-teal-500/25 flex items-center space-x-2 transition-all hover:scale-105 active:scale-95"
            >
              <Calculator className="w-4 h-4 text-yellow-300" />
              <span>{isTa ? 'EMI & சேமிப்பு கணக்கீடு செய்' : 'Calculate Your Monthly EMI'}</span>
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('requirements')}
              className="px-6 py-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 shadow-lg flex items-center space-x-2 transition-all"
            >
              <CheckSquare className="w-4 h-4 text-teal-400" />
              <span>{isTa ? 'தேவையான ஆவணங்கள் (Checklist)' : 'What You Need to Apply'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsAppConsultation}
              className="px-5 py-3.5 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold text-sm border border-emerald-500/40 flex items-center space-x-2 transition-all"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp Chat</span>
            </button>
          </div>

        </div>
      </section>

      {/* ============================================================== */}
      {/* 4. REAL SOLAR INSTALLATION VIDEO SHOWCASE                      */}
      {/* ============================================================== */}
      <section id="video-showcase" className="py-12 px-4 sm:px-6 bg-slate-900/60 border-y border-slate-800/80">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-950/80 border border-teal-800 px-3 py-1 rounded-full">
              Real Installation Video
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              {isTa ? 'நேரடி கூரை சோலார் நிறுவல் & நெட்-மீட்டர் செயல்முறை' : 'Watch Real MRS SOLAR Installation in Action'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              {isTa
                ? 'தமிழ்நாட்டில் நிறுவப்பட்ட ஆன்-கிரிட் சோலார் பேனல்கள், இன்வெர்ட்டர் மற்றும் TNEB இருவழி நெட்-மீட்டர் நேரலை காட்சியைப் பாருங்கள்.'
                : 'See how our engineers install Tier-1 solar panels, string inverters, and coordinate with TANGEDCO for seamless net-metering.'}
            </p>
          </div>

          <div className="rounded-3xl overflow-hidden border border-slate-700 shadow-2xl bg-black relative aspect-video flex items-center justify-center">
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

          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 bg-slate-800/50 p-4 rounded-2xl border border-slate-700 gap-2">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>100% MNRE Approved DCR Solar Modules & TANGEDCO Empaneled Installation</span>
            </div>
            <a 
              href="https://drive.google.com/file/d/1M6Alo9HbaIfD93t7RwWT_OXPcJCwtuRN/view?usp=drive_link" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-teal-400 hover:text-teal-300 underline font-semibold flex items-center space-x-1"
            >
              <span>Watch on Google Drive</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 5. WHAT A NEW USER REQUIRES (MASTER REQUIREMENTS CHECKLIST)     */}
      {/* ============================================================== */}
      <section id="requirements" className="py-16 sm:py-24 px-4 sm:px-6 relative">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-950/60 border border-amber-800 px-3 py-1 rounded-full">
              Eligibility & Prerequisites
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              {isTa ? 'புதிய வாடிக்கையாளருக்கு தேவையானவை என்ன?' : 'What Does a New Customer Require?'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {isTa
                ? 'PM சூர்யா கர் மானியம் மற்றும் வங்கி கடன் பெற தேவையான 4 முக்கிய தகுதிகள் & ஆவணங்கள்:'
                : 'Everything you need to qualify for up to ₹78,000 Central Subsidy and instant 0-downpayment bank financing.'}
            </p>
          </div>

          {/* 4 Pillars of Requirements */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* 1. Electricity Connection */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-teal-500/40 transition-all shadow-xl flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-lg text-white">
                  {isTa ? '1. TNEB மின் இணைப்பு' : '1. TNEB Connection'}
                </h3>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <span>Active <strong>TANGEDCO Domestic (LT-1A)</strong> connection.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <span><strong>10 to 12-digit Consumer Service Number</strong> (found on your EB bill / card).</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <span>Average bi-monthly electricity bill of <strong>₹1,000 or more</strong> for maximum ROI.</span>
                  </li>
                </ul>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-800/80 text-[11px] text-teal-400 font-semibold">
                ✓ Sanctioned load capacity matching plant kW
              </div>
            </div>

            {/* 2. Rooftop Area */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all shadow-xl flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Home className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-lg text-white">
                  {isTa ? '2. நிழலற்ற கூரை இடம்' : '2. Shadow-Free Roof'}
                </h3>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>100 sq.ft per 1 kW</strong> (e.g., ~300 sq.ft for standard 3 kW system).</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>Unshaded rooftop</strong> receiving at least 5 to 6 hours of daily sunlight.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>Suitable roof types: <strong>RCC Concrete Flat Roof</strong>, Tin Shed, or Clay Tile.</span>
                  </li>
                </ul>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-800/80 text-[11px] text-amber-400 font-semibold">
                ✓ Heavy-duty GI elevated mounting available
              </div>
            </div>

            {/* 3. KYC Documents */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 transition-all shadow-xl flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-lg text-white">
                  {isTa ? '3. KYC ஆவணங்கள்' : '3. KYC Documents'}
                </h3>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span><strong>Aadhaar Card</strong> (mobile linked for National Portal OTP).</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span><strong>Latest TNEB Electricity Bill</strong> copy.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span><strong>Bank Passbook / Cheque</strong> (Aadhaar-seeded for ₹78,000 DBT).</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span>Passport photo & Property Tax Receipt / Patta.</span>
                  </li>
                </ul>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-800/80 text-[11px] text-purple-400 font-semibold">
                ✓ 100% Paperless online uploading by MRS SOLAR
              </div>
            </div>

            {/* 4. Financing & Bank Loan */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-all shadow-xl flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <IndianRupee className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-lg text-white">
                  {isTa ? '4. வங்கி கடன் வசதி' : '4. Bank Loan Facility'}
                </h3>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>0-Downpayment bank loans</strong> available from SBI, Canara, Indian Bank.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Concessional interest rates (around <strong>7% per annum</strong>).</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{isTa ? '10 ஆண்டுகள் வரை (12 முதல் 120 மாதங்கள்) எளிய தவணை வசதி.' : 'Flexible tenure: Up to 10 Years (12 to 120 Months) with instant pre-approval.'}</span>
                  </li>
                </ul>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-800/80 text-[11px] text-emerald-400 font-semibold">
                ✓ No collateral needed up to 10 kW
              </div>
            </div>

          </div>

          {/* Reassurance Callout Box */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-teal-950/60 via-slate-900 to-indigo-950/60 border border-teal-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm sm:text-base">
                  {isTa ? 'ஆவணங்கள் இல்லையா? கவலை வேண்டாம்!' : 'Don’t Worry About the Government Paperwork!'}
                </h4>
                <p className="text-xs text-slate-300">
                  {isTa
                    ? 'TANGEDCO அனுமதி, மீட்டர் மாற்றுதல் மற்றும் ₹78,000 மத்திய அரசு மானிய விண்ணப்பம் அனைத்தையும் MRS SOLAR குழுவினரே நேரடியாக செய்து தருகிறோம்.'
                    : 'From PM Surya Ghar portal registration to TANGEDCO net-meter liaisoning and DBT subsidy claim, MRS SOLAR manages the entire turnkey process.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => scrollToSection('booking-form')}
              className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all shrink-0"
            >
              {isTa ? 'ஆய்வு பதிவு செய்' : 'Get Free Feasibility'}
            </button>
          </div>

        </div>
      </section>

      {/* ============================================================== */}
      {/* 6. INTERACTIVE SOLAR EMI & TNEB SAVINGS CALCULATOR              */}
      {/* ============================================================== */}
      <section id="calculator" className="py-16 sm:py-24 px-4 sm:px-6 bg-slate-900/40 border-y border-slate-800">
        <div className="max-w-5xl mx-auto space-y-10">
          
          <div className="text-center space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-950/80 border border-teal-800 px-3 py-1 rounded-full">
              Financial Return & EMI Modeler
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              {isTa ? 'சோலார் EMI & மின் கட்டண சேமிப்பு கால்குலேட்டர்' : 'Solar EMI & TNEB Electricity Bill Calculator'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              {isTa
                ? 'உங்கள் தற்போதைய மின்கட்டணத்தை அடிப்படையாகக் கொண்டு எவ்வளவு சோலார் தேவை, மத்திய மானியம் மற்றும் மாத EMI-ஐ துல்லியமாக கணக்கிடுங்கள்.'
                : 'See your recommended rooftop plant size, PM Surya Ghar subsidy, net investment, monthly EMI, and 25-year lifetime wealth savings.'}
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-8">
            
            {/* INPUT CONTROLS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Slider 1: Monthly EB Bill */}
              <div className="space-y-3 p-5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-300">
                    {isTa ? 'சராசரி மாத EB மின்கட்டணம்:' : 'Average Monthly EB Electricity Bill:'}
                  </label>
                  <span className="font-mono font-black text-lg text-teal-400">
                    {formatCurrency(monthlyEbBill, false)} / mo
                  </span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="15000"
                  step="250"
                  value={monthlyEbBill}
                  onChange={(e) => {
                    setMonthlyEbBill(Number(e.target.value));
                    setCalcMode('bill');
                  }}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>₹500</span>
                  <span>₹2,500 (Typical)</span>
                  <span>₹7,500</span>
                  <span>₹15,000</span>
                </div>
              </div>

              {/* Capacity Selector / Overrides */}
              <div className="space-y-3 p-5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <label className="text-xs font-bold text-slate-300 block">
                  {isTa ? 'அல்லது நேரடியாக சோலார் திறனை தேர்வு செய்யவும்:' : 'Or Select System Capacity Directly:'}
                </label>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {[1, 2, 3, 5, 10].map((kw) => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => {
                        setSelectedKw(kw);
                        setCalcMode('kw');
                      }}
                      className={`py-2 px-1 text-xs font-black rounded-xl border transition-all ${
                        activeKw === kw
                          ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {kw} kW
                    </button>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-slate-400 pt-1">
                  <span>Selected: <strong>{activeKw} kWp Plant</strong></span>
                  <div className="flex items-center space-x-1.5">
                    <span>{isTa ? 'தவணை காலம்:' : 'Tenure (Up to 10 Yrs):'}</span>
                    <select
                      value={loanTenureMonths}
                      onChange={(e) => setLoanTenureMonths(Number(e.target.value))}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5 text-teal-400 font-bold outline-none"
                    >
                      <option value={12}>12 Mo (1 Yr)</option>
                      <option value={24}>24 Mo (2 Yrs)</option>
                      <option value={36}>36 Mo (3 Yrs)</option>
                      <option value={48}>48 Mo (4 Yrs)</option>
                      <option value={60}>60 Mo (5 Yrs)</option>
                      <option value={72}>72 Mo (6 Yrs)</option>
                      <option value={84}>84 Mo (7 Yrs)</option>
                      <option value={96}>96 Mo (8 Yrs)</option>
                      <option value={108}>108 Mo (9 Yrs)</option>
                      <option value={120}>120 Mo (10 Yrs - Max)</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {[12, 24, 36, 60, 84, 120].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setLoanTenureMonths(m)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${
                        loanTenureMonths === m
                          ? 'bg-teal-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {m / 12}Y ({m}M)
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* DYNAMIC RESULTS MATRIX */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">System Size</span>
                <p className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5">{activeKw} kWp</p>
                <span className="text-[10px] text-slate-400">~{monthlyGenUnits} Units / mo</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-300 block">PM Surya Ghar Subsidy</span>
                <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">{formatCurrency(centralSubsidy, false)}</p>
                <span className="text-[10px] text-emerald-300">100% Direct Bank DBT</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Investment</span>
                <p className="text-xl sm:text-2xl font-black text-white mt-0.5">{formatCurrency(netInvestment, false)}</p>
                <span className="text-[10px] text-slate-400">After ₹{centralSubsidy.toLocaleString()} subsidy</span>
              </div>

              <div className="p-4 rounded-2xl bg-teal-950/40 border border-teal-500/30 text-center">
                <span className="text-[10px] uppercase font-bold text-teal-300 block">Monthly Loan EMI</span>
                <p className="text-xl sm:text-2xl font-black text-teal-400 mt-0.5">{formatCurrency(estimatedMonthlyEmi, false)} / mo</p>
                <span className="text-[10px] text-teal-300">{loanTenureMonths} Mo ({(loanTenureMonths / 12).toFixed(1).replace('.0', '')} Yrs) Financing</span>
              </div>

            </div>

            {/* CASHFLOW ANALYSIS BANNER */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-teal-950/50 to-slate-950 border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Monthly Cashflow Benefit (Immediate Pocket Gain)
                </span>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-black text-white">
                    +{formatCurrency(netMonthlyPocketGain, false)} / month
                  </span>
                  <span className="text-xs text-emerald-300">Net Profit from Month 1!</span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Your monthly TNEB bill savings ({formatCurrency(monthlySavings, false)}) exceed your loan EMI ({formatCurrency(estimatedMonthlyEmi, false)}), putting cash back in your pocket immediately!
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">25-Year Lifetime Wealth Saved</span>
                <span className="text-2xl font-black text-teal-300 font-mono">
                  {formatCurrency(lifetime25YearSavings, false)}
                </span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ============================================================== */}
      {/* 7. WHY BATTERY-FREE ON-GRID ROOFTOP SOLAR?                     */}
      {/* ============================================================== */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-10">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-950/80 border border-teal-800 px-3 py-1 rounded-full">
              Engineering Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              {isTa ? 'ஏன் பேட்டரி இல்லாத ஆன்-கிரிட் சோலார் சிறந்தது?' : 'Why Battery-Free On-Grid Rooftop Solar?'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {isTa 
                ? 'குடியிருப்பு வீடுகளுக்கு பேட்டரி இல்லாத அமைப்பே மிக குறைந்த செலவில் அதிக பலன் தரும் முதலீடு.'
                : 'Understand why grid-tied solar offers the fastest financial payback and zero maintenance.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="font-extrabold text-base text-white">Zero Battery Replacement Costs</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Chemical lead-acid or lithium batteries must be replaced every 3 to 5 years, costing ₹80,000 to ₹1,50,000 repeatedly. On-grid solar completely eliminates this expense, leaving 100% of your savings in your bank.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="font-extrabold text-base text-white">1:1 Net Metering & Rollover</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                During bright daylight hours, all surplus electricity generated spins your bi-directional net meter backwards, exporting units to TNEB. At night, you draw power from the grid, with zero power loss from battery round-trip resistance.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="font-extrabold text-base text-white">100 Free Units Subsidy Intact</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tamil Nadu’s flagship 100 Free Units domestic subsidy continues to apply to your Net Billed consumption. If Net Units (Import minus Export) are under 100, your bi-monthly electricity bill is ₹0.00!
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ============================================================== */}
      {/* 8. 5-STEP INSTALLATION ROADMAP                                 */}
      {/* ============================================================== */}
      <section id="installation-steps" className="py-16 sm:py-24 px-4 sm:px-6 bg-slate-900/50 border-y border-slate-800">
        <div className="max-w-5xl mx-auto space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-950/80 border border-indigo-800 px-3 py-1 rounded-full">
              Hassle-Free Turnkey EPC
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              {isTa ? '5 எளிய படிகளில் உங்கள் வீட்டு சோலார்' : '5 Easy Steps to Zero Electricity Bills'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {isTa
                ? 'ஆரம்ப ஆய்வு முதல் உங்கள் கணக்கில் மானியம் வரவு வைக்கப்படும் வரை முழு பொறுப்பும் எங்களுடையது.'
                : 'From the initial rooftop survey to TANGEDCO net-meter installation and DBT subsidy credit.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3 relative">
              <span className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 font-black text-sm flex items-center justify-center mx-auto">1</span>
              <h4 className="font-bold text-sm text-white">Free Roof Survey</h4>
              <p className="text-[11px] text-slate-400">Engineer visits your property to measure shadow-free area and electrical load.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3 relative">
              <span className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 font-black text-sm flex items-center justify-center mx-auto">2</span>
              <h4 className="font-bold text-sm text-white">National Portal Reg</h4>
              <p className="text-[11px] text-slate-400">We file your application on pmsuryaghar.gov.in and obtain TANGEDCO technical sanction.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3 relative">
              <span className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 font-black text-sm flex items-center justify-center mx-auto">3</span>
              <h4 className="font-bold text-sm text-white">Turnkey Install</h4>
              <p className="text-[11px] text-slate-400">Tier-1 DCR solar panels, string inverter & GI structure mounted in 3 to 5 business days.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3 relative">
              <span className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 font-black text-sm flex items-center justify-center mx-auto">4</span>
              <h4 className="font-bold text-sm text-white">Net Meter Sync</h4>
              <p className="text-[11px] text-slate-400">TANGEDCO inspects the plant and installs the bi-directional solar net meter.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/40 text-center space-y-3 relative bg-emerald-950/20">
              <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center mx-auto">5</span>
              <h4 className="font-bold text-sm text-emerald-300">₹78,000 DBT Credit</h4>
              <p className="text-[11px] text-slate-300">MNRE credits your subsidy directly into your bank account within 30 days.</p>
            </div>

          </div>

        </div>
      </section>

      {/* ============================================================== */}
      {/* 9. PACKAGES SHOWCASE (1 kW TO 10 kW)                           */}
      {/* ============================================================== */}
      <section id="packages" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-950/80 border border-teal-800 px-3 py-1 rounded-full">
              Standard Turnkey Packages
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              {isTa ? 'அனைத்து வீடுகளுக்கும் ஏற்ற சோலார் திட்டங்கள்' : 'Engineered for Every Home & Budget'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Complete turnkey supply, installation, testing, commissioning, and 5-year comprehensive service.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {packagesList.map((pkg) => (
              <div 
                key={pkg.kw}
                className={`p-5 rounded-3xl bg-slate-900 border flex flex-col justify-between transition-all relative ${
                  pkg.popular 
                    ? 'border-teal-500 shadow-xl shadow-teal-500/10 scale-105 z-10' 
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md">
                    Most Popular
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="font-extrabold text-lg text-white">{pkg.label}</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Area: {pkg.roofArea}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Daily:</span>
                      <span className="font-bold text-white">{pkg.dailyUnits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Monthly:</span>
                      <span className="font-bold text-white">{pkg.monthlyUnits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Savings:</span>
                      <span className="font-bold text-emerald-400">{pkg.monthlySavings}</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-center">
                    <span className="text-[10px] text-emerald-400 font-bold block">Subsidy: ₹{pkg.subsidy.toLocaleString()}</span>
                    <span className="text-lg font-black text-teal-300 font-mono block">EMI: {pkg.emiFrom}</span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-snug border-t border-slate-800 pt-3">
                    <strong>Ideal for:</strong> {pkg.appliances}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedKw(pkg.kw);
                    setCalcMode('kw');
                    scrollToSection('calculator');
                  }}
                  className="w-full mt-4 py-2 rounded-xl bg-slate-800 hover:bg-teal-500 hover:text-slate-950 text-white font-bold text-xs transition-colors"
                >
                  Select Package
                </button>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ============================================================== */}
      {/* 10. BOOK FREE SITE SURVEY & APPLY FOR LOAN FORM                */}
      {/* ============================================================== */}
      <section id="booking-form" className="py-16 sm:py-24 px-4 sm:px-6 bg-slate-900/60 border-t border-slate-800">
        <div className="max-w-3xl mx-auto space-y-8">
          
          <div className="text-center space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded-full">
              Zero Commitment • Free Site Feasibility
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              {isTa ? 'இலவச மேற்கூரை ஆய்வு & கடன் முன்-ஒப்புதல் பதிவு' : 'Book Free Roof Survey & Loan Consultation'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {isTa
                ? 'உங்கள் விபரங்களை உள்ளிடவும். எங்கள் சோலார் பொறியாளர் 24 மணி நேரத்திற்குள் உங்களை தொடர்பு கொள்வார்.'
                : 'Leave your contact information. Our qualified solar engineer will contact you to schedule a site feasibility audit.'}
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
            
            {leadSuccess ? (
              <div className="p-6 rounded-2xl bg-emerald-950/80 border border-emerald-500 text-center space-y-3 animate-fade-in">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="font-bold text-lg text-white">
                  {isTa ? 'நன்றி! உங்கள் விண்ணப்பம் பதிவு செய்யப்பட்டது!' : 'Inquiry Submitted Successfully!'}
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  {isTa 
                    ? 'எங்கள் சோலார் பொறியாளர் விரைவில் உங்களை தொடர்பு கொண்டு ஆய்வு தேதியை உறுதி செய்வார்.'
                    : 'Our technical team has received your details and will call you shortly to confirm your rooftop feasibility survey.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitLead} className="space-y-4 text-xs">
                
                {leadError && (
                  <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{leadError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenWhatsAppConsultation}
                      className="px-3 py-1.5 rounded-lg bg-[#00a884] hover:bg-[#009272] text-white font-bold text-[11px] flex items-center justify-center space-x-1.5 shrink-0 transition-all shadow"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{isTa ? 'வாட்ஸ்அப் மூலம் அனுப்பவும்' : 'Submit via WhatsApp Instead'}</span>
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5 uppercase text-[10px] tracking-wider">
                      {isTa ? 'முழு பெயர்' : 'Full Name'} *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Kumar"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5 uppercase text-[10px] tracking-wider">
                      {isTa ? 'வாட்ஸ்அப் அலைபேசி எண்' : 'WhatsApp Mobile Number'} *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9876543210"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5 uppercase text-[10px] tracking-wider">
                      {isTa ? 'மாவட்டம்' : 'District'}
                    </label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-teal-500"
                    >
                      <option value="Thiruvallur">Thiruvallur</option>
                      <option value="Chennai">Chennai</option>
                      <option value="Kanchipuram">Kanchipuram</option>
                      <option value="Chengalpattu">Chengalpattu</option>
                      <option value="Vellore">Vellore</option>
                      <option value="Ranipet">Ranipet</option>
                      <option value="Other TN">Other Tamil Nadu District</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5 uppercase text-[10px] tracking-wider">
                      {isTa ? 'மேற்கூரை வகை' : 'Roof Type'}
                    </label>
                    <select
                      value={roofType}
                      onChange={(e) => setRoofType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-teal-500"
                    >
                      <option value="RCC Concrete">RCC Flat Concrete Roof</option>
                      <option value="Tin Metal Sheet">Tin / Metal Industrial Sheet</option>
                      <option value="Clay Tile">Clay Tile Roof</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5 uppercase text-[10px] tracking-wider">
                      {isTa ? 'பரிந்துரைக் குறியீடு' : 'Referral Code'}
                    </label>
                    <input
                      type="text"
                      placeholder="Optional e.g. MRS-SOL1001"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-purple-300 font-bold outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1.5 uppercase text-[10px] tracking-wider">
                    {isTa ? 'கூடுதல் குறிப்புகள் / கேள்விகள் (விருப்பப்பட்டால்)' : 'Additional Notes / Questions (Optional)'}
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. 2 ACs at home, 3-phase connection, need elevated structure"
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-teal-500"
                  />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="submit"
                    disabled={submittingLead}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-black text-xs rounded-xl shadow-lg shadow-teal-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 text-yellow-300" />
                    <span>{submittingLead ? 'Submitting...' : (isTa ? 'இலவச ஆய்வு பதிவு செய்க' : 'Book Free Survey & Consultation')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenWhatsAppConsultation}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Instant WhatsApp Inquiry</span>
                  </button>
                </div>

              </form>
            )}

          </div>

        </div>
      </section>

      {/* ============================================================== */}
      {/* 11. FREQUENTLY ASKED QUESTIONS (FAQ)                           */}
      {/* ============================================================== */}
      <section id="faqs" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-10">
          
          <div className="text-center space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-950/80 border border-teal-800 px-3 py-1 rounded-full">
              Clarifications & Guidance
            </span>
            <h2 className="text-3xl font-extrabold text-white">
              {isTa ? 'அடிக்கடி கேட்கப்படும் கேள்விகள்' : 'Frequently Asked Questions'}
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div 
                  key={idx}
                  className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between text-xs sm:text-sm font-extrabold text-white hover:text-teal-400 transition-colors"
                  >
                    <span>{isTa ? faq.qTa : faq.qEn}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-teal-400' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3">
                      {isTa ? faq.aTa : faq.aEn}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ============================================================== */}
      {/* 12. FOOTER                                                     */}
      {/* ============================================================== */}
      <footer className="bg-slate-950 border-t border-slate-800 py-12 px-4 sm:px-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center space-x-2">
              <Sun className="w-5 h-5 text-yellow-400" />
              <span className="font-black text-lg text-white">MRS <span className="text-teal-400">SOLAR ASSOCIATES</span></span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              Empowering residential and commercial property owners across Tamil Nadu with turnkey rooftop solar installations, PM Surya Ghar central subsidies, and 0-downpayment bank financing.
            </p>
            <p className="text-[11px] text-slate-500">
              📍 Head Office: Thiruvallur, Tamil Nadu, India • Phone: +91 80724 54996
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Quick Navigation</h4>
            <ul className="space-y-1.5 text-xs">
              <li><button onClick={() => navigate('/login')} className="hover:text-teal-400">Customer Portal Login</button></li>
              <li><button onClick={() => navigate('/login')} className="hover:text-teal-400">Owner & Admin Login</button></li>
              <li><button onClick={() => scrollToSection('requirements')} className="hover:text-teal-400">Requirements Checklist</button></li>
              <li><button onClick={() => scrollToSection('calculator')} className="hover:text-teal-400">Solar EMI Calculator</button></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Official Portals</h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <a href="https://pmsuryaghar.gov.in" target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 flex items-center space-x-1">
                  <span>PM Surya Ghar Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="https://www.tnebnet.org/qwp/qpay" target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 flex items-center space-x-1">
                  <span>TANGEDCO Quick Pay</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="https://mnre.gov.in" target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 flex items-center space-x-1">
                  <span>MNRE Central Guidelines</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <p>© {new Date().getFullYear()} MRS SOLAR ASSOCIATES. All Rights Reserved.</p>
          <p>Tamil Nadu Electricity Board (TANGEDCO) & MNRE Compliant On-Grid Rooftop Installations.</p>
        </div>
      </footer>

      {/* ============================================================== */}
      {/* 13. FLOATING ACTION PILL: WHATSAPP ASSISTANCE                   */}
      {/* ============================================================== */}
      <button
        type="button"
        onClick={handleOpenWhatsAppConsultation}
        className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-3 px-4 rounded-full shadow-2xl shadow-emerald-600/40 hover:scale-105 active:scale-95 transition-all"
        title="Chat with Solar Expert on WhatsApp"
      >
        <MessageCircle className="w-5 h-5 text-white fill-current" />
        <span className="hidden sm:inline">{isTa ? 'வாட்ஸ்அப் உதவி' : 'WhatsApp Support'}</span>
      </button>

    </div>
  );
}
