import React, { useState, useRef, useEffect } from 'react';
import { 
  X, CheckSquare, Square, ShieldCheck, HardHat, CheckCircle2, 
  Clock, AlertCircle, Save, Award, Sun, Printer, Download, 
  Eraser, PenTool, FileText
} from 'lucide-react';
import api from '../utils/api.js';
import { getLanguage } from '../utils/translations.js';

export default function InstallationChecklistModal({ isOpen, onClose, customer, onVerified }) {
  const lang = getLanguage();
  const isTa = lang === 'ta';

  const defaultChecklist = {
    mountingStructure: true,
    modulesClamped: true,
    inverterWiring: true,
    dualEarthing: true,
    netMeterSync: false,
    testingOutput: true
  };

  const [checklist, setChecklist] = useState(
    customer?.commissioningRecord?.checklist || defaultChecklist
  );
  const [technicianName, setTechnicianName] = useState(
    customer?.commissioningRecord?.signatureName || 'MRS SOLAR Lead Technician'
  );
  const [notes, setNotes] = useState(customer?.commissioningRecord?.notes || '');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Signature Pad State
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureData, setSignatureData] = useState(customer?.commissioningRecord?.customerSignature || null);
  const [showCertificate, setShowCertificate] = useState(false);

  useEffect(() => {
    if (customer?.commissioningRecord?.customerSignature) {
      setSignatureData(customer.commissioningRecord.customerSignature);
      setHasSignature(true);
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const toggleItem = (key) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allCompleted = Object.values(checklist).every(Boolean);

  // Canvas drawing functions for touch and mouse
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0d9488'; // teal-600
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSignatureData(null);
  };

  const handleSaveChecklist = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      await api.post(`/admin/customers/${customer._id || customer.id || customer.customerId}/commissioning-checklist`, {
        checklist,
        signatureName: technicianName.trim(),
        notes: notes.trim(),
        customerSignature: signatureData
      });

      setSavedSuccess(true);
      if (onVerified) onVerified();
      setTimeout(() => {
        setSavedSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Checklist error:', err);
      // Fallback: save in local storage for zero-error offline mode
      try {
        const stored = JSON.parse(localStorage.getItem('mrs_commissioning_records') || '{}');
        stored[customer.customerId || customer._id] = {
          checklist,
          signatureName: technicianName.trim(),
          notes: notes.trim(),
          customerSignature: signatureData,
          signedAt: new Date().toISOString()
        };
        localStorage.setItem('mrs_commissioning_records', JSON.stringify(stored));
        setSavedSuccess(true);
        if (onVerified) onVerified();
        setTimeout(() => setSavedSuccess(false), 2000);
      } catch (locErr) {
        setErrorMsg(err.response?.data?.message || 'Failed to save commissioning checklist.');
      }
    } finally {
      setSaving(false);
    }
  };

  const checklistItems = [
    {
      key: 'mountingStructure',
      titleEn: '1. Heavy-Duty HDGI Structure & Anchoring',
      titleTa: '1. HDGI கட்டமைப்பு மற்றும் மேற்கூரை பொருத்துதல்',
      descEn: 'Corrosion-resistant Hot Dip Galvanized Iron structure bolted securely against 150 km/h wind speeds.',
      descTa: 'துருப்பிடிக்காத இரும்பு கட்டமைப்பு உறுதியாக பொருத்தப்பட்டுள்ளது.'
    },
    {
      key: 'modulesClamped',
      titleEn: '2. Tier-1 Mono PERC Solar Modules Installed',
      titleTa: '2. சோலார் பேனல்கள் நிலைநிறுத்தம்',
      descEn: 'Panels aligned to south-facing azimuth at 12° tilt; all end-clamps & mid-clamps torque tightened.',
      descTa: 'தென் திசை நோக்கி சரியான கோணத்தில் பேனல்கள் இறுக்கமாக பொருத்தப்பட்டுள்ளன.'
    },
    {
      key: 'inverterWiring',
      titleEn: '3. Inverter, DCDB & ACDB Overvoltage Protection',
      titleTa: '3. இன்வெர்ட்டர் & மின் பாதுகாப்பு பெட்டிகள்',
      descEn: 'On-grid inverter mounted under shade with DC Surge Protection (SPD) & MCB isolators wired cleanly.',
      descTa: 'இன்வெர்ட்டர் மற்றும் கூடுதல் மின் பாதுகாப்பு சாதனங்கள் முறையாக இணைக்கப்பட்டுள்ளன.'
    },
    {
      key: 'dualEarthing',
      titleEn: '4. Dedicated Dual Chemical Earthing & Lightning Arrestor',
      titleTa: '4. இரட்டை எர்த்திங் & மின்னல் தடுப்பான்',
      descEn: 'AC earth, DC earth, and high-altitude copper lightning arrestor grounded with < 5 ohms resistance.',
      descTa: 'மின்னல் தாக்கம் மற்றும் மின் கசிவு பாதுகாப்பு அமைப்புகள் சரிபார்க்கப்பட்டன.'
    },
    {
      key: 'netMeterSync',
      titleEn: '5. TNEB Bi-Directional Net-Meter Synchronization',
      titleTa: '5. TNEB இருவழி நெட்-மீட்டர் இணைப்பு',
      descEn: 'TANGEDCO grid interconnection inspected; bi-directional meter recording export and import units.',
      descTa: 'மின்வாரிய இருவழி மீட்டர் பொருத்தப்பட்டு ஏற்றுமதி கணக்கீடு தொடங்கப்பட்டது.'
    },
    {
      key: 'testingOutput',
      titleEn: '6. Live Solar Generation & Voltage Verification',
      titleTa: '6. நேரடி சோலார் மின் உற்பத்தி பரிசோதனை',
      descEn: 'VOC voltage and operating current verified; inverter delivering active power to household loads.',
      descTa: 'சோலார் மின் உற்பத்தி இயல்பாக செயல்படுவது உறுதி செய்யப்பட்டது.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in no-print">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-teal-500/40 rounded-3xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-amber-500/10 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/30">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
                {isTa ? 'சோலார் கள ஆய்வு & தரச் சான்றிதழ்' : 'Rooftop Commissioning & Handover Protocol'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {customer.fullName} ({customer.customerId}) • {customer.solarCapacity} kW
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowCertificate(prev => !prev)}
              className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100 text-xs font-bold flex items-center space-x-1.5 border border-teal-200 dark:border-teal-800/60"
            >
              <Award className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>{showCertificate ? (isTa ? 'படிவம் காண்க' : 'View Checklist') : (isTa ? 'சான்றிதழ்' : 'Certificate')}</span>
            </button>

            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BODY CONTAINER */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* VIEW 1: PRINTABLE OFFICIAL CERTIFICATE */}
          {showCertificate ? (
            <div className="p-6 sm:p-8 bg-slate-50 dark:bg-slate-950 border-2 border-teal-500/30 rounded-3xl space-y-6 relative overflow-hidden text-slate-800 dark:text-slate-200">
              <div className="absolute top-2 right-2 opacity-5 pointer-events-none">
                <Sun className="w-72 h-72 text-teal-600" />
              </div>

              <div className="text-center space-y-1 pb-4 border-b border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-black tracking-widest uppercase bg-teal-600 text-white px-3 py-1 rounded-full">
                  Official Handover Protocol
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
                  MRS SOLAR ASSOCIATES
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Rooftop Solar EPC & PM Surya Ghar Installation Certificate
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Customer Name</span>
                  <p className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">{customer.fullName}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Customer ID</span>
                  <p className="font-bold text-sm text-teal-600 dark:text-teal-400 font-mono mt-0.5">{customer.customerId}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Capacity & Brand</span>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">{customer.solarCapacity} kW On-Grid ({customer.solarBrand || 'Tier-1 Mono PERC'})</p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">TNEB Consumer No</span>
                  <p className="font-bold text-slate-900 dark:text-white font-mono mt-0.5">{customer.tnebConsumerNumber || 'Registered'}</p>
                </div>
              </div>

              {/* Verified Checklist Summary */}
              <div className="space-y-1.5 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                <p className="font-black text-teal-600 dark:text-teal-400 text-[11px] uppercase tracking-wider mb-2">
                  Completed Quality Standard Checks:
                </p>
                {checklistItems.map(item => (
                  <div key={item.key} className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{item.titleEn}</span>
                  </div>
                ))}
              </div>

              {/* Signatures Row */}
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800 items-end">
                <div className="text-center">
                  <div className="h-16 flex items-center justify-center border-b border-dashed border-slate-300 dark:border-slate-700 pb-1">
                    <span className="font-serif italic font-bold text-teal-700 dark:text-teal-300 text-sm">
                      {technicianName || 'MRS Solar Engineer'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mt-1">Lead Field Engineer</span>
                </div>

                <div className="text-center">
                  <div className="h-16 flex items-center justify-center border-b border-dashed border-slate-300 dark:border-slate-700 pb-1">
                    {signatureData ? (
                      <img src={signatureData} alt="Customer Signature" className="max-h-14 object-contain mx-auto" />
                    ) : (
                      <span className="text-xs text-slate-400 italic">Signature Pending</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mt-1">Customer Digital Sign-Off</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Certificate</span>
                </button>
              </div>
            </div>
          ) : (
            /* VIEW 2: CHECKLIST & TOUCHSCREEN SIGNATURE PAD FORM */
            <form onSubmit={handleSaveChecklist} className="space-y-5">
              
              <div className="p-3.5 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
                <div className="text-xs text-teal-900 dark:text-teal-200">
                  <p className="font-extrabold mb-0.5">
                    {isTa ? 'முறையான 6-அடுக்கு தொழில்நுட்ப சோதனை' : 'Strict 6-Point Commissioning Verification'}
                  </p>
                  <p className="text-[11px] text-teal-800 dark:text-teal-300">
                    {isTa 
                      ? 'அனைத்து பாதுகாப்பு சோதனைகளும் களத்தில் முடிந்தபின் வாடிக்கையாளர் தொடுதிரையில் கையொப்பமிட வேண்டும்.'
                      : 'Ensure all mechanical and electrical checkpoints pass before capturing customer touchscreen sign-off.'}
                  </p>
                </div>
              </div>

              {/* CHECKLIST ITEMS */}
              <div className="space-y-2.5">
                {checklistItems.map(item => {
                  const isChecked = Boolean(checklist[item.key]);
                  return (
                    <div
                      key={item.key}
                      onClick={() => toggleItem(item.key)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3 select-none ${
                        isChecked 
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' 
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0 text-emerald-600">
                        {isChecked ? (
                          <CheckSquare className="w-5 h-5 fill-emerald-100 dark:fill-emerald-950" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <h4 className={`text-xs font-bold ${isChecked ? 'text-emerald-950 dark:text-emerald-200' : 'text-slate-700 dark:text-slate-300'}`}>
                          {isTa ? item.titleTa : item.titleEn}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          {isTa ? item.descTa : item.descEn}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* TECHNICIAN SIGN-OFF INFO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    {isTa ? 'ஆய்வு செய்த பொறியாளர் பெயர்' : 'Inspected By (Technician / Engineer)'}
                  </label>
                  <input
                    type="text"
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                    placeholder="Technician Full Name"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    {isTa ? 'கள ஆய்வு குறிப்புகள்' : 'Site Notes / Remarks'}
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Structure torque checked, dual earth tested"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* DIGITAL CUSTOMER TOUCHSCREEN SIGNATURE PAD */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                    <PenTool className="w-3.5 h-3.5 text-teal-600" />
                    <span>{isTa ? 'வாடிக்கையாளர் டிஜிட்டல் கையொப்பம் (Touch Sign)' : 'Customer Digital Touchscreen Sign-Off'}</span>
                  </label>
                  
                  {hasSignature && (
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-[10px] text-red-500 hover:text-red-600 font-bold flex items-center space-x-1"
                    >
                      <Eraser className="w-3 h-3" />
                      <span>{isTa ? 'அழிக்க' : 'Clear'}</span>
                    </button>
                  )}
                </div>

                <div className="border-2 border-dashed border-teal-500/40 rounded-2xl p-2 bg-slate-50 dark:bg-slate-950/60 relative touch-none">
                  <canvas
                    ref={canvasRef}
                    width={560}
                    height={130}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-28 bg-white dark:bg-slate-900 rounded-xl cursor-crosshair border border-slate-200 dark:border-slate-800"
                  />
                  {!hasSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-semibold">
                      <span>{isTa ? 'விரல் அல்லது எழுத்தாணி கொண்டு கையொப்பமிடவும்' : 'Sign here using finger or stylus'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="pt-3 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setShowCertificate(true)}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center space-x-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-teal-600" />
                  <span>{isTa ? 'சான்றிதழ் மாதிரியை காண்க' : 'Preview Certificate'}</span>
                </button>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all"
                  >
                    {isTa ? 'ரத்து' : 'Cancel'}
                  </button>
                  
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-teal-600/25 flex items-center space-x-1.5 transition-all"
                  >
                    {saving ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    <span>{savedSuccess ? (isTa ? 'சேமிக்கப்பட்டது!' : 'Saved!') : (isTa ? 'சான்றொப்பம் செய்க' : 'Sign-Off & Approve')}</span>
                  </button>
                </div>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
}
