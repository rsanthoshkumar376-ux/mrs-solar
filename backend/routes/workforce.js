import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../database/db.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// ─── INITIAL SEEDING HELPER ─────────────────────────────────────────────────
export async function seedWorkforceDefaults() {
  try {
    // 1. Departments
    const existingDeps = await db.find('departments');
    const defaultDepartments = [
      { departmentId: 'DEP-101', name: 'Sales & Customer Outreach', description: 'Lead conversion, site visits, and solar proposals' },
      { departmentId: 'DEP-102', name: 'Site Survey & Engineering', description: 'Rooftop shadow analysis, measurements, and CAD designs' },
      { departmentId: 'DEP-103', name: 'Rooftop Solar Installation', description: 'Tier-1 panel mounting, inverter wiring, and grounding' },
      { departmentId: 'DEP-104', name: 'Net-Metering & EB Liaison', description: 'TANGEDCO approvals, bi-directional meters, and commissioning' },
      { departmentId: 'DEP-105', name: 'Customer Support & Service', description: 'Preventive maintenance, generation checks, and complaints' }
    ];
    for (const d of defaultDepartments) {
      const exists = existingDeps.find(ed => ed.departmentId === d.departmentId || ed.name === d.name);
      if (!exists) {
        await db.create('departments', d);
      }
    }

    // 2. Employees & Teams
    const existingEmployees = await db.find('employees');
    const salt = await bcrypt.genSalt(10);
    const managerPass = await bcrypt.hash('manager123', salt);
    const workerPass = await bcrypt.hash('worker123', salt);

    const defaultEmployees = [
      {
        employeeId: 'MGR-1001',
        username: 'suresh_mgr',
        fullName: 'Suresh Kumar',
        email: 'suresh.manager@mrssolar.com',
        mobileNumber: '9840123456',
        role: 'manager',
        department: 'Sales & Customer Outreach',
        designation: 'Senior Sales & Operations Manager',
        joiningDate: '2025-01-10',
        managerId: '',
        managerName: 'Direct to Owner',
        status: 'active',
        password: managerPass
      },
      {
        employeeId: 'EMP-1001',
        username: 'karthik_worker',
        fullName: 'Karthik Raja',
        email: 'karthik.solar@mrssolar.com',
        mobileNumber: '9840987654',
        role: 'worker',
        department: 'Sales & Customer Outreach',
        designation: 'Solar Technical Consultant',
        managerId: 'MGR-1001',
        managerName: 'Suresh Kumar',
        joiningDate: '2025-02-01',
        status: 'active',
        password: workerPass
      },
      {
        employeeId: 'EMP-1002',
        username: 'praveen_solar',
        fullName: 'Praveen Raj',
        email: 'praveen.install@mrssolar.com',
        mobileNumber: '9840554433',
        role: 'worker',
        department: 'Rooftop Solar Installation',
        designation: 'Senior Installation Engineer',
        managerId: 'MGR-1001',
        managerName: 'Suresh Kumar',
        joiningDate: '2025-02-15',
        status: 'active',
        password: workerPass
      },
      {
        employeeId: 'EMP-1003',
        username: 'ramesh_survey',
        fullName: 'Ramesh V',
        email: 'ramesh.survey@mrssolar.com',
        mobileNumber: '9840223344',
        role: 'worker',
        department: 'Site Survey & Engineering',
        designation: 'Solar CAD & Shadow Survey Engineer',
        managerId: 'MGR-1001',
        managerName: 'Suresh Kumar',
        joiningDate: '2025-03-01',
        status: 'active',
        password: workerPass
      },
      {
        employeeId: 'EMP-1004',
        username: 'anitha_eb',
        fullName: 'Anitha S',
        email: 'anitha.liaison@mrssolar.com',
        mobileNumber: '9840778899',
        role: 'worker',
        department: 'Net-Metering & EB Liaison',
        designation: 'TANGEDCO Net-Metering Liaison Officer',
        managerId: 'MGR-1001',
        managerName: 'Suresh Kumar',
        joiningDate: '2025-03-15',
        status: 'active',
        password: workerPass
      },
      {
        employeeId: 'EMP-1005',
        username: 'vignesh_service',
        fullName: 'Vignesh M',
        email: 'vignesh.service@mrssolar.com',
        mobileNumber: '9840332211',
        role: 'worker',
        department: 'Customer Support & Service',
        designation: 'Preventive Maintenance & Support Engineer',
        managerId: 'MGR-1001',
        managerName: 'Suresh Kumar',
        joiningDate: '2025-04-01',
        status: 'active',
        password: workerPass
      }
    ];

    for (const def of defaultEmployees) {
      const match = existingEmployees.find(e => 
        (e.employeeId && e.employeeId.toUpperCase() === def.employeeId.toUpperCase()) || 
        (e.username && e.username.toLowerCase() === def.username.toLowerCase()) ||
        (e.mobileNumber && e.mobileNumber === def.mobileNumber)
      );
      if (!match) {
        await db.create('employees', def);
      } else if (!match.department || !match.designation || !match.mobileNumber) {
        await db.updateOne('employees', { _id: match._id }, {
          department: match.department || def.department,
          designation: match.designation || def.designation,
          mobileNumber: match.mobileNumber || def.mobileNumber,
          email: match.email || def.email,
          managerId: match.managerId || def.managerId,
          managerName: match.managerName || def.managerName,
          joiningDate: match.joiningDate || def.joiningDate
        });
      }
    }

    // Backfill any test employees if needed
    for (const emp of existingEmployees) {
      if (emp.employeeId === 'MGR-TEST-01' && (!emp.department || !emp.designation)) {
        await db.updateOne('employees', { _id: emp._id }, {
          department: 'Sales & Customer Outreach',
          designation: 'Regional Team Supervisor',
          mobileNumber: emp.mobileNumber || '9840000001',
          email: emp.email || 'testmanager@mrssolar.com',
          managerName: 'Direct to Owner'
        });
      }
      if (emp.employeeId === 'WRK-TEST-01' && (!emp.department || !emp.designation)) {
        await db.updateOne('employees', { _id: emp._id }, {
          department: 'Rooftop Solar Installation',
          designation: 'Junior Site Technician',
          mobileNumber: emp.mobileNumber || '9840000002',
          email: emp.email || 'testworker@mrssolar.com',
          managerId: 'MGR-TEST-01',
          managerName: 'Test Manager User'
        });
      }
    }

    // Ensure TEAM-101 exists
    const existingTeams = await db.find('teams');
    if (existingTeams.length === 0) {
      await db.create('teams', {
        teamId: 'TEAM-101',
        teamName: 'Thiruvallur Solar Champions',
        department: 'Sales & Customer Outreach',
        managerId: 'MGR-1001',
        managerName: 'Suresh Kumar',
        memberIds: ['EMP-1001', 'EMP-1002', 'EMP-1003', 'EMP-1004', 'EMP-1005'],
        description: 'Primary customer survey & rooftop commissioning squad'
      });
    }

    // Ensure targets exist
    const existingTargets = await db.find('targets');
    if (existingTargets.length === 0) {
      await db.create('targets', {
        targetId: 'TGT-1001',
        title: 'Monthly Customer Rooftop Feasibility Surveys',
        period: 'Monthly',
        month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        category: 'Site inspections',
        targetValue: 20,
        approvedCount: 14,
        unit: 'Surveys',
        assignedType: 'Employee',
        assignedToId: 'EMP-1001',
        assignedToName: 'Karthik Raja',
        managerId: 'MGR-1001',
        status: 'In Progress',
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()
      });

      await db.create('targets', {
        targetId: 'TGT-1002',
        title: 'Monthly On-Grid Solar Plant Installations',
        period: 'Monthly',
        month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        category: 'Solar installations',
        targetValue: 8,
        approvedCount: 6,
        unit: 'Plants',
        assignedType: 'Employee',
        assignedToId: 'EMP-1002',
        assignedToName: 'Praveen Raj',
        managerId: 'MGR-1001',
        status: 'In Progress',
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()
      });
    }

    // Ensure tasks exist
    const existingTasks = await db.find('tasks');
    if (existingTasks.length === 0) {
      await db.create('tasks', {
        taskId: 'TSK-1001',
        title: 'Conduct Rooftop Shadow Survey for Customer SOL-1001',
        description: 'Inspect shadow-free concrete roof area, verify TNEB bi-directional meter cable route and sanctioned load.',
        category: 'Site inspections',
        priority: 'High',
        assignedToId: 'EMP-1001',
        assignedToName: 'Karthik Raja',
        assignedById: 'MGR-1001',
        assignedByName: 'Suresh Kumar',
        assignedRole: 'manager',
        customerId: 'SOL-1001',
        customerName: 'Deepa Lakshmi',
        location: 'Thiruvallur, Tamil Nadu',
        deadline: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        status: 'In Progress',
        progress: 60,
        notes: 'Customer requested 5 kW proposal with 5-year EMI option.'
      });

      await db.create('tasks', {
        taskId: 'TSK-1002',
        title: 'Tier-1 Mono PERC Inverter Synchronization at Sriperumbudur Site',
        description: 'Mount string inverter, connect AC/DC distribution boxes with SPD surge protection, and test grid synchronization.',
        category: 'Solar installations',
        priority: 'Urgent',
        assignedToId: 'EMP-1002',
        assignedToName: 'Praveen Raj',
        assignedById: 'MGR-1001',
        assignedByName: 'Suresh Kumar',
        assignedRole: 'manager',
        customerId: 'SOL-1002',
        customerName: 'R. Murugan',
        location: 'Sriperumbudur, Tamil Nadu',
        deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        status: 'Submitted for Approval',
        progress: 100,
        submissionNotes: 'All 6 kWp solar modules mounted on HDG structure. Inverter synced with TNEB grid voltage 238V.',
        evidenceUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80',
        submittedAt: new Date().toISOString()
      });
    }

    console.log('[Workforce] Workforce defaults checked & verified');
  } catch (err) {
    console.warn('[Workforce Seed Warning]:', err.message);
  }
}

