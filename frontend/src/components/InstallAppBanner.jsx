import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X } from 'lucide-react';
import AppDownloadModal from './AppDownloadModal.jsx';

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

  // Compact Button (Navbar / Header)
  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={handleOpenModal}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all transform hover:scale-105"
          title="Download Android APK or Install App"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Install / APK</span>
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
      <div className="bg-gradient-to-r from-teal-900/90 via-emerald-900/80 to-slate-900 p-4 rounded-2xl border border-teal-500/30 shadow-lg text-white flex flex-col sm:flex-row items-center justify-between gap-3 my-4">
        <div className="flex items-center space-x-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center shrink-0">
            <Smartphone className="w-6 h-6 text-teal-300" />
          </div>
          <div>
            <h4 className="font-bold text-sm flex items-center gap-2">
              <span>Install MRS SOLAR Mobile App</span>
              <span className="text-[10px] bg-teal-500/30 text-teal-200 px-2 py-0.5 rounded-full font-semibold uppercase">Free APK & PWA</span>
            </h4>
            <p className="text-xs text-teal-100/80 mt-0.5">
              Direct Android APK (~5 MB) or 1-tap browser install. No Play Store account required.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleOpenModal}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow transition transform hover:scale-105"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Get App</span>
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
