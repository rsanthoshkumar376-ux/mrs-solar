import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../database/db.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { 
  sendAccountInvitationEmail, 
  sendPasswordResetEmail 
} from '../utils/email.js';

const router = express.Router();

// Strict RBAC: Accessible by Team Managers and Owners (Admins)
router.use(authenticateToken);
router.use(authorizeRole(['manager', 'admin']));

/**
 * 1. GET /api/manager/stats
 * Comprehensive Manager Dashboard KPIs, monthly charts, worker performance & recent activity
 */
router.get('/stats', async (req, res) => {
  try {
    const [allCustomers, allEmployees, allTasks, allInvitations, allLogs] = await Promise.all([
      db.find('customers'),
      db.find('employees'),
      db.find('tasks'),
      db.find('account_invitations'),
      db.find('account_activity_logs')
    ]);

    const workers = allEmployees.filter(e => e.role === 'worker');
    const activeWorkers = workers.filter(e => e.status === 'active');
    const pendingWorkers = workers.filter(e => e.status === 'pending_activation');

    const totalCustomers = allCustomers.length;
    const activeCustomers = allCustomers.filter(c => c.accountStatus === 'Active' || c.loanStatus === 'Active').length;
    const pendingCustomers = allCustomers.filter(c => c.accountStatus === 'Pending Activation' || (!c.accountStatus && !c.loginUsername)).length;

    // Newly registered customers within last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newlyRegisteredCustomers = allCustomers.filter(c => c.createdAt && new Date(c.createdAt) >= thirtyDaysAgo).length;

    const completedTasks = allTasks.filter(t => t.status === 'approved').length;
    const pendingTasks = allTasks.filter(t => t.status !== 'approved').length;
    const inProgressTasks = allTasks.filter(t => t.status === 'in_progress' || t.status === 'assigned').length;

    // Monthly Customer Registrations for past 6 months
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const monthlyRegistrations = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthLabel = `${monthNames[month]} ${year.toString().slice(-2)}`;

      const count = allCustomers.filter(c => {
        if (!c.createdAt) return false;
        const cd = new Date(c.createdAt);
        return cd.getFullYear() === year && cd.getMonth() === month;
      }).length;

      monthlyRegistrations.push({
        month: monthLabel,
        count
      });
    }

    // Worker Performance Overview
    const workerPerformance = workers.map(w => {
      const wTasks = allTasks.filter(t => t.assigneeId === w.employeeId);
      const wCompleted = wTasks.filter(t => t.status === 'approved').length;
      const wCustomers = allCustomers.filter(c => c.assignedWorkerId === w.employeeId).length;
      const completionRate = wTasks.length > 0 ? Math.round((wCompleted / wTasks.length) * 100) : 100;

      return {
        id: w._id,
        employeeId: w.employeeId,
        fullName: w.fullName,
        jobRole: w.designation || 'Solar Technician',
        department: w.department || 'Installation',
        mobileNumber: w.mobileNumber,
        status: w.status || 'active',
        assignedCustomers: wCustomers,
        totalTasks: wTasks.length,
        completedTasks: wCompleted,
        pendingTasks: wTasks.length - wCompleted,
        completionRate
      };
    });

    // Recent Activity (sorted newest first)
    const sortedLogs = [...allLogs].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    res.json({
      summary: {
        totalCustomers,
        activeCustomers,
        newlyRegisteredCustomers,
        pendingActivationCustomers: pendingCustomers,
        totalWorkers: workers.length,
        activeWorkers: activeWorkers.length,
        pendingActivationWorkers: pendingWorkers.length,
        completedTasks,
        pendingTasks,
        inProgressTasks
      },
      monthlyRegistrations,
      workerPerformance,
      recentActivity: sortedLogs.slice(0, 15)
    });
  } catch (err) {
    console.error('Manager dashboard stats error:', err);
    res.status(500).json({ message: 'Failed to load manager dashboard statistics' });
  }
});

/**
 * 2. POST /api/manager/customers
 * Register a new customer directly by Manager with automatic Gmail invitation
 */
