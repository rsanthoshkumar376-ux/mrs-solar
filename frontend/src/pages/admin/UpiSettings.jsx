import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import { 
  CreditCard, CheckCircle, Plus, Trash2, Edit3, Copy, 
  Check, QrCode, Smartphone, Landmark, AlertCircle, ArrowRight,
  ShieldCheck, RefreshCw, X
} from 'lucide-react';
import { translations, getLanguage } from '../../utils/translations.js';
import { formatCurrency } from '../../utils/format.js';

export default function UpiSettings() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [activeAccount, setActiveAccount] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [switchingUpi, setSwitchingUpi] = useState(false);
  const [copiedId, setCopiedId] = useState('');
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [savingAccount, setSavingAccount] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    upiId: '',
    payeeName: '',
    mobileNumber: '',
    bankName: '',
    label: '',
    setAsActive: false
  });

  const [lang, setLang] = useState(getLanguage);

  useEffect(() => {
    const handleLangChange = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLangChange);
    return () => window.removeEventListener('language-change', handleLangChange);
  }, []);

  const t = translations[lang] || translations.en;

  const fetchUpiSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/upi-settings');
      setConfig(response.data);
      setActiveAccount(response.data.activeAccount);
      setAccounts(response.data.accounts || []);
    } catch (err) {
      console.error('Error fetching UPI settings:', err);
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to load UPI settings'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpiSettings();
  }, []);

  const handleSelectActive = async (account) => {
    setSwitchingUpi(true);
    setStatusMessage(null);
    try {
      const res = await api.post('/admin/upi-settings/select', {
        upiId: account.upiId,
        id: account.id
      });
      setStatusMessage({
        type: 'success',
        text: res.data.message || `Customer payments will now route to ${account.upiId}`
      });
      await fetchUpiSettings();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to switch active UPI ID'
      });
    } finally {
      setSwitchingUpi(false);
    }
  };

  const handleOpenAddModal = () => {
    setFormData({
      id: '',
      upiId: '',
      payeeName: '',
      mobileNumber: '',
      bankName: '',
      label: '',
      setAsActive: accounts.length === 0
    });
    setModalMode('add');
    setModalOpen(true);
  };

  const handleOpenEditModal = (acc) => {
    setFormData({
      id: acc.id,
      upiId: acc.upiId,
      payeeName: acc.payeeName,
      mobileNumber: acc.mobileNumber || '',
      bankName: acc.bankName || '',
      label: acc.label || '',
      setAsActive: acc.upiId === config?.activeUpiId
    });
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!formData.upiId.includes('@')) {
      alert('Please enter a valid UPI ID format (e.g. yourname@oksbi)');
      return;
    }
    if (!formData.payeeName.trim()) {
      alert('Please enter the payee account name');
      return;
    }

    setSavingAccount(true);
    setStatusMessage(null);
    try {
      const res = await api.post('/admin/upi-settings/account', formData);
      setModalOpen(false);
      setStatusMessage({
        type: 'success',
        text: res.data.message || 'UPI account successfully saved!'
      });
      await fetchUpiSettings();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving UPI account');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleDeleteAccount = async (acc) => {
    if (acc.upiId === config?.activeUpiId) {
      alert('Cannot delete the currently active UPI ID. Please switch active status to another account before deleting.');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove UPI account "${acc.upiId}"?`)) {
      return;
    }

    try {
      await api.delete(`/admin/upi-settings/account/${acc.id}`);
      setStatusMessage({
        type: 'success',
        text: `UPI account ${acc.upiId} removed successfully`
      });
      await fetchUpiSettings();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting UPI account');
    }
  };

  const copyToClipboard = (text, id) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const sampleAmount = '2895.00';
  const activeQrUrl = activeAccount 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${activeAccount.upiId}%26pn=${encodeURIComponent(activeAccount.payeeName)}%26am=${sampleAmount}%26cu=INR%26tn=MRS_SOLAR_TEST`
    : '';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fade-in">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
              <CreditCard className="w-6 h-6" />
            </span>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">
              {t.upiSettingsTitle || 'UPI Payment Accounts'}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t.upiSettingsSubtitle || 'Configure and select the active UPI ID where customer EMI repayments will be collected. All customer QR codes and 1-tap links route to the selected account.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold text-xs shadow-lg shadow-teal-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addNewUpiBtn || 'Add New UPI ID'}</span>
        </button>
      </div>

      {/* FEEDBACK BANNER */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm animate-scale-up ${
          statusMessage.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
        }`}>
          <div className="flex items-center space-x-2.5">
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setStatusMessage(null)} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CURRENTLY ACTIVE UPI BANNER */}
      {activeAccount && (
        <div className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-emerald-700 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-teal-900/10">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            
            {/* Left Info Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center space-x-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
                </span>
                <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full text-teal-100">
                  {t.activeUpiBannerTitle || 'Currently Active for Customer Payments'}
                </span>
              </div>

              <div>
                <p className="text-xs text-teal-200 font-semibold">{activeAccount.label || 'Active Account'}</p>
                <div className="flex items-center space-x-3 mt-1">
                  <h3 className="text-2xl sm:text-3xl font-black font-mono tracking-tight select-all">
                    {activeAccount.upiId}
                  </h3>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeAccount.upiId, 'active')}
                    className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
                    title="Copy Active UPI ID"
                  >
                    {copiedId === 'active' ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                  <span className="text-[10px] text-teal-200 uppercase font-bold tracking-wider">{t.payeeNameLabel || 'Payee Name'}</span>
                  <p className="font-bold text-white mt-0.5 truncate">{activeAccount.payeeName}</p>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                  <span className="text-[10px] text-teal-200 uppercase font-bold tracking-wider">{t.mobileLabel || 'Mobile'}</span>
                  <p className="font-bold text-white mt-0.5 font-mono">{activeAccount.mobileNumber || 'N/A'}</p>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                  <span className="text-[10px] text-teal-200 uppercase font-bold tracking-wider">{t.bankLabel || 'Bank'}</span>
                  <p className="font-bold text-white mt-0.5 truncate">{activeAccount.bankName || 'Direct UPI'}</p>
                </div>
              </div>

              <p className="text-[11px] text-teal-100/90 leading-relaxed pt-1">
                ⚡ <strong>Instant Routing:</strong> When customers view their EMI or scan the QR code on their dashboard, payments are immediately routed to this UPI ID with zero delays.
              </p>
            </div>

            {/* Right Live QR Column */}
            <div className="flex flex-col items-center justify-center p-4 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 text-center">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-teal-200 mb-2">Live Customer QR Preview</span>
              <div className="w-36 h-36 bg-white rounded-2xl p-2 shadow-inner flex items-center justify-center">
                <img 
                  src={activeQrUrl} 
                  alt="Live Active QR Preview" 
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-[10px] text-teal-100 font-mono mt-2">Test scan with GPay / PhonePe</span>
            </div>

          </div>
        </div>
      )}

      {/* SAVED UPI ACCOUNTS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">
            {t.savedUpiAccounts || 'Saved UPI Accounts'} ({accounts.length})
          </h3>
          <p className="text-xs text-slate-500">
            Click <strong>Set as Active</strong> to switch payment routing anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((acc) => {
            const isActive = acc.upiId === config?.activeUpiId;
            return (
              <div
                key={acc.id}
                className={`p-5 rounded-3xl border transition-all relative ${
                  isActive
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700 shadow-md shadow-emerald-500/5'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                }`}
              >
                {/* Active Badge */}
                {isActive && (
                  <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider bg-emerald-600 text-white shadow-sm flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>{t.activeBadge || 'ACTIVE'}</span>
                  </span>
                )}

                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {acc.label || 'UPI Account'}
                    </span>
                    <h4 className="text-lg font-black font-mono text-slate-800 dark:text-white mt-0.5 truncate">
                      {acc.upiId}
                    </h4>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Account Name:</span>
                      <span className="font-semibold">{acc.payeeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mobile Phone:</span>
                      <span className="font-mono">{acc.mobileNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Bank / Provider:</span>
                      <span className="font-semibold">{acc.bankName || 'UPI Provider'}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-850 gap-2">
                    {isActive ? (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                        <Check className="w-4 h-4" />
                        <span>Receiving Customer Payments</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectActive(acc)}
                        disabled={switchingUpi}
                        className="py-2 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all flex items-center space-x-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{t.setActiveBtn || 'Set as Active'}</span>
                      </button>
                    )}

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(acc)}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAccount(acc)}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="Delete Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ADD / EDIT UPI MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in no-print">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-5 animate-scale-up my-auto max-h-[92vh] overflow-y-auto">
            
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">
                {modalMode === 'add' ? (t.addNewUpiBtn || 'Add New UPI ID') : 'Edit UPI Account'}
              </h3>
              <p className="text-xs text-slate-500">
                Enter your verified UPI VPA address and registered account name.
              </p>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3.5 text-xs text-left">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.upiIdLabel || 'UPI ID (VPA)'} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.upiId}
                  onChange={(e) => setFormData({ ...formData, upiId: e.target.value.trim().toLowerCase() })}
                  placeholder="e.g. rsanthoshkumar376@oksbi or 8072454996@paytm"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-slate-800 dark:text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.payeeNameLabel || 'Payee Account Holder Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.payeeName}
                  onChange={(e) => setFormData({ ...formData, payeeName: e.target.value })}
                  placeholder="e.g. Mr Santhoshkumar R or MRS SOLAR"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t.mobileLabel || 'Mobile Number'}
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value.replace(/\D/g, '') })}
                    placeholder="e.g. 8072454996"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-slate-800 dark:text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t.bankLabel || 'Bank Name'}
                  </label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="e.g. SBI, HDFC, Canara"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.labelTag || 'Account Label / Nickname'}
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g. Primary Current Account, Staff GPay, PhonePe Merchant"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.setAsActive}
                    onChange={(e) => setFormData({ ...formData, setAsActive: e.target.checked })}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-700"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {t.makeActiveCheckbox || 'Make this account active for payments immediately'}
                  </span>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {t.cancel || 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={savingAccount}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-teal-600/50 text-white font-bold shadow-lg shadow-teal-600/20 transition-all flex items-center space-x-1.5"
                >
                  {savingAccount ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>{t.save || 'Save UPI Account'}</span>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
