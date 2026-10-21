import React, { useState, useMemo } from 'react';
import { 
  X, MessageCircle, CheckCircle, Calendar, DollarSign, 
  AlertTriangle, Search, Send, Clock, Phone, User, Filter
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/format.js';
import { generateEmiReminderMessage, normalizePhone } from '../utils/whatsapp.js';
import { translations, getLanguage } from '../utils/translations.js';

export default function BulkReminderModal({ customers = [], isOpen, onClose }) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'due_soon' | 'overdue'
  const [searchTerm, setSearchTerm] = useState('');
  const [sentMap, setSentMap] = useState({}); // track sent status per customerId
  const lang = getLanguage();
  const isTa = lang === 'ta';
  const t = translations[lang] || translations.en;

  // Extract all customers with active pending/overdue EMIs
  const reminderList = useMemo(() => {
    if (!Array.isArray(customers)) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const list = [];

    customers.forEach(cust => {
      if (cust.loanStatus === 'Completed') return;

      const schedule = Array.isArray(cust.emiSchedule) ? cust.emiSchedule : [];
      // Find the earliest unpaid EMI
      const pendingEmi = schedule.find(e => e.status !== 'Paid');
      if (!pendingEmi) return;

      const dueDate = new Date(pendingEmi.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      const isOverdue = diffDays < 0 || pendingEmi.status === 'Overdue';
      const isDueSoon = diffDays >= 0 && diffDays <= 7;

      if (isOverdue || isDueSoon) {
        list.push({
          customer: cust,
          emi: pendingEmi,
          diffDays,
          isOverdue,
          isDueSoon,
          totalPayable: (Number(pendingEmi.emiAmount) || 0) + (Number(pendingEmi.lateFee) || 0)
        });
      }
    });

    // Sort by overdue first, then nearest due date
    list.sort((a, b) => a.diffDays - b.diffDays);
    return list;
  }, [customers]);

  const filteredList = useMemo(() => {
    return reminderList.filter(item => {
      if (filterType === 'overdue' && !item.isOverdue) return false;
      if (filterType === 'due_soon' && (!item.isDueSoon || item.isOverdue)) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const name = (item.customer.fullName || '').toLowerCase();
        const id = (item.customer.customerId || '').toLowerCase();
        const phone = (item.customer.mobileNumber || '').toLowerCase();
        return name.includes(term) || id.includes(term) || phone.includes(term);
      }

      return true;
    });
  }, [reminderList, filterType, searchTerm]);

  if (!isOpen) return null;

  const totalOverdueCount = reminderList.filter(i => i.isOverdue).length;
  const totalDueSoonCount = reminderList.filter(i => i.isDueSoon && !i.isOverdue).length;
  const totalExpectedAmount = filteredList.reduce((sum, i) => sum + i.totalPayable, 0);

  const handleSendReminder = (item) => {
    const rawMobile = item.customer.mobileNumber || '';
    const phone = normalizePhone(rawMobile);
    if (!phone) {
      alert(`Customer ${item.customer.fullName} does not have a valid mobile number.`);
      return;
    }

    const message = generateEmiReminderMessage({
      customer: item.customer,
      emi: item.emi,
      language: lang
    });

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    // Mark as sent
    setSentMap(prev => ({ ...prev, [item.customer.customerId]: true }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
      
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-up">
        
        {/* HEADER */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-700 to-teal-800 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <MessageCircle className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center space-x-2">
                <span>{isTa ? 'வாட்ஸ்அப் தவணை நினைவூட்டல்கள்' : 'WhatsApp EMI Payment Reminders'}</span>
                <span className="px-2 py-0.2 rounded-full text-[10px] bg-yellow-400 text-slate-950 font-bold uppercase font-mono">
                  {reminderList.length} Due
                </span>
              </h3>
              <p className="text-xs text-teal-100">
                {isTa ? 'ஒரு கிளிக்கில் வாடிக்கையாளருக்கு UPI லிங்க் உடன் வாட்ஸ்அப் செய்தி அனுப்பவும்' : 'Dispatch instant payment reminders with 1-click UPI links'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* METRICS & FILTER BAR */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
          
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* TABS */}
            <div className="flex items-center space-x-1 bg-white dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterType === 'all'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Due ({reminderList.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('due_soon')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterType === 'due_soon'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Due in 7 Days ({totalDueSoonCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('overdue')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterType === 'overdue'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Overdue ({totalOverdueCount})
              </button>
            </div>

            {/* EXPECTED AMOUNT */}
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                Total Collection Pipeline
              </span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatCurrency(totalExpectedAmount, false)}
              </span>
            </div>
          </div>

          {/* SEARCH BAR */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isTa ? 'பெயர், வாடிக்கையாளர் எண் அல்லது போன் எண் தேடவும்...' : 'Search by customer name, ID, or phone number...'}
              className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

        </div>

        {/* CUSTOMER REMINDER LIST */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800/40">
          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <CheckCircle className="w-10 h-10 mx-auto text-emerald-500" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {isTa ? 'தற்போது நினைவூட்டல் அனுப்ப வேண்டிய வாடிக்கையாளர்கள் இல்லை!' : 'No pending payment reminders in this view!'}
              </p>
              <p className="text-xs text-slate-400">
                All scheduled customer EMIs are currently up to date.
              </p>
            </div>
          ) : (
            filteredList.map((item) => {
              const cust = item.customer;
              const emi = item.emi;
              const isSent = Boolean(sentMap[cust.customerId]);

              return (
                <div 
                  key={cust._id || cust.customerId}
                  className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
                >
                  {/* CUSTOMER INFO */}
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-mono font-bold text-xs ${
                      item.isOverdue
                        ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200'
                    }`}>
                      #{emi.emiNumber}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {cust.fullName}
                        </h4>
                        <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                          {cust.customerId}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{cust.mobileNumber}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Due: <strong className="text-slate-800 dark:text-slate-200">{formatDate(emi.dueDate)}</strong></span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AMOUNT & DISPATCH ACTION */}
                  <div className="flex items-center justify-between sm:justify-end space-x-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="text-left sm:text-right">
                      <div className="flex items-baseline space-x-1 sm:justify-end">
                        <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                          {formatCurrency(item.totalPayable, false)}
                        </span>
                        {emi.lateFee > 0 && (
                          <span className="text-[10px] font-bold text-red-500">
                            (+₹{emi.lateFee})
                          </span>
                        )}
                      </div>
                      
                      <span className={`inline-block text-[10px] font-black uppercase px-2 py-0.2 rounded-full ${
                        item.isOverdue
                          ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                          : item.diffDays === 0
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 animate-pulse'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                      }`}>
                        {item.isOverdue 
                          ? `${Math.abs(item.diffDays)} days overdue` 
                          : item.diffDays === 0 
                          ? 'Due Today!' 
                          : `Due in ${item.diffDays} days`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSendReminder(item)}
                      className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
                        isSent
                          ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                      }`}
                      title="Open pre-filled reminder template in WhatsApp with direct UPI link"
                    >
                      {isSent ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <MessageCircle className="w-3.5 h-3.5" />}
                      <span>{isSent ? 'Sent ✓' : 'Send WhatsApp'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
          <span>
            {filteredList.length} customer(s) eligible for payment reminders
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-colors"
          >
            Close
          </button>
        </div>

      </div>

    </div>
  );
}
