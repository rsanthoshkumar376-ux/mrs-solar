import express from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { db } from '../database/db.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { generateAmortizationSchedule, recalculateCustomerEmiStatus } from '../utils/calculations.js';
import { logAdminAction } from '../utils/logger.js';
import { runDailyInterestAndPenaltyCheck } from '../utils/scheduler.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', 'data', 'uploads');

// Multer storage setup
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
      cb(null, UPLOADS_DIR);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

const documentFields = [
  { name: 'aadhaarFile', maxCount: 1 },
  { name: 'panFile', maxCount: 1 },
  { name: 'photoFile', maxCount: 1 },
  { name: 'electricityBillFile', maxCount: 1 },
  { name: 'propertyProofFile', maxCount: 1 },
  { name: 'agreementFile', maxCount: 1 }
];

// 1. Dashboard Statistics
router.get('/dashboard-stats', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const customers = await db.find('customers');
    const payments = await db.find('payments');

    // Total counts
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c.loanStatus === 'Active').length;
    const completedCustomers = customers.filter(c => c.loanStatus === 'Completed').length;
    const overdueCustomers = customers.filter(c => c.paymentStatus === 'Overdue').length;

    // Loan details
    const totalLoanAmount = customers.reduce((sum, c) => sum + (Number(c.loanAmount) || 0), 0);
    const totalCapacity = customers.reduce((sum, c) => sum + (Number(c.solarCapacity) || 0), 0);

    // Sum from payment records
    const totalAmountCollected = payments
      .filter(p => p.status === 'Paid')
      .reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);

    const totalInterestCollected = payments
      .filter(p => p.status === 'Paid')
      .reduce((sum, p) => sum + (Number(p.interestPaid) || 0), 0);

    const totalLateFeeCollected = payments
      .filter(p => p.status === 'Paid')
      .reduce((sum, p) => sum + (Number(p.lateFeePaid) || 0), 0);

    const totalProfit = totalInterestCollected + totalLateFeeCollected;

    // Outstanding / Pending calculation
    const pendingPaymentsCount = customers.reduce((count, c) => {
      return count + (c.emiSchedule ? c.emiSchedule.filter(e => e.status !== 'Paid').length : 0);
    }, 0);

    const totalOutstandingAmount = customers.reduce((sum, c) => sum + (Number(c.totalOutstandingAmount) || 0), 0);

    // Monthly Collection Chart (Current year split by months)
    const currentYear = new Date().getFullYear();
    const monthlyCollection = Array(12).fill(0);
    const monthlyProfit = Array(12).fill(0);

    payments
      .filter(p => p.status === 'Paid' && new Date(p.paymentDate).getFullYear() === currentYear)
      .forEach(p => {
        const month = new Date(p.paymentDate).getMonth();
        monthlyCollection[month] += Number(p.paidAmount) || 0;
        monthlyProfit[month] += (Number(p.interestPaid) || 0) + (Number(p.lateFeePaid) || 0);
      });

    res.json({
      totalCustomers,
      activeCustomers,
      completedCustomers,
      overdueCustomers,
      totalSolarCapacityKw: totalCapacity,
      totalLoanAmount,
      totalAmountCollected,
      totalProfit,
      pendingPaymentsCount,
      totalOutstandingAmount,
      chartData: {
        months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        collections: monthlyCollection.map(v => Math.round(v)),
        profits: monthlyProfit.map(v => Math.round(v))
      }
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ message: 'Error loading dashboard statistics' });
  }
});

// 2. Customer List (with filters and search)
router.get('/customers', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { search, loanStatus, paymentStatus } = req.query;
    let customers = await db.find('customers');

    // Run active calculations to ensure penalty/days-late is absolutely up to date when viewed
    const checkDate = new Date();
    customers = customers.map(c => recalculateCustomerEmiStatus(c, checkDate));

    if (search) {
      const q = search.toLowerCase();
      customers = customers.filter(c => 
        (c.fullName && c.fullName.toLowerCase().includes(q)) ||
        (c.customerId && c.customerId.toLowerCase().includes(q)) ||
        (c.mobileNumber && c.mobileNumber.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.district && c.district.toLowerCase().includes(q))
      );
    }

    if (loanStatus) {
      customers = customers.filter(c => c.loanStatus === loanStatus);
    }

    if (paymentStatus) {
      customers = customers.filter(c => c.paymentStatus === paymentStatus);
    }

    res.json(customers);
  } catch (error) {
    console.error('Customers fetch error:', error);
    res.status(500).json({ message: 'Error retrieving customers' });
  }
});

