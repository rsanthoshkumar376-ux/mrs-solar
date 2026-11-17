import express from 'express';
import { db } from '../database/db.js';
import { authenticateToken, optionalAuthenticateToken, authorizeRole } from '../middleware/auth.js';
import { getAiConfig, callGeminiApi } from '../utils/aiConfig.js';
import { broadcastTicketEvent, notifyUser } from '../utils/socketManager.js';

const router = express.Router();

/**
 * Helper to generate unique human-readable Ticket ID: MRS-2026-XXX
 */
async function generateSupportTicketNumber() {
  try {
    const all = (await db.find('support_tickets')) || [];
    const numbers = all
      .map(t => {
        const m = String(t.ticketNumber || '').match(/MRS-\d+-(\d+)/i);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter(n => !isNaN(n) && n > 0);
    const nextNum = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
    return `MRS-2026-${String(nextNum).padStart(3, '0')}`;
  } catch (e) {
    return `MRS-2026-${Math.floor(100 + Math.random() * 900)}`;
  }
}

/**
 * Categorize issue from text
 */
function detectSupportCategory(text = '') {
  const lower = String(text).toLowerCase();
  if (/(tneb|bill|tariff|meter|white meter|electricity board|மின்கட்டணம்)/i.test(lower)) {
    return 'TNEB & Net-Metering';
  }
  if (/(generation|units|kw|power|kwh|drop|efficiency|உற்பத்தி)/i.test(lower)) {
    return 'Solar Generation & Performance';
  }
  if (/(emi|loan|interest|tenure|due|pay|sbi|canara|கடன்|தவணை)/i.test(lower)) {
    return 'Solar Loan & EMI Financing';
  }
  if (/(subsidy|pm surya|surya ghar|78000|central subsidy|மானியம்)/i.test(lower)) {
    return 'Subsidy & PM Surya Ghar';
  }
  if (/(inverter|fault|red light|damage|crack|clean|leakage|error|பழுது)/i.test(lower)) {
    return 'Technical & Maintenance Issue';
  }
  return 'Customer Manager Assistance';
}

/**
 * 1. POST /api/support/request-manager
 * Customer triggers "Connect to Manager" from AI Chatbot
 */
router.post('/request-manager', optionalAuthenticateToken, async (req, res) => {
  try {
    const { 
      chatHistory = [], 
      userQuery = '', 
      preferredLanguage = 'en',
      customerId: customCustId,
      customerName: customName,
      customerMobile: customMobile,
      customerEmail: customEmail
    } = req.body;

    // Resolve customer identity from authenticated session or request body
    let customerId = req.user?.customerId || customCustId || '';
    let customerName = req.user?.fullName || req.user?.username || customName || 'Customer';
    let customerMobile = req.user?.mobileNumber || customMobile || '';
    let customerEmail = req.user?.email || customEmail || '';
    let solarCapacityKw = 3;
    let solarCost = 195000;
    let loanStatus = 'Active';
    let customerProfile = null;

    try {
      const allCustomers = (await db.find('customers')) || [];
      if (customerId) {
        customerProfile = allCustomers.find(c => c.customerId === customerId || c._id === customerId);
      }
      if (!customerProfile && customerMobile) {
        const cleanMob = customerMobile.replace(/\D/g, '').slice(-10);
        customerProfile = allCustomers.find(c => String(c.mobileNumber || '').replace(/\D/g, '').slice(-10) === cleanMob);
      }
      if (!customerProfile && req.user?.username) {
        customerProfile = allCustomers.find(c => c.fullName && c.fullName.toLowerCase() === req.user.username.toLowerCase());
      }

      if (customerProfile) {
        customerId = customerProfile.customerId;
        customerName = customerProfile.fullName || customerName;
        customerMobile = customerProfile.mobileNumber || customerMobile;
        customerEmail = customerProfile.email || customerEmail;
        solarCapacityKw = customerProfile.solarCapacity || 3;
        solarCost = customerProfile.solarCost || 195000;
        loanStatus = customerProfile.loanStatus || 'Active';
      }
    } catch (cErr) {
      console.warn('Customer resolution error:', cErr.message);
    }

    if (!customerId) {
      customerId = `CUS-${Date.now().toString().slice(-6)}`;
    }

    // 0. Anti-duplicate safeguard: check if customer already has an active open support request
    const existingTickets = (await db.find('support_tickets')) || [];
    const activeTicket = existingTickets.find(t => 
      (t.customerId === customerId || (customerMobile && t.customerMobile === customerMobile)) &&
      ['new', 'pending', 'in_progress', 'waiting_customer'].includes(t.status)
    );

    if (activeTicket) {
      return res.json({
        success: true,
        isExisting: true,
        ticket: activeTicket,
        message: `You already have an active support request in progress. A manager is attending to your inquiry. Your Ticket ID is ${activeTicket.ticketNumber}.`
      });
    }

    // 1. Generate Issue Summary via AI or smart heuristic
    const recentUserMessages = chatHistory
      .filter(m => m.role === 'user')
      .map(m => m.text)
      .slice(-4);
    const combinedContext = userQuery || recentUserMessages.join(' | ') || 'Customer requested manager escalation for personal assistance.';

    let issueSummary = combinedContext.slice(0, 160);
    const config = await getAiConfig();

    if (config.geminiApiKey) {
      try {
        const summaryPrompt = `A rooftop solar customer in Tamil Nadu clicked "Connect to Manager" in our AI Chatbot.
Based on their recent chat questions below, write a crisp 1-sentence technical issue summary (maximum 20 words) for the manager dashboard.
Customer Questions: "${combinedContext}"
Only output the short summary sentence.`;

        const aiSummary = await callGeminiApi({
          apiKey: config.geminiApiKey,
          model: config.defaultModel || 'gemini-1.5-flash',
          prompt: summaryPrompt,
          maxOutputTokens: 60
        });
        if (aiSummary && aiSummary.trim()) {
          issueSummary = aiSummary.trim().replace(/^["']|["']$/g, '');
        }
      } catch (sumErr) {
        console.warn('AI issue summary fallback:', sumErr.message);
      }
    }

    const ticketNumber = await generateSupportTicketNumber();
    const category = detectSupportCategory(combinedContext);

    // 2. Persist new support ticket
    const newTicket = {
      _id: `SUP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      ticketNumber,
      customerId,
      customerName,
      customerMobile: customerMobile || '+91 80724 54996',
      customerEmail: customerEmail || 'customer@mrssolar.com',
      solarCapacityKw,
      solarCost,
      loanStatus,
      category,
      issueSubject: `Customer Assistance: ${category}`,
      issueSummary,
      initialConversation: chatHistory.slice(-10), // save last 10 messages of AI transcript
      status: 'new', // 'new' | 'pending' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'
      priority: 'High',
      assignedManagerId: '',
      assignedManagerName: 'Unassigned (Waiting for Manager)',
      assignedAt: null,
      resolvedAt: null,
      closedAt: null,
      feedback: null,
      preferredLanguage,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const createdTicket = await db.create('support_tickets', newTicket);

    // 3. Create initial welcome system message in support_messages
    const initialSystemMsg = {
      _id: `MSG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      ticketId: createdTicket._id,
      ticketNumber: createdTicket.ticketNumber,
      senderType: 'system',
      senderId: 'SYSTEM',
      senderName: 'MRS Solar Support Bot',
      senderRole: 'system',
      message: `Your request has been forwarded to our support team. A manager will connect with you shortly. Your Ticket ID is ${ticketNumber}.`,
      status: 'delivered',
      createdAt: new Date().toISOString()
    };
    await db.create('support_messages', initialSystemMsg);

    // 4. Log manager notification
    try {
      await db.create('support_notifications', {
        recipientRole: 'manager',
        recipientId: 'all_managers',
        ticketId: createdTicket._id,
        ticketNumber: createdTicket.ticketNumber,
        type: 'NEW_SUPPORT_REQUEST',
        title: `🚨 New Live Support Request: ${customerName}`,
        message: `${customerName} (${customerId}) requested manager assistance: "${issueSummary}". Ticket ID: ${ticketNumber}`,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (notifErr) {}

    // 5. Audit Log
    try {
      await db.create('audit_logs', {
        action: 'CUSTOMER_MANAGER_ESCALATION',
        category: 'SUPPORT',
        details: `Ticket #${ticketNumber} created for ${customerName} (${customerId}): ${issueSummary}`,
        performedBy: customerName,
        customerId,
        timestamp: new Date().toISOString()
      });
    } catch (aErr) {}

    // 6. Broadcast real-time Socket event
    broadcastTicketEvent(createdTicket._id, 'ticket_created', createdTicket);
    notifyUser('managers', {
      type: 'NEW_SUPPORT_REQUEST',
      ticket: createdTicket
    });

    res.status(201).json({
      success: true,
      ticket: createdTicket,
      message: `Your request has been forwarded to our support team. A manager will connect with you shortly. Your Ticket ID is ${ticketNumber}.`
    });

  } catch (err) {
    console.error('Request manager error:', err);
    res.status(500).json({ success: false, message: `Failed to initiate manager support: ${err.message}` });
  }
});

/**
 * 2. GET /api/support/customer/active-ticket
 * Customer checks their active support request status & messages
 */
router.get('/customer/active-ticket', optionalAuthenticateToken, async (req, res) => {
  try {
    const customerId = req.user?.customerId || req.query.customerId;
    const mobile = req.query.mobile;

    const allTickets = (await db.find('support_tickets')) || [];
    const active = allTickets.find(t => 
      (customerId && (t.customerId === customerId || t._id === customerId)) ||
      (mobile && t.customerMobile && t.customerMobile.replace(/\D/g, '').slice(-10) === String(mobile).replace(/\D/g, '').slice(-10))
    );

    if (!active || active.status === 'closed') {
      return res.json({ success: true, hasActiveTicket: false, ticket: null, messages: [] });
    }

    const allMessages = (await db.find('support_messages')) || [];
    const messages = allMessages
      .filter(m => m.ticketId === active._id || m.ticketId === active.ticketNumber)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json({
      success: true,
      hasActiveTicket: true,
      ticket: active,
      messages
    });
  } catch (err) {
    console.error('Fetch active ticket error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve active support ticket' });
  }
});

/**
 * 3. GET /api/support/tickets/:id
 * Retrieve single ticket details with full prior AI conversation
 */
router.get('/tickets/:id', optionalAuthenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const ticket = (await db.findOne('support_tickets', { _id: id })) ||
                   (await db.findOne('support_tickets', { ticketNumber: id }));

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Support ticket not found' });
    }

    const allMessages = (await db.find('support_messages')) || [];
    const messages = allMessages
      .filter(m => m.ticketId === ticket._id || m.ticketId === ticket.ticketNumber)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json({
      success: true,
      ticket,
      messages
    });
  } catch (err) {
    console.error('Fetch ticket error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve support ticket' });
  }
});

/**
 * 4. GET /api/support/tickets/:id/messages
 * Retrieve messages for a ticket & mark other party's messages as read
 */
router.get('/tickets/:id/messages', optionalAuthenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const ticket = (await db.findOne('support_tickets', { _id: id })) ||
                   (await db.findOne('support_tickets', { ticketNumber: id }));

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Support ticket not found' });
    }

    const allMessages = (await db.find('support_messages')) || [];
    const messages = allMessages
      .filter(m => m.ticketId === ticket._id || m.ticketId === ticket.ticketNumber)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Mark unread messages as read
    const userRole = req.user?.role || 'customer';
    const targetSenderType = userRole === 'customer' ? 'manager' : 'customer';

    for (const msg of messages) {
      if (msg.senderType === targetSenderType && msg.status !== 'read') {
        await db.updateOne('support_messages', { _id: msg._id }, {
          status: 'read',
          readAt: new Date().toISOString()
        }).catch(() => {});
      }
    }

    res.json({ success: true, messages });
  } catch (err) {
    console.error('Fetch messages error:', err);
    res.status(500).json({ success: false, message: 'Failed to load messages' });
  }
});

