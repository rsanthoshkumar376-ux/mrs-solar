import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../database/db.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Strict Owner Authorization for all Password Management routes
router.use(authenticateToken);
router.use(authorizeRole(['admin']));

/**
 * GET /api/admin/password-management/summary
 * Returns top-level metrics for the Owner Security & Password Management Dashboard
 */
router.get('/summary', async (req, res) => {
  try {
    const allUsers = await db.find('users');
    const allEmployees = await db.find('employees');
    const allCustomers = await db.find('customers');
    const logs = await db.find('password_change_logs');

    // Aggregate user accounts
    const ownerAccounts = allUsers.filter(u => u.role === 'admin');
    const managerAccounts = allEmployees.filter(e => e.role === 'manager' && e.status !== 'inactive');
    const workerAccounts = allEmployees.filter(e => e.role === 'worker' && e.status !== 'inactive');
    const customerAccounts = allUsers.filter(u => u.role === 'customer');

    const totalUsers = ownerAccounts.length + managerAccounts.length + workerAccounts.length + customerAccounts.length;

    // Filter logs for today & last 7 days
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const successfulLogs = logs.filter(l => l.changeStatus === 'Completed');
    const changesToday = successfulLogs.filter(l => l.changedAt && l.changedAt.startsWith(todayStr)).length;
    const recentChanges = successfulLogs.filter(l => l.changedAt && new Date(l.changedAt) >= sevenDaysAgo).length;

    // Accounts requiring password reset or using default/initial password
    let accountsRequiringReset = 0;
    
    // Check employees with default password or un-updated
    allEmployees.forEach(e => {
      if (e.status !== 'inactive' && (!e.passwordLastChanged || e.isDefaultPassword || e.mustChangePassword)) {
        accountsRequiringReset++;
      }
    });

    // Check customers with default/un-updated password
    allUsers.forEach(u => {
      if (u.role === 'customer' && (!u.passwordLastChanged || u.isDefaultPassword || u.mustChangePassword)) {
        accountsRequiringReset++;
      }
    });

    res.json({
      totalUsers,
      changesToday,
      recentChanges,
      accountsRequiringReset,
      roleCounts: {
        owner: ownerAccounts.length,
        manager: managerAccounts.length,
        worker: workerAccounts.length,
        customer: customerAccounts.length
      }
    });
  } catch (err) {
    console.error('Password management summary error:', err);
    res.status(500).json({ message: 'Failed to load password management summary' });
  }
});

/**
 * GET /api/admin/password-management/users
 * Returns list of user accounts with password change metadata (NEVER exposes passwords or hashes)
 */