// 3. Customer Details
router.get('/customers/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const customer = await db.findOne('customers', { _id: req.params.id });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Refresh status calculations in real time
    const updatedCustomer = recalculateCustomerEmiStatus(customer, new Date());
    res.json(updatedCustomer);
  } catch (error) {
    console.error('Customer fetch error:', error);
    res.status(500).json({ message: 'Error retrieving customer details' });
  }
});

// 4. Create Customer
router.post('/customers', authenticateToken, authorizeRole(['admin']), upload.fields(documentFields), async (req, res) => {
  try {
    const rawData = req.body;

    // Validate essential inputs
    if (!rawData.fullName || !rawData.mobileNumber || !rawData.loanAmount || !rawData.interestRate || !rawData.emiDuration) {
      return res.status(400).json({ message: 'Missing mandatory fields' });
    }

    // Auto-generate customer id
    const count = (await db.find('customers')).length + 1;
    const customerId = `SOL-${1000 + count}`;

    // Get file names if uploaded
    const files = req.files || {};
    const docs = {};
    documentFields.forEach(f => {
      if (files[f.name] && files[f.name][0]) {
        // Store relative url path
        docs[f.name] = `/uploads/${files[f.name][0].filename}`;
      } else {
        docs[f.name] = null;
      }
    });

    const loanAmount = Number(rawData.loanAmount);
    const monthlyRate = Number(rawData.interestRate) / 100; // Expected monthly rate (e.g. 2% = 0.02)
    const emiDuration = Number(rawData.emiDuration);
    const startDate = rawData.loanStartDate || new Date().toISOString().split('T')[0];

    // Generate EMI Schedule
    const emiSchedule = generateAmortizationSchedule(loanAmount, monthlyRate, emiDuration, startDate);
    const monthlyEmi = emiSchedule.length > 0 ? emiSchedule[0].emiAmount : 0;

    // Create Customer
    const customer = await db.create('customers', {
      customerId,
      fullName: rawData.fullName,
      fatherName: rawData.fatherName || '',
      motherName: rawData.motherName || '',
      mobileNumber: rawData.mobileNumber,
      alternateNumber: rawData.alternateNumber || '',
      email: rawData.email || '',
      address: rawData.address || '',
      city: rawData.city || '',
      district: rawData.district || '',
      state: rawData.state || '',
      pinCode: rawData.pinCode || '',
      aadhaarNumber: rawData.aadhaarNumber || '',
      panNumber: rawData.panNumber || '',
      occupation: rawData.occupation || '',
      monthlyIncome: Number(rawData.monthlyIncome) || 0,
      bankDetails: {
        bankName: rawData.bankName || '',
        accountNumber: rawData.accountNumber || '',
        ifscCode: rawData.ifscCode || ''
      },
      nomineeDetails: rawData.nomineeDetails || '',
      installationAddress: rawData.installationAddress || '',
      solarCapacity: Number(rawData.solarCapacity) || 0,
      solarBrand: rawData.solarBrand || '',
      solarCost: Number(rawData.solarCost) || 0,
      installationDate: rawData.installationDate || '',
      warrantyDetails: rawData.warrantyDetails || '',
      loanAmount,
      downPayment: Number(rawData.downPayment) || 0,
      interestRate: Number(rawData.interestRate),
      emiDuration,
      monthlyEmi,
      loanStartDate: startDate,
      loanEndDate: emiSchedule.length > 0 ? emiSchedule[emiSchedule.length - 1].dueDate : '',
      loanStatus: 'Active',
      paymentStatus: 'Pending',
      remarks: rawData.remarks || '',
      documents: docs,
      emiSchedule,
      latePaymentCharges: 0,
      totalOutstandingAmount: emiSchedule.reduce((sum, e) => sum + e.emiAmount, 0)
    });

    // Create corresponding Customer User for login (username = fullName, password = mobileNumber)
    const salt = await bcrypt.genSalt(10);
    const rawPassword = String(rawData.mobileNumber || 'password123').trim();
    const hashedPassword = await bcrypt.hash(rawPassword, salt);
    await db.create('users', {
      username: rawData.fullName ? rawData.fullName.trim() : customerId,
      customerId: customerId,
      password: hashedPassword,
      role: 'customer'
    });

    await logAdminAction(req.user.username, 'CREATE_CUSTOMER', customerId, { name: customer.fullName });

    // Push notification for new customer
    await db.create('notifications', {
      role: 'admin',
      customerId: customerId,
      title: 'New Customer Registered',
      message: `Customer ${customer.fullName} (${customerId}) added with Loan of ₹${loanAmount.toLocaleString('en-IN')}.`,
      type: 'New_Customer',
      read: false
    });

    res.status(201).json(customer);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ message: 'Error creating customer record' });
  }
});

