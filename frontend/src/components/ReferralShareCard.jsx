import React, { useState } from 'react';
import { 
  Gift, Copy, Check, MessageCircle, Share2, Sparkles, 
  Wallet, ArrowUpRight, CheckCircle2, DollarSign, Award, ChevronDown, ChevronUp
} from 'lucide-react';

export default function ReferralShareCard({ customer, lang = 'en' }) {
  const [copied, setCopied] = useState(false);
  const [showWalletDetails, setShowWalletDetails] = useState(true);
  const [payoutOption, setPayoutOption] = useState('emi'); // 'emi' or 'upi'
  const [upiId, setUpiId] = useState('');
  const [claimStatus, setClaimStatus] = useState(null); // 'claiming', 'success'

  const cleanId = (customer?.customerId || 'SOL1001').replace(/[^a-zA-Z0-9]/g, '');
  const referralCode = `MRS-${cleanId}`;

  const isTa = lang === 'ta';

  // Referral metrics (calculated or retrieved from customer record)
  const totalEarned = customer?.referralStats?.totalEarned ?? 5000;
  const pendingReward = customer?.referralStats?.pendingReward ?? 2500;
  const successfulCount = customer?.referralStats?.successfulCount ?? 2;
  const inProgressCount = customer?.referralStats?.inProgressCount ?? 1;

  const handleCopyCode = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(referralCode).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaimReward = (e) => {
    e.preventDefault();
    setClaimStatus('claiming');
    setTimeout(() => {
      setClaimStatus('success');
      setTimeout(() => setClaimStatus(null), 3500);
    }, 1000);
  };

  const handleShareWhatsApp = () => {
    const custName = customer?.fullName || 'Customer';
    const capacity = customer?.solarCapacity || 3;

    let text = '';
    if (isTa) {
      text = `☀️ *MRS SOLAR கூரை சோலார் பரிந்துரை* ☀️

வணக்கம்! நான் MRS Solar Associates மூலம் எனது வீட்டில் *${capacity} kW* கூரை சோலார் அமைத்துள்ளேன். இதன் மூலம் மத்திய அரசின் *PM சூர்யா கர் திட்டத்தின் கீழ் ₹78,000 வரை நேரடி மானியம்* மற்றும் மாதாந்திர மின் கட்டணத்தில் பெரும் சேமிப்பு கிடைக்கிறது.

முழு விபரங்கள், EMI மற்றும் சேமிப்பு கணக்கீட்டை பார்க்க எங்கள் பரிந்துரை தளத்திற்கு செல்லவும்:
🌐 புதிய வாடிக்கையாளர் தளம்: https://mrs-solar-yj6e.vercel.app/referral?ref=${referralCode}
📞 தொடர்பு எண்: +91 80724 54996

தொடர்பு கொள்ளும்போது எனது பரிந்துரைக் குறியீட்டைக் குறிப்பிடவும்:
👉 *${referralCode}* (${custName})`;
    } else {
      text = `☀️ *MRS SOLAR Rooftop Recommendation* ☀️

Hello! I have installed a *${capacity} kW* rooftop solar system with MRS Solar Associates. They helped me claim up to *₹78,000 Direct Central Subsidy* under PM Surya Ghar Muft Bijli Yojana with zero-downpayment bank financing and huge monthly electricity savings.

Check out what is required, calculate your monthly EMI and savings on our new referral website:
🌐 Referral Portal: https://mrs-solar-yj6e.vercel.app/referral?ref=${referralCode}
📞 Call / WhatsApp: +91 80724 54996

When contacting them, quote my referral code:
👉 *${referralCode}* (${custName})`;
    }

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#13172e] to-slate-950 border border-purple-500/20 p-6 sm:p-8 shadow-2xl text-white">
      {/* Decorative ambient background glows */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-pink-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 space-y-6">
        
        {/* Top Header Row with Icon, Title & Badge */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start space-x-4">
            {/* Glowing Pink/Purple Gift Icon Box */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 p-0.5 shadow-lg shadow-pink-500/25 shrink-0 flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                <Gift className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                  {isTa ? 'நண்பர்கள் & அக்கம்பக்கத்தினரை பரிந்துரைக்கவும்' : 'Refer a Neighbor & Earn ₹2,500'}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed mt-1.5 max-w-xl">
                {isTa
                  ? 'ஒவ்வொரு வெற்றிகரமான பரிந்துரைக்கும் ₹2,500 நேரடி பணப் பரிசு அல்லது அடுத்த மாத EMI-யில் கழிவு! நண்பர்களுக்கு ₹78,000 வரை மத்திய அரசு PM சூர்யா கர் மானியம் பெற்றுத் தாருங்கள்.'
                  : 'Earn ₹2,500 instant cash reward or loan EMI waiver for every neighbor who installs rooftop solar! Help friends get up to ₹78,000 PM Surya Ghar Central Subsidy.'}
              </p>
            </div>
          </div>

          <div className="self-start sm:self-auto shrink-0 flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1 bg-purple-950/60 border border-purple-500/40 text-purple-300 text-[10px] sm:text-[11px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full shadow-inner">
              <Sparkles className="w-3 h-3 text-purple-300" />
              <span>{isTa ? 'பரிந்துரை வெகுமதி' : '₹2,500 REWARD'}</span>
            </span>
          </div>
        </div>

        {/* REFERRAL REWARDS WALLET CARD */}
        <div className="bg-slate-800/90 border border-purple-500/30 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white flex items-center space-x-1.5">
                  <span>{isTa ? 'பரிந்துரை வெகுமதி பணப்பை' : 'Referral Cash Wallet'}</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {isTa ? 'செயலில் உள்ளது' : 'ACTIVE'}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  {isTa ? 'நேரடி வங்கி UPI அல்லது EMI கழிவாக பெறலாம்' : 'Claimable as EMI deduction or direct UPI transfer'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowWalletDetails(!showWalletDetails)}
              className="text-xs text-purple-300 hover:text-purple-200 font-bold flex items-center space-x-1 p-1"
            >
              <span className="hidden sm:inline">{showWalletDetails ? (isTa ? 'மறைக்க' : 'Hide') : (isTa ? 'காண்க' : 'View')}</span>
              {showWalletDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showWalletDetails && (
            <div className="pt-4 space-y-4">
              {/* Wallet Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/50">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    {isTa ? 'பெற்ற தொகை' : 'Total Earned'}
                  </span>
                  <span className="text-lg font-black text-emerald-400 block mt-0.5">
                    ₹{totalEarned.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[9px] text-slate-400 mt-1 block">
                    {successfulCount} {isTa ? 'நிறுவல்கள்' : 'Installed'}
                  </span>
                </div>

                <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/50">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    {isTa ? 'நிலுவை தொகை' : 'Pending'}
                  </span>
                  <span className="text-lg font-black text-amber-400 block mt-0.5">
                    ₹{pendingReward.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[9px] text-slate-400 mt-1 block">
                    {inProgressCount} {isTa ? 'ஆய்வில்' : 'In Progress'}
                  </span>
                </div>

                <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/50">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    {isTa ? 'பரிந்துரை ஒன்றுக்கு' : 'Per Referral'}
                  </span>
                  <span className="text-lg font-black text-purple-300 block mt-0.5">
                    ₹2,500
                  </span>
                  <span className="text-[9px] text-slate-400 mt-1 block">
                    {isTa ? 'நேரடி பரிசு' : 'Direct Reward'}
                  </span>
                </div>

                <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/50">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    {isTa ? 'செலுத்தல் முறை' : 'Payout Mode'}
                  </span>
                  <span className="text-xs font-black text-cyan-300 block mt-1 uppercase">
                    {payoutOption === 'emi' ? (isTa ? 'EMI கழிவு' : 'EMI Deduction') : (isTa ? 'UPI மாற்றம்' : 'UPI Transfer')}
                  </span>
                  <span className="text-[9px] text-slate-400 mt-0.5 block">
                    {isTa ? 'தானியங்கி' : 'Instant / Free'}
                  </span>
                </div>
              </div>

              {/* Payout Preference & Claim Action */}
              <div className="bg-slate-900/90 rounded-xl p-3.5 border border-purple-500/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-300">
                    {isTa ? 'வெகுமதி பெறும் முறை:' : 'Payout Preference:'}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setPayoutOption('emi')}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                        payoutOption === 'emi'
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isTa ? 'அடுத்த EMI-யில் கழிவு' : 'Deduct from Next EMI'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayoutOption('upi')}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                        payoutOption === 'upi'
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isTa ? 'வங்கி UPI பரிமாற்றம்' : 'Bank UPI Transfer'}
                    </button>
                  </div>
                </div>

                {payoutOption === 'upi' && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. yourname@okaxis / 9876543210@paytm"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    {payoutOption === 'emi'
                      ? (isTa ? '₹2,500 அடுத்த மாத சோலார் தவணையில் தானாக கழிக்கப்படும்.' : '₹2,500 will be auto-credited toward your next solar loan EMI.')
                      : (isTa ? 'சரிபார்க்கப்பட்டதும் 24 மணி நேரத்தில் UPI மூலம் அனுப்பப்படும்.' : 'Directly disbursed to verified UPI handle within 24 hours.')}
                  </span>

                  <button
                    type="button"
                    onClick={handleClaimReward}
                    disabled={claimStatus === 'claiming' || claimStatus === 'success'}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all flex items-center space-x-1.5 shrink-0"
                  >
                    {claimStatus === 'claiming' ? (
                      <span className="animate-pulse">{isTa ? 'செயலாக்குகிறது...' : 'Processing...'}</span>
                    ) : claimStatus === 'success' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isTa ? 'கோரப்பட்டது!' : 'Claimed!'}</span>
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>{isTa ? 'வெகுமதி கோரு' : 'Claim Reward'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Bottom Actions Row: Code Box & WhatsApp Share Button */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
          
          {/* YOUR CODE BOX */}
          <div className="sm:col-span-6 bg-slate-800/80 hover:bg-slate-800/95 border border-slate-700/70 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between transition-all group shadow-inner">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {isTa ? 'உங்கள் பரிந்துரைக் குறியீடு' : 'YOUR CODE'}
              </span>
              <span className="text-lg sm:text-xl font-black text-purple-300 font-mono tracking-wider block truncate mt-0.5">
                {referralCode}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="p-2.5 rounded-xl bg-slate-700/50 hover:bg-purple-600 text-slate-300 hover:text-white transition-all shadow-sm shrink-0 flex items-center justify-center"
              title={isTa ? 'குறியீட்டை நகலெடு' : 'Copy Referral Code'}
              aria-label="Copy Referral Code"
            >
              {copied ? (
                <div className="flex items-center space-x-1 text-emerald-400 font-bold text-xs">
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">{isTa ? 'நகலெடுக்கப்பட்டது!' : 'Copied!'}</span>
                </div>
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* SHARE VIA WHATSAPP BUTTON */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="sm:col-span-6 bg-[#00a884] hover:bg-[#009272] active:bg-[#008064] text-white font-extrabold rounded-2xl p-3.5 sm:p-4 flex items-center justify-center space-x-2.5 text-xs sm:text-sm shadow-xl shadow-emerald-950/40 transition-all hover:scale-[1.01] active:scale-98"
          >
            <MessageCircle className="w-5 h-5 text-white fill-current shrink-0" />
            <span className="tracking-wide">
              {isTa ? 'வாட்ஸ்அப் மூலம் பகிரவும்' : 'Share via WhatsApp'}
            </span>
          </button>

        </div>

        {/* PREVIEW LINK TO NEW REFERRAL WEBSITE */}
        <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-800/80">
          <span className="text-slate-400 text-[11px]">
            {isTa ? 'புதிய வாடிக்கையாளர் இணையதளத்தை பார்வையிட:' : 'Preview what your friends will see:'}
          </span>
          <a
            href={`/referral?ref=${referralCode}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-300 hover:text-purple-200 underline font-bold flex items-center space-x-1"
          >
            <span>{isTa ? 'பரிந்துரை இணையதளம் திறக்க' : 'Open Referral Website'}</span>
            <Share2 className="w-3.5 h-3.5" />
          </a>
        </div>

      </div>
    </div>
  );
}
