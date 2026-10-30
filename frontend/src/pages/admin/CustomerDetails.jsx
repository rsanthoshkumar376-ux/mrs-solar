import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { 
  User, Compass, Zap, Landmark, Award, ShieldCheck, 
  ArrowLeft, Edit, FileText, CheckCircle, Clock, AlertTriangle, 
  Calendar, QrCode, Printer, CheckSquare, PlusCircle, CreditCard, X, Trash2, Mail, Lock,
  MessageCircle, Send, Globe, Eye, Download, FolderArchive, ExternalLink, HardHat
} from 'lucide-react';
import { generateEmiReminderMessage, generatePaymentReceiptMessage, generateWelcomeKitMessage, openWhatsApp } from '../../utils/whatsapp.js';
import { translations, getLanguage } from '../../utils/translations.js';
import { compressImageFile } from '../../utils/imageCompressor.js';
import { launchTnebQuickPay } from '../../utils/tneb.js';

// Lazy load heavy Leaflet map and PDF statement modal for performance
const SolarSiteMap = React.lazy(() => import('../../components/SolarSiteMap.jsx'));
const LoanStatementModal = React.lazy(() => import('../../components/LoanStatementModal.jsx'));
const TaxInvoiceModal = React.lazy(() => import('../../components/TaxInvoiceModal.jsx'));
const SanctionLetterModal = React.lazy(() => import('../../components/SanctionLetterModal.jsx'));
import UpiPaymentModal from '../../components/UpiPaymentModal.jsx';
import SolarTrackerCard from '../../components/SolarTrackerCard.jsx';
import SubsidyAdminCard from '../../components/SubsidyAdminCard.jsx';
import InstallationChecklistModal from '../../components/InstallationChecklistModal.jsx';

const DOC_CONFIGS = [
  { key: 'aadhaarFile', label: 'Aadhaar Identity Proof', desc: 'Government photo identity card' },
  { key: 'panFile', label: 'PAN Card', desc: 'Permanent account number card' },
  { key: 'photoFile', label: 'Passport Photograph', desc: 'Customer portrait verification photo' },
  { key: 'electricityBillFile', label: 'TNEB Electricity Bill', desc: 'Consumer utility billing document' },
  { key: 'propertyProofFile', label: 'Property / Roof Proof', desc: 'Roof ownership & tax document' },
  { key: 'agreementFile', label: 'Solar Contract & Warranty', desc: 'Signed installation & warranty agreement' },
];

const getDocUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${window.location.origin}${path}`;
};

export default function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  
  // Payment marking modal state
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [selectedEmi, setSelectedEmi] = useState(null);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [payUtr, setPayUtr] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Edit customer record modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editFiles, setEditFiles] = useState({});
  const [editSubmitLoading, setEditSubmitLoading] = useState(false);

  // Receipt printable view state
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [emailSending, setEmailSending] = useState(false);
  const [payEmail, setPayEmail] = useState('');
  const [selectedUpiEmi, setSelectedUpiEmi] = useState(null);
  const [whatsappModal, setWhatsappModal] = useState(null); // { type: 'reminder'|'receipt', emi, customer, language: 'ta' }
  const [previewDoc, setPreviewDoc] = useState(null); // { title, url, isPdf }
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showSanctionModal, setShowSanctionModal] = useState(false);
  const [lang, setLang] = useState(getLanguage);

  useEffect(() => {
    const handleLangChange = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLangChange);
    return () => window.removeEventListener('language-change', handleLangChange);
  }, []);

  const t = translations[lang] || translations.en;
  const [solarStats, setSolarStats] = useState(null);

  const fetchCustomerDetails = async () => {
    try {
      const response = await api.get(`/admin/customers/${id}`);
      setCustomer(response.data);

      try {
        const statsRes = await api.get(`/admin/customers/${id}/solar-stats`);
        setSolarStats(statsRes.data);
      } catch {}
    } catch (error) {
      console.error('Error loading customer details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogReading = async (logData) => {
    try {
      const res = await api.post(`/admin/customers/${id}/solar-log`, logData);
      setSolarStats(res.data.stats);
      alert(lang === 'ta' ? 'சோலார் அளவீடு வெற்றிகரமாக சேமிக்கப்பட்டது!' : 'Solar meter reading recorded successfully.');
      fetchCustomerDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save solar reading.');
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const handleUpdateCustomerEmail = async () => {
    const currentEmail = customer?.email || '';
    const newEmail = prompt(`Enter Email Address for ${customer?.fullName} (compulsory for bills and due-date alerts):`, currentEmail);
    if (!newEmail || newEmail.trim() === currentEmail) return;

    if (!newEmail.includes('@') || !newEmail.includes('.')) {
      alert('Please enter a valid email address.');
      return;
    }

    try {
      const res = await api.put(`/admin/customers/${customer._id}/email`, { email: newEmail.trim().toLowerCase() });
      alert(res.data?.message || 'Email updated successfully!');
      fetchCustomerDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update email.');
    }
  };

  // Edit Customer Handlers
  const openEditModal = () => {
    if (!customer) return;
    setEditFormData({
      fullName: customer.fullName || '',
      fatherName: customer.fatherName || '',
      motherName: customer.motherName || '',
      mobileNumber: customer.mobileNumber || '',
      alternateNumber: customer.alternateNumber || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      district: customer.district || '',
      state: customer.state || '',
      pinCode: customer.pinCode || customer.pincode || '',
      aadhaarNumber: customer.aadhaarNumber || '',
      panNumber: customer.panNumber || '',
      occupation: customer.occupation || '',
      monthlyIncome: customer.monthlyIncome ? String(customer.monthlyIncome) : '',
      bankName: customer.bankDetails?.bankName || '',
      accountNumber: customer.bankDetails?.accountNumber || '',
      ifscCode: customer.bankDetails?.ifscCode || '',
      nomineeDetails: customer.nomineeDetails || '',
      installationAddress: customer.installationAddress || '',
      tnebConsumerNumber: customer.tnebConsumerNumber || '',
      solarCapacity: customer.solarCapacity ? String(customer.solarCapacity) : '',
      solarBrand: customer.solarBrand || '',
      solarCost: customer.solarCost ? String(customer.solarCost) : '',
      installationDate: customer.installationDate || '',
      warrantyDetails: customer.warrantyDetails || '',
      remarks: customer.remarks || '',
      latitude: customer.latitude ? String(customer.latitude) : '',
      longitude: customer.longitude ? String(customer.longitude) : ''
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
    if (!customer) return;
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

      await api.put(`/admin/customers/${customer._id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert(t.customerUpdatedSuccessfully || 'Customer record successfully updated!');
      setShowEditModal(false);
      fetchCustomerDetails();
    } catch (err) {
      console.error('Edit error:', err);
      alert(err.response?.data?.message || 'Failed to update customer record.');
    } finally {
      setEditSubmitLoading(false);
    }
  };

  const handleMarkPaidSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmi) return;

    const cleanEmail = payEmail ? payEmail.trim().toLowerCase() : '';
    if (cleanEmail && (!cleanEmail.includes('@') || !cleanEmail.includes('.'))) {
      alert('Please enter a valid customer email address format (e.g. customer@gmail.com) or leave it blank.');
      return;
    }

    setSubmitLoading(true);
    try {
      const response = await api.post('/admin/payments/mark-paid', {
        customerId: customer.customerId,
        emiNumber: selectedEmi.emiNumber,
        paymentDate: payDate,
        remarks: remarks,
        email: cleanEmail,
        utrNumber: payUtr.trim()
      });
      
      alert(response.data?.message || `EMI #${selectedEmi.emiNumber} marked as Paid!`);
      const recordedEmi = { ...selectedEmi, paidDate: payDate, paidAmount: selectedEmi.emiAmount, utrNumber: payUtr.trim() };
      setShowMarkModal(false);
      setRemarks('');
      setPayUtr('');
      fetchCustomerDetails();
      // Auto-open WhatsApp payment receipt dispatch modal
      setWhatsappModal({ type: 'receipt', customer, emi: recordedEmi, utrNumber: recordedEmi.utrNumber, language: lang });
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Failed to update payment.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const openMarkModal = (emi) => {
    setSelectedEmi(emi);
    setPayEmail(customer?.email || '');
    setPayUtr(emi.utrNumber || customer?.submittedUtr || '');
    setShowMarkModal(true);
  };

  const handleDeletePayment = async (emi) => {
    const lastPaidEmi = [...(customer?.emiSchedule || [])].reverse().find(e => e.status === 'Paid');
    if (lastPaidEmi && emi.emiNumber !== lastPaidEmi.emiNumber) {
      alert(`Sequential Protection: You can only delete payments in reverse order (from the latest paid installment onwards).\nPlease delete EMI #${lastPaidEmi.emiNumber} before deleting EMI #${emi.emiNumber}.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to DELETE payment for EMI #${emi.emiNumber}?\nThis will reset it back to Pending status.`)) return;
    try {
      await api.delete('/admin/payments/delete-payment', {
        data: { customerId: customer.customerId, emiNumber: emi.emiNumber }
      });
      alert(`EMI #${emi.emiNumber} payment deleted. Status reset to Pending.`);
      fetchCustomerDetails();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Failed to delete payment.');
    }
  };

  const openReceipt = (emi) => {
    // Generate a mock/local receipt object matching the payment schema
    const receipt = {
      receiptId: `REC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
      customerId: customer.customerId,
      customerName: customer.fullName,
      emiNumber: emi.emiNumber,
      paymentDate: emi.paidDate || new Date().toISOString().split('T')[0],
      paidAmount: emi.paidAmount || (emi.emiAmount + emi.lateFee),
      baseEmiAmount: emi.emiAmount,
      interestPaid: emi.interestPaid,
      principalPaid: emi.principalPaid,
      lateFeePaid: emi.lateFee,
      daysLate: emi.lateFee > 0 ? Math.round(emi.lateFee / (emi.emiAmount * 0.01)) : 0,
      status: 'Paid',
      _id: emi.paidDate || 'LOCAL'
    };
    setActiveReceipt(receipt);
  };

  const handleSendEmailReceipt = async (emiNumber) => {
    let targetEmail = customer?.email;
    if (!targetEmail) {
      targetEmail = prompt(`No email found for ${customer?.fullName}. Enter email to send receipt:`);
      if (!targetEmail) return;
    }

    setEmailSending(true);
    try {
      const response = await api.post('/admin/payments/send-receipt-email', {
        customerId: customer.customerId,
        emiNumber: emiNumber,
        email: targetEmail
      });
      alert(response.data.message || `Receipt email successfully sent directly to ${targetEmail}!`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to send receipt email.');
    } finally {
      setEmailSending(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6 text-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl">
        <p className="text-slate-500">Failed to load customer details.</p>
        <Link to="/admin/customers" className="mt-4 inline-flex items-center text-teal-600 space-x-1">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to list</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <button
          onClick={() => navigate('/admin/customers')}
          className="flex items-center space-x-2 text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t.backToCustomers || 'Back to Customers'}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openEditModal}
            className="flex-1 sm:flex-initial justify-center inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200/60 dark:border-blue-800/60 transition-colors shadow-sm whitespace-nowrap"
            title="Edit Customer Profile, Banking & Technical info"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>{t.editCustomer || 'Edit Customer'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowStatementModal(true)}
            className="flex-1 sm:flex-initial justify-center inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-200/60 dark:border-teal-800/60 transition-colors shadow-sm whitespace-nowrap"
            title="Generate and print official loan amortization statement with stamp"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t.officialStatementPdf || 'Official Statement (PDF)'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowInvoiceModal(true)}
            className="flex-1 sm:flex-initial justify-center inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200/60 dark:border-amber-800/60 transition-colors shadow-sm whitespace-nowrap"
            title="Generate and print official GST Tax Invoice with HSN code & breakdown"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t.taxInvoiceBtn || 'GST Tax Invoice'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSanctionModal(true)}
            className="flex-1 sm:flex-initial justify-center inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200/60 dark:border-indigo-800/60 transition-colors shadow-sm whitespace-nowrap"
            title="Generate and print official 1-page Solar Loan Sanction & 25-Year Warranty Letter"
          >
            <Award className="w-3.5 h-3.5" />
            <span>{t.sanctionLetterBtn || 'Sanction Letter'}</span>
          </button>
          <button
            type="button"
            onClick={() => setWhatsappModal({ type: 'welcome', customer, emi: null, language: lang })}
            className="flex-1 sm:flex-initial justify-center inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200/60 dark:border-emerald-800/60 transition-colors shadow-sm whitespace-nowrap"
            title="Send formal Welcome Kit and login credentials directly to customer on WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{t.welcomeKitWhatsapp || 'Welcome Kit (WhatsApp)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowChecklistModal(true)}
            className="flex-1 sm:flex-initial justify-center inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-200/60 dark:border-teal-800/60 transition-colors shadow-sm whitespace-nowrap"
            title="Inspect EPC Roof Installation & Quality Commissioning Checklist"
          >
            <HardHat className="w-3.5 h-3.5" />
            <span>Roof Checklist & Sign-off</span>
          </button>
          <span className={`w-full sm:w-auto text-center px-3 py-1 text-xs font-bold rounded-full uppercase border ${
            customer.paymentStatus === 'Paid'
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200/50 dark:bg-emerald-950/20'
              : customer.paymentStatus === 'Overdue'
              ? 'bg-red-50 text-red-600 border-red-200/50 dark:bg-red-950/20 animate-pulse'
              : 'bg-orange-50 text-orange-600 border-orange-200/50 dark:bg-orange-950/20'
          }`}>
            {t.repaymentStatusCol || 'Repayments'}: {customer.paymentStatus === 'Paid' ? t.statusPaid : customer.paymentStatus === 'Overdue' ? t.statusOverdue : customer.paymentStatus === 'Due Soon' ? t.statusDueSoon : t.statusPending}
          </span>
        </div>
      </div>

      {/* METADATA GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 no-print">
        
        {/* PANEL 1: PERSONAL LEDGER */}
        <div className="glass-premium rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-205/30 dark:border-slate-800/40">
            <User className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-800 dark:text-white">Personal Information</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Full Name</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Father's Name</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.fatherName || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Mother's Name</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.motherName || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Mobile</span>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.mobileNumber}</span>
                {customer.mobileNumber && (
                  <button
                    type="button"
                    onClick={() => openWhatsApp({ phone: customer.mobileNumber, message: `வணக்கம் ${customer.fullName}, MRS SOLAR-ல் இருந்து தொடர்பு கொள்கிறோம்.` })}
                    title="Chat on WhatsApp"
                    className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Email Address</span>
              <div className="flex items-center space-x-2">
                <span className={`font-semibold ${customer.email ? 'text-slate-800 dark:text-slate-200' : 'text-amber-500 italic'}`}>
                  {customer.email || 'Not Set (No Bill Sent)'}
                </span>
                <button
                  onClick={handleUpdateCustomerEmail}
                  className="text-[10px] text-teal-600 dark:text-teal-400 underline font-semibold hover:text-teal-800 dark:hover:text-teal-300"
                >
                  {customer.email ? 'Change' : '+ Add Email'}
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center space-x-1.5">
                <span>Aadhaar Number</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-md border border-teal-200/40 font-mono">UIDAI Masked</span>
              </span>
              <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">{customer.aadhaarNumber || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">PAN Card</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.panNumber || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Occupation</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.occupation || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Monthly Income</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(customer.monthlyIncome, false)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Address</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-right truncate max-w-[180px]">{customer.address}</span>
            </div>
          </div>
        </div>

        {/* PANEL 2: SOLAR DEVICE */}
        <div className="glass-premium rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-205/30 dark:border-slate-800/40">
            <Zap className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-800 dark:text-white">Solar Project Details</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1.5 px-2.5 bg-amber-500/10 dark:bg-amber-950/30 rounded-xl border border-amber-500/20">
              <span className="text-amber-800 dark:text-amber-300 font-bold">TNEB Consumer No.</span>
              <div className="flex items-center space-x-1.5">
                <span className="font-mono font-bold text-amber-900 dark:text-amber-200">{customer.tnebConsumerNumber || '—'}</span>
                {customer.tnebConsumerNumber && (
                  <button
                    type="button"
                    onClick={() => launchTnebQuickPay(customer.tnebConsumerNumber, { lang })}
                    className="p-1 text-amber-700 hover:text-amber-900 dark:text-amber-300 hover:scale-110 transition-transform"
                    title="Copy & Open TNEB Quick Pay"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Solar Capacity</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.solarCapacity} kW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Solar Brand</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.solarBrand || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">System Cost</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(customer.solarCost, false)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Down Payment</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(customer.downPayment, false)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Net Loan Principal</span>
              <span className="font-bold text-teal-600 dark:text-teal-400">{formatCurrency(customer.loanAmount, false)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Warranty Details</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.warrantyDetails || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Installation Date</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(customer.installationDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Installation Address</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-right truncate max-w-[180px]" title={customer.installationAddress}>
                {customer.installationAddress || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* PANEL 3: FINANCE Ledger & DOCS */}
        <div className="glass-premium rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-205/30 dark:border-slate-800/40">
            <Landmark className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-800 dark:text-white">Financing Ledger</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">EMI Monthly Charge</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(customer.monthlyEmi)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Interest rate</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.interestRate}% / mo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">EMI Duration</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.emiDuration} months {Number(customer.emiDuration) >= 12 ? `(${(Number(customer.emiDuration) / 12).toFixed(1).replace('.0', '')} yrs)` : ''}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Accumulated Penalties</span>
              <span className="font-semibold text-red-500">{formatCurrency(customer.latePaymentCharges)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Net Outstanding</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{formatCurrency(customer.totalOutstandingAmount)}</span>
            </div>
            
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Verified Documents Vault</p>
              <div className="grid grid-cols-2 gap-2">
                {DOC_CONFIGS.map((doc) => {
                  const path = customer.documents?.[doc.key];
                  if (!path) return null;
                  const fullUrl = getDocUrl(path);
                  return (
                    <button
                      key={doc.key}
                      type="button"
                      onClick={() => setPreviewDoc({ title: doc.label, url: fullUrl, isPdf: fullUrl.toLowerCase().endsWith('.pdf') })}
                      className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/20 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-lg border border-slate-200/50 dark:border-slate-700/50 truncate text-[10px] text-left"
                    >
                      <FileText className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{doc.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* SOLAR USAGE, DAILY RUNTIME, CONSUMPTION & TNEB INTEGRATION */}
      <div className="no-print">
        <SolarTrackerCard 
          solarStats={solarStats}
          customer={customer}
          t={t}
          lang={lang}
          onLogReading={handleAdminLogReading}
          isAdmin={true}
        />
      </div>

      {/* PM SURYA GHAR SUBSIDY ADMINISTRATION */}
      <div id="subsidy" className="no-print scroll-mt-24">
        <SubsidyAdminCard 
          customer={customer}
          onUpdate={fetchCustomerDetails}
          lang={lang}
        />
      </div>

      {/* 1. SOLAR ROOFTOP SITE MAP & GPS NAVIGATION */}
      <div className="no-print">
        <React.Suspense fallback={<div className="h-64 flex items-center justify-center bg-slate-100 dark:bg-slate-900 rounded-3xl animate-pulse text-xs text-slate-400">Loading Solar Site Map...</div>}>
          <SolarSiteMap customer={customer} />
        </React.Suspense>
      </div>

      {/* 2. CUSTOMER DOCUMENT & WARRANTY VAULT */}
      <div className="glass-premium rounded-3xl p-6 shadow-sm space-y-4 no-print border border-slate-200/60 dark:border-slate-800/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <FolderArchive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">Customer Document & Warranty Vault</h3>
              <p className="text-[11px] text-slate-500">Secure digital repository of KYC verification, electricity bills, and solar warranty agreements</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-200/50">
              <ShieldCheck className="w-3 h-3" />
              <span>Private Cloud Vault & Expiring Links Active</span>
            </span>
            <div className="text-xs text-slate-500 font-medium">
              {Object.values(customer.documents || {}).filter(Boolean).length} / {DOC_CONFIGS.length} Uploaded
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {DOC_CONFIGS.map((doc) => {
            const relativePath = customer.documents?.[doc.key];
            const fileUrl = relativePath ? getDocUrl(relativePath) : null;
            const isPdf = fileUrl ? (fileUrl.split('?')[0].toLowerCase().endsWith('.pdf') || (doc.key && doc.key.toLowerCase().includes('pdf'))) : false;

            return (
              <div
                key={doc.key}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  fileUrl
                    ? 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-teal-500/50'
                    : 'bg-slate-50/30 dark:bg-slate-900/20 border-dashed border-slate-200 dark:border-slate-800/80 opacity-70'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    {fileUrl ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50">
                        <CheckCircle className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                        Not Uploaded
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-3">{doc.label}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{doc.desc}</p>
                </div>

                {fileUrl ? (
                  <div className="flex items-center gap-2 pt-4 mt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({ title: doc.label, url: fileUrl, isPdf })}
                      className="flex-1 inline-flex items-center justify-center space-x-1 py-1.5 px-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-600 dark:text-teal-400 text-xs font-semibold transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                    <a
                      href={fileUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                      title="Download Document"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/40">
                    No document attached
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AMORTISATION TIMELINE SCHEDULE */}
      <div className="glass-premium rounded-3xl overflow-hidden shadow-sm no-print">
        <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900/30 flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <span className="font-bold text-slate-800 dark:text-white">Installment Repayment Amortisation Schedule</span>
        </div>

        {/* MOBILE EMI SCHEDULE CARDS (mobile-only: screens below md) */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {(() => {
            const nextUnpaidEmi = customer.emiSchedule.find(e => e.status !== 'Paid');
            const lastPaidEmi = [...customer.emiSchedule].reverse().find(e => e.status === 'Paid');
            return customer.emiSchedule.map((emi) => {
              const isRequesting = emi.status !== 'Paid' && customer.requestingEmi === emi.emiNumber;
              const isNextInOrder = nextUnpaidEmi && nextUnpaidEmi.emiNumber === emi.emiNumber;
              const isLastPaid = lastPaidEmi && lastPaidEmi.emiNumber === emi.emiNumber;

              let statusColor = 'bg-slate-50 text-slate-500 border-slate-200';
              if (emi.status === 'Paid') statusColor = 'bg-emerald-50 text-emerald-600 border-emerald-200/50 dark:bg-emerald-950/20';
              else if (isRequesting) statusColor = 'bg-amber-50 text-amber-600 border-amber-300/50 dark:bg-amber-950/20 animate-pulse';
              else if (emi.status === 'Overdue') statusColor = 'bg-red-50 text-red-600 border-red-200/50 dark:bg-red-950/20 animate-pulse';
              else if (emi.status === 'Due Soon') statusColor = 'bg-orange-50 text-orange-600 border-orange-200/50 dark:bg-orange-950/20';

              return (
                <div key={emi.emiNumber} className={`p-4 space-y-3 bg-white/40 dark:bg-slate-900/40 transition-colors ${isRequesting ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200/50 dark:border-teal-800/50">
                        EMI #{emi.emiNumber}
                      </span>
                      <span className="text-xs text-slate-500 ml-2 font-medium">
                        Due: {formatDate(emi.dueDate)}
                      </span>
                    </div>
                    <span className={`inline-flex items-center justify-center whitespace-nowrap px-2.5 py-0.5 rounded-full font-bold text-[10px] tracking-wide uppercase border ${statusColor}`}>
                      {isRequesting ? 'Requesting' : emi.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50/80 dark:bg-slate-800/40 p-2.5 rounded-2xl text-xs border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 font-semibold block">Base Installment</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{formatCurrency(emi.emiAmount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 font-semibold block">Remaining Balance</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(emi.remainingBalance)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 font-semibold block">Principal / Interest</span>
                      <span className="text-slate-600 dark:text-slate-400">{formatCurrency(emi.principalPaid)} / {formatCurrency(emi.interestPaid)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 font-semibold block">Late Penalty</span>
                      <span className={`font-semibold ${emi.lateFee > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                        {emi.lateFee > 0 ? formatCurrency(emi.lateFee) : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
                    {emi.status !== 'Paid' ? (
                      isNextInOrder ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedUpiEmi(emi)}
                            className="flex-1 inline-flex items-center justify-center space-x-1 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-300/40 px-3 py-2 rounded-xl transition-all shadow-sm active:scale-95"
                          >
                            <QrCode className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                            <span>Collect UPI</span>
                          </button>
                          <button
                            onClick={() => openMarkModal(emi)}
                            className="flex-1 inline-flex items-center justify-center space-x-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-teal-800 dark:hover:text-teal-300 bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 px-3 py-2 rounded-xl transition-all shadow-sm"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>{isRequesting ? 'Verify & Pay' : 'Mark Paid'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setWhatsappModal({
                              type: 'reminder',
                              emi,
                              customer,
                              language: 'ta'
                            })}
                            title="Send WhatsApp Payment Reminder"
                            className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300/40 px-3 py-2 rounded-xl transition-all"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Remind</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <span 
                            className="flex-1 inline-flex items-center justify-center space-x-1 text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-100/70 dark:bg-slate-850/50 border border-slate-200/40 dark:border-slate-800 px-3 py-2 rounded-xl cursor-not-allowed select-none"
                            title={`Sequential order: Please verify EMI #${nextUnpaidEmi?.emiNumber} first`}
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Pay #{nextUnpaidEmi?.emiNumber} First</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setWhatsappModal({
                              type: 'reminder',
                              emi,
                              customer,
                              language: 'ta'
                            })}
                            title="Send WhatsApp Payment Reminder"
                            className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300/40 px-3 py-2 rounded-xl transition-all"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )
                    ) : (
                      <>
                        <button
                          onClick={() => openReceipt(emi)}
                          className="inline-flex items-center space-x-1 text-xs font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800 px-2.5 py-1.5 rounded-xl transition-all"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setWhatsappModal({
                            type: 'receipt',
                            emi,
                            customer,
                            language: 'ta'
                          })}
                          title="Send Receipt via WhatsApp"
                          className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-600 hover:text-white hover:bg-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/40 px-2.5 py-1.5 rounded-xl transition-all"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleSendEmailReceipt(emi.emiNumber)}
                          title="Send Receipt to Customer Gmail"
                          className="inline-flex items-center space-x-1 text-xs font-bold text-teal-600 hover:text-teal-800 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 border border-teal-200/40 px-2.5 py-1.5 rounded-xl transition-all"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                        {isLastPaid ? (
                          <button
                            onClick={() => handleDeletePayment(emi)}
                            title="Delete latest payment (reset to Pending)"
                            className="inline-flex items-center text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-950/30 border border-red-200/40 p-1.5 rounded-xl transition-all shadow-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span
                            title={`Sequential Protection: Only the latest paid installment (EMI #${lastPaidEmi?.emiNumber}) can be deleted first.`}
                            className="inline-flex items-center text-xs font-bold text-slate-300 dark:text-slate-600 bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/30 dark:border-slate-800/30 p-1.5 rounded-xl cursor-not-allowed select-none"
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {/* DESKTOP TABLE (visible on md and above) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/50 dark:border-slate-800/50">
                <th className="px-6 py-4">EMI No.</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4 text-right">Base Installment</th>
                <th className="px-6 py-4 text-right">Interest Part (2%)</th>
                <th className="px-6 py-4 text-right">Principal Part</th>
                <th className="px-6 py-4 text-right">Late Penalty Fee</th>
                <th className="px-6 py-4 text-right">Remaining Balance</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
              {(() => {
                const nextUnpaidEmi = customer.emiSchedule.find(e => e.status !== 'Paid');
                const lastPaidEmi = [...customer.emiSchedule].reverse().find(e => e.status === 'Paid');
                return customer.emiSchedule.map((emi) => {
                  const isRequesting = emi.status !== 'Paid' && customer.requestingEmi === emi.emiNumber;
                  const isNextInOrder = nextUnpaidEmi && nextUnpaidEmi.emiNumber === emi.emiNumber;
                  const isLastPaid = lastPaidEmi && lastPaidEmi.emiNumber === emi.emiNumber;

                  let statusColor = 'bg-slate-50 text-slate-500 border-slate-200';
                  if (emi.status === 'Paid') statusColor = 'bg-emerald-50 text-emerald-600 border-emerald-200/50 dark:bg-emerald-950/20';
                  else if (isRequesting) statusColor = 'bg-amber-50 text-amber-600 border-amber-300/50 dark:bg-amber-950/20 animate-pulse';
                  else if (emi.status === 'Overdue') statusColor = 'bg-red-50 text-red-600 border-red-200/50 dark:bg-red-950/20 animate-pulse';
                  else if (emi.status === 'Due Soon') statusColor = 'bg-orange-50 text-orange-600 border-orange-200/50 dark:bg-orange-950/20';

                  return (
                    <tr key={emi.emiNumber} className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors ${isRequesting ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}`}>
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">#{emi.emiNumber}</td>
                      <td className="px-6 py-4">{formatDate(emi.dueDate)}</td>
                      <td className="px-6 py-4 text-right font-semibold">{formatCurrency(emi.emiAmount)}</td>
                      <td className="px-6 py-4 text-right text-slate-500">{formatCurrency(emi.interestPaid)}</td>
                      <td className="px-6 py-4 text-right text-slate-500">{formatCurrency(emi.principalPaid)}</td>
                      <td className={`px-6 py-4 text-right font-medium ${emi.lateFee > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                        {emi.lateFee > 0 ? formatCurrency(emi.lateFee) : '—'}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500">{formatCurrency(emi.remainingBalance)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center whitespace-nowrap px-3 py-1 rounded-full font-bold text-[10px] tracking-wide uppercase border ${statusColor}`}>
                          {isRequesting ? 'Requesting' : emi.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {emi.status !== 'Paid' ? (
                          isNextInOrder ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedUpiEmi(emi)}
                                className="inline-flex items-center space-x-1 text-[10px] font-bold text-teal-700 dark:text-teal-300 hover:text-white hover:bg-teal-600 bg-teal-50 dark:bg-teal-950/40 border border-teal-300/40 px-2.5 py-1.5 rounded-xl transition-all shadow-sm"
                                title="Collect payment via UPI / QR Code"
                              >
                                <QrCode className="w-3 h-3 text-teal-600 dark:text-teal-400 group-hover:text-white" />
                                <span>UPI QR</span>
                              </button>
                              <button
                                onClick={() => openMarkModal(emi)}
                                className="inline-flex items-center space-x-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 px-2.5 py-1.5 rounded-xl transition-all shadow-sm"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>{isRequesting ? 'Verify & Pay' : 'Mark Paid'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setWhatsappModal({
                                  type: 'reminder',
                                  emi,
                                  customer,
                                  language: 'ta'
                                })}
                                title="Send WhatsApp Payment Reminder"
                                className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hover:text-white hover:bg-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300/40 px-2 py-1.5 rounded-xl transition-all"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>Remind</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <span 
                                className="inline-flex items-center space-x-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100/70 dark:bg-slate-850/50 border border-slate-200/40 dark:border-slate-800 px-2.5 py-1.5 rounded-xl cursor-not-allowed select-none"
                                title={`Sequential order: Please verify EMI #${nextUnpaidEmi?.emiNumber} first`}
                              >
                                <Lock className="w-3 h-3 text-slate-400" />
                                <span>Pay #{nextUnpaidEmi?.emiNumber} First</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setWhatsappModal({
                                  type: 'reminder',
                                  emi,
                                  customer,
                                  language: 'ta'
                                })}
                                title="Send WhatsApp Payment Reminder"
                                className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hover:text-white hover:bg-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300/40 px-2 py-1.5 rounded-xl transition-all"
                              >
                                <MessageCircle className="w-3 h-3" />
                              </button>
                            </div>
                          )
                        ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openReceipt(emi)}
                            className="inline-flex items-center space-x-1 text-[10px] font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800 px-2.5 py-1.5 rounded-xl transition-all"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Receipt</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setWhatsappModal({
                              type: 'receipt',
                              emi,
                              customer,
                              language: 'ta'
                            })}
                            title="Send Receipt via WhatsApp"
                            className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-600 hover:text-white hover:bg-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/40 px-2 py-1.5 rounded-xl transition-all"
                          >
                            <MessageCircle className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleSendEmailReceipt(emi.emiNumber)}
                            title="Send Receipt to Customer Gmail"
                            className="inline-flex items-center space-x-1 text-[10px] font-bold text-teal-600 hover:text-teal-800 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 border border-teal-200/40 px-2 py-1.5 rounded-xl transition-all"
                          >
                            <Mail className="w-3 h-3" />
                          </button>
                          {isLastPaid ? (
                            <button
                              onClick={() => handleDeletePayment(emi)}
                              title="Delete latest payment (reset to Pending)"
                              className="inline-flex items-center text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-950/30 border border-red-200/40 p-1.5 rounded-xl transition-all shadow-sm"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          ) : (
                            <span
                              title={`Sequential Protection: Only the latest paid installment (EMI #${lastPaidEmi?.emiNumber}) can be deleted first.`}
                              className="inline-flex items-center text-[10px] font-bold text-slate-300 dark:text-slate-600 bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/30 dark:border-slate-800/30 p-1.5 rounded-xl cursor-not-allowed select-none"
                            >
                              <Lock className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                            </span>
                          )}
                        </div>
                      )}
                      </td>
                  </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* MARK PAID MODAL POPUP */}
      {showMarkModal && selectedEmi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-5">
            <button 
              onClick={() => setShowMarkModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Record EMI Repayment</h3>
              <p className="text-xs text-slate-500">Record verification details of customer EMI transfer.</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-200/50 dark:border-slate-800 rounded-2xl text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Installment Period:</span>
                <span className="font-bold text-slate-800 dark:text-white">EMI #{selectedEmi.emiNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Installment Due:</span>
                <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(selectedEmi.emiAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Late Penalty Fee:</span>
                <span className={`font-bold ${selectedEmi.lateFee > 0 ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>
                  {formatCurrency(selectedEmi.lateFee)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-250/20 pt-2 font-bold text-sm">
                <span className="text-slate-800 dark:text-slate-200">Total Net Amount:</span>
                <span className="text-teal-600 dark:text-teal-400">{formatCurrency(selectedEmi.emiAmount + selectedEmi.lateFee)}</span>
              </div>
            </div>

            <form onSubmit={handleMarkPaidSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-500 mb-1">Payment Date</label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-500 mb-1">
                  Customer Email Address <span className="text-slate-400 font-normal text-xs">(Optional — receipt will be emailed if provided)</span>
                </label>
                <input
                  type="email"
                  value={payEmail}
                  onChange={(e) => setPayEmail(e.target.value)}
                  placeholder="e.g. customer@gmail.com (leave blank if none)"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-500 mb-1">
                  12-Digit UPI UTR / Bank Ref Number <span className="text-slate-400 font-normal text-xs">(Optional — for bank statement reconciliation)</span>
                </label>
                <input
                  type="text"
                  value={payUtr}
                  maxLength={25}
                  placeholder="e.g. 428190123456"
                  onChange={(e) => setPayUtr(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 outline-none focus:border-teal-500 font-mono text-slate-800 dark:text-white"
                />
              </div>

              {customer?.submittedUtr && (customer?.requestingEmi === selectedEmi?.emiNumber || !customer?.requestingEmi) && (
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-xl text-xs flex items-center space-x-2 border border-blue-200 dark:border-blue-900/50">
                  <CreditCard className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>Customer submitted UTR: <strong className="font-mono">{customer.submittedUtr}</strong></span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-500 mb-1">Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  placeholder="e.g. UPI Ref 349283492"
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 outline-none focus:border-teal-500 text-slate-800 dark:text-white"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMarkModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-center hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-600/50 text-white font-bold rounded-xl text-center shadow-lg shadow-teal-500/10"
                >
                  {submitLoading ? 'Marking...' : 'Verify Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENDER ACTIVE RECEIPT FOR DOWNLOAD/PRINT */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm receipt-modal-overlay">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl relative space-y-6 receipt-modal-container">
            
            {/* Modal Actions */}
            <div className="absolute top-4 right-4 flex items-center space-x-2 no-print">
              <button 
                type="button"
                onClick={() => {
                  const emi = customer?.emiSchedule?.find(e => e.emiNumber === activeReceipt.emiNumber) || activeReceipt;
                  setWhatsappModal({
                    type: 'receipt',
                    emi,
                    customer,
                    language: 'ta'
                  });
                }}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors flex items-center space-x-1.5 text-xs font-bold shadow shadow-emerald-500/10"
                title="Send Receipt to Customer WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>
              <button 
                onClick={() => handleSendEmailReceipt(activeReceipt.emiNumber)}
                disabled={emailSending}
                className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors flex items-center space-x-1.5 text-xs font-bold shadow shadow-teal-500/10"
                title="Email Receipt to Customer"
              >
                <Mail className="w-4 h-4" />
                <span>{emailSending ? 'Sending...' : 'Email Receipt'}</span>
              </button>
              <button 
                onClick={handlePrint}
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors"
                title="Print Receipt"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setActiveReceipt(null)}
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors"
                title="Close"
              >
                <span className="block text-sm font-bold px-1">Close</span>
              </button>
            </div>

            {/* Printable Receipt layout */}
            <div id="receipt-print-area" className="print-card p-6 border border-slate-100 dark:border-slate-900 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 space-y-6 text-slate-700 dark:text-slate-300">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-6 h-6 bg-teal-600 rounded flex items-center justify-center text-white">
                      <Zap className="w-4 h-4 text-yellow-300" />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-white">MRS SOLAR</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Solar Panel Installation Amortisation</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded border border-teal-200/50 dark:border-teal-900/50">
                    Official Payment Receipt
                  </span>
                  <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{activeReceipt.receiptId}</p>
                </div>
              </div>

              {/* Invoice Meta Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Issued To:</p>
                  <p className="font-bold text-slate-800 dark:text-white mt-1">{activeReceipt.customerName}</p>
                  <p className="text-slate-500">Customer ID: {activeReceipt.customerId}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Receipt Details:</p>
                  <p className="mt-1"><span className="text-slate-500">Payment Date:</span> <span className="font-semibold">{formatDate(activeReceipt.paymentDate)}</span></p>
                  <p><span className="text-slate-500">Repayment Period:</span> <span className="font-semibold">EMI #{activeReceipt.emiNumber}</span></p>
                </div>
              </div>

              {/* Line items list */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                <div className="grid grid-cols-3 bg-slate-100 dark:bg-slate-900 font-bold p-3 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <div>Breakdown Item</div>
                  <div className="text-center">Days Overdue</div>
                  <div className="text-right">Amount</div>
                </div>
                <div className="divide-y divide-slate-150 dark:divide-slate-800">
                  <div className="grid grid-cols-3 p-3">
                    <div>EMI Installment Base Principal + Interest</div>
                    <div className="text-center">—</div>
                    <div className="text-right font-semibold">{formatCurrency(activeReceipt.baseEmiAmount)}</div>
                  </div>
                  <div className="grid grid-cols-3 p-3">
                    <div>Late Payment Charge penalty (1% / day)</div>
                    <div className="text-center">{activeReceipt.daysLate > 0 ? `${activeReceipt.daysLate} days` : '0 days'}</div>
                    <div className="text-right text-red-500 font-semibold">{formatCurrency(activeReceipt.lateFeePaid)}</div>
                  </div>
                  {/* Ledger components details */}
                  <div className="grid grid-cols-3 p-3 bg-slate-100/30 dark:bg-slate-900/10 text-[10px] text-slate-400 italic">
                    <div>Components: Principal: {formatCurrency(activeReceipt.principalPaid)} | Interest (2%): {formatCurrency(activeReceipt.interestPaid)}</div>
                    <div></div>
                    <div></div>
                  </div>
                </div>
              </div>

              {/* Total Due */}
              <div className="flex justify-between items-center p-4 bg-teal-600 text-white rounded-xl shadow-lg shadow-teal-600/10">
                <div>
                  <p className="font-bold text-xs uppercase opacity-85">Total Settled Amount</p>
                  <p className="text-[10px] opacity-75">Paid successfully via UPI transfer</p>
                </div>
                <p className="text-2xl font-black">{formatCurrency(activeReceipt.paidAmount)}</p>
              </div>

              {/* QR Code and signatures stamp */}
              <div className="flex justify-between items-center text-[10px] border-t border-slate-200 dark:border-slate-800 pt-4">
                <div className="flex items-center space-x-2">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=RECEIPT:${activeReceipt.receiptId},CUST:${activeReceipt.customerId},AMT:${activeReceipt.paidAmount}`}
                    alt="Receipt Verification QR"
                    className="w-12 h-12 bg-white p-0.5 rounded border border-slate-200"
                  />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">Transaction Verified</p>
                    <p className="text-slate-400 font-mono">HASH: {activeReceipt._id.substring(4, 15)}</p>
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <div className="w-24 border-b border-slate-400 mx-auto h-6 flex items-end justify-center font-serif italic text-teal-600 text-[11px]">Mrs Solar Ltd</div>
                  <p className="text-[8px] text-slate-400 uppercase tracking-widest font-semibold">Authorised Signatory</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP MODAL (REMINDER OR RECEIPT) */}
      {whatsappModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in no-print">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                    {whatsappModal.type === 'welcome' 
                      ? 'Send WhatsApp Welcome Kit & Credentials' 
                      : whatsappModal.type === 'receipt' 
                      ? 'Send WhatsApp Payment Receipt' 
                      : 'Send WhatsApp EMI Reminder'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    To: {whatsappModal.customer?.fullName} ({whatsappModal.customer?.mobileNumber || 'No Mobile'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWhatsappModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Language Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Message Language
                </label>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setWhatsappModal(prev => ({ ...prev, language: 'ta' }))}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      whatsappModal.language === 'ta'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    தமிழ் (Tamil)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWhatsappModal(prev => ({ ...prev, language: 'en' }))}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      whatsappModal.language === 'en'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* Message Preview */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Message Preview
                </label>
                <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 font-mono text-xs whitespace-pre-wrap text-slate-800 dark:text-slate-200 max-h-56 overflow-y-auto leading-relaxed">
                  {whatsappModal.type === 'welcome'
                    ? generateWelcomeKitMessage({
                        customer: whatsappModal.customer,
                        language: whatsappModal.language
                      })
                    : whatsappModal.type === 'receipt'
                    ? generatePaymentReceiptMessage({
                        customer: whatsappModal.customer,
                        emi: whatsappModal.emi,
                        utrNumber: whatsappModal.utrNumber,
                        language: whatsappModal.language
                      })
                    : generateEmiReminderMessage({
                        customer: whatsappModal.customer,
                        emi: whatsappModal.emi,
                        language: whatsappModal.language
                      })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setWhatsappModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const message = whatsappModal.type === 'welcome'
                      ? generateWelcomeKitMessage({
                          customer: whatsappModal.customer,
                          language: whatsappModal.language
                        })
                      : whatsappModal.type === 'receipt'
                      ? generatePaymentReceiptMessage({
                          customer: whatsappModal.customer,
                          emi: whatsappModal.emi,
                          utrNumber: whatsappModal.utrNumber,
                          language: whatsappModal.language
                        })
                      : generateEmiReminderMessage({
                          customer: whatsappModal.customer,
                          emi: whatsappModal.emi,
                          language: whatsappModal.language
                        });
                    openWhatsApp({
                      phone: whatsappModal.customer?.mobileNumber,
                      message
                    });
                    setWhatsappModal(null);
                  }}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Send via WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">{previewDoc.title}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={previewDoc.url}
                  download
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 text-xs font-semibold hover:bg-teal-100 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-auto flex items-center justify-center bg-slate-100 dark:bg-slate-950 min-h-[400px]">
              {previewDoc.isPdf ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.title}
                  className="w-full h-[70vh] rounded-xl border border-slate-200 dark:border-slate-800"
                ></iframe>
              ) : (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-md"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL LOAN STATEMENT & CERTIFICATE MODAL */}
      <React.Suspense fallback={null}>
        <LoanStatementModal
          customer={customer}
          isOpen={showStatementModal}
          onClose={() => setShowStatementModal(false)}
        />
        <TaxInvoiceModal
          customer={customer}
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
        />
        <SanctionLetterModal
          customer={customer}
          isOpen={showSanctionModal}
          onClose={() => setShowSanctionModal(false)}
        />
      </React.Suspense>

      {/* EDIT CUSTOMER RECORD MODAL */}
      {showEditModal && customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto no-print">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl relative max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-3xl">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                  <Edit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>{t.editCustomer || 'Edit Customer Record'} — {customer.fullName} ({customer.customerId})</span>
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-2">{t.personalInfoSection || 'Personal Information'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.fullNameLabel || 'Full Name'} *</label>
                    <input type="text" name="fullName" required value={editFormData.fullName || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.fatherNameLabel || "Father's Name"}</label>
                    <input type="text" name="fatherName" value={editFormData.fatherName || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.motherNameLabel || "Mother's Name"}</label>
                    <input type="text" name="motherName" value={editFormData.motherName || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.mobileNumberLabel || 'Mobile Number'} *</label>
                    <input type="tel" name="mobileNumber" required value={editFormData.mobileNumber || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.altMobileLabel || 'Alternate Mobile'}</label>
                    <input type="tel" name="alternateNumber" value={editFormData.alternateNumber || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.emailAddressLabel || 'Email Address'}</label>
                    <input type="email" name="email" value={editFormData.email || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                </div>
              </div>

              {/* BLOCK 2: ADDRESS */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-2">{t.addressKycSection || 'Address & KYC'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div className="md:col-span-2">
                    <label className="block font-semibold text-slate-500 mb-1">{t.streetAddressLabel || 'Street Address'}</label>
                    <input type="text" name="address" value={editFormData.address || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.cityVillageLabel || 'City / Village'}</label>
                    <input type="text" name="city" value={editFormData.city || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.districtLabel || 'District'}</label>
                    <input type="text" name="district" value={editFormData.district || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.stateLabel || 'State'}</label>
                    <input type="text" name="state" value={editFormData.state || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.pincodeLabel || 'PIN Code'}</label>
                    <input type="text" name="pinCode" value={editFormData.pinCode || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.panNumberLabel || 'PAN Card Number'}</label>
                    <input type="text" name="panNumber" value={editFormData.panNumber || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.nomineeDetailsLabel || 'Nominee Name & Relation'}</label>
                    <input type="text" name="nomineeDetails" value={editFormData.nomineeDetails || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                </div>
              </div>

              {/* BLOCK 3: BANK DETAILS */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-2">{t.bankingDetailsSection || 'Bank Account Details'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.bankNameLabel || 'Bank Name'}</label>
                    <input type="text" name="bankName" value={editFormData.bankName || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.accountNumberLabel || 'Account Number'}</label>
                    <input type="text" name="accountNumber" value={editFormData.accountNumber || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.ifscCodeLabel || 'IFSC Code'}</label>
                    <input type="text" name="ifscCode" value={editFormData.ifscCode || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                </div>
              </div>

              {/* BLOCK 4: SOLAR INSTALLATION */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-2">{t.solarTechnicalSection || 'Solar Installation & Technical Details'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.capacityKwLabel || 'Capacity (kW)'}</label>
                    <input type="number" step="0.5" name="solarCapacity" value={editFormData.solarCapacity || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.solarBrandLabel || 'Solar Panel Brand'}</label>
                    <input type="text" name="solarBrand" value={editFormData.solarBrand || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.installationDateLabel || 'Installation Date'}</label>
                    <input type="date" name="installationDate" value={editFormData.installationDate || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block font-semibold text-slate-500 mb-1">{t.tnebConsumerNumberLabel || 'TNEB Consumer / Service Number'}</label>
                    <input type="text" name="tnebConsumerNumber" value={editFormData.tnebConsumerNumber || ''} onChange={handleEditInputChange} placeholder={t.tnebPlaceholder || 'e.g. 09-234-005-1234'} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block font-semibold text-slate-500 mb-1">{t.warrantyDetailsLabel || 'Warranty Details'}</label>
                    <input type="text" name="warrantyDetails" value={editFormData.warrantyDetails || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block font-semibold text-slate-500 mb-1">{t.installAddressLabel || 'Installation Address'}</label>
                    <input type="text" name="installationAddress" value={editFormData.installationAddress || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block font-semibold text-slate-500 mb-1">{t.remarksLabel || 'Remarks / Special Notes'}</label>
                    <textarea rows="2" name="remarks" value={editFormData.remarks || ''} onChange={handleEditInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white" />
                  </div>
                </div>
              </div>

              {/* BLOCK 5: UPDATE DOCUMENTS (OPTIONAL) */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-2">{t.updateDocumentsOptional || 'Update Documents (Leave blank to keep existing files)'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[10px]">
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.customerPhotoLabel || 'Passport Photo'}</label>
                    <input type="file" name="photoFile" onChange={handleEditFileChange} className="w-full text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-300" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.aadhaarProofLabel || 'Aadhaar Card'}</label>
                    <input type="file" name="aadhaarFile" onChange={handleEditFileChange} className="w-full text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-300" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">{t.ebBillLabel || 'TNEB Electricity Bill'}</label>
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

      {/* ADMIN UPI PAYMENT & QR COLLECTION MODAL */}
      {selectedUpiEmi && (
        <UpiPaymentModal
          isOpen={!!selectedUpiEmi}
          onClose={() => setSelectedUpiEmi(null)}
          emi={selectedUpiEmi}
          customer={customer}
          mode="admin"
          onPaymentSubmitted={() => fetchCustomerDetails()}
        />
      )}

      {/* EPC ROOF INSTALLATION & COMMISSIONING QUALITY CHECKLIST MODAL */}
      <InstallationChecklistModal
        isOpen={showChecklistModal}
        onClose={() => setShowChecklistModal(false)}
        customer={customer}
        onVerified={() => fetchCustomerDetails()}
      />

    </div>
  );
}
