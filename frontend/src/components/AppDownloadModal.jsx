import React, { useState, useEffect } from 'react';
import { 
  Download, Smartphone, QrCode, CheckCircle, ShieldCheck, 
  ExternalLink, X, Apple, ArrowDownToLine, Zap, Info 
} from 'lucide-react';

export const DIRECT_APK_DOWNLOAD_URL = 'https://github.com/rsanthoshkumar376-ux/mrs-solar/releases/download/app-release/MRS-SOLAR.apk';

export default function AppDownloadModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('android'); // 'android' or 'pwa'
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPwaInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handlePwaInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsPwaInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      alert("To install directly from your browser:\n• On Android (Chrome): Tap the 3 dots menu (⋮) > 'Install app' or 'Add to Home screen'.\n• On iPhone (Safari): Tap the Share button (↑) > 'Add to Home Screen'.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
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
        <div className="p-6 bg-gradient-to-r from-teal-700 to-emerald-700 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-yellow-300/10 rounded-full blur-xl"></div>
          <div className="flex items-center space-x-3 relative z-10">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20">
              <Smartphone className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                100% Free • No Play Store Needed
              </span>
              <h2 className="text-xl font-black mt-1">Get MRS SOLAR Mobile App</h2>
              <p className="text-xs text-teal-100">Install directly onto any Android phone or iPhone in seconds</p>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'android'
                ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Direct Android APK (~5 MB)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pwa')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'pwa'
                ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Browser 1-Tap Install (PWA)</span>
          </button>
        </div>

        {/* TAB 1: DIRECT APK DOWNLOAD */}
        {activeTab === 'android' && (
          <div className="p-6 space-y-5">
            
            {/* Download Button */}
            <div className="text-center space-y-2">
              <a
                href={DIRECT_APK_DOWNLOAD_URL}
                download="MRS-SOLAR.apk"
                className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 text-sm shadow-xl shadow-teal-600/20 hover:shadow-teal-600/30 transition-all group"
              >
                <ArrowDownToLine className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                <span>Download MRS-SOLAR.apk (Direct Installer)</span>
              </a>
              <p className="text-[11px] text-slate-400">Direct standalone APK file • Version 1.0.0 • Size: ~5.4 MB</p>
            </div>

            {/* Scan QR Code to Download on Phone */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <div className="w-24 h-24 bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center flex-shrink-0">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(DIRECT_APK_DOWNLOAD_URL)}`}
                  alt="Scan to Download APK"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start space-x-1.5 text-xs font-bold text-slate-800 dark:text-white">
                  <QrCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Scan with Mobile Camera</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Open your phone's camera or Google Lens, point at this QR code to download the APK directly onto your phone!
                </p>
              </div>
            </div>

            {/* Sideloading Steps Guide */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">How to Install on Android:</span>
              <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 font-bold flex items-center justify-center text-[10px] flex-shrink-0">1</span>
                  <span>Tap <strong>Download</strong> and open the downloaded APK file.</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 font-bold flex items-center justify-center text-[10px] flex-shrink-0">2</span>
                  <span>If prompted with <em>"Install unknown apps"</em>, toggle <strong>Allow from this source</strong>.</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 font-bold flex items-center justify-center text-[10px] flex-shrink-0">3</span>
                  <span>Tap <strong>Install</strong>. The app icon is now on your home screen!</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: PWA 1-TAP INSTALL */}
        {activeTab === 'pwa' && (
          <div className="p-6 space-y-5">
            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={handlePwaInstall}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 text-sm shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all"
              >
                <Zap className="w-5 h-5" />
                <span>{isPwaInstalled ? 'App Already Installed' : '1-Tap Add to Home Screen'}</span>
              </button>
              <p className="text-[11px] text-slate-400">Installs directly through Chrome, Edge, or Safari with 0 storage download</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-slate-800 dark:text-white">
                  <Smartphone className="w-4 h-4 text-emerald-500" />
                  <span>Android (Chrome/Edge)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tap the 3 dots <strong>⋮</strong> in your browser menu and choose <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-slate-800 dark:text-white">
                  <Apple className="w-4 h-4 text-slate-800 dark:text-white" />
                  <span>iPhone (iOS Safari)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tap the <strong>Share</strong> button <strong>[↑]</strong> at the bottom of Safari and select <strong>"Add to Home Screen"</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Verified Safe & Secure</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
