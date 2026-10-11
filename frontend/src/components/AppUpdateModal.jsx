import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, Smartphone, ShieldCheck, CheckCircle2, 
  ArrowDownToLine, X, Sparkles, Zap, ExternalLink, AlertCircle
} from 'lucide-react';
import api from '../utils/api.js';
import { translations, getLanguage } from '../utils/translations.js';

export const CURRENT_APP_VERSION = 'v1.4.0';
export const BUILD_DATE = '11 Oct 2026';

export default function AppUpdateModal({ isOpen, onClose }) {
  const [lang, setLang] = useState(getLanguage);
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [versionInfo, setVersionInfo] = useState({
    version: CURRENT_APP_VERSION,
    releaseDate: BUILD_DATE,
    changelog: [
      'Google Pay for Business & PhonePe Merchant UPI Integration (0% Fee)',
      'Dynamic Merchant Settings Portal & Direct Bank Transfer (IMPS/NEFT) Fail-Safe',
      'Universal Multi-Fallback UPI Payment Modal with Android App Chooser',
      'Customer Record Editing & 12-Digit UTR Payment Reconciler',
      'Mobile Bottom Navigation Safe-Area & Dashboard Layout Optimization'
    ]
  });

  useEffect(() => {
    const handleLangChange = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLangChange);
    return () => window.removeEventListener('language-change', handleLangChange);
  }, []);

  const t = translations[lang] || translations.en;

  useEffect(() => {
    if (isOpen) {
      checkVersion();
    }
  }, [isOpen]);

  const checkVersion = async () => {
    setChecking(true);
    try {
      const res = await api.get('/version');
      if (res.data) {
        setVersionInfo(prev => ({
          ...prev,
          version: res.data.version || CURRENT_APP_VERSION,
          releaseDate: res.data.releaseDate || BUILD_DATE,
          changelog: res.data.changelog || prev.changelog
        }));
      }
    } catch (e) {
      // In offline or local fallback, keep default version info
      console.log('Version endpoint fallback:', e.message);
    } finally {
      setChecking(false);
    }
  };

  const handleInstantOtaUpdate = async () => {
    setUpdating(true);
    try {
      // 1. Force update Service Worker registrations
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          try {
            await reg.update();
          } catch (err) {
            console.warn('SW update error:', err);
          }
        }
      }

      // 2. Clear caches storage
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(key => caches.delete(key)));
      }

      // 3. Clear temporary asset keys
      try {
        localStorage.removeItem('mrs_solar_cache_ts');
      } catch (err) {
        console.warn(err);
      }

      setUpdateSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      console.error('Update refresh error:', err);
      window.location.reload();
    } finally {
      setTimeout(() => setUpdating(false), 2000);
    }
  };

  const handleDownloadLatestApk = () => {
    try {
      const link = document.createElement('a');
      link.href = '/api/download-apk';
      link.setAttribute('download', 'MRS-SOLAR.apk');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      window.open('https://github.com/rsanthoshkumar376-ux/mrs-solar/releases/download/app-release/MRS-SOLAR.apk', '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in no-print">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up relative">
        
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* MODAL HEADER */}
        <div className="p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
          <div className="flex items-center space-x-3 relative z-10">
            <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20 shadow-inner">
              <RefreshCw className={`w-6 h-6 text-white ${checking || updating ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                  OTA & APK Update Center
                </span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
              </div>
              <h2 className="text-xl font-black mt-1">{t.appUpdateTitle || 'App Updates & Upgrade'}</h2>
              <p className="text-xs text-teal-100/90">{t.appUpdateSubtitle || 'Keep MRS SOLAR running with the latest security and features'}</p>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* Current Version Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t.currentVersion || 'Current Version'}</span>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-base font-black text-slate-800 dark:text-white font-mono">{versionInfo.version}</span>
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-bold inline-flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{t.latestVersionInstalled || 'Latest Release'}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Build Date: {versionInfo.releaseDate}</p>
            </div>

            <button
              type="button"
              onClick={checkVersion}
              disabled={checking}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all flex items-center space-x-1 text-xs font-semibold"
              title="Re-check"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin text-teal-600' : ''}`} />
              <span className="hidden sm:inline">{checking ? 'Checking...' : 'Check'}</span>
            </button>
          </div>

          {/* Action 1: Instant Web Update (Over-the-Air) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleInstantOtaUpdate}
              disabled={updating}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/60 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 text-xs shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Zap className={`w-4 h-4 ${updating ? 'animate-bounce text-yellow-300' : ''}`} />
              <span>
                {updateSuccess 
                  ? (t.appUpdatedSuccess || 'Updated! Reloading...')
                  : updating 
                  ? (t.refreshingApp || 'Updating cache and refreshing...')
                  : (t.instantOtaUpdate || 'Instant Web Update (Clear Cache & Refresh)')}
              </span>
            </button>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 px-1 leading-relaxed">
              {t.instantOtaDesc || 'Instantly loads the latest website code and portal improvements over-the-air without re-downloading the APK.'}
            </p>
          </div>

          {/* Action 2: Download / Upgrade Android APK */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleDownloadLatestApk}
              className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 text-xs shadow-lg shadow-teal-600/20 hover:shadow-teal-600/30 transition-all cursor-pointer"
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>{t.downloadLatestApkBtn || 'Download Latest Android APK (MRS-SOLAR.apk)'}</span>
            </button>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 px-1 leading-relaxed">
              {t.downloadLatestApkDesc || 'Standalone Android APK installer (~5.4 MB) if you need to upgrade the native Android wrapper on your mobile phone.'}
            </p>
          </div>

          {/* What's New Section */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 dark:text-white">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{t.whatsNewInUpdate || "What's New in This Version"}</span>
            </div>
            
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              {versionInfo.changelog.map((item, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="w-4 h-4 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span className="leading-tight">{item}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* FOOTER */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Secure Signed Software</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold"
          >
            {t.cancel || 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
}

/**
 * Self-contained Update button with modal state for easy embedding in headers & navbars
 */
export function AppUpdateModalButton({ compact = false }) {
  const [showModal, setShowModal] = useState(false);
  const [lang, setLang] = useState(getLanguage);

  useEffect(() => {
    const handleLangChange = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLangChange);
    return () => window.removeEventListener('language-change', handleLangChange);
  }, []);

  const t = translations[lang] || translations.en;

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors relative"
          title={t.updateApp || 'Update App / ஆப் அப்டேட்'}
        >
          <RefreshCw className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full"></span>
        </button>

        <AppUpdateModal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full glass border border-emerald-500/30 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all shadow-sm group"
        title={t.updateApp || 'Update App / ஆப் அப்டேட்'}
      >
        <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
        <span>{t.updateApp || 'Update'}</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
      </button>

      <AppUpdateModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </>
  );
}
