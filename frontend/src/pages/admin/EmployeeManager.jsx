import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import { translations, getLanguage } from '../../utils/translations.js';
import {
  Users, UserPlus, Search, Filter, ShieldCheck, ShieldAlert,
  Key, Edit3, Trash2, CheckCircle2, XCircle, RefreshCw, X,
  Building, User, Phone, Mail, Calendar, ChevronRight, Copy, Check
} from 'lucide-react';

export default function EmployeeManager() {
  const [lang, setLang] = useState(getLanguage);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleLangChange = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLangChange);
    return () => window.removeEventListener('language-change', handleLangChange);
  }, []);

  const t = translations[lang] || translations.en;
  const isTa = lang === 'ta';

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [modalError, setModalError] = useState('');
  const [editModalError, setEditModalError] = useState('');

  // Add Employee Form
  const [addForm, setAddForm] = useState({
    fullName: '',
    username: '',
    email: '',
    mobileNumber: '',
    role: 'worker', // 'worker' | 'manager'
    department: 'Sales & Customer Outreach',
    designation: 'Solar Technical Consultant',
    managerId: '',
    joiningDate: new Date().toISOString().split('T')[0],
    password: ''
  });

  // Edit Employee Form
  const [editForm, setEditForm] = useState({
    _id: '',
    employeeId: '',
    fullName: '',
    email: '',
    mobileNumber: '',
    role: 'worker',
    department: 'Sales & Customer Outreach',
    designation: '',
    managerId: '',
    status: 'active'
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, deptRes, teamRes] = await Promise.all([
        api.get('/workforce/employees').catch(() => ({ data: { employees: [] } })),
        api.get('/workforce/departments').catch(() => ({ data: { departments: [] } })),
        api.get('/workforce/teams').catch(() => ({ data: { teams: [] } }))
      ]);

      const empList = Array.isArray(empRes.data)
        ? empRes.data
        : (empRes.data?.employees || []);
      const deptList = Array.isArray(deptRes.data)
        ? deptRes.data
        : (deptRes.data?.departments || []);
      const teamList = Array.isArray(teamRes.data)
        ? teamRes.data
        : (teamRes.data?.teams || []);

      setEmployees(empList);
      setDepartments(deptList);
      setTeams(teamList);
    } catch (err) {
      console.error('Failed to load employee data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setModalError('');
    try {
      setSaving(true);
      const manager = employees.find(e => e.employeeId === addForm.managerId);
      await api.post('/workforce/employees', {
        ...addForm,
        managerName: manager?.fullName || ''
      });
      setShowAddModal(false);
      setModalError('');
      setAddForm({
        fullName: '',
        username: '',
        email: '',
        mobileNumber: '',
        role: 'worker',
        department: 'Sales & Customer Outreach',
        designation: 'Solar Technical Consultant',
        managerId: '',
        joiningDate: new Date().toISOString().split('T')[0],
        password: ''
      });
      setSuccessMsg('Employee account created successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to create employee';
      setModalError(msg);
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (emp) => {
    setEditModalError('');
    setEditForm({
      _id: emp._id || emp.id,
      employeeId: emp.employeeId,
      fullName: emp.fullName || '',
      email: emp.email || '',
      mobileNumber: emp.mobileNumber || '',
      role: emp.role || 'worker',
      department: emp.department || 'Sales & Customer Outreach',
      designation: emp.designation || '',
      managerId: emp.managerId || '',
      status: emp.status || 'active'
    });
    setShowEditModal(true);
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    setEditModalError('');
    try {
      setSaving(true);
      const manager = employees.find(e => e.employeeId === editForm.managerId);
      await api.put(`/workforce/employees/${editForm._id || editForm.employeeId}`, {
        ...editForm,
        managerName: manager?.fullName || (editForm.role === 'manager' ? 'Direct to Owner' : '')
      });
      setShowEditModal(false);
      setEditModalError('');
      setSuccessMsg(`Employee ${editForm.employeeId} updated successfully!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to update employee';
      setEditModalError(msg);
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmployee = async (emp) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete employee ${emp.fullName} (${emp.employeeId})? This action cannot be undone.`);
    if (!confirmDelete) return;

    try {
      await api.delete(`/workforce/employees/${emp._id || emp.employeeId}`);
      setSuccessMsg(`Employee ${emp.fullName} removed successfully.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete employee');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedEmp || !newPassword) return;
    try {
      setSaving(true);
      await api.post(`/workforce/employees/${selectedEmp._id || selectedEmp.id}/reset-password`, {
        newPassword
      });
      setShowPasswordModal(false);
      setSelectedEmp(null);
      setNewPassword('');
      setSuccessMsg(`Password for ${selectedEmp.fullName} reset successfully!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.response?.data?.error || 'Failed to reset password');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (emp) => {
    try {
      const nextStatus = emp.status === 'active' ? 'inactive' : 'active';
      await api.put(`/workforce/employees/${emp._id || emp.id}`, { status: nextStatus });
      setSuccessMsg(`Employee ${emp.employeeId} marked as ${nextStatus}.`);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err) {
      setErrorMsg('Failed to update status');
      setTimeout(() => setErrorMsg(''), 3000);
    }
  };

  // Managers list for dropdown
  const managersList = employees.filter(e => e.role === 'manager');

  // Filtered list
  const filteredEmployees = employees.filter(emp => {
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || 
      emp.fullName?.toLowerCase().includes(q) ||
      emp.employeeId?.toLowerCase().includes(q) ||
      emp.username?.toLowerCase().includes(q) ||
      emp.designation?.toLowerCase().includes(q) ||
      emp.department?.toLowerCase().includes(q) ||
      String(emp.mobileNumber || '').includes(q) ||
      emp.email?.toLowerCase().includes(q);
    
    const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
    const matchesDept = deptFilter === 'all' || emp.department === deptFilter;
    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;

    return matchesSearch && matchesRole && matchesDept && matchesStatus;
  });

  const totalEmployees = employees.length;
  const activeCount = employees.filter(e => e.status === 'active').length;
  const managerCount = employees.filter(e => e.role === 'manager').length;
  const workerCount = employees.filter(e => e.role === 'worker').length;

  return (
    <div className="space-y-6">
      
      {/* Alert Banners */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center space-x-2.5">
            <Users className="w-7 h-7 text-teal-600 dark:text-teal-400" />
            <span>{isTa ? 'பணியாளர்கள் & மனிதவள மேலாண்மை' : 'Workforce & Employee Management'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isTa ? 'நிர்வாகக் கட்டுப்பாடு: புதிய பணியாளர் கணக்குகள், மேலாளர்கள் ஒதுக்கீடு, துறைகள் மற்றும் கடவுச்சொல் மேலாண்மை.' : 'Super Admin Control: Create accounts, assign managers, configure departments and credentials.'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => { setModalError(''); setShowAddModal(true); }}
            className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-500/20 flex items-center space-x-2 transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isTa ? '+ புதிய பணியாளர் சேர்க்கை' : 'Add New Employee'}</span>
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            title={isTa ? 'புதுப்பிக்க' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">{isTa ? 'மொத்த பணியாளர்கள்' : 'Total Workforce'}</span>
          <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{totalEmployees}</p>
          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">{activeCount} {isTa ? 'செயலில்' : 'Active'}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">{isTa ? 'குழு மேலாளர்கள்' : 'Team Managers'}</span>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{managerCount}</p>
          <span className="text-[10px] text-slate-500 font-semibold">{isTa ? 'மேற்பார்வையாளர்கள்' : 'Supervisors'}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">{isTa ? 'களப்பணியாளர்கள்' : 'Field Workers'}</span>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{workerCount}</p>
          <span className="text-[10px] text-slate-500 font-semibold">{isTa ? 'பொறியாளர்கள் & ஆலோசகர்கள்' : 'Consultants & Engineers'}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">{isTa ? 'துறைகள்' : 'Departments'}</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{departments.length || 5}</p>
          <span className="text-[10px] text-slate-500 font-semibold">{teams.length || 1} {isTa ? 'குழுக்கள்' : 'Functional Teams'}</span>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isTa ? 'பெயர், பணியாளர் எண் (EMP-1001), மொபைல் மூலம் தேடுக...' : 'Search by name, Employee ID (EMP-1001), mobile, designation...'}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 transition-colors"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="manager">Managers Only</option>
            <option value="worker">Workers Only</option>
          </select>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.departmentId || d.name} value={d.name}>{d.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {(search || roleFilter !== 'all' || deptFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setRoleFilter('all');
                setDeptFilter('all');
                setStatusFilter('all');
              }}
              className="px-3 py-2 text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 whitespace-nowrap"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* EMPLOYEES TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Employee ID & Name</th>
                <th className="p-3.5">Role & Designation</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Reporting Manager</th>
                <th className="p-3.5">Contact Details</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-10 text-center">
                    <div className="inline-flex items-center space-x-2 text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin text-teal-500" />
                      <span className="text-xs font-semibold">Loading workforce records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
                        <Users className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white">No Employees Found</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {employees.length === 0
                          ? 'No employee profiles have been registered yet. Click below to add your first team member.'
                          : 'No employees matched your current search and filter criteria. Try clearing the filters.'}
                      </p>
                      <div className="pt-2 flex items-center justify-center space-x-2">
                        {employees.length === 0 ? (
                          <button
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all"
                          >
                            Add New Employee
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSearch('');
                              setRoleFilter('all');
                              setDeptFilter('all');
                              setStatusFilter('all');
                            }}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                          >
                            Clear All Filters
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp._id || emp.employeeId} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${
                          emp.role === 'manager'
                            ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                        }`}>
                          {emp.fullName?.charAt(0) || 'E'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-bold text-slate-900 dark:text-white text-xs">{emp.fullName || 'Unnamed Employee'}</p>
                            {emp.username && (
                              <span className="text-[10px] text-slate-400 font-mono">@{emp.username}</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11px] font-black bg-slate-100 dark:bg-slate-800 text-teal-600 dark:text-teal-400 border border-slate-200 dark:border-slate-700">
                              {emp.employeeId || 'NO-ID'}
                            </span>
                            <button
                              onClick={() => handleCopyId(emp.employeeId)}
                              className="text-slate-400 hover:text-teal-500 p-0.5 transition-colors"
                              title="Copy Employee ID"
                            >
                              {copiedId === emp.employeeId ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        emp.role === 'manager'
                          ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                          : 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                      }`}>
                        {emp.role}
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 text-xs font-semibold mt-1">
                        {emp.designation || (emp.role === 'manager' ? 'Team Manager' : 'Solar Technical Consultant')}
                      </p>
                      {emp.joiningDate && (
                        <p className="text-[10px] text-slate-400 mt-0.5">Joined: {emp.joiningDate}</p>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                      <div className="flex items-center space-x-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{emp.department || 'Sales & Customer Outreach'}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                      {emp.managerName || (emp.role === 'manager' ? (
                        <span className="text-purple-600 dark:text-purple-400 font-bold">Direct to Owner</span>
                      ) : (
                        <span className="text-slate-400 italic">Not Assigned</span>
                      ))}
                    </td>
                    <td className="p-3.5 text-slate-500">
                      <div className="flex items-center space-x-1.5 text-slate-800 dark:text-slate-200 font-mono text-xs font-semibold">
                        <Phone className="w-3 h-3 text-teal-500" />
                        <span>{emp.mobileNumber || 'No mobile'}</span>
                      </div>
                      {emp.email && (
                        <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{emp.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <button
                        onClick={() => handleToggleStatus(emp)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                          emp.status === 'active'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                        }`}
                        title="Click to toggle status"
                      >
                        {emp.status === 'active' ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors"
                          title="Edit Employee"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEmp(emp);
                            setShowPasswordModal(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(emp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Delete Employee"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD EMPLOYEE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-teal-600" />
                <span>Create New Employee Account</span>
              </h3>
              <button onClick={() => setShowAddModal(false)}>
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-3.5 text-xs">
              {modalError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={addForm.fullName}
                    onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={addForm.username}
                    onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                    placeholder="e.g. ramesh_solar"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="ramesh@mrssolar.com"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={addForm.mobileNumber}
                    onChange={(e) => setAddForm({ ...addForm, mobileNumber: e.target.value })}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Role *</label>
                  <select
                    value={addForm.role}
                    onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  >
                    <option value="worker">Worker / Technical Consultant</option>
                    <option value="manager">Manager / Team Leader</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Department *</label>
                  <select
                    value={addForm.department}
                    onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  >
                    <option value="Sales & Customer Outreach">Sales & Customer Outreach</option>
                    <option value="Site Survey & Engineering">Site Survey & Engineering</option>
                    <option value="Rooftop Solar Installation">Rooftop Solar Installation</option>
                    <option value="Net-Metering & EB Liaison">Net-Metering & EB Liaison</option>
                    <option value="Customer Support & Service">Customer Support & Service</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Job Designation *</label>
                  <input
                    type="text"
                    required
                    value={addForm.designation}
                    onChange={(e) => setAddForm({ ...addForm, designation: e.target.value })}
                    placeholder="e.g. Senior Solar Engineer"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Assign Reporting Manager {addForm.role === 'worker' ? '*' : '(Optional)'}
                  </label>
                  <select
                    value={addForm.managerId}
                    onChange={(e) => setAddForm({ ...addForm, managerId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  >
                    <option value="">Direct to Owner</option>
                    {managersList.map((m) => (
                      <option key={m.employeeId} value={m.employeeId}>
                        {m.fullName} ({m.employeeId})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Password (Optional — defaults to worker123 / manager123)
                </label>
                <input
                  type="password"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="Leave empty for standard role default"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md transition-all active:scale-95"
                >
                  {saving ? 'Creating...' : 'Create Employee Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-teal-600" />
                <span>Edit Employee: {editForm.fullName} ({editForm.employeeId})</span>
              </h3>
              <button onClick={() => setShowEditModal(false)}>
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} className="space-y-3.5 text-xs">
              {editModalError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{editModalError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Role *</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  >
                    <option value="worker">Worker / Technical Consultant</option>
                    <option value="manager">Manager / Team Leader</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={editForm.mobileNumber}
                    onChange={(e) => setEditForm({ ...editForm, mobileNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Department</label>
                  <select
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  >
                    <option value="Sales & Customer Outreach">Sales & Customer Outreach</option>
                    <option value="Site Survey & Engineering">Site Survey & Engineering</option>
                    <option value="Rooftop Solar Installation">Rooftop Solar Installation</option>
                    <option value="Net-Metering & EB Liaison">Net-Metering & EB Liaison</option>
                    <option value="Customer Support & Service">Customer Support & Service</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Job Designation</label>
                  <input
                    type="text"
                    value={editForm.designation}
                    onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reporting Manager</label>
                  <select
                    value={editForm.managerId}
                    onChange={(e) => setEditForm({ ...editForm, managerId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  >
                    <option value="">Direct to Owner</option>
                    {managersList
                      .filter(m => m.employeeId !== editForm.employeeId)
                      .map((m) => (
                        <option key={m.employeeId} value={m.employeeId}>
                          {m.fullName} ({m.employeeId})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Account Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md transition-all active:scale-95"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showPasswordModal && selectedEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center space-x-2">
                <Key className="w-5 h-5 text-amber-500" />
                <span>Reset Password</span>
              </h3>
              <button onClick={() => setShowPasswordModal(false)}>
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set a new secure password for <strong className="text-slate-800 dark:text-white">{selectedEmp.fullName}</strong> ({selectedEmp.employeeId}).
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 4 characters"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md"
                >
                  {saving ? 'Resetting...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
