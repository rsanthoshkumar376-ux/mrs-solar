import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { 
  User, Compass, Zap, Landmark, Award, ShieldCheck, 
  ArrowLeft, Edit, FileText, CheckCircle, Clock, AlertTriangle, 
  Calendar, QrCode, Printer, CheckSquare, PlusCircle, CreditCard, X, Trash2
} from 'lucide-react';

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
  const [submitLoading, setSubmitLoading] = useState(false);

  // Receipt printable view state
  const [activeReceipt, setActiveReceipt] = useState(null);

  const fetchCustomerDetails = async () => {
    try {
      const response = await api.get(`/admin/customers/${id}`);
      setCustomer(response.data);

      // Payment data is embedded in customer.emiSchedule — no separate fetch needed
    } catch (error) {
      console.error('Error loading customer details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const handleMarkPaidSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmi) return;

    setSubmitLoading(true);
    try {
      const response = await api.post('/admin/payments/mark-paid', {
        customerId: customer.customerId,
        emiNumber: selectedEmi.emiNumber,
        paymentDate: payDate,
        remarks: remarks
      });
      
      alert(`EMI #${selectedEmi.emiNumber} marked as Paid!`);
      setShowMarkModal(false);
      setRemarks('');
      fetchCustomerDetails();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Failed to update payment.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const openMarkModal = (emi) => {
    setSelectedEmi(emi);
    setShowMarkModal(true);
  };

  const handleDeletePayment = async (emi) => {
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
      <div className="flex items-center justify-between no-print">
        <button
          onClick={() => navigate('/admin/customers')}
          className="flex items-center space-x-2 text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Customers</span>
        </button>

        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase border ${
            customer.paymentStatus === 'Paid'
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200/50 dark:bg-emerald-950/20'
              : customer.paymentStatus === 'Overdue'
              ? 'bg-red-50 text-red-600 border-red-200/50 dark:bg-red-950/20 animate-pulse'
              : 'bg-orange-50 text-orange-600 border-orange-200/50 dark:bg-orange-950/20'
          }`}>
            Repayments: {customer.paymentStatus}
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
            <div className="flex justify-between">
              <span className="text-slate-500">Mobile</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.mobileNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Aadhaar Number</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.aadhaarNumber || '—'}</span>
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
              <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.emiDuration} months</span>
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
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Verification Files</p>
              <div className="grid grid-cols-2 gap-2">
                {customer.documents && Object.keys(customer.documents).map((docName) => {
                  const url = customer.documents[docName];
                  if (!url) return null;
                  return (
                    <a
                      key={docName}
                      href={`http://localhost:5000${url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/20 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-lg border border-slate-200/50 dark:border-slate-700/50 truncate text-[10px]"
                    >
                      <FileText className="w-3 h-3 flex-shrink-0" />
                      <span className="capitalize truncate">{docName.replace('File', '')}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* AMORTISATION TIMELINE SCHEDULE */}
      <div className="glass-premium rounded-3xl overflow-hidden shadow-sm no-print">
        <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900/30 flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <span className="font-bold text-slate-800 dark:text-white">Installment Repayment Amortisation Schedule</span>
        </div>

        <div className="overflow-x-auto">
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
              {customer.emiSchedule.map((emi) => {
                const isRequesting = emi.status !== 'Paid' && customer.requestingEmi === emi.emiNumber;

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
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase border ${statusColor}`}>
                        {isRequesting ? 'Requesting' : emi.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {emi.status !== 'Paid' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openMarkModal(emi)}
                            className="inline-flex items-center space-x-1 text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200/30 px-2.5 py-1.5 rounded-xl transition-all"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>{isRequesting ? 'Verify & Pay' : 'Mark Paid'}</span>
                          </button>
                        </div>
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
                            onClick={() => handleDeletePayment(emi)}
                            title="Delete this payment (reset to Pending)"
                            className="inline-flex items-center text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-950/30 border border-red-200/40 p-1.5 rounded-xl transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
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
            <div className="absolute top-4 right-4 flex space-x-2 no-print">
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

    </div>
  );
}
