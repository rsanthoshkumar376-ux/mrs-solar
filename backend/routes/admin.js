import express from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import { db } from '../database/db.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { generateAmortizationSchedule, recalculateCustomerEmiStatus } from '../utils/calculations.js';
import { logAdminAction } from '../utils/logger.js';
import { runDailyInterestAndPenaltyCheck } from '../utils/scheduler.js';
import { sendReceiptEmail, testEmailConnection, getEmailConfig } from '../utils/email.js';


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

    // Validate essential inputs (Email is optional)
    if (!rawData.fullName || !rawData.mobileNumber || !rawData.loanAmount || !rawData.interestRate || !rawData.emiDuration) {
      return res.status(400).json({ message: 'Missing mandatory fields: Customer Name, Mobile Number, and Loan Details are required' });
    }

    const cleanEmail = String(rawData.email || '').trim().toLowerCase();
    if (cleanEmail && (!cleanEmail.includes('@') || !cleanEmail.includes('.'))) {
      return res.status(400).json({ message: 'If provided, Email Address must be a valid email (e.g. customer@gmail.com)' });
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
      email: cleanEmail || '',
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

// 4b. Update Customer Email
router.put('/customers/:id/email', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ message: 'Valid email address is compulsory' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const customer = (await db.findOne('customers', { _id: req.params.id })) || (await db.findOne('customers', { customerId: req.params.id }));
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    await db.updateOne('customers', { _id: customer._id }, { email: cleanEmail });
    res.json({ message: `Customer email successfully updated to ${cleanEmail}`, email: cleanEmail });
  } catch (error) {
    console.error('Update email error:', error);
    res.status(500).json({ message: 'Error updating customer email' });
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
  const { customerId, emiNumber, paymentDate, remarks, email } = req.body;

  if (!customerId || !emiNumber) {
    return res.status(400).json({ message: 'Customer ID and EMI Number are required' });
  }

  try {
    const customer = await db.findOne('customers', { customerId });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // If admin provided or updated customer email, update customer record immediately
    let targetEmail = (customer.email || '').trim().toLowerCase();
    if (email && email.trim() && email.includes('@')) {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail !== targetEmail) {
        targetEmail = cleanEmail;
        customer.email = targetEmail;
        await db.updateOne('customers', { _id: customer._id }, { email: targetEmail });
      }
    }

    const scheduleIndex = customer.emiSchedule.findIndex(e => e.emiNumber === Number(emiNumber));
    if (scheduleIndex === -1) {
      return res.status(404).json({ message: `EMI #${emiNumber} not found in customer schedule` });
    }

    const emi = customer.emiSchedule[scheduleIndex];
    if (emi.status === 'Paid') {
      return res.status(400).json({ message: `EMI #${emiNumber} has already been marked as Paid` });
    }

    // Enforce sequential payment order (EMI #1 must be paid before EMI #2, etc.)
    const priorPending = customer.emiSchedule.find(e => e.emiNumber < Number(emiNumber) && e.status !== 'Paid');
    if (priorPending) {
      return res.status(400).json({ 
        message: `Payments must be verified in order! Please verify EMI #${priorPending.emiNumber} before paying EMI #${emiNumber}.` 
      });
    }

    // Calculate late fee and total paid amount accurately
    const paidDate = paymentDate ? new Date(paymentDate) : new Date();
    const recalculated = recalculateCustomerEmiStatus(customer, paidDate);
    const emiAtPaidDate = recalculated.emiSchedule[scheduleIndex];
    const lateFee = Number(emiAtPaidDate?.lateFee || 0);
    const baseEmi = Number(emi.emiAmount || 0);
    const totalPaidAmount = Math.round((baseEmi + lateFee) * 100) / 100;

    // Mark paid in schedule
    customer.emiSchedule[scheduleIndex].status = 'Paid';
    customer.emiSchedule[scheduleIndex].paidAmount = totalPaidAmount;
    customer.emiSchedule[scheduleIndex].paidDate = paidDate.toISOString().split('T')[0];
    customer.emiSchedule[scheduleIndex].lateFee = lateFee;
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
      paidAmount: totalPaidAmount,
      baseEmiAmount: baseEmi,
      interestPaid: Number(emi.interestPaid || 0),
      principalPaid: Number(emi.principalPaid || 0),
      lateFeePaid: lateFee,
      daysLate: Number(emiAtPaidDate?.daysLate || 0),
      status: 'Paid',
      remarks: remarks || 'Standard payment'
    });

    // Create log
    await logAdminAction(req.user.username, 'MARK_EMI_PAID', customerId, {
      emiNumber,
      paidAmount: totalPaidAmount,
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

    // Send receipt email reliably in background to customer's Gmail
    if (targetEmail && targetEmail.includes('@')) {
      sendReceiptEmail(paymentRecord, { ...customer, email: targetEmail }, targetEmail)
        .then(result => {
          if (result && result.success) {
            console.log(`[Email] Receipt sent to ${targetEmail} for EMI #${emiNumber}: ${result.messageId}`);
          } else {
            console.warn(`[Email] Receipt delivery issue for ${targetEmail}:`, result?.error || result?.reason);
          }
        })
        .catch(err => {
          console.warn('[Email] Background delivery error:', err.message);
        });
    }

    res.json({ 
      message: `EMI #${emiNumber} marked as Paid successfully!${targetEmail ? ` Receipt sent to ${targetEmail}.` : ' (No customer email found)'}`, 
      payment: paymentRecord,
      recipientEmail: targetEmail
    });
  } catch (error) {
    console.error('Mark payment paid error:', error);
    res.status(500).json({ message: 'Error marking payment as paid' });
  }
});

