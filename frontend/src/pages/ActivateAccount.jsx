import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api.js';
import { translations, getLanguage } from '../utils/translations.js';
import {
  Sun, CheckCircle2, ShieldAlert, Sparkles, KeyRound,
  User, Lock, Eye, EyeOff, ArrowRight, ShieldCheck,
  AlertCircle, Check, Building, RefreshCw
} from 'lucide-react';

export default function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [lang, setLang] = useState(getLanguage);
  useEffect(() => {
    const handleLangChange = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLangChange);
    return () => window.removeEventListener('language-change', handleLangChange);
  }, []);

  const t = translations[lang] || translations.en;
  const isTa = lang === 'ta';

  // Verification state
  const [verifying, setVerifying] = useState(true);
  const [invitationData, setInvitationData] = useState(null);
  const [tokenError, setTokenError] = useState('');
  const [alreadyActivated, setAlreadyActivated] = useState(false);

  // Form state
  const [username, setUsername] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [usernameMessage, setUsernameMessage] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [activatedSuccess, setActivatedSuccess] = useState(false);

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenError(isTa ? 'செல்லுபடியாகும் டோக்கன் இணைப்பு இல்லை.' : 'Missing or invalid account activation link.');
      return;
    }

    const verify = async () => {
      try {
        setVerifying(true);
        setTokenError('');
        const res = await api.get(`/auth/invitation/${encodeURIComponent(token)}`);
        setInvitationData(res.data);
      } catch (err) {
        console.error('Verify invitation error:', err);
        const data = err.response?.data;
        if (data?.alreadyActivated) {
          setAlreadyActivated(true);
        } else {
          setTokenError(data?.message || (isTa ? 'இணைப்பு காலாவதியாகிவிட்டது அல்லது செல்லாது.' : 'This activation link is invalid or has expired.'));
        }
      } finally {
        setVerifying(false);
      }
    };

    verify();
  }, [token]);

  // Live username availability check (debounced)
  useEffect(() => {
    const clean = username.trim();
    if (!clean || clean.length < 3) {
      setUsernameAvailable(null);
      setUsernameMessage('');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCheckingUsername(true);
        const res = await api.get(`/auth/check-username-availability?username=${encodeURIComponent(clean)}`);
        setUsernameAvailable(res.data.available);
        setUsernameMessage(res.data.message);
      } catch (err) {
        setUsernameAvailable(false);
        setUsernameMessage('Error checking availability');
      } finally {
        setCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  // Password Strength
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-700' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^a-zA-Z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 25, label: isTa ? 'பலவீனமானது' : 'Weak', color: 'bg-red-500', text: 'text-red-500' };
    if (score === 2) return { score: 50, label: isTa ? 'மிதமானது' : 'Fair', color: 'bg-amber-500', text: 'text-amber-500' };
    if (score === 3) return { score: 75, label: isTa ? 'நல்லது' : 'Good', color: 'bg-blue-500', text: 'text-blue-500' };
    return { score: 100, label: isTa ? 'மிகவும் பாதுகாப்பானது' : 'Strong & Secure', color: 'bg-emerald-500', text: 'text-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!username.trim() || username.trim().length < 3) {
      setSubmitError(isTa ? 'பயனர் ஐடி குறைந்தது 3 எழுத்துகள் இருக்க வேண்டும்' : 'User ID must be at least 3 characters long.');
      return;
    }

    if (usernameAvailable === false) {
      setSubmitError(isTa ? 'இந்த பயனர் ஐடி ஏற்கனவே பயன்பாட்டில் உள்ளது' : 'This User ID is already taken. Please choose another.');
      return;
    }

    if (!password || password.length < 8) {
      setSubmitError(isTa ? 'கடவுச்சொல் குறைந்தது 8 எழுத்துகள் கொண்டிருக்க வேண்டும்' : 'Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError(isTa ? 'இரு கடவுச்சொற்களும் பொருந்தவில்லை' : 'Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/auth/activate-account', {
        token,
        username: username.trim(),
        password
      });

      setActivatedSuccess(true);

      // Auto sign-in if token returned
      if (res.data?.token && res.data?.user) {
        localStorage.setItem('mrs_solar_token', res.data.token);
        localStorage.setItem('mrs_solar_user', JSON.stringify(res.data.user));

        setTimeout(() => {
          const role = res.data.user.role;
          if (role === 'worker') {
            navigate('/worker');
          } else {
            navigate('/customer');
          }
        }, 2200);
      }
    } catch (err) {
      console.error('Activation submission error:', err);
      setSubmitError(err.response?.data?.message || (isTa ? 'கணக்கு செயல்படுத்துவதில் பிழை ஏற்பட்டது' : 'Failed to activate account.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 flex flex-col justify-center items-center p-4 sm:p-6 text-white relative">
      
      {/* Background Accent Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="relative z-10 flex flex-col items-center mb-6 text-center">
        <div className="w-14 h-14 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-2xl flex items-center justify-center shadow-2xl shadow-teal-500/30 mb-3 border border-teal-300/30">
          <Sun className="w-8 h-8 text-yellow-300 animate-spin-slow" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center space-x-2">
          <span>MRS</span>
          <span className="text-teal-400">SOLAR</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {isTa ? 'பாதுகாப்பான கணக்கு செயல்படுத்தல் தளம்' : 'Official Secure Account Activation Portal'}
        </p>
      </div>

      {/* Main Card Container */}
      <div className="relative z-10 w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">

        {/* LOADING STATE */}
        {verifying && (
          <div className="text-center py-12 space-y-4">
            <RefreshCw className="w-10 h-10 text-teal-400 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-300">
              {isTa ? 'உங்கள் அழைப்பு இணைப்பு சரிபார்க்கப்படுகிறது...' : 'Verifying your activation invitation link...'}
            </p>
          </div>
        )}

        {/* INVALID / EXPIRED LINK */}
        {!verifying && tokenError && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">
              {isTa ? 'செல்லுபடியற்ற இணைப்பு' : 'Invalid or Expired Link'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              {tokenError}
            </p>
            <div className="pt-4">
              <Link
                to="/login"
                className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 transition-all"
              >
                <span>{isTa ? 'உள்நுழைவுப் பக்கத்திற்குச் செல்' : 'Go to Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* ALREADY ACTIVATED */}
        {!verifying && alreadyActivated && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">
              {isTa ? 'கணக்கு ஏற்கனவே செயல்படுத்தப்பட்டுவிட்டது!' : 'Account Already Activated!'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              {isTa ? 'உங்கள் கணக்கு ஏற்கனவே வெற்றிகரமாக செயல்படுத்தப்பட்டுள்ளது. தயவுசெய்து உங்கள் பயனர் ஐடி மற்றும் கடவுச்சொல்லுடன் உள்நுழையவும்.' : 'Your MRS SOLAR account is already active. Please sign in with your User ID and password.'}
            </p>
            <div className="pt-4">
              <Link
                to="/login"
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-black text-white shadow-lg transition-all"
              >
                <span>{isTa ? 'உள்நுழைக' : 'Sign In Now'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* ACTIVATION SUCCESS CELEBRATION */}
        {!verifying && activatedSuccess && (
          <div className="text-center py-8 space-y-4 animate-fade-in">
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40 shadow-xl shadow-emerald-500/20 animate-bounce">
              <Sparkles className="w-10 h-10 text-yellow-400" />
            </div>
            <h2 className="text-2xl font-black text-white">
              {isTa ? 'வாழ்த்துகள்! கணக்கு வெற்றிகரமாக செயல்படுத்தப்பட்டது!' : 'Congratulations! Account Activated!'}
            </h2>
            <p className="text-xs text-teal-300 font-semibold">
              {isTa ? 'உங்கள் பயனர் ஐடி பதிவு செய்யப்பட்டு தளம் திறக்கப்படுகிறது...' : `User ID "${username}" registered. Redirecting to your dashboard...`}
            </p>
            <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mt-4" />
          </div>
        )}

        {/* MAIN ACTIVATION FORM */}
        {!verifying && !tokenError && !alreadyActivated && !activatedSuccess && invitationData && (
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Invitation Details Banner */}
            <div className="p-4 rounded-2xl bg-teal-950/40 border border-teal-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                  {invitationData.invitationType === 'worker' ? (isTa ? 'பணியாளர் பதிவு' : 'Worker Onboarding') : (isTa ? 'வாடிக்கையாளர் பதிவு' : 'Customer Onboarding')}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  ID: {invitationData.targetId}
                </span>
              </div>
              <h3 className="text-base font-bold text-white">
                {invitationData.fullName}
              </h3>
              <p className="text-xs text-slate-400">
                {invitationData.email} • {invitationData.mobileNumber}
              </p>
              {invitationData.invitedByName && (
                <p className="text-[11px] text-teal-300/80 pt-1 border-t border-teal-900/60">
                  {isTa ? `அழைத்தவர்: ${invitationData.invitedByName}` : `Invited by: ${invitationData.invitedByName} (${invitationData.invitedByRole || 'Manager'})`}
                </p>
              )}
            </div>

            {submitError && (
              <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{submitError}</span>
              </div>
            )}

            {/* FIELD 1: CHOOSE USER ID */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>{isTa ? 'உங்கள் புதிய பயனர் ஐடி (User ID)' : 'Choose Your User ID (Login Username)'} *</span>
                {checkingUsername && <span className="text-[10px] text-teal-400 animate-pulse">{isTa ? 'சரிபார்க்கிறது...' : 'Checking...'}</span>}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ''))}
                  placeholder={isTa ? 'எ.கா: karthik_solar அல்லது raj104' : 'e.g. suresh_solar or karthik2026'}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-all font-mono"
                />
                {usernameAvailable === true && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                )}
                {usernameAvailable === false && (
                  <AlertCircle className="w-4 h-4 text-red-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                )}
              </div>
              {usernameMessage && (
                <p className={`text-[10px] mt-1 font-semibold ${usernameAvailable ? 'text-emerald-400' : 'text-red-400'}`}>
                  {usernameMessage}
                </p>
              )}
              <p className="text-[10px] text-slate-400 mt-1">
                {isTa ? 'குறைந்தது 3 எழுத்துகள். உள்நுழைய இந்த ஐடியைப் பயன்படுத்துவீர்கள்.' : 'Min 3 chars. You will use this permanent User ID to sign in to MRS SOLAR.'}
              </p>
            </div>

            {/* FIELD 2: CREATE PASSWORD */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>{isTa ? 'புதிய கடவுச்சொல்லை உருவாக்கவும்' : 'Create Secure Password'} *</span>
                {password && (
                  <span className={`text-[10px] font-bold ${strength.text}`}>
                    {strength.label}
                  </span>
                )}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isTa ? 'குறைந்தது 8 எழுத்துகள்' : 'Minimum 8 characters'}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength bar */}
              {password && (
                <div className="w-full bg-slate-800 rounded-full h-1 mt-1.5 overflow-hidden">
                  <div className={`h-full transition-all duration-300 ${strength.color}`} style={{ width: `${strength.score}%` }} />
                </div>
              )}
            </div>

            {/* FIELD 3: CONFIRM PASSWORD */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isTa ? 'கடவுச்சொல்லை மீண்டும் உறுதிசெய்யவும்' : 'Confirm Password'} *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={isTa ? 'மீண்டும் தட்டச்சு செய்யவும்' : 'Re-enter your password'}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-[10px] text-red-400 mt-1">
                  {isTa ? 'கடவுச்சொற்கள் பொருந்தவில்லை' : 'Passwords do not match'}
                </p>
              )}
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={submitting || (usernameAvailable === false) || !password || password !== confirmPassword}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-sm shadow-lg shadow-teal-500/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isTa ? 'செயல்படுத்துகிறது...' : 'Activating Account...'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-teal-200" />
                  <span>{isTa ? 'கணக்கை செயல்படுத்து & தொடங்கு' : 'Activate Account & Get Started'}</span>
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <Link to="/login" className="text-xs text-slate-400 hover:text-teal-400 transition-colors">
                {isTa ? 'ஏற்கனவே கணக்கு உள்ளதா? உள்நுழையவும்' : 'Already have an active account? Sign In'}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}