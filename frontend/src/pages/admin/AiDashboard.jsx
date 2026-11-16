import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import {
  Sparkles, Zap, Sun, Wrench, Layers, FileText, CheckCircle2,
  AlertCircle, ShieldAlert, Clock, RefreshCw, Check, X, Eye,
  TrendingUp, Award, DollarSign, Activity, Server, ArrowUpRight
} from 'lucide-react';
import AiImageAnalyzerModal from '../../components/AiImageAnalyzerModal.jsx';

export default function AiDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAnalyzerModal, setShowAnalyzerModal] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/ai/usage-stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load AI stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReview = async (id) => {
    try {
      setActionLoading(true);
      await api.post(`/ai/reviews/${id}`, {
        status: 'Verified',
        notes: 'Verified by Owner Super Admin'
      });
      setSuccessMsg('Analysis record marked as verified!');
      setTimeout(() => setSuccessMsg(''), 4000);
      setSelectedAnalysis(null);
      fetchStats();
    } catch (err) {
      setErrorMsg('Failed to approve review');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500">Loading Gemini 2.5 Flash AI Dashboard...</p>
      </div>
    );
  }

  const m = stats?.metrics || {};
  const recentAnalyses = stats?.recentAnalyses || [];

  return (
    <div className="space-y-6">
      
      {/* Alert Banners */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-950 via-teal-950 to-slate-900 p-6 rounded-2xl border border-teal-800/30 shadow-xl text-white">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
              GOOGLE GEMINI 2.5 FLASH AI
            </span>
            <span className="text-xs text-emerald-400 font-bold">● Free-Tier Active</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
            <span>AI Multimodal Analytics & Vision Control</span>
            <Sparkles className="w-5 h-5 text-yellow-400" />
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Real-time monitoring of OCR scans, solar panel diagnostics, inverter error code resolutions, and automated installation audits.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAnalyzerModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg flex items-center space-x-2 transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span>Launch Vision Inspector</span>
          </button>
          <button
            onClick={fetchStats}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PRIMARY STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total AI Requests</span>
            <Activity className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{m.totalRequests || 0}</p>
          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
            {m.successfulRequests || 0} Successful • {m.failedRequests || 0} Failed
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Images Analyzed</span>
            <Eye className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{m.totalImagesAnalyzed || 0}</p>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
            Multimodal OCR & Vision
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Pending Review</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{m.pendingManualApprovals || 0}</p>
          <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
            Human verification standard
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Estimated Cost</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹0.00</p>
          <p className="text-[10px] text-teal-600 font-semibold mt-0.5">
            100% Free Tier (15 RPM / 1M TPM)
          </p>
        </div>

      </div>

      {/* CATEGORY BREAKDOWN CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <Zap className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
          <p className="text-xl font-black text-slate-800 dark:text-white">{m.ebBillsProcessed || 0}</p>
          <p className="text-[10px] font-bold text-slate-500">TNEB Bills</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <Sun className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-xl font-black text-slate-800 dark:text-white">{m.solarPanelInspections || 0}</p>
          <p className="text-[10px] font-bold text-slate-500">Panel Inspections</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <Wrench className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-xl font-black text-slate-800 dark:text-white">{m.inverterInspections || 0}</p>
          <p className="text-[10px] font-bold text-slate-500">Inverter Scans</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <Layers className="w-5 h-5 text-teal-500 mx-auto mb-1" />
          <p className="text-xl font-black text-slate-800 dark:text-white">{m.installationReports || 0}</p>
          <p className="text-[10px] font-bold text-slate-500">Installation Audits</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <FileText className="w-5 h-5 text-purple-500 mx-auto mb-1" />
          <p className="text-xl font-black text-slate-800 dark:text-white">{m.documentsProcessed || 0}</p>
          <p className="text-[10px] font-bold text-slate-500">Warranty & Invoices</p>
        </div>
      </div>

      {/* RECENT ANALYSES AUDIT TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center space-x-2">
            <Eye className="w-4 h-4 text-teal-600" />
            <span>Recent AI Visual Analyses & Extractions</span>
          </h3>
          <span className="text-xs text-slate-500">
            Model: <strong className="text-teal-600">{stats?.model || 'gemini-2.5-flash'}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Analysis Type</th>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Confidence</th>
                <th className="p-3.5">Latency</th>
                <th className="p-3.5">Review Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentAnalyses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No visual analyses performed yet. Click "Launch Vision Inspector" above to analyze your first image!
                  </td>
                </tr>
              ) : (
                recentAnalyses.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                    <td className="p-3.5">
                      <span className="font-bold text-slate-800 dark:text-white text-xs">
                        {item.analysisType}
                      </span>
                      <p className="text-[10px] text-slate-400 font-mono">{item._id}</p>
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.confidence === 'high' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.confidence || 'Medium'}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono">
                      {item.durationMs || 1200}ms
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.status === 'Verified'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {item.status || 'Pending Review'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setSelectedAnalysis(item)}
                          className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-800"
                          title="View Data"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {item.status === 'Pending Review' && (
                          <button
                            onClick={() => handleApproveReview(item._id)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800"
                            title="Verify & Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL JSON MODAL */}
      {selectedAnalysis && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                AI Analysis: {selectedAnalysis.analysisType}
              </h3>
              <button onClick={() => setSelectedAnalysis(null)}>
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <pre className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs overflow-x-auto text-slate-800 dark:text-slate-200 font-mono max-h-72">
              {JSON.stringify(selectedAnalysis.extractedData, null, 2)}
            </pre>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setSelectedAnalysis(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              {selectedAnalysis.status !== 'Verified' && (
                <button
                  onClick={() => handleApproveReview(selectedAnalysis._id)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Verify Analysis</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MULTIMODAL INSPECTOR MODAL */}
      <AiImageAnalyzerModal
        isOpen={showAnalyzerModal}
        onClose={() => {
          setShowAnalyzerModal(false);
          fetchStats();
        }}
      />

    </div>
  );
}