// 7b. Send / Resend Receipt via Email
router.post('/payments/send-receipt-email', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { customerId, emiNumber, email } = req.body;
  if (!customerId || !emiNumber) {
    return res.status(400).json({ message: 'Customer ID and EMI Number are required' });
  }

  try {
    const customer = await db.findOne('customers', { customerId });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const allPayments = await db.find('payments');
    let payment = allPayments.find(p => p.customerId === customerId && Number(p.emiNumber) === Number(emiNumber));
    
    // If not in payments collection, build from emiSchedule
    if (!payment && customer.emiSchedule) {
      const emi = customer.emiSchedule.find(e => Number(e.emiNumber) === Number(emiNumber));
      if (emi && emi.status === 'Paid') {
        payment = {
          receiptId: `REC-${Date.now().toString().slice(-6)}`,
          customerId,
          customerName: customer.fullName,
          emiNumber: Number(emiNumber),
          paymentDate: emi.paidDate || new Date().toISOString().split('T')[0],
          paidAmount: emi.paidAmount || (emi.emiAmount + (emi.lateFee || 0)),
          baseEmiAmount: emi.emiAmount,
          interestPaid: emi.interestPaid,
          principalPaid: emi.principalPaid,
          lateFeePaid: emi.lateFee || 0,
          remarks: emi.remarks || 'Standard payment'
        };
      }
    }

    if (!payment) {
      return res.status(404).json({ message: `No paid payment record found for EMI #${emiNumber}` });
    }

    // Ensure payment amounts are positive valid numbers
    const emiInSchedule = customer.emiSchedule?.find(e => Number(e.emiNumber) === Number(emiNumber));
    const baseAmount = Number(payment.baseEmiAmount || emiInSchedule?.emiAmount || 0);
    const lateFee = Number(payment.lateFeePaid || emiInSchedule?.lateFee || 0);
    let validPaidAmount = Number(payment.paidAmount);
    if (!validPaidAmount || isNaN(validPaidAmount) || validPaidAmount <= 0) {
      validPaidAmount = Math.round((baseAmount + lateFee) * 100) / 100;
    }
    payment.paidAmount = validPaidAmount;
    payment.baseEmiAmount = baseAmount;
    payment.lateFeePaid = lateFee;
    if (emiInSchedule) {
      payment.interestPaid = Number(emiInSchedule.interestPaid || payment.interestPaid || 0);
      payment.principalPaid = Number(emiInSchedule.principalPaid || payment.principalPaid || 0);
    }

    const recipient = email || customer.email;
    if (!recipient) {
      return res.status(400).json({ message: 'No email address found for this customer. Please enter an email address.' });
    }

    const result = await sendReceiptEmail(payment, customer, recipient);
    if (result.success) {
      await logAdminAction(req.user.username, 'SEND_RECEIPT_EMAIL', customerId, { emiNumber, recipient });
      res.json({ message: `Receipt successfully sent to ${recipient}!` });
    } else {
      res.status(500).json({ message: `Failed to send email: ${result.error || result.reason}` });
    }
  } catch (error) {
    console.error('Send receipt email error:', error);
    res.status(500).json({ message: 'Error sending receipt email' });
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

// 9b. Email Settings & Diagnostics
router.get('/email-settings', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const config = await getEmailConfig();
    const isRender = process.env.RENDER === 'true' || !!process.env.RENDER_SERVICE_ID || !!process.env.RENDER_EXTERNAL_URL;

    res.json({
      activeMethod: config.activeMethod,
      relayUrl: config.relayUrl,
      brevoApiKeyMasked: config.brevoApiKey ? `${config.brevoApiKey.slice(0, 8)}...${config.brevoApiKey.slice(-4)}` : '',
      resendApiKeyMasked: config.resendApiKey ? `${config.resendApiKey.slice(0, 8)}...${config.resendApiKey.slice(-4)}` : '',
      senderEmail: config.senderEmail,
      isRender
    });
  } catch (err) {
    console.error('Fetch email settings error:', err);
    res.status(500).json({ message: 'Failed to fetch email settings' });
  }
});

