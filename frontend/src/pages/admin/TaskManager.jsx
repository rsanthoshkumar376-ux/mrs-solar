import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import {
  Clock, CheckCircle2, AlertCircle, FileCheck, Search, Filter,
  Eye, RefreshCw, X, ShieldAlert, Check, ChevronRight, User,
  Calendar, Camera
} from 'lucide-react';

export default function TaskManager() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Selected Task Modal
  const [selectedTask, setSelectedTask] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/workforce/tasks');
      const taskList = Array.isArray(res.data) ? res.data : (res.data?.tasks || []);
      setTasks(taskList);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (taskId) => {
    try {
      setActionLoading(true);
      await api.post(`/workforce/tasks/${taskId}/approve`, {
        notes: 'Approved by Super Admin'
      });
      setSuccessMsg('Task approved! Worker target achievement updated.');
      setTimeout(() => setSuccessMsg(''), 4000);
      setSelectedTask(null);
      fetchTasks();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to approve task');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = !search ||
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.assigneeName?.toLowerCase().includes(search.toLowerCase()) ||
      t.customerName?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const totalTasks = tasks.length;
  const pendingApprovals = tasks.filter(t => t.status === 'Submitted for Approval').length;
  const inProgress = tasks.filter(t => ['Assigned', 'Accepted', 'In Progress'].includes(t.status)).length;
  const approved = tasks.filter(t => t.status === 'Approved').length;

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
            <Clock className="w-7 h-7 text-teal-600 dark:text-teal-400" />
            <span>Company Task & Milestone Board</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time tracking of field assignments, customer visits, rooftop inspections, and installations.
          </p>
        </div>

        <button
          onClick={fetchTasks}
          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start md:self-auto"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Total Tasks</span>
          <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{totalTasks}</p>
          <span className="text-[10px] text-slate-500 font-semibold">Across all departments</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">In Progress</span>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{inProgress}</p>
          <span className="text-[10px] text-blue-600 font-semibold">Active field assignments</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Awaiting Approval</span>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{pendingApprovals}</p>
          <span className="text-[10px] text-amber-600 font-semibold">Submissions to review</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Completed & Approved</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{approved}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">Target achievements counted</span>
        </div>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks, assigned worker, customer..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Submitted for Approval">Submitted for Approval</option>
            <option value="Approved">Approved</option>
            <option value="Revision Required">Revision Required</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* TASKS TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Task Title & Category</th>
                <th className="p-3.5">Assigned Worker</th>
                <th className="p-3.5">Reporting Manager</th>
                <th className="p-3.5">Customer / Target</th>
                <th className="p-3.5">Due Date</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTasks.map((task) => (
                <tr key={task._id || task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                  <td className="p-3.5">
                    <p className="font-bold text-slate-800 dark:text-white text-xs">{task.title}</p>
                    <span className="text-[10px] text-slate-500 font-medium">{task.category || 'Site inspections'}</span>
                  </td>
                  <td className="p-3.5">
                    <p className="font-semibold text-slate-800 dark:text-white">{task.assigneeName}</p>
                    <p className="font-mono text-[10px] text-slate-400">{task.assigneeId}</p>
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-300 font-medium">
                    {task.managerName}
                  </td>
                  <td className="p-3.5">
                    {task.customerName ? (
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-white">{task.customerName}</p>
                        <p className="text-[10px] text-slate-400">{task.customerDistrict || 'Thiruvallur'}</p>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">General Target</span>
                    )}
                  </td>
                  <td className="p-3.5 text-slate-500 font-mono">
                    {task.dueDate || '-'}
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      task.status === 'Approved'
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200'
                        : task.status === 'Submitted for Approval'
                        ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200'
                        : task.status === 'Revision Required'
                        ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200'
                        : 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200'
                    }`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => setSelectedTask(task)}
                      className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-800 transition-colors"
                      title="View Submission Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* TASK DETAILS MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {selectedTask.category}
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white text-base mt-1">
                  {selectedTask.title}
                </h3>
              </div>
              <button onClick={() => setSelectedTask(null)}>
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <p>Worker: <strong>{selectedTask.assigneeName}</strong></p>
                <p>Manager: <strong>{selectedTask.managerName}</strong></p>
                <p>Priority: <strong>{selectedTask.priority}</strong></p>
                <p>Due Date: <strong>{selectedTask.dueDate}</strong></p>
              </div>

              {selectedTask.description && (
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-300 mb-0.5">Instructions:</p>
                  <p className="text-slate-600 dark:text-slate-300">{selectedTask.description}</p>
                </div>
              )}

              {selectedTask.completionNotes && (
                <div className="p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800">
                  <p className="font-bold text-teal-800 dark:text-teal-200 mb-0.5">Worker Completion Notes:</p>
                  <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{selectedTask.completionNotes}</p>
                </div>
              )}

              {selectedTask.proofPhoto && (
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">Attached Field Photo Proof:</p>
                  <img
                    src={selectedTask.proofPhoto}
                    alt="Proof"
                    className="w-full h-44 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                selectedTask.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {selectedTask.status}
              </span>

              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
                {selectedTask.status === 'Submitted for Approval' && (
                  <button
                    onClick={() => handleApprove(selectedTask._id || selectedTask.id)}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center space-x-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve Task</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
