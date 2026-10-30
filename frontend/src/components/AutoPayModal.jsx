import React, { useState } from 'react';
import { 
  Zap, X, ShieldCheck, CheckCircle2, AlertCircle, Copy, Check, 
  Smartphone, Landmark, MessageCircle, Phone, ArrowRight, HelpCircle,
  Calendar, RefreshCw, Lock
} from 'lucide-react';
import api from '../utils/api.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { OWNER_PAYMENT_PHONE } from '../utils/whatsapp.js';

export default function AutoPayModal({ isOpen, onClose, customer, onSuccess }) {
  const [activeTab, setActiveTab] = useState('upi'); // 'upi' | 'bank' | 'assist'
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [mandateRef, setMandateRef] = useState(customer?.autoPay?.mandateRef || '');
  const [saving, setSaving] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem('appLanguage') || 'en');

  if (!isOpen || !customer) return null;

  const isTa = lang === 'ta';
  const autoPay = customer.autoPay || {};
  const isAlreadyActive = autoPay.status === 'Active';

  const monthlyEmi = customer.monthlyEmi || 0;
  const emiSchedule = customer.emiSchedule || [];
  const nextPendingEmi = emiSchedule.find(e => e.status !== 'Paid');
  const nextDueDate = nextPendingEmi?.dueDate || customer.nextEmiDate || new Date().toISOString();

  const upiId = customer?.activeUpi?.upiId || 'rsanthoshkumar376@oksbi';
  const payeeName = customer?.activeUpi?.payeeName || 'Mr Santhoshkumar R';

  const handleCopy = (text, type) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    if (type === 'upi') {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    } else {
      setCopiedAcc(true);
      setTimeout(() => setCopiedAcc(false), 2000);
    }
  };

  const handleLaunchUpiAutoPay = (appKey) => {
    const cleanCustId = (customer?.customerId || '').replace(/[^a-zA-Z0-9]/g, '');
    const note = `AutoPay_EMI_${cleanCustId}`;
    
    // NPCI UPI AutoPay / Mandate URI format
    const upiQuery = `pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${monthlyEmi}&cu=INR&recurrence=MONTHLY&rule=ON&validity_start=${new Date().toISOString().slice(0, 10)}&tn=${encodeURIComponent(note)}`;
    const mandateUri = `upi://mandate?${upiQuery}`;
    const standardPayUri = `upi://pay?${upiQuery}`;

    const packageMap = {
      gpay: 'com.google.android.apps.nbu.paisa.user',
      phonepe: 'com.phonepe.app',
      paytm: 'net.one97.paytm'
    };

    const ua = (navigator.userAgent || '').toLowerCase();
    const isAndroid = ua.includes('android');

    let targetUrl = mandateUri;
    if (isAndroid && packageMap[appKey]) {
      targetUrl = `intent://mandate?${upiQuery}#Intent;scheme=upi;package=${packageMap[appKey]};S.browser_fallback_url=${encodeURIComponent(standardPayUri)};end`;
    }

    try {
      window.location.href = targetUrl;
    } catch (e) {
      window.location.href = mandateUri;
    }
  };

  const handleSaveAutoPay = async (typeToSave, statusToSave = 'Active') => {
    setSaving(true);
    try {
      const response = await api.post('/customer/autopay', {
        status: statusToSave,
        type: typeToSave,
        mandateRef: mandateRef || `MND-${Date.now()}`,
        bankName: customer?.bankDetails?.bankName || 'State Bank of India',
        upiId
      });

      alert(isTa 
        ? (statusToSave === 'Active' ? 'AutoPay வெற்றிகரமாக இயக்கப்பட்டது!' : 'AutoPay அமைப்புகள் புதுப்பிக்கப்பட்டது.') 
        : (statusToSave === 'Active' ? 'AutoPay successfully activated! Your monthly EMI will be auto-debited seamlessly.' : 'AutoPay settings updated.')
      );

      if (onSuccess) onSuccess(response.data.autoPay);
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save AutoPay settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleWhatsAppAssist = () => {
    const text = isTa
      ? `வணக்கம் MRS SOLAR! எனது சோலார் தவணைக்கு (Customer ID: *${customer.customerId}* - *${customer.fullName}*) AutoPay / eNACH தானியங்கி தவணை அமைப்பை செயல்படுத்த உதவவும்.
மாதாந்திர தவணை: ₹${monthlyEmi}`
      : `Hello MRS SOLAR! I would like assistance setting up AutoPay / eNACH bank auto-debit for my solar loan (Customer ID: *${customer.customerId}* - *${customer.fullName}*).
Monthly EMI: ₹${monthlyEmi}`;

    const cleanPhone = OWNER_PAYMENT_PHONE.replace(/[^0-9]/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-4 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fade-in no-print">
      <div className="w-full max-w-xl bg-slate-900 border border-teal-500/30 rounded-3xl shadow-2xl relative overflow-hidden my-auto max-h-[94vh] flex flex-col text-white">
        
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="relative z-10 px-6 py-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
              <RefreshCw className="w-5 h-5 text-white animate-spin" style={{ animationDuration: '40s' }} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-950/60 border border-teal-800/80 px-2.5 py-0.5 rounded-full">
                  {isTa ? 'தானியங்கி தவணை' : 'NPCI / UPI AutoPay'}
                </span>
                {isAlreadyActive && (
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                    {isTa ? 'செயலில் உள்ளது' : 'ACTIVE'}
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-base sm:text-lg text-white mt-0.5">
                {isTa ? 'மாதாந்திர தவணை AutoPay அமைவு' : 'Set Up Monthly EMI AutoPay'}
              </h3>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="relative z-10 p-5 sm:p-7 overflow-y-auto space-y-5 flex-1 text-slate-200">
          
          {/* Active Mandate Banner or Intro */}
          <div className={`p-4 rounded-2xl border ${
            isAlreadyActive 
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-gradient-to-r from-teal-950/60 via-slate-900 to-slate-950 border-teal-500/30 text-teal-100'
          }`}>
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-xl shrink-0 ${isAlreadyActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-teal-500/20 text-teal-400'}`}>
                {isAlreadyActive ? <CheckCircle2 className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-extrabold text-sm text-white">
                    {isAlreadyActive 
                      ? (isTa ? 'AutoPay தற்போது செயலில் உள்ளது!' : 'AutoPay is Currently Active!')
                      : (isTa ? 'தவணை தாமத கட்டணங்களை 100% தவிர்க்கவும்' : 'Zero Late Fees — 100% Guaranteed On-Time Payments')}
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isAlreadyActive
                    ? `${isTa ? 'உங்கள் மாதாந்திர தவணை' : 'Your monthly EMI of'} ${formatCurrency(monthlyEmi)} ${isTa ? 'ஒவ்வொரு தவணை தேதியிலும் தானாகவே கழிக்கப்படும்.' : 'will be automatically debited on your scheduled due date.'} (Ref: ${autoPay.mandateRef || 'Active'})`
                    : (isTa 
                        ? 'ஒரு முறை AutoPay அமைத்துவிட்டால், ஒவ்வொரு மாதமும் கைமுறையாக பணம் செலுத்த வேண்டிய அவசியமில்லை. உங்கள் வங்கி அல்லது UPI செயலியில் இருந்து தானாகவே கழிக்கப்பட்டு அதிகாரப்பூர்வ ரசீது உடனே பதிவாகும்.'
                        : 'Authorize once via Google Pay, PhonePe, or Bank Standing Instruction. Your monthly EMI is auto-debited on the due date, maintaining your CIBIL score.')}
                </p>
              </div>
            </div>
          </div>

          {/* Mandate Summary Pill Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold">{isTa ? 'மாதாந்திர தவணை' : 'Monthly EMI'}</span>
              <p className="font-black text-sm text-white mt-0.5">{formatCurrency(monthlyEmi)}</p>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold">{isTa ? 'அடுத்த தவணை தேதி' : 'Next Due Date'}</span>
              <p className="font-black text-sm text-teal-400 mt-0.5">{formatDate(nextDueDate)}</p>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold">{isTa ? 'கால அளவு' : 'Duration'}</span>
              <p className="font-bold text-sm text-slate-200 mt-0.5">{customer.emiDuration} Months {Number(customer.emiDuration) >= 12 ? `(${(Number(customer.emiDuration) / 12).toFixed(1).replace('.0', '')} Yrs)` : ''}</p>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold">{isTa ? 'அதிர்வெண்' : 'Frequency'}</span>
              <p className="font-bold text-sm text-slate-200 mt-0.5">{isTa ? 'மாதாந்திரம்' : 'Monthly'}</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex p-1 bg-slate-950 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('upi')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === 'upi'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{isTa ? 'UPI ஆட்டோபே' : 'UPI AutoPay'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bank')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === 'bank'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>{isTa ? 'வங்கி கட்டளை (SI)' : 'Bank Standing Mandate'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('assist')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === 'assist'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{isTa ? 'உதவிக்கு' : 'Assisted Setup'}</span>
            </button>
          </div>

          {/* TAB 1: UPI AUTOPAY */}
          {activeTab === 'upi' && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <p className="text-xs text-slate-300">
                  {isTa 
                    ? 'உங்கள் மொபைலில் உள்ள UPI செயலியைத் தேர்ந்தெடுக்கவும். ஒருமுறை உங்கள் UPI பின்னை உள்ளிட்டு மாதாந்திர அனுமதியை உறுதி செய்யவும்:' 
                    : 'Select your preferred UPI app below. Enter your UPI PIN once to authorize the recurring monthly EMI deduction:'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleLaunchUpiAutoPay('gpay')}
                    className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-left flex items-center space-x-2 text-xs font-bold transition-all hover:scale-[1.01]"
                  >
                    <span className="text-blue-500 font-black">G</span>
                    <span className="text-red-500 font-black">P</span>
                    <span className="text-yellow-500 font-black">a</span>
                    <span className="text-green-500 font-black">y</span>
                    <span>Google Pay AutoPay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLaunchUpiAutoPay('phonepe')}
                    className="p-3 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/40 rounded-xl text-left flex items-center space-x-2 text-xs font-bold transition-all hover:scale-[1.01]"
                  >
                    <Zap className="w-3.5 h-3.5 text-purple-400 fill-current" />
                    <span>PhonePe AutoPay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLaunchUpiAutoPay('paytm')}
                    className="p-3 bg-sky-950/60 hover:bg-sky-900/60 border border-sky-500/40 rounded-xl text-left flex items-center space-x-2 text-xs font-bold transition-all hover:scale-[1.01]"
                  >
                    <Landmark className="w-3.5 h-3.5 text-sky-400" />
                    <span>Paytm AutoPay</span>
                  </button>
                </div>
              </div>

              {/* UPI ID Details */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">{isTa ? 'பெறுநரின் UPI ஐடி' : 'Mandate Beneficiary UPI ID'}</span>
                  <span className="font-mono font-bold text-teal-300 mt-0.5 block">{upiId}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(upiId, 'upi')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center space-x-1 transition-colors"
                >
                  {copiedUpi ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Reference / UMN Number input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-300">
                  {isTa ? 'UPI மாண்டேட் எண் (UMN) அல்லது குறிப்பு எண்:' : 'UPI Mandate Reference Number (UMN / Transaction ID):'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={mandateRef}
                    onChange={(e) => setMandateRef(e.target.value)}
                    placeholder="e.g. UMN-9823487239"
                    className="flex-1 px-3 py-2 text-xs font-mono font-bold bg-slate-950 border border-slate-700 rounded-xl outline-none focus:ring-1 focus:ring-teal-500 text-white"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveAutoPay('UPI_AUTOPAY')}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shrink-0 shadow-md"
                  >
                    {saving ? '...' : (isTa ? 'செயல்படுத்து' : 'Confirm Active')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BANK STANDING INSTRUCTION */}
          {activeTab === 'bank' && (
            <div className="space-y-4 animate-fade-in text-xs">
              <p className="text-slate-300 leading-relaxed">
                {isTa
                  ? 'உங்கள் வங்கி செயலியில் (SBI YONO, Canara ai1, iMobile, HDFC) "Standing Instruction (SI)" அல்லது "Recurring Auto-Transfer" மூலம் மாதாந்திர தானியங்கி தவணையை அமைக்கலாம்:'
                  : 'You can set up a recurring Standing Instruction (SI) or scheduled monthly transfer inside your bank app (SBI YONO, Canara ai1, HDFC, etc.) to MRS Solar:'}
              </p>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">{isTa ? 'வங்கி பெயர்' : 'Bank Name'}</span>
                  <span className="font-bold text-white">State Bank of India</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80 items-center">
                  <span className="text-slate-400">{isTa ? 'கணக்கு எண்' : 'Account Number'}</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-teal-300">4218 0150 0982</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('421801500982', 'acc')}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                      title="Copy"
                    >
                      {copiedAcc ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">{isTa ? 'IFSC குறியீடு' : 'IFSC Code'}</span>
                  <span className="font-mono font-bold text-white">SBIN0000940</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">{isTa ? 'கணக்கு வைத்திருப்பவர்' : 'Account Holder'}</span>
                  <span className="font-bold text-white">Mr Santhoshkumar R / MRS Solar</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-300">
                  {isTa ? 'வங்கி கட்டளை குறிப்பு எண் (Bank Mandate Ref):' : 'Bank SI Reference / Mandate Number:'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={mandateRef}
                    onChange={(e) => setMandateRef(e.target.value)}
                    placeholder="e.g. SI-SBI-2026-XXXX"
                    className="flex-1 px-3 py-2 text-xs font-mono font-bold bg-slate-950 border border-slate-700 rounded-xl outline-none focus:ring-1 focus:ring-teal-500 text-white"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveAutoPay('BANK_MANDATE')}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shrink-0 shadow-md"
                  >
                    {saving ? '...' : (isTa ? 'சேமி' : 'Save Mandate')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ASSISTED SETUP */}
          {activeTab === 'assist' && (
            <div className="space-y-4 animate-fade-in text-xs">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <h5 className="font-bold text-white text-sm">
                  {isTa ? 'நேரடி வங்கி eNACH படிவம் மூலம் உதவ வேண்டுமா?' : 'Need Help Setting Up Bank Auto-Debit?'}
                </h5>
                <p className="text-slate-300 leading-relaxed">
                  {isTa
                    ? 'எங்கள் வாடிக்கையாளர் சேவை அலுவலர் உங்கள் வங்கிக்கு தேவையான eNACH அல்லது UPI AutoPay கட்டளையை சில நிமிடங்களில் செயல்படுத்த உதவுவார்.'
                    : 'Our customer support team can assist you in generating an official eNACH paper or digital mandate directly linked to your savings bank account.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleWhatsAppAssist}
                className="w-full py-3.5 bg-[#00a884] hover:bg-[#009272] text-white font-extrabold rounded-2xl flex items-center justify-center space-x-2 text-sm shadow-xl shadow-emerald-950/40 transition-all hover:scale-[1.01] active:scale-95"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>{isTa ? 'வாட்ஸ்அப் மூலம் உதவி பெறவும்' : 'Request AutoPay Setup on WhatsApp'}</span>
              </button>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="relative z-10 p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
          {isAlreadyActive ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveAutoPay(autoPay.type || 'UPI_AUTOPAY', 'Disabled')}
              className="px-3.5 py-2 rounded-xl bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/80 text-xs font-bold transition-colors"
            >
              {isTa ? 'AutoPay முடக்கு' : 'Disable AutoPay'}
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">
              {isTa ? 'எப்போது வேண்டுமானாலும் ரத்து செய்யலாம்' : 'Cancel or manage mandate anytime'}
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition-colors"
          >
            {isTa ? 'மூடு' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
}
