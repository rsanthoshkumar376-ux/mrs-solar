import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../utils/api.js';
import { formatCurrency } from '../../utils/format.js';
import {
  Users, CheckCircle2, Clock, AlertCircle, Award, Target,
  FileCheck, PlusCircle, ArrowUpRight, Calendar, UserCheck,
  TrendingUp, Send, Check, X, ShieldAlert, ChevronRight,
  Eye, RefreshCw, MessageSquare, Sun, Zap, Building, Sparkles, KeyRound,
  Headphones, Star, MessageSquareShare, MessageCircle, AlertTriangle, ShieldCheck,
  ChevronDown, ChevronUp, User, Phone, Mail, MapPin, Copy
} from 'lucide-react';
import { getSocket, joinTicketRoom, leaveTicketRoom } from '../../utils/socket.js';

export default function ManagerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);

  // Synchronize active tab with URL path
  const getTabFromPath = () => {
    if (location.pathname.includes('/support')) return 'support';
    if (location.pathname.includes('/assign') || location.pathname.includes('/tasks')) return 'assign';
    if (location.pathname.includes('/targets')) return 'targets';
    if (location.pathname.includes('/team') || location.pathname.includes('/members')) return 'team';
    if (location.pathname.includes('/attendance') || location.pathname.includes('/leaves')) return 'attendance';
    if (location.pathname.includes('/leads')) return 'leads';
    return 'approvals';
  };

  const [activeTab, setActiveTab] = useState(getTabFromPath);

  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'approvals') navigate('/manager');
    else if (tabId === 'support') navigate('/manager/support');
    else if (tabId === 'assign') navigate('/manager/assign');
    else if (tabId === 'targets') navigate('/manager/targets');
    else if (tabId === 'team') navigate('/manager/team');
    else if (tabId === 'attendance') navigate('/manager/attendance');
    else if (tabId === 'leads') navigate('/manager/leads');
  };
  
  // Data state
  const [teamMembers, setTeamMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [targets, setTargets] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [leads, setLeads] = useState([]);

  // Customer Live Support States
  const [supportTickets, setSupportTickets] = useState([]);
  const [supportCategory, setSupportCategory] = useState('all');
  const [supportSearch, setSupportSearch] = useState('');
  const [activeChatTicket, setActiveChatTicket] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [showChatAiTranscript, setShowChatAiTranscript] = useState(false);
  const [copiedTicketId, setCopiedTicketId] = useState(null);
  const chatScrollRef = useRef(null);

  // Modals & Action States
  const [selectedTask, setSelectedTask] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Assign Task Form
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    category: 'Site inspections',
    priority: 'Medium',
    assigneeId: '',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    targetMetric: 'Site inspections',
    customerName: '',
    customerMobile: '',
    customerDistrict: 'Thiruvallur'
  });

  // Distribute Target Form
  const [selectedTargetToDistribute, setSelectedTargetToDistribute] = useState(null);
  const [distributionMap, setDistributionMap] = useState({});

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [empRes, taskRes, tgtRes, attRes, leaveRes, leadRes, supportRes] = await Promise.all([
        api.get('/workforce/employees').catch(() => ({ data: { employees: [] } })),
        api.get('/workforce/tasks').catch(() => ({ data: { tasks: [] } })),
        api.get('/workforce/targets').catch(() => ({ data: { targets: [] } })),
        api.get('/workforce/attendance').catch(() => ({ data: { attendance: [] } })),
        api.get('/workforce/leaves').catch(() => ({ data: { leaves: [] } })),
        api.get('/leads').catch(() => ({ data: [] })),
        api.get('/support/manager/tickets').catch(() => ({ data: { tickets: [] } }))
      ]);

      const empList = Array.isArray(empRes.data) ? empRes.data : (empRes.data?.employees || []);
      const taskList = Array.isArray(taskRes.data) ? taskRes.data : (taskRes.data?.tasks || []);
      const tgtList = Array.isArray(tgtRes.data) ? tgtRes.data : (tgtRes.data?.targets || []);
      const attList = Array.isArray(attRes.data) ? attRes.data : (attRes.data?.attendance || []);
      const leaveList = Array.isArray(leaveRes.data) ? leaveRes.data : (leaveRes.data?.leaves || []);
      const leadList = Array.isArray(leadRes.data) ? leadRes.data : (leadRes.data?.leads || []);
      const ticketList = Array.isArray(supportRes.data) ? supportRes.data : (supportRes.data?.tickets || []);

      const myWorkers = empList.filter(e => e.role === 'worker');
      setTeamMembers(myWorkers);
      setTasks(taskList);
      setTargets(tgtList);
      setAttendance(attList);
      setLeaves(leaveList);
      setLeads(leadList);
      setSupportTickets(ticketList);
      
      if (myWorkers.length > 0 && !newTaskForm.assigneeId) {
        setNewTaskForm(prev => ({ ...prev, assigneeId: myWorkers[0].employeeId }));
      }
    } catch (err) {
      console.error('Failed to load manager dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // Socket.IO Real-Time Listeners for Customer Support
  useEffect(() => {
    const socket = getSocket();

    const handleTicketCreated = (newTicket) => {
      setSupportTickets((prev) => [newTicket, ...prev.filter(t => t._id !== newTicket._id)]);
      setSuccessMsg(`New Customer Support Request received: ${newTicket.ticketId}`);
      setTimeout(() => setSuccessMsg(''), 5000);
    };

    const handleNewMessage = (msg) => {
      if (activeChatTicket && (msg.ticketId === activeChatTicket.ticketId || msg.ticket === activeChatTicket._id)) {
        setChatMessages((prev) => {
          if (prev.some(m => m._id === msg._id || (m.createdAt === msg.createdAt && m.message === msg.message))) {
            return prev;
          }
          return [...prev, msg];
        });
      }
    };

    const handleStatusChange = (data) => {
      setSupportTickets((prev) => prev.map(t => t.ticketId === data.ticketId ? { ...t, status: data.status } : t));
      if (activeChatTicket && activeChatTicket.ticketId === data.ticketId) {
        setActiveChatTicket((prev) => ({ ...prev, status: data.status }));
      }
    };

    const handleFeedbackSubmitted = (data) => {
      setSupportTickets((prev) => prev.map(t => t.ticketId === data.ticketId ? { ...t, customerRating: data.rating, customerFeedback: data.feedback, status: 'closed' } : t));
      if (activeChatTicket && activeChatTicket.ticketId === data.ticketId) {
        setActiveChatTicket((prev) => ({ ...prev, customerRating: data.rating, customerFeedback: data.feedback, status: 'closed' }));
      }
    };

    socket.on('ticket_created', handleTicketCreated);
    socket.on('new_message', handleNewMessage);
    socket.on('ticket_status_changed', handleStatusChange);
    socket.on('feedback_submitted', handleFeedbackSubmitted);

    return () => {
      socket.off('ticket_created', handleTicketCreated);
      socket.off('new_message', handleNewMessage);
      socket.off('ticket_status_changed', handleStatusChange);
      socket.off('feedback_submitted', handleFeedbackSubmitted);
    };
  }, [activeChatTicket]);

  // Polling fallback when chat drawer is open
  useEffect(() => {
    if (!activeChatTicket?._id) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/support/tickets/${activeChatTicket._id}/messages`);
        if (res.data?.messages) {
          setChatMessages(res.data.messages);
        }
      } catch (e) {}
    }, 3500);
    return () => clearInterval(interval);
  }, [activeChatTicket?._id]);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // SUPPORT ACTIONS
  const handleAcceptTicket = async (ticket) => {
    try {
      setActionLoading(true);
      const res = await api.post(`/support/tickets/${ticket._id}/accept`);
      setSuccessMsg(`Ticket ${ticket.ticketId} accepted! You are now connected with ${ticket.customerName}.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      
      const updatedTicket = { 
        ...ticket, 
        status: 'in_progress', 
        assignedManagerId: user?.employeeId || 'MGR-1001', 
        assignedManagerName: user?.fullName || user?.username || 'Team Manager' 
      };
      setSupportTickets((prev) => prev.map(t => t._id === ticket._id ? updatedTicket : t));
      handleOpenChat(updatedTicket);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to accept ticket');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenChat = async (ticket) => {
    setActiveChatTicket(ticket);
    joinTicketRoom(ticket.ticketId);
    try {
      const res = await api.get(`/support/tickets/${ticket._id}/messages`);
      setChatMessages(res.data?.messages || []);
    } catch (e) {
      setChatMessages([]);
    }
  };

  const handleCloseChat = () => {
    if (activeChatTicket) {
      leaveTicketRoom(activeChatTicket.ticketId);
    }
    setActiveChatTicket(null);
    fetchDashboardData();
  };

  const handleSendManagerChat = async (e) => {
    if (e) e.preventDefault();
    const text = chatInput.trim();
    if (!text || !activeChatTicket?._id || sendingChat) return;

    try {
      setSendingChat(true);
      const res = await api.post(`/support/tickets/${activeChatTicket._id}/messages`, {
        message: text,
        senderRole: 'manager'
      });
      if (res.data?.messageRecord) {
        setChatMessages((prev) => [...prev, res.data.messageRecord]);
      }
      setChatInput('');
    } catch (err) {
      alert('Could not deliver message to customer.');
    } finally {
      setSendingChat(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!activeChatTicket?._id || statusUpdating) return;
    try {
      setStatusUpdating(true);
      await api.post(`/support/tickets/${activeChatTicket._id}/status`, { status: newStatus });
      setActiveChatTicket((prev) => ({ ...prev, status: newStatus }));
      setSupportTickets((prev) => prev.map(t => t._id === activeChatTicket._id ? { ...t, status: newStatus } : t));
      setSuccessMsg(`Ticket status updated to ${newStatus}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleReturnToAi = async () => {
    if (!activeChatTicket?._id) return;
    try {
      await api.post(`/support/tickets/${activeChatTicket._id}/return-to-ai`, { 
        notes: 'Clarified customer queries and returned to AI assistant.' 
      });
      setActiveChatTicket((prev) => ({ ...prev, status: 'resolved' }));
      setSupportTickets((prev) => prev.map(t => t._id === activeChatTicket._id ? { ...t, status: 'resolved' } : t));
      setSuccessMsg('Session concluded. Customer returned to AI copilot.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert('Failed to return session to AI');
    }
  };

  const handleApproveTask = async (taskId) => {
    try {
      setActionLoading(true);
      await api.post(`/workforce/tasks/${taskId}/approve`, {
        notes: 'Verified and approved by manager'
      });
      setSuccessMsg('Task approved successfully! Worker target achievement updated.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchDashboardData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to approve task');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectTask = async () => {
    if (!selectedTask) return;
    try {
      setActionLoading(true);
      await api.post(`/workforce/tasks/${selectedTask._id || selectedTask.id}/reject`, {
        feedback: rejectionReason || 'Revisions required by manager'
      });
      setShowRejectModal(false);
      setSelectedTask(null);
      setRejectionReason('');
      setSuccessMsg('Task sent back for revision with feedback.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchDashboardData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to reject task');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const selectedWorker = teamMembers.find(m => m.employeeId === newTaskForm.assigneeId);
      await api.post('/workforce/tasks', {
        ...newTaskForm,
        assigneeName: selectedWorker?.fullName || 'Assigned Worker',
        managerId: user?.employeeId || 'MGR-1001',
        managerName: user?.fullName || user?.username || 'Team Manager'
      });
      setSuccessMsg('New task assigned to team member successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
      setActiveTab('approvals');
      fetchDashboardData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to assign task');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDistributeSubmit = async (targetId) => {
    try {
      setActionLoading(true);
      const distributions = Object.entries(distributionMap)
        .filter(([_, val]) => Number(val) > 0)
        .map(([empId, val]) => {
          const emp = teamMembers.find(m => m.employeeId === empId);
          return {
            employeeId: empId,
            employeeName: emp?.fullName || empId,
            targetValue: Number(val)
          };
        });

      await api.post(`/workforce/targets/${targetId}/distribute`, { distributions });
      setSuccessMsg('Targets distributed among workers successfully!');
      setSelectedTargetToDistribute(null);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchDashboardData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to distribute targets');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveAction = async (leaveId, status) => {
    try {
      setActionLoading(true);
      await api.post(`/workforce/leaves/${leaveId}/approve`, {
        status,
        remarks: `Updated by manager ${user?.fullName || ''}`
      });
      setSuccessMsg(`Leave request ${status.toLowerCase()}!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchDashboardData();
    } catch (err) {
      setErrorMsg('Failed to update leave request');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered support tickets
  const filteredSupportTickets = supportTickets.filter((t) => {
    if (supportCategory !== 'all') {
      if (supportCategory === 'open' && t.status !== 'open' && t.status !== 'pending') return false;
      if (supportCategory === 'in_progress' && t.status !== 'in_progress') return false;
      if (supportCategory === 'waiting_customer' && t.status !== 'waiting_customer') return false;
      if (supportCategory === 'resolved' && t.status !== 'resolved') return false;
      if (supportCategory === 'closed' && t.status !== 'closed') return false;
    }
    if (supportSearch.trim()) {
      const q = supportSearch.toLowerCase();
      const match = (t.ticketId || '').toLowerCase().includes(q)
        || (t.customerName || '').toLowerCase().includes(q)
        || (t.customerMobile || '').toLowerCase().includes(q)
        || (t.issueSummary || '').toLowerCase().includes(q)
        || (t.customerIssue || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Calculations
  const pendingApprovals = tasks.filter(t => t.status === 'Submitted for Approval');
  const completedTasks = tasks.filter(t => t.status === 'Approved');
  const activeTasks = tasks.filter(t => ['Assigned', 'Accepted', 'In Progress'].includes(t.status));
  const openSupportCount = supportTickets.filter(t => t.status === 'open' || t.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500">Loading Team Manager Portal...</p>
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

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-6 rounded-2xl border border-teal-800/30 shadow-xl text-white">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
              TEAM LEADER & MANAGER PORTAL
            </span>
            <span className="text-xs text-slate-400">ID: {user?.employeeId || 'MGR-1001'}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
            <span>Welcome, {user?.fullName || user?.username || 'Team Leader'}</span>
            <Sparkles className="w-5 h-5 text-yellow-400" />
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Department: <strong className="text-teal-300">{user?.department || 'Sales & Customer Outreach'}</strong> • Team: <strong className="text-teal-300">Thiruvallur Solar Champions (TEAM-101)</strong>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setActiveTab('support');
            }}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-lg flex items-center space-x-2 transition-all active:scale-95"
          >
            <Headphones className="w-4 h-4" />
            <span>Customer Live Support ({openSupportCount})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('assign');
            }}
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg hover:shadow-teal-500/20 flex items-center space-x-2 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Assign New Task</span>
          </button>
          <button
            onClick={() => navigate('/change-password')}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex items-center space-x-1.5 text-xs font-semibold"
            title="Change Account Password"
          >
            <KeyRound className="w-4 h-4 text-teal-400" />
            <span className="hidden sm:inline">Password</span>
          </button>
          <button
            onClick={fetchDashboardData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        <div 
          onClick={() => setActiveTab('support')}
          className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700 shadow-sm cursor-pointer hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-300 mb-2">
            <span className="text-xs font-bold">Live Support</span>
            <Headphones className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{openSupportCount}</p>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">New Escalations</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">Team Members</span>
            <Users className="w-4 h-4 text-teal-500" />
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{teamMembers.length}</p>
          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">Supervised Workers</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">Pending Approvals</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingApprovals.length}</p>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Review Submissions</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">Active Tasks</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{activeTasks.length}</p>
          <span className="text-[10px] text-slate-500 font-semibold">In Progress</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{completedTasks.length}</p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Approved Work</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">Assigned Leads</span>
            <Building className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{leads.length}</p>
          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">Pipeline</span>
        </div>
      </div>

      {/* PORTAL TABS */}
      <div className="flex items-center space-x-1 sm:space-x-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'approvals', label: 'Pending Approvals', icon: FileCheck, badge: pendingApprovals.length },
          { id: 'support', label: 'Customer Live Support', icon: Headphones, badge: openSupportCount, isHighlight: true },
          { id: 'assign', label: 'Assign Task', icon: PlusCircle },
          { id: 'targets', label: 'Target Distribution', icon: Target, badge: targets.length },
          { id: 'team', label: 'Team Members', icon: Users, badge: teamMembers.length },
          { id: 'attendance', label: 'Attendance & Leaves', icon: Calendar, badge: leaves.filter(l => l.status === 'Pending').length },
          { id: 'leads', label: 'Assigned Leads', icon: Building, badge: leads.length }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? tab.isHighlight 
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-sm'
                    : 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  tab.isHighlight 
                    ? 'bg-amber-500 text-white animate-pulse' 
                    : isActive ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB: CUSTOMER LIVE SUPPORT & HUMAN ASSISTANCE DASHBOARD */}
      {/* ========================================================================= */}
      {activeTab === 'support' && (
        <div className="space-y-5 animate-fade-in">
          
          {/* TOP CONTROLS & CATEGORY FILTER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {/* CATEGORIES */}
            <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'All Requests' },
                { id: 'open', label: 'New Requests' },
                { id: 'in_progress', label: 'In Progress' },
                { id: 'waiting_customer', label: 'Waiting for Customer' },
                { id: 'resolved', label: 'Resolved' },
                { id: 'closed', label: 'Closed' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSupportCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    supportCategory === cat.id
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* SEARCH BOX */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={supportSearch}
                onChange={(e) => setSupportSearch(e.target.value)}
                placeholder="Search by Ticket ID, Customer, Phone..."
                className="px-3.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-64"
              />
            </div>
          </div>

          {/* TICKETS LIST */}
          {filteredSupportTickets.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <Headphones className="w-12 h-12 text-amber-500 mx-auto mb-3 opacity-50" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">No support requests found</h3>
              <p className="text-xs text-slate-500 mt-1">There are currently no active customer support tickets matching this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSupportTickets.map((ticket) => {
                const isOpen = ticket.status === 'open' || ticket.status === 'pending';
                const isInProgress = ticket.status === 'in_progress';
                const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';

                return (
                  <div
                    key={ticket._id}
                    className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 transition-all flex flex-col justify-between space-y-4 hover:shadow-lg ${
                      isOpen
                        ? 'border-amber-400/80 dark:border-amber-500/50 shadow-amber-500/5'
                        : isInProgress
                        ? 'border-emerald-400/80 dark:border-emerald-500/50'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      {/* TICKET TOP BAR */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-xs font-black px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 flex items-center space-x-1">
                          <span>{ticket.ticketId}</span>
                        </span>
                        <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                          isOpen
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : isInProgress
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 animate-pulse'
                            : ticket.status === 'waiting_customer'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* CUSTOMER INFO */}
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center space-x-1.5">
                          <span>{ticket.customerName || 'Solar Consumer'}</span>
                          <span className="text-[10px] font-mono text-slate-400 font-normal">({ticket.customerId || 'ID'})</span>
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          {ticket.customerMobile && (
                            <span className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-teal-500" />
                              <span>{ticket.customerMobile}</span>
                            </span>
                          )}
                          {ticket.district && (
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-amber-500" />
                              <span>{ticket.district}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* SOLAR INSTALLATION DETAILS PILL */}
                      <div className="mt-3 p-2.5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 text-[11px] text-teal-800 dark:text-teal-300 flex items-center justify-between">
                        <span className="font-semibold flex items-center space-x-1">
                          <Sun className="w-3.5 h-3.5 text-amber-500" />
                          <span>{ticket.systemCapacityKw || 3} kW Rooftop Solar</span>
                        </span>
                        <span className="font-bold text-[10px] px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                          Loan: {ticket.loanStatus || 'Active'}
                        </span>
                      </div>

                      {/* AI ISSUE SUMMARY & ACTUAL QUESTION */}
                      <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide flex items-center space-x-1">
                          <Sparkles className="w-3 h-3" />
                          <span>AI Issue Summary</span>
                        </p>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {ticket.issueSummary || 'Customer requested live technical consultation.'}
                        </p>
                        <p className="text-[11px] text-slate-500 italic line-clamp-2">
                          "{ticket.customerIssue}"
                        </p>
                      </div>

                      {/* FEEDBACK RATING (IF RESOLVED) */}
                      {ticket.customerRating && (
                        <div className="mt-2.5 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Customer Rating:</span>
                          <span className="flex items-center space-x-1 text-amber-500 font-black">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span>{ticket.customerRating} / 5</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400">
                        {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>

                      <div className="flex items-center space-x-2">
                        {isOpen ? (
                          <button
                            type="button"
                            onClick={() => handleAcceptTicket(ticket)}
                            disabled={actionLoading}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center space-x-1 active:scale-95 transition-all"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Accept & Chat</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenChat(ticket)}
                            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md flex items-center space-x-1 active:scale-95 transition-all"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Open Live Chat</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* MANAGER LIVE SUPPORT CHAT SPLIT DRAWER / MODAL */}
      {/* ========================================================================= */}
      {activeChatTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden">
            
            {/* MODAL HEADER */}
            <div className="p-4 bg-gradient-to-r from-slate-950 via-teal-950 to-slate-950 text-white flex items-center justify-between border-b border-teal-800/40">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                  <Headphones className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-black text-white">
                      Live Customer Support: {activeChatTicket.customerName}
                    </h3>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-teal-300 font-bold border border-white/20">
                      {activeChatTicket.ticketId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Direct Manager Support • Status: <strong className="text-amber-400 capitalize">{activeChatTicket.status.replace('_', ' ')}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCloseChat}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* MODAL BODY (SPLIT VIEW) */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
              
              {/* LEFT COLUMN: CUSTOMER PROFILE & AI DOSSIER (4 COLS) */}
              <div className="md:col-span-5 p-4 border-r border-slate-200 dark:border-slate-800 overflow-y-auto space-y-4 bg-slate-50 dark:bg-slate-950/50">
                {/* CUSTOMER CONTACT CARD */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Customer Dossier</h4>
                  <p className="font-black text-sm text-slate-900 dark:text-white">{activeChatTicket.customerName}</p>
                  <p className="text-xs text-slate-500">ID: <code className="font-mono text-teal-600">{activeChatTicket.customerId}</code></p>
                  <p className="text-xs text-slate-500">Mobile: <a href={`tel:${activeChatTicket.customerMobile}`} className="text-teal-600 font-bold hover:underline">{activeChatTicket.customerMobile}</a></p>
                  {activeChatTicket.customerEmail && <p className="text-xs text-slate-500">Email: {activeChatTicket.customerEmail}</p>}
                  <p className="text-xs text-slate-500">District: <strong className="text-slate-700 dark:text-slate-300">{activeChatTicket.district || 'Thiruvallur'}</strong></p>
                </div>

                {/* SOLAR INSTALLATION DETAILS */}
                <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 space-y-1.5 text-xs">
                  <h4 className="font-black uppercase text-[10px] text-teal-700 dark:text-teal-300 tracking-wider">Solar Installation Specs</h4>
                  <p>Capacity: <strong className="text-teal-900 dark:text-teal-100 font-bold">{activeChatTicket.systemCapacityKw || 3} kWp Strict Battery-Free</strong></p>
                  <p>TNEB Net-Meter: <strong className="text-emerald-600">Active (Exporting to EB)</strong></p>
                  <p>Central Subsidy: <strong className="text-emerald-600">₹78,000 (PM Surya Ghar)</strong></p>
                  <p>Loan EMI Status: <strong className="text-teal-700 dark:text-teal-300">{activeChatTicket.loanStatus || 'Current / Regular'}</strong></p>
                </div>

                {/* AI SUMMARY */}
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-1 text-xs">
                  <h4 className="font-black uppercase text-[10px] text-amber-700 dark:text-amber-300 flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Detected Issue</span>
                  </h4>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{activeChatTicket.issueSummary}</p>
                </div>

                {/* PREVIOUS AI CONVERSATION ACCORDION */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Previous AI Chat History</h4>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {(activeChatTicket.aiConversationTranscript || []).length} messages
                    </span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto text-xs pr-1">
                    {(activeChatTicket.aiConversationTranscript || []).map((m, i) => (
                      <div key={i} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                        <p className="font-bold text-[10px] text-teal-600 dark:text-teal-400">
                          {m.role === 'user' ? 'Customer' : 'AI Copilot'}:
                        </p>
                        <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5 whitespace-pre-wrap">{m.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: 2-WAY REAL-TIME CHAT (7 COLS) */}
              <div className="md:col-span-7 flex flex-col justify-between overflow-hidden bg-white dark:bg-slate-900">
                
                {/* STATUS BAR & ACTION CONTROLS */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-1 text-xs">
                    <span className="text-slate-500">Status:</span>
                    <span className="font-bold text-slate-800 dark:text-white capitalize">{activeChatTicket.status.replace('_', ' ')}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={statusUpdating}
                      onClick={() => handleUpdateStatus('waiting_customer')}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
                    >
                      Wait for Customer
                    </button>
                    <button
                      type="button"
                      disabled={statusUpdating}
                      onClick={() => handleUpdateStatus('resolved')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                    >
                      Resolve Issue
                    </button>
                    <button
                      type="button"
                      onClick={handleReturnToAi}
                      className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-bold border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors"
                    >
                      Return to AI
                    </button>
                  </div>
                </div>

                {/* MESSAGES STREAM */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <p className="text-xs font-semibold">No messages yet. Send a message to start communicating with {activeChatTicket.customerName}.</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => {
                      const isManager = msg.senderRole === 'manager';
                      const isSystem = msg.senderRole === 'system';

                      if (isSystem) {
                        return (
                          <div key={idx} className="text-center py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 mx-auto max-w-sm">
                            {msg.message}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={idx}
                          className={`flex flex-col ${isManager ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`p-3.5 rounded-2xl max-w-[85%] whitespace-pre-line ${
                              isManager
                                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-br-none shadow-md'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-700 shadow-sm'
                            }`}
                          >
                            <div className="flex items-center space-x-1 mb-1 text-[10px] font-bold opacity-80">
                              <span>{isManager ? 'You (Manager)' : activeChatTicket.customerName}</span>
                            </div>
                            <p>{msg.message}</p>
                            <div className="flex items-center justify-end space-x-1 mt-1 text-[9px] opacity-70">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatScrollRef} />
                </div>

                {/* QUICK RESPONSE TEMPLATES */}
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 overflow-x-auto whitespace-nowrap flex space-x-1.5 scrollbar-none">
                  {[
                    "Hello! I am reviewing your solar rooftop installation details now.",
                    "Your TNEB net-metering subsidy of ₹78,000 has been approved.",
                    "Our field technician has been dispatched for on-site inspection.",
                    "Your loan EMI statement and invoice have been verified."
                  ].map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setChatInput(tpl)}
                      className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-teal-50 transition-colors shrink-0 shadow-2xs"
                    >
                      {tpl}
                    </button>
                  ))}
                </div>

                {/* INPUT BAR */}
                <form
                  onSubmit={handleSendManagerChat}
                  className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={`Type response to ${activeChatTicket.customerName}...`}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white px-3.5 py-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || sendingChat}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-40 text-white transition-all shadow-md active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 1: PENDING APPROVALS */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center space-x-2">
              <FileCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>Worker Completion Submissions Awaiting Approval</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Approving directly increments worker target achievements
            </span>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-60" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">All submissions are up to date!</p>
              <p className="text-xs text-slate-500 mt-1">There are no pending task approvals from your team right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingApprovals.map((task) => (
                <div
                  key={task._id || task.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-amber-300/60 dark:border-amber-600/40 shadow-md space-y-3.5 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {task.category || 'Site inspections'}
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm mt-1.5">{task.title}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        Worker: <strong className="text-slate-700 dark:text-slate-300">{task.assigneeName}</strong> ({task.assigneeId})
                      </p>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                      {task.priority || 'Medium'} Priority
                    </span>
                  </div>

                  {task.completionNotes && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <p className="text-[11px] font-semibold text-slate-500 mb-1">Worker Notes & Field Summary:</p>
                      <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{task.completionNotes}</p>
                    </div>
                  )}

                  {task.proofPhoto && (
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
                      <img 
                        src={task.proofPhoto} 
                        alt="Proof" 
                        className="w-16 h-16 object-cover rounded-lg border border-slate-300 dark:border-slate-700" 
                      />
                      <div className="text-xs text-slate-500">
                        <p className="font-semibold text-slate-700 dark:text-slate-300">Inspection Proof Attached</p>
                        <p className="text-[10px]">Timestamped field proof</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400">
                      Submitted: {task.submittedAt ? new Date(task.submittedAt).toLocaleString() : 'Just now'}
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTask(task);
                          setShowRejectModal(true);
                        }}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                      >
                        Revision Needed
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveTask(task._id || task.id)}
                        disabled={actionLoading}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md hover:shadow-emerald-600/20 flex items-center space-x-1.5 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Work</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ASSIGN TASK FORM */}
      {activeTab === 'assign' && (
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg">
          <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
            <PlusCircle className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Assign Task to Team Member</h2>
              <p className="text-xs text-slate-500">Allocate daily/weekly solar assignments with deadlines and targets.</p>
            </div>
          </div>

          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Team Member *
              </label>
              <select
                value={newTaskForm.assigneeId}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, assigneeId: e.target.value })}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
              >
                {teamMembers.map((m) => (
                  <option key={m.employeeId} value={m.employeeId}>
                    {m.fullName} ({m.employeeId}) — {m.designation}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Task Category *
                </label>
                <select
                  value={newTaskForm.category}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, category: e.target.value, targetMetric: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="Customer visits">Customer visits</option>
                  <option value="Customer follow-ups">Customer follow-ups</option>
                  <option value="Site inspections">Site inspections (Feasibility & Shadow)</option>
                  <option value="Solar quotations">Solar quotations (1-Click Proposal)</option>
                  <option value="Customer conversions">Customer conversions (Booking)</option>
                  <option value="Solar installations">Solar installations (Panel Mounting)</option>
                  <option value="Documentation completion">EB / TNEB Net-Meter Documentation</option>
                  <option value="Service visits">Service & Maintenance visits</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  value={newTaskForm.priority}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent (Customer Escalation)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Task Title *
              </label>
              <input
                type="text"
                required
                value={newTaskForm.title}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                placeholder="e.g. Conduct Rooftop Shadow Audit for Mr. Sundaram"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Description & Instructions
              </label>
              <textarea
                rows={3}
                value={newTaskForm.description}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                placeholder="Specific instructions, customer requirements, rooftop access details..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Name (Optional)
                </label>
                <input
                  type="text"
                  value={newTaskForm.customerName}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, customerName: e.target.value })}
                  placeholder="e.g. K. Sundaramoorthy"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Deadline / Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={newTaskForm.dueDate}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-teal-500/20 flex items-center justify-center space-x-2 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>{actionLoading ? 'Assigning Task...' : 'Dispatch Task to Worker'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: TARGET DISTRIBUTION */}
      {activeTab === 'targets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span>Target Distribution & Quota Management</span>
              </h2>
              <p className="text-xs text-slate-500">Distribute owner-assigned team quotas among individual workers.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {targets.map((tgt) => {
              const achPct = tgt.targetValue > 0 ? Math.min(100, Math.round(((tgt.approvedCount || 0) / tgt.targetValue) * 100)) : 0;
              return (
                <div
                  key={tgt._id || tgt.targetId}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {tgt.period} • {tgt.category}
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm mt-1">{tgt.title}</h3>
                      <p className="text-xs text-slate-500">
                        Assigned To: <strong className="text-slate-700 dark:text-slate-300">{tgt.assignedName || tgt.assignedTo}</strong> ({tgt.assignedType})
                      </p>
                    </div>
                    <span className="text-lg font-black text-purple-600 dark:text-purple-400">
                      {achPct}%
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Target: <strong>{tgt.targetValue} {tgt.unit || 'units'}</strong></span>
                      <span>Approved: <strong className="text-emerald-600 dark:text-emerald-400">{tgt.approvedCount || 0}</strong></span>
                      <span>Remaining: <strong className="text-amber-600">{Math.max(0, tgt.targetValue - (tgt.approvedCount || 0))}</strong></span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${achPct}%` }}
                      />
                    </div>
                  </div>

                  {tgt.assignedType === 'Team' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTargetToDistribute(tgt);
                        const initialMap = {};
                        const perWorker = Math.floor(tgt.targetValue / Math.max(1, teamMembers.length));
                        teamMembers.forEach(m => {
                          initialMap[m.employeeId] = perWorker;
                        });
                        setDistributionMap(initialMap);
                      }}
                      className="w-full py-2 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold border border-purple-200 dark:border-purple-800 transition-colors flex items-center justify-center space-x-1"
                    >
                      <span>Distribute to Team Workers</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Distribution Modal */}
          {selectedTargetToDistribute && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Distribute: {selectedTargetToDistribute.title}
                  </h3>
                  <button onClick={() => setSelectedTargetToDistribute(null)}>
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                <p className="text-xs text-slate-500">
                  Total Team Target: <strong className="text-purple-600">{selectedTargetToDistribute.targetValue} {selectedTargetToDistribute.unit}</strong>. Assign individual quotas to each worker:
                </p>

                <div className="space-y-2.5 max-h-60 overflow-y-auto">
                  {teamMembers.map((worker) => (
                    <div key={worker.employeeId} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">{worker.fullName}</p>
                        <p className="text-[10px] text-slate-500">{worker.employeeId} • {worker.designation}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          value={distributionMap[worker.employeeId] || 0}
                          onChange={(e) => setDistributionMap({ ...distributionMap, [worker.employeeId]: e.target.value })}
                          className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-center"
                        />
                        <span className="text-[11px] text-slate-500 font-semibold">{selectedTargetToDistribute.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTargetToDistribute(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDistributeSubmit(selectedTargetToDistribute._id || selectedTargetToDistribute.targetId)}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-colors"
                  >
                    Save Distribution
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TEAM MEMBERS & PERFORMANCE */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center space-x-2">
              <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>Assigned Team Workers</span>
            </h2>
            <span className="text-xs text-slate-500">
              Total {teamMembers.length} active field consultants
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMembers.map((worker) => {
              const workerTasks = tasks.filter(t => t.assigneeId === worker.employeeId);
              const workerCompleted = workerTasks.filter(t => t.status === 'Approved').length;
              return (
                <div
                  key={worker.employeeId}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-black text-teal-600 dark:text-teal-400 text-sm">
                        {worker.fullName?.charAt(0) || 'W'}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">{worker.fullName}</h3>
                        <p className="text-[11px] text-slate-500">{worker.designation}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      {worker.status || 'Active'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 space-y-1">
                    <p>ID: <strong className="font-mono text-slate-700 dark:text-slate-300">{worker.employeeId}</strong></p>
                    <p>Phone: <strong className="text-slate-700 dark:text-slate-300">{worker.mobileNumber}</strong></p>
                    <p>Email: <strong className="text-slate-700 dark:text-slate-300">{worker.email}</strong></p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs">
                    <span className="text-slate-500">Tasks: <strong>{workerTasks.length}</strong></span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Approved: {workerCompleted}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: ATTENDANCE & LEAVES */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span>Pending Team Leave Requests</span>
            </h3>

            {leaves.filter(l => l.status === 'Pending').length === 0 ? (
              <p className="text-xs text-slate-500 italic">No pending leave requests from team members.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {leaves.filter(l => l.status === 'Pending').map((lv) => (
                  <div key={lv._id || lv.id} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{lv.employeeName} ({lv.employeeId})</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{lv.leaveType}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Duration: <strong>{lv.startDate}</strong> to <strong>{lv.endDate}</strong> ({lv.totalDays} day{lv.totalDays > 1 ? 's' : ''})
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic">"{lv.reason}"</p>
                    <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleLeaveAction(lv._id || lv.id, 'Rejected')}
                        className="px-3 py-1 rounded-lg text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLeaveAction(lv._id || lv.id, 'Approved')}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Approve Leave
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: ASSIGNED LEADS */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center space-x-2">
              <Building className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span>Assigned Prospective Leads</span>
            </h2>
            <span className="text-xs text-slate-500">{leads.length} Active leads</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leads.map((lead) => (
              <div
                key={lead._id || lead.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                      {lead.status || 'New'}
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm mt-1">{lead.fullName}</h3>
                    <p className="text-xs text-slate-500">{lead.district || 'Thiruvallur'}</p>
                  </div>
                  <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                    {lead.systemCapacity || 3} kWp
                  </span>
                </div>

                <div className="text-xs text-slate-500 space-y-1">
                  <p>Mobile: <strong className="text-slate-700 dark:text-slate-300">{lead.mobileNumber}</strong></p>
                  <p>EB Bill: <strong>₹{lead.monthlyEbBill || 0}/bi-monthly</strong></p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setNewTaskForm({
                        ...newTaskForm,
                        title: `Site Survey for ${lead.fullName} (${lead.systemCapacity || 3} kWp)`,
                        category: 'Site inspections',
                        customerName: lead.fullName,
                        customerMobile: lead.mobileNumber,
                        customerDistrict: lead.district || 'Thiruvallur'
                      });
                      setActiveTab('assign');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition-colors"
                  >
                    Assign Survey to Worker
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REVISION / REJECT MODAL */}
      {showRejectModal && selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Request Revision for Task
              </h3>
              <button onClick={() => setShowRejectModal(false)}>
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Provide constructive feedback to <strong className="text-slate-800 dark:text-slate-200">{selectedTask.assigneeName}</strong> explaining what needs correction before approval:
            </p>

            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Please retake the rooftop shadow photo during peak sunlight (11 AM to 2 PM), or attach TNEB consumer number proof."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-red-500"
            />

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectTask}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md transition-colors"
              >
                Send Revision Request
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
