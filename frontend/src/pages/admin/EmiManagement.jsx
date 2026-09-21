import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { Calendar, ShieldAlert, CreditCard, ChevronRight, Eye, MessageCircle, X, Globe, Send } from 'lucide-react';
import { generateEmiReminderMessage, openWhatsApp } from '../../utils/whatsapp.js';

export default function EmiManagement() {
  const [emiList, setEmiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('All'); // 'All', 'Overdue', 'Due Soon', 'Pending'
  const [whatsappModal, setWhatsappModal] = useState(null); // { emi, customer, language: 'ta' }

  const fetchEmis = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/customers');
      
      // Flatten all customer EMI schedules
      const flatSchedule = [];
      response.data.forEach(customer => {
        if (customer.emiSchedule) {
          customer.emiSchedule.forEach(emi => {
            if (emi.status !== 'Paid') {
              flatSchedule.push({
                ...emi,
                customerId: customer.customerId,
                customerName: customer.fullName,
                customerMobile: customer.mobileNumber,
                customerDbId: customer._id
              });
            }
          });
        }
      });

      // Sort by due date (oldest first, i.e., most overdue first)
      flatSchedule.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      setEmiList(flatSchedule);
    } catch (error) {
      console.error('Error fetching flat EMI schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmis();
  }, []);

  const filteredList = emiList.filter(emi => {
    if (filterType === 'All') return true;
    return emi.status === filterType;
  });

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Repayments & Collections</h2>
          <p className="text-sm text-slate-500">Track and monitor all unpaid or overdue installments across all customer profiles.</p>
        </div>

        {/* Tab Filters */}
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold">
          {['All', 'Overdue', 'Due Soon', 'Pending'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg transition-all ${
                filterType === type
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* TIMELINE LIST */}
      <div className="glass-premium rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900/30 flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <span className="font-bold text-slate-800 dark:text-white">Active Payment Collection Queue</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/50 dark:border-slate-800/50">
                <th className="px-6 py-4">Customer ID</th>
                <th className="px-6 py-4">Client Name</th>
                <th className="px-6 py-4">Mobile</th>
                <th className="px-6 py-4">EMI Installment</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4 text-right">Base Amount</th>
                <th className="px-6 py-4 text-right">Late Penalty</th>
                <th className="px-6 py-4 text-right">Total Outstanding</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center text-slate-500">
                    No active dues matched this filter.
                  </td>
                </tr>
              ) : (
                filteredList.map((emi, index) => {
                  let statusColor = 'bg-slate-50 text-slate-500 border-slate-200';
                  if (emi.status === 'Overdue') statusColor = 'bg-red-50 text-red-600 border-red-200/50 dark:bg-red-950/20';
                  else if (emi.status === 'Due Soon') statusColor = 'bg-orange-50 text-orange-600 border-orange-200/50 dark:bg-orange-950/20';

                  return (
                    <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-800 dark:text-slate-200">{emi.customerId}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">{emi.customerName}</td>
                      <td className="px-6 py-4">{emi.customerMobile}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">EMI #{emi.emiNumber}</td>
                      <td className="px-6 py-4">{formatDate(emi.dueDate)}</td>
                      <td className="px-6 py-4 text-right font-semibold">{formatCurrency(emi.emiAmount, false)}</td>
                      <td className={`px-6 py-4 text-right font-medium ${emi.lateFee > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                        {emi.lateFee > 0 ? formatCurrency(emi.lateFee, false) : '—'}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-800 dark:text-slate-100">
                        {formatCurrency(emi.emiAmount + emi.lateFee, false)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center whitespace-nowrap px-3 py-1 rounded-full font-bold text-[10px] tracking-wide uppercase border ${statusColor}`}>
                          {emi.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setWhatsappModal({
                              emi,
                              customer: { fullName: emi.customerName, customerId: emi.customerId, mobileNumber: emi.customerMobile },
                              language: 'ta'
                            })}
                            title="Send WhatsApp Reminder"
                            className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hover:text-white hover:bg-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300/50 dark:border-emerald-700/50 px-2.5 py-1.5 rounded-xl transition-all shadow-sm"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:text-white" />
                            <span>WhatsApp</span>
                          </button>
                          <Link
                            to={`/admin/customers/${emi.customerDbId}`}
                            className="inline-flex items-center space-x-1 text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200/30 px-2.5 py-1.5 rounded-xl transition-all"
                          >
                            <span>Ledger</span>
                            <ChevronRight className="w-3 h-3" />
                          </Link>
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

      {/* WHATSAPP REMINDER MODAL */}
      {whatsappModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">Send WhatsApp EMI Reminder</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    To: {whatsappModal.customer.fullName} ({whatsappModal.customer.mobileNumber || 'No Mobile'})
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
                  {generateEmiReminderMessage({
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
                    const message = generateEmiReminderMessage({
                      customer: whatsappModal.customer,
                      emi: whatsappModal.emi,
                      language: whatsappModal.language
                    });
                    openWhatsApp({
                      phone: whatsappModal.customer.mobileNumber,
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

    </div>
  );
}
