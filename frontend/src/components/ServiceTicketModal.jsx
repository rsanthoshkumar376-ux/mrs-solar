import React, { useState, useEffect } from 'react';
import { 
  X, Wrench, AlertTriangle, CheckCircle2, Clock, Send, 
  MessageCircle, Sparkles, AlertCircle, Plus, FileText
} from 'lucide-react';
import api from '../utils/api.js';
import { formatDate } from '../utils/format.js';
import { getLanguage } from '../utils/translations.js';

export default function ServiceTicketModal({ isOpen, onClose, customer }) {
  const lang = getLanguage();
  const isTa = lang === 'ta';

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [category, setCategory] = useState('Inverter Alert / Red Light');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customer/tickets');
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTickets();
      setShowNewForm(false);
      setSuccessMsg('');
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg(isTa ? 'தயவுசெய்து பிரச்சனையின் விவரத்தை உள்ளிடவும்.' : 'Please describe the issue.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      await api.post('/customer/tickets', {
        category,
        description: description.trim(),
        priority
      });

      setSuccessMsg(isTa ? 'பராமரிப்பு கோரிக்கை வெற்றிகரமாக பதிவு செய்யப்பட்டது!' : 'Service request registered successfully! Our team will contact you.');
      setDescription('');
      setShowNewForm(false);
      fetchTickets();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-teal-500/30 rounded-3xl shadow-2xl overflow-hidden my-6">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-transparent">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/30">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-1.5">
                <span>{isTa ? 'சோலார் பராமரிப்பு & பழுது நீக்கம்' : 'Solar Maintenance & Service Center'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isTa ? 'இன்வெர்ட்டர், பேனல் சுத்தம் அல்லது தொழில்நுட்ப உதவி' : 'Report an inverter alert, request panel cleaning, or schedule technician visit'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 text-xs flex items-center space-x-2 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ACTION BUTTON */}
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isTa ? 'உங்கள் பராமரிப்பு கோரிக்கைகள்' : 'Your Maintenance Requests'} ({tickets.length})
            </span>
            <button
              type="button"
              onClick={() => setShowNewForm(!showNewForm)}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-teal-600/20 transition-all"
            >
              {showNewForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{showNewForm ? (isTa ? 'மூடுக' : 'Close Form') : (isTa ? 'புதிய கோரிக்கை' : 'New Request')}</span>
            </button>
          </div>

          {/* NEW TICKET FORM */}
          {showNewForm && (
            <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 text-xs flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                  {isTa ? 'பிரச்சனை வகை' : 'Issue Category'}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Inverter Alert / Red Light">🔴 Inverter Alert / Red Light Blinking</option>
                  <option value="Solar Panel Dust Cleaning">🧹 Panel Dust / Water Cleaning Request</option>
                  <option value="Low Unit Generation">⚡ Generation Drop / Low Units Generated</option>
                  <option value="TNEB Net-Meter Disconnect">🔌 TNEB Net-Meter Disconnect / Sync Error</option>
                  <option value="Structure & Wiring Check">🌧️ Structure, Earthing or Wiring Inspection</option>
                  <option value="General Maintenance">🔧 General Annual Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                  {isTa ? 'பிரச்சனையின் விவரம்' : 'Issue Description / Notes'} *
                </label>
                <textarea
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={isTa ? 'எ.கா: இன்வெர்ட்டரில் நேற்று முதல் சிவப்பு விளக்கு ஒளிர்கிறது...' : 'e.g., Inverter showing error code E03 since morning, please send engineer.'}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2.5 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{isTa ? 'முன்னுரிமை:' : 'Priority:'}</span>
                  <button
                    type="button"
                    onClick={() => setPriority('Normal')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${priority === 'Normal' ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'}`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('Urgent')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${priority === 'Urgent' ? 'bg-red-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'}`}
                  >
                    Urgent
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? '...' : (isTa ? 'அனுப்புக' : 'Submit Ticket')}</span>
                </button>
              </div>
            </form>
          )}

          {/* TICKET LIST */}
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-bold text-slate-700 dark:text-slate-300">
                {isTa ? 'தற்போது நிலுவையில் உள்ள புகார்கள் ஏதுமில்லை' : 'No active service tickets'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isTa ? 'உங்கள் சோலார் கூரை அமைப்பு சீராக இயங்குகிறது.' : 'Your rooftop solar system is running smoothly.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {tickets.map((t) => (
                <div key={t._id} className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {t.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        #{t._id} • {formatDate(t.createdAt)}
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      t.status === 'Resolved'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                        : t.status === 'In Progress'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300'
                    }`}>
                      {t.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl">
                    {t.description}
                  </p>

                  {t.resolutionNotes && (
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                      ✓ Resolution: {t.resolutionNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}