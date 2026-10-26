import React, { useState } from 'react';
import { Gift, Copy, Check, MessageCircle, Share2, Sparkles } from 'lucide-react';

export default function ReferralShareCard({ customer, lang = 'en' }) {
  const [copied, setCopied] = useState(false);

  const cleanId = (customer?.customerId || 'SOL1001').replace(/[^a-zA-Z0-9]/g, '');
  const referralCode = `MRS-${cleanId}`;

  const isTa = lang === 'ta';

  const handleCopyCode = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(referralCode).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const custName = customer?.fullName || 'Customer';
    const capacity = customer?.solarCapacity || 3;

    let text = '';
    if (isTa) {
      text = `☀️ *MRS SOLAR கூரை சோலார் பரிந்துரை* ☀️

வணக்கம்! நான் MRS Solar Associates மூலம் எனது வீட்டில் *${capacity} kW* கூரை சோலார் அமைத்துள்ளேன். இதன் மூலம் மத்திய அரசின் *PM சூர்யா கர் திட்டத்தின் கீழ் ₹78,000 வரை நேரடி மானியம்* மற்றும் மாதாந்திர மின் கட்டணத்தில் பெரும் சேமிப்பு கிடைக்கிறது.

உங்கள் வீடு அல்லது வணிக நிறுவனத்திற்கும் சோலார் அமைக்க விரும்பினால் தொடர்பு கொள்ளவும்:
🌐 இணையதளம்: https://mrs-solar-yj6e.vercel.app
📞 தொடர்பு எண்: +91 80724 54996

தொடர்பு கொள்ளும்போது எனது பரிந்துரைக் குறியீட்டைக் குறிப்பிடவும்:
👉 *${referralCode}* (${custName})`;
    } else {
      text = `☀️ *MRS SOLAR Rooftop Recommendation* ☀️

Hello! I have installed a *${capacity} kW* rooftop solar system with MRS Solar Associates. They helped me claim up to *₹78,000 Direct Central Subsidy* under PM Surya Ghar Muft Bijli Yojana with zero-downpayment bank financing and huge monthly electricity savings.

If you are interested in rooftop solar for your home or business:
🌐 Website: https://mrs-solar-yj6e.vercel.app
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
                  {isTa ? 'நண்பர்கள் & அக்கம்பக்கத்தினரை பரிந்துரைக்கவும்' : 'Refer a Neighbor & Friend'}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed mt-1.5 max-w-xl">
                {isTa
                  ? 'உங்கள் நண்பர்கள் மற்றும் அக்கம்பக்கத்தினருக்கு கூரை சோலார் அமைக்க MRS SOLAR-ஐப் பரிந்துரைக்கவும். PM சூர்யா கர் மத்திய அரசு திட்டத்தின் கீழ் ₹78,000 வரை நேரடி மானியம் மற்றும் மின் கட்டண சேமிப்பைப் பெற உதவுங்கள்!'
                  : 'Share solar with neighbors & friends. Help them claim up to ₹78,000 PM Surya Ghar Central Subsidy and lower their monthly electricity bills for every rooftop installed!'}
              </p>
            </div>
          </div>

          <div className="self-start sm:self-auto shrink-0">
            <span className="inline-flex items-center space-x-1 bg-purple-950/60 border border-purple-500/40 text-purple-300 text-[10px] sm:text-[11px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full shadow-inner">
              <Sparkles className="w-3 h-3 text-purple-300" />
              <span>{isTa ? 'பரிந்துரை' : 'COMMUNITY'}</span>
            </span>
          </div>
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

      </div>
    </div>
  );
}
