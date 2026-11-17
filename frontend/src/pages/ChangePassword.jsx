import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';
import { translations, getLanguage } from '../utils/translations.js';
import { 
  KeyRound, Lock, Eye, EyeOff, ShieldCheck, AlertCircle, 
  CheckCircle2, ArrowRight, ShieldAlert, Sparkles, RefreshCw
} from 'lucide-react';

export default function ChangePassword() {
  const { user } = useAuth();
  const [lang, setLang] = useState(getLanguage);

  useEffect(() => {
    const handleLangChange = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLangChange);
    return () => window.removeEventListener('language-change', handleLangChange);
  }, []);

  const t = translations[lang] || translations.en;
  const isTa = lang === 'ta';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastChangedDate, setLastChangedDate] = useState(null);

  // Evaluate password strength metrics
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumberOrSymbol = /[0-9!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const strengthScore = [hasMinLength, hasUpperCase, hasLowerCase, hasNumberOrSymbol].filter(Boolean).length;

  const getStrengthLabel = () => {
    if (!newPassword) return { label: isTa ? 'வலுவான கடவுச்சொல்லை உள்ளிடவும்' : 'Enter a strong password', color: 'text-slate-400', bar: 'bg-slate-200 dark:bg-slate-800', width: '0%' };
    if (strengthScore <= 1) return { label: isTa ? 'பலவீனமானது (எழுத்துக்கள், குறியீடுகளை சேர்க்கவும்)' : 'Weak (add characters, symbols)', color: 'text-rose-500', bar: 'bg-rose-500', width: '25%' };
    if (strengthScore === 2) return { label: isTa ? 'மிதமானது (பெரிய எழுத்துகள் & எண்களை சேர்க்கவும்)' : 'Fair (add uppercase & numbers)', color: 'text-amber-500', bar: 'bg-amber-500', width: '50%' };
    if (strengthScore === 3) return { label: isTa ? 'நல்லது (கிட்டத்தட்ட பாதுகாப்பானது)' : 'Good (almost secure)', color: 'text-blue-500', bar: 'bg-blue-500', width: '75%' };
    return { label: isTa ? 'வலுவானது & பாதுகாப்பானது' : 'Strong & Secure', color: 'text-emerald-500', bar: 'bg-emerald-500', width: '100%' };
  };

  const strength = getStrengthLabel();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword) {
      setError(isTa ? 'உங்கள் தற்போதைய கடவுச்சொல்லை உள்ளிடவும்.' : 'Please enter your current password.');
      return;
    }

    if (!hasMinLength) {
      setError(isTa ? 'புதிய கடவுச்சொல் குறைந்தது 8 எழுத்துக்கள் நீளமாக இருக்க வேண்டும்.' : 'New password must be at least 8 characters long.');
      return;
    }

    if (!hasUpperCase || !hasLowerCase) {
      setError(isTa ? 'புதிய கடவுச்சொல்லில் பெரிய (A-Z) மற்றும் சிறிய (a-z) எழுத்துகள் இரண்டும் இருக்க வேண்டும்.' : 'New password must contain both uppercase (A-Z) and lowercase (a-z) letters.');
      return;
    }

    if (!hasNumberOrSymbol) {
      setError(isTa ? 'புதிய கடவுச்சொல்லில் குறைந்தது ஒரு எண் (0-9) அல்லது குறியீடு இருக்க வேண்டும்.' : 'New password must contain at least one number (0-9) or special symbol.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(isTa ? 'புதிய கடவுச்சொல்லும் உறுதிப்படுத்தல் கடவுச்சொல்லும் பொருந்தவில்லை.' : 'New password and confirmation do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setError(isTa ? 'புதிய கடவுச்சொல் பழைய கடவுச்சொல்லாக இருக்கக்கூடாது.' : 'New password cannot be the same as your current password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword
      });

      setSuccess(res.data.message || 'Password changed successfully!');
      setLastChangedDate(res.data.passwordLastChanged || new Date().toISOString());
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Password change error:', err);
      setError(err.response?.data?.message || 'Failed to update password. Please verify your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-700 p-6 sm:p-8 text-white shadow-xl shadow-teal-900/10">
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold mb-3">
            <Lock className="w-3.5 h-3.5 text-teal-200" />
            <span>Account Security</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {t.changePasswordTitle || 'Change Account Password'}
          </h1>
          <p className="text-xs sm:text-sm text-teal-100 mt-1 max-w-xl">
            {isTa ? 'உங்கள் கணக்கின் கடவுச்சொல்லை பாதுகாப்பாக மாற்றவும். புதிய கடவுச்சொல் பாதுகாப்பு விதிகளை பூர்த்தி செய்ய வேண்டும்.' : 'Update your login credentials securely. Your new password must meet complexity standards to protect your solar account.'}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-teal-100">
            <span className="px-2.5 py-1 bg-black/20 rounded-lg">
              {isTa ? 'பயனர்:' : 'User:'} <strong className="text-white">{user?.fullName || user?.username}</strong>
            </span>
            <span className="px-2.5 py-1 bg-black/20 rounded-lg uppercase tracking-wider font-bold">
              {isTa ? 'பொறுப்பு:' : 'Role:'} <strong className="text-white">{user?.role}</strong>
            </span>
            {user?.employeeId && (
              <span className="px-2.5 py-1 bg-black/20 rounded-lg font-mono">
                ID: <strong className="text-white">{user.employeeId}</strong>
              </span>
            )}
            {user?.customerId && (
              <span className="px-2.5 py-1 bg-black/20 rounded-lg font-mono">
                {isTa ? 'வாடிக்கையாளர் எண்:' : 'Customer:'} <strong className="text-white">{user.customerId}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none">
          <KeyRound className="w-64 h-64 text-white" />
        </div>
      </div>

      {/* FEEDBACK ALERTS */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start space-x-3 text-rose-700 dark:text-rose-300 animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
          <div className="text-xs sm:text-sm">
            <p className="font-bold">{isTa ? 'கடவுச்சொல் மாற்றம் தோல்வியடைந்தது' : 'Password Change Failed'}</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start space-x-3 text-emerald-700 dark:text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
          <div className="text-xs sm:text-sm">
            <p className="font-bold">{isTa ? 'கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது!' : 'Password Updated Successfully!'}</p>
            <p className="mt-0.5">{success}</p>
            {lastChangedDate && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                {isTa ? 'நேரம்:' : 'Timestamp:'} {new Date(lastChangedDate).toLocaleString('en-IN')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD FORM CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* CURRENT PASSWORD */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              {t.currentPasswordLabel || 'Current Password'} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={isTa ? 'உங்கள் தற்போதைய கடவுச்சொல்லை உள்ளிடவும்' : 'Enter your current password'}
                required
                className="w-full pl-4 pr-11 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                title={showCurrent ? (isTa ? 'மறைக்கவும்' : 'Hide password') : (isTa ? 'காட்டவும்' : 'Show password')}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {user?.role === 'customer' && (
              <p className="text-[11px] text-slate-400 mt-1">
                {isTa ? 'குறிப்பு: உங்கள் ஆரம்ப இயல்புநிலை கடவுச்சொல் உங்கள் 10-இலக்க பதிவு செய்யப்பட்ட மொபைல் எண் ஆகும்.' : 'Tip for customers: Your initial default password was your 10-digit registered mobile number.'}
              </p>
            )}
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* NEW PASSWORD */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              {t.newPasswordLabel || 'New Password'} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={isTa ? 'புதிய பாதுகாப்பான கடவுச்சொல்லை உள்ளிடவும்' : 'Enter secure new password'}
                required
                className="w-full pl-4 pr-11 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                title={showNew ? (isTa ? 'மறைக்கவும்' : 'Hide password') : (isTa ? 'காட்டவும்' : 'Show password')}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* LIVE PASSWORD STRENGTH INDICATOR */}
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">{isTa ? 'கடவுச்சொல் வலிமை:' : 'Password Strength:'}</span>
                <span className={`font-bold ${strength.color}`}>{strength.label}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${strength.bar} transition-all duration-300`} 
                  style={{ width: strength.width }} 
                />
              </div>
            </div>

            {/* REQUIREMENTS CHECKLIST */}
            <div className="grid grid-cols-2 gap-2 mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 text-[11px]">
              <div className={`flex items-center space-x-1.5 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                {hasMinLength ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />}
                <span>{isTa ? 'குறைந்தது 8 எழுத்துக்கள்' : 'At least 8 characters'}</span>
              </div>
              <div className={`flex items-center space-x-1.5 ${hasUpperCase ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                {hasUpperCase ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />}
                <span>{isTa ? 'ஒரு பெரிய எழுத்து (A-Z)' : 'One uppercase letter (A-Z)'}</span>
              </div>
              <div className={`flex items-center space-x-1.5 ${hasLowerCase ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                {hasLowerCase ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />}
                <span>{isTa ? 'ஒரு சிறிய எழுத்து (a-z)' : 'One lowercase letter (a-z)'}</span>
              </div>
              <div className={`flex items-center space-x-1.5 ${hasNumberOrSymbol ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                {hasNumberOrSymbol ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />}
                <span>{isTa ? 'எண் அல்லது குறியீடு (0-9, @#$)' : 'Number or symbol (0-9, @#$)'}</span>
              </div>
            </div>
          </div>

          {/* CONFIRM NEW PASSWORD */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              {t.confirmPasswordLabel || 'Confirm New Password'} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={isTa ? 'உறுதிப்படுத்த மீண்டும் புதிய கடவுச்சொல்லை உள்ளிடவும்' : 'Re-enter new password to confirm'}
                required
                className="w-full pl-4 pr-11 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                title={showConfirm ? (isTa ? 'மறைக்கவும்' : 'Hide password') : (isTa ? 'காட்டவும்' : 'Show password')}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && (
              <p className={`text-[11px] mt-1 flex items-center space-x-1 ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-rose-500 font-medium'}`}>
                {passwordsMatch ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{isTa ? 'கடவுச்சொற்கள் சரியாகப் பொருந்துகின்றன' : 'Passwords match perfectly'}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    <span>{isTa ? 'கடவுச்சொற்கள் பொருந்தவில்லை' : 'Passwords do not match yet'}</span>
                  </>
                )}
              </p>
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !currentPassword || strengthScore < 3 || !passwordsMatch}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm shadow-lg shadow-teal-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isTa ? 'கடவுச்சொல் மாற்றப்படுகிறது...' : 'Updating Password...'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t.updatePasswordBtn || 'Change Password'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* SECURITY NOTICE CARD */}
      <div className="p-5 rounded-3xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
        <div className="flex items-center space-x-2 font-bold text-slate-800 dark:text-slate-200">
          <ShieldAlert className="w-4 h-4 text-teal-600" />
          <span>Security Recommendations</span>
        </div>
        <ul className="list-disc pl-5 space-y-1 text-slate-500 dark:text-slate-400">
          <li>Never share your password with anyone, including MRS SOLAR technicians.</li>
          <li>We hash all passwords with salted cryptographic algorithms. No staff or administrator can view your actual password.</li>
          <li>Whenever your password is changed, an audit notification is logged with a secure timestamp.</li>
        </ul>
      </div>
    </div>
  );
}
