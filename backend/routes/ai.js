import express from 'express';
import multer from 'multer';
import { db } from '../database/db.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { getAiConfig, saveAiConfig, callGeminiApi } from '../utils/aiConfig.js';
import { generateSolarDiagnostics, generateSmartChatResponse, extractKycFromText } from '../utils/aiEngines.js';
import { findMatchingCustomer } from '../utils/customerResolver.js';
import { detectProblem, buildEscalationChatReply } from '../utils/problemDetector.js';

const router = express.Router();

// Memory storage for fast image-to-AI processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

/**
 * 1. GET AI Settings (Admin Only)
 */
router.get('/settings', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const config = await getAiConfig();
    const hasKey = Boolean(config.geminiApiKey);
    const maskedKey = hasKey
      ? `${config.geminiApiKey.slice(0, 6)}...${config.geminiApiKey.slice(-4)}`
      : '';

    res.json({
      hasKey,
      maskedKey,
      defaultModel: config.defaultModel || 'gemini-1.5-flash',
      enabledFeatures: config.enabledFeatures || {
        kycScanner: true,
        chatCopilot: true,
        solarDiagnostics: true
      },
      updatedAt: config.updatedAt
    });
  } catch (err) {
    console.error('Fetch AI settings error:', err);
    res.status(500).json({ message: 'Failed to fetch AI configuration' });
  }
});

/**
 * 2. POST AI Settings (Admin Only)
 */
router.post('/settings', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { geminiApiKey, defaultModel, enabledFeatures } = req.body;
    const updated = await saveAiConfig({
      geminiApiKey,
      defaultModel,
      enabledFeatures
    });

    res.json({
      success: true,
      message: 'AI engine settings updated successfully!',
      hasKey: Boolean(updated.geminiApiKey),
      defaultModel: updated.defaultModel
    });
  } catch (err) {
    console.error('Save AI settings error:', err);
    res.status(500).json({ message: 'Failed to save AI configuration' });
  }
});

/**
 * 3. POST Test Gemini API Key (Admin Only)
 */
router.post('/test-key', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const startTime = Date.now();
  try {
    const { apiKey, model } = req.body;
    const config = await getAiConfig();
    const keyToTest = apiKey || config.geminiApiKey;

    if (!keyToTest) {
      return res.status(400).json({
        success: false,
        message: 'No Google Gemini API key provided. Please enter a key first.'
      });
    }

    const testPrompt = 'Respond with "OK" if this connection test is working.';
    const reply = await callGeminiApi({
      apiKey: keyToTest,
      model: model || config.defaultModel || 'gemini-1.5-flash',
      prompt: testPrompt,
      maxOutputTokens: 20
    });

    const durationMs = Date.now() - startTime;
    res.json({
      success: true,
      message: `Gemini API connection successful! Latency: ${durationMs}ms`,
      reply: reply.trim(),
      latencyMs: durationMs
    });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    console.error('Test Gemini API error:', err);
    res.status(500).json({
      success: false,
      message: `Gemini API test failed: ${err.message}`,
      latencyMs: durationMs
    });
  }
});

/**
 * 4. POST AI Smart Document & KYC Extraction (Admin Only)
 * Accepts base64 image or multipart file upload
 */