// ─── 1. EMPLOYEES CRUD ───────────────────────────────────────────────────────

// GET /api/workforce/employees (Owner: all; Manager: team members)
router.get('/employees', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    let employees = await db.find('employees');
    
    // If manager, filter by employees assigned to this manager or team
    if (req.user.role === 'manager') {
      const myEmpId = req.user.employeeId;
      employees = employees.filter(e => e.managerId === myEmpId || e.employeeId === myEmpId);
    }

    // Sort by role then employeeId
    employees.sort((a, b) => {
      if (a.role === 'manager' && b.role !== 'manager') return -1;
      if (b.role === 'manager' && a.role !== 'manager') return 1;
      return String(a.employeeId).localeCompare(String(b.employeeId));
    });

    // Remove hashed password from list
    const safeList = employees.map(({ password, ...emp }) => emp);
    res.json({
      success: true,
      employees: safeList,
      total: safeList.length
    });
  } catch (err) {
    console.error('Fetch employees error:', err);
    res.status(500).json({ message: 'Failed to fetch employees' });
  }
});

// POST /api/workforce/employees (Owner only)
router.post('/employees', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { fullName, email, mobileNumber, role, department, designation, managerId, joiningDate, address, username, password } = req.body;

    if (!fullName || !mobileNumber || !role) {
      return res.status(400).json({ message: 'Full name, mobile number, and role are required' });
    }

    const cleanMobile = String(mobileNumber).trim().replace(/^\+?91/, '').replace(/[\s-]/g, '');
    const cleanEmail = email ? String(email).trim().toLowerCase() : '';
    const cleanUsername = username ? String(username).trim().toLowerCase() : '';

    // Check unique username, email, and mobile in employees collection
    const allEmployees = await db.find('employees');
    
    if (cleanUsername) {
      const uMatch = allEmployees.find(e => e.username && e.username.toLowerCase() === cleanUsername);
      if (uMatch) {
        return res.status(400).json({ message: `Username "${cleanUsername}" is already taken by ${uMatch.fullName} (${uMatch.employeeId}). Please choose a different username.` });
      }
    }

    if (cleanMobile) {
      const mMatch = allEmployees.find(e => {
        const existingMob = String(e.mobileNumber || '').trim().replace(/^\+?91/, '').replace(/^0+/, '').replace(/[\s-]/g, '');
        return existingMob && existingMob === cleanMobile.replace(/^0+/, '');
      });
      if (mMatch) {
        return res.status(400).json({ message: `Mobile number ${cleanMobile} is already registered to ${mMatch.fullName} (${mMatch.employeeId}).` });
      }
    }

    if (cleanEmail) {
      const eMatch = allEmployees.find(e => e.email && e.email.toLowerCase() === cleanEmail);
      if (eMatch) {
        return res.status(400).json({ message: `Email address "${cleanEmail}" is already registered to ${eMatch.fullName} (${eMatch.employeeId}).` });
      }
    }

    // Auto-generate employee ID
    const prefix = role === 'manager' ? 'MGR' : 'EMP';
    const numbers = allEmployees
      .map(e => {
        const m = String(e.employeeId || '').match(/(?:EMP|MGR)-(\d+)/i);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter(n => !isNaN(n) && n > 0);
    const nextNum = (numbers.length > 0 ? Math.max(...numbers) : 1000) + 1;
    const employeeId = `${prefix}-${nextNum}`;

    // Custom password or default password
    const rawPass = password && String(password).trim().length >= 4 
      ? String(password).trim() 
      : (role === 'manager' ? 'manager123' : 'worker123');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPass, salt);

    // Look up manager name if managerId is assigned
    let managerName = '';
    if (managerId) {
      const mgr = allEmployees.find(e => e.employeeId === managerId || e._id === managerId);
      if (mgr) managerName = mgr.fullName;
    }

    const newEmp = await db.create('employees', {
      employeeId,
      username: cleanUsername || employeeId.toLowerCase(),
      fullName: String(fullName).trim(),
      email: cleanEmail,
      mobileNumber: cleanMobile,
      role: role === 'manager' ? 'manager' : 'worker',
      department: department || 'Sales & Customer Outreach',
      designation: designation || (role === 'manager' ? 'Team Manager' : 'Solar Technical Consultant'),
      managerId: managerId || '',
      managerName: managerName || (role === 'manager' ? 'Direct to Owner' : ''),
      joiningDate: joiningDate || new Date().toISOString().split('T')[0],
      address: address || '',
      status: 'active',
      password: hashedPassword
    });

    // Also record in audit log
    await db.create('audit_logs', {
      actor: req.user.username || 'admin',
      action: 'CREATE_EMPLOYEE',
      target: `${newEmp.fullName} (${newEmp.employeeId})`,
      details: `Created new ${newEmp.role} in department ${newEmp.department}`,
      timestamp: new Date().toISOString()
    }).catch(() => {});

    const { password: _, ...safeEmp } = newEmp;
    res.status(201).json({ success: true, message: `Employee ${employeeId} (${newEmp.fullName}) created successfully`, employee: safeEmp });
  } catch (err) {
    console.error('Create employee error:', err);
    res.status(500).json({ message: 'Failed to create employee' });
  }
});

