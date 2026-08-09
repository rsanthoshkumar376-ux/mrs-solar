import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { Calendar, ShieldAlert, CreditCard, ChevronRight, Eye } from 'lucide-react';

export default function EmiManagement() {
  const [emiList, setEmiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('All'); // 'All', 'Overdue', 'Due Soon', 'Pending'

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
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase border ${statusColor}`}>
                          {emi.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Link
                          to={`/admin/customers/${emi.customerDbId}`}
                          className="inline-flex items-center space-x-1 text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200/30 px-2.5 py-1.5 rounded-xl transition-all"
                        >
                          <span>Manage Ledger</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
