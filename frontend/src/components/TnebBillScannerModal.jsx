import React, { useState } from 'react';
import { 
  X, Camera, Upload, Sparkles, CheckCircle2, AlertCircle, 
  FileText, Zap, IndianRupee, Sun, ArrowRight, RefreshCw, Award 
} from 'lucide-react';
import api from '../utils/api.js';
import { formatCurrency } from '../utils/format.js';
import { getLanguage } from '../utils/translations.js';

export default function TnebBillScannerModal({ isOpen, onClose, onApplyScan }) {
  const lang = getLanguage();
  const isTa = lang === 'ta';

  const [scanning, setScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [scannedData, setScannedData] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show image preview
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result);
    reader.readAsDataURL(file);

    setScanning(true);
    setErrorMsg('');
    setScannedData(null);

    try {
      const formData = new FormData();
      formData.append('billImage', file);

      const res = await api.post('/ai/scan-tneb-bill', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success && res.data?.data) {
        setScannedData(res.data.data);
      } else {
        setErrorMsg(isTa ? 'அளவீடுகளை கண்டறிய முடியவில்லை. தெளிவான புகைப்படத்தை பதிவேற்றவும்.' : 'Could not detect bill details. Please upload a clear photo.');
      }
    } catch (err) {
      console.error('TNEB Scan Error:', err);
      setErrorMsg(err.response?.data?.message || (isTa ? 'ஸ்கேன் செய்வதில் பிழை ஏற்பட்டது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.' : 'Scanning failed. Please try again.'));
    } finally {
      setScanning(false);
    }
  };

  const handleApply = () => {
    if (scannedData && onApplyScan) {
      onApplyScan(scannedData);
      onClose();
    }
  };

  const handleReset = () => {
    setScannedData(null);
    setPreviewUrl(null);
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-teal-500/40 rounded-3xl shadow-2xl overflow-hidden my-6">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-indigo-500/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-teal-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center space-x-1.5">
                <span>{isTa ? 'TNEB மின்கட்டண AI ஸ்கேனர்' : 'TNEB Electricity Bill AI Scanner'}</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isTa ? 'மின் கட்டண ரசீதை புகைப்படம் எடுத்து உடனடி சோலார் கணக்கீட்டை பெறுங்கள்' : 'Upload or snap a photo of your TNEB white-meter bill for auto-extraction'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!scannedData && !scanning && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-teal-500/40 dark:border-teal-500/30 rounded-3xl p-6 sm:p-8 text-center bg-teal-50/30 dark:bg-teal-950/20 hover:border-teal-500 transition-all group">
                <input
                  type="file"
                  id="tneb-bill-upload"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="tneb-bill-upload"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-teal-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/30 group-hover:scale-105 transition-transform">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white block">
                      {isTa ? 'மின் கட்டணத்தை புகைப்படம் எடுக்கவும் / பதிவேற்றவும்' : 'Snap Photo or Upload TNEB Bill'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                      {isTa ? 'JPG, PNG, WebP (அதிகபட்சம் 10MB)' : 'Takes 2 seconds • Works on mobile camera or gallery'}
                    </span>
                  </div>
                  <span className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-md shadow-teal-600/25 inline-flex items-center space-x-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isTa ? 'கோப்பை தேர்வு செய்க' : 'Select Photo'}</span>
                  </span>
                </label>
              </div>

              {/* Sample Guidance */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                  <span>{isTa ? 'தானாக கண்டறியப்படும் தகவல்கள்:' : 'What our AI automatically detects:'}</span>
                </p>
                <ul className="list-disc pl-5 space-y-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  <li>TNEB Consumer / Service Number (10–12 digits)</li>
                  <li>Bi-monthly consumption units (kWh) & domestic tariff (LT-1A)</li>
                  <li>Actual electricity bill amount in ₹</li>
                  <li>Recommended Solar kWp size tailored to your usage</li>
                </ul>
              </div>
            </div>
          )}

          {/* SCANNING IN PROGRESS ANIMATION */}
          {scanning && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-teal-500/20 border-t-teal-500 animate-spin" />
                <Sparkles className="w-8 h-8 text-teal-500 animate-pulse" />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  {isTa ? 'TNEB ரசீது ஸ்கேன் செய்யப்படுகிறது...' : 'AI is reading your TNEB electricity bill...'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {isTa ? 'நுகர்வோர் எண் & மின் பயன்பாட்டு யூனிட்கள் கணக்கிடப்படுகின்றன' : 'Extracting consumer number, units consumed & recommended solar capacity'}
                </p>
              </div>
            </div>
          )}

          {/* SCANNED SUCCESS RESULTS CARD */}
          {scannedData && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-black text-xs uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                      {isTa ? 'TNEB ரசீது வெற்றிகரமாக ஸ்கேன் செய்யப்பட்டது' : 'TNEB Bill Successfully Scanned!'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center space-x-1 font-bold"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{isTa ? 'மறு ஸ்கேன்' : 'Rescan'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">{isTa ? 'TNEB நுகர்வோர் எண்' : 'Consumer No'}</span>
                    <span className="font-black font-mono text-slate-900 dark:text-white text-xs mt-0.5 block truncate">
                      {scannedData.consumerNumber || 'N/A'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">{isTa ? 'மாத மின் கட்டணம்' : 'Avg Monthly Bill'}</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs mt-0.5 block">
                      {formatCurrency(scannedData.monthlyAverageBill || 0, false)}/mo
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">{isTa ? 'மின் பயன்பாடு' : 'Monthly Units'}</span>
                    <span className="font-black text-slate-900 dark:text-white text-xs mt-0.5 block">
                      ~{scannedData.monthlyUnits || 0} kWh / mo
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-teal-700 dark:text-teal-300 uppercase font-bold block">{isTa ? 'பரிந்துரைக்கப்படும் சோலார்' : 'Recommended Solar'}</span>
                    <span className="font-black text-teal-800 dark:text-teal-200 text-sm mt-0.5 block flex items-center space-x-1">
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>{scannedData.recommendedSolarKw || 3} kWp Plant</span>
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 col-span-2 sm:col-span-2">
                    <span className="text-[10px] text-amber-800 dark:text-amber-300 uppercase font-bold block">{isTa ? 'மத்திய அரசு மானியம் (PM Surya Ghar)' : 'Central Subsidy Eligible'}</span>
                    <span className="font-black text-amber-900 dark:text-amber-200 text-sm mt-0.5 block font-mono">
                      {formatCurrency(scannedData.estimatedCentralSubsidy || 78000, false)} (100% Direct DBT)
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTION: APPLY VALUES TO PORTAL */}
              <button
                type="button"
                onClick={handleApply}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-extrabold text-xs shadow-lg shadow-teal-500/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.99]"
              >
                <span>{isTa ? 'இத்தகவல்களை கால்குலேட்டரில் பொருத்துக' : 'Apply Scanned Values to Solar Calculator'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