// PUT /api/workforce/employees/:id (Owner, or Manager editing assigned worker)
router.put('/employees/:id', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const emp = await db.findOne('employees', { _id: req.params.id }) || await db.findOne('employees', { employeeId: req.params.id });
    if (!emp) return res.status(404).json({ message: 'Employee not found' });

    // If manager, check that they supervise this employee
    if (req.user.role === 'manager' && emp.managerId !== req.user.employeeId && emp.employeeId !== req.user.employeeId) {
      return res.status(403).json({ message: 'You can only update workers in your assigned team' });
    }

    const { fullName, email, mobileNumber, department, designation, managerId, status, address, role } = req.body;
    
    // Only owner can change role or managerId
    const updateData = {};
    if (fullName) updateData.fullName = String(fullName).trim();
    if (email !== undefined) updateData.email = String(email).trim().toLowerCase();
    if (mobileNumber) updateData.mobileNumber = String(mobileNumber).trim();
    if (department) updateData.department = department;
    if (designation) updateData.designation = designation;
    if (address !== undefined) updateData.address = address;

    if (req.user.role === 'admin') {
      if (status) updateData.status = status;
      if (role) updateData.role = role;
      if (managerId !== undefined) {
        updateData.managerId = managerId;
        const allEmps = await db.find('employees');
        const mgr = allEmps.find(e => e.employeeId === managerId || e._id === managerId);
        updateData.managerName = mgr ? mgr.fullName : '';
      }
    }

    const updated = await db.updateOne('employees', { _id: emp._id }, updateData);
    const { password, ...safeEmp } = updated;
    res.json({ success: true, message: 'Employee updated successfully', employee: safeEmp });
  } catch (err) {
    console.error('Update employee error:', err);
    res.status(500).json({ message: 'Failed to update employee' });
  }
});

// POST /api/workforce/employees/:id/reset-password (Owner only)
router.post('/employees/:id/reset-password', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ message: 'New password must be at least 4 characters' });
    }

    const emp = await db.findOne('employees', { _id: req.params.id }) || await db.findOne('employees', { employeeId: req.params.id });
    if (!emp) return res.status(404).json({ message: 'Employee not found' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.updateOne('employees', { _id: emp._id }, { password: hashedPassword });
    res.json({ success: true, message: `Password reset successfully for ${emp.fullName} (${emp.employeeId})` });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Failed to reset employee password' });
  }
});

// DELETE /api/workforce/employees/:id (Owner only)
router.delete('/employees/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const emp = await db.findOne('employees', { _id: req.params.id }) || await db.findOne('employees', { employeeId: req.params.id });
    if (!emp) return res.status(404).json({ message: 'Employee not found' });

    await db.deleteOne('employees', { _id: emp._id });
    res.json({ success: true, message: `Employee ${emp.fullName} removed successfully` });
  } catch (err) {
    console.error('Delete employee error:', err);
    res.status(500).json({ message: 'Failed to delete employee' });
  }
});

// ─── 2. DEPARTMENTS & TEAMS ──────────────────────────────────────────────────

// GET /api/workforce/departments
router.get('/departments', authenticateToken, async (req, res) => {
  try {
    const departments = await db.find('departments');
    const employees = await db.find('employees');
    
    // Attach employee counts
    const enriched = departments.map(d => {
      const staff = employees.filter(e => e.department === d.name && e.status !== 'inactive');
      return {
        ...d,
        employeeCount: staff.length,
        managersCount: staff.filter(e => e.role === 'manager').length
      };
    });

    res.json({
      success: true,
      departments: enriched,
      total: enriched.length
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch departments' });
  }
});

// POST /api/workforce/departments (Owner only)
router.post('/departments', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Department name is required' });

    const count = (await db.find('departments')).length + 101;
    const departmentId = `DEP-${count}`;

    const newDep = await db.create('departments', {
      departmentId,
      name: String(name).trim(),
      description: description || ''
    });

    res.status(201).json(newDep);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create department' });
  }
});

// GET /api/workforce/teams (Owner: all; Manager: own team)
router.get('/teams', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    let teams = await db.find('teams');
    if (req.user.role === 'manager') {
      teams = teams.filter(t => t.managerId === req.user.employeeId);
    }

    const employees = await db.find('employees');
    const enriched = teams.map(team => {
      const members = employees.filter(e => (team.memberIds || []).includes(e.employeeId));
      return {
        ...team,
        members: members.map(({ password, ...m }) => m),
        memberCount: members.length
      };
    });

    res.json({
      success: true,
      teams: enriched,
      total: enriched.length
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch teams' });
  }
});

