import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import { translations, getLanguage } from '../../utils/translations.js';
import {
  Briefcase, UserCheck, Search, Filter, Mail, Phone,
  CheckCircle2, Clock, ShieldAlert, ArrowRight, RefreshCw,
  Send, KeyRound, Wrench, ChevronDown, Check, X, Shield,
  Users, Award, DollarSign, Calendar
} from 'lucide-react';

export default function ManagerWorkerManager() {
  const [lang, setLang] = useState(getLanguage);
  useEffect(() => {
    const handleLang = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLang);
    return () => window.removeEventListener('language-change', handleLang);
  }, []);

  const isTa = lang === 'ta';

  const [viewMode, setViewMode] = useState('list'); // 'list' or 'add'
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Feedback
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // New Worker Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    address: '',
    workerId: '',
    jobRole: 'Solar Installation Technician',
    department: 'Rooftop Solar Installation',
    joiningDate: new Date().toISOString().split('T')[0],
    assignedManagerId: '',
    salary: 28000,
    status: 'pending_activation'
  });

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/manager/workers', {
        params: { search, department: departmentFilter, status: statusFilter }
      });
      setWorkers(res.data);
    } catch (err) {
      console.error('Failed to load manager workers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, [departmentFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchWorkers();
  };

  const handleAddWorkerSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.post('/manager/workers', formData);
      setSuccessMsg(res.data.message || 'Worker registered successfully!');
      
      setFormData({
        fullName: '',
        email: '',
        mobileNumber: '',
        address: '',
        workerId: '',
        jobRole: 'Solar Installation Technician',
        department: 'Rooftop Solar Installation',
        joiningDate: new Date().toISOString().split('T')[0],
        assignedManagerId: '',
        salary: 28000,
        status: 'pending_activation'
      });

      setViewMode('list');
      fetchWorkers();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to register worker');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendInvite = async (worker) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/manager/workers/${worker._id}/resend-invite`);
      setSuccessMsg(res.data.message);
      fetchWorkers();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to resend invitation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (worker) => {
    const nextStatus = worker.status === 'active' ? 'disabled' : 'active';
    const confirm = window.confirm(`Change worker ${worker.employeeId} status to ${nextStatus}?`);
    if (!confirm) return;

    setActionLoading(true);
    try {
      const res = await api.post(`/manager/workers/${worker._id}/toggle-status`, { status: nextStatus });
      setSuccessMsg(res.data.message);
      fetchWorkers();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update status');
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

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center space-x-2">
            <Briefcase className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span>{isTa ? 'களப்பணியாளர் மேலாண்மை மையம்' : 'Field Workforce & Technician Management'}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isTa ? 'தொழில்நுட்ப வல்லுநர்களைச் சேர்க்க, ஜிமெயில் அழைப்பு அனுப்ப, பணிகளை கண்காணிக்கவும்.' : 'Onboard solar technicians, send activation invitations, assign rooftop projects, and monitor performance.'}
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
                <Briefcase className="w-4 h-4" />
                <span>{isTa ? 'பணியாளர் பட்டியல்' : 'View Worker Roster'}</span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                <span>{isTa ? '+ புதிய பணியாளர் சேர்க்க' : '+ Onboard New Worker'}</span>
              </>
            )}
          </button>

          <button
            onClick={fetchWorkers}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* VIEW: ADD WORKER FORM */}
      {/* ===================================================================== */}
      {viewMode === 'add' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
          
          <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 flex items-start space-x-3">
            <Mail className="w-5 h-5 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
            <div className="text-xs text-teal-900 dark:text-teal-200 leading-relaxed">
              <p className="font-bold mb-0.5">
                {isTa ? 'பணியாளர் ஜிமெயில் அழைப்பு & பாதுகாப்பு (Worker Gmail Onboarding):' : 'Technician Gmail Invitation & Security:'}
              </p>
              <p>
                {isTa
                  ? 'பணியாளருக்கு அவரது தனிப்பட்ட ஜிமெயிலுக்கு 7 நாட்கள் செல்லுபடியாகும் இணைப்பு அனுப்பப்படும். பணியாளர் சொந்தமாக தனிப்பயன் பயனர் ஐடி (User ID) மற்றும் கடவுச்சொல்லை அமைத்துக் கொள்வார்.'
                  : 'The technician receives a secure single-use invitation to choose their own login User ID and password. No plain-text passwords are ever handled or sent.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleAddWorkerSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isTa ? 'பணியாளர் முழுப் பெயர்' : 'Worker Full Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Karthik Raja"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 font-semibold"
                />
              </div>

              {/* Gmail Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>{isTa ? 'ஜிமெயில் முகவரி' : 'Worker Gmail Address'} *</span>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">{isTa ? 'அழைப்பு அனுப்பப்படும்' : 'Invited via Gmail'}</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="technician@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 font-semibold"
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isTa ? 'கைபேசி எண்' : 'Mobile Number'} *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.mobileNumber}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  placeholder="9840987654"
                  maxLength={10}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 font-mono font-semibold"
                />
              </div>

              {/* Custom Worker ID */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>{isTa ? 'பணியாளர் எண் (Worker ID)' : 'Worker ID'}</span>
                  <span className="text-[10px] text-slate-400">{isTa ? 'தானாக உருவாக்கலாம்' : 'Leave blank for auto'}</span>
                </label>
                <input
                  type="text"
                  value={formData.workerId}
                  onChange={(e) => setFormData({ ...formData, workerId: e.target.value })}
                  placeholder="e.g. EMP-1005"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 font-mono"
                />
              </div>

              {/* Job Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isTa ? 'பதவி / பொறுப்பு' : 'Job Role / Designation'} *
                </label>
                <select
                  value={formData.jobRole}
                  onChange={(e) => setFormData({ ...formData, jobRole: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 font-semibold"
                >
                  <option value="Solar Installation Technician">Solar Installation Technician</option>
                  <option value="Senior Installation Engineer">Senior Installation Engineer</option>
                  <option value="Solar Technical Consultant">Solar Technical Consultant</option>
                  <option value="CAD & Shadow Survey Engineer">CAD & Shadow Survey Engineer</option>
                  <option value="Net-Metering & EB Liaison">Net-Metering & EB Liaison Specialist</option>
                  <option value="Maintenance & O&M Specialist">Maintenance & O&M Specialist</option>
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isTa ? 'துறை (Department)' : 'Department'} *
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 font-semibold"
                >
                  <option value="Rooftop Solar Installation">Rooftop Solar Installation</option>
                  <option value="Sales & Customer Outreach">Sales & Customer Outreach</option>
                  <option value="Site Survey & Engineering">Site Survey & Engineering</option>
                  <option value="Net-Metering & EB Liaison">Net-Metering & EB Liaison</option>
                  <option value="Customer Support & Service">Customer Support & Service</option>
                </select>
              </div>

              {/* Joining Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isTa ? 'சேர்ந்த தேதி' : 'Joining Date'}
                </label>
                <input
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 font-semibold"
                />
              </div>

              {/* Monthly Salary */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>{isTa ? 'மாதாந்திர ஊதியம் (₹)' : 'Monthly Salary (₹)'}</span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">{isTa ? 'ரகசிய தகவல்' : 'Restricted Access'}</span>
                </label>
                <input
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                  placeholder="28000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 font-mono font-semibold"
                />
              </div>

            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isTa ? 'வசிப்பிட முகவரி' : 'Residential Address'}
              </label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Door No, Street, City, Pincode..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500"
              />
            </div>

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
                <span>{isTa ? 'பணியாளரைச் சேர்த்து அழைப்பை அனுப்புக' : 'Onboard Worker & Dispatch Gmail Invite'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW: WORKER MANAGEMENT LIST */}
      {/* ===================================================================== */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-4">
          
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3 justify-between items-center bg-slate-50/50 dark:bg-slate-950/40">
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isTa ? 'பெயர், பணியாளர் எண், பதவி...' : 'Search name, worker ID, role...'}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500"
              />
            </form>

            <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              {['all', 'active', 'pending_activation', 'disabled'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {st === 'pending_activation' ? 'Pending Activation' : st}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Technician / ID</th>
                  <th className="px-5 py-3.5">Role & Department</th>
                  <th className="px-5 py-3.5">Contact & Gmail</th>
                  <th className="px-5 py-3.5">Assigned Customers</th>
                  <th className="px-5 py-3.5">Tasks Completion</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-500" />
                      Loading worker records...
                    </td>
                  </tr>
                ) : workers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      No workers found.
                    </td>
                  </tr>
                ) : (
                  workers.map((w) => {
                    const isPending = w.status === 'pending_activation' || w.invitationStatus === 'pending';
                    const isDisabled = w.status === 'disabled';

                    return (
                      <tr key={w._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900 dark:text-white text-xs">{w.fullName}</p>
                          <p className="font-mono text-[10px] text-teal-600 dark:text-teal-400">{w.employeeId}</p>
                          {w.username && (
                            <p className="text-[10px] text-slate-400 font-mono">User ID: {w.username}</p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">{w.designation || 'Solar Technician'}</p>
                          <p className="text-[11px] text-slate-500">{w.department || 'Operations'}</p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-mono text-slate-800 dark:text-slate-200 text-xs">{w.mobileNumber}</p>
                          <p className="text-[11px] text-slate-500 truncate max-w-[170px]">{w.email || '—'}</p>
                        </td>

                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                            {w.assignedCustomersCount || 0} Customers
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full"
                                style={{ width: `${w.completionRate || 0}%` }}
                              />
                            </div>
                            <span className="font-bold text-[10px] text-slate-600 dark:text-slate-300">
                              {w.completionRate || 0}%
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {w.completedTasks || 0}/{w.totalTasks || 0} Tasks Done
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          {isDisabled ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/60 dark:text-red-400">
                              Disabled
                            </span>
                          ) : isPending ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 flex items-center space-x-1 w-max">
                              <Clock className="w-3 h-3" />
                              <span>Pending</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center space-x-1 w-max">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Active</span>
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                          {isPending && w.email && (
                            <button
                              onClick={() => handleResendInvite(w)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-bold hover:bg-teal-100 transition-colors"
                              title="Resend Gmail Activation Invite"
                            >
                              Resend Invite
                            </button>
                          )}

                          <button
                            onClick={() => handleToggleStatus(w)}
                            disabled={actionLoading}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isDisabled
                                ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-red-500'
                            }`}
                            title={isDisabled ? 'Reactivate Worker' : 'Disable Worker'}
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

    </div>
  );
}