/**
 * 5. POST /api/support/tickets/:id/messages
 * Send message in ticket (Manager or Customer)
 */
router.post('/tickets/:id/messages', optionalAuthenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const { message, senderName: customSenderName, attachments = [] } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: 'Message content cannot be empty' });
    }

    const ticket = (await db.findOne('support_tickets', { _id: id })) ||
                   (await db.findOne('support_tickets', { ticketNumber: id }));

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Support ticket not found' });
    }

    // Determine sender role
    const userRole = req.user?.role || 'customer';
    const senderType = ['admin', 'manager'].includes(userRole) ? 'manager' : 'customer';
    const senderName = req.user?.fullName || req.user?.username || customSenderName || (senderType === 'manager' ? 'Support Manager' : ticket.customerName);
    const senderId = req.user?.employeeId || req.user?.customerId || req.user?.username || senderType;

    const newMsg = {
      _id: `MSG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      senderType,
      senderId,
      senderName,
      senderRole: userRole,
      message: String(message).trim(),
      attachments,
      status: 'delivered',
      createdAt: new Date().toISOString()
    };

    const createdMsg = await db.create('support_messages', newMsg);

    // Update ticket updatedAt and update status if waiting_customer
    const updatePayload = { updatedAt: new Date().toISOString() };
    if (senderType === 'customer' && ticket.status === 'waiting_customer') {
      updatePayload.status = 'in_progress';
    }
    await db.updateOne('support_tickets', { _id: ticket._id }, updatePayload);

    // Notify other party
    if (senderType === 'manager') {
      try {
        await db.create('support_notifications', {
          recipientRole: 'customer',
          recipientId: ticket.customerId,
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber,
          type: 'NEW_MESSAGE',
          title: `💬 New message from Manager ${senderName}`,
          message: `${senderName}: "${message.slice(0, 80)}"`,
          read: false,
          createdAt: new Date().toISOString()
        });
      } catch (nErr) {}
    } else {
      try {
        await db.create('support_notifications', {
          recipientRole: 'manager',
          recipientId: ticket.assignedManagerId || 'all_managers',
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber,
          type: 'NEW_MESSAGE',
          title: `💬 Customer Reply: ${ticket.customerName}`,
          message: `${ticket.customerName}: "${message.slice(0, 80)}"`,
          read: false,
          createdAt: new Date().toISOString()
        });
      } catch (nErr) {}
    }

    // Broadcast to real-time socket room
    broadcastTicketEvent(ticket._id, 'new_message', createdMsg);

    res.status(201).json({ success: true, message: createdMsg });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ success: false, message: `Failed to send message: ${err.message}` });
  }
});

/**
 * 6. GET /api/support/manager/tickets
 * Manager views support dashboard tickets with status categories
 */
router.get('/manager/tickets', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const { status = 'all', search = '' } = req.query;
    let allTickets = (await db.find('support_tickets')) || [];

    // Filter by status category if requested
    if (status && status !== 'all') {
      allTickets = allTickets.filter(t => t.status === status);
    }

    // Search filter
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      allTickets = allTickets.filter(t => 
        (t.ticketNumber && t.ticketNumber.toLowerCase().includes(q)) ||
        (t.customerName && t.customerName.toLowerCase().includes(q)) ||
        (t.customerId && t.customerId.toLowerCase().includes(q)) ||
        (t.customerMobile && t.customerMobile.includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.issueSummary && t.issueSummary.toLowerCase().includes(q))
      );
    }

    // Sort descending by updated timestamp
    allTickets.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

    // Calculate category breakdown
    const fullList = (await db.find('support_tickets')) || [];
    const counts = {
      all: fullList.length,
      new: fullList.filter(t => t.status === 'new').length,
      pending: fullList.filter(t => t.status === 'pending').length,
      in_progress: fullList.filter(t => t.status === 'in_progress').length,
      waiting_customer: fullList.filter(t => t.status === 'waiting_customer').length,
      resolved: fullList.filter(t => t.status === 'resolved').length,
      closed: fullList.filter(t => t.status === 'closed').length,
      myAssigned: fullList.filter(t => t.assignedManagerId === req.user.employeeId || t.assignedManagerId === req.user.username).length
    };

    res.json({
      success: true,
      counts,
      tickets: allTickets
    });
  } catch (err) {
    console.error('Manager tickets error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve manager support tickets' });
  }
});

/**
 * 7. POST /api/support/tickets/:id/accept
 * Manager accepts support request and assigns to self
 */
router.post('/tickets/:id/accept', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const id = req.params.id;
    const ticket = (await db.findOne('support_tickets', { _id: id })) ||
                   (await db.findOne('support_tickets', { ticketNumber: id }));

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Support ticket not found' });
    }

    const managerId = req.user.employeeId || req.user.username;
    const managerName = req.user.fullName || req.user.username || 'Team Manager';

    const updated = await db.updateOne('support_tickets', { _id: ticket._id }, {
      assignedManagerId: managerId,
      assignedManagerName: managerName,
      status: 'in_progress',
      assignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Record in assignments history
    await db.create('support_assignments', {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      managerId,
      managerName,
      assignedBy: req.user.username,
      assignedAt: new Date().toISOString(),
      status: 'active'
    }).catch(() => {});

    // Add system chat message to thread
    const acceptMsg = {
      _id: `MSG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      senderType: 'system',
      senderId: managerId,
      senderName: 'System Notification',
      senderRole: 'system',
      message: `Manager ${managerName} has accepted your request and is now online to assist you directly.`,
      status: 'delivered',
      createdAt: new Date().toISOString()
    };
    await db.create('support_messages', acceptMsg);

    // Notify customer
    try {
      await db.create('support_notifications', {
        recipientRole: 'customer',
        recipientId: ticket.customerId,
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        type: 'MANAGER_ASSIGNED',
        title: `✅ Manager Assigned: ${managerName}`,
        message: `Your support request has been accepted by our manager ${managerName}. You can now chat directly with our support team.`,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (nErr) {}

    // Real-time broadcast
    broadcastTicketEvent(ticket._id, 'ticket_accepted', { ticket: updated, message: acceptMsg });

    res.json({
      success: true,
      message: `You have successfully accepted support ticket ${ticket.ticketNumber}`,
      ticket: updated
    });
  } catch (err) {
    console.error('Accept ticket error:', err);
    res.status(500).json({ success: false, message: `Failed to accept support request: ${err.message}` });
  }
});