// POST /api/workforce/teams (Owner only)
router.post('/teams', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { teamName, department, managerId, memberIds, description } = req.body;
    if (!teamName || !managerId) {
      return res.status(400).json({ message: 'Team name and assigned manager are required' });
    }

    const allEmps = await db.find('employees');
    const mgr = allEmps.find(e => e.employeeId === managerId || e._id === managerId);
    const count = (await db.find('teams')).length + 101;
    const teamId = `TEAM-${count}`;

    const newTeam = await db.create('teams', {
      teamId,
      teamName: String(teamName).trim(),
      department: department || 'Sales & Customer Outreach',
      managerId: mgr ? mgr.employeeId : managerId,
      managerName: mgr ? mgr.fullName : '',
      memberIds: Array.isArray(memberIds) ? memberIds : [],
      description: description || ''
    });

    // Update employees assigned manager
    if (Array.isArray(memberIds) && memberIds.length > 0 && mgr) {
      for (const mId of memberIds) {
        await db.updateOne('employees', { employeeId: mId }, { 
          managerId: mgr.employeeId, 
          managerName: mgr.fullName,
          teamId: newTeam.teamId
        });
      }
    }

    res.status(201).json(newTeam);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create team' });
  }
});

// PUT /api/workforce/teams/:id (Owner only)
router.put('/teams/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const team = await db.findOne('teams', { _id: req.params.id }) || await db.findOne('teams', { teamId: req.params.id });
    if (!team) return res.status(404).json({ message: 'Team not found' });

    const { teamName, department, managerId, memberIds, description } = req.body;
    const updateData = {};
    if (teamName) updateData.teamName = teamName;
    if (department) updateData.department = department;
    if (description !== undefined) updateData.description = description;

    if (managerId) {
      const allEmps = await db.find('employees');
      const mgr = allEmps.find(e => e.employeeId === managerId || e._id === managerId);
      updateData.managerId = mgr ? mgr.employeeId : managerId;
      updateData.managerName = mgr ? mgr.fullName : '';
    }

    if (Array.isArray(memberIds)) {
      updateData.memberIds = memberIds;
    }

    const updated = await db.updateOne('teams', { _id: team._id }, updateData);
    res.json({ success: true, message: 'Team updated successfully', team: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update team' });
  }
});

// ─── 3. TASKS & APPROVAL WORKFLOW ───────────────────────────────────────────

// GET /api/workforce/tasks
router.get('/tasks', authenticateToken, authorizeRole(['admin', 'manager', 'worker']), async (req, res) => {
  try {
    let tasks = await db.find('tasks');
    const { status, category, priority, employeeId } = req.query;

    // Role-based visibility scoping
    if (req.user.role === 'worker') {
      tasks = tasks.filter(t => t.assignedToId === req.user.employeeId || t.assignedToId === req.user.username);
    } else if (req.user.role === 'manager') {
      const allEmps = await db.find('employees');
      const teamWorkers = allEmps.filter(e => e.managerId === req.user.employeeId).map(e => e.employeeId);
      tasks = tasks.filter(t => 
        t.assignedById === req.user.employeeId || 
        t.assignedToId === req.user.employeeId || 
        teamWorkers.includes(t.assignedToId)
      );
    }

    // Apply query filters
    if (status) tasks = tasks.filter(t => t.status === status);
    if (category) tasks = tasks.filter(t => t.category === category);
    if (priority) tasks = tasks.filter(t => t.priority === priority);
    if (employeeId && req.user.role !== 'worker') {
      tasks = tasks.filter(t => t.assignedToId === employeeId);
    }

    // Sort: Overdue & urgent first, then deadline
    tasks.sort((a, b) => new Date(a.deadline || 0) - new Date(b.deadline || 0));

    res.json({
      success: true,
      tasks,
      total: tasks.length
    });
  } catch (err) {
    console.error('Fetch tasks error:', err);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

// POST /api/workforce/tasks (Owner or Manager)
router.post('/tasks', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const { title, description, category, priority, assignedToId, customerId, customerName, location, deadline, targetId } = req.body;

    if (!title || !assignedToId || !deadline) {
      return res.status(400).json({ message: 'Title, assigned employee, and deadline are required' });
    }

    const allEmps = await db.find('employees');
    const worker = allEmps.find(e => e.employeeId === assignedToId || e._id === assignedToId || e.username === assignedToId);
    
    // If manager, verify worker belongs to manager's team
    if (req.user.role === 'manager' && worker && worker.managerId !== req.user.employeeId && worker.employeeId !== req.user.employeeId) {
      return res.status(403).json({ message: 'You can only assign tasks to workers in your team' });
    }

    const count = (await db.find('tasks')).length + 1001;
    const taskId = `TSK-${count}`;

    const newTask = await db.create('tasks', {
      taskId,
      title: String(title).trim(),
      description: description || '',
      category: category || 'Customer visits',
      priority: priority || 'Normal',
      assignedToId: worker ? worker.employeeId : assignedToId,
      assignedToName: worker ? worker.fullName : assignedToId,
      assignedById: req.user.employeeId || req.user.username || 'admin',
      assignedByName: req.user.fullName || (req.user.role === 'admin' ? 'Owner / Admin' : req.user.username),
      assignedRole: req.user.role,
      customerId: customerId || '',
      customerName: customerName || '',
      location: location || '',
      deadline: String(deadline).split('T')[0],
      targetId: targetId || '',
      status: 'Assigned',
      progress: 0,
      notes: ''
    });

    // Create Notification for the worker
    await db.create('notifications', {
      recipientId: worker ? worker.employeeId : assignedToId,
      role: 'worker',
      type: 'TASK_ASSIGNED',
      title: `📋 New Task Assigned: ${newTask.title}`,
      message: `Due on ${newTask.deadline}. Priority: ${newTask.priority}`,
      taskId: newTask._id,
      read: false,
      createdAt: new Date().toISOString()
    }).catch(() => {});

    res.status(201).json(newTask);
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ message: 'Failed to create task' });
  }
});

