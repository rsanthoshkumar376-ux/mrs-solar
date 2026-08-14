import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { History, Download, Printer, Sun, CheckCircle, HelpCircle } from 'lucide-react';

export default function EmiHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const fetchPayments = async () => {
    try {
      const response = await api.get('/customer/payments');
      setPayments(response.data);
    } catch (error) {
      console.error('Error fetching customer payment history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

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

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Payment Statement</h2>
          <p className="text-sm text-slate-500">View and print receipts of your solar panel installation loan.</p>
        </div>
      </div>

      {/* PAYMENTS TABLE */}
      <div className="glass-premium rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900/30 flex items-center space-x-2">
          <History className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <span className="font-bold text-slate-800 dark:text-white">All Payments Logged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/50 dark:border-slate-800/50">
                <th className="px-6 py-4">Receipt ID</th>
                <th className="px-6 py-4">EMI Number</th>
                <th className="px-6 py-4">Payment Date</th>
                <th className="px-6 py-4">Amount Paid</th>
                <th className="px-6 py-4">Interest Paid</th>
                <th className="px-6 py-4">Principal Paid</th>
                <th className="px-6 py-4">Late Fee</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-slate-500">
                    No payment receipts found in your history.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-800 dark:text-slate-200 font-bold">{payment.receiptId}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">EMI #{payment.emiNumber}</td>
                    <td className="px-6 py-4">{formatDate(payment.paymentDate)}</td>
                    <td className="px-6 py-4 font-black text-slate-800 dark:text-slate-100">{formatCurrency(payment.paidAmount)}</td>
                    <td className="px-6 py-4 text-slate-500">{formatCurrency(payment.interestPaid)}</td>
                    <td className="px-6 py-4 text-slate-500">{formatCurrency(payment.principalPaid)}</td>
                    <td className="px-6 py-4 text-red-500 font-medium">
                      {payment.lateFeePaid > 0 ? formatCurrency(payment.lateFeePaid) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-900/50">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{payment.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedReceipt(payment)}
                        className="inline-flex items-center space-x-1 text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200/30 px-3 py-1.5 rounded-xl transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECEIPT VIEW MODAL (PRINT-PREVIEW SCREEN) */}
      {selectedReceipt && (
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
                onClick={() => setSelectedReceipt(null)}
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
                      <Sun className="w-4 h-4 text-yellow-300" />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-white">MRS SOLAR</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Solar Panel Installation Amortisation</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded border border-teal-200/50 dark:border-teal-900/50">
                    Official Payment Receipt
                  </span>
                  <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{selectedReceipt.receiptId}</p>
                </div>
              </div>

              {/* Invoice Meta Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Issued To:</p>
                  <p className="font-bold text-slate-800 dark:text-white mt-1">{selectedReceipt.customerName}</p>
                  <p className="text-slate-500">Customer ID: {selectedReceipt.customerId}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Receipt Details:</p>
                  <p className="mt-1"><span className="text-slate-500">Payment Date:</span> <span className="font-semibold">{formatDate(selectedReceipt.paymentDate)}</span></p>
                  <p><span className="text-slate-500">Repayment Period:</span> <span className="font-semibold">EMI #{selectedReceipt.emiNumber}</span></p>
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
                    <div className="text-right font-semibold">{formatCurrency(selectedReceipt.baseEmiAmount)}</div>
                  </div>
                  <div className="grid grid-cols-3 p-3">
                    <div>Late Payment Charge penalty (1% / day)</div>
                    <div className="text-center">{selectedReceipt.daysLate > 0 ? `${selectedReceipt.daysLate} days` : '0 days'}</div>
                    <div className="text-right text-red-500 font-semibold">{formatCurrency(selectedReceipt.lateFeePaid)}</div>
                  </div>
                  {/* Ledger components details */}
                  <div className="grid grid-cols-3 p-3 bg-slate-100/30 dark:bg-slate-900/10 text-[10px] text-slate-400 italic">
                    <div>Components: Principal: {formatCurrency(selectedReceipt.principalPaid)} | Interest (2%): {formatCurrency(selectedReceipt.interestPaid)}</div>
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
                <p className="text-2xl font-black">{formatCurrency(selectedReceipt.paidAmount)}</p>
              </div>

              {/* QR Code and signatures stamp */}
              <div className="flex justify-between items-center text-[10px] border-t border-slate-200 dark:border-slate-800 pt-4">
                <div className="flex items-center space-x-2">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=RECEIPT:${selectedReceipt.receiptId},CUST:${selectedReceipt.customerId},AMT:${selectedReceipt.paidAmount}`}
                    alt="Receipt Verification QR"
                    className="w-12 h-12 bg-white p-0.5 rounded border border-slate-200"
                  />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">Transaction Verified</p>
                    <p className="text-slate-400 font-mono">HASH: {selectedReceipt._id.substring(4, 15)}</p>
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
