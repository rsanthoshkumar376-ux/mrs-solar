import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import {
  Users, UserPlus, Search, Filter, ShieldCheck, ShieldAlert,
  Key, Edit3, Trash2, CheckCircle2, XCircle, RefreshCw, X,
  Building, User, Phone, Mail, Calendar, ChevronRight
} from 'lucide-react';

export default function EmployeeManager() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [newPassword, setNewPassword] = useState('');

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

      setEmployees(empRes.data.employees || []);
      setDepartments(deptRes.data.departments || []);
      setTeams(teamRes.data.teams || []);
    } catch (err) {
      console.error('Failed to load employee data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const manager = employees.find(e => e.employeeId === addForm.managerId);
      await api.post('/workforce/employees', {
        ...addForm,
        managerName: manager?.fullName || ''
      });
      setShowAddModal(false);
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
      setErrorMsg(err.response?.data?.error || 'Failed to create employee');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setSaving(false);
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
      setErrorMsg(err.response?.data?.error || 'Failed to reset password');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (emp) => {
    try {
      const nextStatus = emp.status === 'active' ? 'inactive' : 'active';
      await api.put(`/workforce/employees/${emp._id || emp.id}`, { status: nextStatus });
      setSuccessMsg(`Employee account marked as ${nextStatus}.`);
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
    const matchesSearch = !search || 
      emp.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeId?.toLowerCase().includes(search.toLowerCase()) ||
      emp.designation?.toLowerCase().includes(search.toLowerCase()) ||
      emp.mobileNumber?.includes(search);
    
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
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm font-semibold flex items-center justify-between">
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
            <span>Workforce & Employee Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Super Admin Control: Create accounts, assign managers, configure departments and credentials.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg flex items-center space-x-2 transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Employee</span>
          </button>
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Total Workforce</span>
          <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{totalEmployees}</p>
          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">{activeCount} Active</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Team Managers</span>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{managerCount}</p>
          <span className="text-[10px] text-slate-500 font-semibold">Supervisors</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Field Workers</span>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{workerCount}</p>
          <span className="text-[10px] text-slate-500 font-semibold">Consultants & Engineers</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Departments</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{departments.length || 5}</p>
          <span className="text-[10px] text-slate-500 font-semibold">{teams.length || 1} Functional Teams</span>
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
            placeholder="Search by name, Employee ID, mobile, designation..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
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
              {filteredEmployees.map((emp) => (
                <tr key={emp._id || emp.employeeId} className="hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                        emp.role === 'manager'
                          ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200'
                          : 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200'
                      }`}>
                        {emp.fullName?.charAt(0) || 'E'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white text-xs">{emp.fullName}</p>
                        <p className="font-mono text-[10px] text-slate-400">{emp.employeeId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                      emp.role === 'manager'
                        ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200'
                        : 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200'
                    }`}>
                      {emp.role}
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1">{emp.designation}</p>
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-300 font-medium">
                    {emp.department}
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-300 font-medium">
                    {emp.managerName || (emp.role === 'manager' ? 'Direct to Owner' : '-')}
                  </td>
                  <td className="p-3.5 text-slate-500">
                    <p className="text-slate-800 dark:text-slate-200 font-mono">{emp.mobileNumber}</p>
                    <p className="text-[10px]">{emp.email}</p>
                  </td>
                  <td className="p-3.5">
                    <button
                      onClick={() => handleToggleStatus(emp)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                        emp.status === 'active'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300'
                      }`}
                      title="Click to toggle status"
                    >
                      {emp.status === 'active' ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
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
                    </div>
                  </td>
                </tr>
              ))}
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
                    placeholder="9840123456"
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
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md"
                >
                  {saving ? 'Creating...' : 'Create Employee Account'}
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
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Reset Password: {selectedEmp.fullName}
              </h3>
              <button onClick={() => setShowPasswordModal(false)}>
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Secure Password *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
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
                  className="px-4 py-2 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md"
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