// POST /api/workforce/tasks/:id/status (Worker updates progress / accepts)
router.post('/tasks/:id/status', authenticateToken, authorizeRole(['worker', 'manager', 'admin']), async (req, res) => {
  try {
    const { status, progress, notes } = req.body;
    const task = await db.findOne('tasks', { _id: req.params.id }) || await db.findOne('tasks', { taskId: req.params.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Workers can only update their own tasks and cannot set status to 'Approved'
    if (req.user.role === 'worker') {
      if (task.assignedToId !== req.user.employeeId && task.assignedToId !== req.user.username) {
        return res.status(403).json({ message: 'You can only update your own assigned tasks' });
      }
      if (status === 'Approved') {
        return res.status(403).json({ message: 'Workers cannot approve their own tasks. Please submit for manager review.' });
      }
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (progress !== undefined) updateData.progress = Number(progress);
    if (notes !== undefined) updateData.notes = notes;

    const updated = await db.updateOne('tasks', { _id: task._id }, updateData);
    res.json({ success: true, message: 'Task progress updated', task: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update task status' });
  }
});

// POST /api/workforce/tasks/:id/submit (Worker submits completed task for approval)
router.post('/tasks/:id/submit', authenticateToken, authorizeRole(['worker']), async (req, res) => {
  try {
    const { submissionNotes, evidenceUrl } = req.body;
    const task = await db.findOne('tasks', { _id: req.params.id }) || await db.findOne('tasks', { taskId: req.params.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (task.assignedToId !== req.user.employeeId && task.assignedToId !== req.user.username) {
      return res.status(403).json({ message: 'You can only submit your own assigned tasks' });
    }

    const updated = await db.updateOne('tasks', { _id: task._id }, {
      status: 'Submitted for Approval',
      progress: 100,
      submissionNotes: submissionNotes || 'Work completed per requirements.',
      evidenceUrl: evidenceUrl || '',
      submittedAt: new Date().toISOString()
    });

    // Notify Manager / Owner
    await db.create('notifications', {
      recipientId: task.assignedById,
      role: task.assignedRole || 'manager',
      type: 'TASK_SUBMITTED',
      title: `⚡ Task Submitted for Approval: ${task.title}`,
      message: `${req.user.fullName || req.user.username} submitted completion proof for review.`,
      taskId: task._id,
      read: false,
      createdAt: new Date().toISOString()
    }).catch(() => {});

    res.json({ success: true, message: 'Task submitted for manager approval', task: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit task' });
  }
});

// POST /api/workforce/tasks/:id/approve (Manager or Owner approves task)
router.post('/tasks/:id/approve', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const { approvalFeedback } = req.body;
    const task = await db.findOne('tasks', { _id: req.params.id }) || await db.findOne('tasks', { taskId: req.params.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Ensure manager manages this worker
    if (req.user.role === 'manager') {
      const allEmps = await db.find('employees');
      const worker = allEmps.find(e => e.employeeId === task.assignedToId);
      if (worker && worker.managerId !== req.user.employeeId && task.assignedById !== req.user.employeeId) {
        return res.status(403).json({ message: 'You can only approve tasks for your team members' });
      }
    }

    const updated = await db.updateOne('tasks', { _id: task._id }, {
      status: 'Approved',
      approvedById: req.user.employeeId || req.user.username,
      approvedByName: req.user.fullName || (req.user.role === 'admin' ? 'Owner / Admin' : req.user.username),
      approvedAt: new Date().toISOString(),
      approvalFeedback: approvalFeedback || 'Approved. Good job!'
    });

    // Automatically recalculate worker target achievement!
    await updateTargetsOnTaskApproval(task);

    // Notify Worker
    await db.create('notifications', {
      recipientId: task.assignedToId,
      role: 'worker',
      type: 'TASK_APPROVED',
      title: `🎉 Task Approved: ${task.title}`,
      message: `Approved by ${req.user.fullName || 'Manager'}. Counted towards your monthly target!`,
      taskId: task._id,
      read: false,
      createdAt: new Date().toISOString()
    }).catch(() => {});

    res.json({ success: true, message: 'Task successfully approved and added to target achievement', task: updated });
  } catch (err) {
    console.error('Task approval error:', err);
    res.status(500).json({ message: 'Failed to approve task' });
  }
});

// POST /api/workforce/tasks/:id/reject (Manager or Owner requests revisions)
router.post('/tasks/:id/reject', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const { feedback, status } = req.body; // status can be 'Revision Required' or 'Rejected'
    const task = await db.findOne('tasks', { _id: req.params.id }) || await db.findOne('tasks', { taskId: req.params.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const newStatus = status === 'Rejected' ? 'Rejected' : 'Revision Required';

    const updated = await db.updateOne('tasks', { _id: task._id }, {
      status: newStatus,
      approvalFeedback: feedback || 'Please review notes and resubmit with clearer photos/details.',
      rejectedAt: new Date().toISOString()
    });

    // Notify Worker
    await db.create('notifications', {
      recipientId: task.assignedToId,
      role: 'worker',
      type: 'TASK_REVISION',
      title: `⚠️ Task Needs Revision: ${task.title}`,
      message: feedback || 'Manager requested corrections before approval.',
      taskId: task._id,
      read: false,
      createdAt: new Date().toISOString()
    }).catch(() => {});

    res.json({ success: true, message: `Task set to ${newStatus}`, task: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reject/request revision' });
  }
});

// Helper: updates targets when a task is approved
async function updateTargetsOnTaskApproval(task) {
  try {
    const targets = await db.find('targets');
    // Find matching target for this worker and category
    const matching = targets.filter(t => 
      t.assignedToId === task.assignedToId && 
      (t.category === task.category || t.category === 'All') &&
      t.status !== 'Completed'
    );

    for (const tgt of matching) {
      const curApproved = (tgt.approvedCount || 0) + 1;
      const isCompleted = curApproved >= tgt.targetValue;
      await db.updateOne('targets', { _id: tgt._id }, {
        approvedCount: curApproved,
        status: isCompleted ? 'Completed' : 'In Progress'
      });
    }
  } catch (e) {
    console.warn('Auto target update warning:', e.message);
  }
}

// ─── 4. TARGET MANAGEMENT SYSTEM ────────────────────────────────────────────

// GET /api/workforce/targets
router.get('/targets', authenticateToken, authorizeRole(['admin', 'manager', 'worker']), async (req, res) => {
  try {
    let targets = await db.find('targets');
    const { period, category, employeeId } = req.query;

    if (req.user.role === 'worker') {
      targets = targets.filter(t => t.assignedToId === req.user.employeeId);
    } else if (req.user.role === 'manager') {
      const allEmps = await db.find('employees');
      const teamWorkers = allEmps.filter(e => e.managerId === req.user.employeeId).map(e => e.employeeId);
      targets = targets.filter(t => 
        t.managerId === req.user.employeeId || 
        t.assignedToId === req.user.employeeId ||
        teamWorkers.includes(t.assignedToId)
      );
    }

    if (period) targets = targets.filter(t => t.period === period);
    if (category) targets = targets.filter(t => t.category === category);
    if (employeeId && req.user.role !== 'worker') {
      targets = targets.filter(t => t.assignedToId === employeeId);
    }

    // Calculate dynamic achievement percentage and remaining
    const enriched = targets.map(tgt => {
      const targetVal = Number(tgt.targetValue) || 1;
      const completed = Number(tgt.approvedCount) || 0;
      const achievementPct = Math.min(100, Math.round((completed / targetVal) * 100));
      const remaining = Math.max(0, targetVal - completed);
      
      let dynamicStatus = tgt.status || 'In Progress';
      if (completed >= targetVal) dynamicStatus = 'Completed';
      else if (achievementPct >= 75) dynamicStatus = 'On Track';
      else if (new Date(tgt.endDate || 0) < new Date() && completed < targetVal) dynamicStatus = 'Below Target';

      return {
        ...tgt,
        approvedCount: completed,
        remaining,
        achievementPct,
        status: dynamicStatus
      };
    });

    res.json({
      success: true,
      targets: enriched,
      total: enriched.length
    });
  } catch (err) {
    console.error('Fetch targets error:', err);
    res.status(500).json({ message: 'Failed to fetch targets' });
  }
});

// POST /api/workforce/targets (Owner or Manager creates target)
router.post('/targets', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const { title, period, category, targetValue, unit, assignedType, assignedToId, startDate, endDate } = req.body;

    if (!title || !targetValue || !assignedToId) {
      return res.status(400).json({ message: 'Title, target value, and assigned recipient are required' });
    }

    const allEmps = await db.find('employees');
    const recipient = allEmps.find(e => e.employeeId === assignedToId || e._id === assignedToId);

    const count = (await db.find('targets')).length + 1001;
    const targetId = `TGT-${count}`;

    const newTarget = await db.create('targets', {
      targetId,
      title: String(title).trim(),
      period: period || 'Monthly',
      category: category || 'Customer visits',
      targetValue: Number(targetValue),
      approvedCount: 0,
      unit: unit || 'Visits',
      assignedType: assignedType || 'Employee',
      assignedToId: recipient ? recipient.employeeId : assignedToId,
      assignedToName: recipient ? recipient.fullName : assignedToId,
      managerId: req.user.role === 'manager' ? req.user.employeeId : (recipient?.managerId || ''),
      status: 'In Progress',
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || new Date(Date.now() + 86400000 * 30).toISOString()
    });

    // Notify employee of assigned target
    await db.create('notifications', {
      recipientId: newTarget.assignedToId,
      role: 'worker',
      type: 'TARGET_ASSIGNED',
      title: `🎯 New Performance Target: ${newTarget.title}`,
      message: `Goal: ${newTarget.targetValue} ${newTarget.unit} by ${new Date(newTarget.endDate).toLocaleDateString('en-IN')}`,
      targetId: newTarget._id,
      read: false,
      createdAt: new Date().toISOString()
    }).catch(() => {});

    res.status(201).json(newTarget);
  } catch (err) {
    console.error('Create target error:', err);
    res.status(500).json({ message: 'Failed to create target' });
  }
});

// POST /api/workforce/targets/:id/distribute (Manager distributes team target to workers)
router.post('/targets/:id/distribute', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const { distributions } = req.body; // array of { employeeId, targetValue }
    const parentTarget = await db.findOne('targets', { _id: req.params.id }) || await db.findOne('targets', { targetId: req.params.id });
    if (!parentTarget) return res.status(404).json({ message: 'Parent target not found' });

    if (!Array.isArray(distributions) || distributions.length === 0) {
      return res.status(400).json({ message: 'Distributions must be a non-empty array' });
    }

    const allEmps = await db.find('employees');
    const createdTargets = [];

    for (const dist of distributions) {
      const emp = allEmps.find(e => e.employeeId === dist.employeeId);
      const subTargetId = `TGT-${(await db.find('targets')).length + 1001}`;

      const subTarget = await db.create('targets', {
        targetId: subTargetId,
        parentTargetId: parentTarget.targetId,
        title: `${parentTarget.title} (${emp ? emp.fullName : dist.employeeId})`,
        period: parentTarget.period,
        category: parentTarget.category,
        targetValue: Number(dist.targetValue),
        approvedCount: 0,
        unit: parentTarget.unit,
        assignedType: 'Employee',
        assignedToId: dist.employeeId,
        assignedToName: emp ? emp.fullName : dist.employeeId,
        managerId: req.user.employeeId || parentTarget.managerId,
        status: 'In Progress',
        startDate: parentTarget.startDate,
        endDate: parentTarget.endDate
      });
      createdTargets.push(subTarget);
    }

    res.json({ success: true, message: `Target distributed to ${createdTargets.length} workers`, targets: createdTargets });
  } catch (err) {
    res.status(500).json({ message: 'Failed to distribute target' });
  }
});

// ─── 5. ATTENDANCE & LEAVES ──────────────────────────────────────────────────

// GET /api/workforce/attendance
router.get('/attendance', authenticateToken, authorizeRole(['admin', 'manager', 'worker']), async (req, res) => {
  try {
    let records = await db.find('attendance');
    const today = new Date().toISOString().split('T')[0];

    if (req.user.role === 'worker') {
      records = records.filter(r => r.employeeId === req.user.employeeId);
    } else if (req.user.role === 'manager') {
      const allEmps = await db.find('employees');
      const teamEmps = allEmps.filter(e => e.managerId === req.user.employeeId).map(e => e.employeeId);
      records = records.filter(r => teamEmps.includes(r.employeeId) || r.employeeId === req.user.employeeId);
    }

    records.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    res.json({
      success: true,
      attendance: records,
      total: records.length
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch attendance' });
  }
});

// POST /api/workforce/attendance/check-in
router.post('/attendance/check-in', authenticateToken, authorizeRole(['worker', 'manager']), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const employeeId = req.user.employeeId || req.user.username;

    // Check if already checked in today
    const existing = await db.findOne('attendance', { employeeId, date: today });
    if (existing && existing.checkInTime) {
      return res.status(400).json({ message: 'You have already checked in today at ' + existing.checkInTime });
    }

    const now = new Date();
    const checkInTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newRecord = await db.create('attendance', {
      employeeId,
      employeeName: req.user.fullName || req.user.username,
      role: req.user.role,
      date: today,
      checkInTime,
      checkInTimestamp: now.toISOString(),
      status: 'Present',
      location: req.body.location || 'Site Office / Field',
      workingHours: '0h 0m'
    });

    res.json({ success: true, message: `Checked in successfully at ${checkInTime}`, record: newRecord });
  } catch (err) {
    res.status(500).json({ message: 'Check-in failed' });
  }
});

// POST /api/workforce/attendance/check-out
router.post('/attendance/check-out', authenticateToken, authorizeRole(['worker', 'manager']), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const employeeId = req.user.employeeId || req.user.username;

    const existing = await db.findOne('attendance', { employeeId, date: today });
    if (!existing || !existing.checkInTimestamp) {
      return res.status(400).json({ message: 'You have not checked in today yet' });
    }

    const now = new Date();
    const checkOutTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Calculate working hours
    const diffMs = now - new Date(existing.checkInTimestamp);
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const workingHours = `${diffHrs}h ${diffMins}m`;

    const updated = await db.updateOne('attendance', { _id: existing._id }, {
      checkOutTime,
      checkOutTimestamp: now.toISOString(),
      workingHours,
      status: diffHrs >= 4 ? 'Present' : 'Half Day'
    });

    res.json({ success: true, message: `Checked out at ${checkOutTime}. Total time: ${workingHours}`, record: updated });
  } catch (err) {
    res.status(500).json({ message: 'Check-out failed' });
  }
});

// GET /api/workforce/leaves
router.get('/leaves', authenticateToken, authorizeRole(['admin', 'manager', 'worker']), async (req, res) => {
  try {
    let leaves = await db.find('leave_requests');

    if (req.user.role === 'worker') {
      leaves = leaves.filter(l => l.employeeId === req.user.employeeId);
    } else if (req.user.role === 'manager') {
      const allEmps = await db.find('employees');
      const teamEmps = allEmps.filter(e => e.managerId === req.user.employeeId).map(e => e.employeeId);
      leaves = leaves.filter(l => teamEmps.includes(l.employeeId) || l.employeeId === req.user.employeeId);
    }

    leaves.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json({
      success: true,
      leaves,
      total: leaves.length
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch leave requests' });
  }
});

// POST /api/workforce/leaves
router.post('/leaves', authenticateToken, authorizeRole(['worker', 'manager']), async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ message: 'Start date, end date, and reason are required' });
    }

    const employeeId = req.user.employeeId || req.user.username;
    const allEmps = await db.find('employees');
    const emp = allEmps.find(e => e.employeeId === employeeId);

    const count = (await db.find('leave_requests')).length + 1001;
    const leaveId = `LEV-${count}`;

    const newLeave = await db.create('leave_requests', {
      leaveId,
      employeeId,
      employeeName: emp ? emp.fullName : req.user.username,
      managerId: emp ? emp.managerId : '',
      leaveType: leaveType || 'Casual Leave',
      startDate,
      endDate,
      reason,
      status: 'Pending',
      createdAt: new Date().toISOString()
    });

    res.status(201).json(newLeave);
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit leave application' });
  }
});

// POST /api/workforce/leaves/:id/approve (Manager or Owner)
router.post('/leaves/:id/approve', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const { status, decisionNotes } = req.body; // status: 'Approved' | 'Rejected'
    const leave = await db.findOne('leave_requests', { _id: req.params.id }) || await db.findOne('leave_requests', { leaveId: req.params.id });
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    const newStatus = status === 'Rejected' ? 'Rejected' : 'Approved';

    const updated = await db.updateOne('leave_requests', { _id: leave._id }, {
      status: newStatus,
      decisionNotes: decisionNotes || '',
      approvedById: req.user.employeeId || req.user.username,
      decidedAt: new Date().toISOString()
    });

    // Notify employee
    await db.create('notifications', {
      recipientId: leave.employeeId,
      role: 'worker',
      type: 'LEAVE_DECISION',
      title: `Leave Request ${newStatus}: ${leave.leaveType}`,
      message: `Dates: ${leave.startDate} to ${leave.endDate}. Status: ${newStatus}`,
      read: false,
      createdAt: new Date().toISOString()
    }).catch(() => {});

    res.json({ success: true, message: `Leave application ${newStatus.toLowerCase()}`, leave: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to decide leave request' });
  }
});

// ─── 6. SOLAR INSTALLATION PROJECTS ──────────────────────────────────────────

// GET /api/workforce/projects
router.get('/projects', authenticateToken, authorizeRole(['admin', 'manager', 'worker']), async (req, res) => {
  try {
    let projects = await db.find('solar_projects');

    if (req.user.role === 'worker') {
      projects = projects.filter(p => (p.assignedWorkers || []).includes(req.user.employeeId));
    } else if (req.user.role === 'manager') {
      projects = projects.filter(p => p.managerId === req.user.employeeId);
    }

    projects.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json({
      success: true,
      projects,
      total: projects.length
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch solar projects' });
  }
});

// POST /api/workforce/projects (Owner or Manager)
router.post('/projects', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const { customerId, customerName, capacityKw, address, managerId, assignedWorkers, expectedCompletionDate } = req.body;

    if (!customerName || !capacityKw) {
      return res.status(400).json({ message: 'Customer name and system capacity (kW) are required' });
    }

    const count = (await db.find('solar_projects')).length + 1001;
    const projectId = `PRJ-${count}`;

    const defaultMilestones = [
      { id: 1, name: 'Site Survey & Roof Strength Assessment', status: 'Completed', completedDate: new Date().toISOString().split('T')[0] },
      { id: 2, name: 'PM Surya Ghar Portal Sanction Approval', status: 'In Progress' },
      { id: 3, name: 'Tier-1 Mono PERC Solar Panels Installation', status: 'Pending' },
      { id: 4, name: 'Grid-Tied String Inverter & SPD Grounding', status: 'Pending' },
      { id: 5, name: 'TANGEDCO Bi-directional Net-Meter Energization', status: 'Pending' },
      { id: 6, name: 'Customer Handover & ₹78k Subsidy Inspection', status: 'Pending' }
    ];

    const newProject = await db.create('solar_projects', {
      projectId,
      customerId: customerId || `SOL-${count}`,
      customerName: String(customerName).trim(),
      capacityKw: Number(capacityKw),
      address: address || 'Tamil Nadu',
      managerId: managerId || req.user.employeeId || 'MGR-1001',
      assignedWorkers: Array.isArray(assignedWorkers) ? assignedWorkers : ['EMP-1001'],
      startDate: new Date().toISOString().split('T')[0],
      expectedCompletionDate: expectedCompletionDate || new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
      status: 'Ongoing',
      completionPct: 15,
      milestones: defaultMilestones,
      notes: 'Battery-free on-grid configuration with 1:1 net metering.'
    });

    res.status(201).json(newProject);
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ message: 'Failed to create solar project' });
  }
});