// 5. Edit Customer Details
router.put('/customers/:id', authenticateToken, authorizeRole(['admin']), upload.fields(documentFields), async (req, res) => {
  try {
    const rawData = req.body;
    const oldCustomer = await db.findOne('customers', { _id: req.params.id });

    if (!oldCustomer) {
      return res.status(404).json({ message: 'Customer record not found' });
    }

    const files = req.files || {};
    const updatedDocs = { ...oldCustomer.documents };
    documentFields.forEach(f => {
      if (files[f.name] && files[f.name][0]) {
        updatedDocs[f.name] = `/uploads/${files[f.name][0].filename}`;
      }
    });

    const updatedCustomer = {
      ...oldCustomer,
      fullName: rawData.fullName || oldCustomer.fullName,
      fatherName: rawData.fatherName !== undefined ? rawData.fatherName : oldCustomer.fatherName,
      motherName: rawData.motherName !== undefined ? rawData.motherName : oldCustomer.motherName,
      mobileNumber: rawData.mobileNumber || oldCustomer.mobileNumber,
      alternateNumber: rawData.alternateNumber !== undefined ? rawData.alternateNumber : oldCustomer.alternateNumber,
      email: rawData.email !== undefined ? rawData.email : oldCustomer.email,
      address: rawData.address !== undefined ? rawData.address : oldCustomer.address,
      city: rawData.city !== undefined ? rawData.city : oldCustomer.city,
      district: rawData.district !== undefined ? rawData.district : oldCustomer.district,
      state: rawData.state !== undefined ? rawData.state : oldCustomer.state,
      pinCode: rawData.pinCode !== undefined ? rawData.pinCode : oldCustomer.pinCode,
      aadhaarNumber: rawData.aadhaarNumber !== undefined ? rawData.aadhaarNumber : oldCustomer.aadhaarNumber,
      panNumber: rawData.panNumber !== undefined ? rawData.panNumber : oldCustomer.panNumber,
      occupation: rawData.occupation !== undefined ? rawData.occupation : oldCustomer.occupation,
      monthlyIncome: rawData.monthlyIncome !== undefined ? Number(rawData.monthlyIncome) : oldCustomer.monthlyIncome,
      bankDetails: {
        bankName: rawData.bankName !== undefined ? rawData.bankName : (oldCustomer.bankDetails ? oldCustomer.bankDetails.bankName : ''),
        accountNumber: rawData.accountNumber !== undefined ? rawData.accountNumber : (oldCustomer.bankDetails ? oldCustomer.bankDetails.accountNumber : ''),
        ifscCode: rawData.ifscCode !== undefined ? rawData.ifscCode : (oldCustomer.bankDetails ? oldCustomer.bankDetails.ifscCode : '')
      },
      nomineeDetails: rawData.nomineeDetails !== undefined ? rawData.nomineeDetails : oldCustomer.nomineeDetails,
      installationAddress: rawData.installationAddress !== undefined ? rawData.installationAddress : oldCustomer.installationAddress,
      solarCapacity: rawData.solarCapacity !== undefined ? Number(rawData.solarCapacity) : oldCustomer.solarCapacity,
      solarBrand: rawData.solarBrand !== undefined ? rawData.solarBrand : oldCustomer.solarBrand,
      solarCost: rawData.solarCost !== undefined ? Number(rawData.solarCost) : oldCustomer.solarCost,
      installationDate: rawData.installationDate !== undefined ? rawData.installationDate : oldCustomer.installationDate,
      warrantyDetails: rawData.warrantyDetails !== undefined ? rawData.warrantyDetails : oldCustomer.warrantyDetails,
      remarks: rawData.remarks !== undefined ? rawData.remarks : oldCustomer.remarks,
      documents: updatedDocs
    };

    // If financial fields change, schedule should not be dynamically updated since payments might be made already,
    // unless requested. We assume modifications are for metadata. 
    // Save customer
    const saved = await db.updateOne('customers', { _id: req.params.id }, updatedCustomer);

    await logAdminAction(req.user.username, 'EDIT_CUSTOMER', oldCustomer.customerId, { edits: Object.keys(rawData) });

    res.json(saved);
  } catch (error) {
    console.error('Edit customer error:', error);
    res.status(500).json({ message: 'Error editing customer details' });
  }
});

