import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, Send, Users, CheckCircle2, Clock, 
  FileText, IndianRupee, Sparkles, Copy, Check, Sun, ShieldCheck, History
} from 'lucide-react';
import api from '../utils/api.js';

export default function ManagerWhatsAppEngine({ isTa = false }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [templateType, setTemplateType] = useState('emi_due'); // 'emi_due' | 'receipt' | 'subsidy' | 'generation'
  const [customPhone, setCustomPhone] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [dispatchedSuccess, setDispatchedSuccess] = useState(false);
  const [dispatchHistory, setDispatchHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mrs_whatsapp_logs') || '[]');
    } catch {
      return [];
    }
  });

  // Fetch customers for selector
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get('/admin/customers');
        const list = res.data?.customers || res.data || [];
        setCustomers(Array.isArray(list) ? list : []);
        if (list.length > 0) {
          setSelectedCustomerId(list[0]._id || list[0].id || list[0].customerId);
          setSelectedCustomer(list[0]);
          setCustomPhone(list[0].phone || '');
        }
      } catch (err) {
        console.error('Failed to load customers for WhatsApp engine:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  const handleSelectCustomer = (customerId) => {
    setSelectedCustomerId(customerId);
    const found = customers.find(c => (c._id || c.id || c.customerId) === customerId);
    if (found) {
      setSelectedCustomer(found);
      setCustomPhone(found.phone || '');
    }
  };

  // Generate message based on template
  useEffect(() => {
    const name = selectedCustomer?.fullName || selectedCustomer?.name || 'Customer';
    const capacity = selectedCustomer?.solarCapacity || 3;
    const emiAmount = selectedCustomer?.monthlyEmi || 2450;
    const cleanPhone = (customPhone || '').replace(/\D/g, '');

    let text = '';
    if (templateType === 'emi_due') {
      text = isTa
        ? `☀️ *MRS SOLAR - மாதாந்திர சோலார் தவணை (EMI) நினைவூட்டல்* ☀️\n\nஅன்புடையீர் ${name},\n\nஉங்கள் ${capacity} kW கூரை சோலார் கட்டமைப்பிற்கான மாதாந்திர கடன் தவணைத் தொகை (EMI) *₹${emiAmount.toLocaleString('en-IN')}* செலுத்துவதற்கான கடைசி நாள் இன்னும் 3 நாட்களில் முடிவடைகிறது.\n\n✅ *தவணைத் தொகை:* ₹${emiAmount.toLocaleString('en-IN')}\n⚡ *கட்டமைப்பு:* ${capacity} kW On-Grid Rooftop\n\nகட்டணத்தை உடனடியாக செலுத்த அல்லது விபரங்களுக்கு:\n🌐 போர்டல்: https://mrs-solar-yj6e.vercel.app/login\n📞 தொடர்பு: +91 80724 54996\n\nநன்றி,\n*MRS Solar Associates, Tamil Nadu*`
        : `☀️ *MRS SOLAR - Solar Loan EMI Due Reminder* ☀️\n\nDear ${name},\n\nThis is a gentle reminder that your monthly solar loan EMI of *₹${emiAmount.toLocaleString('en-IN')}* for your *${capacity} kW* rooftop solar system is due in 3 days.\n\n✅ *Due Amount:* ₹${emiAmount.toLocaleString('en-IN')}\n⚡ *System:* ${capacity} kW On-Grid Rooftop\n\nPay securely or check your net-meter bill status:\n🌐 Customer Portal: https://mrs-solar-yj6e.vercel.app/login\n📞 Helpdesk: +91 80724 54996\n\nWarm regards,\n*MRS Solar Associates*`;
    } else if (templateType === 'receipt') {
      const receiptNo = `REC-${Math.floor(100000 + Math.random() * 900000)}`;
      text = isTa
        ? `✅ *MRS SOLAR - தவணை ரசீது உறுதிப்படுத்தல்* ✅\n\nஅன்புடையீர் ${name},\n\nஉங்கள் ${capacity} kW சோலார் அமைப்பிற்கான தவணைத் தொகை *₹${emiAmount.toLocaleString('en-IN')}* வெற்றிகரமாக வரவு வைக்கப்பட்டது.\n\n📄 *ரசீது எண்:* ${receiptNo}\n📅 *தேதி:* ${new Date().toLocaleDateString('en-IN')}\n⚡ *கட்டமைப்பு நிலை:* Active (Green Energy Exporting)\n\nஉங்கள் கணக்கு அறிக்கையை போர்ட்டலில் பதிவிறக்கம் செய்து கொள்ளலாம்:\n🌐 https://mrs-solar-yj6e.vercel.app/login\n\nநன்றி,\n*MRS Solar Associates*`
        : `✅ *MRS SOLAR - Payment Receipt Acknowledgment* ✅\n\nDear ${name},\n\nWe have successfully received your payment of *₹${emiAmount.toLocaleString('en-IN')}* towards your ${capacity} kW rooftop solar system.\n\n📄 *Receipt No:* ${receiptNo}\n📅 *Date:* ${new Date().toLocaleDateString('en-IN')}\n⚡ *System Status:* Active & Connected to TNEB\n\nDownload your full digital receipt here:\n🌐 https://mrs-solar-yj6e.vercel.app/login\n\nThank you,\n*MRS Solar Associates*`;
    } else if (templateType === 'subsidy') {
      text = isTa
        ? `🏛️ *MRS SOLAR - PM சூர்யா கர் மானிய நிலை அறிக்கை* 🏛️\n\nஅன்புடையீர் ${name},\n\nமத்திய அரசின் *PM சூர்யா கர் முஃப்த் பிஜ்லி யோஜனா* திட்டத்தின் கீழ் உங்கள் ${capacity} kW அமைப்பிற்கான மானிய விண்ணப்பம் அடுத்த நிலைக்கு நகர்த்தப்பட்டுள்ளது.\n\n📌 *விண்ணப்ப நிலை:* TANGEDCO நெட்-மீட்டர் ஆய்வு நிறைவடைந்தது (Verified)\n💰 *மானியம் தொகை:* ₹78,000 நேரடி வங்கி வரவு (DBT) விரைவில்\n\nவிபரங்களை உங்கள் போர்ட்டலில் பார்வையிடவும்:\n🌐 https://mrs-solar-yj6e.vercel.app/login\n\n*MRS Solar Associates*`
        : `🏛️ *MRS SOLAR - PM Surya Ghar Subsidy Update* 🏛️\n\nDear ${name},\n\nGreat news! Your central government direct subsidy application under *PM Surya Ghar Muft Bijli Yojana* for your ${capacity} kW system has advanced to the next milestone.\n\n📌 *Milestone:* TANGEDCO Net-Meter Verification Approved\n💰 *Approved Subsidy:* Up to ₹78,000 direct bank DBT credit\n\nTrack your progress in real-time:\n🌐 https://mrs-solar-yj6e.vercel.app/login\n\n*MRS Solar Associates*`;
    } else if (templateType === 'generation') {
      const monthlyUnits = Math.round(capacity * 4.3 * 30);
      const savings = Math.round(monthlyUnits * 6.8);
      text = isTa
        ? `📊 *MRS SOLAR - மாதாந்திர சோலார் மின் உற்பத்தி அறிக்கை* 📊\n\nஅன்புடையீர் ${name},\n\nகடந்த மாதத்தில் உங்கள் ${capacity} kW சோலார் கூரை அமைப்பு வெற்றிகரமாக உற்பத்தி செய்த மின்சாரம் மற்றும் சேமிப்பு விவரம்:\n\n⚡ *உற்பத்தி செய்யப்பட்ட அலகுகள்:* ~${monthlyUnits} Units (kWh)\n💰 *TNEB கட்டண சேமிப்பு:* ~₹${savings.toLocaleString('en-IN')}\n🌱 *குறைக்கப்பட்ட CO₂:* ~${Math.round(monthlyUnits * 0.82)} kg\n\nஉங்கள் சோலார் அமைப்பின் முழுமையான உற்பத்திப் பதிவுகளைப் பார்க்க:\n🌐 https://mrs-solar-yj6e.vercel.app/login\n\n*MRS Solar Associates*`
        : `📊 *MRS SOLAR - Monthly Green Energy Report* 📊\n\nDear ${name},\n\nHere is the monthly performance summary of your *${capacity} kW* rooftop solar installation:\n\n⚡ *Total Solar Generated:* ~${monthlyUnits} kWh\n💰 *Estimated TNEB Bill Savings:* ~₹${savings.toLocaleString('en-IN')}\n🌱 *Carbon CO₂ Avoided:* ~${Math.round(monthlyUnits * 0.82)} kg\n\nView live telemetry and 7-day generation charts:\n🌐 https://mrs-solar-yj6e.vercel.app/login\n\n*MRS Solar Associates*`;
    }
    setCustomMessage(text);
  }, [templateType, selectedCustomer, customPhone, isTa]);

  const handleCopyMessage = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(customMessage).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDispatchWhatsApp = () => {
    let phone = (customPhone || '').replace(/\D/g, '');
    if (phone.length === 10) {
      phone = `91${phone}`;
    }
    if (!phone) {
      alert(isTa ? 'தயவுசெய்து தொலைபேசி எண்ணை உள்ளிடவும்.' : 'Please enter a valid mobile number.');
      return;
    }

    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(customMessage)}`;
    window.open(url, '_blank', 'noopener,noreferrer');

    // Save to dispatch history
    const newLog = {
      id: Date.now(),
      customerName: selectedCustomer?.fullName || selectedCustomer?.name || 'Customer',
      phone: phone,
      template: templateType,
      sentAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('en-IN')
    };

    const updated = [newLog, ...dispatchHistory.slice(0, 19)];
    setDispatchHistory(updated);
    try {
      localStorage.setItem('mrs_whatsapp_logs', JSON.stringify(updated));
    } catch {}

    setDispatchedSuccess(true);
    setTimeout(() => setDispatchedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#075e54] via-[#128c7e] to-[#25d366] text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
            <MessageCircle className="w-7 h-7 text-white fill-current" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-black tracking-tight">
                {isTa ? 'வாட்ஸ்அப் ஆட்டோமேஷன் என்ஜின்' : 'Automated WhatsApp Notification Engine'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white text-[#075e54] shadow-sm">
                100% FREE
              </span>
            </div>
            <p className="text-xs text-white/90 font-medium mt-0.5">
              {isTa 
                ? 'வாடிக்கையாளர்களுக்கு EMI நினைவூட்டல், கட்டண ரசீது, மற்றும் PM சூர்யா கர் மானிய அறிக்கைகளை 1-கிளிக்கில் அனுப்பலாம்.'
                : '1-click instant WhatsApp dispatch for EMI due alerts, payment receipts, PM Surya Ghar subsidy milestones, & green energy reports.'}
            </p>
          </div>
        </div>

        <div className="text-right self-start sm:self-auto">
          <span className="inline-block px-3 py-1 bg-black/20 rounded-xl text-xs font-mono font-bold">
            ⚡ Direct Universal Web API
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Controls & Customer Picker (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* CUSTOMER SELECTOR CARD */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
              <Users className="w-4 h-4 text-teal-600" />
              <span>{isTa ? 'வாடிக்கையாளரைத் தேர்ந்தெடுக்கவும்' : 'Select Customer'}</span>
            </h4>

            {loading ? (
              <div className="text-xs text-slate-400 animate-pulse">Loading customers...</div>
            ) : (
              <div>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                >
                  {customers.map((c) => (
                    <option key={c._id || c.id || c.customerId} value={c._id || c.id || c.customerId}>
                      {c.fullName || c.name} — ({c.customerId || 'ID'}) — {c.solarCapacity || 3} kW
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                {isTa ? 'வாட்ஸ்அப் மொபைல் எண்' : 'Customer WhatsApp Mobile'}
              </label>
              <input
                type="text"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* TEMPLATE PICKER */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                {isTa ? 'செய்தி மாதிரி (Template)' : 'Select Notification Template'}
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateType('emi_due')}
                  className={`p-2.5 rounded-xl text-left border transition-all text-xs font-bold ${
                    templateType === 'emi_due'
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-800 dark:text-amber-300 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isTa ? 'EMI நினைவூட்டல்' : 'EMI Due (3-Day)'}</span>
                  </div>
                  <span className="text-[10px] font-normal text-slate-400 block truncate">Upcoming loan payment</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateType('receipt')}
                  className={`p-2.5 rounded-xl text-left border transition-all text-xs font-bold ${
                    templateType === 'receipt'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isTa ? 'கட்டண ரசீது' : 'Payment Receipt'}</span>
                  </div>
                  <span className="text-[10px] font-normal text-slate-400 block truncate">Instant acknowledgment</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateType('subsidy')}
                  className={`p-2.5 rounded-xl text-left border transition-all text-xs font-bold ${
                    templateType === 'subsidy'
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-800 dark:text-blue-300 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isTa ? 'மானியம் அறிக்கை' : 'PM Surya Ghar'}</span>
                  </div>
                  <span className="text-[10px] font-normal text-slate-400 block truncate">₹78,000 DBT milestone</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateType('generation')}
                  className={`p-2.5 rounded-xl text-left border transition-all text-xs font-bold ${
                    templateType === 'generation'
                      ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-500 text-teal-800 dark:text-teal-300 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 mb-1">
                    <Sun className="w-3.5 h-3.5 text-teal-600" />
                    <span>{isTa ? 'உற்பத்தி அறிக்கை' : 'Energy Report'}</span>
                  </div>
                  <span className="text-[10px] font-normal text-slate-400 block truncate">Monthly solar generation</span>
                </button>
              </div>
            </div>

          </div>

          {/* DISPATCH HISTORY CARD */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <History className="w-3.5 h-3.5" />
                <span>{isTa ? 'சமீபத்திய செய்திகள்' : 'Recent Dispatches'}</span>
              </span>
              <span className="text-[10px] text-slate-400">{dispatchHistory.length} sent</span>
            </h5>

            {dispatchHistory.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No WhatsApp dispatches recorded this session.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {dispatchHistory.slice(0, 5).map((log) => (
                  <div key={log.id} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-[11px] flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">{log.customerName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">+{log.phone} • {log.template}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{log.sentAt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Live Message Preview & 1-Click Dispatch (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>{isTa ? 'வாட்ஸ்அப் செய்தி முன்னோட்டம்' : 'Live WhatsApp Message Preview'}</span>
              </h4>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-teal-600 text-[11px] font-bold flex items-center space-x-1 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? (isTa ? 'நகலெடுக்கப்பட்டது!' : 'Copied!') : (isTa ? 'நகலெடு' : 'Copy Text')}</span>
                </button>
              </div>
            </div>

            {/* MESSAGE TEXTAREA */}
            <div className="relative">
              <textarea
                rows={12}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full bg-[#efeae2]/40 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs font-sans text-slate-800 dark:text-slate-100 leading-relaxed outline-none focus:ring-2 focus:ring-[#00a884] resize-none shadow-inner"
              />
            </div>

            {/* SEND BUTTON */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                {isTa
                  ? 'கிளிக் செய்தவுடன் வாட்ஸ்அப் இணையதளம் அல்லது மொபைல் செயலி தானாகத் திறக்கும்.'
                  : 'Clicking opens WhatsApp Web or WhatsApp Mobile with pre-composed text ready to send.'}
              </span>

              <button
                type="button"
                onClick={handleDispatchWhatsApp}
                className="px-6 py-3 rounded-2xl bg-[#00a884] hover:bg-[#009272] text-white text-xs font-extrabold shadow-lg shadow-emerald-950/20 flex items-center justify-center space-x-2 transition-all hover:scale-[1.02] active:scale-98 shrink-0"
              >
                {dispatchedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>{isTa ? 'அனுப்பப்பட்டது!' : 'Dispatched to WhatsApp!'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-white" />
                    <span>{isTa ? 'வாட்ஸ்அப் மூலம் உடனடியாக அனுப்பு' : 'Send via WhatsApp (Free)'}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