router.post('/customers', async (req, res) => {
  try {
    const {
      fullName,
      email,
      mobileNumber,
      alternateNumber = '',
      address = '',
      district = 'Thiruvallur',
      ebConsumerNumber = '',
      systemCapacity = 3,
      installationDate = '',
      panelDetails = 'Tier-1 Mono PERC Half-Cut 550W Panels',
      assignedWorkerId = '',
      accountStatus = 'Pending Activation'
    } = req.body;

    if (!fullName || !mobileNumber) {
      return res.status(400).json({ message: 'Customer Full Name and Mobile Number are required.' });
    }

    const cleanMobile = String(mobileNumber).trim().replace(/^\+?91/, '').replace(/^0+/, '').replace(/[\s-]/g, '');
    const cleanEmail = email ? String(email).trim().toLowerCase() : '';

    if (cleanMobile.length < 10) {
      return res.status(400).json({ message: 'Please enter a valid 10-digit mobile number.' });
    }

    // Check duplicate mobile or email
    const allCustomers = await db.find('customers');
    const duplicateMobile = allCustomers.find(c => {
      const cMob = String(c.mobileNumber || '').replace(/^\+?91/, '').replace(/^0+/, '').replace(/[\s-]/g, '');
      return cMob === cleanMobile;
    });

    if (duplicateMobile) {
      return res.status(400).json({ message: `Customer with mobile ${cleanMobile} already exists (${duplicateMobile.fullName} - ${duplicateMobile.customerId}).` });
    }

    if (cleanEmail) {
      const duplicateEmail = allCustomers.find(c => String(c.email || '').toLowerCase() === cleanEmail);
      if (duplicateEmail) {
        return res.status(400).json({ message: `Customer with Gmail ${cleanEmail} is already registered.` });
      }
    }

    // Generate next Customer ID
    let nextIdNumber = 1001;
    allCustomers.forEach(c => {
      if (c.customerId && c.customerId.startsWith('CUST-')) {
        const num = parseInt(c.customerId.replace('CUST-', ''), 10);
        if (!isNaN(num) && num >= nextIdNumber) {
          nextIdNumber = num + 1;
        }
      }
    });
    const customerId = `CUST-${nextIdNumber}`;

    // Look up assigned worker name
    let assignedWorkerName = '';
    if (assignedWorkerId) {
      const worker = await db.findOne('employees', { employeeId: assignedWorkerId });
      if (worker) assignedWorkerName = worker.fullName;
    }

    const managerId = req.user?.employeeId || req.user?.userId || 'MGR-1001';
    const managerName = req.user?.fullName || req.user?.username || 'Team Manager';
    const nowIso = new Date().toISOString();

    // Create customer record
    const newCustomer = await db.create('customers', {
      customerId,
      fullName: String(fullName).trim(),
      email: cleanEmail,
      mobileNumber: cleanMobile,
      alternateNumber: String(alternateNumber || '').trim(),
      address: String(address || '').trim(),
      district,
      ebConsumerNumber: String(ebConsumerNumber || '').trim(),
      systemCapacity: Number(systemCapacity) || 3,
      installationDate: installationDate || new Date().toISOString().split('T')[0],
      panelDetails,
      assignedWorkerId,
      assignedWorkerName,
      assignedManagerId: managerId,
      assignedManagerName: managerName,
      registeredBy: 'manager',
      createdById: managerId,
      createdByName: managerName,
      accountStatus: cleanEmail ? 'Pending Activation' : 'Active',
      loanStatus: 'Active',
      paymentStatus: 'Current',
      systemStatus: 'Optimal',
      batteryFreeMode: true,
      directEbExport: true,
      createdAt: nowIso,
      updatedAt: nowIso
    });

    // Create invitation token and send Gmail invitation if email provided
    let invitationSent = false;
    let activationToken = '';

    if (cleanEmail) {
      activationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

      await db.create('account_invitations', {
        token: activationToken,
        invitationType: 'customer',
        targetId: customerId,
        fullName: String(fullName).trim(),
        email: cleanEmail,
        mobileNumber: cleanMobile,
        createdById: managerId,
        createdByName: managerName,
        createdByRole: req.user?.role || 'manager',
        status: 'pending',
        expiresAt,
        createdAt: nowIso,
        updatedAt: nowIso
      });

      // Send branded invitation email
      const emailResult = await sendAccountInvitationEmail({
        to: cleanEmail,
        fullName: String(fullName).trim(),
        category: 'Customer',
        registrationId: customerId,
        activationToken,
        invitedByName: managerName,
        invitedByRole: 'Team Manager'
      });

      invitationSent = emailResult.success !== false;
    }

    // Auto-create assignment record and task if worker assigned
    if (assignedWorkerId) {
      await db.create('customer_assignments', {
        customerId,
        customerName: fullName,
        workerId: assignedWorkerId,
        workerName: assignedWorkerName,
        managerId,
        managerName,
        assignedAt: nowIso,
        notes: `Rooftop Solar Installation & Technical Feasibility for ${systemCapacity} kW system.`,
        status: 'active'
      }).catch(() => {});

      const taskId = `TSK-${Date.now().toString().slice(-6)}`;
      await db.create('tasks', {
        taskId,
        title: `Site Survey & Installation – ${fullName} (${customerId})`,
        description: `Perform site feasibility and coordinate on-grid installation for ${systemCapacity} kW system at ${district}.`,
        type: 'installation',
        priority: 'high',
        deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        status: 'assigned',
        customerId,
        customerName: fullName,
        assigneeId: assignedWorkerId,
        assigneeName: assignedWorkerName,
        managerId,
        managerName,
        progress: 0,
        createdAt: nowIso,
        updatedAt: nowIso
      }).catch(() => {});
    }

    // Record in account_activity_logs
    await db.create('account_activity_logs', {
      action: 'ACCOUNT_INVITATION_SENT',
      performedByRole: req.user?.role || 'manager',
      performedById: managerId,
      performedByName: managerName,
      targetId: customerId,
      targetType: 'customer',
      details: {
        customerId,
        fullName,
        email: cleanEmail,
        mobile: cleanMobile,
        assignedWorker: assignedWorkerName || 'Unassigned',
        systemCapacity: `${systemCapacity} kW`,
        invitationSent
      },
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      timestamp: nowIso
    }).catch(() => {});

    // Notify Owner
    await db.create('notifications', {
      role: 'admin',
      type: 'CUSTOMER_REGISTERED_BY_MANAGER',
      title: `☀️ New Customer Registered: ${fullName}`,
      message: `Manager ${managerName} registered customer ${fullName} (${customerId}) with ${systemCapacity} kW system.${cleanEmail ? ' Gmail activation link dispatched.' : ''}`,
      customerId,
      read: false,
      createdAt: nowIso
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: `Customer ${fullName} successfully registered (${customerId})!${cleanEmail ? ' Gmail account invitation sent.' : ''}`,
      customer: newCustomer,
      invitationSent
    });
  } catch (err) {
    console.error('Register customer error:', err);
    res.status(500).json({ message: `Customer registration failed: ${err.message}` });
  }
});