router.get('/users', async (req, res) => {
  try {
    const { role, search, status } = req.query;

    const allUsers = await db.find('users');
    const allEmployees = await db.find('employees');
    const allCustomers = await db.find('customers');

    // Build unified account list
    const unifiedAccounts = [];

    // 1. Owner accounts
    allUsers.filter(u => u.role === 'admin').forEach(u => {
      unifiedAccounts.push({
        id: u._id,
        source: 'users',
        name: u.fullName || 'MRS Associates Admin',
        username: u.username,
        identifier: u.username,
        role: 'admin',
        department: 'Executive / Owner',
        designation: 'Super Admin',
        status: 'active',
        passwordLastChanged: u.passwordLastChanged || null,
        isDefaultPassword: Boolean(u.isDefaultPassword),
        mustChangePassword: Boolean(u.mustChangePassword)
      });
    });

    // 2. Employees (Managers and Workers)
    allEmployees.forEach(e => {
      unifiedAccounts.push({
        id: e._id,
        source: 'employees',
        name: e.fullName,
        username: e.username || e.employeeId,
        identifier: e.employeeId,
        role: e.role || 'worker',
        department: e.department || 'Operations',
        designation: e.designation || (e.role === 'manager' ? 'Team Manager' : 'Solar Technician'),
        mobileNumber: e.mobileNumber,
        email: e.email || '—',
        status: e.status || 'active',
        createdByName: e.createdByName || 'Owner / Super Admin',
        createdById: e.createdById || 'Admin',
        registeredBy: e.registeredBy || 'admin',
        passwordLastChanged: e.passwordLastChanged || null,
        isDefaultPassword: Boolean(!e.passwordLastChanged || e.isDefaultPassword),
        mustChangePassword: Boolean(e.mustChangePassword)
      });
    });

    // 3. Customers (All registered customers, with or without completed user account)
    allCustomers.forEach(c => {
      const user = allUsers.find(u => u.customerId === c.customerId);
      const isPending = c.accountStatus === 'Pending Activation' || (!user && !c.loginUsername);
      const isDisabled = c.accountStatus === 'Disabled' || user?.status === 'disabled';

      unifiedAccounts.push({
        id: user?._id || c._id,
        source: user ? 'users' : 'customers',
        name: c.fullName,
        username: user?.username || c.loginUsername || c.customerId,
        identifier: c.customerId,
        role: 'customer',
        department: 'Customer Portal',
        designation: `${c.systemCapacity || 3} kW Rooftop Solar`,
        mobileNumber: c.mobileNumber || '',
        email: c.email || user?.email || '—',
        status: isDisabled ? 'disabled' : (isPending ? 'pending_activation' : 'active'),
        createdByName: c.createdByName || 'Owner / Direct',
        createdById: c.createdById || 'Admin',
        registeredBy: c.registeredBy || 'admin',
        passwordLastChanged: user?.passwordLastChanged || c.passwordLastChanged || null,
        isDefaultPassword: Boolean(!user?.passwordLastChanged || user?.isDefaultPassword),
        mustChangePassword: Boolean(user?.mustChangePassword)
      });
    });

    // Apply role filter
    let filtered = unifiedAccounts;
    if (role && role !== 'all') {
      filtered = filtered.filter(a => a.role === role);
    }

    // Apply search filter (name, username, identifier, mobile)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(a => 
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.username && a.username.toLowerCase().includes(q)) ||
        (a.identifier && a.identifier.toLowerCase().includes(q)) ||
        (a.mobileNumber && a.mobileNumber.includes(q))
      );
    }

    // Apply status filter
    if (status === 'changed') {
      filtered = filtered.filter(a => Boolean(a.passwordLastChanged) && !a.isDefaultPassword);
    } else if (status === 'default') {
      filtered = filtered.filter(a => !a.passwordLastChanged || a.isDefaultPassword);
    } else if (status === 'reset_required') {
      filtered = filtered.filter(a => a.mustChangePassword);
    }

    res.json(filtered);
  } catch (err) {
    console.error('Password management users error:', err);
    res.status(500).json({ message: 'Failed to load user accounts' });
  }
});

/**
 * GET /api/admin/password-management/logs
 * Returns audit history of password changes
 */
router.get('/logs', async (req, res) => {
  try {
    const { role, search, limit = 50 } = req.query;
    const logs = await db.find('password_change_logs');

    let filtered = logs;

    if (role && role !== 'all') {
      filtered = filtered.filter(l => l.userRole === role);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(l =>
        (l.userName && l.userName.toLowerCase().includes(q)) ||
        (l.username && l.username.toLowerCase().includes(q)) ||
        (l.failureReason && l.failureReason.toLowerCase().includes(q)) ||
        (l.ipAddress && l.ipAddress.includes(q))
      );
    }

    // Sort newest first
    filtered.sort((a, b) => new Date(b.changedAt || 0) - new Date(a.changedAt || 0));

    res.json(filtered.slice(0, Number(limit)));
  } catch (err) {
    console.error('Password management logs error:', err);
    res.status(500).json({ message: 'Failed to load password change logs' });
  }
});

/**
 * POST /api/admin/password-management/reset-user
 * Owner-initiated administrative password reset
 */