router.post('/email-settings', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { relayUrl, brevoApiKey, resendApiKey, senderEmail } = req.body;
    let existing = await db.findOne('settings', { key: 'email' });

    const updatedData = {
      key: 'email',
      relayUrl: typeof relayUrl === 'string' ? relayUrl.trim() : (existing?.relayUrl || ''),
      brevoApiKey: typeof brevoApiKey === 'string' ? brevoApiKey.trim() : (existing?.brevoApiKey || ''),
      resendApiKey: typeof resendApiKey === 'string' ? resendApiKey.trim() : (existing?.resendApiKey || ''),
      senderEmail: typeof senderEmail === 'string' ? senderEmail.trim() : (existing?.senderEmail || 'mrsassociates19@gmail.com')
    };

    if (existing) {
      await db.updateOne('settings', { _id: existing._id }, updatedData);
    } else {
      await db.create('settings', updatedData);
    }

    await logAdminAction(req.user.username, 'UPDATE_EMAIL_SETTINGS', 'SYSTEM', {
      hasRelay: !!updatedData.relayUrl,
      hasBrevo: !!updatedData.brevoApiKey
    });

    const refreshedConfig = await getEmailConfig();
    res.json({ 
      message: 'Email settings successfully updated and applied!',
      activeMethod: refreshedConfig.activeMethod
    });
  } catch (err) {
    console.error('Save email settings error:', err);
    res.status(500).json({ message: 'Failed to save email settings' });
  }
});