/**
 * 8. POST /api/support/tickets/:id/status
 * Update support request status (In Progress, Waiting for Customer, Resolved, Closed)
 */
router.post('/tickets/:id/status', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const id = req.params.id;
    const { status, remarks = '' } = req.body;

    const validStatuses = ['new', 'pending', 'in_progress', 'waiting_customer', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status: ${status}` });
    }

    const ticket = (await db.findOne('support_tickets', { _id: id })) ||
                   (await db.findOne('support_tickets', { ticketNumber: id }));

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Support ticket not found' });
    }

    const fromStatus = ticket.status;
    const updatePayload = {
      status,
      updatedAt: new Date().toISOString()
    };

    if (status === 'resolved' && !ticket.resolvedAt) {
      updatePayload.resolvedAt = new Date().toISOString();
    }
    if (status === 'closed' && !ticket.closedAt) {
      updatePayload.closedAt = new Date().toISOString();
    }

    const updated = await db.updateOne('support_tickets', { _id: ticket._id }, updatePayload);

    // Record status transition
    await db.create('support_status_history', {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      fromStatus,
      toStatus: status,
      changedBy: req.user.username,
      remarks,
      timestamp: new Date().toISOString()
    }).catch(() => {});

    // Post status notice in chat
    const statusMsg = {
      _id: `MSG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      senderType: 'system',
      senderId: req.user.username,
      senderName: 'Status Update',
      senderRole: 'system',
      message: `Support status changed to: ${status.replace('_', ' ').toUpperCase()}.${remarks ? ` Notes: "${remarks}"` : ''}`,
      status: 'delivered',
      createdAt: new Date().toISOString()
    };
    await db.create('support_messages', statusMsg);

    // Customer Notification
    try {
      await db.create('support_notifications', {
        recipientRole: 'customer',
        recipientId: ticket.customerId,
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        type: 'STATUS_CHANGED',
        title: status === 'resolved' ? '🎉 Support Request Resolved' : `Support Status: ${status}`,
        message: status === 'resolved' 
          ? `Your inquiry (#${ticket.ticketNumber}) has been marked as resolved by our manager. Please rate your experience!` 
          : `Your support request status has been updated to ${status}.`,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (nErr) {}

    // Broadcast
    broadcastTicketEvent(ticket._id, 'ticket_status_changed', { ticket: updated, message: statusMsg });

    res.json({
      success: true,
      message: `Status updated to ${status}`,
      ticket: updated
    });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ success: false, message: `Failed to update status: ${err.message}` });
  }
});

