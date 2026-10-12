import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api.js';
import { formatCurrency } from '../../utils/format.js';
import { 
  Users, UserPlus, Search, SlidersHorizontal, DownloadCloud, Eye, Trash2, X, FileText, 
  MessageCircle, MapPin, Crosshair, Edit2, UploadCloud, CheckCircle2, AlertCircle, 
  ChevronLeft, ChevronRight, FileSpreadsheet, Check, FilterX, RotateCcw
} from 'lucide-react';
import { openWhatsApp } from '../../utils/whatsapp.js';
import { exportCustomersToCsv } from '../../utils/exportCsv.js';
import { translations, getLanguage } from '../../utils/translations.js';
import { compressImageFile } from '../../utils/imageCompressor.js';

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

  const hasActiveFilters = Boolean(search.trim() || loanStatus || paymentStatus);

  const handleClearFilters = () => {
    setSearch('');
    setLoanStatus('');
    setPaymentStatus('');
    setPage(1);
  };

  // Server-side Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Add Customer Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);

  // Edit Customer Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editFiles, setEditFiles] = useState({});
  const [editSubmitLoading, setEditSubmitLoading] = useState(false);

  // Bank CSV Reconciler States
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [reconcileFile, setReconcileFile] = useState(null);
  const [autoApplyReconcile, setAutoApplyReconcile] = useState(false);
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [reconcileResult, setReconcileResult] = useState(null);

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

  const fetchCustomers = async (targetPage = page) => {
    setLoading(true);
    try {
      const response = await api.get('/admin/customers', {
        params: { search, loanStatus, paymentStatus, page: targetPage, limit: pageSize }
      });
      if (response.data && response.data.customers) {
        setCustomers(response.data.customers);
        setPagination(response.data.pagination);
      } else if (Array.isArray(response.data)) {
        setCustomers(response.data);
        setPagination({ total: response.data.length, totalPages: Math.ceil(response.data.length / pageSize) || 1 });
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchCustomers(1);
  }, [search, loanStatus, paymentStatus, pageSize]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > (pagination.totalPages || 1)) return;
    setPage(newPage);
    fetchCustomers(newPage);
  };

  // Handle auto-calculating loan amount (Cost - Downpayment)
  useEffect(() => {
    const cost = Number(formData.solarCost) || 0;
    const downPayment = Number(formData.downPayment) || 0;
    const loanAmount = Math.max(0, cost - downPayment);
    setFormData(prev => ({ ...prev, loanAmount: loanAmount.toString() }));
  }, [formData.solarCost, formData.downPayment]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'aadhaarNumber') {
      const digits = value.replace(/\D/g, '');
      if (digits.length > 4) {
        setFormData(prev => ({ ...prev, aadhaarNumber: `XXXX-XXXX-${digits.slice(-4)}` }));
        return;
      }
    }
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
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      alert('Please enter a valid compulsory Email Address (e.g. customer@gmail.com).');
      return;
    }

    const cleanAadhaar = (formData.aadhaarNumber || '').trim();
    if (!cleanAadhaar) {
      alert('Please enter a compulsory Aadhaar Number.');
      return;
    }

    if (!formData.address || !formData.city || !formData.district || !formData.state || !formData.pinCode) {
      alert('Please fill in compulsory Address details: Permanent Address, City, District, State, and Pin Code are required.');
      return;
    }

    if (!formData.panNumber || !formData.panNumber.trim()) {
      alert('Please enter a compulsory PAN Number.');
      return;
    }

    if (!formData.bankName || !formData.accountNumber || !formData.ifscCode) {
      alert('Please fill in compulsory Bank Details: Bank Name, Account Number, and IFSC Code are required.');
      return;
    }

    if (!formData.installationAddress || !formData.solarCapacity) {
      alert('Please fill in compulsory Solar Installation Address and Solar Capacity.');
      return;
    }

    if (!formData.loanStartDate) {
      alert('Please select a compulsory Loan Start Date.');
      return;
    }

    if (!files.aadhaarFile) {
      alert('Please upload a compulsory Aadhaar Card proof document.');
      return;
    }

    setSubmitLoading(true);

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        data.append(key, formData[key]);
      });

      // Compress images before upload to save bandwidth
      for (const key of Object.keys(files)) {
        if (files[key]) {
          const compressed = await compressImageFile(files[key]);
          data.append(key, compressed);
        }
      }

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

      fetchCustomers(1);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Failed to create customer record.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Edit Customer Handlers
  const handleOpenEditModal = (c) => {
    setEditCustomer(c);
    setEditFormData({
      fullName: c.fullName || '',
      fatherName: c.fatherName || '',
      motherName: c.motherName || '',
      mobileNumber: c.mobileNumber || '',
      alternateNumber: c.alternateNumber || '',
      email: c.email || '',
      address: c.address || '',
      city: c.city || '',
      district: c.district || '',
      state: c.state || '',
      pinCode: c.pinCode || c.pincode || '',
      aadhaarNumber: c.aadhaarNumber || '',
      panNumber: c.panNumber || '',
      occupation: c.occupation || '',
      monthlyIncome: c.monthlyIncome ? String(c.monthlyIncome) : '',
      bankName: c.bankDetails?.bankName || '',
      accountNumber: c.bankDetails?.accountNumber || '',
      ifscCode: c.bankDetails?.ifscCode || '',
      nomineeDetails: c.nomineeDetails || '',
      installationAddress: c.installationAddress || '',
      solarCapacity: c.solarCapacity ? String(c.solarCapacity) : '',
      solarBrand: c.solarBrand || '',
      solarCost: c.solarCost ? String(c.solarCost) : '',
      installationDate: c.installationDate || '',
      warrantyDetails: c.warrantyDetails || '',
      remarks: c.remarks || '',
      latitude: c.latitude ? String(c.latitude) : '',
      longitude: c.longitude ? String(c.longitude) : ''
    });
    setEditFiles({});
    setShowEditModal(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'aadhaarNumber') {
      const digits = value.replace(/\D/g, '');
      if (digits.length > 4) {
        setEditFormData(prev => ({ ...prev, aadhaarNumber: `XXXX-XXXX-${digits.slice(-4)}` }));
        return;
      }
    }
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    if (selectedFiles && selectedFiles[0]) {
      setEditFiles(prev => ({ ...prev, [name]: selectedFiles[0] }));
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editCustomer) return;
    if (!editFormData.fullName || !editFormData.mobileNumber) {
      alert('Full Name and Mobile Number are required.');
      return;
    }

    setEditSubmitLoading(true);
    try {
      const data = new FormData();
      Object.keys(editFormData).forEach(key => {
        data.append(key, editFormData[key]);
      });

      for (const key of Object.keys(editFiles)) {
        if (editFiles[key]) {
          const compressed = await compressImageFile(editFiles[key]);
          data.append(key, compressed);
        }
      }

      await api.put(`/admin/customers/${editCustomer._id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert(t.customerUpdatedSuccessfully || 'Customer record successfully updated!');
      setShowEditModal(false);
      fetchCustomers(page);
    } catch (err) {
      console.error('Edit error:', err);
      alert(err.response?.data?.message || 'Failed to update customer record.');
    } finally {
      setEditSubmitLoading(false);
    }
  };

  // Bank CSV Reconciler Handlers
  const handleReconcileSubmit = async (e) => {
    e.preventDefault();
    if (!reconcileFile) {
      alert('Please select a bank statement CSV file.');
      return;
    }

    setReconcileLoading(true);
    try {
      const data = new FormData();
      data.append('csvFile', reconcileFile);
      data.append('autoApply', autoApplyReconcile);

      const res = await api.post('/admin/reconcile-bank-csv', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setReconcileResult(res.data);
      if (autoApplyReconcile && res.data.matchedCount > 0) {
        fetchCustomers(page);
      }
    } catch (err) {
      console.error('Reconcile error:', err);
      alert(err.response?.data?.message || 'Failed to process bank statement.');
    } finally {
      setReconcileLoading(false);
    }
  };

  const handleApplyReconciledPayments = async () => {
    if (!reconcileFile) return;
    setReconcileLoading(true);
    try {
      const data = new FormData();
      data.append('csvFile', reconcileFile);
      data.append('autoApply', 'true');

      const res = await api.post('/admin/reconcile-bank-csv', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setReconcileResult(res.data);
      alert(`Successfully reconciled and approved ${res.data.matchedCount} matching payments!`);
      fetchCustomers(page);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to apply reconciled payments.');
    } finally {
      setReconcileLoading(false);
    }
  };

  const handleDeleteCustomer = async (id, name) => {
    if (!confirm(`Are you sure you want to permanently delete customer: ${name}?\nAll history and credentials will be removed.`)) {
      return;
    }

    try {
      await api.delete(`/admin/customers/${id}`);
      alert('Customer record deleted.');
      fetchCustomers(page);
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

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleExportToCsv}
            disabled={customers.length === 0}
            className="flex-1 sm:flex-initial justify-center px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm font-bold transition-all border border-slate-200/50 dark:border-slate-700/50 whitespace-nowrap"
            title="Download full customer spreadsheet (.CSV / Excel)"
          >
            <DownloadCloud className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>{t.exportToExcel}</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              setShowReconcileModal(true);
              setReconcileResult(null);
              setReconcileFile(null);
            }}
            className="flex-1 sm:flex-initial justify-center px-3 py-2 sm:px-4 sm:py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-xl flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm font-bold transition-all border border-indigo-200/50 dark:border-indigo-700/50 shadow-sm whitespace-nowrap"
            title="Upload bank statement CSV to match UPI/NEFT repayments with pending EMIs"
          >
            <UploadCloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>{t.bankCsvReconciler || 'Bank CSV Match'}</span>
          </button>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto justify-center px-3 py-2 sm:px-4 sm:py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm font-bold transition-all shadow shadow-teal-500/10 whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span>{t.addCustomer}</span>
          </button>
        </div>
      </div>

      {/* FILTER SEARCH CRITERIA */}
      <div className="glass-premium rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        
        {/* Search */}
        <div className="flex-1 relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t.searchCustomerPlaceholder || "Search by name, ID, phone number, village..."}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl py-2 pl-9 pr-9 text-xs text-slate-800 dark:text-white outline-none transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              title={lang === 'ta' ? 'தேடலை நீக்கு' : 'Clear search'}
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
          {/* Loan Status */}
          <select
            value={loanStatus}
            onChange={(e) => {
              setLoanStatus(e.target.value);
              setPage(1);
            }}
            className={`w-full sm:w-auto truncate bg-slate-50 dark:bg-slate-900 border text-xs text-slate-700 dark:text-slate-300 py-2 px-3 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-colors ${
              loanStatus ? 'border-teal-500/70 font-semibold' : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <option value="">{t.allLoanStatus || 'All Loan Status'}</option>
            <option value="Active">{t.statusActive}</option>
            <option value="Completed">{t.statusCompleted}</option>
          </select>

          {/* Payment Status */}
          <select
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setPage(1);
            }}
            className={`w-full sm:w-auto truncate bg-slate-50 dark:bg-slate-900 border text-xs text-slate-700 dark:text-slate-300 py-2 px-3 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-colors ${
              paymentStatus ? 'border-teal-500/70 font-semibold' : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <option value="">{t.allRepaymentStatus || 'All Repayments Status'}</option>
            <option value="Paid">{t.statusPaid}</option>
            <option value="Due Soon">{t.statusDueSoon}</option>
            <option value="Overdue">{t.statusOverdue}</option>
            <option value="Pending">{t.statusPending}</option>
          </select>

          {/* Clear All Filters Button */}
          <button
            type="button"
            onClick={handleClearFilters}
            disabled={!hasActiveFilters}
            className={`col-span-2 sm:col-auto w-full sm:w-auto py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all border ${
              hasActiveFilters
                ? 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 shadow-sm cursor-pointer active:scale-95'
                : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-50'
            }`}
            title={t.clearFilters || (lang === 'ta' ? 'அனைத்து வடிப்பான்களையும் நீக்கு' : 'Clear All Filters')}
            aria-label={t.clearFilters || 'Clear All Filters'}
          >
            <FilterX className="w-4 h-4 shrink-0" />
            <span className="inline">{t.clearFilters || (lang === 'ta' ? 'வடிப்பான்களை நீக்கு' : 'Clear Filters')}</span>
          </button>
        </div>
      </div>

      {/* CUSTOMERS DATA CONTAINER */}
      <div className="glass-premium rounded-3xl overflow-hidden shadow-sm">
        
        {/* MOBILE CUSTOMER CARD VIEW (visible on mobile < md) */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : customers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              {t.noCustomersFound}
            </div>
          ) : (
            customers.map((c) => {
              const paymentBadgeClass = c.paymentStatus === 'Paid'
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200/40'
                : c.paymentStatus === 'Overdue'
                ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border-red-200/40 animate-pulse-soft'
                : c.paymentStatus === 'Due Soon'
                ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400 border-orange-200/40'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200/40';

              const paymentStatusText = c.paymentStatus === 'Paid' 
                ? t.statusPaid 
                : c.paymentStatus === 'Overdue' 
                ? t.statusOverdue 
                : c.paymentStatus === 'Due Soon' 
                ? t.statusDueSoon 
                : t.statusPending;

              return (
                <div key={c._id} className="p-4 space-y-3 bg-white/40 dark:bg-slate-900/40 transition-colors">
                  {/* Top: ID, Name, Repayment Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200/50 dark:border-teal-800/50">
                          {c.customerId}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                          c.loanStatus === 'Completed' 
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-250/30'
                            : 'bg-teal-50 text-teal-600 dark:bg-teal-950/20 dark:text-teal-400 border-teal-250/30'
                        }`}>
                          {c.loanStatus === 'Completed' ? t.statusCompleted : t.statusActive}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white mt-1.5">{c.fullName}</h4>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase border shrink-0 ${paymentBadgeClass}`}>
                      {paymentStatusText}
                    </span>
                  </div>

                  {/* 2-Column Info Grid */}
                  <div className="grid grid-cols-2 gap-2.5 bg-slate-50/80 dark:bg-slate-800/40 p-3 rounded-2xl text-xs border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 font-semibold block">{t.loanAmountCol}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                        {formatCurrency(c.loanAmount, false)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 font-semibold block">{t.monthlyEmiCol}</span>
                      <span className="font-bold text-teal-600 dark:text-teal-400 text-sm">
                        {formatCurrency(c.monthlyEmi, false)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 font-semibold block">{t.solarBrandSizeCol}</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium truncate block">
                        {c.solarBrand} ({c.solarCapacity} kW)
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 font-semibold block">{t.mobile}</span>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className="font-mono text-slate-700 dark:text-slate-300 text-xs truncate">{c.mobileNumber}</span>
                        {c.mobileNumber && (
                          <button
                            type="button"
                            onClick={() => openWhatsApp({
                              phone: c.mobileNumber,
                              message: `வணக்கம் ${c.fullName}, MRS SOLAR-ல் இருந்து தொடர்பு கொள்கிறோம்.`
                            })}
                            title={t.whatsappHelp}
                            className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors shrink-0"
                          >
                            <MessageCircle className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Action Bar */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Link
                      to={`/admin/customers/${c._id}`}
                      className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-bold transition-colors border border-teal-200/50 dark:border-teal-800/50"
                      title={t.viewLedgerStatement || "View Ledger Statement"}
                    >
                      <Eye className="w-3.5 h-3.5 shrink-0" />
                      <span>{t.preview || 'View'}</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(c)}
                      className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-colors border border-blue-200/50 dark:border-blue-800/50"
                      title={t.editCustomer || "Edit Customer Record"}
                    >
                      <Edit2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{t.editCustomer || 'Edit'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCustomer(c._id, c.fullName)}
                      className="p-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs transition-colors border border-red-200/50 dark:border-red-800/50 shrink-0"
                      title={t.deleteLedger || "Delete Ledger"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP TABLE VIEW (visible on md and above) */}
        <div className="hidden md:block overflow-x-auto">
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
                          type="button"
                          onClick={() => handleOpenEditModal(c)}
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                          title={t.editCustomer || "Edit Customer Record"}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
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

        {/* SERVER-SIDE PAGINATION CONTROLS */}
        <div className="px-6 py-4 border-t border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span>{t.rowsPerPage || 'Rows per page:'}</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs rounded-lg px-2 py-1 outline-none text-slate-800 dark:text-white"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>
              Total: <strong className="text-slate-800 dark:text-white">{pagination.total || customers.length}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span>
              {(t.pageOf || 'Page {page} of {total}')
                .replace('{page}', String(page))
                .replace('{total}', String(pagination.totalPages || 1))}
            </span>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= (pagination.totalPages || 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
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
                      required
                      value={formData.email} 
                      onChange={handleInputChange} 
                      placeholder="e.g. customer@gmail.com"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block font-semibold text-slate-500 mb-1">{t.permanentAddressLabel}</label>
                    <input type="text" name="address" required value={formData.address} onChange={handleInputChange} placeholder="House / Door No, Street, Area" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.cityLabel}</label>
                    <input type="text" name="city" required value={formData.city} onChange={handleInputChange} placeholder="City / Town" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.districtLabel}</label>
                    <input type="text" name="district" required value={formData.district} onChange={handleInputChange} placeholder="District" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.stateLabel}</label>
                    <input type="text" name="state" required value={formData.state} onChange={handleInputChange} placeholder="State (e.g. Tamil Nadu)" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.pinCodeLabel}</label>
                    <input type="text" name="pinCode" required value={formData.pinCode} onChange={handleInputChange} placeholder="e.g. 600001" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.aadhaarNumberLabel}</label>
                    <input 
                      type="text" 
                      name="aadhaarNumber" 
                      required
                      value={formData.aadhaarNumber} 
                      onChange={handleInputChange} 
                      placeholder="XXXX-XXXX-1234 or 12 digits"
                      maxLength={14}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" 
                    />
                    <p className="text-[10px] text-teal-600 dark:text-teal-400 mt-1">
                      🔒 {t.aadhaarPrivacyNotice}
                    </p>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.panNumberLabel}</label>
                    <input type="text" name="panNumber" required value={formData.panNumber} onChange={handleInputChange} placeholder="e.g. ABCDE1234F" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white uppercase" />
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
                    <input type="text" name="bankName" required value={formData.bankName} onChange={handleInputChange} placeholder="e.g. State Bank of India" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.accountNumberLabel}</label>
                    <input type="text" name="accountNumber" required value={formData.accountNumber} onChange={handleInputChange} placeholder="e.g. 123456789012" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.ifscCodeLabel}</label>
                    <input type="text" name="ifscCode" required value={formData.ifscCode} onChange={handleInputChange} placeholder="e.g. SBIN0001234" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white uppercase" />
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
                    <input type="text" name="installationAddress" required value={formData.installationAddress} onChange={handleInputChange} placeholder="Installation site rooftop address" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
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
                    <input type="date" required name="loanStartDate" value={formData.loanStartDate} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white" />
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
                    <input type="file" required name="aadhaarFile" onChange={handleFileChange} className="w-full text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-300" />
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

      {/* EDIT CUSTOMER MODAL */}
      {showEditModal && editCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl relative max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-3xl">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                  <Edit2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>{t.editCustomer || 'Edit Customer Record'} — {editCustomer.fullName} ({editCustomer.customerId})</span>
                </h3>
                <p className="text-xs text-slate-500">{t.editCustomerSubtitle || 'Modify personal, solar, banking, and contact details.'}</p>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable form body */}
            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* BLOCK 1: PERSONAL INFORMATION */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-2">{t.personalInfoSection}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.fullNameLabel}</label>
                    <input type="text" name="fullName" required value={editFormData.fullName || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.fatherNameLabel}</label>
                    <input type="text" name="fatherName" value={editFormData.fatherName || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.motherNameLabel}</label>
                    <input type="text" name="motherName" value={editFormData.motherName || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.mobileNumberLabel}</label>
                    <input type="tel" name="mobileNumber" required value={editFormData.mobileNumber || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.altMobileLabel}</label>
                    <input type="tel" name="alternateNumber" value={editFormData.alternateNumber || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.emailOptionalLabel}</label>
                    <input type="email" name="email" required value={editFormData.email || ''} onChange={handleEditInputChange} placeholder="e.g. customer@gmail.com" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                </div>
              </div>

              {/* BLOCK 2: ADDRESS */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-2">{t.addressKycSection}</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div className="md:col-span-2">
                    <label className="block font-semibold text-slate-500 mb-1">{t.permanentAddressLabel}</label>
                    <input type="text" name="address" required value={editFormData.address || ''} onChange={handleEditInputChange} placeholder="House / Door No, Street, Area" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.cityLabel}</label>
                    <input type="text" name="city" required value={editFormData.city || ''} onChange={handleEditInputChange} placeholder="City / Town" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.districtLabel}</label>
                    <input type="text" name="district" required value={editFormData.district || ''} onChange={handleEditInputChange} placeholder="District" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.stateLabel}</label>
                    <input type="text" name="state" required value={editFormData.state || ''} onChange={handleEditInputChange} placeholder="State" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.pinCodeLabel}</label>
                    <input type="text" name="pinCode" required value={editFormData.pinCode || ''} onChange={handleEditInputChange} placeholder="e.g. 600001" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.panNumberLabel}</label>
                    <input type="text" name="panNumber" required value={editFormData.panNumber || ''} onChange={handleEditInputChange} placeholder="e.g. ABCDE1234F" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white uppercase" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.nomineeDetailsLabel}</label>
                    <input type="text" name="nomineeDetails" value={editFormData.nomineeDetails || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                </div>
              </div>

              {/* BLOCK 3: BANK DETAILS */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-2">{t.bankingDetailsSection}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.bankNameLabel}</label>
                    <input type="text" name="bankName" required value={editFormData.bankName || ''} onChange={handleEditInputChange} placeholder="e.g. State Bank of India" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.accountNumberLabel}</label>
                    <input type="text" name="accountNumber" required value={editFormData.accountNumber || ''} onChange={handleEditInputChange} placeholder="e.g. 123456789012" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.ifscCodeLabel}</label>
                    <input type="text" name="ifscCode" required value={editFormData.ifscCode || ''} onChange={handleEditInputChange} placeholder="e.g. SBIN0001234" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white uppercase" />
                  </div>
                </div>
              </div>

              {/* BLOCK 4: SOLAR INSTALLATION */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-2">{t.solarTechnicalSection}</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.capacityKwLabel}</label>
                    <input type="number" step="0.5" name="solarCapacity" value={editFormData.solarCapacity || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.solarBrandLabel}</label>
                    <input type="text" name="solarBrand" value={editFormData.solarBrand || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.installationDateLabel}</label>
                    <input type="date" name="installationDate" value={editFormData.installationDate || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.warrantyDetailsLabel}</label>
                    <input type="text" name="warrantyDetails" value={editFormData.warrantyDetails || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block font-semibold text-slate-500 mb-1">{t.installAddressLabel}</label>
                    <input type="text" name="installationAddress" value={editFormData.installationAddress || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block font-semibold text-slate-500 mb-1">{t.remarksLabel}</label>
                    <textarea rows="2" name="remarks" value={editFormData.remarks || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                </div>
              </div>

              {/* BLOCK 5: UPDATE DOCUMENTS (OPTIONAL) */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-2">Update Documents (Leave blank to keep existing files)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[10px]">
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.customerPhotoLabel}</label>
                    <input type="file" name="photoFile" onChange={handleEditFileChange} className="w-full text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-300" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.aadhaarProofLabel}</label>
                    <input type="file" name="aadhaarFile" onChange={handleEditFileChange} className="w-full text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-300" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.ebBillLabel}</label>
                    <input type="file" name="electricityBillFile" onChange={handleEditFileChange} className="w-full text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-300" />
                  </div>
                </div>
              </div>

            </form>

            {/* Footer buttons */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                {t.cancel}
              </button>
              
              <button
                onClick={handleEditSubmit}
                disabled={editSubmitLoading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-2"
              >
                {editSubmitLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                <span>{t.saveChanges || 'Save Changes'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* BANK CSV STATEMENT RECONCILER MODAL */}
      {showReconcileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl relative max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-950/20 rounded-t-3xl">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                  <UploadCloud className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>{t.bankCsvReconciler || 'Bank Statement CSV Reconciler'}</span>
                </h3>
                <p className="text-xs text-slate-500">{t.bankCsvSubtitle || 'Match UPI/NEFT repayments with pending EMIs by UTR number & exact amount.'}</p>
              </div>
              <button 
                onClick={() => setShowReconcileModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Upload Input & Options */}
              <form onSubmit={handleReconcileSubmit} className="space-y-4 bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t.uploadBankCsv || 'Select Bank Statement CSV File'}
                    </label>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => setReconcileFile(e.target.files[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Supports SBI, HDFC, ICICI, Canara, and Indian Bank statement formats with Date, Narration, UTR, and Credit columns.
                    </p>
                  </div>

                  <div className="flex flex-col items-start sm:items-end gap-2">
                    <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoApplyReconcile}
                        onChange={(e) => setAutoApplyReconcile(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span>{t.autoApplyPayments || 'Auto-record matching payments'}</span>
                    </label>

                    <button
                      type="submit"
                      disabled={reconcileLoading || !reconcileFile}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-lg shadow-indigo-600/10"
                    >
                      {reconcileLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                      <span>{t.processStatement || 'Process Statement'}</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Results Display */}
              {reconcileResult && (
                <div className="space-y-5">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                      <p className="text-[11px] text-slate-500 font-semibold uppercase">Total Transactions</p>
                      <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{reconcileResult.totalProcessed}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Matched & Verified</p>
                      <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{reconcileResult.matchedCount}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold uppercase">Unmatched / Review</p>
                      <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">{reconcileResult.unmatchedCount}</p>
                    </div>
                  </div>

                  {/* Matched Transactions Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center space-x-1.5 uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{t.matchedTransactions || 'Matched Customer Payments'} ({reconcileResult.matchedCount})</span>
                      </h4>
                      {!reconcileResult.autoApplied && reconcileResult.matchedCount > 0 && (
                        <button
                          type="button"
                          onClick={handleApplyReconciledPayments}
                          disabled={reconcileLoading}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve All Matched</span>
                        </button>
                      )}
                    </div>

                    {reconcileResult.matched.length === 0 ? (
                      <p className="text-xs text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                        {t.noMatchedTransactions || 'No matching pending payments identified in this statement.'}
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="px-4 py-2.5">Date</th>
                              <th className="px-4 py-2.5">Customer</th>
                              <th className="px-4 py-2.5">EMI #</th>
                              <th className="px-4 py-2.5 text-right">Amount</th>
                              <th className="px-4 py-2.5">UTR / Ref</th>
                              <th className="px-4 py-2.5">Match Reason</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                            {reconcileResult.matched.map((m, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                                <td className="px-4 py-2 font-mono text-[11px]">{m.date || 'N/A'}</td>
                                <td className="px-4 py-2 font-semibold">{m.customerName} <span className="font-mono text-slate-400">({m.customerId})</span></td>
                                <td className="px-4 py-2 font-bold text-teal-600">#{m.emiNumber}</td>
                                <td className="px-4 py-2 text-right font-bold text-emerald-600">{formatCurrency(m.amount, false)}</td>
                                <td className="px-4 py-2 font-mono text-[11px] text-slate-500">{m.utr}</td>
                                <td className="px-4 py-2 text-[10px] text-slate-500">{m.matchReason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Unmatched Transactions Table */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center space-x-1.5 uppercase tracking-wider">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>{t.unmatchedTransactions || 'Unmatched Entries (Review Needed)'} ({reconcileResult.unmatchedCount})</span>
                    </h4>

                    {reconcileResult.unmatched.length === 0 ? (
                      <p className="text-xs text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                        {t.noUnmatchedTransactions || 'All statement credit entries were matched successfully!'}
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 max-h-56">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0">
                            <tr>
                              <th className="px-4 py-2.5">Date</th>
                              <th className="px-4 py-2.5">Narration / Particulars</th>
                              <th className="px-4 py-2.5 text-right">Credit</th>
                              <th className="px-4 py-2.5">UTR</th>
                              <th className="px-4 py-2.5">Reason</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-400 text-[11px]">
                            {reconcileResult.unmatched.map((u, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                                <td className="px-4 py-2 font-mono">{u.date || 'N/A'}</td>
                                <td className="px-4 py-2 truncate max-w-xs">{u.narration}</td>
                                <td className="px-4 py-2 text-right font-bold text-slate-800 dark:text-slate-200">{formatCurrency(u.amount, false)}</td>
                                <td className="px-4 py-2 font-mono">{u.utr}</td>
                                <td className="px-4 py-2 text-[10px] text-slate-400">{u.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setShowReconcileModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                {t.close || 'Close'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
