import React, { useState, useRef } from 'react';
import api from '../utils/api.js';
import { 
  X, Camera, Upload, Sparkles, CheckCircle2, AlertTriangle, 
  ShieldAlert, RefreshCw, Edit3, Check, FileText, Zap, 
  HelpCircle, Eye, ArrowRight, ShieldCheck, Info
} from 'lucide-react';
import { translations, getLanguage } from '../utils/translations.js';

export const AI_MODULES = [
  { id: 'panel_defect', label: 'Solar Panel Defect Inspection', icon: Zap, color: 'amber', desc: 'Detect micro-cracks, hotspots, dust/soiling, bird droppings, cell delamination' },
  { id: 'eb_bill', label: 'TNEB Electricity Bill OCR', icon: FileText, color: 'teal', desc: 'Extract 10-12 digit consumer number, bi-monthly units, bill amount, solar sizing' },
  { id: 'inverter_error', label: 'Inverter Brand & Error Diagnostics', icon: AlertTriangle, color: 'rose', desc: 'Identify inverter brand, model series, error codes and safety hazard precautions' },
  { id: 'installation_audit', label: 'Installation QA & Workmanship Audit', icon: ShieldCheck, color: 'indigo', desc: 'Audit structural tilt, module clamps, UV conduit cabling, and earthing strips' },
  { id: 'warranty_doc', label: 'Invoice & Warranty Extraction', icon: FileText, color: 'purple', desc: 'Extract panel & inverter serial numbers, vendor GSTIN, and 25-year warranty terms' },
  { id: 'component_id', label: 'Solar Equipment Identification', icon: Eye, color: 'emerald', desc: 'Catalog module tech (Mono PERC / Bifacial), cables, MC4, and isolators' }
];