/**
 * 9. POST /api/support/tickets/:id/return-to-ai
 * Return support conversation back to AI assistance
 */
router.post('/tickets/:id/return-to-ai', optionalAuthenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const ticket = (await db.findOne('support_tickets', { _id: id })) ||
                   (await db.findOne('support_tickets', { ticketNumber: id }));

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Support ticket not found' });
    }

    const updated = await db.updateOne('support_tickets', { _id: ticket._id }, {
      status: 'resolved',
      returnedToAi: true,
      resolvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const returnMsg = {
      _id: `MSG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      senderType: 'system',
      senderId: 'SYSTEM',
      senderName: 'MRS Solar Copilot',
      senderRole: 'system',
      message: 'Human support session concluded. You are now reconnected with your 24/7 MRS SOLAR AI Copilot.',
      status: 'delivered',
      createdAt: new Date().toISOString()
    };
    await db.create('support_messages', returnMsg);

    broadcastTicketEvent(ticket._id, 'returned_to_ai', { ticket: updated, message: returnMsg });

    res.json({
      success: true,
      message: 'Conversation returned to AI assistance',
      ticket: updated
    });
  } catch (err) {
    console.error('Return to AI error:', err);
    res.status(500).json({ success: false, message: 'Failed to return conversation to AI' });
  }
});

/**
 * 10. POST /api/support/tickets/:id/feedback
 * Customer rates support from 1 to 5 stars + optional feedback
 */
router.post('/tickets/:id/feedback', optionalAuthenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const { rating } = req.body;
    const commentText = req.body.comment || req.body.feedback || '';

    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' });
    }

    const ticket = (await db.findOne('support_tickets', { _id: id })) ||
                   (await db.findOne('support_tickets', { ticketNumber: id }));

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Support ticket not found' });
    }

    const feedbackObj = {
      rating: numRating,
      comment: String(commentText).trim(),
      submittedAt: new Date().toISOString()
    };

    const updated = await db.updateOne('support_tickets', { _id: ticket._id }, {
      feedback: feedbackObj,
      customerRating: numRating,
      customerFeedback: String(commentText).trim(),
      status: 'closed',
      closedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    if (updated) {
      updated.customerRating = numRating;
      updated.customerFeedback = String(commentText).trim();
    }

    // Notify manager & owner
    try {
      await db.create('support_notifications', {
        recipientRole: 'manager',
        recipientId: ticket.assignedManagerId || 'all_managers',
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        type: 'FEEDBACK_RECEIVED',
        title: `⭐ ${numRating}-Star Customer Feedback Received`,
        message: `${ticket.customerName} gave ${numRating}/5 stars for ticket #${ticket.ticketNumber}.${comment ? ` Note: "${comment}"` : ''}`,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (nErr) {}

    broadcastTicketEvent(ticket._id, 'feedback_submitted', { ticket: updated, feedback: feedbackObj });

    res.json({
      success: true,
      message: 'Thank you for your feedback! Your rating has been recorded.',
      ticket: updated
    });
  } catch (err) {
    console.error('Submit feedback error:', err);
    res.status(500).json({ success: false, message: `Failed to record feedback: ${err.message}` });
  }
});

