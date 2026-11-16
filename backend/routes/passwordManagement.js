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
        email: e.email,
        status: e.status || 'active',
        passwordLastChanged: e.passwordLastChanged || null,
        isDefaultPassword: Boolean(!e.passwordLastChanged || e.isDefaultPassword),
        mustChangePassword: Boolean(e.mustChangePassword)
      });
    });

    // 3. Customers
    allUsers.filter(u => u.role === 'customer').forEach(u => {
      const custDetail = allCustomers.find(c => c.customerId === u.customerId);
      unifiedAccounts.push({
        id: u._id,
        source: 'users',
        name: custDetail ? custDetail.fullName : u.username,
        username: u.username,
        identifier: u.customerId || u.username,
        role: 'customer',
        department: 'Customer Portal',
        designation: 'Solar System Owner',
        mobileNumber: custDetail ? custDetail.mobileNumber : '',
        status: 'active',
        passwordLastChanged: u.passwordLastChanged || custDetail?.passwordLastChanged || null,
        isDefaultPassword: Boolean(!u.passwordLastChanged || u.isDefaultPassword),
        mustChangePassword: Boolean(u.mustChangePassword)
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

export default router;
