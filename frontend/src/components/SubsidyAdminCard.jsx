import React, { useState } from 'react';
import { 
  Award, CheckCircle2, Clock, Landmark, ExternalLink, 
  Send, Save, Zap, Sun, ShieldCheck, FileText, Check, MessageCircle, AlertCircle
} from 'lucide-react';
import api from '../utils/api.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { normalizePhone, COMPANY_NAME, DEFAULT_SUPPORT_PHONE } from '../utils/whatsapp.js';

export default function SubsidyAdminCard({ customer, onUpdate, lang = 'en' }) {
  const isTa = lang === 'ta';
  const subsidy = customer?.subsidyDetails || {};
  const currentStage = Number(subsidy.currentStage) || 3;
  const capacity = Number(customer?.solarCapacity) || 1;
  const eligibleAmount = capacity >= 3 ? 78000 : capacity >= 2 ? 60000 : 30000;

  const [selectedStage, setSelectedStage] = useState(currentStage);
  const [appNumber, setAppNumber] = useState(
    subsidy.applicationNumber || `PMSGY-TN-2026-${(customer?.customerId || 'SOL').replace(/[^a-zA-Z0-9]/g, '')}`
  );
  const [notes, setNotes] = useState(subsidy.notes || '');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const stages = [
    {
      id: 1,
      titleEn: 'Application & Feasibility Submitted',
      titleTa: 'விண்ணப்பம் & சாத்தியக்கூறு சமர்ப்பிப்பு',
      descEn: 'Registered on National Solar Portal (pmsuryaghar.gov.in)',
      descTa: 'தேசிய சோலார் போர்ட்டலில் பதிவு செய்யப்பட்டது',
      icon: FileText
    },
    {
      id: 2,
      titleEn: 'TANGEDCO Feasibility Sanctioned',
      titleTa: 'TANGEDCO தொழில்நுட்ப அனுமதி',
      descEn: 'Division grid feasibility approved for net-metering',
      descTa: 'TNEB பொறியாளர் ஆய்வு செய்து அனுமதி அளித்துள்ளார்',
      icon: ShieldCheck
    },
    {
      id: 3,
      titleEn: 'Rooftop Solar Plant Commissioned',
      titleTa: 'சோலார் மேற்கூரை பொருத்துதல் முடிந்தது',
      descEn: 'Panels, Inverter & Earthing installed by MRS SOLAR',
      descTa: 'பேனல்கள் மற்றும் இன்வெர்ட்டர் வெற்றிகரமாக நிறுவப்பட்டது',
      icon: Sun
    },
    {
      id: 4,
      titleEn: 'Bi-Directional Net-Meter Synchronized (JIR)',
      titleTa: 'இருவழி நெட்-மீட்டர் ஆய்வு & இணைப்பு',
      descEn: 'Bidirectional net-meter synced & JIR uploaded to portal',
      descTa: 'இருவழி மீட்டர் பொருத்தப்பட்டு JIR அறிக்கை சமர்ப்பிக்கப்பட்டது',
      icon: Zap
    },
    {
      id: 5,
      titleEn: 'Central Subsidy Credited via DBT',
      titleTa: 'மத்திய அரசு மானியம் வங்கியில் வரவு',
      descEn: 'CFA subsidy credited directly into customer bank account',
      descTa: 'மானியம் வாடிக்கையாளரின் வங்கிக் கணக்கில் வரவு வைக்கப்பட்டது',
      icon: Landmark
    }
  ];

  const handleSaveSubsidy = async (stageToSave = selectedStage) => {
    if (!customer?._id) return;
    setSaving(true);
    try {
      await api.put(`/admin/customers/${customer._id}/subsidy`, {
        stage: stageToSave,
        applicationNumber: appNumber.trim(),
        notes: notes.trim()
      });
      setSelectedStage(stageToSave);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error saving subsidy details:', err);
      alert(err.response?.data?.message || 'Failed to update subsidy stage.');
    } finally {
      setSaving(false);
    }
  };

  const sendWhatsAppUpdate = () => {
    const rawMobile = customer?.mobileNumber || '';
    const phone = normalizePhone(rawMobile);
    if (!phone) {
      alert('Customer mobile number is missing.');
      return;
    }

    const stageObj = stages.find(s => s.id === selectedStage) || stages[selectedStage - 1];
    const customerName = customer?.fullName || 'Customer';
    const customerId = customer?.customerId || '';
    const stageTitle = isTa ? stageObj.titleTa : stageObj.titleEn;

    let message = '';
    if (isTa) {
      message = `வணக்கம் *${customerName}* அவர்களுக்கு,

உங்கள் *PM சூர்யா கர்: முஃப்ட் பிஜ்லி யோஜனா* மத்திய அரசு சோலார் மானிய விண்ணப்பம் தொடர்பான மகிழ்ச்சியான செய்தி:

📌 *வாடிக்கையாளர் எண்:* ${customerId}
🏷️ *போர்ட்டல் விண்ணப்ப எண்:* ${appNumber}
⚡ *சோலார் திறன்:* ${capacity} kWp On-Grid
💰 *உரித்தான மத்திய மானியம்:* *${formatCurrency(eligibleAmount, false)}*

📍 *தற்போதைய முன்னேற்றம் (Stage ${selectedStage}/5):*
✅ *${stageTitle}*
ℹ️ ${stageObj.descTa}

${selectedStage === 5 
  ? '🎉 *வாழ்த்துக்கள்!* மத்திய அரசின் மானியத் தொகை உங்கள் வங்கிக் கணக்கில் வெற்றிகரமாக வரவு வைக்கப்பட்டுள்ளது.' 
  : 'அடுத்த கட்ட ஆய்வுகள் விரைவாக நடைபெற்று வருகின்றன. விரைவில் மானியத் தொகை உங்கள் வங்கிக் கணக்கில் DBT மூலம் வரவு வைக்கப்படும்.'}

தேசிய போர்ட்டல்: https://pmsuryaghar.gov.in
ஏதேனும் சந்தேகம் இருந்தால் தொடர்பு கொள்ளவும்: 📞 ${DEFAULT_SUPPORT_PHONE}

நன்றி,
*${COMPANY_NAME}* ☀️`;
    } else {
      message = `Dear *${customerName}*,

Great news regarding your *PM Surya Ghar: Muft Bijli Yojana* central government solar subsidy:

📌 *Customer ID:* ${customerId}
🏷️ *National Portal Ref:* ${appNumber}
⚡ *Solar Capacity:* ${capacity} kWp Grid-Tied PV
💰 *Eligible Central Subsidy:* *${formatCurrency(eligibleAmount, false)}*

📍 *Current Milestone (Stage ${selectedStage}/5):*
✅ *${stageTitle}*
ℹ️ ${stageObj.descEn}

${selectedStage === 5 
  ? '🎉 *Congratulations!* Your Central Financial Assistance subsidy has been successfully credited directly to your bank account via DBT.' 
  : 'Our liaisoning team is actively completing subsequent TANGEDCO verifications to ensure timely disbursement.'}

Track live: https://pmsuryaghar.gov.in
Support helpline: 📞 ${DEFAULT_SUPPORT_PHONE}

Best regards,
*${COMPANY_NAME} Team* ☀️`;
    }

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="glass-premium rounded-3xl p-6 shadow-sm border border-amber-300/80 dark:border-amber-700/60 bg-gradient-to-br from-amber-500/5 via-white to-orange-500/5 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-amber-200 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {isTa ? 'PM சூர்யா கர்: மத்திய அரசு மானிய மேலாண்மை' : 'PM Surya Ghar: Central Subsidy Lifecycle'}
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                DBT Direct Credit
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              National Portal liaisoning, technical sanction & subsidy disbursement tracking
            </p>
          </div>
        </div>

        {/* FINANCIAL ENTITLEMENT BADGE */}
        <div className="bg-amber-100/80 dark:bg-amber-950/40 px-3.5 py-1.5 rounded-2xl border border-amber-300 dark:border-amber-800 text-right">
          <span className="text-[9px] uppercase font-bold text-amber-800 dark:text-amber-400 block">
            Central Subsidy
          </span>
          <span className="text-base font-black text-amber-950 dark:text-amber-300 font-mono">
            {formatCurrency(eligibleAmount, false)}
          </span>
        </div>
      </div>

      {/* INPUT CONTROLS: APPLICATION NUMBER & QUICK SAVE */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
        <div className="sm:col-span-2">
          <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">
            National Portal Application Number
          </label>
          <input
            type="text"
            value={appNumber}
            onChange={(e) => setAppNumber(e.target.value)}
            placeholder="PMSGY-TN-2026-XXXX"
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-end space-x-2">
          <button
            type="button"
            onClick={() => handleSaveSubsidy(selectedStage)}
            disabled={saving}
            className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-amber-600/20 flex items-center justify-center space-x-1.5 transition-all"
          >
            {saving ? <Clock className="w-3.5 h-3.5 animate-spin" /> : savedSuccess ? <Check className="w-3.5 h-3.5 text-white" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savedSuccess ? 'Saved!' : 'Save Details'}</span>
          </button>

          <button
            type="button"
            onClick={sendWhatsAppUpdate}
            className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-1.5 transition-all"
            title="Notify Customer on WhatsApp about their Subsidy Progress"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
        </div>
      </div>

      {/* STAGE SELECTION BUTTONS (1 to 5) */}
      <div className="space-y-2 mt-4">
        <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
          Click to Set Current Subsidy Milestone:
        </label>
        
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {stages.map((stg) => {
            const isSelected = selectedStage === stg.id;
            const isPassed = selectedStage > stg.id;

            return (
              <button
                key={stg.id}
                type="button"
                onClick={() => handleSaveSubsidy(stg.id)}
                className={`p-2.5 rounded-2xl text-left border-2 transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20 scale-[1.02]'
                    : isPassed
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : isPassed ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-100 text-slate-700'
                  }`}>
                    #{stg.id}
                  </span>
                  {isPassed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                  {isSelected && <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>}
                </div>
                <div>
                  <h4 className="text-[11px] font-bold leading-tight">
                    {isTa ? stg.titleTa : stg.titleEn}
                  </h4>
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
