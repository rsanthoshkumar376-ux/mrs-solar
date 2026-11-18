import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, Home, ShieldAlert } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[MRS SOLAR ErrorBoundary Caught]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleHardReload = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) {
          try { await r.unregister(); } catch (e) {}
        }
      }
      sessionStorage.clear();
    } catch (e) {
      console.warn('Cache clearing note:', e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-teal-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            {/* Top Glow Accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-600" />

            <div className="flex items-center space-x-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">MRS SOLAR Portal Recovery</h2>
                <p className="text-xs text-slate-400">An unexpected view error was safely intercepted</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300 mb-6 max-h-36 overflow-y-auto">
              <p className="text-rose-400 font-bold mb-1">
                {this.state.error?.name || 'Error'}: {this.state.error?.message || 'Unknown view exception'}
              </p>
              <p className="text-[11px] text-slate-500">
                The application state remains protected. You can recover by refreshing or returning to portal home.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all shadow-lg shadow-teal-600/20 active:scale-[0.98]"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry View</span>
              </button>

              <button
                type="button"
                onClick={this.handleHardReload}
                className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Clear Cache & Reload</span>
              </button>
            </div>

            <div className="mt-4 text-center">
              <a
                href="/login"
                className="inline-flex items-center space-x-1 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <Home className="w-3.5 h-3.5 mr-1" />
                <span>Return to Portal Sign-In</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