router.post('/extract-kyc', authenticateToken, authorizeRole(['admin']), upload.single('document'), async (req, res) => {
  try {
    let base64Data = '';
    let mimeType = 'image/jpeg';

    if (req.file) {
      base64Data = req.file.buffer.toString('base64');
      mimeType = req.file.mimetype || 'image/jpeg';
    } else if (req.body.imageBase64) {
      base64Data = req.body.imageBase64;
      mimeType = req.body.mimeType || 'image/jpeg';
    } else {
      return res.status(400).json({ message: 'Please provide a document image to scan' });
    }

    const config = await getAiConfig();

    if (config.geminiApiKey) {
      try {
        const kycPrompt = `Examine this Indian KYC or utility document (Aadhaar Card, PAN Card, or TNEB Electricity Bill).
Extract all identifiable fields into a clean JSON object with keys:
{
  "fullName": "Legal full name as printed",
  "fatherName": "Father or husband name if available",
  "aadhaarNumber": "12-digit Aadhaar number or 4-digit masked",
  "panNumber": "10-character PAN number",
  "address": "Residential address line",
  "city": "City or Village",
  "district": "District in Tamil Nadu",
  "state": "Tamil Nadu",
  "pinCode": "6-digit PIN code",
  "tnebConsumerNumber": "TNEB Service/Consumer number if present",
  "mobileNumber": "10-digit mobile number if present",
  "documentType": "Aadhaar Card | PAN Card | TNEB Electricity Bill | ID Card"
}
Only output raw JSON. If a field is not present, use an empty string.`;

        const responseJson = await callGeminiApi({
          apiKey: config.geminiApiKey,
          model: config.defaultModel || 'gemini-1.5-flash',
          prompt: kycPrompt,
          imageBase64: base64Data,
          mimeType,
          responseSchema: true
        });

        const cleaned = responseJson.replace(/```json\s*/i, '').replace(/```\s*$/i, '').trim();
        const parsed = JSON.parse(cleaned);

        return res.json({
          success: true,
          source: 'Gemini Vision AI',
          data: parsed
        });
      } catch (geminiErr) {
        console.warn('Gemini extraction failed, falling back to smart heuristic:', geminiErr.message);
      }
    }

    // Heuristic Fallback
    const fallbackData = extractKycFromText(req.body.rawText || '');
    return res.json({
      success: true,
      source: 'Intelligent Pattern Extractor (Offline)',
      data: fallbackData,
      note: 'Configuring a Google Gemini API Key in Settings > AI Engine enables 100% deep visual extraction.'
    });

  } catch (err) {
    console.error('KYC extraction error:', err);
    res.status(500).json({ message: `Document extraction failed: ${err.message}` });
  }
});

