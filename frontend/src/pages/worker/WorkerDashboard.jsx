import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../utils/api.js';
import { formatCurrency } from '../../utils/format.js';
import {
  CheckCircle2, Clock, AlertCircle, Award, Target,
  FileCheck, Play, Send, Camera, Upload, Calendar,
  UserCheck, Phone, MessageCircle, MapPin, Sun, Zap,
  ChevronRight, RefreshCw, X, ShieldAlert, Sparkles, AlertTriangle
} from 'lucide-react';

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks'); // tasks | targets | attendance | leads
  
  // Data state
  const [tasks, setTasks] = useState([]);
  const [targets, setTargets] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [assignedLeads, setAssignedLeads] = useState([]);

  // Attendance Punch State
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [punchLoading, setPunchLoading] = useState(false);

  // Task Submission Modal State
  const [selectedTaskToSubmit, setSelectedTaskToSubmit] = useState(null);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [proofPhotoUrl, setProofPhotoUrl] = useState('');
  const [submittingTask, setSubmittingTask] = useState(false);

  // Leave Request Modal State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'Casual Leave',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: ''
  });
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // Status Filters & Messages
  const [taskStatusFilter, setTaskStatusFilter] = useState('all');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchWorkerData();
  }, []);

  const fetchWorkerData = async () => {
    try {
      setLoading(true);
      const [taskRes, tgtRes, attRes, leaveRes, leadRes] = await Promise.all([
        api.get('/workforce/tasks').catch(() => ({ data: { tasks: [] } })),
        api.get('/workforce/targets').catch(() => ({ data: { targets: [] } })),
        api.get('/workforce/attendance').catch(() => ({ data: { attendance: [] } })),
        api.get('/workforce/leaves').catch(() => ({ data: { leaves: [] } })),
        api.get('/leads').catch(() => ({ data: [] }))
      ]);

      const myId = user?.employeeId || 'EMP-1001';
      const myTasks = (taskRes.data.tasks || []).filter(t => t.assigneeId === myId);
      const myTargets = (tgtRes.data.targets || []).filter(t => t.assignedTo === myId || t.assignedType === 'Team');
      const myAtt = (attRes.data.attendance || []).filter(a => a.employeeId === myId);
      const myLeaves = (leaveRes.data.leaves || []).filter(l => l.employeeId === myId);
      
      setTasks(myTasks);
      setTargets(myTargets);
      setAttendanceLogs(myAtt);
      setLeaves(myLeaves);

      // Check if already checked in today
      const todayStr = new Date().toISOString().split('T')[0];
      const todayLog = myAtt.find(a => a.date === todayStr);
      setTodayAttendance(todayLog || null);

      // Leads assigned or nearby
      setAssignedLeads((leadRes.data || []).slice(0, 5));
    } catch (err) {
      console.error('Failed to load worker data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePunchIn = async () => {
    try {
      setPunchLoading(true);
      const res = await api.post('/workforce/attendance/check-in', {
        employeeId: user?.employeeId || 'EMP-1001',
        employeeName: user?.fullName || user?.username || 'Field Worker',
        location: 'Field Office / Site Location'
      });
      setTodayAttendance(res.data.record);
      setSuccessMsg('Punched in successfully! Have a productive workday.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchWorkerData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to punch in');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setPunchLoading(false);
    }
  };

  const handlePunchOut = async () => {
    try {
      setPunchLoading(true);
      const res = await api.post('/workforce/attendance/check-out', {
        employeeId: user?.employeeId || 'EMP-1001'
      });
      setTodayAttendance(res.data.record);
      setSuccessMsg('Punched out successfully. Great work today!');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchWorkerData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to punch out');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setPunchLoading(false);
    }
  };

  const handleStartTask = async (taskId) => {
    try {
      await api.post(`/workforce/tasks/${taskId}/status`, { status: 'In Progress' });
      setSuccessMsg('Task accepted! Status updated to In Progress.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchWorkerData();
    } catch (err) {
      setErrorMsg('Failed to update task status');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    if (!selectedTaskToSubmit) return;
    try {
      setSubmittingTask(true);
      await api.post(`/workforce/tasks/${selectedTaskToSubmit._id || selectedTaskToSubmit.id}/submit`, {
        completionNotes: submissionNotes,
        proofPhoto: proofPhotoUrl || 'https://images.unsplash.com/photo-1508873696983-2df5293cb395?auto=format&fit=crop&w=400&q=80'
      });
      setSelectedTaskToSubmit(null);
      setSubmissionNotes('');
      setProofPhotoUrl('');
      setSuccessMsg('Work submitted for manager approval!');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchWorkerData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to submit task');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleRequestLeave = async (e) => {
    e.preventDefault();
    try {
      setSubmittingLeave(true);
      const start = new Date(leaveForm.startDate);
      const end = new Date(leaveForm.endDate);
      const diffTime = Math.abs(end - start);
      const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      await api.post('/workforce/leaves', {
        employeeId: user?.employeeId || 'EMP-1001',
        employeeName: user?.fullName || user?.username || 'Field Worker',
        leaveType: leaveForm.leaveType,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        totalDays,
        reason: leaveForm.reason
      });
      setShowLeaveModal(false);
      setLeaveForm({
        leaveType: 'Casual Leave',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: ''
      });
      setSuccessMsg('Leave request submitted to manager for approval.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchWorkerData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to request leave');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setSubmittingLeave(false);
    }
  };

  // Calculations
  const approvedTasks = tasks.filter(t => t.status === 'Approved');
  const pendingTasks = tasks.filter(t => t.status === 'Submitted for Approval');
  const inProgressTasks = tasks.filter(t => ['Assigned', 'Accepted', 'In Progress'].includes(t.status));
  const revisionTasks = tasks.filter(t => t.status === 'Revision Required');

  // Overall personal target achievement
  const myDirectTarget = targets.find(t => t.assignedTo === (user?.employeeId || 'EMP-1001')) || targets[0];
  const targetTotal = Number(myDirectTarget?.targetValue) || 20;
  const targetCompleted = Number(myDirectTarget?.approvedCount) || approvedTasks.length;
  const targetPct = targetTotal > 0 ? Math.min(100, Math.round((targetCompleted / targetTotal) * 100)) : 0;

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    if (taskStatusFilter === 'all') return true;
    if (taskStatusFilter === 'pending') return t.status === 'Submitted for Approval';
    if (taskStatusFilter === 'active') return ['Assigned', 'Accepted', 'In Progress'].includes(t.status);
    if (taskStatusFilter === 'approved') return t.status === 'Approved';
    if (taskStatusFilter === 'revision') return t.status === 'Revision Required';
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500">Loading Workforce Portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Alert Banners */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-semibold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm font-semibold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* HEADER WITH WORKER INFO & PUNCH IN/OUT */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-6 rounded-2xl border border-teal-800/30 shadow-xl text-white">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
              FIELD TECHNICAL CONSULTANT PORTAL
            </span>
            <span className="text-xs text-slate-400 font-mono">ID: {user?.employeeId || 'EMP-1001'}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
            <span>Welcome, {user?.fullName || user?.username || 'Karthik Raja'}</span>
            <Sun className="w-5 h-5 text-yellow-400" />
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Department: <strong className="text-teal-300">{user?.department || 'Sales & Customer Outreach'}</strong> • Reporting Manager: <strong className="text-teal-300">{user?.managerName || 'Suresh Kumar (MGR-1001)'}</strong>
          </p>
        </div>

        {/* ATTENDANCE PUNCH BOX */}
        <div className="flex items-center space-x-3 bg-slate-900/80 p-3 rounded-xl border border-teal-700/30">
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-slate-400">Today's Shift Status</p>
            <p className="text-xs font-bold">
              {todayAttendance?.checkInTime ? (
                <span className="text-emerald-400">Punched In: {todayAttendance.checkInTime}</span>
              ) : (
                <span className="text-amber-400">Not Punched In</span>
              )}
            </p>
          </div>

          {!todayAttendance ? (
            <button
              onClick={handlePunchIn}
              disabled={punchLoading}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-bold shadow-lg flex items-center space-x-1.5 transition-all active:scale-95"
            >
              <UserCheck className="w-4 h-4" />
              <span>{punchLoading ? 'Punching...' : 'Punch In'}</span>
            </button>
          ) : !todayAttendance.checkOutTime ? (
            <button
              onClick={handlePunchOut}
              disabled={punchLoading}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-600 hover:to-red-600 text-white rounded-xl text-xs font-bold shadow-lg flex items-center space-x-1.5 transition-all active:scale-95"
            >
              <Clock className="w-4 h-4" />
              <span>{punchLoading ? 'Punching...' : 'Punch Out'}</span>
            </button>
          ) : (
            <div className="px-3 py-1.5 bg-slate-800 rounded-xl text-xs font-bold text-slate-300">
              Shift Ended ({todayAttendance.checkOutTime})
            </div>
          )}

          <button
            onClick={fetchWorkerData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">My Total Tasks</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{tasks.length}</p>
          <span className="text-[10px] text-slate-500 font-semibold">Assigned assignments</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">In Progress</span>
            <Play className="w-4 h-4 text-teal-500" />
          </div>
          <p className="text-2xl font-black text-teal-600 dark:text-teal-400">{inProgressTasks.length}</p>
          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">Ongoing fieldwork</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">Under Review</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingTasks.length}</p>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Manager approval</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{approvedTasks.length}</p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Target counted</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold">Target Progress</span>
            <Target className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-black text-purple-600 dark:text-purple-400">{targetPct}%</p>
          <p className="text-[10px] text-slate-500">
            {targetCompleted} / {targetTotal} {myDirectTarget?.unit || 'units'}
          </p>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-purple-500 to-teal-400 h-full rounded-full transition-all"
              style={{ width: `${targetPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* REVISION ALERT BOX IF ANY */}
      {revisionTasks.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-xs text-red-800 dark:text-red-200">
              {revisionTasks.length} Task{revisionTasks.length > 1 ? 's require' : ' requires'} revision!
            </h4>
            <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">
              Your manager requested corrections on some of your submissions. Check the feedback below and resubmit.
            </p>
          </div>
        </div>
      )}

      {/* PORTAL TABS */}
      <div className="flex items-center space-x-1 sm:space-x-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'tasks', label: 'My Assigned Tasks', icon: Clock, badge: tasks.length },
          { id: 'targets', label: 'My Target Tracking', icon: Target, badge: `${targetPct}%` },
          { id: 'attendance', label: 'Attendance & Leaves', icon: Calendar },
          { id: 'leads', label: 'Customer Visits', icon: MapPin, badge: assignedLeads.length }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: MY TASKS */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center space-x-2">
              <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>Daily Assignments & Tasks</span>
            </h2>

            {/* Status Filter Buttons */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'active', label: 'In Progress' },
                { id: 'pending', label: 'Under Review' },
                { id: 'approved', label: 'Approved' },
                { id: 'revision', label: 'Revision' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setTaskStatusFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    taskStatusFilter === f.id
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No tasks in this category</p>
              <p className="text-xs text-slate-500 mt-1">All clean! Wait for your manager to assign new tasks.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTasks.map((task) => (
                <div
                  key={task._id || task.id}
                  className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm space-y-3 transition-all ${
                    task.status === 'Revision Required'
                      ? 'border-red-400 dark:border-red-700 bg-red-50/20'
                      : task.status === 'Approved'
                      ? 'border-emerald-300 dark:border-emerald-800'
                      : task.status === 'Submitted for Approval'
                      ? 'border-amber-300 dark:border-amber-800'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {task.category || 'Site inspections'}
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm mt-1">{task.title}</h3>
                      <p className="text-xs text-slate-500">
                        Manager: <strong className="text-slate-700 dark:text-slate-300">{task.managerName}</strong>
                      </p>
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase border shrink-0 ${
                      task.status === 'Approved'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                        : task.status === 'Submitted for Approval'
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300'
                        : task.status === 'Revision Required'
                        ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-300'
                        : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300'
                    }`}>
                      {task.status}
                    </span>
                  </div>

                  {task.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300">{task.description}</p>
                  )}

                  {task.customerName && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                      <p>Customer: <strong>{task.customerName}</strong> ({task.customerDistrict || 'Thiruvallur'})</p>
                      {task.customerMobile && (
                        <div className="flex items-center space-x-3 pt-1">
                          <a href={`tel:${task.customerMobile}`} className="inline-flex items-center space-x-1 text-teal-600 hover:underline font-bold">
                            <Phone className="w-3 h-3" />
                            <span>Call Customer</span>
                          </a>
                          <a href={`https://wa.me/91${task.customerMobile}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-1 text-emerald-600 hover:underline font-bold">
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manager Rejection Feedback if any */}
                  {task.rejectionFeedback && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs">
                      <p className="font-bold text-red-700 dark:text-red-300 flex items-center space-x-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Manager Revision Note:</span>
                      </p>
                      <p className="text-red-600 dark:text-red-300 mt-0.5">{task.rejectionFeedback}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-slate-400">
                      Due: <strong>{task.dueDate || 'Today'}</strong>
                    </span>

                    {/* Action buttons based on status */}
                    <div>
                      {task.status === 'Assigned' && (
                        <button
                          type="button"
                          onClick={() => handleStartTask(task._id || task.id)}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold flex items-center space-x-1"
                        >
                          <Play className="w-3 h-3" />
                          <span>Accept & Start</span>
                        </button>
                      )}

                      {['Accepted', 'In Progress', 'Revision Required'].includes(task.status) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTaskToSubmit(task);
                            setSubmissionNotes('');
                          }}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-lg font-bold shadow-sm flex items-center space-x-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Submit Completion</span>
                        </button>
                      )}

                      {task.status === 'Submitted for Approval' && (
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Awaiting Manager</span>
                        </span>
                      )}

                      {task.status === 'Approved' && (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Completed & Counted</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY TARGET TRACKING */}
      {activeTab === 'targets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span>My Assigned Target Quotas</span>
              </h2>
              <p className="text-xs text-slate-500">Track your daily, weekly, and monthly achievement progress.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {targets.map((tgt) => {
              const ach = tgt.targetValue > 0 ? Math.min(100, Math.round(((tgt.approvedCount || 0) / tgt.targetValue) * 100)) : 0;
              const remaining = Math.max(0, tgt.targetValue - (tgt.approvedCount || 0));
              return (
                <div
                  key={tgt._id || tgt.targetId}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                        {tgt.period} • {tgt.category}
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm mt-1">{tgt.title}</h3>
                    </div>
                    <span className="text-xl font-black text-purple-600 dark:text-purple-400">
                      {ach}%
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Target: <strong>{tgt.targetValue} {tgt.unit || 'units'}</strong></span>
                      <span>Approved: <strong className="text-emerald-600 dark:text-emerald-400">{tgt.approvedCount || 0}</strong></span>
                      <span>Remaining: <strong className="text-amber-600">{remaining}</strong></span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-teal-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${ach}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    {ach >= 100 ? '🎉 Monthly Target Achieved!' : `Complete ${remaining} more ${tgt.unit || 'units'} to reach 100% goal.`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ATTENDANCE & LEAVES */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>Attendance History & Leave Requests</span>
            </h2>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all"
            >
              <Calendar className="w-4 h-4" />
              <span>Request Leave</span>
            </button>
          </div>

          {/* Pending / Past Leaves */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-slate-500">My Leave Applications</h3>
            {leaves.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No leaves applied.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {leaves.map((l) => (
                  <div key={l._id || l.id} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-slate-800 dark:text-white">{l.leaveType}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        l.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : l.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {l.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{l.startDate} to {l.endDate} ({l.totalDays} days)</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic">"{l.reason}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attendance Log Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-slate-500">Recent Attendance Logs</h3>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Check-In</th>
                    <th className="p-3">Check-Out</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attendanceLogs.slice(0, 10).map((att) => (
                    <tr key={att._id || att.id} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                      <td className="p-3 font-bold text-slate-800 dark:text-white">{att.date}</td>
                      <td className="p-3 font-mono text-emerald-600">{att.checkInTime || '-'}</td>
                      <td className="p-3 font-mono text-slate-500">{att.checkOutTime || 'On Duty'}</td>
                      <td className="p-3 text-slate-500">{att.location || 'Field'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {att.status || 'Present'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CUSTOMER VISITS & LEADS */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>Assigned Customer Visits & Surveys</span>
            </h2>
            <span className="text-xs text-slate-500">Territory: Thiruvallur District</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedLeads.map((lead) => (
              <div
                key={lead._id || lead.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{lead.fullName}</h3>
                    <p className="text-xs text-slate-500">{lead.district || 'Thiruvallur'} • Roof: {lead.roofType || 'RCC Flat'}</p>
                  </div>
                  <span className="text-xs font-black text-teal-600 dark:text-teal-400">
                    {lead.systemCapacity || 3} kWp
                  </span>
                </div>

                <div className="text-xs text-slate-500 space-y-1">
                  <p>EB Bill: <strong>₹{lead.monthlyEbBill?.toLocaleString('en-IN') || '2,500'} / mo</strong></p>
                  <p>Mobile: <strong className="text-slate-800 dark:text-slate-200">{lead.mobileNumber}</strong></p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <a
                      href={`tel:${lead.mobileNumber}`}
                      className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center space-x-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Call</span>
                    </a>
                    <a
                      href={`https://wa.me/91${lead.mobileNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center space-x-1"
                    >
                      <MessageCircle className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </a>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedTaskToSubmit({
                        id: `TSK-VISIT-${Date.now()}`,
                        title: `Rooftop Feasibility for ${lead.fullName}`,
                        category: 'Site inspections'
                      });
                    }}
                    className="px-3 py-1 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm"
                  >
                    Log Visit Complete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBMISSION MODAL */}
      {selectedTaskToSubmit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Submit Work: {selectedTaskToSubmit.title}
              </h3>
              <button onClick={() => setSelectedTaskToSubmit(null)}>
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmitTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Field Summary & Completion Notes *
                </label>
                <textarea
                  required
                  rows={4}
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="e.g. Conducted rooftop survey. Roof size is 450 sq.ft, south-facing, zero shadow. Customer selected 3kWp On-Grid solar with Tier-1 bifacial modules..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Photo Proof / Document Link (Optional)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={proofPhotoUrl}
                    onChange={(e) => setProofPhotoUrl(e.target.value)}
                    placeholder="https://... or leave blank for default site photo"
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
                    <Camera className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedTaskToSubmit(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTask}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md flex items-center space-x-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingTask ? 'Submitting...' : 'Submit to Manager'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEAVE REQUEST MODAL */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Apply for Leave
              </h3>
              <button onClick={() => setShowLeaveModal(false)}>
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleRequestLeave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Leave Type *
                </label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="Casual Leave">Casual Leave (CL)</option>
                  <option value="Sick Leave">Sick Leave (SL)</option>
                  <option value="Earned Leave">Earned Leave (EL)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="State the reason for leave..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLeave}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md transition-colors"
                >
                  {submittingLeave ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
