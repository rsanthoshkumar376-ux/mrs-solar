import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import { 
  Sparkles, Bot, Key, CheckCircle, AlertCircle, RefreshCw, 
  ExternalLink, Eye, EyeOff, ShieldCheck, Zap, Sliders
} from 'lucide-react';
import { translations, getLanguage } from '../../utils/translations.js';

export default function AiSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const [config, setConfig] = useState({
    hasKey: false,
    maskedKey: '',
    defaultModel: 'gemini-1.5-flash',
    enabledFeatures: {
      kycScanner: true,
      chatCopilot: true,
      solarDiagnostics: true
    }
  });

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [lang, setLang] = useState(getLanguage);

  useEffect(() => {
    const handleLangChange = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLangChange);
    return () => window.removeEventListener('language-change', handleLangChange);
  }, []);

  const t = translations[lang] || translations.en;

  const fetchAiSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ai/settings');
      setConfig(res.data);
    } catch (err) {
      console.error('Failed to fetch AI settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAiSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess('');
    try {
      const res = await api.post('/ai/settings', {
        geminiApiKey: apiKeyInput || undefined,
        defaultModel: config.defaultModel,
        enabledFeatures: config.enabledFeatures
      });
      setSaveSuccess(lang === 'ta' ? 'AI அமைப்புகள் வெற்றிகரமாக சேமிக்கப்பட்டன!' : 'AI settings saved successfully!');
      setApiKeyInput('');
      await fetchAiSettings();
    } catch (err) {
      console.error('Save AI error:', err);
      alert(err.response?.data?.message || 'Failed to save AI configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestKey = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/ai/test-key', {
        apiKey: apiKeyInput || undefined,
        model: config.defaultModel
      });
      setTestResult({
        success: true,
        message: res.data.message || 'Connection to Gemini API verified successfully!'
      });
    } catch (err) {
      console.error('Test key error:', err);
      setTestResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Failed to connect to Google Gemini API'
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      
      {/* HEADER BANNER */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-indigo-500/10 border border-teal-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20 shrink-0">
            <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center space-x-2">
              <span>{lang === 'ta' ? 'கூகிள் ஜெமினி AI எஞ்சின்' : 'Google Gemini AI Engine'}</span>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                config.hasKey
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30'
              }`}>
                {config.hasKey ? 'Gemini 1.5 Cloud Active' : 'Intelligent Offline Engine Active'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {lang === 'ta'
                ? 'ஆதார் / பான் KYC ஸ்கேனர், தமிழ் & ஆங்கில AI உதவியாளர் மற்றும் சோலார் பில் கணக்கீடுகளை இயக்குகிறது.'
                : 'Powers Aadhaar/PAN vision auto-fill, 24/7 bilingual customer voice copilot, and smart solar diagnostics.'}
            </p>
          </div>
        </div>

        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-teal-700 dark:text-teal-300 bg-white dark:bg-slate-900 border border-teal-500/30 hover:bg-teal-50 dark:hover:bg-slate-800 transition-colors shadow-sm self-start sm:self-auto"
        >
          <span>{lang === 'ta' ? 'இலவச API கீ பெறுக' : 'Get Free API Key'}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* SUCCESS / ERROR ALERTS */}
      {saveSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-2 animate-scale-up">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {testResult && (
        <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center space-x-2 animate-scale-up ${
          testResult.success
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
        }`}>
          {testResult.success ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* SETTINGS FORM */}
      <form onSubmit={handleSave} className="glass-premium rounded-3xl p-6 shadow-sm border border-slate-200/60 dark:border-slate-800 space-y-6">
        
        {/* API KEY FIELD */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
              <Key className="w-4 h-4 text-teal-600" />
              <span>{lang === 'ta' ? 'கூகிள் ஜெமினி API கீ' : 'Google Gemini API Key'}</span>
            </label>
            {config.hasKey && (
              <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                Current: {config.maskedKey}
              </span>
            )}
          </div>

          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={config.hasKey ? 'Leave blank to keep existing key, or enter new key...' : 'Enter your Google Gemini API key (AIzaSy...)'}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-4 pr-24 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500 font-mono transition-all"
            />
            <div className="absolute inset-y-0 right-2 flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            {lang === 'ta'
              ? 'கூகிள் AI ஸ்டுடியோவில் இருந்து இலவசமாக பெறலாம் (AI Studio Free Tier வினாடிக்கு 15 கோரிக்கைகள் இலவசம்).'
              : 'Free Google Gemini API keys can be generated in 30 seconds at Google AI Studio.'}
          </p>
        </div>

        {/* MODEL SELECTION */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
            <Sliders className="w-4 h-4 text-teal-600" />
            <span>{lang === 'ta' ? 'AI மாதிரி மாதிரி (Model)' : 'Default AI Model'}</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', badge: 'Recommended', desc: 'Fast, lightweight & free-tier friendly' },
              { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', badge: 'Ultra Fast', desc: 'Latest real-time generation' },
              { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', badge: 'Deep Reasoning', desc: 'Maximum precision for complex documents' }
            ].map((m) => (
              <div
                key={m.id}
                onClick={() => setConfig(prev => ({ ...prev, defaultModel: m.id }))}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  config.defaultModel === m.id
                    ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-white">{m.name}</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300">
                    {m.badge}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI FEATURES TOGGLES */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
            {lang === 'ta' ? 'செயல்படுத்தப்படும் AI வசதிகள்' : 'Active AI Features'}
          </label>
          <div className="space-y-2.5">
            {[
              {
                id: 'kycScanner',
                title: lang === 'ta' ? '⚡ AI ஸ்மார்ட் ஆவண KYC ஸ்கேனர்' : '⚡ AI Smart Document & KYC Auto-Fill',
                desc: lang === 'ta' ? 'ஆதார் / பான் / TNEB பில் மூலம் படிவங்களை தானாக நிரப்புதல்' : 'Auto-extracts customer details from uploaded Aadhaar, PAN, and EB bills'
              },
              {
                id: 'chatCopilot',
                title: lang === 'ta' ? '🤖 24/7 இருமொழி AI சோலார் உதவியாளர்' : '🤖 Bilingual 24/7 AI Solar Copilot',
                desc: lang === 'ta' ? 'வாடிக்கையாளர்களுக்கு தமிழ் & ஆங்கிலத்தில் தவணை, உற்பத்தி மற்றும் மானிய வழிகாட்டல்' : 'Customer & Admin live chat/voice support for EMIs, solar units, and subsidies'
              },
              {
                id: 'solarDiagnostics',
                title: lang === 'ta' ? '🔍 AI சோலார் இன்வெர்ட்டர் & செயல்திறன் பரிசோதனை' : '🔍 AI Solar Inverter & Health Diagnostics',
                desc: lang === 'ta' ? 'தூசி பாதிப்பு, மின் அழுத்த மாறுபாடுகள் மற்றும் செயல்திறன் எச்சரிக்கைகள்' : 'Analyzes live IoT telemetry to detect dust accumulation or voltage clipping'
              }
            ].map((feat) => (
              <label
                key={feat.id}
                className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={config.enabledFeatures[feat.id] ?? true}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    enabledFeatures: { ...prev.enabledFeatures, [feat.id]: e.target.checked }
                  }))}
                  className="mt-1 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-700"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">{feat.title}</span>
                  <span className="text-[11px] text-slate-400 block">{feat.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleTestKey}
            disabled={testing}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center space-x-2 transition-colors border border-slate-200 dark:border-slate-700"
          >
            {testing ? (
              <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
            ) : (
              <Zap className="w-4 h-4 text-teal-600" />
            )}
            <span>{testing ? 'Testing Connection...' : (lang === 'ta' ? 'இணைப்பை சரிபார்' : 'Test AI Connection')}</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-lg shadow-teal-500/20 flex items-center justify-center space-x-2 transition-all active:scale-95"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            <span>{saving ? 'Saving...' : (lang === 'ta' ? 'அமைப்புகளை சேமி' : 'Save AI Settings')}</span>
          </button>
        </div>

      </form>

    </div>
  );
}
