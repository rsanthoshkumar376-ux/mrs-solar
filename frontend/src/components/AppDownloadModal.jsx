import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Download, Smartphone, QrCode, CheckCircle, ShieldCheck, 
  ExternalLink, X, Apple, ArrowDownToLine, Zap, AlertTriangle, Sparkles, Check
} from 'lucide-react';
import { getLanguage } from '../utils/translations.js';

export const GITHUB_APK_DOWNLOAD_URL = 'https://github.com/rsanthoshkumar376-ux/mrs-solar/releases/download/app-release/MRS-SOLAR.apk';
export const LOCAL_APK_DOWNLOAD_URL = '/api/download-apk';

export default function AppDownloadModal({ isOpen, onClose }) {
  // Default to 'pwa' (1-Tap Home Screen) because it never fails with parsing errors
  const [activeTab, setActiveTab] = useState('pwa'); 
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const lang = getLanguage();
  const isTa = lang === 'ta';

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
      alert(isTa
        ? "உங்கள் பிரவுசர் மூலம் நேரடியாக நிறுவ:\n1. Chrome-ல் மேல் வலது மூலையில் உள்ள 3 புள்ளிகளைத் (⋮) தொடவும்.\n2. 'Install app' அல்லது 'Add to Home screen' (முகப்புத் திரையில் சேர்) என்பதைத் தேர்ந்தெடுக்கவும்.\n3. 'Install' என்பதை அழுத்தவும். ஆப் உங்கள் மொபைலில் தோன்றும்!"
        : "To install directly without APK download errors:\n1. Tap the 3 dots (⋮) at top-right of Chrome browser.\n2. Tap 'Install app' or 'Add to Home screen'.\n3. Tap 'Install'. The MRS SOLAR app icon will appear on your phone!");
    }
  };

  const handleDirectDownload = () => {
    setDownloading(true);
    try {
      const link = document.createElement('a');
      link.href = LOCAL_APK_DOWNLOAD_URL;
      link.setAttribute('download', 'MRS-SOLAR.apk');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.warn('Direct download trigger error, redirecting:', e);
      window.location.href = LOCAL_APK_DOWNLOAD_URL;
    } finally {
      setTimeout(() => setDownloading(false), 2000);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const qrTargetUrl = isLocalHost ? GITHUB_APK_DOWNLOAD_URL : `${window.location.origin}/api/download-apk`;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto p-3 sm:p-6 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fade-in no-print">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl animate-scale-up relative flex flex-col max-h-[88vh] my-auto overflow-hidden">
        
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-colors z-20"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* MODAL HEADER */}
        <div className="shrink-0 p-5 sm:p-6 bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 text-white relative pr-12 overflow-hidden shadow-md">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-yellow-300/10 rounded-full blur-xl"></div>
          <div className="flex items-center space-x-3.5 relative z-10">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20 shrink-0 shadow-inner">
              <Smartphone className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full inline-block">
                {isTa ? '100% இலவசம் • Play Store தேவையில்லை' : '100% Free • No Play Store Needed'}
              </span>
              <h2 className="text-lg sm:text-xl font-black mt-1 leading-snug">
                {isTa ? 'MRS SOLAR செயலியை நிறுவவும்' : 'Install MRS SOLAR Mobile App'}
              </h2>
              <p className="text-xs text-teal-100 leading-tight">
                {isTa ? 'எந்த Android அல்லது iPhone மொபைலிலும் 2 நொடிகளில் நிறுவலாம்' : 'Add to any Android phone or iPhone in 2 seconds'}
              </p>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="shrink-0 flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('pwa')}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'pwa'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 text-yellow-300" />
            <span>{isTa ? '⚡ 1-Tap முகப்புத் திரை (பரிந்துரை)' : '⚡ 1-Tap Home Screen (Recommended)'}</span>
          </button>
          
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
            <span>{isTa ? 'Android APK கோப்பு (.apk)' : 'Direct Android APK (~5 MB)'}</span>
          </button>
        </div>

        {/* TAB 1: 1-TAP BROWSER INSTALL (RECOMMENDED • ZERO PARSING ERRORS) */}
        {activeTab === 'pwa' && (
          <div className="p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0">
            
            {/* INSTANT ONE-TAP INSTALL BUTTON */}
            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={handlePwaInstall}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-2xl flex items-center justify-center space-x-2 text-sm sm:text-base shadow-xl shadow-emerald-600/30 hover:shadow-emerald-600/40 transition-all active:scale-98"
              >
                <Zap className="w-5 h-5 text-yellow-300 animate-pulse" />
                <span>
                  {isPwaInstalled 
                    ? (isTa ? 'ஆப் ஏற்கனவே நிறுவப்பட்டது ✓' : 'App Already Installed ✓')
                    : (isTa ? 'மொபைலில் உடனே நிறுவவும் (Install Now)' : 'Install MRS SOLAR on Phone Now')}
                </span>
              </button>
              
              <div className="flex items-center justify-center space-x-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                <span>{isTa ? 'எந்த டவுன்லோடு பிழைகளும் இல்லை • 0 MB சேமிப்பிடம்' : 'Zero download errors • No Parsing Issues • Takes 0 MB'}</span>
              </div>
            </div>

            {/* ILLUSTRATED 3-STEP GUIDE FOR CHROME (ANDROID) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-black text-slate-800 dark:text-white">
                <Smartphone className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>{isTa ? 'Chrome மூலம் 3 எளிய படிகளில் நிறுவுங்கள்:' : 'Easy 3 Steps to Install on Android Phone:'}</span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-200">
                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-black flex items-center justify-center text-[11px] shrink-0 mt-0.5 shadow-xs">
                    1
                  </span>
                  <div>
                    <p className="font-bold">
                      {isTa ? 'Chrome பிரவுசரின் மேல் வலது மூலையில் உள்ள 3 புள்ளிகளைத் (⋮) தொடவும்.' : 'Tap the 3 dots menu (⋮) at top-right in Chrome.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-black flex items-center justify-center text-[11px] shrink-0 mt-0.5 shadow-xs">
                    2
                  </span>
                  <div>
                    <p className="font-bold">
                      {isTa ? '"Install app" அல்லது "Add to Home screen" (முகப்புத் திரையில் சேர்) என்பதை அழுத்தவும்.' : 'Select "Install app" or "Add to Home screen".'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-black flex items-center justify-center text-[11px] shrink-0 mt-0.5 shadow-xs">
                    3
                  </span>
                  <div>
                    <p className="font-bold">
                      {isTa ? '"Install" என்பதை அழுத்தவும். MRS SOLAR ஆப் உங்கள் மொபைல் திரையில் உடனடியாகத் தோன்றும்!' : 'Tap "Install". The MRS SOLAR app icon will appear instantly on your phone!'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* IPHONE (SAFARI) GUIDE */}
            <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 flex items-center space-x-3 text-xs">
              <Apple className="w-6 h-6 text-slate-800 dark:text-white shrink-0" />
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                {isTa
                  ? 'iPhone பயனர்கள்: Safari-ல் கீழே உள்ள Share [↑] பட்டனை அழுத்தி "Add to Home Screen" என்பதைத் தேர்ந்தெடுக்கவும்.'
                  : 'iPhone users: In Safari, tap the Share icon [↑] at the bottom and choose "Add to Home Screen".'}
              </p>
            </div>

          </div>
        )}

        {/* TAB 2: DIRECT APK DOWNLOAD */}
        {activeTab === 'android' && (
          <div className="p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0">
            
            {/* ALERT EXPLAINING PARSING FAILED ON MODERN ANDROID PHONES */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                <p className="font-black text-amber-800 dark:text-amber-300">
                  {isTa ? '⚠️ உங்கள் மொபைலில் "Parsing failed" என்று வருகிறதா?' : '⚠️ Getting "Parsing failed" or "Unable to parse APK"?'}
                </p>
                <p className="text-[11px] leading-relaxed">
                  {isTa
                    ? 'புதிய Android (Oppo, Realme, OnePlus, Vivo, Xiaomi) மொபைல்களில் பாதுகாப்பு காரணங்களுக்காக APK sideloading தடுக்கப்படுகிறது. மேலேயுள்ள "1-Tap முகப்புத் திரை" டேப்பைப் பயன்படுத்தவும் — எர்ரர் இல்லாமல் 2 நொடிகளில் ஆப் கிடைக்கும்!'
                    : 'Modern Android phones (ColorOS, OxygenOS, Realme UI) block third-party APK files for security. We strongly recommend using the "1-Tap Home Screen" tab above — it installs the exact same app in 2 seconds without any errors!'}
                </p>
              </div>
            </div>

            {/* DOWNLOAD BUTTONS */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleDirectDownload}
                disabled={downloading}
                className="w-full py-3.5 sm:py-4 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-600/70 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 text-xs sm:text-sm shadow-xl shadow-teal-600/20 hover:shadow-teal-600/30 transition-all group cursor-pointer"
              >
                <ArrowDownToLine className={`w-4 h-4 sm:w-5 sm:h-5 ${downloading ? 'animate-bounce' : 'group-hover:translate-y-0.5'} transition-transform`} />
                <span>{downloading ? (isTa ? 'பதிவிறக்கம் தொடங்குகிறது...' : 'Starting Download...') : (isTa ? 'MRS-SOLAR.apk நேரடி பதிவிறக்கம்' : 'Download MRS-SOLAR.apk (Direct Server)')}</span>
              </button>

              <div className="flex items-center justify-between gap-2 text-xs">
                <a
                  href={GITHUB_APK_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-center text-slate-600 dark:text-slate-300 font-semibold inline-flex items-center justify-center space-x-1.5 transition-colors"
                  title="Download from GitHub Cloud Releases"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>Cloud Mirror (GitHub)</span>
                </a>

                <span className="text-[11px] text-slate-400 px-2 font-mono">v1.0.0 • 5.4 MB</span>
              </div>
            </div>

            {/* SCAN QR CODE */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrTargetUrl)}`}
                  alt="Scan to Download APK"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start space-x-1.5 text-xs font-bold text-slate-800 dark:text-white">
                  <QrCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>{isTa ? 'கேமரா மூலம் ஸ்கேன் செய்யவும்' : 'Scan with Mobile Camera'}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {isTa ? 'உங்கள் மொபைல் கேமராவை இந்த QR குறியீட்டில் காட்டி நேரடியாக பதிவிறக்கலாம்.' : 'Point your phone camera or Google Lens at this QR code to download the APK directly.'}
                </p>
              </div>
            </div>

          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="shrink-0 px-5 sm:px-6 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>{isTa ? 'பாதுகாப்பானது • 100% Verified' : 'Verified Safe & Secure'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 font-semibold transition-colors"
          >
            {isTa ? 'மூடு (Close)' : 'Close'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