// PUT /api/workforce/projects/:id (Update progress or milestone)
router.put('/projects/:id', authenticateToken, authorizeRole(['admin', 'manager', 'worker']), async (req, res) => {
  try {
    const proj = await db.findOne('solar_projects', { _id: req.params.id }) || await db.findOne('solar_projects', { projectId: req.params.id });
    if (!proj) return res.status(404).json({ message: 'Project not found' });

    const { status, completionPct, milestones, notes, actualCompletionDate } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (completionPct !== undefined) updateData.completionPct = Number(completionPct);
    if (milestones) updateData.milestones = milestones;
    if (notes !== undefined) updateData.notes = notes;
    if (actualCompletionDate) updateData.actualCompletionDate = actualCompletionDate;

    const updated = await db.updateOne('solar_projects', { _id: proj._id }, updateData);
    res.json({ success: true, message: 'Project updated', project: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update project' });
  }
});

// ─── 7. CRM LEAD ASSIGNMENT ──────────────────────────────────────────────────

// POST /api/workforce/leads/:id/assign
router.post('/leads/:id/assign', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const { assignedToId, managerId, followUpDate, notes } = req.body;
    const lead = await db.findOne('leads', { _id: req.params.id });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const allEmps = await db.find('employees');
    const worker = allEmps.find(e => e.employeeId === assignedToId);
    const mgr = allEmps.find(e => e.employeeId === managerId);

    const updatedLead = await db.updateOne('leads', { _id: lead._id }, {
      assignedToId: worker ? worker.employeeId : assignedToId,
      assignedToName: worker ? worker.fullName : assignedToId,
      managerId: mgr ? mgr.employeeId : (managerId || req.user.employeeId),
      managerName: mgr ? mgr.fullName : '',
      nextFollowUpDate: followUpDate || lead.nextFollowUpDate || '',
      notes: notes ? (lead.notes ? `${lead.notes} | ${notes}` : notes) : lead.notes
    });

    res.json({ success: true, message: 'Lead assigned successfully', lead: updatedLead });
  } catch (err) {
    res.status(500).json({ message: 'Failed to assign lead' });
  }
});

