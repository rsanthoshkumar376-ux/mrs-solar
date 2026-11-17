import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import { translations, getLanguage } from '../../utils/translations.js';
import {
  Users, UserPlus, Search, Filter, Mail, Phone, MapPin,
  CheckCircle2, Clock, ShieldAlert, ArrowRight, RefreshCw,
  Send, KeyRound, Wrench, ChevronDown, Check, X, Shield,
  Sun, Zap, Building, AlertCircle
} from 'lucide-react';

const TN_DISTRICTS = [
  'Thiruvallur', 'Chennai', 'Kanchipuram', 'Chengalpattu', 'Vellore',
  'Ranipet', 'Tirupathur', 'Coimbatore', 'Madurai', 'Tiruchirappalli',
  'Salem', 'Tirunelveli', 'Erode', 'Tiruppur', 'Thanjavur', 'Dindigul'
];

export default function ManagerCustomerManager({ workers = [] }) {
  const [lang, setLang] = useState(getLanguage);
  useEffect(() => {
    const handleLang = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLang);
    return () => window.removeEventListener('language-change', handleLang);
  }, []);

  const isTa = lang === 'ta';

  const [viewMode, setViewMode] = useState('list'); // 'list' or 'add'
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [workerFilter, setWorkerFilter] = useState('all');

  // Modals & Feedback
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Assign Worker Modal
  const [assignModalCustomer, setAssignModalCustomer] = useState(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');

  // Password Reset Modal
  const [resetModalCustomer, setResetModalCustomer] = useState(null);
  const [tempPassword, setTempPassword] = useState('');
  const [resetResult, setResetResult] = useState(null);

  // New Customer Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    alternateNumber: '',
    address: '',
    district: 'Thiruvallur',
    ebConsumerNumber: '',
    systemCapacity: 3,
    installationDate: new Date().toISOString().split('T')[0],
    panelDetails: 'Tier-1 Mono PERC Half-Cut 550W Panels',
    assignedWorkerId: '',
    accountStatus: 'Pending Activation'
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/manager/customers', {
        params: { search, status: statusFilter, workerId: workerFilter }
      });
      setCustomers(res.data);
    } catch (err) {
      console.error('Failed to load manager customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [statusFilter, workerFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers();
  };

  // Add Customer Submit
  const handleAddCustomerSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.post('/manager/customers', formData);
      setSuccessMsg(res.data.message || 'Customer registered successfully!');
      
      // Reset form
      setFormData({
        fullName: '',
        email: '',
        mobileNumber: '',
        alternateNumber: '',
        address: '',
        district: 'Thiruvallur',
        ebConsumerNumber: '',
        systemCapacity: 3,
        installationDate: new Date().toISOString().split('T')[0],
        panelDetails: 'Tier-1 Mono PERC Half-Cut 550W Panels',
        assignedWorkerId: '',
        accountStatus: 'Pending Activation'
      });

      setViewMode('list');
      fetchCustomers();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to register customer');
    } finally {
      setActionLoading(false);
    }
  };

  // Resend Gmail Invitation
  const handleResendInvite = async (customer) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/manager/customers/${customer._id}/resend-invite`);
      setSuccessMsg(res.data.message);
      fetchCustomers();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to resend invitation');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Account Status
  const handleToggleStatus = async (customer) => {
    const nextStatus = customer.accountStatus === 'Active' ? 'Disabled' : 'Active';
    const confirm = window.confirm(`Are you sure you want to set account ${customer.customerId} to ${nextStatus}?`);
    if (!confirm) return;

    setActionLoading(true);
    try {
      const res = await api.post(`/manager/customers/${customer._id}/toggle-status`, { status: nextStatus });
      setSuccessMsg(res.data.message);
      fetchCustomers();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Worker Assignment
  const handleExecuteAssignWorker = async () => {
    if (!assignModalCustomer) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/manager/customers/${assignModalCustomer._id}/assign-worker`, {
        workerId: selectedWorkerId,
        notes: assignmentNotes
      });
      setSuccessMsg(res.data.message);
      setAssignModalCustomer(null);
      fetchCustomers();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to assign worker');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* FEEDBACK BANNERS */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs font-bold flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* HEADER WITH VIEW MODE TOGGLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center space-x-2">
            <Users className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span>{isTa ? 'வாடிக்கையாளர் மேலாண்மை மையம்' : 'Customer Onboarding & Management Hub'}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isTa ? 'புதிய வாடிக்கையாளர்களை பதிவு செய்து, ஜிமெயில் அழைப்பு அனுப்பி, களப்பணியாளர்களை ஒதுக்குங்கள்.' : 'Register new customers, dispatch Gmail activation links, assign field technicians, and track status.'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'add' : 'list')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-md active:scale-95 ${
              viewMode === 'add'
                ? 'bg-slate-800 text-white hover:bg-slate-700'
                : 'bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white'
            }`}
          >
            {viewMode === 'add' ? (
              <>
                <Users className="w-4 h-4" />
                <span>{isTa ? 'வாடிக்கையாளர் பட்டியல்' : 'View Customer List'}</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>{isTa ? '+ புதிய வாடிக்கையாளர் சேர்க்க' : '+ Register New Customer'}</span>
              </>
            )}
          </button>

          <button
            onClick={fetchCustomers}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* VIEW: ADD CUSTOMER FORM */}
      {/* ===================================================================== */}
      {viewMode === 'add' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
          
          {/* Explainer Notice */}
          <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 flex items-start space-x-3">
            <Mail className="w-5 h-5 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
            <div className="text-xs text-teal-900 dark:text-teal-200 leading-relaxed">
              <p className="font-bold mb-0.5">
                {isTa ? 'ஜிமெயில் தானியங்கி அழைப்பு முறைமை (Secure Gmail Invitation):' : 'Automated Gmail Invitation Workflow:'}
              </p>
              <p>
                {isTa 
                  ? 'படிவத்தைச் சமர்ப்பித்தவுடன், வாடிக்கையாளரின் ஜிமெயிலுக்கு தனிப்பயன் பாதுகாப்பு இணைப்பு அனுப்பப்படும். வாடிக்கையாளர் சொந்தமாக பயனர் ஐடி (User ID) மற்றும் கடவுச்சொல்லை அமைத்துக் கொள்வார்.'
                  : 'Upon submission, a branded invitation with a secure, expiring 7-day single-use activation link is dispatched to the customer’s Gmail. The customer chooses their own User ID and password.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleAddCustomerSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isTa ? 'வாடிக்கையாளர் முழுப் பெயர்' : 'Customer Full Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 font-semibold"
                />
              </div>

              {/* Gmail Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>{isTa ? 'ஜிமெயில் முகவரி' : 'Gmail Address'} *</span>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">{isTa ? 'அழைப்பு அனுப்பப்படும்' : 'Invited via Gmail'}</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="customer@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 font-semibold"
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isTa ? 'முதன்மை கைபேசி எண்' : 'Primary Mobile Number'} *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.mobileNumber}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  placeholder="9840123456"
                  maxLength={10}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 font-mono font-semibold"
                />
              </div>

              {/* Alternative Mobile */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isTa ? 'மாற்று கைபேசி எண்' : 'Alternative Mobile Number'}
                </label>
                <input
                  type="tel"
                  value={formData.alternateNumber}
                  onChange={(e) => setFormData({ ...formData, alternateNumber: e.target.value })}
                  placeholder="Optional alternate"
                  maxLength={10}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 font-mono"
                />
              </div>

              {/* District */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isTa ? 'மாவட்டம்' : 'District'} *
                </label>
                <select
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 font-semibold"
                >
                  {TN_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* TNEB Consumer Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isTa ? 'TNEB மின் இணைப்பு எண்' : 'EB Consumer Number'}
                </label>
                <input
                  type="text"
                  value={formData.ebConsumerNumber}
                  onChange={(e) => setFormData({ ...formData, ebConsumerNumber: e.target.value })}
                  placeholder="e.g. 09-234-005-1042"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 font-mono"
                />
              </div>

              {/* System Capacity */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isTa ? 'சோலார் திறன் (kW)' : 'Solar System Capacity (kW)'} *
                </label>
                <select
                  value={formData.systemCapacity}
                  onChange={(e) => setFormData({ ...formData, systemCapacity: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 font-semibold"
                >
                  <option value={1}>1 kWp (Savings ₹1,200/mo • ₹30,000 Subsidy)</option>
                  <option value={2}>2 kWp (Savings ₹2,400/mo • ₹60,000 Subsidy)</option>
                  <option value={3}>3 kWp (Savings ₹3,600/mo • ₹78,000 Subsidy)</option>
                  <option value={5}>5 kWp (Savings ₹6,000/mo • ₹78,000 Subsidy)</option>
                  <option value={10}>10 kWp Commercial</option>
                </select>
              </div>

              {/* Installation Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isTa ? 'நிறுவல் திட்டமிடப்பட்ட தேதி' : 'Scheduled Installation Date'}
                </label>
                <input
                  type="date"
                  value={formData.installationDate}
                  onChange={(e) => setFormData({ ...formData, installationDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 font-semibold"
                />
              </div>

              {/* Assigned Worker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>{isTa ? 'ஒதுக்கப்படும் களப்பணியாளர்' : 'Assign Field Technician'}</span>
                  <span className="text-[10px] text-slate-400">{isTa ? 'விருப்பத்திற்கேற்ப' : 'Optional'}</span>
                </label>
                <select
                  value={formData.assignedWorkerId}
                  onChange={(e) => setFormData({ ...formData, assignedWorkerId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 font-semibold"
                >
                  <option value="">{isTa ? '-- பணியாளர் ஒதுக்கப்படவில்லை --' : '-- No Technician Assigned --'}</option>
                  {workers.map(w => (
                    <option key={w.employeeId} value={w.employeeId}>
                      {w.fullName} ({w.employeeId} • {w.designation || 'Technician'})
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isTa ? 'தள முகவரி (Site Address)' : 'Rooftop Site Address'}
              </label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Door No, Street Name, Landmark..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500"
              />
            </div>

            {/* Panel Details */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isTa ? 'சோலார் பேனல் விவரக்குறிப்பு' : 'Solar Equipment Specification'}
              </label>
              <input
                type="text"
                value={formData.panelDetails}
                onChange={(e) => setFormData({ ...formData, panelDetails: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 font-mono"
              />
            </div>

            {/* SUBMIT BUTTON */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {isTa ? 'ரத்துசெய்' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-black shadow-lg flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{isTa ? 'வாடிக்கையாளரை பதிவு செய்து அழைப்பை அனுப்புக' : 'Register Customer & Send Gmail Invite'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW: CUSTOMER MANAGEMENT LIST */}
      {/* ===================================================================== */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-4">
          
          {/* Filters Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3 justify-between items-center bg-slate-50/50 dark:bg-slate-950/40">
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isTa ? 'பெயர், வாடிக்கையாளர் எண், கைபேசி...' : 'Search name, ID, phone, email...'}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500"
              />
            </form>

            <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              {/* Status Filters */}
              {['all', 'active', 'pending', 'disabled'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {st === 'pending' ? (isTa ? 'செயல்படுத்தப்படாதவை' : 'Pending Activation') : st}
                </button>
              ))}

              {/* Worker Filter */}
              <select
                value={workerFilter}
                onChange={(e) => setWorkerFilter(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="all">{isTa ? 'அனைத்து பணியாளர்களும்' : 'All Technicians'}</option>
                {workers.map(w => (
                  <option key={w.employeeId} value={w.employeeId}>{w.fullName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Customer / ID</th>
                  <th className="px-5 py-3.5">Contact & Gmail</th>
                  <th className="px-5 py-3.5">System & District</th>
                  <th className="px-5 py-3.5">Assigned Worker</th>
                  <th className="px-5 py-3.5">Account Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-500" />
                      Loading customer records...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      No customer records match your filter.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => {
                    const isPending = c.accountStatus === 'Pending Activation' || c.invitationStatus === 'pending';
                    const isDisabled = c.accountStatus === 'Disabled';

                    return (
                      <tr key={c._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900 dark:text-white text-xs">{c.fullName}</p>
                          <p className="font-mono text-[10px] text-teal-600 dark:text-teal-400">{c.customerId}</p>
                          {c.registeredUsername && (
                            <p className="text-[10px] text-slate-400 font-mono">User ID: {c.registeredUsername}</p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-slate-800 dark:text-slate-200 font-mono text-xs">{c.mobileNumber}</p>
                          <p className="text-slate-500 text-[11px] truncate max-w-[180px]">{c.email || '—'}</p>
                        </td>

                        <td className="px-5 py-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            {c.systemCapacity || 3} kWp
                          </span>
                          <p className="text-[11px] text-slate-500 mt-0.5">{c.district}</p>
                        </td>

                        <td className="px-5 py-4">
                          {c.assignedWorkerName ? (
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">{c.assignedWorkerName}</p>
                              <p className="font-mono text-[10px] text-slate-400">{c.assignedWorkerId}</p>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setAssignModalCustomer(c);
                                setSelectedWorkerId('');
                                setAssignmentNotes('');
                              }}
                              className="text-[11px] font-bold text-teal-600 hover:text-teal-500 underline"
                            >
                              + Assign Worker
                            </button>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {isDisabled ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/60 dark:text-red-400">
                              Disabled
                            </span>
                          ) : isPending ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 flex items-center space-x-1 w-max">
                              <Clock className="w-3 h-3" />
                              <span>Pending Activation</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center space-x-1 w-max">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Active</span>
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                          {/* Resend Invite */}
                          {isPending && c.email && (
                            <button
                              onClick={() => handleResendInvite(c)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-bold hover:bg-teal-100 transition-colors"
                              title="Resend Gmail Activation Invite"
                            >
                              Resend Invite
                            </button>
                          )}

                          {/* Reassign Worker */}
                          <button
                            onClick={() => {
                              setAssignModalCustomer(c);
                              setSelectedWorkerId(c.assignedWorkerId || '');
                              setAssignmentNotes('');
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Assign / Reassign Technician"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Status */}
                          <button
                            onClick={() => handleToggleStatus(c)}
                            disabled={actionLoading}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isDisabled
                                ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-red-500'
                            }`}
                            title={isDisabled ? 'Reactivate Account' : 'Disable Account'}
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ASSIGN WORKER MODAL */}
      {assignModalCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center space-x-2">
                <Wrench className="w-4 h-4 text-teal-600" />
                <span>Assign Field Worker to Customer</span>
              </h3>
              <button onClick={() => setAssignModalCustomer(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
              <p className="font-bold text-slate-800 dark:text-white">{assignModalCustomer.fullName}</p>
              <p className="text-slate-500 font-mono text-[10px]">{assignModalCustomer.customerId} • {assignModalCustomer.district}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Technician
              </label>
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none font-semibold"
              >
                <option value="">-- Choose Field Worker --</option>
                {workers.map(w => (
                  <option key={w.employeeId} value={w.employeeId}>
                    {w.fullName} ({w.employeeId} • {w.designation || 'Technician'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Task Instructions / Notes
              </label>
              <textarea
                rows={2}
                value={assignmentNotes}
                onChange={(e) => setAssignmentNotes(e.target.value)}
                placeholder="Rooftop feasibility inspection, wiring, net-meter coordination..."
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setAssignModalCustomer(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAssignWorker}
                disabled={actionLoading || !selectedWorkerId}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md disabled:opacity-50"
              >
                {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}