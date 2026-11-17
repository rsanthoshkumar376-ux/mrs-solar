import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import { translations, getLanguage } from '../../utils/translations.js';
import {
  Sun, Zap, PlusCircle, CheckCircle2, Clock, AlertCircle,
  Building, MapPin, User, ChevronRight, X, RefreshCw,
  ShieldCheck, FileText, Check, ShieldAlert, Trash2
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
  const [lang, setLang] = useState(getLanguage);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // New Project Form
  const [newProjectForm, setNewProjectForm] = useState({
    customerId: '',
    customerName: '',
    customerMobile: '',
    capacityKWp: 3,
    siteAddress: '',
    district: 'Thiruvallur',
    teamId: 'TEAM-101',
    inverterModel: 'On-Grid String Inverter (Battery-Free)',
    panelCount: 6,
    createCustomerAccount: true
  });

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleLangChange = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLangChange);
    return () => window.removeEventListener('language-change', handleLangChange);
  }, []);

  const t = translations[lang] || translations.en;
  const isTa = lang === 'ta';

  const getMilestoneTitle = (index, originalTitle) => {
    if (!isTa) return originalTitle;
    const tamilMilestones = [
      t.ms1Title || 'கள ஆய்வு & கூரை உறுதித்தன்மை',
      t.ms2Title || 'TNEB நெட்-மீட்டர் விண்ணப்பம் & அனுமதி',
      t.ms3Title || 'சோலார் பேனல் & இன்வெர்ட்டர் விநியோகம்',
      t.ms4Title || 'கூரை கட்டமைப்பு & சோலார் பேனல் பொருத்துதல்',
      t.ms5Title || 'TNEB இருவழி மீட்டர் ஆய்வு & மின் உற்பத்தி',
      t.ms6Title || 'PM சூர்யா கர் மானிய வரவு & ஒப்படைப்பு'
    ];
    return tamilMilestones[index] || originalTitle;
  };

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
    setModalError('');
    try {
      setSaving(true);
      const team = teams.find(t => t.teamId === newProjectForm.teamId);
      const cap = Number(newProjectForm.capacityKWp) || 3;
      await api.post('/workforce/projects', {
        ...newProjectForm,
        capacityKw: cap,
        capacityKWp: cap,
        address: newProjectForm.siteAddress,
        siteAddress: newProjectForm.siteAddress,
        teamName: team?.teamName || 'Solar Installation Squad',
        milestones: MILESTONES.map((title, idx) => ({
          milestoneId: `M-${idx + 1}`,
          title,
          status: idx === 0 ? 'In Progress' : 'Pending',
          updatedAt: new Date().toISOString()
        }))
      });

      setShowCreateModal(false);
      setModalError('');
      setNewProjectForm({
        customerId: '',
        customerName: '',
        customerMobile: '',
        capacityKWp: 3,
        siteAddress: '',
        district: 'Thiruvallur',
        teamId: 'TEAM-101',
        inverterModel: 'On-Grid String Inverter (Battery-Free)',
        panelCount: 6,
        createCustomerAccount: true
      });
      setSuccessMsg('Solar installation project created successfully and linked to customer user account!');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to create project';
      setModalError(msg);
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (proj) => {
    if (!window.confirm(`Are you sure you want to delete solar project ${proj.projectId || proj.customerName}?`)) {
      return;
    }
    try {
      await api.delete(`/workforce/projects/${proj._id || proj.id || proj.projectId}`);
      setSuccessMsg(`Project ${proj.projectId || ''} deleted`);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err) {
      setErrorMsg('Failed to delete project');
      setTimeout(() => setErrorMsg(''), 3000);
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

  const totalCapacity = projects.reduce((sum, p) => sum + (Number(p.capacityKWp || p.capacityKw) || 3), 0);
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
            <span>{t.solarProjectTrackerTitle || 'Rooftop Solar Project Tracker (Strict Battery-Free)'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t.solarProjectTrackerSubtitle || 'End-to-end solar milestones from rooftop structural feasibility to TNEB net-meter commissioning and PM Surya Ghar subsidy payout.'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => { setModalError(''); setShowCreateModal(true); }}
            className="px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-lg flex items-center space-x-2 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.newSolarProject || 'New Solar Project'}</span>
          </button>
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title={isTa ? 'புதுப்பிக்க' : 'Refresh'}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">{t.totalSolarProjects || 'Total Solar Projects'}</span>
          <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{projects.length}</p>
          <span className="text-[10px] text-yellow-600 font-semibold">{totalCapacity} kWp {t.aggregatePower || 'Aggregate Power'}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">{t.ongoingInstallations || 'Ongoing Installations'}</span>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{ongoingProjects}</p>
          <span className="text-[10px] text-blue-600 font-semibold">{t.activeRooftopSites || 'Active rooftop sites'}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">{t.commissionedHandedOver || 'Commissioned & Handed Over'}</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{completedProjects}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">{t.tnebNetMeterLive || 'TNEB net-meter live'}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">{t.batteryFreeCompliance || 'Battery-Free Compliance'}</span>
          <p className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">100%</p>
          <span className="text-[10px] text-teal-600 font-semibold">{t.zeroToxicBatteries || 'Zero toxic batteries'}</span>
        </div>
      </div>

      {/* STRICT BATTERY-FREE & DIRECT EB FEED EXPLAINER BANNER */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-900/40 via-slate-900 to-indigo-950/40 border border-teal-500/30 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Zap className="w-5 h-5 text-teal-400" />
            </span>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center space-x-2">
                <span>{isTa ? 'பேட்டரி இல்லாத நேரடி ஆன்-கிரிட் முறை: சோலார் மின்சாரம் நேரடியாக EB-க்கு அனுப்பப்பட்டு கரண்ட் பில் குறையும்' : 'Strict Battery-Free Design: Solar Directly Sent to EB to Reduce Electricity Bill'}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {isTa ? '100% நேரடி EB' : '100% On-Grid'}
                </span>
              </h3>
              <p className="text-xs text-teal-200/80 mt-0.5">
                {isTa ? 'பேட்டரி பராமரிப்புத் தேவையில்லை — உற்பத்தியாகும் மின்சாரம் உடனுக்குடன் TNEB நெட்-மீட்டர் மூலம் சேமிக்கப்பட்டு மின்கட்டணம் பூஜ்ஜியமாகும்.' : 'Tamil: பேட்டரி தேவையில்லை — சோலார் மின்சாரம் நேரடியாக EB-க்கு அனுப்பப்பட்டு, உங்கள் கரண்ட் பில் தொகையை பெருமளவு குறைக்கும்!'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-bold text-amber-400 flex items-center space-x-1.5">
              <span>{isTa ? '🚫 1. பேட்டரிகள் தேவையில்லை' : '🚫 1. No Batteries Required'}</span>
            </span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {isTa ? '3-5 ஆண்டுகளுக்கு ஒருமுறை மாற்ற வேண்டிய விலை உயர்ந்த ரசாயன பேட்டரிகள் தேவையில்லை. ₹80,000+ வரை சேமிப்பு, எந்தவித தீ விபத்து அல்லது கசிவு அபாயமும் இல்லை.' : 'Zero expensive chemical batteries to maintain or replace every 3-5 years, saving ₹80,000+ in replacement costs with zero safety hazards.'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-bold text-teal-400 flex items-center space-x-1.5">
              <span>{isTa ? '⚡ 2. நேரடியாக EB (TNEB மின் கட்டத்திற்கு) செல்லும்' : '⚡ 2. Directly Sent to EB (TNEB Grid)'}</span>
            </span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {isTa ? 'சூரிய ஒளி உள்ள பகல் வேளையில், 100% சோலார் மின்சாரமும் இருவழி நெட்-மீட்டர் மூலம் நேரடியாக TANGEDCO/TNEB மின் கட்டத்திற்கு அனுப்பப்படும்.' : 'During sunlight hours, 100% of solar electricity is fed straight into the TANGEDCO/TNEB grid through a certified Bi-Directional Net Meter.'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-bold text-emerald-400 flex items-center space-x-1.5">
              <span>{isTa ? '📉 3. EB உங்கள் கரண்ட் பில் தொகையை குறைக்கும்' : '📉 3. EB Reduces Your Electricity Bill'}</span>
            </span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {isTa ? 'EB-க்கு அனுப்பப்படும் ஒவ்வொரு சோலார் யூனிட்டும் உங்கள் வீட்டின் மின் நுகர்வைக் கழித்து, உங்கள் இருமாத மின்கட்டணத்தை ₹0 ஆகக் குறைக்கும்!' : 'Every unit exported to EB spins your net meter backwards, directly offsetting your household consumption and reducing your bi-monthly bill to ₹0!'}
            </p>
          </div>
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
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-300 font-mono">
                      {proj.projectId || 'PRJ-1001'}
                    </span>
                    {proj.customerId && (
                      <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 font-mono">
                        {proj.customerId}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base mt-1.5">{proj.customerName}</h3>
                  <p className="text-xs text-slate-500">{proj.siteAddress || proj.address || 'Thiruvallur, Tamil Nadu'}</p>
                  {proj.customerMobile && (
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">📞 {proj.customerMobile}</p>
                  )}
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className="flex items-center space-x-1">
                    <span className="text-sm font-black text-teal-600 dark:text-teal-400">
                      {proj.capacityKWp || proj.capacityKw || 3} kWp {isTa ? 'நேரடி EB' : 'On-Grid'}
                    </span>
                    <button
                      onClick={() => handleDeleteProject(proj)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors ml-1"
                      title={isTa ? 'திட்டத்தை நீக்கு' : 'Delete Project'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{pct}% {isTa ? 'நிறைவு' : 'Milestones'}</p>
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
                  <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 dark:border-slate-800">
                    <div className="flex items-center space-x-2 truncate pr-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        m.status === 'Completed' ? 'bg-emerald-500' : m.status === 'In Progress' ? 'bg-amber-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'
                      }`} />
                      <span className={`truncate ${m.status === 'Completed' ? 'text-slate-800 dark:text-slate-200 font-semibold' : 'text-slate-500'}`}>
                        {idx + 1}. {getMilestoneTitle(idx, m.title || m.name)}
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
                      {m.status === 'Completed' ? (isTa ? 'நிறைவடைந்தது' : 'Completed') : m.status === 'In Progress' ? (isTa ? 'நடைமுறையில்' : 'In Progress') : (isTa ? 'நிலுவை' : 'Pending')}
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
                <span>{isTa ? 'குழு:' : 'Team:'} <strong className="text-slate-700 dark:text-slate-300">{proj.teamName || (isTa ? 'திருவள்ளூர் சோலார் குழு' : 'Thiruvallur Solar Squad')}</strong></span>
                <span className={`font-bold ${proj.status === 'Completed' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {proj.status === 'Completed' ? (isTa ? 'நிறைவடைந்தது' : 'Completed') : (isTa ? 'நடைமுறையில் உள்ளது' : 'Ongoing')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE PROJECT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center space-x-2">
                <Sun className="w-5 h-5 text-yellow-500" />
                <span>{isTa ? 'புதிய கூரை சோலார் திட்டத்தை உருவாக்கு' : 'Initialize Rooftop Solar Project'}</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3.5 text-xs">
              {modalError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Customer Selector / Creator */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isTa ? 'வாடிக்கையாளர் கணக்கு *' : 'Customer / User Account *'}
                </label>
                <select
                  value={newProjectForm.customerId || ''}
                  onChange={(e) => {
                    const cid = e.target.value;
                    if (!cid) {
                      setNewProjectForm({
                        ...newProjectForm,
                        customerId: '',
                        customerName: '',
                        customerMobile: '',
                        siteAddress: ''
                      });
                    } else {
                      const c = customers.find(item => item.customerId === cid);
                      if (c) {
                        setNewProjectForm({
                          ...newProjectForm,
                          customerId: c.customerId,
                          customerName: c.fullName || '',
                          customerMobile: c.mobileNumber || '',
                          siteAddress: c.address || `${c.district || 'Thiruvallur'}, Tamil Nadu`,
                          capacityKWp: Number(c.solarCapacity) || 3
                        });
                      }
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium"
                >
                  <option value="">{isTa ? '➕ புதிய வாடிக்கையாளர் மற்றும் உள்நுழைவு பதிவுசெய்' : '➕ Register New Customer & User Login'}</option>
                  {customers.map((c) => (
                    <option key={c.customerId} value={c.customerId}>
                      {c.fullName} ({c.customerId}) - {c.mobileNumber}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  {newProjectForm.customerId
                    ? (isTa ? `தற்போதுள்ள வாடிக்கையாளர் கணக்கு ${newProjectForm.customerId} உடன் இணைக்கப்பட்டுள்ளது.` : `Linked to existing customer account ${newProjectForm.customerId}.`)
                    : (isTa ? 'வாடிக்கையாளர் கணக்கு மற்றும் போர்ட்டல் உள்நுழைவு தானாக உருவாக்கப்படும் (கடவுச்சொல் = மொபைல் எண்).' : 'A customer account and Customer Portal user login will be automatically created with password = Mobile Number.')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{isTa ? 'வாடிக்கையாளர் பெயர் *' : 'Customer Name *'}</label>
                  <input
                    type="text"
                    required
                    value={newProjectForm.customerName}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, customerName: e.target.value })}
                    placeholder={isTa ? 'எ.கா. கே. சுந்தரமூர்த்தி' : 'e.g. K. Sundaramoorthy'}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{isTa ? 'தொடர்பு மொபைல் *' : 'Contact Mobile *'}</label>
                  <input
                    type="tel"
                    required
                    value={newProjectForm.customerMobile}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, customerMobile: e.target.value })}
                    placeholder={isTa ? '10 இலக்க மொபைல் எண்' : 'Enter 10-digit mobile number'}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{isTa ? 'கணினி திறன் (kWp) *' : 'System Capacity (kWp) *'}</label>
                  <select
                    value={newProjectForm.capacityKWp}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, capacityKWp: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-teal-600"
                  >
                    <option value="1">1 kWp ({isTa ? 'அடிப்படை வீட்டு பயன்பாடு' : 'Basic Domestic'})</option>
                    <option value="2">2 kWp</option>
                    <option value="3">3 kWp ({isTa ? 'மிகவும் பிரபலம் - ₹78,000 மானியம்' : 'Most Popular - ₹78,000 Subsidy'})</option>
                    <option value="5">5 kWp</option>
                    <option value="10">10 kWp ({isTa ? 'வணிக பயன்பாடு' : 'Commercial / High Usage'})</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{isTa ? 'ஒதுக்கப்பட்ட நிறுவல் குழு *' : 'Assigned Installation Squad *'}</label>
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
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{isTa ? 'நிறுவல் கூரை முகவரி *' : 'Installation Site Address *'}</label>
                <textarea
                  rows={2}
                  required
                  value={newProjectForm.siteAddress}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, siteAddress: e.target.value })}
                  placeholder={isTa ? 'கதவு எண், தெரு பெயர், ஊர் / மாவட்டம்...' : 'Door No, Street Name, Town / District...'}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-300 dark:border-teal-700/60 text-xs text-teal-900 dark:text-teal-100 space-y-1.5">
                <p className="font-bold flex items-center space-x-1.5 text-teal-700 dark:text-teal-300">
                  <ShieldCheck className="w-4 h-4 text-teal-500" />
                  <span>{isTa ? '100% பேட்டரி இல்லாத ஆன்-கிரிட் முறை • நேரடி EB ஏற்றுமதி • மின்கட்டணம் ₹0' : 'Strict Battery-Free Standard • Direct EB Export • EB Bill Reduced to ₹0'}</span>
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isTa ? 'இந்த சோலார் அமைப்பிற்கு எந்தவித பேட்டரியும் தேவையில்லை. உற்பத்தியாகும் அனைத்து மின்சாரமும் இருவழி நெட்-மீட்டர் மூலம் நேரடியாக TANGEDCO/TNEB மின் கட்டத்திற்கு அனுப்பப்படும். உங்கள் இருமாத மின்கட்டணம் நேரடியாகக் கழிக்கப்பட்டு ₹0 ஆக மாறும், மேலும் PM சூர்யா கர் திட்டத்தின் கீழ் ₹78,000 வரை நேரடி மானியமும் கிடைக்கும்!' : 'No battery is needed for this rooftop solar system. All electricity generated is directly sent to the EB (TANGEDCO/TNEB) through a bi-directional net-meter. The EB directly reduces your bi-monthly electricity bill unit-for-unit, plus qualifies for up to ₹78,000 in PM Surya Ghar central subsidies!'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {isTa ? 'ரத்துசெய்' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl font-bold bg-yellow-500 hover:bg-yellow-600 text-slate-950 shadow-md transition-all active:scale-95"
                >
                  {saving ? (isTa ? 'உருவாக்குகிறது...' : 'Creating...') : (isTa ? 'திட்டத்தை உருவாக்கு & பயனர் அமை' : 'Initialize Project & Create User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