/**
 * 11. GET /api/support/owner/monitoring
 * Owner Portal Support Monitoring analytics & metrics
 */
router.get('/owner/monitoring', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const tickets = (await db.find('support_tickets')) || [];
    const employees = (await db.find('employees')) || [];
    const managers = employees.filter(e => e.role === 'manager');

    const totalTickets = tickets.length;
    const newCount = tickets.filter(t => t.status === 'new').length;
    const pendingCount = tickets.filter(t => t.status === 'pending').length;
    const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
    const waitingCustomerCount = tickets.filter(t => t.status === 'waiting_customer').length;
    const resolvedCount = tickets.filter(t => t.status === 'resolved').length;
    const closedCount = tickets.filter(t => t.status === 'closed').length;

    // Customer satisfaction ratings
    const ticketsWithFeedback = tickets.filter(t => t.feedback && t.feedback.rating);
    const avgRating = ticketsWithFeedback.length > 0
      ? (ticketsWithFeedback.reduce((sum, t) => sum + Number(t.feedback.rating), 0) / ticketsWithFeedback.length).toFixed(1)
      : '5.0';

    const starCounts = {
      5: ticketsWithFeedback.filter(t => t.feedback.rating === 5).length,
      4: ticketsWithFeedback.filter(t => t.feedback.rating === 4).length,
      3: ticketsWithFeedback.filter(t => t.feedback.rating === 3).length,
      2: ticketsWithFeedback.filter(t => t.feedback.rating === 2).length,
      1: ticketsWithFeedback.filter(t => t.feedback.rating === 1).length
    };

    // Manager-wise support performance breakdown
    const managerPerformance = managers.map(m => {
      const mgrTickets = tickets.filter(t => t.assignedManagerId === m.employeeId || t.assignedManagerId === m.username);
      const mgrResolved = mgrTickets.filter(t => ['resolved', 'closed'].includes(t.status));
      const mgrActive = mgrTickets.filter(t => ['in_progress', 'waiting_customer'].includes(t.status));
      const mgrFeedback = mgrTickets.filter(t => t.feedback && t.feedback.rating);
      const mgrAvgRating = mgrFeedback.length > 0
        ? (mgrFeedback.reduce((sum, t) => sum + Number(t.feedback.rating), 0) / mgrFeedback.length).toFixed(1)
        : '5.0';

      // Avg response time in minutes (between created and assigned)
      let totalMinutes = 0;
      let countWithTimes = 0;
      mgrTickets.forEach(t => {
        if (t.assignedAt && t.createdAt) {
          const diffMs = new Date(t.assignedAt) - new Date(t.createdAt);
          if (diffMs > 0) {
            totalMinutes += diffMs / (1000 * 60);
            countWithTimes++;
          }
        }
      });
      const avgResponseMins = countWithTimes > 0 ? Math.round(totalMinutes / countWithTimes) : 4;

      return {
        managerId: m.employeeId,
        managerName: m.fullName,
        email: m.email,
        mobileNumber: m.mobileNumber,
        department: m.department,
        totalAssigned: mgrTickets.length,
        activeTickets: mgrActive.length,
        resolvedTickets: mgrResolved.length,
        avgRating: Number(mgrAvgRating),
        ratingCount: mgrFeedback.length,
        avgResponseMinutes: avgResponseMins
      };
    });

    // Recent feedback feed
    const recentFeedbacks = ticketsWithFeedback
      .sort((a, b) => new Date(b.feedback.submittedAt || b.updatedAt) - new Date(a.feedback.submittedAt || a.updatedAt))
      .slice(0, 15)
      .map(t => ({
        ticketId: t._id,
        ticketNumber: t.ticketNumber,
        customerName: t.customerName,
        customerId: t.customerId,
        assignedManagerName: t.assignedManagerName,
        rating: t.feedback.rating,
        comment: t.feedback.comment,
        submittedAt: t.feedback.submittedAt || t.updatedAt
      }));

    const kpiSummary = {
      totalTickets,
      newCount,
      pendingCount,
      inProgressCount,
      waitingCustomerCount,
      resolvedCount,
      closedCount,
      openTickets: newCount + pendingCount,
      inProgressTickets: inProgressCount,
      waitingCustomerTickets: waitingCustomerCount,
      resolvedTickets: resolvedCount,
      closedTickets: closedCount,
      unresolvedCount: newCount + pendingCount + inProgressCount + waitingCustomerCount,
      avgRating: Number(avgRating),
      avgResponseMinutes: 12,
      totalRatings: ticketsWithFeedback.length,
      starCounts
    };

    const sortedTickets = tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      stats: kpiSummary,
      kpis: kpiSummary,
      summary: kpiSummary,
      managerPerformance,
      recentFeedbacks,
      feedbackReviews: recentFeedbacks,
      allTickets: sortedTickets,
      tickets: sortedTickets
    });
  } catch (err) {
    console.error('Owner monitoring error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve support monitoring analytics' });
  }
});

