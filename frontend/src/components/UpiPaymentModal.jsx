import React, { useState, useEffect } from 'react';
import { 
  X, Download, Copy, Check, ExternalLink, Zap, 
  Phone, ShieldCheck, CreditCard, ArrowRight, CheckCircle2,
  AlertCircle, Smartphone, Building
} from 'lucide-react';
import api from '../utils/api.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { translations, getLanguage } from '../utils/translations.js';

export default function UpiPaymentModal({ 
  isOpen, 
  onClose, 
  emi, 
  customer, 
  onPaymentSubmitted,
  mode = 'customer' // 'customer' or 'admin'
}) {
  const [lang, setLang] = useState(getLanguage);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedMobile, setCopiedMobile] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedIfsc, setCopiedIfsc] = useState(false);
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [utrSuccess, setUtrSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('upi'); // 'upi', 'qr', or 'bank'

  // Dynamic Merchant Payment Configuration
  const [merchantConfig, setMerchantConfig] = useState({
    merchantUpiId: 'rsanthoshkumar376@oksbi',
    merchantName: 'MRS SOLAR ENERGY',
    merchantPhone: '8072454996',
    businessType: 'Google Pay for Business',
    accountNumber: '',
    ifscCode: '',
    bankName: 'State Bank of India',
    accountHolderName: 'MRS SOLAR ENERGY'
  });

  useEffect(() => {
    const handleLangChange = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLangChange);
    return () => window.removeEventListener('language-change', handleLangChange);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setUtrNumber(customer?.submittedUtr || '');
      setUtrSuccess(false);
      setErrorMessage('');

      // Fetch dynamic active merchant settings
      api.get('/customer/payment-settings')
        .then(res => {
          if (res.data) {
            setMerchantConfig(res.data);
          }
        })
        .catch(err => {
          console.warn('Using default payment settings:', err);
        });
    }
  }, [isOpen, customer]);

  if (!isOpen || !emi) return null;

  const t = translations[lang] || translations.en;
  const payeeVpa = merchantConfig.merchantUpiId || 'rsanthoshkumar376@oksbi';
  const payeeName = merchantConfig.merchantName || 'MRS SOLAR ENERGY';
  const payeeMobile = merchantConfig.merchantPhone || '8072454996';
  const isMerchantAccount = payeeVpa !== 'rsanthoshkumar376@oksbi' || merchantConfig.businessType?.includes('Business');

  const totalAmountNum = (Number(emi.emiAmount) || 0) + (Number(emi.lateFee) || 0);
  const formattedAmount = totalAmountNum.toFixed(2);
  const cleanCustId = (customer?.customerId || '').replace(/[^a-zA-Z0-9]/g, '');
  const note = `EMI_${emi.emiNumber}_${cleanCustId}`;

  // Unique Transaction Reference (tr required by NPCI & Google Pay for session validation)
  const tr = `MRS${emi.emiNumber}${Date.now()}`.substring(0, 30);

  // Standard UPI URI and targeted Android Intents
  const upiQuery = `pa=${payeeVpa}&pn=${encodeURIComponent(payeeName)}&tr=${tr}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent(note)}`;
  const universalUpi = `upi://pay?${upiQuery}`;
  const encodedUniversal = encodeURIComponent(universalUpi);

  const gpayIntent = `intent://pay?${upiQuery}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;S.browser_fallback_url=${encodedUniversal};end`;
  const phonepeIntent = `intent://pay?${upiQuery}#Intent;scheme=upi;package=com.phonepe.app;S.browser_fallback_url=${encodedUniversal};end`;
  const paytmIntent = `intent://pay?${upiQuery}#Intent;scheme=upi;package=net.one97.paytm;S.browser_fallback_url=${encodedUniversal};end`;
  const credIntent = `intent://pay?${upiQuery}#Intent;scheme=upi;package=com.dreamplug.androidapp;S.browser_fallback_url=${encodedUniversal};end`;

  // QR Code URL (high resolution)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(universalUpi)}`;

  const copyToClipboard = (text, type) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    if (type === 'upi') {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2500);
    } else if (type === 'mobile') {
      setCopiedMobile(true);
      setTimeout(() => setCopiedMobile(false), 2500);
    } else if (type === 'amount') {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2500);
    } else if (type === 'account') {
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2500);
    } else if (type === 'ifsc') {
      setCopiedIfsc(true);
      setTimeout(() => setCopiedIfsc(false), 2500);
    }
  };

  const handleDownloadQr = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `MRS_SOLAR_EMI_${emi.emiNumber}_Payment_QR.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenExternalBrowser = () => {
    const payPageUrl = `https://mrs-solar1.onrender.com/?pay=true&emi=${emi.emiNumber}&cust=${cleanCustId}&amt=${formattedAmount}`;
    window.open(payPageUrl, '_blank');
  };

  const handleSubmitUtr = async (e) => {
    e.preventDefault();
    const cleanUtr = utrNumber.trim();
    if (!cleanUtr || cleanUtr.length < 8) {
      setErrorMessage(lang === 'ta' ? 'சரியான 12-இலக்க UTR எண்ணை உள்ளிடவும்' : 'Please enter a valid 12-digit UTR/Reference number');
      return;
    }

    setSubmittingUtr(true);
    setErrorMessage('');
    try {
      if (mode === 'admin') {
        await api.post('/admin/payments/mark-paid', {
          customerId: customer.customerId || customer._id,
          emiNumber: emi.emiNumber,
          amount: totalAmountNum,
          baseEmiAmount: emi.emiAmount,
          lateFeePaid: emi.lateFee || 0,
          paymentMethod: 'UPI',
          referenceNumber: cleanUtr,
          paymentDate: new Date().toISOString()
        });
      } else {
        await api.post('/customer/notify-payment', {
          emiNumber: emi.emiNumber,
          amount: totalAmountNum,
          utrNumber: cleanUtr
        });
      }

      setUtrSuccess(true);
      if (onPaymentSubmitted) {
        onPaymentSubmitted(cleanUtr);
      }
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || 'Failed to submit payment reference');
    } finally {
      setSubmittingUtr(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-slate-950 w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-20 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-teal-700 via-emerald-600 to-cyan-700 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
          <div className="relative z-10">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-emerald-200" />
                <span>{mode === 'admin' ? (lang === 'ta' ? 'நிர்வாகி UPI வசூல்' : 'Admin UPI Collection') : (lang === 'ta' ? 'பாதுகாப்பான UPI கட்டணம்' : 'Secure UPI Repayment')}</span>
              </span>
              <span className="px-2 py-0.5 bg-emerald-400/30 text-emerald-100 text-[10px] font-bold rounded-full">
                {t.emiLabel || 'EMI'} #{emi.emiNumber}
              </span>
            </div>
            
            <div className="flex items-baseline justify-between mt-2">
              <h2 className="text-2xl sm:text-3xl font-black">{formatCurrency(totalAmountNum)}</h2>
              <span className="text-xs text-teal-100/90 font-medium">
                {emi.lateFee > 0 ? (lang === 'ta' ? `தாமதக் கட்டணம்: ₹${emi.lateFee}` : `Late Fee: ₹${emi.lateFee}`) : (lang === 'ta' ? 'அபராதம் இல்லை' : 'No late fee')}
              </span>
            </div>

            <p className="text-xs text-teal-100/90 mt-0.5 truncate">
              {customer?.fullName} • ID: <strong className="font-mono">{customer?.customerId}</strong>
            </p>
          </div>
        </div>

        {/* TAB TOGGLE: 1-Tap UPI Apps vs QR Code vs Bank Transfer */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-1.5 gap-1 text-[11px] sm:text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('upi')}
            className={`flex-1 py-2 px-2.5 rounded-xl flex items-center justify-center space-x-1 transition-all cursor-pointer ${
              activeTab === 'upi'
                ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="truncate">{lang === 'ta' ? 'UPI செயலிகள்' : 'UPI Apps'}</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2 px-2.5 rounded-xl flex items-center justify-center space-x-1 transition-all cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="truncate">{lang === 'ta' ? 'QR ஸ்கேன்' : 'QR Scan'}</span>
          </button>

          {merchantConfig.accountNumber && (
            <button
              type="button"
              onClick={() => setActiveTab('bank')}
              className={`flex-1 py-2 px-2.5 rounded-xl flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                activeTab === 'bank'
                  ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span className="truncate">{lang === 'ta' ? 'வங்கி பரிமாற்றம்' : 'Bank IMPS'}</span>
            </button>
          )}
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[68vh] overflow-y-auto">

          {activeTab === 'upi' && (
            /* TAB 1: 1-TAP UPI APP LAUNCHERS */
            <div className="space-y-3.5">
              
              {/* Active Merchant Banner / Bank Info */}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-3 text-left">
                <div className="flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed text-emerald-950 dark:text-emerald-200">
                    <p className="font-bold flex items-center space-x-1.5">
                      <span>{payeeName}</span>
                      <span className="text-[10px] bg-emerald-200/70 dark:bg-emerald-800/70 text-emerald-800 dark:text-emerald-100 px-1.5 py-0.2 rounded font-normal">
                        {merchantConfig.businessType || 'Verified Merchant'}
                      </span>
                    </p>
                    <p className="mt-0.5 text-emerald-800 dark:text-emerald-300 font-mono text-[10px]">
                      VPA: <strong>{payeeVpa}</strong> • 0% Fee
                    </p>
                  </div>
                </div>
              </div>

              {/* Self-Payment Warning (Only if personal account is still active) */}
              {!isMerchantAccount && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl p-2.5 text-left text-[11px] text-amber-900 dark:text-amber-200 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p>
                    {lang === 'ta'
                      ? 'குறிப்பு: உங்கள் சொந்த Google Pay கணக்கிலிருந்து உங்களுக்கே பணம் அனுப்பினால் வங்கி நிராகரிக்கும். வாடிக்கையாளரின் வேறு போனில் இருந்து செலுத்தவும்.'
                      : 'Note: If testing from your own phone linked to this bank account, UPI rejects paying oneself. Test from a customer phone or use PhonePe.'}
                  </p>
                </div>
              )}

              {/* GRID OF DIRECT ANCHOR LINKS (Guaranteed gesture handling in Android) */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Google Pay */}
                <a
                  href={gpayIntent}
                  onClick={() => copyToClipboard(payeeVpa, 'upi')}
                  className="py-3 px-3.5 bg-white hover:bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition-all hover:scale-105 active:scale-95 text-center group cursor-pointer"
                >
                  <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0 group-hover:scale-110 transition-transform"></span>
                  <span className="truncate">Google Pay</span>
                </a>

                {/* PhonePe */}
                <a
                  href={phonepeIntent}
                  onClick={() => copyToClipboard(payeeVpa, 'upi')}
                  className="py-3 px-3.5 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition-all hover:scale-105 active:scale-95 text-center group cursor-pointer"
                >
                  <span className="w-3 h-3 rounded-full bg-white shrink-0 group-hover:scale-110 transition-transform"></span>
                  <span className="truncate">PhonePe</span>
                </a>

                {/* Paytm */}
                <a
                  href={paytmIntent}
                  onClick={() => copyToClipboard(payeeVpa, 'upi')}
                  className="py-3 px-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition-all hover:scale-105 active:scale-95 text-center group cursor-pointer"
                >
                  <span className="w-3 h-3 rounded-full bg-cyan-200 shrink-0 group-hover:scale-110 transition-transform"></span>
                  <span className="truncate">Paytm</span>
                </a>

                {/* Any UPI / CRED */}
                <a
                  href={universalUpi}
                  onClick={() => copyToClipboard(payeeVpa, 'upi')}
                  className="py-3 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition-all hover:scale-105 active:scale-95 text-center group cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-yellow-300 fill-current shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="truncate">{lang === 'ta' ? 'அனைத்து UPI' : 'All UPI Apps'}</span>
                </a>
              </div>

              {/* Pay via UPI Mobile Number Option */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => copyToClipboard(payeeMobile, 'mobile')}
                  className="w-full py-2.5 px-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center space-x-2 shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
                >
                  <Phone className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>
                    {copiedMobile 
                      ? (lang === 'ta' ? 'நகலெடுக்கப்பட்டது! Google Pay / PhonePe-ல் ஒட்டவும்' : 'Copied! Paste in GPay / PhonePe to Pay')
                      : (lang === 'ta' ? `மொபைல் எண் மூலம் செலுத்த: ${payeeMobile}` : `Pay via UPI Mobile Number: ${payeeMobile}`)}
                  </span>
                </button>
              </div>

              {/* Direct UPI Universal Chooser fallback */}
              <div className="pt-0.5">
                <a
                  href={universalUpi}
                  onClick={() => copyToClipboard(payeeVpa, 'upi')}
                  className="w-full py-2.5 px-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center space-x-2 shadow-sm hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>{lang === 'ta' ? 'நேரடியாக UPI தேர்வியை திறக்கவும் (UPI Chooser)' : 'Launch Android UPI App Chooser Directly'}</span>
                </a>
              </div>

              {/* Fail-safe: Open in External Chrome */}
              <div className="text-center pt-0.5">
                <button
                  type="button"
                  onClick={handleOpenExternalBrowser}
                  className="inline-flex items-center space-x-1.5 text-[11px] font-semibold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{lang === 'ta' ? 'செயலியில் திறக்கவில்லையா? குரோம் உலாவியில் திறக்க' : "App not opening? Open payment in Chrome browser"}</span>
                </button>
              </div>

            </div>
          )}

          {activeTab === 'qr' && (
            /* TAB 2: QR CODE & MANUAL UPI DETAILS */
            <div className="space-y-4">
              
              {/* QR Code Container */}
              <div className="w-48 h-48 bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-teal-500/40 dark:border-teal-500/30 rounded-2xl flex items-center justify-center mx-auto p-2.5 relative shadow-inner">
                <img 
                  src={qrCodeUrl}
                  alt="MRS Solar UPI QR"
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>

              {/* Save QR to phone gallery */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="py-1.5 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center space-x-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>{lang === 'ta' ? 'QR படத்தை சேமிக்கவும் (Save QR)' : 'Save QR to Gallery'}</span>
                </button>
              </div>

              {/* Quick Copy UPI Credentials Card */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2 text-xs">
                
                {/* UPI ID */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">UPI ID:</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{payeeVpa}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(payeeVpa, 'upi')}
                      className="p-1 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/50 cursor-pointer"
                      title="Copy UPI ID"
                    >
                      {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Mobile / PhonePe Number */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Mobile:</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{payeeMobile}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(payeeMobile, 'mobile')}
                      className="p-1 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/50 cursor-pointer"
                      title="Copy Mobile Number"
                    >
                      {copiedMobile ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Amount:</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-teal-600 dark:text-teal-400">{formatCurrency(totalAmountNum)}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(formattedAmount, 'amount')}
                      className="p-1 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/50 cursor-pointer"
                      title="Copy Exact Amount"
                    >
                      {copiedAmount ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {activeTab === 'bank' && merchantConfig.accountNumber && (
            /* TAB 3: DIRECT BANK TRANSFER (IMPS / NEFT) */
            <div className="space-y-3.5">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-2xl text-[11px] text-blue-900 dark:text-blue-200 flex items-start space-x-2">
                <Building className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>
                  {lang === 'ta'
                    ? 'UPI தொழில்நுட்ப சிக்கல்கள் உள்ளதா? உங்கள் நெட் பேங்கிங் மூலம் இந்த வங்கிக் கணக்கிற்கு நேரடியாக IMPS/NEFT பணப் பரிமாற்றம் செய்யவும்.'
                    : 'Experiencing UPI issues? You can transfer directly to our bank account via IMPS or NEFT through any Net Banking or YONO app.'}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Bank:</span>
                  <span className="font-bold text-slate-800 dark:text-white">{merchantConfig.bankName || 'State Bank of India'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Account Name:</span>
                  <span className="font-bold text-slate-800 dark:text-white">{merchantConfig.accountHolderName || payeeName}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Account No:</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono font-bold text-slate-800 dark:text-white">{merchantConfig.accountNumber}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(merchantConfig.accountNumber, 'account')}
                      className="p-1 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/50 cursor-pointer"
                      title="Copy Account Number"
                    >
                      {copiedAccount ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">IFSC Code:</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono font-bold uppercase text-slate-800 dark:text-white">{merchantConfig.ifscCode}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(merchantConfig.ifscCode, 'ifsc')}
                      className="p-1 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/50 cursor-pointer"
                      title="Copy IFSC Code"
                    >
                      {copiedIfsc ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* UTR / REFERENCE NUMBER SUBMISSION FORM */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <form onSubmit={handleSubmitUtr} className="space-y-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  {mode === 'admin' 
                    ? (lang === 'ta' ? 'கட்டண UTR / குறிப்பு எண் உள்ளிடவும்:' : 'Enter 12-Digit UPI UTR to Verify & Mark Paid:')
                    : (lang === 'ta' ? 'பணம் செலுத்திய பின் 12-இலக்க UTR எண் உள்ளிடவும்:' : 'After Payment, Enter 12-Digit UPI UTR / Reference No:')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                    maxLength={25}
                    placeholder="e.g. 428190123456"
                    className="flex-1 py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-800 dark:text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                  <button
                    type="submit"
                    disabled={submittingUtr || !utrNumber.trim()}
                    className="py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-600/50 text-white font-bold rounded-xl text-xs shadow-md shadow-teal-600/10 transition-all shrink-0 cursor-pointer"
                  >
                    {submittingUtr 
                      ? (lang === 'ta' ? 'பதிவாகிறது...' : 'Submitting...') 
                      : mode === 'admin'
                      ? (lang === 'ta' ? 'சரிபார்' : 'Verify Paid')
                      : (lang === 'ta' ? 'சமர்ப்பி' : 'Submit')}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs flex items-center space-x-1.5 border border-red-200/60 dark:border-red-900/40">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {utrSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs flex items-center space-x-1.5 border border-emerald-200/60 dark:border-emerald-800/40">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    {mode === 'admin'
                      ? (lang === 'ta' ? 'கட்டணம் வெற்றிகரமாக பதிவு செய்யப்பட்டது!' : 'Payment verified and marked as Paid!')
                      : (lang === 'ta' ? 'UTR பெறப்பட்டது! நிர்வாகி விரைவில் சரிபார்ப்பார்.' : 'Payment submitted successfully! Admin will verify.')}
                  </span>
                </div>
              )}
            </form>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>NPCI / BHIM UPI Verified</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold cursor-pointer"
          >
            {t.cancel || 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
}