export default function AiImageUploadModal({ 
  isOpen, 
  onClose, 
  initialModule = 'panel_defect',
  customerId = '',
  customerName = '',
  onAnalysisSaved 
}) {
  const [selectedModule, setSelectedModule] = useState(initialModule);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [base64Image, setBase64Image] = useState('');
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [notes, setNotes] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [savingReview, setSavingReview] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const [lang] = useState(getLanguage);
  const isTa = lang === 'ta';

  if (!isOpen) return null;

  const currentMod = AI_MODULES.find(m => m.id === selectedModule) || AI_MODULES[0];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit. Please upload a smaller image.');
      return;
    }

    setFile(selectedFile);
    setMimeType(selectedFile.type || 'image/jpeg');
    setResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result;
      setBase64Image(b64);
      setPreviewUrl(b64);
    };
    reader.readAsDataURL(selectedFile);
  };

  // HTML5 WebCam Access
  const startCamera = async () => {
    setIsCameraActive(true);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Could not access device camera. Please use file upload.');
      setIsCameraActive(false);
    }
  };

  const captureCameraFrame = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    // Stop stream
    const stream = videoRef.current.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    setIsCameraActive(false);
    setBase64Image(dataUrl);
    setPreviewUrl(dataUrl);
    setMimeType('image/jpeg');
    setFile(null);
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const handleRunAnalysis = async () => {
    if (!base64Image) {
      alert('Please upload an image or take a photo first.');
      return;
    }

    setAnalyzing(true);
    setResult(null);
    setIsEditing(false);

    try {
      const res = await api.post('/ai/analyze-image', {
        module: selectedModule,
        imageBase64: base64Image,
        mimeType,
        additionalNotes: notes,
        customerId,
        customerName,
        language: lang
      });

      setResult(res.data);
      setEditedData(res.data.data || {});
    } catch (err) {
      console.error('Analysis error:', err);
      alert(err.response?.data?.message || 'AI Recognition failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Human in the Loop: Confirm or Edit and Save
  const handleSaveConfirmedData = async () => {
    if (!result?.analysisId) return;
    setSavingReview(true);
    try {
      await api.put(`/ai/analyses/${result.analysisId}/review`, {
        reviewStatus: 'confirmed',
        correctedData: editedData,
        remarks: 'Confirmed and verified by user in inspection portal.'
      });

      setSaveSuccess(true);
      if (onAnalysisSaved) {
        onAnalysisSaved({
          ...result,
          data: editedData,
          reviewStatus: 'confirmed'
        });
      }
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Save review error:', err);
      alert('Failed to save inspection confirmation.');
    } finally {
      setSavingReview(false);
    }
  };

  const handleReset = () => {
    stopCamera();
    setFile(null);
    setPreviewUrl('');
    setBase64Image('');
    setResult(null);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in no-print overflow-y-auto">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* MODAL HEADER */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300">
                  Multimodal Gemini AI Vision
                </span>
                <span className="text-[10px] text-slate-400 font-mono">v3.0 Engine</span>
              </div>
              <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white mt-0.5">
                {isTa ? 'சோலார் AI பட ஆய்வு & ஆவணப் பாகுபாடு' : 'AI Solar Vision & Document Intelligence'}
              </h3>
            </div>
          </div>

          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* 1. MODULE SELECTOR TABS (6 Recognition Modules) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              {isTa ? 'ஆய்வு வகை (Select Inspection Module):' : 'Select AI Recognition Module:'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {AI_MODULES.map((m) => {
                const Icon = m.icon;
                const isSelected = selectedModule === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { setSelectedModule(m.id); setResult(null); }}
                    className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 shadow-sm scale-[1.02]'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping" />}
                    </div>
                    <span className="text-[11px] font-black line-clamp-2 leading-tight">
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
              ℹ️ {currentMod.desc}
            </p>
          </div>

          {/* 2. UPLOAD & CAMERA CAPTURE SECTION */}
          {!result && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              
              {/* Left: Input Buttons & Dropzone */}
              <div className="md:col-span-7 space-y-3">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Image / PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={isCameraActive ? captureCameraFrame : startCamera}
                    className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 border transition-all ${
                      isCameraActive 
                        ? 'bg-red-600 hover:bg-red-700 text-white border-red-500 animate-pulse'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Camera className="w-4 h-4 text-amber-500" />
                    <span>{isCameraActive ? 'Capture Snapshot' : 'Camera'}</span>
                  </button>

                  {isCameraActive && (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="p-3 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                />

                {/* Dropzone Drag indicator */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-teal-500/50 rounded-2xl p-6 text-center cursor-pointer transition-colors space-y-2 bg-slate-50/50 dark:bg-slate-950/20"
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Click to select file or drag & drop photo here
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Supports JPG, PNG, WEBP, and PDF documents (Max 10MB)
                  </p>
                </div>

                {/* Optional Customer / Field Notes */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Field Notes or Symptoms (Optional):
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Inverter displaying red blinking LED after lightning; or 3rd panel on south row has dust..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Right: Live Preview or Camera Feed */}
              <div className="md:col-span-5 flex flex-col items-center justify-center">
                <div className="w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center relative shadow-inner">
                  {isCameraActive ? (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  ) : previewUrl ? (
                    <img src={previewUrl} alt="Inspection Preview" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center p-4 text-slate-500 space-y-1">
                      <Eye className="w-8 h-8 mx-auto text-slate-600" />
                      <p className="text-xs font-bold">No Image Selected</p>
                      <p className="text-[10px]">Preview will appear here</p>
                    </div>
                  )}

                  {/* Scanning Laser Animation when processing */}
                  {analyzing && (
                    <div className="absolute inset-0 bg-teal-900/40 backdrop-blur-xs flex flex-col items-center justify-center space-y-2">
                      <div className="w-full h-1 bg-gradient-to-r from-teal-400 via-amber-400 to-teal-400 animate-pulse absolute top-1/2 -translate-y-1/2 shadow-lg shadow-teal-400/50" />
                      <RefreshCw className="w-8 h-8 text-yellow-300 animate-spin" />
                      <span className="text-xs font-black text-white px-3 py-1 bg-slate-950/80 rounded-full border border-teal-500/40">
                        Analyzing with Gemini Vision...
                      </span>
                    </div>
                  )}
                </div>

                {previewUrl && !analyzing && (
                  <div className="w-full flex items-center justify-between mt-2 text-[11px]">
                    <button onClick={handleReset} className="text-slate-400 hover:text-red-500 transition-colors">
                      Clear & Choose Another
                    </button>
                    <span className="text-emerald-500 font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Ready for AI Scan</span>
                    </span>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* 3. STRUCTURED RESULTS DISPLAY & HUMAN CORRECTION INTERFACE */}
          {result && (
            <div className="space-y-4 animate-fade-in">
              
              {/* Header result bar */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-950/80 to-slate-900 border border-teal-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-black">
                    AI
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-extrabold text-sm sm:text-base">{result.moduleTitle}</h4>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {result.confidence || 'High'} Confidence ({Math.round((result.confidenceScore || 0.9) * 100)}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Analyzed via {result.source} • Report Ref: <span className="font-mono text-teal-300">{result.analysisNumber}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center space-x-1.5 border border-slate-700"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isEditing ? 'View Mode' : 'Edit / Correct Data'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700"
                  >
                    New Scan
                  </button>
                </div>
              </div>

              {/* Grid: Photo Preview + Structured Findings */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Photo Preview Column */}
                <div className="md:col-span-4 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video md:aspect-auto md:h-full max-h-[300px] flex items-center justify-center relative">
                  <img src={previewUrl} alt="Analyzed" className="w-full h-full object-contain" />
                </div>

                {/* Structured Data Column */}
                <div className="md:col-span-8 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
                  
                  {/* MODULE SPECIFIC FIELDS */}
                  {selectedModule === 'panel_defect' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Defect Category</span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedData.defectType || ''}
                              onChange={(e) => setEditedData({ ...editedData, defectType: e.target.value })}
                              className="w-full text-xs font-black bg-slate-100 dark:bg-slate-800 p-1 rounded mt-1"
                            />
                          ) : (
                            <p className="text-xs font-black text-rose-500 mt-0.5">{editedData.defectType || 'None'}</p>
                          )}
                        </div>

                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Severity Level</span>
                          {isEditing ? (
                            <select
                              value={editedData.severity || 'Moderate'}
                              onChange={(e) => setEditedData({ ...editedData, severity: e.target.value })}
                              className="w-full text-xs font-black bg-slate-100 dark:bg-slate-800 p-1 rounded mt-1"
                            >
                              <option value="None">None</option>
                              <option value="Low">Low</option>
                              <option value="Moderate">Moderate</option>
                              <option value="High">High</option>
                              <option value="Critical">Critical</option>
                            </select>
                          ) : (
                            <p className="text-xs font-black text-amber-500 mt-0.5">{editedData.severity || 'Normal'}</p>
                          )}
                        </div>

                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Est. Power Loss</span>
                          <p className="text-xs font-black text-slate-800 dark:text-white mt-0.5">
                            ~{editedData.estimatedPowerLossPercent || 0}% Loss
                          </p>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 block">
                          Visual Findings & Recommendation:
                        </span>
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          {editedData.visualFindings}
                        </p>
                        <p className="text-xs font-bold text-slate-800 dark:text-white pt-1">
                          👉 Action: {editedData.recommendedAction}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* TNEB BILL SPECIFIC FIELDS */}
                  {selectedModule === 'eb_bill' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Consumer No</span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedData.consumerNumber || ''}
                              onChange={(e) => setEditedData({ ...editedData, consumerNumber: e.target.value })}
                              className="w-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 p-1 rounded mt-1"
                            />
                          ) : (
                            <p className="text-xs font-mono font-bold text-slate-800 dark:text-white mt-0.5">{editedData.consumerNumber}</p>
                          )}
                        </div>

                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Bi-Monthly Units</span>
                          {isEditing ? (
                            <input
                              type="number"
                              value={editedData.biMonthlyUnits || 0}
                              onChange={(e) => setEditedData({ ...editedData, biMonthlyUnits: Number(e.target.value) })}
                              className="w-full text-xs font-bold bg-slate-100 dark:bg-slate-800 p-1 rounded mt-1"
                            />
                          ) : (
                            <p className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">{editedData.biMonthlyUnits} Units</p>
                          )}
                        </div>

                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Bill Amount</span>
                          {isEditing ? (
                            <input
                              type="number"
                              value={editedData.biMonthlyBillAmount || 0}
                              onChange={(e) => setEditedData({ ...editedData, biMonthlyBillAmount: Number(e.target.value) })}
                              className="w-full text-xs font-bold bg-slate-100 dark:bg-slate-800 p-1 rounded mt-1"
                            />
                          ) : (
                            <p className="text-xs font-bold text-emerald-500 mt-0.5">₹{Number(editedData.biMonthlyBillAmount || 0).toLocaleString()}</p>
                          )}
                        </div>

                        <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
                          <span className="text-[10px] uppercase font-bold text-teal-600 dark:text-teal-400 block">Recommended kW</span>
                          <p className="text-base font-black text-teal-700 dark:text-teal-300 mt-0.5">{editedData.recommendedSolarKw} kWp</p>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-800 dark:text-emerald-300">
                          PM Surya Ghar Direct Bank Subsidy:
                        </span>
                        <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                          ₹{Number(editedData.estimatedCentralSubsidy || 78000).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* INVERTER ERROR SPECIFIC FIELDS */}
                  {selectedModule === 'inverter_error' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Brand & Model</span>
                          <p className="text-xs font-black text-slate-800 dark:text-white mt-0.5">{editedData.brand} • {editedData.modelSeries}</p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Error Code</span>
                          <p className="text-xs font-black text-rose-500 mt-0.5">{editedData.errorCodeDetected}</p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Hazard Level</span>
                          <p className="text-xs font-black text-amber-500 mt-0.5">{editedData.hazardLevel}</p>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 space-y-1 text-xs">
                        <p className="font-bold text-rose-800 dark:text-rose-300">
                          Diagnostic: {editedData.errorDescriptionEn}
                        </p>
                        <p className="text-slate-700 dark:text-slate-300">
                          <strong>Consumer Action:</strong> {editedData.safeConsumerAction}
                        </p>
                        <p className="text-slate-800 dark:text-white font-semibold pt-1">
                          🛠️ Technician Fix: {editedData.technicianAction}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* INSTALLATION AUDIT CHECKLIST */}
                  {selectedModule === 'installation_audit' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Workmanship Quality</span>
                          <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{editedData.overallQualityScore} / 100</p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {editedData.approvalStatus}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {Array.isArray(editedData.checklist) && editedData.checklist.map((c, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{c.item}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.status === 'Pass' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                              c.status === 'Warning' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                              'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {c.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* WARRANTY / DOCUMENT EXTRACTION */}
                  {selectedModule === 'warranty_doc' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Vendor</span>
                          <p className="font-black text-slate-800 dark:text-white mt-0.5">{editedData.vendorName}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Invoice Ref</span>
                          <p className="font-mono font-bold text-slate-800 dark:text-white mt-0.5">{editedData.invoiceNumber}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Panel Warranty</span>
                          <p className="font-black text-teal-600 dark:text-teal-400 mt-0.5">25 Years</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* EQUIPMENT IDENTIFICATION */}
                  {selectedModule === 'component_id' && (
                    <div className="space-y-3 text-xs">
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                        <span className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-400 block">Equipment Category</span>
                        <h5 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{editedData.componentCategory}</h5>
                        <p className="text-slate-600 dark:text-slate-300 mt-1">{editedData.equipmentName}</p>
                      </div>
                    </div>
                  )}

                  {/* SAFETY DISCLAIMER FOOTER */}
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 flex items-start space-x-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>{result.safetyDisclaimer}</span>
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500">
            {saveSuccess ? (
              <span className="text-emerald-500 font-bold flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span>Analysis verified and recorded into permanent database!</span>
              </span>
            ) : result ? (
              <span>Review findings before confirming to ensure 100% human-verified accuracy.</span>
            ) : (
              <span>Upload photo and click "Run AI Analysis" to begin.</span>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => { stopCamera(); onClose(); }}
              className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              Close
            </button>

            {!result ? (
              <button
                type="button"
                onClick={handleRunAnalysis}
                disabled={!base64Image || analyzing}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-md disabled:opacity-50 flex items-center space-x-2 transition-all hover:scale-105 active:scale-95"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Image...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    <span>Run AI Analysis</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveConfirmedData}
                disabled={savingReview}
                className="px-5 py-2 text-xs font-black rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md disabled:opacity-50 flex items-center space-x-1.5 transition-all hover:scale-105 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>{savingReview ? 'Saving...' : 'Confirm & Save Analysis'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
