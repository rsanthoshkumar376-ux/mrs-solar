import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api.js';
import { formatCurrency } from '../../utils/format.js';
import { 
  Users, UserPlus, Search, SlidersHorizontal, DownloadCloud, Eye, Trash2, X, FileText, MessageCircle, MapPin, Crosshair 
} from 'lucide-react';
import { openWhatsApp } from '../../utils/whatsapp.js';
import { exportCustomersToCsv } from '../../utils/exportCsv.js';
import { translations, getLanguage } from '../../utils/translations.js';

export default function CustomerManager() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState(getLanguage);

  useEffect(() => {
    const handleLangChange = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLangChange);
    return () => window.removeEventListener('language-change', handleLangChange);
  }, []);

  const t = translations[lang] || translations.en;
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [loanStatus, setLoanStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  // Add Customer Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '', fatherName: '', motherName: '', mobileNumber: '', alternateNumber: '',
    email: '', address: '', city: '', district: '', state: '', pinCode: '',
    aadhaarNumber: '', panNumber: '', occupation: '', monthlyIncome: '',
    bankName: '', accountNumber: '', ifscCode: '', nomineeDetails: '',
    installationAddress: '', solarCapacity: '', solarBrand: '', solarCost: '',
    installationDate: '', warrantyDetails: '', loanAmount: '', downPayment: '',
    interestRate: '2', emiDuration: '12', loanStartDate: '', remarks: '',
    latitude: '', longitude: ''
  });

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6)
        }));
        setDetectingGps(false);
      },
      (err) => {
        console.error('GPS error:', err);
        alert(`Failed to detect GPS: ${err.message || 'Permission denied or timed out'}`);
        setDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Files state
  const [files, setFiles] = useState({
    aadhaarFile: null, panFile: null, photoFile: null,
    electricityBillFile: null, propertyProofFile: null, agreementFile: null
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/customers', {
        params: { search, loanStatus, paymentStatus }
      });
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, loanStatus, paymentStatus]);

  // Handle auto-calculating loan amount (Cost - Downpayment)
  useEffect(() => {
    const cost = Number(formData.solarCost) || 0;
    const downPayment = Number(formData.downPayment) || 0;
    const loanAmount = Math.max(0, cost - downPayment);
    setFormData(prev => ({ ...prev, loanAmount: loanAmount.toString() }));
  }, [formData.solarCost, formData.downPayment]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    if (selectedFiles && selectedFiles[0]) {
      setFiles(prev => ({ ...prev, [name]: selectedFiles[0] }));
    }
  };

  const handleAddCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.mobileNumber || !formData.solarCost) {
      alert('Please fill in all mandatory fields: Full Name, Mobile Number, and Solar Cost are compulsory.');
      return;
    }

    const cleanEmail = (formData.email || '').trim();
    if (cleanEmail && (!cleanEmail.includes('@') || !cleanEmail.includes('.'))) {
      alert('Please enter a valid Email Address format (e.g. customer@gmail.com) or leave it blank.');
      return;
    }

    setSubmitLoading(true);

    try {
      // Form Data construct for file upload
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        data.append(key, formData[key]);
      });

      // Append files
      Object.keys(files).forEach(key => {
        if (files[key]) {
          data.append(key, files[key]);
        }
      });

      await api.post('/admin/customers', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('Customer successfully registered!');
      setShowAddModal(false);
      
      // Reset Form
      setFormData({
        fullName: '', fatherName: '', motherName: '', mobileNumber: '', alternateNumber: '',
        email: '', address: '', city: '', district: '', state: '', pinCode: '',
        aadhaarNumber: '', panNumber: '', occupation: '', monthlyIncome: '',
        bankName: '', accountNumber: '', ifscCode: '', nomineeDetails: '',
        installationAddress: '', solarCapacity: '', solarBrand: '', solarCost: '',
        installationDate: '', warrantyDetails: '', loanAmount: '', downPayment: '',
        interestRate: '2', emiDuration: '12', loanStartDate: '', remarks: '',
        latitude: '', longitude: ''
      });
      setFiles({
        aadhaarFile: null, panFile: null, photoFile: null,
        electricityBillFile: null, propertyProofFile: null, agreementFile: null
      });

      fetchCustomers();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Failed to create customer record.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteCustomer = async (id, name) => {
    if (!confirm(`Are you sure you want to permanently delete customer: ${name}?\nAll history and credentials will be removed.`)) {
      return;
    }

    try {
      await api.delete(`/admin/customers/${id}`);
      alert('Customer record deleted.');
      fetchCustomers();
    } catch (error) {
      console.error('Delete customer error:', error);
      alert('Failed to delete customer.');
    }
  };

  // Export customer list to CSV format (Excel compatible)
  const handleExportToCsv = () => {
    if (customers.length === 0) return;
    exportCustomersToCsv(customers);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER ACTION CONTROL BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.customerRecords}</h2>
          <p className="text-sm text-slate-500">{t.customerRecordsSubtitle}</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleExportToCsv}
            disabled={customers.length === 0}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl flex items-center space-x-2 text-sm font-bold transition-all border border-slate-200/50 dark:border-slate-700/50"
            title="Download full customer spreadsheet (.CSV / Excel)"
          >
            <DownloadCloud className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>{t.exportToExcel}</span>
          </button>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex items-center space-x-2 text-sm font-bold transition-all shadow shadow-teal-500/10"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t.addCustomer}</span>
          </button>
        </div>
      </div>

      {/* FILTER SEARCH CRITERIA */}
      <div className="glass-premium rounded-3xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="flex-1 relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchCustomerPlaceholder || "Search by name, ID, phone number, village..."}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-800 dark:text-white outline-none transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-500">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{t.filtersLabel || 'Filters:'}</span>
          </div>

          {/* Loan Status */}
          <select
            value={loanStatus}
            onChange={(e) => setLoanStatus(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 py-2 px-3 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
          >
            <option value="">{t.allLoanStatus || 'All Loan Status'}</option>
            <option value="Active">{t.statusActive}</option>
            <option value="Completed">{t.statusCompleted}</option>
          </select>

          {/* Payment Status */}
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 py-2 px-3 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
          >
            <option value="">{t.allRepaymentStatus || 'All Repayments Status'}</option>
            <option value="Paid">{t.statusPaid}</option>
            <option value="Due Soon">{t.statusDueSoon}</option>
            <option value="Overdue">{t.statusOverdue}</option>
            <option value="Pending">{t.statusPending}</option>
          </select>

        </div>
      </div>

      {/* CUSTOMERS DATA TABLE */}
      <div className="glass-premium rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/50 dark:border-slate-800/50">
                <th className="px-6 py-4">{t.customerId}</th>
                <th className="px-6 py-4">{t.clientNameCol}</th>
                <th className="px-6 py-4">{t.mobile}</th>
                <th className="px-6 py-4">{t.solarBrandSizeCol}</th>
                <th className="px-6 py-4 text-right">{t.loanAmountCol}</th>
                <th className="px-6 py-4 text-right">{t.monthlyEmiCol}</th>
                <th className="px-6 py-4 text-center">{t.loanStatusCol}</th>
                <th className="px-6 py-4 text-center">{t.repaymentStatusCol}</th>
                <th className="px-6 py-4 text-center">{t.actionCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-slate-500">
                    {t.noCustomersFound}
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-800 dark:text-slate-200">{c.customerId}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">{c.fullName}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono">{c.mobileNumber}</span>
                        {c.mobileNumber && (
                          <button
                            type="button"
                            onClick={() => openWhatsApp({
                              phone: c.mobileNumber,
                              message: `வணக்கம் ${c.fullName}, MRS SOLAR-ல் இருந்து தொடர்பு கொள்கிறோம்.`
                            })}
                            title={t.whatsappHelp}
                            className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors"
                          >
                            <MessageCircle className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">{c.solarBrand} ({c.solarCapacity} kW)</td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(c.loanAmount, false)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(c.monthlyEmi, false)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                        c.loanStatus === 'Completed' 
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-250/30'
                          : 'bg-teal-50 text-teal-600 dark:bg-teal-950/20 dark:text-teal-400 border-teal-250/30'
                      }`}>
                        {c.loanStatus === 'Completed' ? t.statusCompleted : t.statusActive}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                        c.paymentStatus === 'Paid'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200/30'
                          : c.paymentStatus === 'Overdue'
                          ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 border-red-200/30 animate-pulse-soft'
                          : c.paymentStatus === 'Due Soon'
                          ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400 border-orange-200/30'
                          : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200/30'
                      }`}>
                        {c.paymentStatus === 'Paid' ? t.statusPaid : c.paymentStatus === 'Overdue' ? t.statusOverdue : c.paymentStatus === 'Due Soon' ? t.statusDueSoon : t.statusPending}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <Link
                          to={`/admin/customers/${c._id}`}
                          className="p-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50 text-teal-600 dark:text-teal-400 rounded-lg transition-colors"
                          title={t.viewLedgerStatement || "View Ledger Statement"}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDeleteCustomer(c._id, c.fullName)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                          title={t.deleteLedger || "Delete Ledger"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* REGISTER NEW CUSTOMER FORM MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl relative max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-3xl">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t.registerFinancingTitle}</h3>
                <p className="text-xs text-slate-500">{t.registerFinancingSubtitle}</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable form body */}
            <form onSubmit={handleAddCustomerSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* BLOCK 1: PERSONAL INFORMATION */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 border-b border-slate-100 dark:border-slate-800 pb-2">{t.personalInfoSection}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.fullNameLabel}</label>
                    <input type="text" name="fullName" required value={formData.fullName} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.fatherNameLabel}</label>
                    <input type="text" name="fatherName" value={formData.fatherName} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.motherNameLabel}</label>
                    <input type="text" name="motherName" value={formData.motherName} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.mobileNumberLabel}</label>
                    <input type="text" name="mobileNumber" required value={formData.mobileNumber} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.altNumberLabel}</label>
                    <input type="text" name="alternateNumber" value={formData.alternateNumber} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">
                      {t.emailOptionalLabel}
                    </label>
                    <input 
                      type="email" 
                      name="email" 
                      value={formData.email} 
                      onChange={handleInputChange} 
                      placeholder="e.g. customer@gmail.com (optional)"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block font-semibold text-slate-500 mb-1">{t.permanentAddressLabel}</label>
                    <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.cityLabel}</label>
                    <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.districtLabel}</label>
                    <input type="text" name="district" value={formData.district} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.stateLabel}</label>
                    <input type="text" name="state" value={formData.state} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.pinCodeLabel}</label>
                    <input type="text" name="pinCode" value={formData.pinCode} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.aadhaarNumberLabel}</label>
                    <input type="text" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.panNumberLabel}</label>
                    <input type="text" name="panNumber" value={formData.panNumber} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.occupationLabel}</label>
                    <input type="text" name="occupation" value={formData.occupation} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.monthlyIncomeLabel}</label>
                    <input type="number" name="monthlyIncome" value={formData.monthlyIncome} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                </div>
              </div>

              {/* BLOCK 2: BANK & NOMINEE DETAILS */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 border-b border-slate-100 dark:border-slate-800 pb-2">{t.bankNomineeSection}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.bankNameLabel}</label>
                    <input type="text" name="bankName" value={formData.bankName} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.accountNumberLabel}</label>
                    <input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.ifscCodeLabel}</label>
                    <input type="text" name="ifscCode" value={formData.ifscCode} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block font-semibold text-slate-500 mb-1">{t.nomineeDetailsLabel}</label>
                    <input type="text" name="nomineeDetails" value={formData.nomineeDetails} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                </div>
              </div>

              {/* BLOCK 3: SOLAR CAPACITY & ROOFTOP GPS */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">{t.solarGpsSection}</h4>
                  <button
                    type="button"
                    onClick={handleDetectGps}
                    disabled={detectingGps}
                    className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50 text-teal-600 dark:text-teal-400 text-xs font-bold border border-teal-200/50 dark:border-teal-800/50 transition-colors self-start sm:self-auto"
                    title="Capture current phone or laptop coordinates"
                  >
                    <Crosshair className={`w-3.5 h-3.5 ${detectingGps ? 'animate-spin' : ''}`} />
                    <span>{detectingGps ? (t.detectingGpsText || 'Detecting Satellite GPS...') : (t.autoDetectRoofGps || '📍 Auto-Detect Current Roof GPS')}</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="md:col-span-2">
                    <label className="block font-semibold text-slate-500 mb-1">{t.solarInstallAddressLabel}</label>
                    <input type="text" name="installationAddress" value={formData.installationAddress} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.solarCapacityKwLabel}</label>
                    <input type="number" step="0.1" required name="solarCapacity" value={formData.solarCapacity} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.roofLatLabel}</label>
                    <input type="number" step="any" placeholder="e.g. 11.1271" name="latitude" value={formData.latitude} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.roofLngLabel}</label>
                    <input type="number" step="any" placeholder="e.g. 78.6569" name="longitude" value={formData.longitude} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.solarBrandLabel}</label>
                    <input type="text" name="solarBrand" value={formData.solarBrand} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.solarCostLabel}</label>
                    <input type="number" required name="solarCost" value={formData.solarCost} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.installationDateLabel}</label>
                    <input type="date" name="installationDate" value={formData.installationDate} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block font-semibold text-slate-500 mb-1">{t.warrantyDetailsLabel}</label>
                    <input type="text" name="warrantyDetails" value={formData.warrantyDetails} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                </div>
              </div>

              {/* BLOCK 4: FINANCING / LOAN VARIABLES */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 border-b border-slate-100 dark:border-slate-800 pb-2">{t.financingSetupSection}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.downPaymentLabel}</label>
                    <input type="number" name="downPayment" value={formData.downPayment} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.calcLoanPrincipalLabel}</label>
                    <input type="number" disabled name="loanAmount" value={formData.loanAmount} className="w-full bg-slate-200 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.monthlyInterestRateLabel}</label>
                    <input type="number" required name="interestRate" value={formData.interestRate} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.emiDurationMonthsLabel}</label>
                    <input type="number" required name="emiDuration" value={formData.emiDuration} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.loanStartDateLabel}</label>
                    <input type="date" name="loanStartDate" value={formData.loanStartDate} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.remarksLabel}</label>
                    <input type="text" name="remarks" value={formData.remarks} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                </div>
              </div>

              {/* BLOCK 5: DOCUMENTS UPLOAD */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 border-b border-slate-100 dark:border-slate-800 pb-2">{t.documentsAttachmentSection}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[10px]">
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.customerPhotoLabel}</label>
                    <input type="file" name="photoFile" onChange={handleFileChange} className="w-full text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-300" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.aadhaarProofLabel}</label>
                    <input type="file" name="aadhaarFile" onChange={handleFileChange} className="w-full text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-300" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.panCardLabel}</label>
                    <input type="file" name="panFile" onChange={handleFileChange} className="w-full text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-300" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.ebBillLabel}</label>
                    <input type="file" name="electricityBillFile" onChange={handleFileChange} className="w-full text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-300" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.propertyProofLabel}</label>
                    <input type="file" name="propertyProofFile" onChange={handleFileChange} className="w-full text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-300" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.agreementPdfLabel}</label>
                    <input type="file" name="agreementFile" onChange={handleFileChange} className="w-full text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-300" />
                  </div>
                </div>
              </div>

            </form>

            {/* Footer buttons */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                {t.cancel}
              </button>
              
              <button
                onClick={handleAddCustomerSubmit}
                disabled={submitLoading}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-600/50 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-2"
              >
                {submitLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                <span>{t.registerAndCreateBtn}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