// 6. Delete Customer
router.delete('/customers/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const customer = await db.findOne('customers', { _id: req.params.id });
    if (!customer) {
      return res.status(404).json({ message: 'Customer record not found' });
    }

    // Delete customer
    await db.deleteOne('customers', { _id: req.params.id });
    // Delete corresponding customer user
    await db.deleteOne('users', { customerId: customer.customerId });

    await logAdminAction(req.user.username, 'DELETE_CUSTOMER', customer.customerId, { name: customer.fullName });

    res.json({ message: `Successfully deleted customer ${customer.fullName} and their log files.` });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ message: 'Error deleting customer' });
  }
});

// 7. Update Payment (Mark EMI as Paid)
router.post('/payments/mark-paid', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { customerId, emiNumber, paymentDate, remarks } = req.body;

  if (!customerId || !emiNumber) {
    return res.status(400).json({ message: 'Customer ID and EMI Number are required' });
  }

  try {
    const customer = await db.findOne('customers', { customerId });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const scheduleIndex = customer.emiSchedule.findIndex(e => e.emiNumber === Number(emiNumber));
    if (scheduleIndex === -1) {
      return res.status(404).json({ message: `EMI #${emiNumber} not found in customer schedule` });
    }

    const emi = customer.emiSchedule[scheduleIndex];
    if (emi.status === 'Paid') {
      return res.status(400).json({ message: `EMI #${emiNumber} has already been marked as Paid` });
    }

    // Perform real-time late penalty checks relative to the marking date
    const paidDate = paymentDate ? new Date(paymentDate) : new Date();
    const { penalty, daysLate } = recalculateCustomerEmiStatus(customer, paidDate)
      .emiSchedule[scheduleIndex]; // Get penalty calculated at paid date

    // Mark paid in schedule
    customer.emiSchedule[scheduleIndex].status = 'Paid';
    customer.emiSchedule[scheduleIndex].paidAmount = emi.emiAmount + penalty;
    customer.emiSchedule[scheduleIndex].paidDate = paidDate.toISOString().split('T')[0];
    customer.emiSchedule[scheduleIndex].lateFee = penalty;
    customer.emiSchedule[scheduleIndex].totalOutstanding = 0;
    customer.emiSchedule[scheduleIndex].remarks = remarks || 'Marked paid by admin';

    // Recalculate customer loan levels
    const updatedCustomer = recalculateCustomerEmiStatus(customer, new Date());
    await db.updateOne('customers', { _id: customer._id }, updatedCustomer);

    // Generate a printable Payment Receipt Record
    const receiptId = `REC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const paymentRecord = await db.create('payments', {
      receiptId,
      customerId,
      customerName: customer.fullName,
      emiNumber: Number(emiNumber),
      paymentDate: paidDate.toISOString().split('T')[0],
      paidAmount: emi.emiAmount + penalty,
      baseEmiAmount: emi.emiAmount,
      interestPaid: emi.interestPaid,
      principalPaid: emi.principalPaid,
      lateFeePaid: penalty,
      daysLate,
      status: 'Paid',
      remarks: remarks || 'Standard payment'
    });

    // Create log
    await logAdminAction(req.user.username, 'MARK_EMI_PAID', customerId, {
      emiNumber,
      paidAmount: emi.emiAmount + penalty,
      receiptId
    });

    // Create notifications
    await db.create('notifications', {
      customerId,
      role: 'customer',
      title: 'Payment Confirmation',
      message: `Your payment of ₹${paymentRecord.paidAmount.toLocaleString('en-IN')} for EMI #${emiNumber} has been received. Receipt ID: ${receiptId}.`,
      type: 'Payment_Received_Cust',
      read: false
    });

    await db.create('notifications', {
      role: 'admin',
      customerId,
      title: 'Payment Received',
      message: `Payment of ₹${paymentRecord.paidAmount.toLocaleString('en-IN')} received from ${customer.fullName} for EMI #${emiNumber}.`,
      type: 'Payment_Received_Admin',
      read: false
    });

    res.json({ message: `EMI #${emiNumber} marked as Paid successfully`, payment: paymentRecord });
  } catch (error) {
    console.error('Mark payment paid error:', error);
    res.status(500).json({ message: 'Error marking payment as paid' });
  }
});