/**
 * 3. GET /api/manager/customers
 * List customers managed by or visible to Manager with search and status filtering
 */
router.get('/customers', async (req, res) => {
  try {
    const { search, status, workerId } = req.query;
    const [allCustomers, allInvitations, allUsers] = await Promise.all([
      db.find('customers'),
      db.find('account_invitations'),
      db.find('users')
    ]);

    let list = allCustomers.map(c => {
      const inv = allInvitations.filter(i => i.targetId === c.customerId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      const userAcc = allUsers.find(u => u.customerId === c.customerId);

      return {
        ...c,
        registeredUsername: userAcc?.username || c.loginUsername || null,
        invitationStatus: inv ? inv.status : (userAcc ? 'activated' : 'none'),
        invitationExpiresAt: inv?.expiresAt || null,
        invitationSentAt: inv?.createdAt || null,
        isUserActive: userAcc?.status !== 'disabled'
      };
    });

    if (status && status !== 'all') {
      if (status === 'active') {
        list = list.filter(c => c.accountStatus === 'Active' || c.invitationStatus === 'activated');
      } else if (status === 'pending') {
        list = list.filter(c => c.accountStatus === 'Pending Activation' || c.invitationStatus === 'pending');
      } else if (status === 'disabled') {
        list = list.filter(c => c.accountStatus === 'Disabled' || !c.isUserActive);
      }
    }

    if (workerId && workerId !== 'all') {
      list = list.filter(c => c.assignedWorkerId === workerId);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        (c.fullName && c.fullName.toLowerCase().includes(q)) ||
        (c.customerId && c.customerId.toLowerCase().includes(q)) ||
        (c.mobileNumber && c.mobileNumber.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.district && c.district.toLowerCase().includes(q))
      );
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json(list);
  } catch (err) {
    console.error('Fetch manager customers error:', err);
    res.status(500).json({ message: 'Failed to load customers' });
  }
});

/**
 * 4. POST /api/manager/customers/:id/resend-invite
 * Resend activation invitation email to Customer's Gmail
 */
router.post('/customers/:id/resend-invite', async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await db.findOne('customers', { _id: id }) || await db.findOne('customers', { customerId: id });

    if (!customer) {
      return res.status(404).json({ message: 'Customer record not found' });
    }

    if (!customer.email || !customer.email.includes('@')) {
      return res.status(400).json({ message: 'No registered Gmail address found for this customer. Please update their profile with a valid email.' });
    }

    const activationToken = crypto.randomBytes(32).toString('hex');
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await db.create('account_invitations', {
      token: activationToken,
      invitationType: 'customer',
      targetId: customer.customerId,
      fullName: customer.fullName,
      email: customer.email,
      mobileNumber: customer.mobileNumber,
      createdById: req.user?.employeeId || req.user?.userId || 'MGR-1001',
      createdByName: req.user?.fullName || 'Manager',
      createdByRole: req.user?.role || 'manager',
      status: 'pending',
      expiresAt,
      createdAt: nowIso,
      updatedAt: nowIso
    });

    const emailResult = await sendAccountInvitationEmail({
      to: customer.email,
      fullName: customer.fullName,
      category: 'Customer',
      registrationId: customer.customerId,
      activationToken,
      invitedByName: req.user?.fullName || 'Team Manager',
      invitedByRole: 'Manager'
    });

    await db.create('account_activity_logs', {
      action: 'ACCOUNT_INVITATION_SENT',
      performedByRole: req.user?.role || 'manager',
      performedById: req.user?.employeeId || req.user?.userId,
      performedByName: req.user?.fullName,
      targetId: customer.customerId,
      targetType: 'customer',
      details: { email: customer.email, action: 'Resend Invitation' },
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      timestamp: nowIso
    }).catch(() => {});

    res.json({
      success: true,
      message: `Fresh account activation link successfully sent to ${customer.email}!`
    });
  } catch (err) {
    console.error('Resend customer invite error:', err);
    res.status(500).json({ message: 'Failed to resend invitation' });
  }
});