// ─── 8. WORKFORCE BUSINESS ANALYTICS & REPORTS ──────────────────────────────

// GET /api/workforce/reports/overview (Executive numbers for Owner & Manager)
router.get('/reports/overview', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const employees = await db.find('employees');
    const tasks = await db.find('tasks');
    const targets = await db.find('targets');
    const projects = await db.find('solar_projects');
    const customers = await db.find('customers');
    const leads = await db.find('leads');

    let relevantEmps = employees;
    let relevantTasks = tasks;
    let relevantTargets = targets;
    let relevantProjects = projects;

    if (req.user.role === 'manager') {
      const myEmpId = req.user.employeeId;
      relevantEmps = employees.filter(e => e.managerId === myEmpId || e.employeeId === myEmpId);
      const teamEmpIds = relevantEmps.map(e => e.employeeId);
      relevantTasks = tasks.filter(t => teamEmpIds.includes(t.assignedToId));
      relevantTargets = targets.filter(t => t.managerId === myEmpId || teamEmpIds.includes(t.assignedToId));
      relevantProjects = projects.filter(p => p.managerId === myEmpId);
    }

    const totalEmployees = relevantEmps.length;
    const totalManagers = relevantEmps.filter(e => e.role === 'manager').length;
    const activeEmployees = relevantEmps.filter(e => e.status !== 'inactive').length;
    const inactiveEmployees = relevantEmps.filter(e => e.status === 'inactive').length;

    const pendingTasks = relevantTasks.filter(t => t.status === 'Assigned' || t.status === 'In Progress').length;
    const reviewTasks = relevantTasks.filter(t => t.status === 'Submitted for Approval').length;
    const completedTasks = relevantTasks.filter(t => t.status === 'Approved').length;
    const todayStr = new Date().toISOString().split('T')[0];
    const overdueTasks = relevantTasks.filter(t => t.status !== 'Approved' && t.deadline && t.deadline < todayStr).length;

    // Target achievement
    let totalTargetUnits = 0;
    let totalApprovedUnits = 0;
    relevantTargets.forEach(t => {
      totalTargetUnits += Number(t.targetValue) || 0;
      totalApprovedUnits += Number(t.approvedCount) || 0;
    });
    const targetAchievementPct = totalTargetUnits > 0 ? Math.min(100, Math.round((totalApprovedUnits / totalTargetUnits) * 100)) : 0;

    // Projects
    const ongoingInstallations = relevantProjects.filter(p => p.status === 'Ongoing').length;
    const completedInstallations = relevantProjects.filter(p => p.status === 'Completed').length;

    res.json({
      totalEmployees,
      totalManagers,
      activeEmployees,
      inactiveEmployees,
      pendingTasks,
      reviewTasks,
      completedTasks,
      overdueTasks,
      totalTargetUnits,
      totalApprovedUnits,
      targetAchievementPct,
      ongoingInstallations,
      completedInstallations,
      totalProjects: relevantProjects.length,
      totalCustomers: customers.length,
      newEnquiries: leads.filter(l => (l.status || 'New') === 'New').length
    });
  } catch (err) {
    console.error('Workforce overview error:', err);
    res.status(500).json({ message: 'Failed to compute overview metrics' });
  }
});

