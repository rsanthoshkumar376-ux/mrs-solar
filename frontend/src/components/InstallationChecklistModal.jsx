import React, { useState } from 'react';
import { 
  X, CheckSquare, Square, ShieldCheck, HardHat, CheckCircle2, 
  Clock, AlertCircle, Save, Award, Sun
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

  if (!isOpen || !customer) return null;

  const toggleItem = (key) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allCompleted = Object.values(checklist).every(Boolean);

  const handleSaveChecklist = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      await api.post(`/admin/customers/${customer._id}/commissioning-checklist`, {
        checklist,
        signatureName: technicianName.trim(),
        notes: notes.trim()
      });

      setSavedSuccess(true);
      if (onVerified) onVerified();
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 2500);
    } catch (err) {
      console.error('Checklist error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to save commissioning checklist.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-teal-500/40 rounded-3xl shadow-2xl overflow-hidden my-6">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-amber-500/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/30">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-1.5">
                <span>{isTa ? 'மேற்கூரை சோலார் பொருத்துதல் & தர ஆய்வு சான்றிதழ்' : 'EPC Roof Installation & Quality Commissioning Checklist'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {customer.fullName} ({customer.customerId}) • {customer.solarCapacity} kW System
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSaveChecklist} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 text-xs flex items-center space-x-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {isTa ? 'தர ஆய்வு வெற்றிகரமாக உறுதி செய்யப்பட்டது! மானிய நிலை தானாக நிலை 3-க்கு மாற்றப்பட்டது.' : 'Checklist signed off! PM Surya Ghar Subsidy automatically advanced to Stage 3.'}
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-100 text-red-700 text-xs flex items-center space-x-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* CHECKLIST ITEMS */}
          <div className="space-y-2.5">
            {checklistItems.map((item) => {
              const isChecked = Boolean(checklist[item.key]);

              return (
                <div
                  key={item.key}
                  onClick={() => toggleItem(item.key)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3 ${
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

          {/* SUBMIT BUTTON */}
          <div className="pt-2 flex justify-end space-x-2">
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
              <span>{savedSuccess ? 'Saved!' : isTa ? 'சான்றொப்பம் செய்க' : 'Sign-Off & Approve Commissioning'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}