// 8. Delete / Undo a Payment (Reverse Paid → Pending)
router.delete('/payments/delete-payment', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { customerId, emiNumber } = req.body;

  if (!customerId || !emiNumber) {
    return res.status(400).json({ message: 'Customer ID and EMI Number are required' });
  }

  try {
    const customer = await db.findOne('customers', { customerId });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const scheduleIndex = customer.emiSchedule.findIndex(e => e.emiNumber === Number(emiNumber));
    if (scheduleIndex === -1) {
      return res.status(404).json({ message: `EMI #${emiNumber} not found in schedule` });
    }

    const emi = customer.emiSchedule[scheduleIndex];
    if (emi.status !== 'Paid') {
      return res.status(400).json({ message: `EMI #${emiNumber} is not marked as Paid — nothing to delete` });
    }

    // Reset EMI back to Pending
    customer.emiSchedule[scheduleIndex].status = 'Pending';
    customer.emiSchedule[scheduleIndex].paidAmount = 0;
    customer.emiSchedule[scheduleIndex].paidDate = null;
    customer.emiSchedule[scheduleIndex].lateFee = 0;
    customer.emiSchedule[scheduleIndex].remarks = '';

    // Clear requestingEmi if it matches this EMI
    if (customer.requestingEmi === Number(emiNumber)) {
      customer.requestingEmi = null;
    }

    // Recalculate customer status
    const updatedCustomer = recalculateCustomerEmiStatus(customer, new Date());
    await db.updateOne('customers', { _id: customer._id }, updatedCustomer);

    // Remove the payment record from payments collection
    const allPayments = await db.find('payments');
    const matchingPayment = allPayments.find(p => p.customerId === customerId && p.emiNumber === Number(emiNumber));
    if (matchingPayment) {
      await db.deleteOne('payments', { _id: matchingPayment._id });
    }

    await logAdminAction(req.user.username, 'DELETE_EMI_PAYMENT', customerId, {
      emiNumber,
      note: 'EMI payment reversed to Pending by admin'
    });

    // Notify the customer that admin removed the payment (they need to re-pay)
    await db.create('notifications', {
      customerId,
      role: 'customer',
      title: 'Payment Record Removed',
      message: `Admin has reversed EMI #${emiNumber} payment record. The installment is now marked as Pending. Please contact MRS Associates if you have already paid.`,
      type: 'Payment_Removed',
      read: false
    });

    res.json({ message: `EMI #${emiNumber} payment successfully deleted. Status reset to Pending.` });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ message: 'Error deleting payment record' });
  }
});

// 9. Trigger Scheduler manually (For admin convenience/testing)
router.post('/trigger-scheduler', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const result = await runDailyInterestAndPenaltyCheck(new Date());
    await logAdminAction(req.user.username, 'TRIGGER_SCHEDULER', 'SYSTEM', result);
    res.json({ message: 'Daily calculation run completed successfully', details: result });
  } catch (error) {
    console.error('Scheduler trigger error:', error);
    res.status(500).json({ message: 'Failed to run daily checks' });
  }
});