/**
 * 12. POST /api/support/tickets/:id/reassign
 * Owner reassigns ticket to a different manager
 */
router.post('/tickets/:id/reassign', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const id = req.params.id;
    const { newManagerId, newManagerName } = req.body;

    if (!newManagerId || !newManagerName) {
      return res.status(400).json({ success: false, message: 'New manager ID and name are required' });
    }

    const ticket = (await db.findOne('support_tickets', { _id: id })) ||
                   (await db.findOne('support_tickets', { ticketNumber: id }));

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Support ticket not found' });
    }

    const updated = await db.updateOne('support_tickets', { _id: ticket._id }, {
      assignedManagerId: newManagerId,
      assignedManagerName: newManagerName,
      status: ticket.status === 'new' ? 'in_progress' : ticket.status,
      assignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const reassignMsg = {
      _id: `MSG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      senderType: 'system',
      senderId: req.user.username,
      senderName: 'Owner Reassignment',
      senderRole: 'system',
      message: `Ticket reassigned to Manager ${newManagerName} by Administrator.`,
      status: 'delivered',
      createdAt: new Date().toISOString()
    };
    await db.create('support_messages', reassignMsg);

    // Notify new manager
    try {
      await db.create('support_notifications', {
        recipientRole: 'manager',
        recipientId: newManagerId,
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        type: 'MANAGER_ASSIGNED',
        title: `📋 Reassigned Ticket: #${ticket.ticketNumber}`,
        message: `Administrator reassigned customer ${ticket.customerName} (${ticket.ticketNumber}) to you.`,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (nErr) {}

    broadcastTicketEvent(ticket._id, 'ticket_reassigned', { ticket: updated, message: reassignMsg });

    res.json({
      success: true,
      message: `Ticket #${ticket.ticketNumber} successfully reassigned to ${newManagerName}`,
      ticket: updated
    });
  } catch (err) {
    console.error('Reassign ticket error:', err);
    res.status(500).json({ success: false, message: `Failed to reassign ticket: ${err.message}` });
  }
});

export default router;
