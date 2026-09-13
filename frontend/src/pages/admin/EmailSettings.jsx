import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import { 
  Mail, CheckCircle, AlertTriangle, Send, ShieldCheck, 
  ExternalLink, Copy, Check, RefreshCw, Zap, Server
} from 'lucide-react';

export default function EmailSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  
  const [config, setConfig] = useState({
    activeMethod: 'Direct Gmail SMTP',
    relayUrl: '',
    brevoApiKeyMasked: '',
    resendApiKeyMasked: '',
    senderEmail: 'mrsassociates19@gmail.com',
    isRender: false
  });

  const [formData, setFormData] = useState({
    relayUrl: '',
    brevoApiKey: '',
    senderEmail: 'mrsassociates19@gmail.com'
  });

  const [testEmail, setTestEmail] = useState('rsanthoshkumar376@gmail.com');
  const [testResult, setTestResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/email-settings');
      setConfig(res.data);
      setFormData(prev => ({
        ...prev,
        relayUrl: res.data.relayUrl || '',
        senderEmail: res.data.senderEmail || 'mrsassociates19@gmail.com'
      }));
    } catch (err) {
      console.error('Failed to load email config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess('');
    try {
      const res = await api.post('/admin/email-settings', formData);
      setSaveSuccess(res.data.message || 'Settings successfully saved!');
      fetchConfig();
      setTimeout(() => setSaveSuccess(''), 5000);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to save email settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@') || !testEmail.includes('.')) {
      alert('Please enter a valid email address for testing.');
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/admin/email-settings/test', { targetEmail: testEmail });
      setTestResult({
        success: true,
        message: res.data.message,
        method: res.data.diagnostic?.method,
        duration: res.data.diagnostic?.durationMs
      });
    } catch (err) {
      console.error(err);
      setTestResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Test delivery failed',
        method: err.response?.data?.diagnostic?.method,
        duration: err.response?.data?.diagnostic?.durationMs
      });
    } finally {
      setTesting(false);
    }
  };

  const scriptSnippet = [
    'function doPost(e) {',
    '  try {',
    '    var data = JSON.parse(e.postData.contents);',
    '    GmailApp.sendEmail(data.to, data.subject, "MRS SOLAR Official Receipt", {',
    '      htmlBody: data.html,',
    '      name: "MRS Associates Solar"',
    '    });',
    '    return ContentService.createTextOutput(JSON.stringify({',
    '      success: true,',
    '      message: "Delivered via Gmail Cloud"',
    '    })).setMimeType(ContentService.MimeType.JSON);',
    '  } catch (err) {',
    '    return ContentService.createTextOutput(JSON.stringify({',
    '      success: false,',
    '      error: err.toString()',
    '    })).setMimeType(ContentService.MimeType.JSON);',
    '  }',
    '}'
  ].join('\n');

  const copyScript = () => {
    navigator.clipboard.writeText(scriptSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isCloudSafe = config.activeMethod.includes('HTTPS') || config.activeMethod.includes('Relay') || config.activeMethod.includes('Brevo');

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center space-x-3">
            <Mail className="w-8 h-8 text-teal-600" />
            <span>Email Delivery &amp; Receipt Settings</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Configure automated payment bill receipts, due-date reminder emails, and cloud mail transport.
          </p>
        </div>

        <button
          onClick={fetchConfig}
          className="inline-flex items-center space-x-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 text-xs font-semibold self-start md:self-auto transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* ACTIVE STATUS CARD */}
      <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Active Delivery Channel</span>
            <div className="flex items-center space-x-3 mt-1.5">
              <div className={'p-2 rounded-xl ' + (isCloudSafe ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-600' : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600')}>
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{config.activeMethod}</span>
                  {isCloudSafe ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle className="w-3 h-3 mr-1" /> Cloud Ready (HTTPS Port 443)
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="w-3 h-3 mr-1" /> Direct SMTP (Port 465/587)
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sender Account: <strong className="text-slate-700 dark:text-slate-300">{config.senderEmail}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CLOUD HOST WARNING IF RENDER & NO HTTPS RELAY */}
        {config.isRender && !isCloudSafe && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start space-x-3 text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Render Cloud Free Instances Block Outbound SMTP (Port 465 &amp; 587)</p>
              <p>
                Render's cloud firewall prevents outgoing connections on standard mail ports to eliminate spam abuse. 
                Follow the <strong>2-minute Google Apps Script setup below</strong> to enable instant HTTPS delivery over port 443.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* CONFIGURATION FORM */}
        <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-850 pb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Zap className="w-5 h-5 text-teal-600" />
              <span>Configure Delivery Channels</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Saved directly to the database. Applies instantly to production without restarting Render.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {saveSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-semibold flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{saveSuccess}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Google Apps Script Web App URL <span className="text-teal-600">(Recommended • 100% Free)</span>
              </label>
              <input
                type="url"
                value={formData.relayUrl}
                onChange={(e) => setFormData({ ...formData, relayUrl: e.target.value })}
                placeholder="https://script.google.com/macros/s/AKfy.../exec"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 outline-none focus:border-teal-500 text-xs font-mono text-slate-800 dark:text-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Delivers emails directly from <strong>{formData.senderEmail}</strong> over HTTPS (Port 443).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Brevo (Sendinblue) API Key <span className="text-slate-400 font-normal">(Alternative • Free 300/day)</span>
              </label>
              <input
                type="text"
                value={formData.brevoApiKey}
                onChange={(e) => setFormData({ ...formData, brevoApiKey: e.target.value })}
                placeholder={config.brevoApiKeyMasked || 'xkeysib-...'}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 outline-none focus:border-teal-500 text-xs font-mono text-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Sender Email Address
              </label>
              <input
                type="email"
                value={formData.senderEmail}
                onChange={(e) => setFormData({ ...formData, senderEmail: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 outline-none focus:border-teal-500 text-xs font-medium text-slate-800 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-teal-600/20 transition disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Applying Settings...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Save Email Configuration</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* LIVE TESTER */}
        <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-850 pb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Send className="w-5 h-5 text-teal-600" />
                <span>Live Delivery Test</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Trigger an actual payment receipt email from the current server to verify arrival.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Recipient Email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="customer@gmail.com"
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 outline-none focus:border-teal-500 text-xs font-medium text-slate-800 dark:text-white"
                />
                <button
                  onClick={handleTestEmail}
                  disabled={testing}
                  className="px-4 py-2.5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
                >
                  {testing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{testing ? 'Sending...' : 'Send Test'}</span>
                </button>
              </div>
            </div>

            {/* TEST RESULT BOX */}
            {testResult && (
              <div className={'p-4 rounded-2xl text-xs space-y-2 ' + (
                testResult.success 
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300' 
                  : 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300'
              )}>
                <div className="flex items-center space-x-2 font-bold">
                  {testResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{testResult.success ? 'Delivery Succeeded!' : 'Delivery Attempt Failed'}</span>
                </div>
                <p className="leading-relaxed">{testResult.message}</p>
                {testResult.duration && (
                  <p className="text-[11px] opacity-75 font-mono">
                    Latency: {testResult.duration}ms • Method: {testResult.method || config.activeMethod}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-500 space-y-1.5">
            <p className="font-bold text-slate-700 dark:text-slate-300">What gets sent?</p>
            <p>An official MRS Associates solar payment receipt bill complete with logo, EMI table, and receipt badge.</p>
          </div>
        </div>

      </div>

      {/* 2-MINUTE SETUP GUIDE FOR GOOGLE APPS SCRIPT */}
      <div className="bg-white dark:bg-slate-950 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-850 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>⚡ 2-Minute Google Apps Script HTTPS Relay Setup</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Enables 100% cloud email delivery on Render Free tier natively from mrsassociates19@gmail.com with zero cost.
            </p>
          </div>
          <a
            href="https://script.google.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 text-xs text-teal-600 font-bold hover:underline self-start sm:self-auto"
          >
            <span>Open script.google.com</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-1">
            <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs mb-2">1</span>
            <p className="font-bold text-slate-800 dark:text-white">Open Google Script</p>
            <p className="text-slate-500">Log in to <strong>mrsassociates19@gmail.com</strong> at script.google.com and click <strong>New project</strong>.</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-1">
            <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs mb-2">2</span>
            <p className="font-bold text-slate-800 dark:text-white">Paste Code</p>
            <p className="text-slate-500">Delete existing code in <code>Code.gs</code>, paste the snippet below, and save (Ctrl+S).</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-1">
            <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs mb-2">3</span>
            <p className="font-bold text-slate-800 dark:text-white">Deploy as Web App</p>
            <p className="text-slate-500">Click <strong>Deploy &gt; New deployment &gt; Web app</strong>. Set Access to: <strong>Anyone</strong>.</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-1">
            <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs mb-2">4</span>
            <p className="font-bold text-slate-800 dark:text-white">Paste URL Above</p>
            <p className="text-slate-500">Authorize once, copy the Web App URL (ends in <code>/exec</code>), and save it above!</p>
          </div>
        </div>

        {/* CODE BLOCK */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Code.gs (Apps Script):</span>
            <button
              onClick={copyScript}
              className="inline-flex items-center space-x-1 px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800">
            {scriptSnippet}
          </pre>
        </div>
      </div>

      {/* 1-MINUTE BREVO API SETUP GUIDE (RECOMMENDED ALTERNATIVE) */}
      <div className="bg-white dark:bg-slate-950 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-850 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>🚀 1-Minute Brevo (Sendinblue) API Setup (Recommended • 100% Reliable)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Brevo is 100% free (300 emails/day forever), operates on HTTPS (Port 443), and never gets blocked.
            </p>
          </div>
          <a
            href="https://app.brevo.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 text-xs text-teal-600 font-bold hover:underline self-start sm:self-auto"
          >
            <span>Open app.brevo.com</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-1">
            <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs mb-2">1</span>
            <p className="font-bold text-slate-800 dark:text-white">Create Free Account</p>
            <p className="text-slate-500">Go to <strong>brevo.com</strong> and create a free account (no credit card needed).</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-1">
            <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs mb-2">2</span>
            <p className="font-bold text-slate-800 dark:text-white">Generate API Key</p>
            <p className="text-slate-500">Go to <strong>SMTP &amp; API</strong> ➜ <strong>API Keys</strong> ➜ Click <strong>Generate a new API key</strong> and copy it.</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-1">
            <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs mb-2">3</span>
            <p className="font-bold text-slate-800 dark:text-white">Paste Above &amp; Save</p>
            <p className="text-slate-500">Paste the key (starts with <code>xkeysib-...</code>) into the Brevo field above and click <strong>Save</strong>!</p>
          </div>
        </div>
      </div>

    </div>
  );
}