/**
 * 5. POST /api/manager/customers/:id/toggle-status
 * Enable or Disable customer account
 */
router.post('/customers/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'Active' or 'Disabled'

    const customer = await db.findOne('customers', { _id: id }) || await db.findOne('customers', { customerId: id });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const newStatus = status || (customer.accountStatus === 'Active' ? 'Disabled' : 'Active');
    const nowIso = new Date().toISOString();

    await db.updateOne('customers', { _id: customer._id }, {
      accountStatus: newStatus,
      updatedAt: nowIso
    });

    // Also update in users collection
    await db.updateOne('users', { customerId: customer.customerId }, {
      status: newStatus.toLowerCase(),
      updatedAt: nowIso
    });

    await db.create('account_activity_logs', {
      action: newStatus === 'Active' ? 'ACCOUNT_REACTIVATED' : 'ACCOUNT_DISABLED',
      performedByRole: req.user?.role || 'manager',
      performedById: req.user?.employeeId || req.user?.userId,
      performedByName: req.user?.fullName,
      targetId: customer.customerId,
      targetType: 'customer',
      details: { previousStatus: customer.accountStatus, newStatus },
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      timestamp: nowIso
    }).catch(() => {});

    res.json({
      success: true,
      message: `Customer account ${customer.customerId} is now ${newStatus}.`,
      accountStatus: newStatus
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update account status' });
  }
});

