import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api.js';
import { 
  CreditCard, CheckCircle, AlertTriangle, ExternalLink, 
  Copy, Check, ShieldCheck, Smartphone, QrCode, Building,
  Save, RefreshCw, Zap, Info, ArrowUpRight, Mail
} from 'lucide-react';
import { getLanguage, translations } from '../../utils/translations.js';

export default function PaymentSettings() {
  const [lang, setLang] = useState(getLanguage);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedField, setCopiedField] = useState('');

  const [formData, setFormData] = useState({
    merchantUpiId: 'rsanthoshkumar376@oksbi',
    merchantName: 'MRS SOLAR ENERGY',
    merchantPhone: '8072454996',
    businessType: 'Google Pay for Business',
    accountNumber: '',
    ifscCode: '',
    bankName: 'State Bank of India',
    accountHolderName: 'MRS SOLAR ENERGY',
    qrNote: 'MRS SOLAR EMI Payment'
  });

  useEffect(() => {
    const handleLangChange = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLangChange);
    return () => window.removeEventListener('language-change', handleLangChange);
  }, []);

  const fetchPaymentConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/payment-settings');
      if (res.data) {
        setFormData({
          merchantUpiId: res.data.merchantUpiId || 'rsanthoshkumar376@oksbi',
          merchantName: res.data.merchantName || 'MRS SOLAR ENERGY',
          merchantPhone: res.data.merchantPhone || '8072454996',
          businessType: res.data.businessType || 'Google Pay for Business',
          accountNumber: res.data.accountNumber || '',
          ifscCode: res.data.ifscCode || '',
          bankName: res.data.bankName || 'State Bank of India',
          accountHolderName: res.data.accountHolderName || 'MRS SOLAR ENERGY',
          qrNote: res.data.qrNote || 'MRS SOLAR EMI Payment'
        });
      }
    } catch (err) {
      console.error('Failed to load payment settings:', err);
      setErrorMessage('Could not load current settings from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentConfig();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess('');
    setErrorMessage('');

    if (!formData.merchantUpiId.includes('@')) {
      setErrorMessage(lang === 'ta' ? 'சரியான UPI ID உள்ளிடவும் (e.g. mrssolar@okbizaxis)' : 'Please enter a valid UPI ID with @ symbol');
      setSaving(false);
      return;
    }

    try {
      const res = await api.post('/admin/payment-settings', formData);
      setSaveSuccess(res.data.message || (lang === 'ta' ? 'அமைப்புகள் வெற்றிகரமாக சேமிக்கப்பட்டன!' : 'Payment settings saved successfully!'));
      setTimeout(() => setSaveSuccess(''), 5000);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || 'Failed to save payment settings');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text, fieldName) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2500);
  };

  // Sample live UPI link calculation for preview
  const previewAmount = '5500.00';
  const previewNote = encodeURIComponent(formData.qrNote || 'MRS SOLAR EMI Payment');
  const previewTr = `MRS1${Date.now()}`.substring(0, 30);
  const previewUpiUri = `upi://pay?pa=${formData.merchantUpiId}&pn=${encodeURIComponent(formData.merchantName)}&tr=${previewTr}&am=${previewAmount}&cu=INR&tn=${previewNote}`;
  const previewQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(previewUpiUri)}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-cyan-800 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold mb-3 tracking-wide">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>{lang === 'ta' ? 'வணிகர் கட்டண ஒருங்கிணைப்பு' : 'Merchant Payment Integration (0% Fee)'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {lang === 'ta' ? 'Google Pay / PhonePe வணிகர் கணக்கு அமைப்புகள்' : 'Google Pay & PhonePe Business Settings'}
            </h1>
            <p className="text-teal-100 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              {lang === 'ta'
                ? 'உங்கள் வணிகர் UPI கணக்கை உள்ளமைப்பதன் மூலம் வாடிக்கையாளர்கள் தடையின்றி கட்டணங்களைச் செலுத்தலாம். வங்கி வரம்புகளோ அல்லது நிராகரிப்புகளோ ஏற்படாது.'
                : 'Configure your verified Merchant UPI ID & bank accounts. Customers can seamlessly pay EMIs via Google Pay, PhonePe, Paytm, or direct IMPS with 0% gateway fees.'}
            </p>
          </div>

          <button
            onClick={fetchPaymentConfig}
            disabled={loading}
            className="self-start md:self-center px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{lang === 'ta' ? 'புதுப்பி' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* SETTINGS TABS SWITCHER */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-xs font-bold">
        <span className="pb-3 border-b-2 border-teal-600 text-teal-600 dark:text-teal-400 flex items-center space-x-2 cursor-default">
          <CreditCard className="w-4 h-4 text-emerald-600" />
          <span>{lang === 'ta' ? 'Google Pay & UPI வணிகர் அமைப்புகள்' : 'Google Pay & UPI Merchant Settings'}</span>
        </span>
        <Link
          to="/admin/email-settings"
          className="pb-3 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 flex items-center space-x-2 transition-colors"
        >
          <Mail className="w-4 h-4" />
          <span>{lang === 'ta' ? 'மின்னஞ்சல் & ரசீது அமைப்புகள்' : 'Email & SMTP Delivery'}</span>
        </Link>
      </div>

      {/* FEEDBACK ALERTS */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs sm:text-sm flex items-center space-x-2 shadow-sm animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{saveSuccess}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 rounded-2xl text-xs sm:text-sm flex items-center space-x-2 shadow-sm animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* MAIN CONFIGURATION FORM (COL 1 & 2) */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-950 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            
            <div className="border-b border-slate-100 dark:border-slate-850 pb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-teal-600" />
                <span>{lang === 'ta' ? 'முதன்மைக் கட்டணத் தகவல் (Primary UPI)' : 'Primary Merchant UPI Information'}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {lang === 'ta' 
                  ? 'இந்த UPI ID வாடிக்கையாளர்களின் அனைத்து கட்டணத் திரைகளிலும் QR குறியீடுகளிலும் தானாகவே பயன்படுத்தப்படும்.'
                  : 'This VPA & Name will be dynamically injected into all customer payment modals, QR codes, and 1-tap app buttons.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Merchant UPI ID */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>{lang === 'ta' ? 'வணிகர் UPI ID (Merchant VPA):' : 'Merchant UPI ID / VPA:'}</span>
                  <span className="text-[10px] text-teal-600 font-normal">e.g. mrssolar@okbizaxis or mrssolar@ybl</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="merchantUpiId"
                    value={formData.merchantUpiId}
                    onChange={handleChange}
                    required
                    placeholder="mrssolar@okbizaxis"
                    className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-mono text-slate-800 dark:text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(formData.merchantUpiId, 'upi')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-teal-600"
                    title="Copy"
                  >
                    {copiedField === 'upi' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Merchant Business Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'ta' ? 'வணிகப் பெயர் (Business Name):' : 'Display Business Name:'}
                </label>
                <input
                  type="text"
                  name="merchantName"
                  value={formData.merchantName}
                  onChange={handleChange}
                  required
                  placeholder="MRS SOLAR ENERGY"
                  className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Registered Mobile Number */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>{lang === 'ta' ? 'பதிவு செய்யப்பட்ட மொபைல் எண்:' : 'Registered Mobile Number:'}</span>
                  <span className="text-[10px] text-indigo-600 font-normal">PhonePe / GPay Link</span>
                </label>
                <input
                  type="tel"
                  name="merchantPhone"
                  value={formData.merchantPhone}
                  onChange={handleChange}
                  required
                  maxLength={10}
                  placeholder="8072454996"
                  className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-mono text-slate-800 dark:text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Business Account Type */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'ta' ? 'வணிகர் கணக்கு சேவை வழங்குநர்:' : 'Merchant Provider Service:'}
                </label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleChange}
                  className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                >
                  <option value="Google Pay for Business">Google Pay for Business (0% Fee • Instant Settlement)</option>
                  <option value="PhonePe Business">PhonePe Business (0% Fee • Instant Voice Alert)</option>
                  <option value="Paytm for Business">Paytm for Business</option>
                  <option value="BharatPe">BharatPe QR</option>
                  <option value="Personal UPI">Personal Bank UPI (Subject to P2P self-payment limits)</option>
                </select>
              </div>
            </div>

            {/* OPTIONAL DIRECT BANK TRANSFER DETAILS CARD */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-850 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Building className="w-4 h-4 text-emerald-600" />
                  <span>{lang === 'ta' ? 'நேரடி வங்கிக் கணக்கு விவரங்கள் (Direct IMPS/NEFT Backup)' : 'Bank Account Details (Direct IMPS / NEFT Transfer Backup)'}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {lang === 'ta' 
                    ? 'வாடிக்கையாளர் UPI பயன்படுத்த முடியாத பட்சத்தில், இந்த வங்கிக் கணக்கிற்கு நேரடியாக IMPS/NEFT மூலம் அனுப்பலாம்.'
                    : 'If configured, customers whose UPI is blocked by bank limits can copy these details to make direct IMPS/NEFT transfers.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {lang === 'ta' ? 'வங்கிப் பெயர் (Bank Name):' : 'Bank Name:'}
                  </label>
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    placeholder="State Bank of India"
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {lang === 'ta' ? 'கணக்கு வைத்திருப்பவர் பெயர்:' : 'Account Holder Name:'}
                  </label>
                  <input
                    type="text"
                    name="accountHolderName"
                    value={formData.accountHolderName}
                    onChange={handleChange}
                    placeholder="MRS SOLAR ENERGY"
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {lang === 'ta' ? 'வங்கி கணக்கு எண் (Account Number):' : 'Account Number:'}
                  </label>
                  <input
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleChange}
                    placeholder="e.g. 40123456789"
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-800 dark:text-white outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {lang === 'ta' ? 'IFSC குறியீடு (IFSC Code):' : 'IFSC Code:'}
                  </label>
                  <input
                    type="text"
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={handleChange}
                    placeholder="SBIN0001234"
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono uppercase text-slate-800 dark:text-white outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* SAVE BUTTON */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="py-3 px-6 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-600/50 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md shadow-teal-600/20 transition-all flex items-center space-x-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? (lang === 'ta' ? 'சேமிக்கப்படுகிறது...' : 'Saving Changes...') : (lang === 'ta' ? 'அமைப்புகளைச் சேமி' : 'Save Payment Settings')}</span>
              </button>
            </div>

          </form>

          {/* 5-MINUTE STEP-BY-STEP SETUP GUIDE */}
          <div className="bg-white dark:bg-slate-950 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-850 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>{lang === 'ta' ? '5 நிமிடத்தில் Google Pay for Business தொடங்குவது எப்படி?' : 'How to set up Google Pay for Business in 5 Minutes'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {lang === 'ta' 
                    ? '100% இலவசம் • 0% கட்டணம் • வங்கிக் கணக்கில் உடனடி வரவு'
                    : '100% Free • 0% Transaction Fees • Instant Bank Settlement'}
                </p>
              </div>
              <a
                href="https://play.google.com/store/apps/details?id=com.google.android.apps.nbu.paisa.merchant"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center space-x-1 text-xs text-teal-600 font-bold hover:underline"
              >
                <span>Play Store Link</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs mb-1.5">1</span>
                <h4 className="font-bold text-slate-800 dark:text-white">Download App</h4>
                <p className="text-slate-500 leading-relaxed">
                  Search &quot;Google Pay for Business&quot; on Play Store using your mobile number <strong>8072454996</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs mb-1.5">2</span>
                <h4 className="font-bold text-slate-800 dark:text-white">Register Business</h4>
                <p className="text-slate-500 leading-relaxed">
                  Enter Business Name as &quot;MRS SOLAR&quot; and select your SBI Account for instant direct deposits.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs mb-1.5">3</span>
                <h4 className="font-bold text-slate-800 dark:text-white">Paste UPI ID Above</h4>
                <p className="text-slate-500 leading-relaxed">
                  Copy your official merchant UPI ID (ends in <code>@okbizaxis</code> or <code>@ybl</code>) and paste it into the field above!
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: LIVE SIMULATOR & PREVIEW (COL 3) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            
            <div className="border-b border-slate-100 dark:border-slate-850 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <QrCode className="w-4 h-4 text-teal-600" />
                <span>{lang === 'ta' ? 'வாடிக்கையாளர் நேரடி காட்சி (Live Customer Preview)' : 'Live Customer Preview'}</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {lang === 'ta' ? 'வாடிக்கையாளரின் திரையில் QR மற்றும் கட்டண விவரங்கள் இப்படித்தான் தோன்றும்:' : 'This is exactly what customers will scan & pay with:'}
              </p>
            </div>

            {/* PREVIEW QR CODE */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-teal-500/40 text-center">
              <img
                src={previewQrUrl}
                alt="Preview QR Code"
                className="w-44 h-44 mx-auto rounded-xl object-contain shadow-inner"
              />
              <div className="mt-2 text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                  Sample EMI: ₹5,500
                </span>
              </div>
            </div>

            {/* LIVE VERIFICATION CARD */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Receiver:</span>
                <span className="font-bold text-slate-800 dark:text-white">{formData.merchantName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Merchant VPA:</span>
                <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{formData.merchantUpiId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">UPI Phone:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formData.merchantPhone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Status:</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                  Active in Portal
                </span>
              </div>
            </div>

            {/* TEST INTENT LINK */}
            <div className="pt-2">
              <a
                href={previewUpiUri}
                className="w-full py-2.5 px-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center space-x-2 shadow-sm hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{lang === 'ta' ? 'UPI இணைப்பை சோதிக்கவும் (Test Intent)' : 'Test Sample UPI Deep Link'}</span>
              </a>
            </div>

            {/* BANK FAIL-SAFE CARD IF CONFIGURED */}
            {formData.accountNumber && (
              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/60 rounded-2xl space-y-1 text-xs">
                <p className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center space-x-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Direct Bank Transfer Active</span>
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  A/C: <span className="font-mono font-bold">{formData.accountNumber}</span> • IFSC: <span className="font-mono font-bold">{formData.ifscCode}</span>
                </p>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