// 9. Audit Logs
router.get('/audit-logs', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const logs = await db.find('audit_logs');
    // Sort in reverse chronological order
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(logs);
  } catch (error) {
    console.error('Audit logs fetch error:', error);
    res.status(500).json({ message: 'Error loading audit logs' });
  }
});

// 10. Backup DB
router.post('/backup/create', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const backupResult = await db.backup();
    await logAdminAction(req.user.username, 'CREATE_BACKUP', backupResult.backupName);
    res.json({ message: 'Database backup completed successfully', ...backupResult });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ message: 'Database backup failed' });
  }
});

// 10b. Export Full Database as JSON
router.get('/backup/export-json', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const collections = ['users', 'customers', 'payments', 'notifications', 'audit_logs'];
    const exportData = {
      appName: 'MRS SOLAR Solar Panel Loan System',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      collections: {}
    };

    for (const col of collections) {
      exportData.collections[col] = await db.find(col);
    }

    const content = JSON.stringify(exportData, null, 2);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=MRS_SOLAR_Database_Backup_${Date.now()}.json`);
    res.send(content);
  } catch (error) {
    console.error('JSON export error:', error);
    res.status(500).json({ message: 'Failed to export JSON database backup' });
  }
});

// 10c. Export Customer Ledger as CSV (Excel Compatible)
router.get('/backup/export-csv', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const customers = await db.find('customers');
    const headers = [
      'Customer ID', 'Full Name', 'Mobile Number', 'Aadhaar Number', 'PAN Number',
      'Solar Capacity (kW)', 'Solar Cost', 'Down Payment', 'Loan Amount',
      'Monthly EMI', 'EMI Duration (Months)', 'Payment Status', 'Total Outstanding'
    ];

    let csvContent = headers.join(',') + '\n';

    customers.forEach(c => {
      const row = [
        `"${c.customerId || ''}"`,
        `"${(c.fullName || '').replace(/"/g, '""')}"`,
        `"${c.mobileNumber || ''}"`,
        `"${c.aadhaarNumber || ''}"`,
        `"${c.panNumber || ''}"`,
        `"${c.solarCapacity || 0}"`,
        `"${c.solarCost || 0}"`,
        `"${c.downPayment || 0}"`,
        `"${c.loanAmount || 0}"`,
        `"${c.monthlyEmi || 0}"`,
        `"${c.emiDuration || 0}"`,
        `"${c.paymentStatus || 'Pending'}"`,
        `"${c.totalOutstandingAmount || 0}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=MRS_SOLAR_Customer_Ledger_${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ message: 'Failed to export CSV database ledger' });
  }
});

// 10d. Export Database as MDB File
router.get('/backup/export-mdb', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const collections = ['users', 'customers', 'payments', 'notifications', 'audit_logs'];
    const exportData = {
      databaseName: 'MRS_SOLAR_MDB',
      exportedAt: new Date().toISOString(),
      format: 'Microsoft Access MDB / JSON Database Dump',
      collections: {}
    };

    for (const col of collections) {
      exportData.collections[col] = await db.find(col);
    }

    const mdbContent = JSON.stringify(exportData, null, 2);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=MRS_SOLAR_Backup_${Date.now()}.mdb`);
    res.send(mdbContent);
  } catch (error) {
    console.error('MDB export error:', error);
    res.status(500).json({ message: 'Failed to export MDB database backup' });
  }
});

// 11. List Backups
router.get('/backups', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const list = await db.listBackups();
    res.json(list);
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({ message: 'Error listing backups' });
  }
});

// 12. Restore DB
router.post('/backup/restore', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { backupName } = req.body;
  if (!backupName) {
    return res.status(400).json({ message: 'Backup file name is required' });
  }

  try {
    await db.restore(backupName);
    await logAdminAction(req.user.username, 'RESTORE_BACKUP', backupName);
    res.json({ message: `Database successfully restored to state of ${backupName}.` });
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ message: `Restore failed: ${error.message}` });
  }
});

export default router;
