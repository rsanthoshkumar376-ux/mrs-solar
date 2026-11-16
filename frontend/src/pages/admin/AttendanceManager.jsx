import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import {
  Calendar, UserCheck, Clock, CheckCircle2, AlertCircle,
  Users, Check, X, RefreshCw, ShieldAlert, FileText, Search
} from 'lucide-react';

export default function AttendanceManager() {
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today'); // today | leaves | history

  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [attRes, leaveRes, empRes] = await Promise.all([
        api.get('/workforce/attendance').catch(() => ({ data: { attendance: [] } })),
        api.get('/workforce/leaves').catch(() => ({ data: { leaves: [] } })),
        api.get('/workforce/employees').catch(() => ({ data: { employees: [] } }))
      ]);

      const attList = Array.isArray(attRes.data) ? attRes.data : (attRes.data?.attendance || []);
      const leaveList = Array.isArray(leaveRes.data) ? leaveRes.data : (leaveRes.data?.leaves || []);
      const empList = Array.isArray(empRes.data) ? empRes.data : (empRes.data?.employees || []);

      setAttendance(attList);
      setLeaves(leaveList);
      setEmployees(empList);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveAction = async (leaveId, status) => {
    try {
      setActionLoading(true);
      await api.post(`/workforce/leaves/${leaveId}/approve`, {
        status,
        remarks: 'Actioned by Super Admin'
      });
      setSuccessMsg(`Leave request ${status.toLowerCase()}!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch (err) {
      setErrorMsg('Failed to update leave');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter(a => a.date === todayStr);
  const pendingLeaves = leaves.filter(l => l.status === 'Pending');

  return (
    <div className="space-y-6">
      
      {/* Alert Banners */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center space-x-2.5">
            <UserCheck className="w-7 h-7 text-teal-600 dark:text-teal-400" />
            <span>Workforce Attendance & Leave Control</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time punch-in records, shift completion, and centralized leave approvals for all employees.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start md:self-auto"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Total Workforce</span>
          <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{employees.length}</p>
          <span className="text-[10px] text-slate-500 font-semibold">Registered staff</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Punched In Today</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{todayAttendance.length}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">Active on duty</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Pending Leave Requests</span>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{pendingLeaves.length}</p>
          <span className="text-[10px] text-amber-600 font-semibold">Awaiting decision</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Today's Date</span>
          <p className="text-lg font-black text-slate-800 dark:text-white mt-1 font-mono">{todayStr}</p>
          <span className="text-[10px] text-teal-600 font-semibold">Live system clock</span>
        </div>
      </div>

      {/* TABS */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        {[
          { id: 'today', label: "Today's Attendance", icon: UserCheck, count: todayAttendance.length },
          { id: 'leaves', label: 'Leave Requests Queue', icon: Calendar, count: pendingLeaves.length },
          { id: 'history', label: 'Historical Records', icon: Clock, count: attendance.length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: TODAY'S ATTENDANCE */}
      {activeTab === 'today' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Employee ID & Name</th>
                <th className="p-3.5">Check-In Time</th>
                <th className="p-3.5">Check-Out Time</th>
                <th className="p-3.5">Location / Method</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {todayAttendance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No punch-in recorded yet today.
                  </td>
                </tr>
              ) : (
                todayAttendance.map((att) => (
                  <tr key={att._id || att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="p-3.5 font-bold text-slate-800 dark:text-white">
                      {att.employeeName} <span className="font-mono text-slate-400 font-normal">({att.employeeId})</span>
                    </td>
                    <td className="p-3.5 font-mono text-emerald-600 font-bold">{att.checkInTime || '-'}</td>
                    <td className="p-3.5 font-mono text-slate-500">{att.checkOutTime || 'On Duty (Shift Active)'}</td>
                    <td className="p-3.5 text-slate-500">{att.location || 'Field Office'}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {att.status || 'Present'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: LEAVE REQUESTS */}
      {activeTab === 'leaves' && (
        <div className="space-y-4">
          {pendingLeaves.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-60" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">All leave requests processed!</p>
              <p className="text-xs text-slate-500 mt-1">There are no pending leave requests awaiting approval.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingLeaves.map((lv) => (
                <div key={lv._id || lv.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-700 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {lv.leaveType}
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm mt-1">{lv.employeeName}</h3>
                      <p className="text-xs text-slate-500 font-mono">ID: {lv.employeeId}</p>
                    </div>
                    <span className="text-xs font-bold text-amber-600">
                      {lv.totalDays} day{lv.totalDays > 1 ? 's' : ''}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 italic p-3 rounded-xl bg-slate-50 dark:bg-slate-950">
                    "{lv.reason}"
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-slate-500">{lv.startDate} to {lv.endDate}</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleLeaveAction(lv._id || lv.id, 'Rejected')}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 font-bold hover:bg-red-50 text-xs"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleLeaveAction(lv._id || lv.id, 'Approved')}
                        disabled={actionLoading}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 text-xs shadow-sm flex items-center space-x-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Approve</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Employee Name & ID</th>
                <th className="p-3.5">Check-In</th>
                <th className="p-3.5">Check-Out</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {attendance.map((att) => (
                <tr key={att._id || att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                  <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">{att.date}</td>
                  <td className="p-3.5 font-bold text-slate-800 dark:text-white">
                    {att.employeeName} ({att.employeeId})
                  </td>
                  <td className="p-3.5 font-mono text-emerald-600">{att.checkInTime || '-'}</td>
                  <td className="p-3.5 font-mono text-slate-500">{att.checkOutTime || 'On Duty'}</td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {att.status || 'Present'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