router.post('/reset-user', async (req, res) => {
  try {
    const { targetUserId, targetRole, newPassword } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ message: 'Target user ID is required' });
    }

    // Generate random strong temporary password if not provided
    const tempPassword = newPassword && newPassword.length >= 8 
      ? newPassword 
      : `Solar@${Math.floor(1000 + Math.random() * 9000)}`;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);
    const nowIso = new Date().toISOString();

    let targetUser = null;
    let identifier = '';
    let displayName = '';

    if (targetRole === 'admin') {
      targetUser = await db.findOne('users', { _id: targetUserId });
      if (targetUser) {
        identifier = targetUser.username;
        displayName = targetUser.fullName || targetUser.username;
        await db.updateOne('users', { _id: targetUser._id }, {
          password: hashedPassword,
          passwordLastChanged: nowIso,
          mustChangePassword: true,
          isDefaultPassword: false
        });
      }
    } else if (targetRole === 'customer') {
      targetUser = await db.findOne('users', { _id: targetUserId }) || await db.findOne('users', { customerId: targetUserId });
      if (targetUser) {
        identifier = targetUser.customerId || targetUser.username;
        displayName = targetUser.username;
        await db.updateOne('users', { _id: targetUser._id }, {
          password: hashedPassword,
          passwordLastChanged: nowIso,
          mustChangePassword: true,
          isDefaultPassword: false
        });
      }
    } else {
      // Manager or Worker (employees collection)
      targetUser = await db.findOne('employees', { _id: targetUserId }) || await db.findOne('employees', { employeeId: targetUserId });
      if (targetUser) {
        identifier = targetUser.employeeId;
        displayName = targetUser.fullName;
        await db.updateOne('employees', { _id: targetUser._id }, {
          password: hashedPassword,
          passwordLastChanged: nowIso,
          mustChangePassword: true,
          isDefaultPassword: false
        });
      }
    }

    if (!targetUser) {
      return res.status(404).json({ message: 'User account not found' });
    }

    // Record in password_change_logs
    await db.create('password_change_logs', {
      userId: targetUser._id,
      userName: displayName,
      username: identifier,
      userRole: targetRole || targetUser.role || 'user',
      changeStatus: 'Completed',
      activity: 'Administrative Password Reset by Owner',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      changedAt: nowIso
    });

    // Record in audit logs
    await db.create('audit_logs', {
      action: 'ADMIN_PASSWORD_RESET',
      target: identifier,
      performedBy: req.user.username || 'Owner / Admin',
      details: { role: targetRole, targetUserId },
      createdAt: nowIso
    }).catch(() => {});

    // Notify user on their account
    if (targetRole === 'customer' && targetUser.customerId) {
      await db.create('notifications', {
        role: 'customer',
        customerId: targetUser.customerId,
        type: 'SECURITY_ALERT',
        title: 'Your Password Has Been Reset by Admin',
        message: 'An administrator has reset your password. Please log in using your temporary password and set a new password immediately.',
        read: false,
        createdAt: nowIso
      }).catch(() => {});
    } else if (targetUser.employeeId) {
      await db.create('notifications', {
        role: targetRole,
        recipientId: targetUser.employeeId,
        type: 'SECURITY_ALERT',
        title: 'Your Workforce Password Was Reset',
        message: 'An administrator has updated your password. Please log in and set a custom secure password.',
        read: false,
        createdAt: nowIso
      }).catch(() => {});
    }

    res.json({
      success: true,
      message: `Password reset successfully for ${displayName} (${identifier}).`,
      tempPassword
    });
  } catch (err) {
    console.error('Reset user password error:', err);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

/**
 * PUT /api/admin/password-management/change-username
 * Owner changes customer or worker User ID
 */
router.put('/change-username', async (req, res) => {
  try {
    const { targetUserId, targetRole, newUsername } = req.body;

    if (!targetUserId || !newUsername) {
      return res.status(400).json({ message: 'Target user ID and new User ID are required' });
    }

    const cleanUsername = String(newUsername).trim();
    if (cleanUsername.length < 3) {
      return res.status(400).json({ message: 'User ID must be at least 3 characters long' });
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      return res.status(400).json({ message: 'User ID can only contain letters, numbers, hyphens, periods, and underscores' });
    }

    const norm = cleanUsername.toLowerCase();
    const nowIso = new Date().toISOString();

    // Check uniqueness across users and employees
    const allUsers = await db.find('users');
    const duplicateUser = allUsers.find(u => u.username && u.username.toLowerCase() === norm && u._id !== targetUserId);
    if (duplicateUser) {
      return res.status(400).json({ message: `User ID "${cleanUsername}" is already in use by another user.` });
    }

    let previousUsername = '';
    let targetName = '';

    if (targetRole === 'customer') {
      const user = await db.findOne('users', { _id: targetUserId }) || await db.findOne('users', { customerId: targetUserId });
      const customer = await db.findOne('customers', { customerId: targetUserId }) || (user?.customerId ? await db.findOne('customers', { customerId: user.customerId }) : null);

      if (user) {
        previousUsername = user.username;
        targetName = user.fullName || user.username;
        await db.updateOne('users', { _id: user._id }, {
          username: cleanUsername,
          updatedAt: nowIso
        });
      }
      if (customer) {
        if (!targetName) targetName = customer.fullName;
        if (!previousUsername) previousUsername = customer.loginUsername || customer.customerId;
        await db.updateOne('customers', { _id: customer._id }, {
          loginUsername: cleanUsername,
          updatedAt: nowIso
        });
      }
    } else {
      // Manager or Worker
      const employee = await db.findOne('employees', { _id: targetUserId }) || await db.findOne('employees', { employeeId: targetUserId });
      const user = await db.findOne('users', { employeeId: targetUserId }) || (employee?.employeeId ? await db.findOne('users', { employeeId: employee.employeeId }) : null);

      if (employee) {
        previousUsername = employee.username || employee.employeeId;
        targetName = employee.fullName;
        await db.updateOne('employees', { _id: employee._id }, {
          username: cleanUsername,
          updatedAt: nowIso
        });
      }
      if (user) {
        if (!previousUsername) previousUsername = user.username;
        if (!targetName) targetName = user.fullName || user.username;
        await db.updateOne('users', { _id: user._id }, {
          username: cleanUsername,
          updatedAt: nowIso
        });
      }
    }

    // Log in account_activity_logs
    await db.create('account_activity_logs', {
      action: 'USER_ID_CHANGED',
      performedByRole: 'admin',
      performedById: req.user.username || 'Owner',
      performedByName: req.user.fullName || 'Main Owner',
      targetId: targetUserId,
      targetType: targetRole || 'user',
      details: {
        previousUsername,
        newUsername: cleanUsername,
        targetName
      },
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      timestamp: nowIso
    }).catch(() => {});

    // Log in audit_logs
    await db.create('audit_logs', {
      action: 'ADMIN_USERNAME_CHANGE',
      target: cleanUsername,
      performedBy: req.user.username || 'Owner',
      details: { targetUserId, targetRole, previousUsername, newUsername: cleanUsername },
      createdAt: nowIso
    }).catch(() => {});

    res.json({
      success: true,
      message: `User ID for ${targetName || targetUserId} successfully updated to "${cleanUsername}".`,
      newUsername: cleanUsername
    });
  } catch (err) {
    console.error('Change username error:', err);
    res.status(500).json({ message: 'Failed to change User ID' });
  }
});

/**
 * POST /api/admin/password-management/toggle-status
 * Owner enables or disables account
 */
router.post('/toggle-status', async (req, res) => {
  try {
    const { targetUserId, targetRole, status } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ message: 'Target user ID is required' });
    }

    const nowIso = new Date().toISOString();
    let targetName = '';

    if (targetRole === 'customer') {
      const customer = await db.findOne('customers', { customerId: targetUserId }) || await db.findOne('customers', { _id: targetUserId });
      const user = await db.findOne('users', { customerId: targetUserId }) || await db.findOne('users', { _id: targetUserId });

      const newStatus = status || (customer?.accountStatus === 'Active' ? 'Disabled' : 'Active');
      if (customer) {
        targetName = customer.fullName;
        await db.updateOne('customers', { _id: customer._id }, { accountStatus: newStatus, updatedAt: nowIso });
      }
      if (user) {
        if (!targetName) targetName = user.fullName || user.username;
        await db.updateOne('users', { _id: user._id }, { status: newStatus.toLowerCase(), updatedAt: nowIso });
      }

      await db.create('account_activity_logs', {
        action: newStatus === 'Active' ? 'ACCOUNT_REACTIVATED' : 'ACCOUNT_DISABLED',
        performedByRole: 'admin',
        performedById: req.user.username,
        performedByName: 'Main Owner',
        targetId: targetUserId,
        targetType: 'customer',
        details: { targetName, newStatus },
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
        timestamp: nowIso
      }).catch(() => {});

      return res.json({ success: true, message: `Account is now ${newStatus}.`, status: newStatus });
    } else {
      // Employee / Worker / Manager
      const employee = await db.findOne('employees', { employeeId: targetUserId }) || await db.findOne('employees', { _id: targetUserId });
      const user = await db.findOne('users', { employeeId: targetUserId }) || await db.findOne('users', { _id: targetUserId });

      const newStatus = status || (employee?.status === 'active' ? 'disabled' : 'active');
      if (employee) {
        targetName = employee.fullName;
        await db.updateOne('employees', { _id: employee._id }, { status: newStatus, updatedAt: nowIso });
      }
      if (user) {
        if (!targetName) targetName = user.fullName || user.username;
        await db.updateOne('users', { _id: user._id }, { status: newStatus, updatedAt: nowIso });
      }

      await db.create('account_activity_logs', {
        action: newStatus === 'active' ? 'ACCOUNT_REACTIVATED' : 'ACCOUNT_DISABLED',
        performedByRole: 'admin',
        performedById: req.user.username,
        performedByName: 'Main Owner',
        targetId: targetUserId,
        targetType: targetRole || 'employee',
        details: { targetName, newStatus },
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
        timestamp: nowIso
      }).catch(() => {});

      return res.json({ success: true, message: `Account is now ${newStatus}.`, status: newStatus });
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to update account status' });
  }
});

/**
 * GET /api/admin/password-management/activity-logs
 * Full Manager & System activity audit logs for Owner monitoring
 */
router.get('/activity-logs', async (req, res) => {
  try {
    const logs = await db.find('account_activity_logs');
    logs.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    res.json(logs.slice(0, 150));
  } catch (err) {
    res.status(500).json({ message: 'Failed to load activity logs' });
  }
});

export default router;
