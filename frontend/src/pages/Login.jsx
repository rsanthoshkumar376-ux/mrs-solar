import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Sun, Moon, Lock, User, ShieldAlert, Eye, EyeOff, Languages, Sparkles, ShieldCheck, ArrowRight, Zap, Gift, Users, Briefcase } from 'lucide-react';
import InstallAppBanner from '../components/InstallAppBanner.jsx';
import { AppUpdateModalButton } from '../components/AppUpdateModal.jsx';
import SolarSunriseBackground from '../components/SolarSunriseBackground.jsx';
import SolarCalculatorModal from '../components/SolarCalculatorModal.jsx';
import NewCustomerReferralModal from '../components/NewCustomerReferralModal.jsx';
import AiChatbot from '../components/AiChatbot.jsx';
import { translations, getLanguage, setLanguage } from '../utils/translations.js';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoadingRole, setDemoLoadingRole] = useState(null); // 'admin' | 'customer' | null
  const [showCalculator, setShowCalculator] = useState(false);
  const [lang, setLang] = useState(getLanguage);

  const trimmedUser = username.trim().toLowerCase();
  const isAdminDetected = trimmedUser === 'mrsassociates' || trimmedUser.startsWith('admin') || trimmedUser === 'mrs';
  const isManagerDetected = trimmedUser.startsWith('mgr') || trimmedUser.includes('manager') || trimmedUser === 'suresh_mgr';
  const isWorkerDetected = trimmedUser.startsWith('emp') || trimmedUser.includes('worker') || trimmedUser === 'karthik_worker' || trimmedUser === 'praveen_solar';

  // Referral URL query param detection (?ref=MRS-SOL1001 or ?code=...)
  const [referralCode, setReferralCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('ref') || params.get('code') || params.get('referral') || '';
  });
  const [showReferralModal, setShowReferralModal] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return !!(params.get('ref') || params.get('code') || params.get('referral'));
  });

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

  const redirectByRole = (role) => {
    if (role === 'admin') navigate('/admin');
    else if (role === 'manager') navigate('/manager');
    else if (role === 'worker') navigate('/worker');
    else navigate('/customer');
  };

  // Handle routing if already authenticated
  useEffect(() => {
    if (user) {
      redirectByRole(user.role);
    }
  }, [user]);

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

    let demoUser = 'deepi';
    let demoPass = '08072454996';
    let altPass = 'customer123';

    if (role === 'admin') {
      demoUser = 'MRSassociates';
      demoPass = '2332';
      altPass = 'admin123';
    } else if (role === 'manager') {
      demoUser = 'MGR-1001';
      demoPass = 'manager123';
      altPass = 'manager123';
    } else if (role === 'worker') {
      demoUser = 'EMP-1001';
      demoPass = 'worker123';
      altPass = 'worker123';
    }

    setUsername(demoUser);
    setPassword(demoPass);

    try {
      const loggedUser = await login(demoUser, demoPass);
      redirectByRole(loggedUser.role);
    } catch (err) {
      console.warn('Initial demo login attempt, retrying with backup credentials...', err);
      try {
        const loggedUser = await login(demoUser, altPass);
        redirectByRole(loggedUser.role);
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
      redirectByRole(loggedUser.role);
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

        {/* SPECIAL REFERRAL & NEW CUSTOMER SHOWCASE BANNER */}
        <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/90 via-indigo-950/85 to-slate-900 border border-purple-500/40 text-left shadow-xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 bg-purple-900/60 border border-purple-500/30 px-2 py-0.5 rounded-full flex items-center space-x-1">
                <Gift className="w-3 h-3 text-pink-400" />
                <span>{referralCode ? `${referralCode}` : (lang === 'ta' ? 'புதிய வாடிக்கையாளர் தளம்' : 'Referral & New User Portal')}</span>
              </span>
              <span className="text-[10px] text-amber-300 font-bold">
                ★ ₹78,000 Subsidy
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowReferralModal(true);
              }}
              className="text-[11px] font-bold text-teal-300 hover:text-white underline cursor-pointer px-1 py-0.5 rounded hover:bg-slate-800/60 transition-colors"
            >
              {lang === 'ta' ? 'மேலோட்டம்' : 'Quick View'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 pr-1">
              <h4 className="font-extrabold text-xs sm:text-sm text-white truncate">
                {lang === 'ta' ? 'சோலார் நன்மைகள், EMI & தேவையான ஆவணங்கள்' : 'New User Requirements, EMI & Solar Benefits'}
              </h4>
              <p className="text-[11px] text-slate-400">
                {lang === 'ta' ? 'பிரத்யேக பரிந்துரை தளத்தை பார்வையிடுங்கள்' : 'Visit our dedicated Referral Website with interactive EMI calculator'}
              </p>
            </div>

            <Link
              to={`/referral${referralCode ? `?ref=${referralCode}` : ''}`}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xs shrink-0 shadow-md flex items-center space-x-1.5 transition-all hover:scale-105 active:scale-95"
            >
              <span>{lang === 'ta' ? 'தளத்திற்கு செல்' : 'Visit Site'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* 1. Demo Owner */}
              <button
                type="button"
                onClick={() => handleDemoLogin('admin')}
                disabled={loading}
                className="group relative flex flex-col items-start p-2.5 rounded-xl bg-gradient-to-br from-purple-950/80 to-indigo-950/70 hover:from-purple-900/90 hover:to-indigo-900/80 border border-purple-500/40 text-left transition-all active:scale-95 disabled:opacity-50 shadow-sm"
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <div className="p-1 rounded-md bg-purple-500/20 text-purple-300">
                    <ShieldCheck className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-black text-white group-hover:text-purple-200">Owner</span>
                </div>
                <span className="text-[9px] text-slate-300 leading-tight">Admin Portal</span>
                {demoLoadingRole === 'admin' && (
                  <div className="absolute inset-0 bg-slate-950/90 rounded-xl flex items-center justify-center text-[10px] text-purple-300 font-bold">
                    ...
                  </div>
                )}
              </button>

              {/* 2. Demo Manager */}
              <button
                type="button"
                onClick={() => handleDemoLogin('manager')}
                disabled={loading}
                className="group relative flex flex-col items-start p-2.5 rounded-xl bg-gradient-to-br from-indigo-950/80 to-blue-950/70 hover:from-indigo-900/90 hover:to-blue-900/80 border border-indigo-500/40 text-left transition-all active:scale-95 disabled:opacity-50 shadow-sm"
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <div className="p-1 rounded-md bg-indigo-500/20 text-indigo-300">
                    <Users className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-black text-white group-hover:text-indigo-200">Manager</span>
                </div>
                <span className="text-[9px] text-slate-300 leading-tight">Team Portal</span>
                {demoLoadingRole === 'manager' && (
                  <div className="absolute inset-0 bg-slate-950/90 rounded-xl flex items-center justify-center text-[10px] text-indigo-300 font-bold">
                    ...
                  </div>
                )}
              </button>

              {/* 3. Demo Worker */}
              <button
                type="button"
                onClick={() => handleDemoLogin('worker')}
                disabled={loading}
                className="group relative flex flex-col items-start p-2.5 rounded-xl bg-gradient-to-br from-amber-950/80 to-orange-950/70 hover:from-amber-900/90 hover:to-orange-900/80 border border-amber-500/40 text-left transition-all active:scale-95 disabled:opacity-50 shadow-sm"
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <div className="p-1 rounded-md bg-amber-500/20 text-amber-300">
                    <Briefcase className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-black text-white group-hover:text-amber-200">Worker</span>
                </div>
                <span className="text-[9px] text-slate-300 leading-tight">Tasks & Target</span>
                {demoLoadingRole === 'worker' && (
                  <div className="absolute inset-0 bg-slate-950/90 rounded-xl flex items-center justify-center text-[10px] text-amber-300 font-bold">
                    ...
                  </div>
                )}
              </button>

              {/* 4. Demo Customer */}
              <button
                type="button"
                onClick={() => handleDemoLogin('customer')}
                disabled={loading}
                className="group relative flex flex-col items-start p-2.5 rounded-xl bg-gradient-to-br from-teal-950/80 to-emerald-950/70 hover:from-teal-900/90 hover:to-emerald-900/80 border border-teal-500/40 text-left transition-all active:scale-95 disabled:opacity-50 shadow-sm"
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <div className="p-1 rounded-md bg-teal-500/20 text-teal-300">
                    <Sun className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-black text-white group-hover:text-teal-200">Customer</span>
                </div>
                <span className="text-[9px] text-slate-300 leading-tight">4 Folders</span>
                {demoLoadingRole === 'customer' && (
                  <div className="absolute inset-0 bg-slate-950/90 rounded-xl flex items-center justify-center text-[10px] text-teal-300 font-bold">
                    ...
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

          {error && (
            <div className="flex items-center space-x-2 bg-red-500/15 border border-red-500/30 text-red-300 p-3 rounded-xl text-xs sm:text-sm mb-6">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* UNIFIED SINGLE SMART LOGIN FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  {isAdminDetected 
                    ? (lang === 'ta' ? 'உரிமையாளர் / நிர்வாகி' : 'Owner / Administrator')
                    : isManagerDetected
                    ? (lang === 'ta' ? 'மேலாளர் எண் / பயனர்பெயர்' : 'Manager ID / Username')
                    : isWorkerDetected
                    ? (lang === 'ta' ? 'பணியாளர் எண் / பயனர்பெயர்' : 'Employee ID / Username')
                    : (lang === 'ta' ? 'பயனர்பெயர் / வாடிக்கையாளர் எண் / பணியாளர் எண்' : 'Customer ID / Employee ID / Mobile / Username')}
                </label>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full transition-all duration-300 ${
                  isAdminDetected
                    ? 'bg-purple-900/60 text-purple-300 border border-purple-500/40 shadow-sm'
                    : isManagerDetected
                    ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-500/40 shadow-sm'
                    : isWorkerDetected
                    ? 'bg-amber-900/60 text-amber-300 border border-amber-500/40 shadow-sm'
                    : trimmedUser.length > 0
                    ? 'bg-teal-900/60 text-teal-300 border border-teal-500/40 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {isAdminDetected 
                    ? (lang === 'ta' ? '🛡️ உரிமையாளர் தளம்' : '🛡️ Owner Portal') 
                    : isManagerDetected
                    ? (lang === 'ta' ? '👔 மேலாளர் தளம்' : '👔 Manager Portal')
                    : isWorkerDetected
                    ? (lang === 'ta' ? '👷 பணியாளர் தளம்' : '👷 Worker Portal')
                    : trimmedUser.length > 0
                    ? (lang === 'ta' ? '☀️ வாடிக்கையாளர் தளம்' : '☀️ Customer Portal')
                    : (lang === 'ta' ? 'ஒற்றை உள்நுழைவு' : 'Unified Login')}
                </span>
              </div>

              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={lang === 'ta' ? 'பணியாளர் எண் (EMP/MGR-...), வாடிக்கையாளர் எண் (SOL-...) அல்லது மொபைல்' : 'Employee ID (EMP/MGR-...), Customer ID (SOL-...), Mobile, or User'}
                  className={`w-full bg-slate-950/70 border rounded-xl py-3 pl-10 pr-4 outline-none transition-all text-white placeholder:text-slate-500 text-xs sm:text-sm ${
                    isAdminDetected
                      ? 'border-purple-500/60 focus:border-purple-400 focus:ring-1 focus:ring-purple-400'
                      : isManagerDetected
                      ? 'border-indigo-500/60 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400'
                      : isWorkerDetected
                      ? 'border-amber-500/60 focus:border-amber-400 focus:ring-1 focus:ring-amber-400'
                      : 'border-slate-700/80 focus:border-teal-400 focus:ring-1 focus:ring-teal-400'
                  }`}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  {t.passwordLabel}
                </label>
                <span className={`text-[11px] font-medium transition-colors ${
                  isAdminDetected ? 'text-purple-300 font-bold' : 'text-teal-400'
                }`}>
                  {isAdminDetected
                    ? (lang === 'ta' ? 'நிர்வாக முதன்மை கடவுச்சொல் / PIN' : 'Master PIN or Admin Password')
                    : (lang === 'ta' ? 'இயல்புநிலை: 10-இலக்க மொபைல் எண்' : 'Default: 10-digit mobile number')}
                </span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isAdminDetected 
                    ? (lang === 'ta' ? 'நிர்வாக கடவுச்சொல் உள்ளிடவும்' : 'Enter Admin Password') 
                    : (lang === 'ta' ? '10-இலக்க மொபைல் எண் உள்ளிடவும்' : 'Enter 10-digit mobile number')}
                  className={`w-full bg-slate-950/70 border rounded-xl py-3 pl-10 pr-11 outline-none transition-all text-white placeholder:text-slate-500 text-xs sm:text-sm ${
                    isAdminDetected
                      ? 'border-purple-500/60 focus:border-purple-400 focus:ring-1 focus:ring-purple-400'
                      : 'border-slate-700/80 focus:border-teal-400 focus:ring-1 focus:ring-teal-400'
                  }`}
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
              className={`w-full py-3.5 text-white font-bold rounded-xl transition-all shadow-lg outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 text-xs sm:text-sm active:scale-[0.99] ${
                isAdminDetected
                  ? 'bg-purple-600 hover:bg-purple-500 focus:ring-purple-400 shadow-purple-500/25 hover:shadow-purple-500/40'
                  : 'bg-teal-600 hover:bg-teal-500 focus:ring-teal-400 shadow-teal-500/25 hover:shadow-teal-500/40'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{t.loggingInBtn}</span>
                </div>
              ) : isAdminDetected ? (
                (lang === 'ta' ? 'நிர்வாகியாக உள்நுழைக' : 'Sign In as Owner / Admin')
              ) : (
                (lang === 'ta' ? 'உள்நுழைக' : 'Sign In to Portal')
              )}
            </button>
          </form>
        </div>



        {/* SOLAR CALCULATOR MODAL */}
        <SolarCalculatorModal 
          isOpen={showCalculator} 
          onClose={() => setShowCalculator(false)} 
        />

        {/* NEW CUSTOMER REFERRAL BENEFITS MODAL */}
        <NewCustomerReferralModal 
          isOpen={showReferralModal} 
          onClose={() => setShowReferralModal(false)} 
          initialCode={referralCode}
          onOpenCalculator={() => setShowCalculator(true)}
        />

        {/* 24/7 BILINGUAL AI SOLAR COPILOT */}
        <AiChatbot />

      </div>
    </div>
  );
}