/**
 * 5. POST Conversational Solar & Loan AI Chatbot
 * Available to both Customer and Admin roles
 */
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message, language = 'en' } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    let customerData = null;
    let adminStatsData = null;
    let allCustomers = [];

    try {
      allCustomers = (await db.find('customers')) || [];
    } catch (e) {
      console.warn('Could not load all customers for AI context:', e.message);
    }

    if (req.user.role === 'customer') {
      customerData = await db.findOne('customers', { customerId: req.user.customerId });
      if (!customerData) {
        customerData = allCustomers.find(c => c.customerId === req.user.customerId);
      }
    } else if (req.user.role === 'admin') {
      const activeCustomers = allCustomers.filter(c => c.loanStatus === 'Active').length;
      const overdueCustomers = allCustomers.filter(c => c.paymentStatus === 'Overdue').length;
      const totalAmountCollected = allCustomers.reduce((sum, c) => sum + (Number(c.totalPaidAmount) || 0), 0);
      const totalOutstandingAmount = allCustomers.reduce((sum, c) => sum + (Number(c.totalOutstandingAmount) || 0), 0);
      const totalProfit = allCustomers.reduce((sum, c) => sum + (Number(c.totalInterestPaid) || 0) + (Number(c.totalLateFeesPaid) || 0), 0);

      adminStatsData = {
        totalCustomers: allCustomers.length,
        activeCustomers,
        overdueCustomers,
        totalAmountCollected,
        totalOutstandingAmount,
        totalProfit,
        parMetrics: {
          collectionEfficiencyPct: allCustomers.length ? Math.round(((allCustomers.length - overdueCustomers) / allCustomers.length) * 100) : 100
        }
      };

      // Resolve specific customer mentioned by name, nickname, ID or phone
      customerData = findMatchingCustomer(message, allCustomers);
    }

    // Automatic Escalation to Owner Portal when customer reports a big problem:
    // If the requester is a customer (role === 'customer' or non-admin session) and reports a high-severity problem
    // (inverter failure, zero power, smoke hazard, physical damage, payment discrepancy):
    // 1. Dispatch short note to Owner Portal (notifications collection with role: 'admin')
    // 2. Record in audit_logs
    // 3. Return reassuring response with emergency hotline & safety steps
    const isCustomerSession = req.user.role === 'customer' || (customerData && req.user.role !== 'admin');
    if (isCustomerSession) {
      const problem = detectProblem(message);
      if (problem.isBigProblem) {
        const cust = customerData || (req.user.customerId ? allCustomers.find(c => c.customerId === req.user.customerId) : null);
        const custName = cust?.fullName || req.user.username || 'Customer';
        const custId = cust?.customerId || req.user.customerId || 'Registered Account';
        const phone = cust?.mobileNumber || req.user.mobileNumber || '+91 80724 54996';
        const shortNote = `${custName} (${custId}) - ${problem.summaryEn}: "${message.slice(0, 100)}"`;

        // Check if an unread alert for this customer & issue already exists to prevent duplicate spam
        const existingUnread = await db.findOne('notifications', {
          role: 'admin',
          customerId: custId,
          issueCategory: problem.category,
          read: false
        });

        if (!existingUnread) {
          await db.create('notifications', {
            role: 'admin',
            type: 'CUSTOMER_PROBLEM_ALERT',
            priority: 'urgent',
            title: `🚨 ${problem.summaryEn}`,
            message: `Short Note: ${shortNote}. Contact: ${phone}. Immediate owner attention requested.`,
            customerId: custId,
            customerName: custName,
            customerPhone: phone,
            issueCategory: problem.category,
            severity: problem.severity,
            read: false,
            createdAt: new Date().toISOString()
          });
        }

        await db.create('audit_logs', {
          action: 'CUSTOMER_PROBLEM_ESCALATION',
          category: 'SUPPORT',
          details: shortNote,
          customerId: custId,
          performedBy: custName,
          severity: problem.severity,
          timestamp: new Date().toISOString()
        });

        const reply = buildEscalationChatReply({
          customer: cust,
          problem,
          message,
          language
        });

        return res.json({
          reply,
          source: 'MRS Solar Safety Escalation Engine',
          language,
          escalated: true,
          category: problem.category,
          shortNote
        });
      }
    }

    const config = await getAiConfig();

    if (config.geminiApiKey) {
      try {
        const customerDirectorySummary = allCustomers.map((c, i) =>
          `${i + 1}. Customer: ${c.fullName} (ID: ${c.customerId}, Nicknames: Sanju, Sunju, Sandy)
             - Solar System: ${c.solarCapacity || 3} kW (${c.solarBrand || 'MRS Solar'})
             - Financials: System Cost ₹${c.solarCost || 0}, Down Payment ₹${c.downPayment || 0}, Loan Amount ₹${c.loanAmount || 0}, Monthly EMI ₹${c.monthlyEmi || 0}
             - Loan Status: ${c.loanStatus || 'Active'} (${c.paymentStatus || 'Pending'}), Overdue Days: ${c.daysOverdue || 0}
             - Next Due Date: ${c.emiSchedule?.find(e => e.status !== 'Paid')?.dueDate || 'Completed'}
             - Phone: ${c.mobileNumber || 'N/A'}, Address: ${c.address || 'N/A'}, TNEB Consumer No: ${c.tnebConsumerNumber || 'N/A'}`
        ).join('\n\n');

        let systemPrompt = `You are the official 24/7 AI Solar & Financing Copilot for "MRS SOLAR", a premier rooftop solar EPC and loan financing firm in Tamil Nadu, India.
Office Address: 74, Gandhi Road, MGM Nagar, Thiruvallur, Tamil Nadu – 602001
Official Customer Care Helpline: +91 80724 54996 | Email: rsanthoshkumar376@gmail.com
Primary UPI ID for payments: rsanthoshkumar376@oksbi | Secondary: mrssolar@okaxis

You have complete real-time access to the registered customer database:
${customerDirectorySummary}

Financial Summary:
- Total Customers: ${allCustomers.length}
- Active Accounts: ${adminStatsData?.activeCustomers || allCustomers.length}
- Overdue Accounts: ${adminStatsData?.overdueCustomers || 0}
- Total Capital Collected: ₹${adminStatsData?.totalAmountCollected || 0}
- Total Dues Outstanding: ₹${adminStatsData?.totalOutstandingAmount || 0}

Guidelines:
1. Always answer the user's specific question directly, warmly, concisely, and accurately.
2. If asked about a customer's kW, solar capacity, loan, EMI, or details (e.g. "how many kw for sunju", "sanju emi", "deepi"), directly retrieve and state the exact numbers for that customer.
3. If asked in Tamil (or Tanglish), reply in natural Tamil (தமிழ்). If in English, reply in clear English.
4. If asked about general solar generation, use standard Tamil Nadu generation of 4.4 units/day per 1 kW (e.g. 1 kW = 4.4 units/day, 3 kW = 13.2 units/day).
5. Never refuse to answer or give a robotic boilerplate telling the user to ask another question.`;

        if (customerData) {
          systemPrompt += `\n\nTARGET CUSTOMER REFERENCED IN QUERY:
Name: ${customerData.fullName}
Customer ID: ${customerData.customerId}
Solar Capacity: ${customerData.solarCapacity} kW
Total Solar Cost: ₹${customerData.solarCost}
Loan Principal: ₹${customerData.loanAmount}
Monthly EMI: ₹${customerData.monthlyEmi}
Next Due Date: ${customerData.emiSchedule?.find(e => e.status !== 'Paid')?.dueDate || 'Completed'}
Overdue Days: ${customerData.daysOverdue || 0}
Total Outstanding: ₹${customerData.totalOutstandingAmount || 0}
TNEB Consumer No: ${customerData.tnebConsumerNumber || 'N/A'}`;
        }

        const reply = await callGeminiApi({
          apiKey: config.geminiApiKey,
          model: config.defaultModel || 'gemini-1.5-flash',
          prompt: message,
          systemInstruction: systemPrompt,
          temperature: 0.3,
          maxOutputTokens: 600
        });

        return res.json({
          reply: reply.trim(),
          source: 'Gemini AI',
          language
        });
      } catch (geminiErr) {
        console.warn('Gemini chat failed, using smart offline fallback:', geminiErr.message);
      }
    }

    // Built-in Intelligent Fallback Knowledge Base
    const fallbackReply = generateSmartChatResponse({
      message,
      language,
      customer: customerData,
      allCustomers,
      adminStats: adminStatsData,
      role: req.user.role
    });

    res.json({
      reply: fallbackReply,
      source: 'MRS Solar Smart Engine',
      language
    });

  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ message: 'Failed to process AI chat query' });
  }
});

/**
 * 6. POST AI Smart Solar Inverter & Health Diagnostics
 */
router.post('/solar-diagnostics', authenticateToken, async (req, res) => {
  try {
    const {
      solarCapacity = 3,
      currentKw = 0,
      dailyKwh = 0,
      gridVoltage = 230,
      inverterTemp = 42,
      weather = 'Sunny',
      language = 'en'
    } = req.body;

    const diagnostic = generateSolarDiagnostics({
      solarCapacity,
      currentKw,
      dailyKwh,
      gridVoltage,
      inverterTemp,
      weather,
      lang: language
    });

    res.json({
      success: true,
      diagnostic
    });
  } catch (err) {
    console.error('Diagnostics error:', err);
    res.status(500).json({ message: 'Failed to run solar diagnostics' });
  }
});

export default router;
