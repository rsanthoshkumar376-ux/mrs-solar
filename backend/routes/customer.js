import express from 'express';
import { db } from '../database/db.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { recalculateCustomerEmiStatus } from '../utils/calculations.js';
import { resolveCustomerDocumentUrls, maskAadhaar } from '../utils/storage.js';
import { getActiveUpiAccount } from '../utils/upiConfig.js';

const router = express.Router();

// 1. Customer Dashboard Details (Read-only access to customer's own loan)
router.get('/dashboard', authenticateToken, authorizeRole(['customer']), async (req, res) => {
  try {
    const customerId = req.user.customerId;
    if (!customerId) {
      return res.status(400).json({ message: 'Customer ID not associated with this user profile' });
    }

    const customer = await db.findOne('customers', { customerId });
    if (!customer) {
      return res.status(404).json({ message: 'Customer details not found' });
    }

    // Recalculate late fees and status dynamically in real-time
    const updatedCustomer = recalculateCustomerEmiStatus(customer, new Date());
    
    // Resolve documents to signed, expiring URLs and mask Aadhaar
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const safeCustomer = await resolveCustomerDocumentUrls(updatedCustomer, baseUrl);

    // Attach active administrator-selected UPI account for payment routing
    const activeUpi = await getActiveUpiAccount();

    res.json({
      ...safeCustomer,
      activeUpi
    });
  } catch (error) {
    console.error('Customer dashboard error:', error);
    res.status(500).json({ message: 'Error loading dashboard details' });
  }
});

// 1.1 Direct Active UPI endpoint
router.get('/active-upi', async (req, res) => {
  try {
    const activeUpi = await getActiveUpiAccount();
    res.json(activeUpi);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active payment UPI' });
  }
});

// 2. Customer Payments History
router.get('/payments', authenticateToken, authorizeRole(['customer']), async (req, res) => {
  try {
    const customerId = req.user.customerId;
    if (!customerId) {
      return res.status(400).json({ message: 'Customer ID not associated with this user profile' });
    }

    const history = await db.find('payments', { customerId });
    // Sort in reverse chronological order
    history.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
    res.json(history);
  } catch (error) {
    console.error('Customer payments fetch error:', error);
    res.status(500).json({ message: 'Error loading payment history' });
  }
});

// 3. Customer Notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const { role, customerId } = req.user;
    let notifications = [];

    if (role === 'admin') {
      notifications = await db.find('notifications', { role: 'admin' });
    } else if (role === 'customer' && customerId) {
      notifications = await db.find('notifications', { customerId, role: 'customer' });
    }

    // Sort in reverse chronological order
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(notifications);
  } catch (error) {
    console.error('Notifications fetch error:', error);
    res.status(500).json({ message: 'Error loading notifications' });
  }
});

// 4. Mark notifications read
router.post('/notifications/read', authenticateToken, async (req, res) => {
  const { id } = req.body;
  try {
    if (id) {
      await db.updateOne('notifications', { _id: id }, { read: true });
    } else {
      // Mark all read for this user
      const { role, customerId } = req.user;
      if (role === 'admin') {
        await db.updateMany('notifications', { role: 'admin' }, { read: true });
      } else if (role === 'customer' && customerId) {
        await db.updateMany('notifications', { customerId, role: 'customer' }, { read: true });
      }
    }
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Mark read notifications error:', error);
    res.status(500).json({ message: 'Error updating notifications' });
  }
});

// 5. Notify Admin of Customer Payment & Submit UTR
router.post('/notify-payment', authenticateToken, authorizeRole(['customer']), async (req, res) => {
  try {
    const customerId = req.user.customerId;
    const { emiNumber, utrNumber } = req.body;

    const customer = await db.findOne('customers', { customerId });
    if (!customer) {
      return res.status(404).json({ message: 'Customer record not found' });
    }

    const cleanUtr = utrNumber ? String(utrNumber).trim() : '';

    // Stamp requestingEmi and submittedUtr on customer record
    await db.updateOne('customers', { _id: customer._id }, {
      ...customer,
      requestingEmi: Number(emiNumber),
      submittedUtr: cleanUtr,
      submittedUtrAt: new Date().toISOString()
    });

    // Create an admin notification
    await db.create('notifications', {
      role: 'admin',
      type: 'PAYMENT_SUBMITTED',
      title: 'Payment Submitted by Customer',
      message: `Customer ${customer.fullName} (${customerId}) submitted payment for EMI #${emiNumber}${cleanUtr ? ` with UPI UTR: ${cleanUtr}` : ''}. Please verify and mark as paid.`,
      customerId,
      emiNumber: Number(emiNumber),
      utrNumber: cleanUtr,
      read: false,
      createdAt: new Date().toISOString()
    });

    res.json({ 
      message: 'Payment notification and reference number successfully sent to administrator for verification.',
      utrNumber: cleanUtr
    });
  } catch (error) {
    console.error('Notify payment error:', error);
    res.status(500).json({ message: 'Error sending payment notification' });
  }
});

// 6. Direct UTR Submission endpoint
router.post('/submit-utr', authenticateToken, authorizeRole(['customer']), async (req, res) => {
  try {
    const customerId = req.user.customerId;
    const { emiNumber, utrNumber, amount } = req.body;

    if (!emiNumber || !utrNumber) {
      return res.status(400).json({ message: 'EMI number and 12-digit UTR number are required' });
    }

    const customer = await db.findOne('customers', { customerId });
    if (!customer) {
      return res.status(404).json({ message: 'Customer record not found' });
    }

    const cleanUtr = String(utrNumber).trim();

    await db.updateOne('customers', { _id: customer._id }, {
      ...customer,
      requestingEmi: Number(emiNumber),
      submittedUtr: cleanUtr,
      submittedUtrAt: new Date().toISOString()
    });

    await db.create('notifications', {
      role: 'admin',
      type: 'PAYMENT_SUBMITTED',
      title: 'UPI UTR Submitted for Verification',
      message: `Customer ${customer.fullName} (${customerId}) submitted UPI UTR ${cleanUtr} for EMI #${emiNumber} (₹${amount || 'Due'}).`,
      customerId,
      emiNumber: Number(emiNumber),
      utrNumber: cleanUtr,
      read: false,
      createdAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `UPI UTR ${cleanUtr} submitted successfully. Owner/Staff will verify and approve your receipt.`,
      utrNumber: cleanUtr
    });
  } catch (error) {
    console.error('Submit UTR error:', error);
    res.status(500).json({ message: 'Error submitting UTR number' });
  }
});

export default router;
