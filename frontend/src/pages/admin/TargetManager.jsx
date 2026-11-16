import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import {
  Target, PlusCircle, CheckCircle2, Clock, AlertCircle,
  TrendingUp, Users, Building, ChevronRight, X, RefreshCw,
  Sparkles, Award, ShieldAlert
} from 'lucide-react';

export default function TargetManager() {
  const [targets, setTargets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [periodFilter, setPeriodFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Create Target Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    period: 'Monthly',
    category: 'Site inspections',
    targetValue: 30,
    unit: 'Surveys',
    assignedType: 'Team', // 'Company' | 'Team' | 'Employee'
    assignedTo: '',
    notes: ''
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
      const [tgtRes, empRes, teamRes] = await Promise.all([
        api.get('/workforce/targets').catch(() => ({ data: { targets: [] } })),
        api.get('/workforce/employees').catch(() => ({ data: { employees: [] } })),
        api.get('/workforce/teams').catch(() => ({ data: { teams: [] } }))
      ]);

      setTargets(tgtRes.data.targets || []);
      setEmployees(empRes.data.employees || []);
      setTeams(teamRes.data.teams || []);
      
      if (teamRes.data.teams?.length > 0 && !createForm.assignedTo) {
        setCreateForm(prev => ({ ...prev, assignedTo: teamRes.data.teams[0].teamId }));
      }
    } catch (err) {
      console.error('Failed to load targets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTarget = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      let assignedName = '';
      if (createForm.assignedType === 'Team') {
        const t = teams.find(team => team.teamId === createForm.assignedTo);
        assignedName = t?.teamName || createForm.assignedTo;
      } else if (createForm.assignedType === 'Employee') {
        const emp = employees.find(e => e.employeeId === createForm.assignedTo);
        assignedName = emp?.fullName || createForm.assignedTo;
      } else {
        assignedName = 'Company Wide (All Teams)';
      }

      await api.post('/workforce/targets', {
        ...createForm,
        assignedName,
        month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
      });

      setShowCreateModal(false);
      setSuccessMsg('New business target created successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to create target');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  // Calculations
  const totalTargetVolume = targets.reduce((sum, t) => sum + (Number(t.targetValue) || 0), 0);
  const totalApprovedVolume = targets.reduce((sum, t) => sum + (Number(t.approvedCount) || 0), 0);
  const companyAchievementPct = totalTargetVolume > 0 ? Math.min(100, Math.round((totalApprovedVolume / totalTargetVolume) * 100)) : 0;

  const filteredTargets = targets.filter(t => {
    const matchesPeriod = periodFilter === 'all' || t.period === periodFilter;
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesPeriod && matchesCategory;
  });

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
            <Target className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            <span>Target & Quota Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Define daily, weekly and monthly business targets for teams and employees. All calculations update automatically upon manager approval.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg flex items-center space-x-2 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Define New Target</span>
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

      {/* OVERVIEW STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Active Targets</span>
          <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{targets.length}</p>
          <span className="text-[10px] text-purple-600 font-semibold">Across all teams</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Target Volume</span>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{totalTargetVolume}</p>
          <span className="text-[10px] text-slate-500 font-semibold">Total expected units</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Approved Completed</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{totalApprovedVolume}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">Verified work</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Company Achievement</span>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{companyAchievementPct}%</p>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-purple-600 h-full rounded-full" style={{ width: `${companyAchievementPct}%` }} />
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="flex items-center space-x-3 overflow-x-auto pb-1">
        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
        >
          <option value="all">All Periods</option>
          <option value="Daily">Daily</option>
          <option value="Weekly">Weekly</option>
          <option value="Monthly">Monthly</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
        >
          <option value="all">All Categories</option>
          <option value="Customer visits">Customer visits</option>
          <option value="Site inspections">Site inspections</option>
          <option value="Solar quotations">Solar quotations</option>
          <option value="Solar installations">Solar installations</option>
        </select>
      </div>

      {/* TARGETS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTargets.map((tgt) => {
          const ach = tgt.targetValue > 0 ? Math.min(100, Math.round(((tgt.approvedCount || 0) / tgt.targetValue) * 100)) : 0;
          const remaining = Math.max(0, tgt.targetValue - (tgt.approvedCount || 0));
          return (
            <div
              key={tgt._id || tgt.targetId}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200">
                    {tgt.period} • {tgt.category}
                  </span>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm mt-1">{tgt.title}</h3>
                  <p className="text-xs text-slate-500">
                    Assigned: <strong className="text-slate-700 dark:text-slate-300">{tgt.assignedName || tgt.assignedTo}</strong>
                  </p>
                </div>
                <span className="text-xl font-black text-purple-600 dark:text-purple-400">
                  {ach}%
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Target: <strong>{tgt.targetValue} {tgt.unit}</strong></span>
                  <span>Approved: <strong className="text-emerald-600 dark:text-emerald-400">{tgt.approvedCount || 0}</strong></span>
                  <span>Remaining: <strong className="text-amber-600">{remaining}</strong></span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${ach}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
                <span>Month: {tgt.month || 'Current'}</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">{tgt.assignedType} Target</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE TARGET MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center space-x-2">
                <Target className="w-5 h-5 text-purple-600" />
                <span>Define New Business Target</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleCreateTarget} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Title *</label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Monthly Customer Rooftop Feasibility Surveys"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Period *</label>
                  <select
                    value={createForm.period}
                    onChange={(e) => setCreateForm({ ...createForm, period: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category *</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  >
                    <option value="Customer visits">Customer visits</option>
                    <option value="Customer follow-ups">Customer follow-ups</option>
                    <option value="Site inspections">Site inspections</option>
                    <option value="Solar quotations">Solar quotations</option>
                    <option value="Customer conversions">Customer conversions</option>
                    <option value="Solar installations">Solar installations</option>
                    <option value="Documentation completion">EB / TNEB Net-Meter Docs</option>
                    <option value="Service visits">Service visits</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Value *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={createForm.targetValue}
                    onChange={(e) => setCreateForm({ ...createForm, targetValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Unit of Measurement *</label>
                  <input
                    type="text"
                    required
                    value={createForm.unit}
                    onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
                    placeholder="Visits, Surveys, kWp, Proposals..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assign Target To *</label>
                  <select
                    value={createForm.assignedType}
                    onChange={(e) => setCreateForm({ ...createForm, assignedType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  >
                    <option value="Team">Specific Team</option>
                    <option value="Employee">Individual Employee</option>
                    <option value="Company">Company Wide</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select Assignee</label>
                  {createForm.assignedType === 'Team' ? (
                    <select
                      value={createForm.assignedTo}
                      onChange={(e) => setCreateForm({ ...createForm, assignedTo: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                    >
                      {teams.map((t) => (
                        <option key={t.teamId} value={t.teamId}>{t.teamName}</option>
                      ))}
                    </select>
                  ) : createForm.assignedType === 'Employee' ? (
                    <select
                      value={createForm.assignedTo}
                      onChange={(e) => setCreateForm({ ...createForm, assignedTo: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                    >
                      {employees.map((e) => (
                        <option key={e.employeeId} value={e.employeeId}>{e.fullName} ({e.employeeId})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value="All Workforce Teams"
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500"
                    />
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md"
                >
                  {saving ? 'Creating...' : 'Establish Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
