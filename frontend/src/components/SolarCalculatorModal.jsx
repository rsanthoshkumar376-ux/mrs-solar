import React, { useState } from 'react';
import { 
  X, Sun, Award, Zap, TrendingUp, IndianRupee, ShieldCheck, 
  Send, CheckCircle2, Trees, Leaf, Phone, User, MapPin, Sparkles, AlertCircle
} from 'lucide-react';
import api from '../utils/api.js';
import { formatCurrency } from '../utils/format.js';
import { getLanguage } from '../utils/translations.js';

export default function SolarCalculatorModal({ isOpen, onClose }) {
  const lang = getLanguage();
  const isTa = lang === 'ta';

  // Calculator State
  const [monthlyEbBill, setMonthlyEbBill] = useState(2500);
  const [roofType, setRoofType] = useState('RCC Concrete');
  
  // Lead Form State
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [district, setDistrict] = useState('Thiruvallur');
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Solar Calculations based on Monthly EB Bill
  // Average EB tariff slab in TN ~ ₹6.50/unit
  const monthlyUnits = Math.round(monthlyEbBill / 6.5);
  // In TN, 1 kW generates ~120 units per month
  const rawKw = monthlyUnits / 120;
  const recommendedKw = rawKw <= 1.4 ? 1 : rawKw <= 2.5 ? 2 : rawKw <= 3.8 ? 3 : Math.min(10, Math.ceil(rawKw));
  
  // PM Surya Ghar Central Subsidy
  const centralSubsidy = recommendedKw >= 3 ? 78000 : recommendedKw >= 2 ? 60000 : 30000;
  
  // Estimated Cost & Savings
  const grossCost = recommendedKw * 65000; // ~₹65k per kW turnkey installation
  const netInvestment = Math.max(0, grossCost - centralSubsidy);
  
  // Estimated 36-month low-interest EMI (2% flat/reducing approx)
  const estimatedEmi = Math.round(netInvestment / 32);
  
  // Lifetime 25-Year Savings (assuming 3% annual EB tariff inflation)
  const annualSavings = monthlyEbBill * 12 * 0.90; // ~90% bill offset
  const lifetimeSavings = Math.round(annualSavings * 25);
  
  // Environmental Impact
  const co2AvoidedKg = Math.round(recommendedKw * 120 * 12 * 0.82);
  const treesEquiv = Math.round(co2AvoidedKg / 22);

  const handleSubmitLead = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !mobileNumber.trim()) {
      setErrorMsg(isTa ? 'தயவுசெய்து உங்கள் பெயர் மற்றும் அலைபேசி எண்ணை உள்ளிடவும்.' : 'Please enter your Name and Mobile Number.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      await api.post('/leads', {
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        district,
        roofType,
        monthlyEbBill,
        systemCapacity: recommendedKw,
        estimatedSubsidy: centralSubsidy
      });

      setSubmittedSuccess(true);
      setTimeout(() => {
        setSubmittedSuccess(false);
        onClose();
      }, 3500);
    } catch (err) {
      console.error('Lead error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to submit inquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/60 rounded-3xl shadow-2xl overflow-hidden my-6">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-teal-500/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Sun className="w-6 h-6 animate-spin" style={{ animationDuration: '20s' }} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center space-x-1.5">
                <span>{isTa ? 'சோலார் சேமிப்பு & மத்திய மானிய கணக்கீடு' : 'Solar Savings & PM Surya Ghar Subsidy Calculator'}</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                {isTa ? 'உங்கள் மாத EB கட்டணத்தின் அடிப்படையில் சோலார் சேமிப்பை அறியுங்கள்' : 'Estimate your rooftop solar size, central government subsidy & net EMI'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* SLIDER INPUT: MONTHLY EB BILL */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                {isTa ? 'உங்கள் சராசரி இருமாத/மாத EB மின்கட்டணம்' : 'Average Monthly EB Electricity Bill'}
              </label>
              <span className="font-mono font-black text-lg sm:text-xl text-teal-700 dark:text-teal-400">
                {formatCurrency(monthlyEbBill, false)} / mo
              </span>
            </div>

            <input
              type="range"
              min="500"
              max="15000"
              step="250"
              value={monthlyEbBill}
              onChange={(e) => setMonthlyEbBill(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />

            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
              <span>₹500/mo</span>
              <span>₹5,000/mo</span>
              <span>₹10,000/mo</span>
              <span>₹15,000/mo</span>
            </div>
          </div>

          {/* RESULTS GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            
            {/* RECOMMENDED CAPACITY */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-800 border border-amber-200 dark:border-amber-900/40 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                {isTa ? 'பரிந்துரைக்கப்படும் திறன்' : 'Recommended Plant'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 block mt-0.5">
                {recommendedKw} kWp
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                ~{recommendedKw * 120} units/mo
              </span>
            </div>

            {/* PM SURYA GHAR SUBSIDY */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-800 border border-emerald-200 dark:border-emerald-900/40 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 block">
                {isTa ? 'மத்திய அரசு மானியம்' : 'Central Subsidy (DBT)'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 block mt-0.5 font-mono">
                {formatCurrency(centralSubsidy, false)}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                100% Direct Credit
              </span>
            </div>

            {/* NET ESTIMATED EMI */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-slate-800 border border-indigo-200 dark:border-indigo-900/40 text-center">
              <span className="text-[10px] uppercase font-bold text-indigo-800 dark:text-indigo-400 block">
                {isTa ? 'மாத EMI தவணை' : 'Estimated Monthly EMI'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-300 block mt-0.5 font-mono">
                {formatCurrency(estimatedEmi, false)}
              </span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                36 mo financing
              </span>
            </div>

            {/* 25-YEAR SAVINGS */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-800 border border-purple-200 dark:border-purple-900/40 text-center">
              <span className="text-[10px] uppercase font-bold text-purple-800 dark:text-purple-400 block">
                {isTa ? '25 ஆண்டு சேமிப்பு' : '25-Yr Lifetime Savings'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-purple-700 dark:text-purple-300 block mt-0.5 font-mono">
                ₹{(lifetimeSavings / 100000).toFixed(1)}L+
              </span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                Zero EB bills
              </span>
            </div>

          </div>

          {/* ENVIRONMENTAL IMPACT BANNER */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs">
            <div className="flex items-center space-x-2">
              <Leaf className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-900 dark:text-emerald-200 font-medium text-[11px]">
                {isTa ? 'சுற்றுச்சூழல் நன்மை:' : 'Environmental Impact:'}{' '}
                <strong>{co2AvoidedKg.toLocaleString()} kg CO₂ avoided/year</strong>
              </span>
            </div>
            <div className="flex items-center space-x-1 text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
              <Trees className="w-3.5 h-3.5" />
              <span>~{treesEquiv} {isTa ? 'மரங்கள்' : 'trees planted'}</span>
            </div>
          </div>

          {/* LEAD CAPTURE / BOOK FREE SURVEY */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                {isTa ? 'இலவச மேற்கூரை ஆய்வு & கடன் விண்ணப்பம்' : 'Book Free Roof Survey & Loan Pre-Approval'}
              </h4>
            </div>

            {submittedSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 text-center flex items-center justify-center space-x-2 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {isTa ? 'நன்றி! எங்கள் சோலார் பொறியாளர் விரைவில் உங்களை தொடர்பு கொள்வார்.' : 'Thank you! Our solar engineer will contact you shortly to confirm your survey.'}
                </span>
              </div>
            ) : (
              <form onSubmit={handleSubmitLead} className="space-y-3">
                {errorMsg && (
                  <div className="p-2.5 rounded-xl bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 text-xs flex items-center space-x-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      {isTa ? 'முழு பெயர்' : 'Full Name'} *
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 pl-8 pr-3 py-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      {isTa ? 'அலைபேசி எண் (WhatsApp)' : 'Mobile Number'} *
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 pl-8 pr-3 py-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      {isTa ? 'மாவட்டம்' : 'District'}
                    </label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="Thiruvallur">Thiruvallur</option>
                      <option value="Chennai">Chennai</option>
                      <option value="Kanchipuram">Kanchipuram</option>
                      <option value="Chengalpattu">Chengalpattu</option>
                      <option value="Vellore">Vellore</option>
                      <option value="Other">Other Tamil Nadu District</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      {isTa ? 'மேற்கூரை வகை' : 'Roof Type'}
                    </label>
                    <select
                      value={roofType}
                      onChange={(e) => setRoofType(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="RCC Concrete">RCC Flat Concrete Roof</option>
                      <option value="Tin Metal Sheet">Tin / Metal Industrial Sheet</option>
                      <option value="Clay Tile">Clay Tile Roof</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 mt-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-600/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {submitting 
                      ? (isTa ? 'பதிவாகிறது...' : 'Submitting Request...') 
                      : (isTa ? 'இலவச சோலார் ஆய்வு பதிவு செய்க' : 'Book Free Site Survey & Apply for Loan')}
                  </span>
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}