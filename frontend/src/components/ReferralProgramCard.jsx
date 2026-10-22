import React, { useState } from 'react';
import { Gift, Share2, Copy, Check, MessageCircle, Sparkles, Users } from 'lucide-react';
import { getLanguage } from '../utils/translations.js';

export default function ReferralProgramCard({ customer }) {
  const lang = getLanguage();
  const isTa = lang === 'ta';
  const [copied, setCopied] = useState(false);

  if (!customer) return null;

  const refCode = `MRS-${(customer.customerId || 'SOL1001').replace(/[^a-zA-Z0-9]/g, '')}`;
  const shareUrl = `https://mrs-solar-yj6e.vercel.app?ref=${refCode}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(refCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const textEn = `Hello! I installed a Rooftop Solar system with MRS SOLAR and my electricity bill is now virtually zero! ☀️

They also manage the ₹30,000 to ₹78,000 PM Surya Ghar Central Government Subsidy and offer monthly EMI options.

Use my Referral Code *${refCode}* for a special discount on your solar rooftop installation:
🔗 ${shareUrl}

Go Solar & Save Big! 🌿`;

    const textTa = `வணக்கம்! நான் MRS SOLAR மூலம் எனது வீட்டின் கூரையில் சோலார் பொருத்தி மின் கட்டணத்தை முழுமையாக குறைத்துள்ளேன்! ☀️

மத்திய அரசின் ₹30,000 முதல் ₹78,000 வரையிலான PM சூர்யா கர் மானியம் மற்றும் எளிய மாத EMI வசதிகளும் உள்ளன.

எனது பரிந்துரை குறியீட்டைப் (*${refCode}*) பயன்படுத்தி சிறப்பு சலுகை பெறுங்கள்:
🔗 ${shareUrl}

சோலார் பொருத்துங்கள், மின் கட்டணத்தை மிச்சப்படுத்துங்கள்! 🌿`;

    const message = isTa ? textTa : textEn;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-indigo-500/10 dark:from-purple-950/20 dark:via-slate-900 dark:to-indigo-950/20 rounded-3xl p-5 sm:p-6 border-2 border-purple-300/80 dark:border-purple-700/60 shadow-lg relative overflow-hidden">
      
      {/* GLOW DECORATION */}
      <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-purple-400/15 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                {isTa ? 'நண்பர்களை பரிந்துரைக்கவும் — ₹1,000 EMI தள்ளுபடி!' : 'Refer a Neighbor — Earn ₹1,000 Off EMI!'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 border border-purple-300">
                Cashback
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {isTa 
                ? 'உங்கள் நண்பர் சோலார் கூரை அமைக்கும்போது உங்கள் அடுத்த EMI-யில் ₹1,000 வரவு வைக்கப்படும்!' 
                : 'Share solar with neighbors & friends. Get ₹1,000 credited to your next EMI for every rooftop installed!'}
            </p>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center space-x-2.5 w-full sm:w-auto">
          {/* CODE BADGE */}
          <div className="flex-1 sm:flex-none flex items-center space-x-1.5 bg-white dark:bg-slate-800 px-3 py-2 rounded-xl border border-purple-200 dark:border-slate-700 shadow-xs">
            <div className="text-left">
              <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">
                {isTa ? 'உங்கள் குறியீடு' : 'Your Code'}
              </span>
              <span className="font-mono font-black text-xs text-purple-950 dark:text-purple-300">
                {refCode}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 transition-colors"
              title="Copy Referral Code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* WHATSAPP SHARE */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="flex-1 sm:flex-none px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-1.5 transition-all active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{isTa ? 'பகிர்க (WhatsApp)' : 'Share via WhatsApp'}</span>
          </button>
        </div>

      </div>

    </div>
  );
}