/**
 * 6. POST /api/manager/customers/:id/assign-worker
 * Assign or reassign customer to a field worker
 */
router.post('/customers/:id/assign-worker', async (req, res) => {
  try {
    const { id } = req.params;
    const { workerId, notes = '' } = req.body;

    const customer = await db.findOne('customers', { _id: id }) || await db.findOne('customers', { customerId: id });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    let workerName = 'Unassigned';
    if (workerId) {
      const worker = await db.findOne('employees', { employeeId: workerId });
      if (worker) workerName = worker.fullName;
    }

    const nowIso = new Date().toISOString();

    await db.updateOne('customers', { _id: customer._id }, {
      assignedWorkerId: workerId || '',
      assignedWorkerName: workerName,
      updatedAt: nowIso
    });

    if (workerId) {
      await db.create('customer_assignments', {
        customerId: customer.customerId,
        customerName: customer.fullName,
        workerId,
        workerName,
        managerId: req.user?.employeeId || 'MGR-1001',
        managerName: req.user?.fullName || 'Manager',
        assignedAt: nowIso,
        notes,
        status: 'active'
      });

      // Also assign task
      await db.create('tasks', {
        taskId: `TSK-${Date.now().toString().slice(-6)}`,
        title: `Customer Assigned: ${customer.fullName} (${customer.district})`,
        description: notes || `Handle rooftop installation and commissioning for customer ${customer.customerId}.`,
        type: 'installation',
        priority: 'medium',
        deadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        status: 'assigned',
        customerId: customer.customerId,
        customerName: customer.fullName,
        assigneeId: workerId,
        assigneeName: workerName,
        managerId: req.user?.employeeId || 'MGR-1001',
        managerName: req.user?.fullName || 'Manager',
        progress: 0,
        createdAt: nowIso,
        updatedAt: nowIso
      });
    }

    await db.create('account_activity_logs', {
      action: 'WORKER_ASSIGNED',
      performedByRole: req.user?.role || 'manager',
      performedById: req.user?.employeeId || req.user?.userId,
      performedByName: req.user?.fullName,
      targetId: customer.customerId,
      targetType: 'customer',
      details: { workerId, workerName, notes },
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      timestamp: nowIso
    }).catch(() => {});

    res.json({
      success: true,
      message: `Worker ${workerName} assigned to customer ${customer.fullName}.`,
      assignedWorkerId: workerId,
      assignedWorkerName: workerName
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to assign worker' });
  }
});

/**
 * 7. POST /api/manager/workers
 * Register a new worker directly by Manager with automatic Gmail invitation
 */
router.post('/workers', async (req, res) => {
  try {
    const {
      fullName,
      email,
      mobileNumber,
      address = '',
      workerId,
      jobRole = 'Solar Installation Technician',
      department = 'Rooftop Solar Installation',
      joiningDate = '',
      assignedManagerId,
      salary = 28000,
      status = 'pending_activation'
    } = req.body;

    if (!fullName || !mobileNumber) {
      return res.status(400).json({ message: 'Worker Full Name and Mobile Number are required.' });
    }

    const cleanMobile = String(mobileNumber).trim().replace(/^\+?91/, '').replace(/^0+/, '').replace(/[\s-]/g, '');
    const cleanEmail = email ? String(email).trim().toLowerCase() : '';

    if (cleanMobile.length < 10) {
      return res.status(400).json({ message: 'Please enter a valid 10-digit mobile number.' });
    }

    const allEmployees = await db.find('employees');
    const duplicateMobile = allEmployees.find(e => {
      const eMob = String(e.mobileNumber || '').replace(/^\+?91/, '').replace(/^0+/, '').replace(/[\s-]/g, '');
      return eMob === cleanMobile;
    });

    if (duplicateMobile) {
      return res.status(400).json({ message: `Worker with mobile ${cleanMobile} already exists (${duplicateMobile.fullName} - ${duplicateMobile.employeeId}).` });
    }

    if (cleanEmail) {
      const duplicateEmail = allEmployees.find(e => String(e.email || '').toLowerCase() === cleanEmail);
      if (duplicateEmail) {
        return res.status(400).json({ message: `Worker with Gmail ${cleanEmail} is already registered.` });
      }
    }

    // Generate Worker ID if not supplied
    let targetWorkerId = workerId ? String(workerId).trim() : '';
    if (!targetWorkerId) {
      let maxNum = 1001;
      allEmployees.forEach(e => {
        if (e.employeeId && e.employeeId.startsWith('EMP-')) {
          const num = parseInt(e.employeeId.replace('EMP-', ''), 10);
          if (!isNaN(num) && num >= maxNum) maxNum = num + 1;
        }
      });
      targetWorkerId = `EMP-${maxNum}`;
    }

    const managerId = assignedManagerId || req.user?.employeeId || 'MGR-1001';
    const managerName = req.user?.fullName || req.user?.username || 'Team Manager';
    const nowIso = new Date().toISOString();

    const newWorker = await db.create('employees', {
      employeeId: targetWorkerId,
      fullName: String(fullName).trim(),
      email: cleanEmail,
      mobileNumber: cleanMobile,
      address: String(address || '').trim(),
      role: 'worker',
      designation: jobRole,
      department,
      joiningDate: joiningDate || new Date().toISOString().split('T')[0],
      managerId,
      managerName,
      salary: Number(salary) || 28000,
      status: cleanEmail ? 'pending_activation' : (status || 'active'),
      registeredBy: 'manager',
      createdById: req.user?.employeeId || req.user?.userId || 'MGR-1001',
      createdByName: managerName,
      createdAt: nowIso,
      updatedAt: nowIso
    });

    // Send Gmail invitation
    let invitationSent = false;
    if (cleanEmail) {
      const activationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      await db.create('account_invitations', {
        token: activationToken,
        invitationType: 'worker',
        targetId: targetWorkerId,
        fullName: String(fullName).trim(),
        email: cleanEmail,
        mobileNumber: cleanMobile,
        createdById: managerId,
        createdByName: managerName,
        createdByRole: req.user?.role || 'manager',
        status: 'pending',
        expiresAt,
        createdAt: nowIso,
        updatedAt: nowIso
      });

      const emailResult = await sendAccountInvitationEmail({
        to: cleanEmail,
        fullName: String(fullName).trim(),
        category: 'Worker',
        registrationId: targetWorkerId,
        activationToken,
        invitedByName: managerName,
        invitedByRole: 'Manager'
      });

      invitationSent = emailResult.success !== false;
    }

    await db.create('account_activity_logs', {
      action: 'ACCOUNT_INVITATION_SENT',
      performedByRole: req.user?.role || 'manager',
      performedById: managerId,
      performedByName: managerName,
      targetId: targetWorkerId,
      targetType: 'worker',
      details: {
        workerId: targetWorkerId,
        fullName,
        email: cleanEmail,
        role: jobRole,
        department,
        invitationSent
      },
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      timestamp: nowIso
    }).catch(() => {});

    // Notify Owner
    await db.create('notifications', {
      role: 'admin',
      type: 'WORKER_REGISTERED_BY_MANAGER',
      title: `👷 New Worker Added: ${fullName}`,
      message: `Manager ${managerName} onboarded worker ${fullName} (${targetWorkerId}) in ${department}.${cleanEmail ? ' Gmail activation link sent.' : ''}`,
      employeeId: targetWorkerId,
      read: false,
      createdAt: nowIso
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: `Worker ${fullName} successfully registered (${targetWorkerId})!${cleanEmail ? ' Gmail account invitation sent.' : ''}`,
      worker: newWorker,
      invitationSent
    });
  } catch (err) {
    console.error('Register worker error:', err);
    res.status(500).json({ message: `Worker registration failed: ${err.message}` });
  }
});

/**
 * 8. GET /api/manager/workers
 * List workers with assigned customers count and performance metrics
 */
router.get('/workers', async (req, res) => {
  try {
    const { search, department, status } = req.query;
    const [allEmployees, allCustomers, allTasks, allInvitations] = await Promise.all([
      db.find('employees'),
      db.find('customers'),
      db.find('tasks'),
      db.find('account_invitations')
    ]);

    let workers = allEmployees.filter(e => e.role === 'worker');

    if (department && department !== 'all') {
      workers = workers.filter(w => w.department === department);
    }

    if (status && status !== 'all') {
      workers = workers.filter(w => w.status === status);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      workers = workers.filter(w =>
        (w.fullName && w.fullName.toLowerCase().includes(q)) ||
        (w.employeeId && w.employeeId.toLowerCase().includes(q)) ||
        (w.email && w.email.toLowerCase().includes(q)) ||
        (w.mobileNumber && w.mobileNumber.includes(q)) ||
        (w.designation && w.designation.toLowerCase().includes(q))
      );
    }

    const enhanced = workers.map(w => {
      const wCustomers = allCustomers.filter(c => c.assignedWorkerId === w.employeeId);
      const wTasks = allTasks.filter(t => t.assigneeId === w.employeeId);
      const wCompleted = wTasks.filter(t => t.status === 'approved').length;
      const inv = allInvitations.filter(i => i.targetId === w.employeeId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      return {
        ...w,
        assignedCustomersCount: wCustomers.length,
        totalTasks: wTasks.length,
        completedTasks: wCompleted,
        pendingTasks: wTasks.length - wCompleted,
        completionRate: wTasks.length > 0 ? Math.round((wCompleted / wTasks.length) * 100) : 100,
        invitationStatus: inv ? inv.status : (w.status === 'active' ? 'activated' : 'none'),
        invitationSentAt: inv?.createdAt || null
      };
    });

    res.json(enhanced);
  } catch (err) {
    console.error('Fetch manager workers error:', err);
    res.status(500).json({ message: 'Failed to load workers' });
  }
});

/**
 * 9. POST /api/manager/workers/:id/resend-invite
 * Resend activation invitation email to Worker's Gmail
 */
router.post('/workers/:id/resend-invite', async (req, res) => {
  try {
    const { id } = req.params;
    const worker = await db.findOne('employees', { _id: id }) || await db.findOne('employees', { employeeId: id });

    if (!worker) return res.status(404).json({ message: 'Worker record not found' });
    if (!worker.email || !worker.email.includes('@')) {
      return res.status(400).json({ message: 'No registered Gmail address found for this worker.' });
    }

    const activationToken = crypto.randomBytes(32).toString('hex');
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await db.create('account_invitations', {
      token: activationToken,
      invitationType: 'worker',
      targetId: worker.employeeId,
      fullName: worker.fullName,
      email: worker.email,
      mobileNumber: worker.mobileNumber,
      createdById: req.user?.employeeId || 'MGR-1001',
      createdByName: req.user?.fullName || 'Manager',
      createdByRole: req.user?.role || 'manager',
      status: 'pending',
      expiresAt,
      createdAt: nowIso,
      updatedAt: nowIso
    });

    await sendAccountInvitationEmail({
      to: worker.email,
      fullName: worker.fullName,
      category: 'Worker',
      registrationId: worker.employeeId,
      activationToken,
      invitedByName: req.user?.fullName || 'Team Manager',
      invitedByRole: 'Manager'
    });

    res.json({
      success: true,
      message: `Fresh account activation link sent to ${worker.email}!`
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to resend worker invitation' });
  }
});

/**
 * 10. POST /api/manager/workers/:id/toggle-status
 * Enable or Disable worker account
 */
router.post('/workers/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const worker = await db.findOne('employees', { _id: id }) || await db.findOne('employees', { employeeId: id });
    if (!worker) return res.status(404).json({ message: 'Worker not found' });

    const newStatus = status || (worker.status === 'active' ? 'disabled' : 'active');
    const nowIso = new Date().toISOString();

    await db.updateOne('employees', { _id: worker._id }, {
      status: newStatus,
      updatedAt: nowIso
    });

    await db.updateOne('users', { employeeId: worker.employeeId }, {
      status: newStatus,
      updatedAt: nowIso
    });

    await db.create('account_activity_logs', {
      action: newStatus === 'active' ? 'ACCOUNT_REACTIVATED' : 'ACCOUNT_DISABLED',
      performedByRole: req.user?.role || 'manager',
      performedById: req.user?.employeeId || req.user?.userId,
      performedByName: req.user?.fullName,
      targetId: worker.employeeId,
      targetType: 'worker',
      details: { previousStatus: worker.status, newStatus },
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      timestamp: nowIso
    }).catch(() => {});

    res.json({
      success: true,
      message: `Worker account ${worker.employeeId} is now ${newStatus}.`,
      status: newStatus
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update worker status' });
  }
});

/**
 * 11. GET /api/manager/accounts
 * Centralized User ID & Credential Management overview for Managers
 */
router.get('/accounts', async (req, res) => {
  try {
    const { search, role, status } = req.query;
    const [allUsers, allEmployees, allCustomers, allInvitations] = await Promise.all([
      db.find('users'),
      db.find('employees'),
      db.find('customers'),
      db.find('account_invitations')
    ]);

    const accounts = [];

    // 1. Customers
    allCustomers.forEach(c => {
      const user = allUsers.find(u => u.customerId === c.customerId);
      const inv = allInvitations.filter(i => i.targetId === c.customerId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      accounts.push({
        id: c._id,
        identifier: c.customerId,
        fullName: c.fullName,
        username: user?.username || c.loginUsername || null,
        email: c.email || '—',
        mobileNumber: c.mobileNumber,
        role: 'customer',
        accountStatus: c.accountStatus || (user ? 'Active' : 'Pending Activation'),
        invitationStatus: inv ? inv.status : (user ? 'activated' : 'none'),
        passwordLastChanged: user?.passwordLastChanged || null,
        createdByName: c.createdByName || 'Admin',
        createdAt: c.createdAt
      });
    });

    // 2. Workers
    allEmployees.filter(e => e.role === 'worker').forEach(w => {
      const user = allUsers.find(u => u.employeeId === w.employeeId);
      const inv = allInvitations.filter(i => i.targetId === w.employeeId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      accounts.push({
        id: w._id,
        identifier: w.employeeId,
        fullName: w.fullName,
        username: user?.username || w.username || null,
        email: w.email || '—',
        mobileNumber: w.mobileNumber,
        role: 'worker',
        department: w.department,
        designation: w.designation,
        accountStatus: w.status === 'active' ? 'Active' : (w.status === 'disabled' ? 'Disabled' : 'Pending Activation'),
        invitationStatus: inv ? inv.status : (w.status === 'active' ? 'activated' : 'none'),
        passwordLastChanged: w.passwordLastChanged || user?.passwordLastChanged || null,
        createdByName: w.createdByName || 'Admin',
        createdAt: w.createdAt
      });
    });

    let filtered = accounts;

    if (role && role !== 'all') {
      filtered = filtered.filter(a => a.role === role);
    }

    if (status && status !== 'all') {
      filtered = filtered.filter(a => a.accountStatus.toLowerCase() === status.toLowerCase());
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(a =>
        (a.fullName && a.fullName.toLowerCase().includes(q)) ||
        (a.identifier && a.identifier.toLowerCase().includes(q)) ||
        (a.username && a.username.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q)) ||
        (a.mobileNumber && a.mobileNumber.includes(q))
      );
    }

    filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json(filtered);
  } catch (err) {
    console.error('Fetch accounts error:', err);
    res.status(500).json({ message: 'Failed to load accounts' });
  }
});

/**
 * 12. GET /api/manager/email-notifications
 * History of account invitations and system emails
 */
router.get('/email-notifications', async (req, res) => {
  try {
    const notifications = await db.find('email_notifications');
    notifications.sort((a, b) => new Date(b.sentAt || 0) - new Date(a.sentAt || 0));
    res.json(notifications.slice(0, 100));
  } catch (err) {
    res.status(500).json({ message: 'Failed to load email logs' });
  }
});

/**
 * 13. GET /api/manager/activity-logs
 * Audit history of Manager actions
 */
router.get('/activity-logs', async (req, res) => {
  try {
    const logs = await db.find('account_activity_logs');
    logs.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    res.json(logs.slice(0, 100));
  } catch (err) {
    res.status(500).json({ message: 'Failed to load activity logs' });
  }
});

export default router;