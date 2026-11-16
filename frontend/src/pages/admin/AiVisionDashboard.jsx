import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import { 
  Sparkles, Eye, Zap, FileText, AlertTriangle, ShieldCheck, 
  CheckCircle2, Clock, X, Search, Filter, RefreshCw, Trash2, 
  Upload, Camera, Check, ShieldAlert, Award, ChevronRight, Layers, ArrowRight
} from 'lucide-react';
import { translations, getLanguage } from '../../utils/translations.js';
import AiImageUploadModal, { AI_MODULES } from '../../components/AiImageUploadModal.jsx';

export default function AiVisionDashboard() {
  const [stats, setStats] = useState({
    totalAnalyzed: 0,
    ebBillsProcessed: 0,
    panelInspections: 0,
    inverterInspections: 0,
    installationReviews: 0,
    warrantyDocs: 0,
    componentIds: 0,
    pendingVerification: 0,
    confirmed: 0,
    rejected: 0,
    failedRequests: 0,
    totalApiCalls: 0,
    estimatedTotalCostInr: '0.00'
  });

  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [moduleFilter, setModuleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modals
  const [activeUploadModule, setActiveUploadModule] = useState(null);
  const [reviewingAnalysis, setReviewingAnalysis] = useState(null);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [reviewEditedData, setReviewEditedData] = useState({});
  const [submittingReview, setSubmittingReview] = useState(false);

  const [lang] = useState(getLanguage);
  const isTa = lang === 'ta';

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await api.get('/ai/stats');
      if (res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch AI stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/ai/analyses', {
        params: {
          module: moduleFilter,
          reviewStatus: statusFilter,
          search: search.trim()
        }
      });
      setAnalyses(res.data?.analyses || []);
    } catch (err) {
      console.error('Failed to fetch analyses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchAnalyses();
  }, [moduleFilter, statusFilter, search]);

  const handleOpenReview = (analysis) => {
    setReviewingAnalysis(analysis);
    setReviewRemarks(analysis.reviewRemarks || '');
    setReviewEditedData(analysis.extractedData || {});
  };

  const handleSaveReview = async (newStatus) => {
    if (!reviewingAnalysis) return;
    setSubmittingReview(true);
    try {
      await api.put(`/ai/analyses/${reviewingAnalysis._id}/review`, {
        reviewStatus: newStatus,
        correctedData: reviewEditedData,
        remarks: reviewRemarks
      });

      setReviewingAnalysis(null);
      await fetchStats();
      await fetchAnalyses();
    } catch (err) {
      console.error('Failed to save review:', err);
      alert('Error updating analysis review status');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteAnalysis = async (id, refNum) => {
    if (!window.confirm(`Delete analysis report ${refNum || id}? This cannot be undone.`)) return;
    try {
      await api.delete(`/ai/analyses/${id}`);
      setAnalyses(prev => prev.filter(a => a._id !== id));
      await fetchStats();
    } catch (err) {
      console.error('Failed to delete analysis:', err);
      alert('Failed to delete analysis record.');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-black shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <span>AI Recognition & Vision Hub</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300">
                  Multimodal Gemini AI
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automated computer vision inspection for solar panels, TNEB bills, inverter error codes, installation QA, and warranty documents.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { fetchStats(); fetchAnalyses(); }}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all"
            title="Refresh AI Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setActiveUploadModule('panel_defect')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md shadow-teal-500/20 flex items-center space-x-1.5 transition-all hover:scale-105 active:scale-95"
          >
            <Camera className="w-4 h-4 text-amber-300" />
            <span>+ New AI Photo Scan</span>
          </button>
        </div>
      </div>

      {/* 2. REQUIREMENT 8: OWNER AI RECOGNITION DASHBOARD KPI METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        
        {/* Metric 1: Total Analyzed */}
        <div className="glass-premium p-3.5 rounded-2xl border-l-4 border-l-teal-500">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Analyzed</span>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{stats.totalAnalyzed}</p>
          <span className="text-[9px] text-slate-500">All photo reports</span>
        </div>

        {/* Metric 2: EB Bills Processed */}
        <div className="glass-premium p-3.5 rounded-2xl border-l-4 border-l-blue-500">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">EB Bills OCR</span>
          <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">{stats.ebBillsProcessed}</p>
          <span className="text-[9px] text-slate-500">TNEB white meters</span>
        </div>

        {/* Metric 3: Solar Panel Inspections */}
        <div className="glass-premium p-3.5 rounded-2xl border-l-4 border-l-amber-500">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Panel Defects</span>
          <p className="text-xl font-black text-amber-500 mt-1">{stats.panelInspections}</p>
          <span className="text-[9px] text-slate-500">Cracks / Soiling / Hotspots</span>
        </div>

        {/* Metric 4: Inverter Error Inspections */}
        <div className="glass-premium p-3.5 rounded-2xl border-l-4 border-l-rose-500">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Inverter Faults</span>
          <p className="text-xl font-black text-rose-500 mt-1">{stats.inverterInspections}</p>
          <span className="text-[9px] text-slate-500">Display codes & trips</span>
        </div>

        {/* Metric 5: Installation Reviews */}
        <div className="glass-premium p-3.5 rounded-2xl border-l-4 border-l-indigo-500">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">QA Installs</span>
          <p className="text-xl font-black text-indigo-500 mt-1">{stats.installationReviews}</p>
          <span className="text-[9px] text-slate-500">Workmanship checks</span>
        </div>

        {/* Metric 6: Pending Manual Verification */}
        <div className="glass-premium p-3.5 rounded-2xl border-l-4 border-l-yellow-500">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Pending Review</span>
          <p className="text-xl font-black text-yellow-600 dark:text-yellow-400 mt-1">{stats.pendingVerification}</p>
          <span className="text-[9px] text-yellow-600 dark:text-yellow-500 font-semibold">Human approval</span>
        </div>

        {/* Metric 7: Failed Requests */}
        <div className="glass-premium p-3.5 rounded-2xl border-l-4 border-l-slate-400">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Failed / Blurry</span>
          <p className="text-xl font-black text-slate-700 dark:text-slate-300 mt-1">{stats.failedRequests}</p>
          <span className="text-[9px] text-slate-400">Re-upload flagged</span>
        </div>

        {/* Metric 8: AI Usage & Est Costs */}
        <div className="glass-premium p-3.5 rounded-2xl border-l-4 border-l-emerald-500">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Est. AI Cost</span>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{stats.estimatedTotalCostInr}</p>
          <span className="text-[9px] text-slate-500">{stats.totalApiCalls} API calls</span>
        </div>

      </div>

      {/* 3. QUICK SCAN LAUNCHPAD (THE 6 MODULES) */}
      <div className="glass-premium p-4 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Launch AI Recognition Module
          </span>
          <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
            Point camera or upload image
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {AI_MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveUploadModule(m.id)}
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500 hover:shadow-md transition-all text-left flex flex-col justify-between group"
              >
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white group-hover:text-teal-600 transition-colors line-clamp-1">
                    {m.label}
                  </h4>
                  <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-tight">
                    {m.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. SEARCH & FILTER STRIP */}
      <div className="glass-premium p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 border border-slate-200 dark:border-slate-800">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by analysis ref, customer, or equipment findings..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Module Filter */}
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Modules</option>
            {AI_MODULES.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Verification Statuses</option>
            <option value="pending_review">Pending Review</option>
            <option value="confirmed">Confirmed</option>
            <option value="rejected">Rejected / Flagged</option>
          </select>

          {(search || moduleFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setModuleFilter('all'); setStatusFilter('all'); }}
              className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 5. ANALYSIS HISTORY LOG TABLE */}
      <div className="glass-premium rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                <th className="p-3 font-bold">Image / Ref</th>
                <th className="p-3 font-bold">Module</th>
                <th className="p-3 font-bold">Customer / User</th>
                <th className="p-3 font-bold">Key AI Findings</th>
                <th className="p-3 font-bold">Confidence</th>
                <th className="p-3 font-bold">Human Verification</th>
                <th className="p-3 font-bold">Date</th>
                <th className="p-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {analyses.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    No image analysis records found. Click "+ New AI Photo Scan" above to analyze your first image.
                  </td>
                </tr>
              ) : (
                analyses.map((a) => {
                  const mod = AI_MODULES.find(m => m.id === a.module) || AI_MODULES[0];
                  return (
                    <tr key={a._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                      
                      {/* Thumbnail & Ref */}
                      <td className="p-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                            {a.imagePreview ? (
                              <img src={a.imagePreview} alt="thumb" className="w-full h-full object-cover" />
                            ) : (
                              <Eye className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                          <div>
                            <span className="font-mono font-black text-slate-800 dark:text-white block">{a.analysisNumber}</span>
                            <span className="text-[10px] text-slate-400">{a.modelUsed || 'Gemini'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Module */}
                      <td className="p-3">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block">{mod.label}</span>
                      </td>

                      {/* Customer / Performer */}
                      <td className="p-3">
                        <span className="font-semibold text-slate-800 dark:text-white block">{a.customerName || a.performedBy || 'Guest'}</span>
                        <span className="text-[10px] text-slate-400 uppercase block">{a.userRole || 'customer'}</span>
                      </td>

                      {/* AI Findings Summary */}
                      <td className="p-3 max-w-xs">
                        {a.module === 'panel_defect' && (
                          <div>
                            <span className="font-bold text-rose-500">{a.extractedData?.defectType || 'Normal'}</span>
                            <span className="text-[10px] text-slate-500 block">Severity: {a.extractedData?.severity || 'Low'} (~{a.extractedData?.estimatedPowerLossPercent || 0}% Loss)</span>
                          </div>
                        )}
                        {a.module === 'eb_bill' && (
                          <div>
                            <span className="font-bold text-teal-600 dark:text-teal-400">Cons: {a.extractedData?.consumerNumber || 'N/A'}</span>
                            <span className="text-[10px] text-slate-500 block">₹{a.extractedData?.biMonthlyBillAmount} • Rec: {a.extractedData?.recommendedSolarKw} kW</span>
                          </div>
                        )}
                        {a.module === 'inverter_error' && (
                          <div>
                            <span className="font-bold text-amber-500">{a.extractedData?.brand} • {a.extractedData?.errorCodeDetected}</span>
                            <span className="text-[10px] text-slate-500 block">{a.extractedData?.hazardLevel} Hazard</span>
                          </div>
                        )}
                        {a.module === 'installation_audit' && (
                          <div>
                            <span className="font-bold text-indigo-500">Score: {a.extractedData?.overallQualityScore}/100</span>
                            <span className="text-[10px] text-slate-500 block">{a.extractedData?.approvalStatus}</span>
                          </div>
                        )}
                        {a.module === 'warranty_doc' && (
                          <div>
                            <span className="font-bold text-purple-500">{a.extractedData?.vendorName || 'Invoice'}</span>
                            <span className="text-[10px] text-slate-500 block">{a.extractedData?.invoiceNumber}</span>
                          </div>
                        )}
                        {a.module === 'component_id' && (
                          <div>
                            <span className="font-bold text-emerald-500">{a.extractedData?.componentCategory}</span>
                            <span className="text-[10px] text-slate-500 block">{a.extractedData?.equipmentName}</span>
                          </div>
                        )}
                      </td>

                      {/* Confidence */}
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          a.confidence === 'High' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          a.confidence === 'Medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {a.confidence || 'High'} ({Math.round((a.confidenceScore || 0.9) * 100)}%)
                        </span>
                      </td>

                      {/* Human Verification Status */}
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          a.reviewStatus === 'confirmed' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' :
                          a.reviewStatus === 'rejected' ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800' :
                          'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        }`}>
                          {a.reviewStatus === 'pending_review' ? '⏳ Pending Review' : a.reviewStatus}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="p-3 font-mono text-[10px] text-slate-400">
                        {a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN') : ''}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenReview(a)}
                            className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 font-bold text-[10px] flex items-center space-x-1"
                            title="Inspect & Review"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Review</span>
                          </button>
                          <button
                            onClick={() => handleDeleteAnalysis(a._id, a.analysisNumber)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. UPLOAD MODAL */}
      <AiImageUploadModal
        isOpen={Boolean(activeUploadModule)}
        onClose={() => setActiveUploadModule(null)}
        initialModule={activeUploadModule || 'panel_defect'}
        onAnalysisSaved={() => {
          fetchStats();
          fetchAnalyses();
        }}
      />

      {/* 7. INSPECTION DETAIL & REVIEW MODAL */}
      {reviewingAnalysis && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  Inspection Review: {reviewingAnalysis.analysisNumber}
                </h3>
                <p className="text-xs text-slate-400">{reviewingAnalysis.moduleTitle} • {reviewingAnalysis.customerName || 'Consumer'}</p>
              </div>
              <button
                onClick={() => setReviewingAnalysis(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photo preview */}
            {reviewingAnalysis.imagePreview && (
              <div className="w-full h-48 rounded-2xl bg-black border border-slate-800 overflow-hidden flex items-center justify-center">
                <img src={reviewingAnalysis.imagePreview} alt="Preview" className="w-full h-full object-contain" />
              </div>
            )}

            {/* Extracted Data JSON Editor / Review */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Structured Findings (Human Editable):
              </label>
              <textarea
                rows={6}
                value={JSON.stringify(reviewEditedData, null, 2)}
                onChange={(e) => {
                  try {
                    setReviewEditedData(JSON.parse(e.target.value));
                  } catch (err) {}
                }}
                className="w-full p-2.5 font-mono text-xs rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Remarks */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Technician / Staff Remarks:
              </label>
              <input
                type="text"
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                placeholder="e.g. Verified on site; replacement panel approved under warranty."
                className="w-full p-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleSaveReview('rejected')}
                disabled={submittingReview}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100"
              >
                Reject / Flag for Re-upload
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setReviewingAnalysis(null)}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveReview('confirmed')}
                  disabled={submittingReview}
                  className="px-5 py-2 text-xs font-black rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center space-x-1"
                >
                  <Check className="w-4 h-4" />
                  <span>{submittingReview ? 'Approving...' : 'Approve & Confirm'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
