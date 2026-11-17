import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api.js';
import { translations, getLanguage } from '../utils/translations.js';
import {
  Sun, KeyRound, Mail, ArrowRight, CheckCircle2,
  AlertCircle, Lock, Eye, EyeOff, RefreshCw, ShieldCheck
} from 'lucide-react';

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [lang, setLang] = useState(getLanguage);
  useEffect(() => {
    const handleLangChange = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLangChange);
    return () => window.removeEventListener('language-change', handleLangChange);
  }, []);

  const isTa = lang === 'ta';

  // Request Mode state (no token)
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState('');

  // Reset Mode state (has token)
  const [verifyingToken, setVerifyingToken] = useState(Boolean(token));
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [tokenData, setTokenData] = useState(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  // Verify token if present
  useEffect(() => {
    if (!token) return;

    const verify = async () => {
      try {
        setVerifyingToken(true);
        setTokenError('');
        const res = await api.get(`/auth/reset-token/${encodeURIComponent(token)}`);
        setTokenData(res.data);
        setTokenValid(true);
      } catch (err) {
        setTokenValid(false);
        setTokenError(err.response?.data?.message || (isTa ? 'கடவுச்சொல் மீட்டமைப்பு இணைப்பு செல்லுபடியாகவில்லை அல்லது காலாவதியாகிவிட்டது.' : 'This password reset link is invalid or has expired.'));
      } finally {
        setVerifyingToken(false);
      }
    };

    verify();
  }, [token]);

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!emailOrUsername.trim()) return;

    setRequestLoading(true);
    setRequestError('');
    try {
      await api.post('/auth/forgot-password', {
        emailOrUsername: emailOrUsername.trim()
      });
      setRequestSent(true);
    } catch (err) {
      setRequestError(err.response?.data?.message || 'Failed to process request');
    } finally {
      setRequestLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setResetError('');

    if (newPassword.length < 8) {
      setResetError(isTa ? 'கடவுச்சொல் குறைந்தது 8 எழுத்துகள் இருக்க வேண்டும்' : 'Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError(isTa ? 'இரு கடவுச்சொற்களும் பொருந்தவில்லை' : 'Passwords do not match');
      return;
    }

    setResetting(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword
      });
      setResetSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 flex flex-col justify-center items-center p-4 text-white relative">
      <div className="relative z-10 flex flex-col items-center mb-6 text-center">
        <div className="w-12 h-12 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-2xl flex items-center justify-center shadow-xl mb-2.5">
          <Sun className="w-7 h-7 text-yellow-300" />
        </div>
        <h1 className="text-2xl font-black text-white">
          MRS <span className="text-teal-400">SOLAR</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {token ? (isTa ? 'புதிய கடவுச்சொல்லை அமைத்தல்' : 'Set New Secure Password') : (isTa ? 'கடவுச்சொல் மீட்பு மையம்' : 'Account Recovery & Password Reset')}
        </p>
      </div>

      <div className="relative z-10 w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">

        {/* ─── SCENARIO 1: TOKEN VERIFICATION IN PROGRESS ─── */}
        {token && verifyingToken && (
          <div className="text-center py-8 space-y-3">
            <RefreshCw className="w-8 h-8 text-teal-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">{isTa ? 'மீட்டமைப்பு இணைப்பு சரிபார்க்கப்படுகிறது...' : 'Verifying reset link...'}</p>
          </div>
        )}

        {/* ─── SCENARIO 2: INVALID RESET TOKEN ─── */}
        {token && !verifyingToken && !tokenValid && (
          <div className="text-center py-4 space-y-3">
            <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">{isTa ? 'இணைப்பு செல்லாது' : 'Invalid Reset Link'}</h3>
            <p className="text-xs text-slate-400">{tokenError}</p>
            <div className="pt-2">
              <Link to="/forgot-password" className="text-xs text-teal-400 hover:underline">
                {isTa ? 'புதிய மீட்டமைப்பு இணைப்பைக் கோரவும்' : 'Request a new reset link'}
              </Link>
            </div>
          </div>
        )}

        {/* ─── SCENARIO 3: RESET SUCCESS ─── */}
        {resetSuccess && (
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">{isTa ? 'கடவுச்சொல் மாற்றப்பட்டது!' : 'Password Reset Successful!'}</h3>
            <p className="text-xs text-teal-300 font-semibold">{isTa ? 'உள்நுழைவுப் பக்கத்திற்குத் திரும்புகிறது...' : 'Redirecting to login portal...'}</p>
          </div>
        )}

        {/* ─── SCENARIO 4: RESET PASSWORD FORM (TOKEN VALID) ─── */}
        {token && !verifyingToken && tokenValid && !resetSuccess && (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-teal-950/40 border border-teal-800/40 text-xs space-y-1">
              <p className="font-bold text-white">User ID: <span className="font-mono text-teal-300">{tokenData?.identifier}</span></p>
              <p className="text-slate-400">{tokenData?.email}</p>
            </div>

            {resetError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs">
                {resetError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                {isTa ? 'புதிய கடவுச்சொல்' : 'New Password'} *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full pl-9 pr-9 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-teal-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                {isTa ? 'கடவுச்சொல்லை மீண்டும் உறுதிசெய்யவும்' : 'Confirm Password'} *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-teal-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={resetting || newPassword.length < 8 || newPassword !== confirmPassword}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-xs shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {resetting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{isTa ? 'கடவுச்சொல்லை மாற்று' : 'Save New Password'}</span>
            </button>
          </form>
        )}

        {/* ─── SCENARIO 5: REQUEST RESET LINK FORM (NO TOKEN) ─── */}
        {!token && (
          <div>
            {requestSent ? (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 bg-teal-500/20 text-teal-400 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">{isTa ? 'கோரிக்கை அனுப்பப்பட்டது' : 'Reset Link Dispatched'}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isTa ? 'உங்கள் கணக்கு விவரங்கள் பொருந்தினால், மீட்டமைப்பு இணைப்பு உங்கள் பதிவுசெய்யப்பட்ட ஜிமெயிலுக்கு அனுப்பப்பட்டுள்ளது.' : 'If an account matches that User ID or Gmail, a secure password reset link has been dispatched to your email.'}
                </p>
                <div className="pt-2">
                  <Link to="/login" className="inline-flex items-center space-x-1.5 text-xs font-bold text-teal-400 hover:underline">
                    <span>{isTa ? 'உள்நுழைவுப் பக்கத்திற்குச் செல்' : 'Back to Sign In'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isTa ? 'உங்கள் பதிவுசெய்யப்பட்ட ஜிமெயில் முகவரி அல்லது பயனர் ஐடியை உள்ளிடவும். உங்கள் கடவுச்சொல்லை மீட்டமைப்பதற்கான இணைப்பு அனுப்பப்படும்.' : 'Enter your registered Gmail address or User ID. We will send a secure single-use link to reset your password.'}
                </p>

                {requestError && (
                  <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs">
                    {requestError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {isTa ? 'ஜிமெயில் முகவரி அல்லது பயனர் ஐடி' : 'Gmail Address or User ID'} *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={emailOrUsername}
                      onChange={(e) => setEmailOrUsername(e.target.value)}
                      placeholder="e.g. yourname@gmail.com or User ID"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={requestLoading || !emailOrUsername.trim()}
                  className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                >
                  {requestLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  <span>{isTa ? 'மீட்டமைப்பு இணைப்பை அனுப்பவும்' : 'Send Reset Link'}</span>
                </button>

                <div className="text-center pt-2">
                  <Link to="/login" className="text-xs text-slate-400 hover:text-teal-400">
                    {isTa ? 'நினைவிருக்கிறதா? உள்நுழையவும்' : 'Remember your password? Sign In'}
                  </Link>
                </div>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
}