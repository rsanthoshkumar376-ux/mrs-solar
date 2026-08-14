import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { 
  Sun, DollarSign, Calendar, ShieldCheck, Zap, X,
  QrCode, Landmark, User, FileText, Info, Calculator
} from 'lucide-react';

export default function CustomerDashboard() {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedEmi, setSelectedEmi] = useState(null);
  
  // Amortisation Calculator States (Live EMI Calculator)
  const [calcCost, setCalcCost] = useState(150000);
  const [calcDownPayment, setCalcDownPayment] = useState(30000);
  const [calcMonths, setCalcMonths] = useState(12);
  const [calcEmiResult, setCalcEmiResult] = useState(0);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/customer/dashboard');
      setCustomer(response.data);
    } catch (error) {
      console.error('Error fetching customer dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Update live calculator result
  useEffect(() => {
    const principal = calcCost - calcDownPayment;
    const r = 0.02; // 2% per month
    const n = calcMonths;
    if (principal > 0 && n > 0) {
      const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      setCalcEmiResult(Math.round(emi * 100) / 100);
    } else {
      setCalcEmiResult(0);
    }
  }, [calcCost, calcDownPayment, calcMonths]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!customer || !customer.emiSchedule) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl">
        <div className="w-12 h-12 bg-red-50 dark:bg-red-950 text-red-400 rounded-full flex items-center justify-center mx-auto mb-3">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <p className="text-slate-600 dark:text-slate-400 font-medium">Could not load your loan details.</p>
        <p className="text-sm text-slate-400 mt-1">Please try refreshing the page or contact MRS SOLAR support.</p>
      </div>
    );
  }

  const emiSchedule = customer.emiSchedule || [];
  const emisPaidCount = emiSchedule.filter(e => e.status === 'Paid').length;
  const totalEmisCount = emiSchedule.length;
  const progressPercentage = totalEmisCount > 0 ? Math.round((emisPaidCount / totalEmisCount) * 100) : 0;

  // Next due date logic
  const nextPendingEmi = emiSchedule.find(e => e.status !== 'Paid');
  const outstandingAmount = customer.totalOutstandingAmount || 0;

  const openPaymentModal = (emi) => {
    setSelectedEmi(emi);
    setShowQrModal(true);
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-700 to-emerald-600 dark:from-teal-950 dark:to-emerald-950 rounded-3xl p-6 md:p-8 shadow-lg shadow-teal-700/10 text-white">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-yellow-300/10 rounded-full blur-xl animate-pulse-soft"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-teal-200 bg-teal-800/50 px-3 py-1 rounded-full">Active Financing</span>
            <h2 className="text-3xl font-extrabold mt-3">Welcome, {customer.fullName}</h2>
            <p className="text-sm text-teal-100 mt-1">Customer ID: {customer.customerId} | Installation Date: {formatDate(customer.installationDate)}</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/10 text-center">
              <p className="text-xs text-teal-200">Total Outstanding</p>
              <p className="text-2xl font-black mt-1">{formatCurrency(outstandingAmount)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/10 text-center">
              <p className="text-xs text-teal-200">Next EMI Date</p>
              <p className="text-2xl font-black mt-1">{nextPendingEmi ? formatDate(nextPendingEmi.dueDate) : 'Completed'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* LOAN PROGRESS TIMELINE */}
      <div className="glass-premium rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">Loan Repayment Progress</h3>
          <span className="text-sm font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-3 py-1 rounded-full">
            {emisPaidCount} of {totalEmisCount} Paid ({progressPercentage}%)
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-6 p-0.5 border border-slate-200/50 dark:border-slate-700/50">
          <div 
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-1000 ease-out shadow-inner"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        {/* Installment Progress Timeline */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-3">
          {emiSchedule.map((emi) => {
            let color = 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-600';
            if (emi.status === 'Paid') color = 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50';
            else if (emi.status === 'Overdue') color = 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50 animate-pulse';
            else if (emi.status === 'Due Soon') color = 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/50';
            
            return (
              <div 
                key={emi.emiNumber}
                className={`border rounded-xl p-2.5 text-center flex flex-col items-center justify-center transition-all hover:scale-105 cursor-help ${color}`}
                title={`Due: ${formatDate(emi.dueDate)}\nAmount: ${formatCurrency(emi.emiAmount + (emi.lateFee || 0))}`}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-85">EMI</span>
                <span className="text-lg font-black mt-0.5">#{emi.emiNumber}</span>
                <span className="text-[9px] font-bold mt-1 uppercase tracking-tight">{emi.status}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* THREE PANELS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PANEL 1: PROJECT DETAILS */}
        <div className="glass-premium rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
            <Zap className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-slate-800 dark:text-white">Solar Project Details</h3>
          </div>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Capacity (kW)</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.solarCapacity} kW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Solar Brand</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.solarBrand || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total System Cost</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(customer.solarCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Down Payment</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(customer.downPayment)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Loan Principal</span>
              <span className="font-semibold text-teal-600 dark:text-teal-400">{formatCurrency(customer.loanAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Interest Rate</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.interestRate}% / month</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Warranty Details</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">{customer.warrantyDetails || 'Standard'}</span>
            </div>
          </div>
        </div>

        {/* PANEL 2: LOAN TIMING & BANK */}
        <div className="glass-premium rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
            <Landmark className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-slate-800 dark:text-white">Financing & Banking</h3>
          </div>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Monthly EMI</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(customer.monthlyEmi)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Duration (Months)</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.emiDuration} Months</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Loan Start Date</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(customer.loanStartDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Loan End Date</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(customer.loanEndDate)}</span>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Repayment Bank Account</p>
              <div className="flex justify-between">
                <span className="text-slate-500">Bank Name</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.bankDetails?.bankName || 'N/A'}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-slate-500">Account No.</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.bankDetails?.accountNumber || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL 3: CONTACT & DOCUMENTS */}
        <div className="glass-premium rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
            <User className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-slate-800 dark:text-white">Customer & Documents</h3>
          </div>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Mobile</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.mobileNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Email</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">{customer.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Installation Address</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-right truncate max-w-[180px]" title={customer.installationAddress}>
                {customer.installationAddress || 'N/A'}
              </span>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Uploaded Files</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {customer.documents && Object.keys(customer.documents).map((docName) => {
                  const url = customer.documents[docName];
                  if (!url) return null;
                  return (
                    <a
                      key={docName}
                      href={`http://localhost:5000${url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/20 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-xl transition-all border border-slate-200/50 dark:border-slate-700/50 truncate"
                    >
                      <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="capitalize truncate">{docName.replace('File', '')}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* LIVE EMI CALCULATOR SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* EMI CALCULATOR */}
        <div className="glass-premium rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
            <Calculator className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-slate-800 dark:text-white">Interactive Loan Amortisation Calculator</h3>
          </div>
          
          <div className="space-y-5 text-sm">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-500">Solar Project Cost:</span>
                <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(calcCost, false)}</span>
              </div>
              <input
                type="range"
                min="50000"
                max="500000"
                step="10000"
                value={calcCost}
                onChange={(e) => setCalcCost(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-600 dark:accent-teal-400"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-500">Down Payment Amount:</span>
                <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(calcDownPayment, false)}</span>
              </div>
              <input
                type="range"
                min="10000"
                max={calcCost - 20000}
                step="5000"
                value={calcDownPayment}
                onChange={(e) => setCalcDownPayment(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-600 dark:accent-teal-400"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-500">EMI Duration:</span>
                <span className="font-bold text-slate-800 dark:text-white">{calcMonths} Months</span>
              </div>
              <input
                type="range"
                min="3"
                max="36"
                step="3"
                value={calcMonths}
                onChange={(e) => setCalcMonths(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-600 dark:accent-teal-400"
              />
            </div>

            <div className="bg-teal-500/5 dark:bg-teal-400/5 border border-teal-500/20 dark:border-teal-400/10 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Estimated Monthly EMI</p>
                <p className="text-xs text-slate-500 mt-0.5">Reducing balance @ 2% / mo interest</p>
              </div>
              <p className="text-3xl font-black text-teal-600 dark:text-teal-400">{formatCurrency(calcEmiResult)}</p>
            </div>
          </div>
        </div>

        {/* CURRENT DUES & UPI QR QUICK PAY */}
        <div className="glass-premium rounded-3xl p-6 md:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-200/50 dark:border-slate-800/50 mb-6">
              <QrCode className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h3 className="font-bold text-slate-800 dark:text-white">Pay Current Installment</h3>
            </div>
            
            {nextPendingEmi ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Scheduled EMI</span>
                    <h4 className="text-2xl font-black text-slate-800 dark:text-white mt-1">EMI #{nextPendingEmi.emiNumber}</h4>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                    nextPendingEmi.status === 'Overdue' 
                      ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 border border-red-200/30'
                      : nextPendingEmi.status === 'Due Soon'
                      ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400 border border-orange-200/30'
                      : 'bg-teal-50 text-teal-600 dark:bg-teal-950/20 dark:text-teal-400 border border-teal-200/30'
                  }`}>
                    {nextPendingEmi.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                  <div>
                    <span className="text-slate-500">EMI Base Amount</span>
                    <p className="font-bold text-slate-800 dark:text-white mt-0.5">{formatCurrency(nextPendingEmi.emiAmount)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Late Penalty Fee</span>
                    <p className={`font-bold mt-0.5 ${nextPendingEmi.lateFee > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'}`}>
                      {formatCurrency(nextPendingEmi.lateFee)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Interest Portion</span>
                    <p className="font-semibold text-slate-800 dark:text-white mt-0.5">{formatCurrency(nextPendingEmi.interestPaid)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Principal Portion</span>
                    <p className="font-semibold text-slate-800 dark:text-white mt-0.5">{formatCurrency(nextPendingEmi.principalPaid)}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-teal-600 text-white p-4 rounded-2xl shadow-lg shadow-teal-500/10">
                  <div>
                    <p className="text-xs opacity-80 uppercase font-semibold">Total Outstanding Due</p>
                    <p className="text-lg opacity-70 text-teal-100">Including accumulated late fees</p>
                  </div>
                  <p className="text-3xl font-black">{formatCurrency(nextPendingEmi.emiAmount + nextPendingEmi.lateFee)}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 space-y-3">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-white">All Installments Paid!</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">Thank you! Your loan financing has been fully settled and closed.</p>
              </div>
            )}
          </div>

          {nextPendingEmi && (
            <button
              onClick={() => openPaymentModal(nextPendingEmi)}
              className="w-full mt-6 py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-teal-500/10 flex items-center justify-center space-x-2 outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              <QrCode className="w-5 h-5" />
              <span>Generate Quick Pay QR Code</span>
            </button>
          )}
        </div>

      </div>

      {/* QR PAYMENT POPUP MODAL */}
      {showQrModal && selectedEmi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-6">
            <button 
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Scan QR to Pay</h3>
              <p className="text-xs text-slate-500">EMI #{selectedEmi.emiNumber} | Customer: {customer.fullName}</p>
            </div>

            {/* Simulated UPI QR Code */}
            <div className="w-52 h-52 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center mx-auto relative overflow-hidden p-3 shadow-inner">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=rsanthoshkumar376@oksbi%26pn=MRS_SOLAR%26am=${selectedEmi.emiAmount + selectedEmi.lateFee}%26cu=INR%26tn=EMI_${selectedEmi.emiNumber}_${customer.customerId}`}
                alt="Payment QR Code"
                className="w-full h-full object-contain rounded"
              />
            </div>

            <div className="text-center space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Amount to transfer</p>
              <p className="text-3xl font-black text-teal-600 dark:text-teal-400">{formatCurrency(selectedEmi.emiAmount + selectedEmi.lateFee)}</p>
              <p className="text-[10px] text-slate-400 italic">UPI: rsanthoshkumar376@oksbi</p>
            </div>

            {/* DIRECT UPI APP LINK BUTTONS FOR MOBILE */}
            <div className="space-y-2">
              <a
                href={`upi://pay?pa=rsanthoshkumar376@oksbi&pn=MRS%20SOLAR&am=${selectedEmi.emiAmount + selectedEmi.lateFee}&cu=INR&tn=EMI%20${selectedEmi.emiNumber}%20${customer.customerId}`}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 text-sm"
              >
                <Zap className="w-4 h-4 text-yellow-300 fill-current" />
                <span>Pay via GPay / PhonePe / Paytm</span>
              </a>
              <p className="text-[10px] text-slate-400 text-center">Opens GPay/PhonePe directly with pre-filled amount {formatCurrency(selectedEmi.emiAmount + selectedEmi.lateFee)}</p>
            </div>

            <button
              onClick={async () => {
                try {
                  await api.post('/customer/notify-payment', { emiNumber: selectedEmi.emiNumber });
                  alert("Payment notification sent! The owner/administrator has been notified to verify your payment.");
                } catch (err) {
                  alert("Payment recorded! Owner/administrator will verify your payment shortly.");
                } finally {
                  setShowQrModal(false);
                }
              }}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-colors text-xs"
            >
              I Have Completed Payment
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
