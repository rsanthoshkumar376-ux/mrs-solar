import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Check, X, Share2, PlusSquare } from 'lucide-react';

export default function InstallAppBanner({ compact = false }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed as standalone app
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Listen for PWA beforeinstallprompt on Android / Chrome / Edge
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) {
      // If browser doesn't support beforeinstallprompt or already prompt shown
      alert('To install MRS SOLAR: Open your browser menu (3 dots) and tap "Install app" or "Add to Home Screen".');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || dismissed) {
    return null;
  }

  // Compact Button (Navbar / Header)
  if (compact) {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all transform hover:scale-105"
          title="Install as mobile/desktop app"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>

        {/* iOS Instruction Modal */}
        {showIosGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-teal-600" />
                  <span>Install on iPhone / iPad</span>
                </h3>
                <button onClick={() => setShowIosGuide(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5">
                <p>To install <strong>MRS SOLAR</strong> on your Apple device:</p>
                <ol className="list-decimal list-inside space-y-2 font-medium">
                  <li>Tap the <strong>Share</strong> button <Share2 className="w-3.5 h-3.5 inline mx-1 text-teal-600" /> at the bottom of Safari.</li>
                  <li>Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-teal-600" />.</li>
                  <li>Tap <strong>Add</strong> in the top right corner.</li>
                </ol>
                <p className="text-[11px] text-slate-400 pt-1">The app will appear directly on your home screen!</p>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="w-full py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold"
              >
                Got it
              </button>
            </div>
          </div>
        )}
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
              <span className="text-[10px] bg-teal-500/30 text-teal-200 px-2 py-0.5 rounded-full font-semibold uppercase">Free</span>
            </h4>
            <p className="text-xs text-teal-100/80 mt-0.5">
              Install to your home screen for fast 1-tap access and official fullscreen experience.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleInstallClick}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow transition transform hover:scale-105"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install Now</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-2 text-teal-300/60 hover:text-white rounded-lg transition"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-teal-600" />
                <span>Install on iPhone / iPad</span>
              </h3>
              <button onClick={() => setShowIosGuide(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5">
              <p>To install <strong>MRS SOLAR</strong> on your Apple device:</p>
              <ol className="list-decimal list-inside space-y-2 font-medium">
                <li>Tap the <strong>Share</strong> button <Share2 className="w-3.5 h-3.5 inline mx-1 text-teal-600" /> at the bottom of Safari.</li>
                <li>Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-teal-600" />.</li>
                <li>Tap <strong>Add</strong> in the top right corner.</li>
              </ol>
            </div>
            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
