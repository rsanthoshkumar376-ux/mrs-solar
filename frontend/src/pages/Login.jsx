import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Sun, Moon, Lock, User, ShieldAlert, Eye, EyeOff, Languages, Sparkles, ShieldCheck, ArrowRight, Zap } from 'lucide-react';
import InstallAppBanner from '../components/InstallAppBanner.jsx';
import { AppUpdateModalButton } from '../components/AppUpdateModal.jsx';
import SolarSunriseBackground from '../components/SolarSunriseBackground.jsx';
import SolarCalculatorModal from '../components/SolarCalculatorModal.jsx';
import { translations, getLanguage, setLanguage } from '../utils/translations.js';

export default function Login() {
  const [roleTab, setRoleTab] = useState('customer'); // 'customer' or 'admin'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoadingRole, setDemoLoadingRole] = useState(null); // 'admin' | 'customer' | null
  const [showCalculator, setShowCalculator] = useState(false);
  const [lang, setLang] = useState(getLanguage);

  useEffect(() => {
    const handleLangChange = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLangChange);
    return () => window.removeEventListener('language-change', handleLangChange);
  }, []);

  const t = translations[lang] || translations.en;

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Handle routing if already authenticated
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/customer');
      }
    }
  }, [user, navigate]);

  // Handle dark mode class toggling
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleDemoLogin = async (role) => {
    setError('');
    setDemoLoadingRole(role);
    setLoading(true);

    const demoUser = role === 'admin' ? 'MRSassociates' : 'deepi';
    const demoPass = role === 'admin' ? '2332' : '08072454996';

    setRoleTab(role);
    setUsername(demoUser);
    setPassword(demoPass);

    try {
      const loggedUser = await login(demoUser, demoPass);
      if (loggedUser.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/customer');
      }
    } catch (err) {
      console.warn('Initial demo login attempt, retrying with backup credentials...', err);
      try {
        const altPass = role === 'admin' ? 'admin123' : 'customer123';
        const loggedUser = await login(demoUser, altPass);
        if (loggedUser.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/customer');
        }
      } catch (retryErr) {
        console.error('Demo login failed:', retryErr);
        setError(retryErr.response?.data?.message || 'Demo login failed. Please check connection.');
      }
    } finally {
      setLoading(false);
      setDemoLoadingRole(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError(t.fillAllFieldsError);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const loggedUser = await login(username, password);
      if (loggedUser.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/customer');
      }
    } catch (err) {
      console.error(err);
      if (!err.response) {
        setError('Server is initializing. Retrying automatically, please wait a moment...');
      } else {
        setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectTab = (tab) => {
    setRoleTab(tab);
    setUsername('');
    setPassword('');
    setShowPassword(false);
    setError('');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-8 overflow-x-hidden selection:bg-teal-500 selection:text-white transition-colors duration-300">
      {/* 60 FPS Full-Screen Ambient Golden Sunrise Animation Canvas */}
      <SolarSunriseBackground />

      {/* Top action controls: App Update, Language Switcher & Dark Mode Switcher */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
        <AppUpdateModalButton />

        <button
          type="button"
          onClick={() => {
            const nextLang = lang === 'en' ? 'ta' : 'en';
            setLang(nextLang);
            setLanguage(nextLang);
          }}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-900/70 hover:bg-slate-900/90 border border-white/20 backdrop-blur-md text-xs font-bold text-slate-200 hover:text-teal-400 transition-colors shadow-md"
          title="Switch Language / மொழி மாற்றுக"
        >
          <Languages className="w-3.5 h-3.5 text-teal-400" />
          <span>{lang === 'en' ? 'தமிழ்' : 'English'}</span>
        </button>

        <button 
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-full bg-slate-900/70 hover:bg-slate-900/90 border border-white/20 backdrop-blur-md text-slate-200 hover:text-teal-400 transition-colors shadow-md"
          aria-label="Toggle theme"
        >
          {darkMode ? <Sun className="w-4 h-4 text-yellow-300" /> : <Moon className="w-4 h-4 text-slate-300" />}
        </button>
      </div>

      <div className="w-full max-w-md relative z-10 my-auto">
        {/* LOGO & HEADING */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-teal-600/90 dark:bg-teal-500/90 rounded-2xl flex items-center justify-center shadow-xl shadow-teal-500/30 mb-3 border border-teal-400/40 backdrop-blur-md animate-pulse-soft">
            <Sun className="w-10 h-10 text-yellow-300 animate-spin" style={{ animationDuration: '20s' }} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-lg">
            MRS <span className="text-teal-400">SOLAR</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium drop-shadow">{t.loginTitle}</p>
        </div>

        {/* INSTALL APP PROMPT */}
        <div className="mb-4">
          <InstallAppBanner />
        </div>

        {/* FROSTED GLASS LOGIN CARD */}
        <div className="glass-premium rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden bg-slate-900/80 dark:bg-slate-900/85 border border-white/15 dark:border-slate-700/60 backdrop-blur-2xl">
          {/* Card background decorative shapes */}
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-500/15 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-teal-500/15 rounded-full blur-2xl pointer-events-none"></div>

          {/* ⚡ 1-CLICK DEMO LOGIN BUTTONS */}
          <div className="mb-6 bg-slate-950/70 border border-teal-500/30 rounded-2xl p-3.5 relative overflow-hidden shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-teal-300">
                  {t.demoSectionTitle || '⚡ Quick 1-Click Demo Login'}
                </span>
              </div>
              <span className="text-[10px] bg-teal-500/20 text-teal-300 font-bold px-2 py-0.5 rounded-full border border-teal-400/30">
                Instant Tour
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
              {t.demoSectionSubtitle || 'Explore the live portal instantly — no password required:'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Demo Owner Button */}
              <button
                type="button"
                onClick={() => handleDemoLogin('admin')}
                disabled={loading}
                className="group relative flex flex-col items-start p-3 rounded-xl bg-gradient-to-br from-indigo-950/80 to-purple-950/70 hover:from-indigo-900/90 hover:to-purple-900/80 border border-purple-500/40 hover:border-purple-400 transition-all duration-200 text-left shadow-md hover:shadow-purple-500/20 active:scale-[0.98] disabled:opacity-50"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center space-x-1.5">
                    <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-400/30">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-extrabold text-white group-hover:text-purple-200">
                      {t.demoAdminBtn || 'Owner / Admin'}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <span className="text-[10px] text-slate-300 leading-tight">
                  {t.demoAdminSubtitle || 'Loans, approvals & reports'}
                </span>
                {demoLoadingRole === 'admin' && (
                  <div className="absolute inset-0 bg-slate-950/85 rounded-xl flex items-center justify-center space-x-1.5 text-purple-300 text-xs font-bold backdrop-blur-sm">
                    <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>{t.demoLoggingIn || 'Accessing Demo...'}</span>
                  </div>
                )}
              </button>

              {/* Demo Customer Button */}
              <button
                type="button"
                onClick={() => handleDemoLogin('customer')}
                disabled={loading}
                className="group relative flex flex-col items-start p-3 rounded-xl bg-gradient-to-br from-teal-950/80 to-emerald-950/70 hover:from-teal-900/90 hover:to-emerald-900/80 border border-teal-500/40 hover:border-teal-400 transition-all duration-200 text-left shadow-md hover:shadow-teal-500/20 active:scale-[0.98] disabled:opacity-50"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center space-x-1.5">
                    <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-400/30">
                      <Sun className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-extrabold text-white group-hover:text-teal-200">
                      {t.demoCustomerBtn || 'Customer Portal'}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-teal-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <span className="text-[10px] text-slate-300 leading-tight">
                  {t.demoCustomerSubtitle || 'Solar kW, EMIs & subsidy'}
                </span>
                {demoLoadingRole === 'customer' && (
                  <div className="absolute inset-0 bg-slate-950/85 rounded-xl flex items-center justify-center space-x-1.5 text-teal-300 text-xs font-bold backdrop-blur-sm">
                    <div className="w-3.5 h-3.5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>{t.demoLoggingIn || 'Accessing Demo...'}</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* DIVIDER */}
          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-slate-700/80 w-full"></div>
            <span className="bg-slate-900 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">
              {t.orDivider || 'OR SIGN IN MANUALLY'}
            </span>
            <div className="border-t border-slate-700/80 w-full"></div>
          </div>

          {/* TAB HEADERS */}
          <div className="flex space-x-1 p-1 bg-slate-950/70 rounded-2xl mb-6 border border-slate-800/80">
            <button
              type="button"
              onClick={() => selectTab('customer')}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 ${
                roleTab === 'customer'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.customerLoginTab}
            </button>
            <button
              type="button"
              onClick={() => selectTab('admin')}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 ${
                roleTab === 'admin'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.adminLoginTab}
            </button>
          </div>

          {error && (
            <div className="flex items-center space-x-2 bg-red-500/15 border border-red-500/30 text-red-300 p-3 rounded-xl text-xs sm:text-sm mb-6">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                {roleTab === 'customer' ? t.loginIdentifierLabel : t.loginIdentifierAdminLabel}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={roleTab === 'customer' ? t.loginIdentifierPlaceholder : t.loginIdentifierAdminPlaceholder}
                  className="w-full bg-slate-950/70 border border-slate-700/80 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 rounded-xl py-3 pl-10 pr-4 outline-none transition-all text-white placeholder:text-slate-500 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  {t.passwordLabel}
                </label>
                {roleTab === 'customer' && (
                  <span className="text-[11px] text-teal-400 font-medium">
                    {t.passwordHint}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={roleTab === 'customer' ? t.passwordPlaceholderCustomer : t.passwordPlaceholderAdmin}
                  className="w-full bg-slate-950/70 border border-slate-700/80 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 rounded-xl py-3 pl-10 pr-11 outline-none transition-all text-white placeholder:text-slate-500 text-xs sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-teal-400 focus:outline-none transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-600/50 text-white font-bold rounded-xl transition-all shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-900 text-xs sm:text-sm active:scale-[0.99]"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{t.loggingInBtn}</span>
                </div>
              ) : (
                t.signInBtn
              )}
            </button>
          </form>
        </div>

        {/* PUBLIC SOLAR ROI & PM SURYA GHAR SUBSIDY CALCULATOR */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowCalculator(true)}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-teal-500/20 hover:from-amber-500/30 hover:to-teal-500/30 border border-amber-400/40 text-amber-200 hover:text-white font-extrabold text-xs shadow-lg backdrop-blur-md flex items-center justify-center space-x-2 transition-all active:scale-[0.99]"
          >
            <Sun className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>{lang === 'ta' ? '☀️ சோலார் சேமிப்பு & மத்திய மானிய கணக்கீடு' : '☀️ Calculate Solar Savings & PM Surya Ghar Subsidy'}</span>
          </button>
        </div>

        {/* SOLAR CALCULATOR MODAL */}
        <SolarCalculatorModal 
          isOpen={showCalculator} 
          onClose={() => setShowCalculator(false)} 
        />

      </div>
    </div>
  );
}
