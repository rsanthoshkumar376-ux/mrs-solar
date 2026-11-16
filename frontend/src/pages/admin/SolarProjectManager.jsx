import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import {
  Sun, Zap, PlusCircle, CheckCircle2, Clock, AlertCircle,
  Building, MapPin, User, ChevronRight, X, RefreshCw,
  ShieldCheck, FileText, Check, ShieldAlert
} from 'lucide-react';

const MILESTONES = [
  'Site Feasibility & Roof Structural Audit',
  'TNEB Net-Meter Application & Sanction',
  'Solar Module & On-Grid Inverter Delivery',
  'Rooftop Mounting Structure & Panel Installation',
  'TNEB Bi-Directional Net-Meter Inspection & Charging',
  'PM Surya Ghar Subsidy Documentation & Handover'
];

export default function SolarProjectManager() {
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [saving, setSaving] = useState(false);

  // New Project Form
  const [newProjectForm, setNewProjectForm] = useState({
    customerName: '',
    customerMobile: '',
    capacityKWp: 3,
    siteAddress: '',
    district: 'Thiruvallur',
    teamId: 'TEAM-101',
    inverterModel: 'On-Grid String Inverter (Battery-Free)',
    panelCount: 6
  });

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projRes, teamRes, custRes] = await Promise.all([
        api.get('/workforce/projects').catch(() => ({ data: { projects: [] } })),
        api.get('/workforce/teams').catch(() => ({ data: { teams: [] } })),
        api.get('/customers').catch(() => ({ data: { customers: [] } }))
      ]);

      const projList = Array.isArray(projRes.data) ? projRes.data : (projRes.data?.projects || []);
      const teamList = Array.isArray(teamRes.data) ? teamRes.data : (teamRes.data?.teams || []);
      const custList = Array.isArray(custRes.data) ? custRes.data : (custRes.data?.customers || []);

      setProjects(projList);
      setTeams(teamList);
      setCustomers(custList);
    } catch (err) {
      console.error('Failed to load solar projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const team = teams.find(t => t.teamId === newProjectForm.teamId);
      await api.post('/workforce/projects', {
        ...newProjectForm,
        teamName: team?.teamName || 'Solar Installation Squad',
        milestones: MILESTONES.map((title, idx) => ({
          milestoneId: `M-${idx + 1}`,
          title,
          status: idx === 0 ? 'In Progress' : 'Pending',
          updatedAt: new Date().toISOString()
        }))
      });

      setShowCreateModal(false);
      setSuccessMsg('Solar installation project created successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to create project');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMilestone = async (proj, milestoneIndex, nextStatus) => {
    try {
      const updatedMilestones = [...(proj.milestones || [])];
      if (updatedMilestones[milestoneIndex]) {
        updatedMilestones[milestoneIndex].status = nextStatus;
        updatedMilestones[milestoneIndex].updatedAt = new Date().toISOString();
      }

      // Check if all completed
      const allDone = updatedMilestones.every(m => m.status === 'Completed');
      const projStatus = allDone ? 'Completed' : 'Installation Ongoing';

      await api.put(`/workforce/projects/${proj._id || proj.id || proj.projectId}`, {
        milestones: updatedMilestones,
        status: projStatus
      });

      setSuccessMsg('Project milestone updated!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
      if (selectedProject && (selectedProject._id === proj._id || selectedProject.projectId === proj.projectId)) {
        setSelectedProject({ ...selectedProject, milestones: updatedMilestones, status: projStatus });
      }
    } catch (err) {
      setErrorMsg('Failed to update milestone');
      setTimeout(() => setErrorMsg(''), 3000);
    }
  };

  const totalCapacity = projects.reduce((sum, p) => sum + (Number(p.capacityKWp) || 3), 0);
  const completedProjects = projects.filter(p => p.status === 'Completed').length;
  const ongoingProjects = projects.filter(p => p.status !== 'Completed').length;

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
            <Sun className="w-7 h-7 text-yellow-500" />
            <span>Rooftop Solar Project Tracker (Strict Battery-Free)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            End-to-end solar milestones from rooftop structural feasibility to TNEB net-meter commissioning and PM Surya Ghar subsidy payout.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-lg flex items-center space-x-2 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Solar Project</span>
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
          <span className="text-xs font-semibold text-slate-500">Total Solar Projects</span>
          <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{projects.length}</p>
          <span className="text-[10px] text-yellow-600 font-semibold">{totalCapacity} kWp Aggregate Power</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Ongoing Installations</span>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{ongoingProjects}</p>
          <span className="text-[10px] text-blue-600 font-semibold">Active rooftop sites</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Commissioned & Handed Over</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{completedProjects}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">TNEB net-meter live</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Battery-Free Compliance</span>
          <p className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">100%</p>
          <span className="text-[10px] text-teal-600 font-semibold">Zero toxic batteries</span>
        </div>
      </div>

      {/* PROJECTS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((proj) => {
          const milestones = proj.milestones || [];
          const completedCount = milestones.filter(m => m.status === 'Completed').length;
          const pct = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;
          return (
            <div
              key={proj._id || proj.projectId}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-300 font-mono">
                    {proj.projectId || 'PRJ-1001'}
                  </span>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base mt-1.5">{proj.customerName}</h3>
                  <p className="text-xs text-slate-500">{proj.siteAddress || 'Thiruvallur, Tamil Nadu'}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-teal-600 dark:text-teal-400">
                    {proj.capacityKWp || 3} kWp On-Grid
                  </span>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{pct}% Milestones</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-yellow-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Milestones Checklist Snippet */}
              <div className="space-y-1.5 pt-1">
                {milestones.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 dark:border-slate-850">
                    <div className="flex items-center space-x-2 truncate pr-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        m.status === 'Completed' ? 'bg-emerald-500' : m.status === 'In Progress' ? 'bg-amber-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'
                      }`} />
                      <span className={`truncate ${m.status === 'Completed' ? 'text-slate-800 dark:text-slate-200 font-semibold' : 'text-slate-500'}`}>
                        {idx + 1}. {m.title}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        const next = m.status === 'Completed' ? 'In Progress' : m.status === 'In Progress' ? 'Completed' : 'In Progress';
                        handleToggleMilestone(proj, idx, next);
                      }}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors shrink-0 ${
                        m.status === 'Completed'
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200'
                          : m.status === 'In Progress'
                          ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200'
                      }`}
                    >
                      {m.status}
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
                <span>Team: <strong className="text-slate-700 dark:text-slate-300">{proj.teamName || 'Thiruvallur Solar Squad'}</strong></span>
                <span className={`font-bold ${proj.status === 'Completed' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {proj.status || 'Ongoing'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE PROJECT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center space-x-2">
                <Sun className="w-5 h-5 text-yellow-500" />
                <span>Initialize Rooftop Solar Project</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={newProjectForm.customerName}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, customerName: e.target.value })}
                    placeholder="e.g. K. Sundaramoorthy"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Contact Mobile *</label>
                  <input
                    type="tel"
                    required
                    value={newProjectForm.customerMobile}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, customerMobile: e.target.value })}
                    placeholder="9840123456"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">System Capacity (kWp) *</label>
                  <select
                    value={newProjectForm.capacityKWp}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, capacityKWp: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-teal-600"
                  >
                    <option value="1">1 kWp (Basic Domestic)</option>
                    <option value="2">2 kWp</option>
                    <option value="3">3 kWp (Most Popular - ₹78,000 Subsidy)</option>
                    <option value="5">5 kWp</option>
                    <option value="10">10 kWp (Commercial / High Usage)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned Installation Squad *</label>
                  <select
                    value={newProjectForm.teamId}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, teamId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  >
                    {teams.map((t) => (
                      <option key={t.teamId} value={t.teamId}>{t.teamName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Installation Site Address *</label>
                <textarea
                  rows={2}
                  required
                  value={newProjectForm.siteAddress}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, siteAddress: e.target.value })}
                  placeholder="Door No, Street Name, Town / District..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-[11px] text-teal-800 dark:text-teal-200">
                <p className="font-bold flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span>Strict Battery-Free On-Grid Standard</span>
                </p>
                <p className="mt-1">
                  System will be commissioned with a bi-directional TANGEDCO net-meter. Zero batteries, maximum government subsidy up to ₹78,000.
                </p>
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
                  className="px-5 py-2 rounded-xl font-bold bg-yellow-500 hover:bg-yellow-600 text-slate-950 shadow-md"
                >
                  {saving ? 'Creating...' : 'Initialize Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
