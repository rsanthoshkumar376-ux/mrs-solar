import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api.js';
import { formatCurrency } from '../../utils/format.js';
import { 
  Users, UserPlus, Phone, MessageCircle, FileText, Search, Filter, 
  Trash2, Edit3, ArrowRight, ArrowLeft, CheckCircle2, Clock, 
  AlertCircle, Sparkles, X, ChevronRight, RefreshCw, Eye,
  Building, Sun, Zap, Calendar, ExternalLink, Columns, List
} from 'lucide-react';
import { translations, getLanguage } from '../../utils/translations.js';
import SolarQuotationModal from '../../components/SolarQuotationModal.jsx';

const PIPELINE_STAGES = [
  { id: 'New', label: '1. New Inquiries', color: 'from-blue-600 to-cyan-500', badge: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  { id: 'Survey Scheduled', label: '2. Survey Booked', color: 'from-amber-500 to-yellow-500', badge: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  { id: 'Quotation Sent', label: '3. Proposal Sent', color: 'from-purple-600 to-indigo-500', badge: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  { id: 'Loan Processing', label: '4. Bank Loan KYC', color: 'from-indigo-600 to-teal-500', badge: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
  { id: 'Installed', label: '5. Installed & Live', color: 'from-emerald-600 to-teal-500', badge: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  { id: 'Lost', label: '6. Lost / Dropped', color: 'from-slate-600 to-slate-500', badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700' }
];

export default function LeadManager() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');

  // Quotation Modal State
  const [quotationLead, setQuotationLead] = useState(null);

  // Edit / Status Modal State
  const [editingLead, setEditingLead] = useState(null);
  const [editStatus, setEditStatus] = useState('New');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Manual Add Lead Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    district: 'Thiruvallur',
    monthlyEbBill: 2500,
    systemCapacity: 3,
    roofType: 'RCC Concrete',
    loanTenureMonths: 60,
    referralCode: '',
    notes: ''
  });
  const [addingLead, setAddingLead] = useState(false);

  // Language state
  const [lang, setLang] = useState(getLanguage);
  useEffect(() => {
    const handleLangChange = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLangChange);
    return () => window.removeEventListener('language-change', handleLangChange);
  }, []);
  const t = translations[lang] || translations.en;

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/leads');
      setLeads(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q || 
        (lead.fullName && lead.fullName.toLowerCase().includes(q)) ||
        (lead.mobileNumber && lead.mobileNumber.toLowerCase().includes(q)) ||
        (lead.district && lead.district.toLowerCase().includes(q)) ||
        (lead.referralCode && lead.referralCode.toLowerCase().includes(q));

      const matchStage = stageFilter === 'all' || (lead.status || 'New') === stageFilter;
      const matchDistrict = districtFilter === 'all' || lead.district === districtFilter;

      return matchSearch && matchStage && matchDistrict;
    });
  }, [leads, search, stageFilter, districtFilter]);

  // Unique districts for filter
  const uniqueDistricts = useMemo(() => {
    const set = new Set();
    leads.forEach((l) => { if (l.district) set.add(l.district); });
    return Array.from(set);
  }, [leads]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = leads.length;
    const active = leads.filter(l => l.status !== 'Lost' && l.status !== 'Installed').length;
    const installed = leads.filter(l => l.status === 'Installed').length;
    const totalKw = leads
      .filter(l => l.status !== 'Lost')
      .reduce((sum, l) => sum + (Number(l.systemCapacity) || 3), 0);
    const pipelineValue = totalKw * 65000;
    return { total, active, installed, totalKw, pipelineValue };
  }, [leads]);

  // Update lead stage directly
  const handleMoveStage = async (leadId, newStage, e) => {
    if (e) e.stopPropagation();
    try {
      // Optimistic update
      setLeads(prev => prev.map(l => l._id === leadId ? { ...l, status: newStage, updatedAt: new Date().toISOString() } : l));
      await api.put(`/admin/leads/${leadId}`, { status: newStage });
    } catch (err) {
      console.error('Failed to update stage:', err);
      fetchLeads(); // rollback
    }
  };

  // Delete lead
  const handleDeleteLead = async (leadId, name, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete lead for "${name || 'Customer'}"? This cannot be undone.`)) return;
    try {
      setLeads(prev => prev.filter(l => l._id !== leadId));
      await api.delete(`/admin/leads/${leadId}`);
    } catch (err) {
      console.error('Failed to delete lead:', err);
      alert('Failed to delete lead.');
      fetchLeads();
    }
  };

  // Open edit modal
  const handleOpenEdit = (lead, e) => {
    if (e) e.stopPropagation();
    setEditingLead(lead);
    setEditStatus(lead.status || 'New');
    setEditNotes(lead.notes || '');
  };

  // Save edit notes & status
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingLead) return;
    setSavingEdit(true);
    try {
      await api.put(`/admin/leads/${editingLead._id}`, {
        status: editStatus,
        notes: editNotes
      });
      setLeads(prev => prev.map(l => l._id === editingLead._id ? { ...l, status: editStatus, notes: editNotes, updatedAt: new Date().toISOString() } : l));
      setEditingLead(null);
    } catch (err) {
      console.error('Failed to save lead updates:', err);
      alert('Error updating lead details');
    } finally {
      setSavingEdit(false);
    }
  };

  // Add Lead Manually
  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!newLeadForm.fullName.trim() || !newLeadForm.mobileNumber.trim()) {
      alert('Please fill in Customer Name and Mobile Number.');
      return;
    }
    setAddingLead(true);
    try {
      const res = await api.post('/leads', {
        ...newLeadForm,
        systemCapacity: Number(newLeadForm.systemCapacity) || 3,
        monthlyEbBill: Number(newLeadForm.monthlyEbBill) || 2500,
        loanTenureMonths: Number(newLeadForm.loanTenureMonths) || 60
      });
      setShowAddModal(false);
      setNewLeadForm({
        fullName: '',
        mobileNumber: '',
        email: '',
        district: 'Thiruvallur',
        monthlyEbBill: 2500,
        systemCapacity: 3,
        roofType: 'RCC Concrete',
        loanTenureMonths: 60,
        referralCode: '',
        notes: ''
      });
      await fetchLeads();
    } catch (err) {
      console.error('Failed to create lead:', err);
      alert('Failed to add new inquiry.');
    } finally {
      setAddingLead(false);
    }
  };

  // WhatsApp Outreach Helper
  const handleWhatsAppContact = (lead, e) => {
    if (e) e.stopPropagation();
    const cleanPhone = String(lead.mobileNumber || '').replace(/\D/g, '');
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const name = lead.fullName || 'Customer';
    const kw = lead.systemCapacity || 3;
    const district = lead.district || 'Tamil Nadu';
    const text = `Vanakkam ${name}! This is MRS SOLAR. We received your rooftop solar inquiry for a ${kw} kW system in ${district}. Would you like to schedule your free site feasibility survey or review your subsidy quote?`;
    window.open(`https://wa.me/${phoneWithCode}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Convert to customer action
  const handleConvertToCustomer = (lead, e) => {
    if (e) e.stopPropagation();
    // Store draft for CustomerManager pre-fill
    const draft = {
      fullName: lead.fullName || '',
      mobileNumber: lead.mobileNumber || '',
      email: lead.email || '',
      district: lead.district || '',
      installationAddress: `${lead.district || ''}, Tamil Nadu`,
      solarCapacity: lead.systemCapacity || '3',
      solarCost: (Number(lead.systemCapacity || 3) * 65000).toString(),
      loanAmount: Math.max(0, (Number(lead.systemCapacity || 3) * 65000) - (Number(lead.systemCapacity || 3) >= 3 ? 78000 : 60000)).toString(),
      emiDuration: String(lead.loanTenureMonths || '60'),
      remarks: `Converted from Lead ID: ${lead._id}. Roof: ${lead.roofType || 'RCC Concrete'}. Ref: ${lead.referralCode || 'None'}`
    };
    try {
      localStorage.setItem('mrs_convert_lead_draft', JSON.stringify(draft));
    } catch (err) {}
    navigate('/admin/customers?action=convert-lead');
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* 1. TOP HEADER & CRM CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-black shadow-sm">
              <Sun className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center space-x-2">
                <span>Owner Lead CRM Pipeline</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300">
                  {leads.length} Total
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track rooftop solar inquiries from Referral Portal, generate 1-click proposals, advance deal stages, and convert leads into active borrowers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-all ${
                viewMode === 'kanban' 
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Kanban Board</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-all ${
                viewMode === 'table' 
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table List</span>
            </button>
          </div>

          <button
            onClick={fetchLeads}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all"
            title="Refresh Leads"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-500/20 flex items-center space-x-1.5 transition-all hover:scale-105 active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Walk-In Lead</span>
          </button>
        </div>
      </div>

      {/* 2. ENTERPRISE CRM METRICS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-premium p-4 rounded-2xl border-l-4 border-l-blue-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Pipeline</span>
          <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mt-1">{metrics.active} Leads</p>
          <span className="text-[10px] text-blue-500 font-semibold">Excluding closed/lost</span>
        </div>

        <div className="glass-premium p-4 rounded-2xl border-l-4 border-l-amber-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Pipeline Capacity</span>
          <p className="text-xl sm:text-2xl font-black text-amber-500 mt-1">{metrics.totalKw} kWp</p>
          <span className="text-[10px] text-slate-500">Rooftop power potential</span>
        </div>

        <div className="glass-premium p-4 rounded-2xl border-l-4 border-l-indigo-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Est. Deal Value</span>
          <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{formatCurrency(metrics.pipelineValue, false)}</p>
          <span className="text-[10px] text-slate-500">Turnkey gross project value</span>
        </div>

        <div className="glass-premium p-4 rounded-2xl border-l-4 border-l-emerald-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Converted & Live</span>
          <p className="text-xl sm:text-2xl font-black text-emerald-500 mt-1">{metrics.installed}</p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            {metrics.total > 0 ? `${((metrics.installed / metrics.total) * 100).toFixed(1)}% Conversion` : '0%'}
          </span>
        </div>
      </div>

      {/* 3. SEARCH & FILTER STRIP */}
      <div className="glass-premium p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 border border-slate-200 dark:border-slate-800">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, district, or referral code..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Pipeline Stages</option>
            {PIPELINE_STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>

          {/* District Filter */}
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Districts ({uniqueDistricts.length})</option>
            {uniqueDistricts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {(search || stageFilter !== 'all' || districtFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setStageFilter('all'); setDistrictFilter('all'); }}
              className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 4. MAIN VIEW: KANBAN BOARD OR TABLE LIST */}
      {viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start overflow-x-auto min-h-[500px]">
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter(l => (l.status || 'New') === stage.id);
            const stageKw = stageLeads.reduce((acc, l) => acc + (Number(l.systemCapacity) || 3), 0);

            return (
              <div 
                key={stage.id}
                className="bg-slate-100/70 dark:bg-slate-900/70 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800/80 flex flex-col min-h-[480px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center space-x-1.5">
                    <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${stage.color}`} />
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                      {stage.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {stageLeads.length} ({stageKw} kW)
                  </span>
                </div>

                {/* Cards Container */}
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[70vh] pr-0.5">
                  {stageLeads.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-600 text-[11px] italic">
                      No leads in this stage
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead._id}
                        className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-2 group"
                      >
                        {/* Name & Date */}
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                              {lead.fullName || 'Prospective Customer'}
                            </h4>
                            <p className="text-[10px] text-slate-400">
                              {lead.district || 'Thiruvallur'} • {lead.roofType || 'RCC'}
                            </p>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400">
                            {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                          </span>
                        </div>

                        {/* Specs Pill Strip */}
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800">
                            ⚡ {lead.systemCapacity || 3} kW
                          </span>
                          {lead.monthlyEbBill ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800">
                              EB ₹{Number(lead.monthlyEbBill).toLocaleString()}
                            </span>
                          ) : null}
                          {lead.referralCode ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800">
                              🎁 Ref: {lead.referralCode}
                            </span>
                          ) : null}
                        </div>

                        {/* Notes preview if any */}
                        {lead.notes && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-1.5 rounded border border-slate-100 dark:border-slate-800/60 line-clamp-2">
                            {lead.notes}
                          </p>
                        )}

                        {/* 1-Click Action Buttons */}
                        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1">
                          <div className="flex items-center space-x-1">
                            {/* WhatsApp */}
                            <button
                              onClick={(e) => handleWhatsAppContact(lead, e)}
                              className="p-1 rounded bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                            {/* Phone */}
                            <a
                              href={`tel:${lead.mobileNumber}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 rounded bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-600 dark:text-blue-400 transition-colors"
                              title={`Call ${lead.mobileNumber}`}
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            {/* 1-Click Quotation PDF */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setQuotationLead(lead); }}
                              className="p-1 rounded bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-600 dark:text-purple-400 transition-colors"
                              title="Generate Official Solar Quotation PDF"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            {/* Edit / Notes */}
                            <button
                              onClick={(e) => handleOpenEdit(lead, e)}
                              className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors"
                              title="Edit Stage / Add Note"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center space-x-1">
                            {/* Convert to Customer */}
                            {stage.id !== 'Installed' && (
                              <button
                                onClick={(e) => handleConvertToCustomer(lead, e)}
                                className="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-[9px] font-black text-teal-700 dark:text-teal-300 transition-colors"
                                title="Convert to Active Customer"
                              >
                                + Customer
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              onClick={(e) => handleDeleteLead(lead._id, lead.fullName, e)}
                              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-500 transition-colors"
                              title="Delete Lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Stage Progresser Buttons */}
                        <div className="flex items-center justify-between pt-1 text-[9px] text-slate-400">
                          {(() => {
                            const curIdx = PIPELINE_STAGES.findIndex(s => s.id === stage.id);
                            const prevStage = curIdx > 0 ? PIPELINE_STAGES[curIdx - 1] : null;
                            const nextStage = curIdx < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[curIdx + 1] : null;

                            return (
                              <>
                                {prevStage ? (
                                  <button
                                    onClick={(e) => handleMoveStage(lead._id, prevStage.id, e)}
                                    className="hover:text-slate-700 dark:hover:text-slate-200 flex items-center space-x-0.5"
                                    title={`Move back to ${prevStage.label}`}
                                  >
                                    <ArrowLeft className="w-2.5 h-2.5" />
                                    <span>Back</span>
                                  </button>
                                ) : <span />}

                                {nextStage ? (
                                  <button
                                    onClick={(e) => handleMoveStage(lead._id, nextStage.id, e)}
                                    className="font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-0.5 ml-auto"
                                    title={`Advance to ${nextStage.label}`}
                                  >
                                    <span>Advance</span>
                                    <ArrowRight className="w-2.5 h-2.5" />
                                  </button>
                                ) : null}
                              </>
                            );
                          })()}
                        </div>

                      </div>
                    ))
                  )}
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className="glass-premium rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                  <th className="p-3 font-bold">Prospect</th>
                  <th className="p-3 font-bold">Contact</th>
                  <th className="p-3 font-bold">Location & Roof</th>
                  <th className="p-3 font-bold">Capacity & EB</th>
                  <th className="p-3 font-bold">Stage / Status</th>
                  <th className="p-3 font-bold">Referral</th>
                  <th className="p-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      No leads match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const stageConfig = PIPELINE_STAGES.find(s => s.id === (lead.status || 'New')) || PIPELINE_STAGES[0];
                    return (
                      <tr key={lead._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="p-3">
                          <p className="font-black text-slate-800 dark:text-white">{lead.fullName || 'Prospective Customer'}</p>
                          <span className="text-[10px] text-slate-400">
                            {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-IN') : ''}
                          </span>
                        </td>
                        <td className="p-3">
                          <p className="font-mono text-slate-700 dark:text-slate-300">{lead.mobileNumber}</p>
                          {lead.email && <span className="text-[10px] text-slate-400 block">{lead.email}</span>}
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-700 dark:text-slate-300">{lead.district || 'Thiruvallur'}</p>
                          <span className="text-[10px] text-slate-400">{lead.roofType || 'RCC Concrete'}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-black text-amber-600 dark:text-amber-400">{lead.systemCapacity || 3} kWp</span>
                          {lead.monthlyEbBill && (
                            <span className="text-[10px] text-slate-400 block">Bill: ₹{Number(lead.monthlyEbBill).toLocaleString()}</span>
                          )}
                        </td>
                        <td className="p-3">
                          <select
                            value={lead.status || 'New'}
                            onChange={(e) => handleMoveStage(lead._id, e.target.value)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border focus:outline-none ${stageConfig.badge}`}
                          >
                            {PIPELINE_STAGES.map(s => (
                              <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          {lead.referralCode ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              {lead.referralCode}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Direct</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={(e) => handleWhatsAppContact(lead, e)}
                              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100"
                              title="WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setQuotationLead(lead)}
                              className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100"
                              title="Solar Quotation PDF"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleConvertToCustomer(lead, e)}
                              className="px-2 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px]"
                              title="Convert to Active Customer"
                            >
                              Convert
                            </button>
                            <button
                              onClick={(e) => handleDeleteLead(lead._id, lead.fullName, e)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* 5. EDIT STAGE & FIELD NOTES MODAL */}
      {editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-black text-slate-800 dark:text-white text-base">
                  Update Lead: {editingLead.fullName}
                </h3>
                <p className="text-xs text-slate-400">{editingLead.mobileNumber} • {editingLead.district}</p>
              </div>
              <button
                onClick={() => setEditingLead(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Pipeline Stage
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none"
                >
                  {PIPELINE_STAGES.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Site Visit Notes & Follow-Up Log
                </label>
                <textarea
                  rows={4}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Visited rooftop on Friday. 400 sq.ft shadow-free area confirmed. Customer requested 5 kW proposal with 5-year EMI..."
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLead(null)}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-md disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Lead Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. ADD WALK-IN LEAD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-teal-50 dark:bg-teal-950/50 text-teal-600 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 dark:text-white text-base">Add Walk-In / Phone Lead</h3>
                  <p className="text-xs text-slate-400">Log customer inquiry directly into CRM pipeline</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Customer Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newLeadForm.fullName}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, fullName: e.target.value })}
                    placeholder="e.g. S. Murugan"
                    className="w-full p-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Mobile / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newLeadForm.mobileNumber}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, mobileNumber: e.target.value })}
                    placeholder="9876543210"
                    className="w-full p-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    value={newLeadForm.district}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, district: e.target.value })}
                    placeholder="Thiruvallur"
                    className="w-full p-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Roof Type
                  </label>
                  <select
                    value={newLeadForm.roofType}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, roofType: e.target.value })}
                    className="w-full p-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  >
                    <option value="RCC Concrete">RCC Concrete Flat Roof</option>
                    <option value="Tin Shed">Tin / Metal Industrial Shed</option>
                    <option value="Clay Tile">Clay Tile Slope Roof</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    System Capacity (kW)
                  </label>
                  <select
                    value={newLeadForm.systemCapacity}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, systemCapacity: Number(e.target.value) })}
                    className="w-full p-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(k => (
                      <option key={k} value={k}>{k} kWp</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Monthly EB Bill (₹)
                  </label>
                  <input
                    type="number"
                    value={newLeadForm.monthlyEbBill}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, monthlyEbBill: e.target.value })}
                    className="w-full p-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Financing Tenure
                  </label>
                  <select
                    value={newLeadForm.loanTenureMonths}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, loanTenureMonths: Number(e.target.value) })}
                    className="w-full p-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  >
                    <option value="36">3 Years (36 Mo)</option>
                    <option value="60">5 Years (60 Mo)</option>
                    <option value="120">10 Years (120 Mo)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Referral Code (Optional)
                </label>
                <input
                  type="text"
                  value={newLeadForm.referralCode}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, referralCode: e.target.value })}
                  placeholder="e.g. SOL-1002"
                  className="w-full p-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Inquiry Notes
                </label>
                <textarea
                  rows={2}
                  value={newLeadForm.notes}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                  placeholder="Notes from customer discussion..."
                  className="w-full p-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingLead}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-md disabled:opacity-50"
                >
                  {addingLead ? 'Adding...' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. OFFICIAL 1-CLICK SOLAR QUOTATION MODAL */}
      {quotationLead && (
        <SolarQuotationModal
          isOpen={Boolean(quotationLead)}
          onClose={() => setQuotationLead(null)}
          customerData={{
            customerName: quotationLead.fullName || 'Prospective Customer',
            mobile: quotationLead.mobileNumber || '',
            district: quotationLead.district || 'Thiruvallur',
            roofType: quotationLead.roofType || 'RCC Concrete Flat',
            ebBill: Number(quotationLead.monthlyEbBill) || 2500,
            systemKw: Number(quotationLead.systemCapacity) || 3,
            tenureMonths: Number(quotationLead.loanTenureMonths) || 60
          }}
        />
      )}

    </div>
  );
}
