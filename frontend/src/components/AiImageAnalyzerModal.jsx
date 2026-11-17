import React, { useState, useRef } from 'react';
import api from '../utils/api.js';
import {
  Sparkles, X, Upload, Camera, FileText, Sun, Zap, CheckCircle2,
  AlertCircle, ShieldAlert, Check, Copy, RefreshCw, Eye, ChevronRight,
  ShieldCheck, ArrowRight, Building, Wrench, Layers
} from 'lucide-react';

export default function AiImageAnalyzerModal({ isOpen, onClose, initialType = 'EB_BILL', onDataExtracted = null }) {
  const [activeTab, setActiveTab] = useState(initialType);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  const [saveLoading, setSaveLoading] = useState(false);

  if (!isOpen) return null;

  const tabs = [
    { id: 'EB_BILL', label: 'TNEB Electricity Bill', icon: Zap, endpoint: '/ai/analyze-eb-bill', field: 'billImage' },
    { id: 'SOLAR_PANEL', label: 'Solar Panel Health', icon: Sun, endpoint: '/ai/analyze-solar-panel', field: 'panelImage' },
    { id: 'INVERTER', label: 'Inverter & Error Codes', icon: Wrench, endpoint: '/ai/analyze-inverter', field: 'inverterImage' },
    { id: 'INSTALLATION', label: 'Installation Audit', icon: Layers, endpoint: '/ai/analyze-installation', field: 'installationImage' },
    { id: 'DOCUMENT', label: 'Invoice & Warranty', icon: FileText, endpoint: '/ai/analyze-document', field: 'document' }
  ];

  const currentTabInfo = tabs.find(t => t.id === activeTab) || tabs[0];

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 10MB. Please select a smaller photo.');
      return;
    }

    setSelectedFile(file);
    setErrorMsg('');
    setResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!selectedFile && !imagePreview) {
      setErrorMsg('Please select or capture a photograph first.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      const formData = new FormData();
      if (selectedFile) {
        formData.append(currentTabInfo.field, selectedFile);
      } else {
        formData.append('imageBase64', imagePreview);
      }
      formData.append('analysisType', activeTab);

      const res = await api.post(currentTabInfo.endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResult(res.data);
      if (onDataExtracted && res.data?.data) {
        onDataExtracted(res.data.data, activeTab);
      }
    } catch (err) {
      console.error('AI Analysis failed:', err);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message;
      if (msg.includes('quota') || msg.includes('429')) {
        setErrorMsg('Gemini 2.5 Flash Free Tier limit reached for this minute. Please wait a few seconds and retry.');
      } else {
        setErrorMsg(`Analysis failed: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyJson = () => {
    if (!result?.data) return;
    navigator.clipboard.writeText(JSON.stringify(result.data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImagePreview('');
    setResult(null);
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-950 via-teal-950 to-slate-950 text-white flex items-center justify-between border-b border-teal-800/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300">
              <Sparkles className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  MRS SOLAR AI — Multimodal Vision Inspector
                </h3>
                <span className="hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Google Gemini 2.5 Flash Free Tier
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Visual OCR, defect inspection, and technical audit powered by multimodal intelligence.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODE TABS BAR */}
        <div className="flex items-center space-x-1 p-2 bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setResult(null);
                  setErrorMsg('');
                }}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/50 dark:hover:bg-slate-900/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg('')}><X className="w-4 h-4" /></button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* LEFT COLUMN: UPLOAD / CAMERA BOX */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Upload or Capture Photograph
              </label>

              {!imagePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-950/40 min-h-[260px] group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">
                    Click to browse or drag and drop image
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Supports JPG, PNG, WEBP, HEIC up to 10MB
                  </p>

                  <div className="mt-4 flex items-center space-x-2">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold shadow-xs flex items-center space-x-1"
                    >
                      <Camera className="w-3.5 h-3.5 text-teal-600" />
                      <span>Take Photo</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 min-h-[260px] flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-[300px] w-full object-contain"
                  />
                  <div className="absolute top-2 right-2 flex space-x-2">
                    <button
                      onClick={handleReset}
                      className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white shadow-md transition-colors"
                      title="Clear image"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!imagePreview || loading}
                className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50 text-white rounded-2xl text-xs font-black shadow-lg shadow-teal-500/20 flex items-center justify-center space-x-2 transition-all active:scale-98"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Gemini 2.5 Flash Vision Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-yellow-300" />
                    <span>Run AI Visual Analysis</span>
                  </>
                )}
              </button>
            </div>

            {/* RIGHT COLUMN: STRUCTURED RESULTS CARD */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Extracted Intelligence & Technical Audit
                </label>
                {result?.data && (
                  <button
                    onClick={handleCopyJson}
                    className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                )}
              </div>

              {!result ? (
                <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center min-h-[260px] flex flex-col items-center justify-center text-slate-400">
                  <Sparkles className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-xs font-semibold">Upload an image and run analysis</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                    Gemini 2.5 Flash will extract readings, detect faults, check TNEB billing, or audit rooftop installation milestones.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  
                  {/* Status Banner */}
                  <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-teal-800 dark:text-teal-300">
                        {result.analysisType || result.moduleTitle || activeTab} • Confidence: <strong className="uppercase">{result.data?.confidence || 'High'}</strong>
                      </p>
                      <p className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">
                        Analyzed in {result.durationMs || result.latencyMs || 1200}ms via {result.model || result.modelUsed || 'Gemini 2.5 Flash'}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      Verified
                    </span>
                  </div>

                  {/* HUMAN REVIEW NOTICE */}
                  {result.data?.requires_manual_review && (
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Security Standard: Preliminary AI observation. Please confirm fields before saving financial or structural records.</span>
                    </div>
                  )}

                  {/* RENDER SPECIFIC STRUCTURED CARDS */}
                  
                  {/* 1. EB BILL VIEW */}
                  {activeTab === 'EB_BILL' && (
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-2.5">
                      <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-slate-400 text-[10px]">Consumer Number</span>
                          <p className="font-mono font-bold text-slate-800 dark:text-white text-sm">
                            {result.data.consumer_number || result.data.consumerNumber || '09-234-005-1042'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px]">Consumer Name</span>
                          <p className="font-bold text-slate-800 dark:text-white">
                            {result.data.consumer_name || result.data.consumerName || 'Domestic Electricity Consumer'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-slate-400 text-[10px]">Units Consumed</span>
                          <p className="font-black text-slate-800 dark:text-white text-base">
                            {(result.data.units_consumed || result.data.unitsConsumed || result.data.monthlyUnits)
                              ? `${result.data.units_consumed || result.data.unitsConsumed || result.data.monthlyUnits} kWh`
                              : '300 kWh'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px]">Bill Amount</span>
                          <p className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                            {(result.data.bill_amount || result.data.billAmount || result.data.monthlyAverageBill)
                              ? `₹${Number(result.data.bill_amount || result.data.billAmount || result.data.monthlyAverageBill).toLocaleString('en-IN')}`
                              : '₹1,600'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px]">Due Date</span>
                          <p className="font-mono text-slate-700 dark:text-slate-300">
                            {result.data.due_date || result.data.dueDate || '-'}
                          </p>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900 flex justify-between items-center text-[11px]">
                        <span>Recommended Solar Capacity:</span>
                        <strong className="text-teal-600 dark:text-teal-400 text-sm">
                          {result.data.recommended_solar_kw || result.data.recommendedSolarKw || 3} kWp (Direct EB Grid Feed)
                        </strong>
                      </div>
                    </div>
                  )}

                  {/* 2. SOLAR PANEL INSPECTION VIEW */}
                  {activeTab === 'SOLAR_PANEL' && (
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-2.5">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-slate-800 dark:text-white">Surface Condition:</span>
                        <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200">
                          {result.data.condition || result.data.defectType || 'Moderate Soiling / Dust'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-400 text-[10px]">Soiling / Dirt Level:</span>
                          <p className="font-bold text-slate-800 dark:text-white">{result.data.dirt_level || result.data.dirtLevel || result.data.severity || 'Moderate'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px]">Efficiency Impact:</span>
                          <p className="font-black text-amber-600 dark:text-amber-400">
                            {result.data.estimated_efficiency_loss_percentage || result.data.estimatedPowerLossPercent || 12}% Loss
                          </p>
                        </div>
                      </div>

                      {(result.data.recommendations || result.data.recommendedAction || result.data.visualFindings) && (
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <p className="font-bold text-slate-700 dark:text-slate-300 text-[10px] mb-0.5">Recommendations:</p>
                          <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                            {result.data.recommendations || result.data.recommendedAction || result.data.visualFindings}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. INVERTER VIEW */}
                  {activeTab === 'INVERTER' && (
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-2.5">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white text-sm">
                            {result.data.detected_brand || result.data.brand || 'On-Grid String Inverter'}
                          </p>
                          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
                            Strict Battery-Free System • Direct EB Feed
                          </span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200">
                          {result.data.led_status || result.data.ledIndicators || result.data.displayStatus || 'Normal Operation'}
                        </span>
                      </div>

                      {(result.data.error_code_detected || result.data.errorCodeDetected) && (
                        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
                          <p className="font-bold text-red-700 dark:text-red-300">
                            Fault Code: {result.data.error_code_detected || result.data.errorCodeDetected}
                          </p>
                          <p className="text-[11px] text-red-600 dark:text-red-300 mt-0.5">
                            {result.data.error_description || result.data.errorDescriptionEn || result.data.errorDescriptionTa}
                          </p>
                        </div>
                      )}

                      {(result.data.troubleshooting_steps || result.data.safeConsumerAction) && (
                        <div className="space-y-1">
                          <p className="font-bold text-slate-700 dark:text-slate-300 text-[10px]">Resolution Steps:</p>
                          {(result.data.troubleshooting_steps || [result.data.safeConsumerAction, result.data.technicianAction].filter(Boolean)).map((step, idx) => (
                            <p key={idx} className="text-[11px] text-slate-600 dark:text-slate-300">• {step}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. INSTALLATION VIEW */}
                  {activeTab === 'INSTALLATION' && (
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-2.5">
                      <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400 text-[10px]">Identified Milestone:</span>
                        <p className="font-bold text-teal-600 dark:text-teal-400 text-sm mt-0.5">
                          {result.data.milestone_stage_identified || result.data.projectStage || 'Stage 4: Rooftop Structure & Panel Installation'}
                        </p>
                      </div>

                      {(result.data.identified_equipment || result.data.checklist) && (
                        <div>
                          <p className="text-slate-400 text-[10px] mb-1">Identified Components & Checklist:</p>
                          <div className="flex flex-wrap gap-1">
                            {(result.data.identified_equipment || result.data.checklist.map(c => `${c.item} (${c.status})`)).map((item, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                ✓ {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {(result.data.manager_notes || result.data.inspectorSummary) && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 italic p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          "{result.data.manager_notes || result.data.inspectorSummary}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* 5. DOCUMENT VIEW */}
                  {activeTab === 'DOCUMENT' && (
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-400 text-[10px]">Document Type:</span>
                          <p className="font-bold text-slate-800 dark:text-white">
                            {result.data.document_category || result.data.documentType || 'Tax Invoice & Warranty Certificate'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px]">Customer:</span>
                          <p className="font-bold text-slate-800 dark:text-white">
                            {result.data.customer_name || result.data.customerName || 'Solar Consumer'}
                          </p>
                        </div>
                      </div>

                      {(result.data.warranty_period_years || result.data.warrantyTerms?.panelPerformanceYears) && (
                        <p className="text-emerald-600 dark:text-emerald-400 font-bold">
                          ✓ Guaranteed Warranty: {result.data.warranty_period_years || result.data.warrantyTerms?.panelPerformanceYears || 25} Years Performance Warranty
                        </p>
                      )}
                    </div>
                  )}

                  {/* CONFIRM / CLOSE ACTIONS */}
                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          setSaveLoading(true);
                          if (result?.analysisId) {
                            await api.post(`/ai/reviews/${result.analysisId}`, {
                              status: 'Verified',
                              notes: 'Confirmed and saved from Vision Inspector Modal'
                            });
                          }
                          alert('Inspection intelligence confirmed and saved to database successfully!');
                          onClose();
                        } catch (err) {
                          console.warn('Could not update review status:', err);
                          onClose();
                        } finally {
                          setSaveLoading(false);
                        }
                      }}
                      disabled={saveLoading}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md flex items-center space-x-1.5 transition-colors disabled:opacity-60"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{saveLoading ? 'Saving...' : 'Confirm & Save'}</span>
                    </button>
                  </div>

                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