// GET /api/workforce/reports/performance
router.get('/reports/performance', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const employees = await db.find('employees');
    const tasks = await db.find('tasks');
    const targets = await db.find('targets');

    let relevantEmps = employees;
    if (req.user.role === 'manager') {
      relevantEmps = employees.filter(e => e.managerId === req.user.employeeId);
    }

    const performanceTable = relevantEmps.map(emp => {
      const empTasks = tasks.filter(t => t.assignedToId === emp.employeeId);
      const done = empTasks.filter(t => t.status === 'Approved').length;
      const pending = empTasks.filter(t => t.status === 'Assigned' || t.status === 'In Progress').length;
      const empTargets = targets.filter(t => t.assignedToId === emp.employeeId);
      
      let tgtSum = 0;
      let tgtDone = 0;
      empTargets.forEach(t => {
        tgtSum += Number(t.targetValue) || 0;
        tgtDone += Number(t.approvedCount) || 0;
      });

      const targetPct = tgtSum > 0 ? Math.min(100, Math.round((tgtDone / tgtSum) * 100)) : 0;

      return {
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        role: emp.role,
        department: emp.department,
        designation: emp.designation,
        totalTasks: empTasks.length,
        tasksCompleted: done,
        tasksPending: pending,
        targetAchievementPct: targetPct,
        status: emp.status
      };
    });

    res.json({
      success: true,
      performance: performanceTable,
      total: performanceTable.length
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate performance reports' });
  }
});

export default router;