router.post('/email-settings/test', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { targetEmail } = req.body;
  const emailToSend = String(targetEmail || 'rsanthoshkumar376@gmail.com').trim();

  if (!emailToSend || !emailToSend.includes('@') || !emailToSend.includes('.')) {
    return res.status(400).json({ message: 'Please provide a valid destination email address for testing' });
  }

  try {
    const diagnostic = await testEmailConnection(emailToSend);
    if (diagnostic.success) {
      await logAdminAction(req.user.username, 'TEST_EMAIL_SUCCESS', 'SYSTEM', { targetEmail: emailToSend, method: diagnostic.method });
      res.json({
        success: true,
        message: `Test email successfully delivered to ${emailToSend} via ${diagnostic.method} in ${diagnostic.durationMs}ms!`,
        diagnostic
      });
    } else {
      res.status(500).json({
        success: false,
        message: `Email delivery failed: ${diagnostic.error || diagnostic.reason}`,
        diagnostic
      });
    }
  } catch (err) {
    console.error('Test email error:', err);
    res.status(500).json({ message: `Test email error: ${err.message}` });
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

// 10d. Export Database as proper Excel (.xlsx) with multiple sheets
router.get('/backup/export-mdb', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const customers = await db.find('customers');
    const payments  = await db.find('payments');
    const notifications = await db.find('notifications');

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MRS SOLAR System';
    workbook.created = new Date();

    // Helper: style a header row teal
    function styleHeader(sheet, columns) {
      sheet.columns = columns;
      const headerRow = sheet.getRow(1);
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        };
      });
      headerRow.height = 22;
    }

    // ── Sheet 1: Customer Ledger ──────────────────────────────────────
    const sheet1 = workbook.addWorksheet('Customer Ledger');
    styleHeader(sheet1, [
      { header: 'Customer ID',        key: 'customerId',       width: 14 },
      { header: 'Full Name',          key: 'fullName',         width: 22 },
      { header: 'Mobile',             key: 'mobileNumber',     width: 14 },
      { header: 'Aadhaar',            key: 'aadhaarNumber',    width: 16 },
      { header: 'PAN',                key: 'panNumber',        width: 13 },
      { header: 'Address',            key: 'address',          width: 30 },
      { header: 'Solar kW',           key: 'solarCapacity',    width: 10 },
      { header: 'Solar Brand',        key: 'solarBrand',       width: 14 },
      { header: 'Solar Cost (₹)',     key: 'solarCost',        width: 14 },
      { header: 'Down Payment (₹)',   key: 'downPayment',      width: 16 },
      { header: 'Loan Amount (₹)',    key: 'loanAmount',       width: 16 },
      { header: 'Interest Rate (%)',  key: 'interestRate',     width: 16 },
      { header: 'EMI Duration (mo)',  key: 'emiDuration',      width: 16 },
      { header: 'Monthly EMI (₹)',    key: 'monthlyEmi',       width: 16 },
      { header: 'Loan Start',         key: 'loanStartDate',    width: 13 },
      { header: 'Loan End',           key: 'loanEndDate',      width: 13 },
      { header: 'Payment Status',     key: 'paymentStatus',    width: 15 },
      { header: 'Loan Status',        key: 'loanStatus',       width: 12 },
      { header: 'Outstanding (₹)',    key: 'totalOutstanding', width: 16 },
    ]);
    customers.forEach(c => {
      const row = sheet1.addRow({
        customerId:      c.customerId || '',
        fullName:        c.fullName || '',
        mobileNumber:    c.mobileNumber || '',
        aadhaarNumber:   c.aadhaarNumber || '',
        panNumber:       c.panNumber || '',
        address:         c.address || '',
        solarCapacity:   c.solarCapacity || 0,
        solarBrand:      c.solarBrand || '',
        solarCost:       c.solarCost || 0,
        downPayment:     c.downPayment || 0,
        loanAmount:      c.loanAmount || 0,
        interestRate:    c.interestRate || 0,
        emiDuration:     c.emiDuration || 0,
        monthlyEmi:      c.monthlyEmi || 0,
        loanStartDate:   c.loanStartDate || '',
        loanEndDate:     c.loanEndDate || '',
        paymentStatus:   c.paymentStatus || 'Pending',
        loanStatus:      c.loanStatus || 'Active',
        totalOutstanding: c.totalOutstandingAmount || 0,
      });
      // Colour status cell
      const statusCell = row.getCell('paymentStatus');
      if (c.paymentStatus === 'Paid')    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
      else if (c.paymentStatus === 'Overdue') statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    });

    // ── Sheet 2: EMI Repayment Schedule ──────────────────────────────
    const sheet2 = workbook.addWorksheet('EMI Schedule');
    styleHeader(sheet2, [
      { header: 'Customer ID',   key: 'customerId',  width: 14 },
      { header: 'Customer Name', key: 'fullName',    width: 22 },
      { header: 'EMI #',        key: 'emiNumber',   width: 8  },
      { header: 'Due Date',      key: 'dueDate',     width: 13 },
      { header: 'EMI Amount (₹)',key: 'emiAmount',   width: 15 },
      { header: 'Principal (₹)', key: 'principal',   width: 15 },
      { header: 'Interest (₹)',  key: 'interest',    width: 14 },
      { header: 'Late Fee (₹)',  key: 'lateFee',     width: 13 },
      { header: 'Paid Amount (₹)',key:'paidAmount',  width: 15 },
      { header: 'Paid Date',     key: 'paidDate',    width: 13 },
      { header: 'Remaining (₹)', key: 'remaining',   width: 14 },
      { header: 'Status',        key: 'status',      width: 12 },
    ]);
    customers.forEach(c => {
      (c.emiSchedule || []).forEach(emi => {
        const row = sheet2.addRow({
          customerId: c.customerId,
          fullName:   c.fullName,
          emiNumber:  emi.emiNumber,
          dueDate:    emi.dueDate || '',
          emiAmount:  emi.emiAmount || 0,
          principal:  emi.principalPaid || 0,
          interest:   emi.interestPaid || 0,
          lateFee:    emi.lateFee || 0,
          paidAmount: emi.paidAmount || 0,
          paidDate:   emi.paidDate || '',
          remaining:  emi.remainingBalance || 0,
          status:     emi.status || 'Pending',
        });
        const sc = row.getCell('status');
        if (emi.status === 'Paid')   sc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
        else if (emi.status === 'Overdue') sc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      });
    });

    // ── Sheet 3: Payment Receipts ─────────────────────────────────────
    const sheet3 = workbook.addWorksheet('Payment Receipts');
    styleHeader(sheet3, [
      { header: 'Receipt ID',    key: 'receiptId',    width: 20 },
      { header: 'Customer ID',   key: 'customerId',   width: 14 },
      { header: 'Customer Name', key: 'customerName', width: 22 },
      { header: 'EMI #',        key: 'emiNumber',    width: 8  },
      { header: 'Payment Date',  key: 'paymentDate',  width: 14 },
      { header: 'Paid Amount (₹)',key:'paidAmount',   width: 15 },
      { header: 'Base EMI (₹)', key: 'baseEmi',      width: 14 },
      { header: 'Interest (₹)', key: 'interest',     width: 13 },
      { header: 'Late Fee (₹)', key: 'lateFee',      width: 13 },
      { header: 'Days Late',    key: 'daysLate',     width: 11 },
      { header: 'Remarks',      key: 'remarks',      width: 25 },
    ]);
    payments.forEach(p => {
      sheet3.addRow({
        receiptId:    p.receiptId || '',
        customerId:   p.customerId || '',
        customerName: p.customerName || '',
        emiNumber:    p.emiNumber || '',
        paymentDate:  p.paymentDate || '',
        paidAmount:   p.paidAmount || 0,
        baseEmi:      p.baseEmiAmount || 0,
        interest:     p.interestPaid || 0,
        lateFee:      p.lateFeePaid || 0,
        daysLate:     p.daysLate || 0,
        remarks:      p.remarks || '',
      });
    });

    // ── Sheet 4: Notifications ────────────────────────────────────────
    const sheet4 = workbook.addWorksheet('Notifications');
    styleHeader(sheet4, [
      { header: 'Customer ID', key: 'customerId', width: 14 },
      { header: 'Role',        key: 'role',       width: 10 },
      { header: 'Title',       key: 'title',      width: 30 },
      { header: 'Message',     key: 'message',    width: 50 },
      { header: 'Type',        key: 'type',       width: 22 },
      { header: 'Read',        key: 'read',       width: 8  },
      { header: 'Created At',  key: 'createdAt',  width: 20 },
    ]);
    notifications.forEach(n => {
      sheet4.addRow({
        customerId: n.customerId || '',
        role:       n.role || '',
        title:      n.title || '',
        message:    n.message || '',
        type:       n.type || '',
        read:       n.read ? 'Yes' : 'No',
        createdAt:  n.createdAt || n.updatedAt || '',
      });
    });

    // Stream as .xlsx download
    const filename = `MRS_SOLAR_Database_${new Date().toISOString().slice(0,10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ message: 'Failed to generate Excel database export: ' + error.message });
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

// 12. Restore DB from server recovery point
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

// 13. Import & Restore Database from local JSON File
router.post('/backup/import-json', authenticateToken, authorizeRole(['admin']), upload.single('backupFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No backup file uploaded' });
    }

    const filePath = req.file.path;
    const fileContent = await fs.readFile(filePath, 'utf-8');
    let parsedData;
    
    try {
      parsedData = JSON.parse(fileContent);
    } catch {
      await fs.unlink(filePath).catch(() => {});
      return res.status(400).json({ message: 'Invalid file format. Please upload a valid JSON backup file.' });
    }

    const collections = parsedData.collections || parsedData;
    const targetCollections = ['users', 'customers', 'payments', 'notifications', 'audit_logs'];

    let restoredStats = {};
    for (const col of targetCollections) {
      if (Array.isArray(collections[col])) {
        const items = collections[col];
        for (const item of items) {
          if (item._id) {
            const existing = await db.findOne(col, { _id: item._id });
            if (existing) {
              await db.updateOne(col, { _id: item._id }, item);
            } else {
              await db.create(col, item);
            }
          } else {
            await db.create(col, item);
          }
        }
        restoredStats[col] = items.length;
      }
    }

    // Clean up temporary file
    await fs.unlink(filePath).catch(() => {});

    await logAdminAction(req.user.username, 'IMPORT_BACKUP_FILE', req.file.originalname, restoredStats);

    res.json({
      message: 'Database backup imported successfully into MongoDB Atlas!',
      details: restoredStats
    });
  } catch (error) {
    console.error('Import JSON backup error:', error);
    res.status(500).json({ message: `Failed to import JSON backup: ${error.message}` });
  }
});

export default router;
