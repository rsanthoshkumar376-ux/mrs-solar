import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Zap } from 'lucide-react';
import AppDownloadModal from './AppDownloadModal.jsx';
import { getLanguage } from '../utils/translations.js';

const isRunningInApp = () => {
  if (typeof window === 'undefined') return false;
  try {
    const ua = (window.navigator.userAgent || '').toLowerCase();
    
    // 1. Android APK native WebView custom User-Agent identifier
    if (ua.includes('mrssolarapp') || ua.includes('; wv') || (ua.includes('android') && ua.includes('version/'))) {
      return true;
    }

    // 2. Standalone PWA display mode
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      window.navigator.standalone === true
    ) {
      return true;
    }

    // 3. Android app referrer or launch flag
    if (document.referrer && document.referrer.startsWith('android-app://')) {
      return true;
    }

    // 4. Capacitor / Cordova / Native environment
    if (window.Capacitor !== undefined || window.cordova !== undefined || window._isNativeApp === true) {
      return true;
    }

    // 5. Query parameter flag (e.g. ?app=true or ?source=apk)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('app') === 'true' || urlParams.get('source') === 'apk' || urlParams.get('standalone') === 'true') {
      return true;
    }
  } catch (err) {
    console.warn('App environment check error:', err);
  }
  return false;
};

export default function InstallAppBanner({ compact = false }) {
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(isRunningInApp);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('mrs_install_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isRunningInApp()) {
      setIsInstalled(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('mrs_install_banner_dismissed', 'true');
    } catch (e) {
      console.warn(e);
    }
  };

  const handleOpenModal = () => {
    setShowDownloadModal(true);
  };

  if (isInstalled || dismissed) {
    return showDownloadModal ? (
      <AppDownloadModal 
        isOpen={showDownloadModal} 
        onClose={() => setShowDownloadModal(false)} 
      />
    ) : null;
  }

  const lang = getLanguage();
  const isTa = lang === 'ta';

  // Compact Button (Navbar / Header)
  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={handleOpenModal}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all transform hover:scale-105 active:scale-95"
          title="Install MRS SOLAR App"
        >
          <Zap className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
          <span>{isTa ? 'ஆப் நிறுவல் (1-Tap)' : 'Install App (1-Tap)'}</span>
        </button>

        <AppDownloadModal 
          isOpen={showDownloadModal} 
          onClose={() => setShowDownloadModal(false)} 
        />
      </>
    );
  }

  // Full Promotional Banner (Login page / Dashboard top)
  return (
    <>
      <div className="bg-gradient-to-r from-teal-900/95 via-emerald-900/90 to-slate-900 p-4 rounded-2xl border border-emerald-500/30 shadow-lg text-white flex flex-col sm:flex-row items-center justify-between gap-3 my-4">
        <div className="flex items-center space-x-3 text-left">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 shadow-inner">
            <Smartphone className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <h4 className="font-black text-sm flex items-center gap-2">
              <span>{isTa ? 'MRS SOLAR மொபைல் செயலியை நிறுவவும்' : 'Install MRS SOLAR Mobile App'}</span>
              <span className="text-[10px] bg-emerald-400 text-slate-900 px-2 py-0.5 rounded-full font-black uppercase">
                {isTa ? '1-Tap நிறுவல்' : '1-Tap Install'}
              </span>
            </h4>
            <p className="text-xs text-teal-100/90 mt-0.5">
              {isTa ? 'எந்த Android அல்லது iPhone மொபைலிலும் பிழையின்றி 2 நொடிகளில் நிறுவலாம்.' : 'Add to home screen instantly on Android & iPhone with zero download errors.'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleOpenModal}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs rounded-xl shadow-lg transition transform hover:scale-105 active:scale-95"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isTa ? 'நிறுவ (Get App)' : 'Get App'}</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-2 text-teal-300/60 hover:text-white rounded-lg transition"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AppDownloadModal 
        isOpen={showDownloadModal} 
        onClose={() => setShowDownloadModal(false)} 
      />
    </>
  );
}
