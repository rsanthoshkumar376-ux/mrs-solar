import express from 'express';
import multer from 'multer';
import { db } from '../database/db.js';
import { authenticateToken, optionalAuthenticateToken, authorizeRole } from '../middleware/auth.js';
import { getAiConfig, saveAiConfig, callGeminiApi } from '../utils/aiConfig.js';
import { generateSolarDiagnostics, generateSmartChatResponse, extractKycFromText } from '../utils/aiEngines.js';
import { analyzeSolarImage, VISION_MODULE_PROMPTS, SAFETY_DISCLAIMER, callCloudVisionApi } from '../utils/aiVisionEngines.js';
import { findMatchingCustomer } from '../utils/customerResolver.js';
import { detectProblem, buildEscalationChatReply } from '../utils/problemDetector.js';
import { getDefaultSubsidyDetails } from '../utils/subsidyHelper.js';

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
 * 4b. POST AI Smart TNEB Electricity Bill Photo Scanner
 * Publicly accessible (Used on Referral Portal, Calculator & Admin Customer Onboarding)
 */
router.post('/scan-tneb-bill', upload.single('billImage'), async (req, res) => {
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
      return res.status(400).json({ message: 'Please provide a TNEB electricity bill image to scan' });
    }

    const config = await getAiConfig();

    if (config.geminiApiKey) {
      try {
        const tnebPrompt = `You are a specialist OCR engine for Tamil Nadu Electricity Board (TNEB / TANGEDCO) domestic white-meter electricity bills.
Examine this Tamil Nadu electricity bill image and extract the following details into a JSON object:
{
  "consumerNumber": "10 to 12 digit service number or format like 09-234-005-1234",
  "consumerName": "Consumer / Account holder name",
  "tariff": "LT Tariff 1A (Domestic)",
  "connectedLoad": "Connected load in kW or HP",
  "biMonthlyUnits": 600,
  "monthlyUnits": 300,
  "biMonthlyBillAmount": 3200,
  "monthlyAverageBill": 1600,
  "recommendedSolarKw": 3,
  "estimatedCentralSubsidy": 78000,
  "estimatedMonthlySavings": 1600,
  "confidence": "high"
}
Rules:
- If biMonthlyUnits is given, monthlyUnits = Math.round(biMonthlyUnits / 2).
- If only bill amount is given, monthlyAverageBill = Math.round(billAmount / 2), and estimated monthlyUnits = Math.round(monthlyAverageBill / 6.5).
- Recommended Solar kW = Math.min(10, Math.max(1, Math.round(monthlyUnits / 120))).
- Central Subsidy under PM Surya Ghar: 1 kW = 30000, 2 kW = 60000, 3+ kW = 78000.
Only output valid raw JSON.`;

        const responseJson = await callGeminiApi({
          apiKey: config.geminiApiKey,
          model: config.defaultModel || 'gemini-1.5-flash',
          prompt: tnebPrompt,
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
        console.warn('Gemini TNEB scan failed, falling back to heuristic:', geminiErr.message);
      }
    }

    // Intelligent Pattern Extractor Fallback
    const rawText = req.body.rawText || '';
    const numberMatch = rawText.match(/\b\d{2}[-\s]?\d{3}[-\s]?\d{3}[-\s]?\d{3,4}\b/) || rawText.match(/\b\d{10,12}\b/);
    const amountMatch = rawText.match(/(?:Rs\.?|₹|Total|Amount)[\s:]*([0-9,]+)/i);
    const billAmount = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : 2500;
    const monthlyUnits = Math.round((billAmount / 2) / 6.5);
    const recKw = Math.min(10, Math.max(1, Math.round(monthlyUnits / 120)));

    return res.json({
      success: true,
      source: 'Intelligent Pattern Extractor (Offline)',
      data: {
        consumerNumber: numberMatch ? numberMatch[0].replace(/\s+/g, '') : '09-234-005-1042',
        consumerName: 'Domestic Consumer',
        tariff: 'LT Tariff 1A (Domestic)',
        connectedLoad: `${recKw} kW`,
        biMonthlyUnits: monthlyUnits * 2,
        monthlyUnits,
        biMonthlyBillAmount: billAmount,
        monthlyAverageBill: Math.round(billAmount / 2),
        recommendedSolarKw: recKw,
        estimatedCentralSubsidy: recKw >= 3 ? 78000 : recKw >= 2 ? 60000 : 30000,
        estimatedMonthlySavings: Math.round(billAmount / 2),
        confidence: 'medium'
      }
    });

  } catch (err) {
    console.error('TNEB bill scanner error:', err);
    res.status(500).json({ message: `Bill scanning failed: ${err.message}` });
  }
});

/**
 * 5. POST Conversational Solar & Loan AI Chatbot
 * Available to both Customer and Admin roles
 */
router.post('/chat', optionalAuthenticateToken, async (req, res) => {
  try {
    const { message, language = 'en', imageBase64, mimeType = 'image/jpeg' } = req.body;
    if ((!message || !message.trim()) && !imageBase64) {
      return res.status(400).json({ message: 'Please provide a message or an image to analyze' });
    }

    const effectiveMessage = (message && message.trim()) || 'Please inspect this uploaded solar equipment, electricity bill, or rooftop installation image and provide detailed analysis and advice.';

    let customerData = null;
    let customerTickets = [];
    let adminStatsData = null;
    let allTickets = [];
    let allCustomers = [];

    try {
      allCustomers = (await db.find('customers')) || [];
    } catch (e) {
      console.warn('Could not load all customers for AI context:', e.message);
    }

    if (req.user?.role === 'customer') {
      customerData = await db.findOne('customers', { customerId: req.user.customerId });
      if (!customerData) {
        customerData = allCustomers.find(c => c.customerId === req.user.customerId);
      }
      try {
        customerTickets = (await db.find('tickets', { customerId: req.user.customerId })) || [];
      } catch (tErr) {
        console.warn('Could not load customer tickets:', tErr.message);
      }
    } else if (req.user?.role === 'admin') {
      try {
        allTickets = (await db.find('tickets')) || [];
      } catch (tErr) {
        console.warn('Could not load all tickets:', tErr.message);
      }
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
        openTicketsCount: allTickets.filter(t => t.status === 'Open').length,
        parMetrics: {
          collectionEfficiencyPct: allCustomers.length ? Math.round(((allCustomers.length - overdueCustomers) / allCustomers.length) * 100) : 100
        }
      };

      // Resolve specific customer mentioned by name, nickname, ID or phone
      customerData = findMatchingCustomer(message, allCustomers);
      if (customerData) {
        customerTickets = allTickets.filter(t => t.customerId === customerData.customerId);
      }
    }

    // Automatic Escalation & Ticket Generation when customer reports an urgent fault:
    // (inverter failure, zero power, smoke hazard, physical damage, payment discrepancy)
    const isCustomerSession = req.user?.role === 'customer' || (customerData && req.user?.role !== 'admin');
    if (isCustomerSession) {
      const problem = detectProblem(message);
      if (problem.isBigProblem) {
        const cust = customerData || (req.user?.customerId ? allCustomers.find(c => c.customerId === req.user.customerId) : null);
        const custName = cust?.fullName || req.user?.username || 'Customer';
        const custId = cust?.customerId || req.user?.customerId || 'Registered Account';
        const phone = cust?.mobileNumber || req.user?.mobileNumber || '+91 80724 54996';
        const ticketNumber = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
        const shortNote = `${custName} (${custId}) - ${problem.summaryEn}: "${message.slice(0, 100)}"`;

        let createdTicket = null;
        try {
          createdTicket = await db.create('tickets', {
            ticketNumber,
            customerId: custId,
            customerName: custName,
            customerMobile: phone,
            category: problem.category,
            description: String(message).trim(),
            priority: problem.severity === 'CRITICAL' ? 'Urgent' : 'High',
            status: 'Open',
            source: 'AI Copilot Auto-Escalation',
            assignedTechnician: 'Field Engineering Team',
            createdAt: new Date().toISOString()
          });
        } catch (tktErr) {
          console.warn('Could not persist ticket to database:', tktErr.message);
        }

        // Dispatch alert notification to Owner Portal
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
            title: `🚨 ${problem.summaryEn} (${ticketNumber})`,
            message: `Ticket #${ticketNumber} created for ${custName} (${custId}): "${message.slice(0, 100)}". Contact: ${phone}. Immediate owner attention requested.`,
            customerId: custId,
            customerName: custName,
            customerPhone: phone,
            ticketNumber,
            ticketId: createdTicket?._id,
            issueCategory: problem.category,
            severity: problem.severity,
            read: false,
            createdAt: new Date().toISOString()
          });
        }

        await db.create('audit_logs', {
          action: 'CUSTOMER_PROBLEM_ESCALATION',
          category: 'SUPPORT',
          details: `Ticket #${ticketNumber} created for ${custName} (${custId}): ${shortNote}`,
          customerId: custId,
          performedBy: custName,
          severity: problem.severity,
          timestamp: new Date().toISOString()
        });

        const reply = buildEscalationChatReply({
          customer: cust,
          problem,
          message,
          language,
          ticketNumber,
          ticket: createdTicket
        });

        return res.json({
          reply,
          source: 'MRS Solar Safety Escalation Engine',
          language,
          escalated: true,
          category: problem.category,
          shortNote,
          ticket: {
            ticketNumber,
            _id: createdTicket?._id,
            category: problem.category,
            priority: problem.severity === 'CRITICAL' ? 'Urgent' : 'High',
            status: 'Open',
            createdAt: createdTicket?.createdAt || new Date().toISOString()
          },
          action: {
            type: 'TICKET_CREATED',
            ticketNumber,
            category: problem.category
          }
        });
      }
    }

    // Determine Action Intent (Subsidy / Pay / Calculator / Support / Referral)
    let detectedAction = null;
    const lower = (message || '').toLowerCase();

    if (/(subsidy|pm surya|surya ghar|surya|muft bijli|central subsidy|78000|30000|60000|மானியம்|சூர்யா கர்)/i.test(lower)) {
      if (customerData) {
        const sub = customerData.subsidyDetails || getDefaultSubsidyDetails(customerData);
        detectedAction = {
          type: 'SUBSIDY_STATUS',
          stage: sub.currentStage || 1,
          eligibleAmount: sub.eligibleAmount || (Number(customerData.solarCapacity) >= 3 ? 78000 : Number(customerData.solarCapacity) === 2 ? 60000 : 30000),
          applicationNumber: sub.applicationNumber || 'PMSGY-TN-2026'
        };
      }
    } else if (/(emi|due|payment|installment|pay|upi|gpay|phonepe|தவணை|கடன்)/i.test(lower)) {
      if (customerData) {
        const schedule = Array.isArray(customerData.emiSchedule) ? customerData.emiSchedule : [];
        const nextPending = schedule.find(e => e.status !== 'Paid');
        if (nextPending) {
          detectedAction = {
            type: 'EMI_PAY',
            amount: nextPending.emiAmount,
            dueDate: nextPending.dueDate,
            emiNumber: nextPending.emiNumber,
            upiId: 'rsanthoshkumar376@oksbi'
          };
        }
      }
    } else if (/(calculator|calculate|savings|how much save|roi|payback|கணக்கீடு|சேமிப்பு)/i.test(lower)) {
      detectedAction = {
        type: 'OPEN_CALCULATOR',
        suggestedKw: customerData?.solarCapacity || 3
      };
    } else if (/(contact|helpline|phone|call|address|office|support|உதவி|தொடர்பு)/i.test(lower)) {
      detectedAction = {
        type: 'CONTACT_INFO',
        phone: '+91 80724 54996',
        email: 'rsanthoshkumar376@gmail.com'
      };
    }

    const config = await getAiConfig();

    if (config.geminiApiKey) {
      try {
        const customerDirectorySummary = allCustomers.map((c, i) =>
          `${i + 1}. Customer: ${c.fullName} (ID: ${c.customerId})
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

Financial & Operations Summary:
- Total Customers: ${allCustomers.length}
- Active Accounts: ${adminStatsData?.activeCustomers || allCustomers.length}
- Overdue Accounts: ${adminStatsData?.overdueCustomers || 0}
- Total Capital Collected: ₹${adminStatsData?.totalAmountCollected || 0}
- Total Dues Outstanding: ₹${adminStatsData?.totalOutstandingAmount || 0}
- Open Service Tickets: ${allTickets.filter(t => t.status === 'Open').length}

Guidelines:
1. Always answer the user's specific question directly, warmly, concisely, and accurately.
2. If asked about a customer's kW, solar capacity, loan, EMI, or details (e.g. "how many kw for sunju", "sanju emi", "deepi"), directly retrieve and state the exact numbers for that customer.
3. If asked in Tamil (or Tanglish), reply in natural Tamil (தமிழ்). If in English, reply in clear English.
4. If asked about general solar generation, use standard Tamil Nadu generation of 4.4 units/day per 1 kW (e.g. 1 kW = 4.4 units/day, 3 kW = 13.2 units/day).
5. Residential rooftop solar qualifies for up to ₹78,000 direct subsidy under PM Surya Ghar Muft Bijli Yojana (1 kW: ₹30,000, 2 kW: ₹60,000, 3+ kW: ₹78,000).
6. Nationalized bank residential solar loans (SBI, Canara Bank, Indian Bank, PNB) offer flexible repayment tenures from 12 months up to 10 years (120 months) at concessional interest (~7% p.a.) with zero collateral.
7. Never refuse to answer or give a robotic boilerplate telling the user to ask another question.`;

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
TNEB Consumer No: ${customerData.tnebConsumerNumber || 'N/A'}
Service Tickets: ${customerTickets.length} (${customerTickets.filter(t => t.status === 'Open').length} Open)`;
        }

        const multimodalSystemPrompt = systemPrompt + (imageBase64 
          ? '\n\nUSER HAS ATTACHED AN IMAGE: Inspect the attached photograph (solar PV panel, inverter display, electricity bill, installation photo, or warranty document). Describe your visual observations, diagnose any error codes or physical defects, specify safety precautions, and answer the user query based on this visual context.'
          : '');

        const reply = await callGeminiApi({
          apiKey: config.geminiApiKey,
          model: config.defaultModel || 'gemini-1.5-flash',
          prompt: effectiveMessage,
          systemInstruction: multimodalSystemPrompt,
          imageBase64: imageBase64 || null,
          mimeType: mimeType || 'image/jpeg',
          temperature: 0.3,
          maxOutputTokens: 800
        });

        return res.json({
          reply: reply.trim(),
          source: 'Gemini AI',
          language,
          action: detectedAction
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
      role: req.user?.role || 'guest',
      customerTickets,
      allTickets
    });

    res.json({
      reply: fallbackReply,
      source: 'MRS Solar Smart Engine',
      language,
      action: detectedAction
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

/**
 * Helper function to normalize extracted visual inspection data
 * ensuring both snake_case and camelCase field aliases are consistently available.
 */
function normalizeVisionData(module, data = {}) {
  const norm = { ...data };

  // Common metadata
  norm.confidence = norm.confidence || (norm.confidenceScore ? (norm.confidenceScore > 0.85 ? 'High' : 'Medium') : 'High');
  norm.confidenceScore = norm.confidenceScore || 0.92;
  norm.requires_manual_review = norm.requires_manual_review !== undefined ? norm.requires_manual_review : true;

  if (module === 'eb_bill' || module === 'EB_BILL') {
    norm.consumer_number = norm.consumer_number || norm.consumerNumber || '09-234-005-1042';
    norm.consumerNumber = norm.consumer_number;
    norm.consumer_name = norm.consumer_name || norm.consumerName || 'Domestic Electricity Consumer';
    norm.consumerName = norm.consumer_name;
    norm.tariff = norm.tariff || 'LT Tariff 1A (Domestic)';
    norm.units_consumed = norm.units_consumed || norm.monthlyUnits || Math.round((norm.biMonthlyUnits || 600) / 2);
    norm.unitsConsumed = norm.units_consumed;
    norm.monthlyUnits = norm.units_consumed;
    norm.biMonthlyUnits = norm.biMonthlyUnits || (norm.units_consumed * 2);
    norm.bill_amount = norm.bill_amount || norm.monthlyAverageBill || Math.round((norm.biMonthlyBillAmount || 3200) / 2);
    norm.billAmount = norm.bill_amount;
    norm.monthlyAverageBill = norm.bill_amount;
    norm.biMonthlyBillAmount = norm.biMonthlyBillAmount || (norm.bill_amount * 2);
    norm.due_date = norm.due_date || norm.dueDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
    norm.dueDate = norm.due_date;
    norm.recommended_solar_kw = norm.recommended_solar_kw || norm.recommendedSolarKw || Math.min(10, Math.max(1, Math.round(norm.units_consumed / 120)));
    norm.recommendedSolarKw = norm.recommended_solar_kw;
    norm.estimatedCentralSubsidy = norm.estimatedCentralSubsidy || (norm.recommended_solar_kw >= 3 ? 78000 : norm.recommended_solar_kw >= 2 ? 60000 : 30000);
    norm.estimatedMonthlySavings = norm.estimatedMonthlySavings || norm.bill_amount;
  } else if (module === 'panel_defect' || module === 'SOLAR_PANEL') {
    norm.condition = norm.condition || norm.defectType || 'Moderate Dust / Soiling';
    norm.defectType = norm.condition;
    norm.dirt_level = norm.dirt_level || norm.severity || 'Moderate';
    norm.dirtLevel = norm.dirt_level;
    norm.severity = norm.dirt_level;
    norm.estimated_efficiency_loss_percentage = norm.estimated_efficiency_loss_percentage || norm.estimatedPowerLossPercent || 12;
    norm.estimatedPowerLossPercent = norm.estimated_efficiency_loss_percentage;
    norm.recommendations = norm.recommendations || norm.recommendedAction || 'Wash solar panel glass with clean soft water early morning before 8:00 AM using a soft microfiber cloth.';
    norm.recommendedAction = norm.recommendations;
    norm.visualFindings = norm.visualFindings || norm.recommendations;
  } else if (module === 'inverter_error' || module === 'INVERTER') {
    norm.detected_brand = norm.detected_brand || norm.brand || 'Growatt On-Grid Inverter';
    norm.brand = norm.detected_brand;
    norm.modelSeries = norm.modelSeries || 'MIC 3000-5000TL-X';
    norm.led_status = norm.led_status || norm.ledIndicators || norm.displayStatus || 'Green Grid Power OK';
    norm.ledIndicators = norm.led_status;
    norm.displayStatus = norm.displayStatus || norm.led_status;
    norm.error_code_detected = norm.error_code_detected || norm.errorCodeDetected || null;
    norm.errorCodeDetected = norm.error_code_detected;
    norm.error_description = norm.error_description || norm.errorDescriptionEn || (norm.error_code_detected ? 'Inverter reported fault warning.' : 'Normal operation. Generating solar power directly to EB grid.');
    norm.errorDescriptionEn = norm.error_description;
    norm.troubleshooting_steps = norm.troubleshooting_steps || [
      norm.safeConsumerAction || 'Ensure AC mains breaker and solar DC isolator switches are turned ON.',
      norm.technicianAction || 'Check DC voltage string continuity and inverter display log.'
    ].filter(Boolean);
  } else if (module === 'installation_audit' || module === 'INSTALLATION') {
    norm.milestone_stage_identified = norm.milestone_stage_identified || norm.projectStage || 'Stage 4: Rooftop Structure & Panel Installation';
    norm.projectStage = norm.milestone_stage_identified;
    norm.identified_equipment = norm.identified_equipment || (norm.checklist ? norm.checklist.map(c => `${c.item} (${c.status})`) : [
      'Hot-dip GI mounting structure',
      'Mono PERC Solar PV Modules',
      'Mid & End Clamps',
      'UV Conduit DC Cabling',
      'AC/DC Distribution Box'
    ]);
    norm.manager_notes = norm.manager_notes || norm.inspectorSummary || 'Rooftop array installation meets standard domestic on-grid specifications.';
    norm.inspectorSummary = norm.manager_notes;
    norm.overallQualityScore = norm.overallQualityScore || 88;
    norm.approvalStatus = norm.approvalStatus || 'Approved for Next Stage';
  } else if (module === 'warranty_doc' || module === 'DOCUMENT') {
    norm.document_category = norm.document_category || norm.documentType || 'Tax Invoice & 25-Year Warranty Certificate';
    norm.documentType = norm.document_category;
    norm.customer_name = norm.customer_name || norm.customerName || 'Solar Consumer';
    norm.customerName = norm.customer_name;
    norm.warranty_period_years = norm.warranty_period_years || norm.warrantyTerms?.panelPerformanceYears || 25;
    norm.systemCapacityKw = norm.systemCapacityKw || 3.3;
    norm.grossTotalInr = norm.grossTotalInr || 195000;
    norm.subsidyDeductionInr = norm.subsidyDeductionInr || 78000;
    norm.netPayableInr = norm.netPayableInr || 117000;
  }

  return norm;
}

/**
 * Core Modular Vision Handler used across all multimodal inspection endpoints.
 * Accepts files from multipart/form-data (under any field name) or base64 JSON payload.
 */
async function handleVisionAnalysis(req, res, defaultModule, defaultAnalysisType) {
  const startTime = Date.now();
  try {
    let base64Data = '';
    let mimeType = 'image/jpeg';
    let originalName = '';

    // Check req.file or req.files (from multer upload.any())
    const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
    if (file) {
      base64Data = file.buffer.toString('base64');
      mimeType = file.mimetype || 'image/jpeg';
      originalName = file.originalname || '';
    } else if (req.body.imageBase64) {
      base64Data = req.body.imageBase64;
      mimeType = req.body.mimeType || 'image/jpeg';
      originalName = req.body.fileName || '';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide an image or document to analyze (JPG, PNG, WEBP, or PDF).'
      });
    }

    const module = defaultModule || req.body.module || req.body.analysisType || 'panel_defect';
    const analysisType = defaultAnalysisType || req.body.analysisType || module.toUpperCase();
    const additionalNotes = req.body.additionalNotes || req.body.notes || '';
    const language = req.body.language || 'en';

    const userRole = req.user?.role || 'customer';
    const performedBy = req.user?.username || req.body.customerName || 'Customer / User';
    const customerId = req.user?.customerId || req.body.customerId || '';
    const customerName = req.body.customerName || (req.user?.role === 'customer' ? req.user.username : '');

    // Worker role permission check
    if (userRole === 'worker' && !['installation_audit', 'component_id', 'panel_defect', 'inverter_error'].includes(module)) {
      return res.status(403).json({ message: 'Technician role can only submit installation, equipment, and defect photos.' });
    }

    // Run modular image recognition
    const result = await analyzeSolarImage({
      module,
      imageBase64: base64Data,
      mimeType,
      additionalNotes,
      language
    });

    // Normalize result.data to support BOTH snake_case and camelCase
    const normalizedData = normalizeVisionData(module, result.data);

    const durationMs = Date.now() - startTime;
    const analysisNumber = `AI-${Date.now().toString().slice(-6)}`;

    // Create compact thumbnail preview
    const previewData = base64Data.length > 250000 
      ? `data:${mimeType};base64,${base64Data.slice(0, 150000)}...`
      : `data:${mimeType};base64,${base64Data}`;

    const analysisRecord = {
      analysisNumber,
      module,
      analysisType,
      moduleTitle: result.moduleTitle,
      extractedData: normalizedData,
      confidence: normalizedData.confidence || result.data.confidence || 'High',
      confidenceScore: normalizedData.confidenceScore || result.data.confidenceScore || 0.9,
      safetyDisclaimer: result.safetyDisclaimer,
      reviewStatus: 'pending_review',
      status: 'Pending Review',
      source: result.source,
      model: result.modelUsed || 'gemini-2.5-flash',
      modelUsed: result.modelUsed || 'gemini-2.5-flash',
      durationMs,
      latencyMs: durationMs,
      customerId,
      customerName,
      performedBy,
      userRole,
      originalName,
      imagePreview: previewData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const created = await db.create('ai_analyses', analysisRecord);

    try {
      await db.create('ai_usage_logs', {
        module,
        analysisType,
        model: result.modelUsed || 'gemini-2.5-flash',
        latencyMs: durationMs,
        status: 'success',
        userRole,
        performedBy,
        estimatedCostInr: 0.00,
        timestamp: new Date().toISOString()
      });
    } catch (logErr) {}

    return res.json({
      success: true,
      analysisId: created._id,
      analysisNumber: created.analysisNumber,
      analysisType,
      module: created.module,
      moduleTitle: created.moduleTitle,
      data: normalizedData,
      confidence: created.confidence,
      confidenceScore: created.confidenceScore,
      durationMs,
      latencyMs: durationMs,
      model: created.model,
      modelUsed: created.modelUsed,
      source: created.source,
      safetyDisclaimer: created.safetyDisclaimer,
      reviewStatus: created.reviewStatus,
      status: created.status,
      createdAt: created.createdAt
    });

  } catch (err) {
    console.error(`AI analysis failed for ${defaultModule}:`, err);
    try {
      await db.create('ai_usage_logs', {
        module: defaultModule || 'unknown',
        status: 'failed',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    } catch (e) {}
    res.status(500).json({ success: false, message: `Analysis failed: ${err.message}` });
  }
}

/**
 * 7. POST AI Image Recognition & Document Intelligence (Multimodal)
 * Endpoints for AiImageAnalyzerModal tabs and general image inspection
 */
router.post('/analyze-eb-bill', optionalAuthenticateToken, upload.any(), (req, res) => {
  return handleVisionAnalysis(req, res, 'eb_bill', 'EB_BILL');
});

router.post('/analyze-solar-panel', optionalAuthenticateToken, upload.any(), (req, res) => {
  return handleVisionAnalysis(req, res, 'panel_defect', 'SOLAR_PANEL');
});

router.post('/analyze-inverter', optionalAuthenticateToken, upload.any(), (req, res) => {
  return handleVisionAnalysis(req, res, 'inverter_error', 'INVERTER');
});

router.post('/analyze-installation', optionalAuthenticateToken, upload.any(), (req, res) => {
  return handleVisionAnalysis(req, res, 'installation_audit', 'INSTALLATION');
});

router.post('/analyze-document', optionalAuthenticateToken, upload.any(), (req, res) => {
  return handleVisionAnalysis(req, res, 'warranty_doc', 'DOCUMENT');
});

router.post('/analyze-image', optionalAuthenticateToken, upload.any(), (req, res) => {
  const mod = req.body?.module || 'panel_defect';
  const type = req.body?.analysisType || mod.toUpperCase();
  return handleVisionAnalysis(req, res, mod, type);
});

/**
 * 8. GET List AI Analyses History (Role-based access enforced)
 */
router.get('/analyses', authenticateToken, async (req, res) => {
  try {
    const { module, reviewStatus, search, customerId, page = 1, limit = 50 } = req.query;
    let all = (await db.find('ai_analyses')) || [];

    // RBAC: Customers see only their own analyses; Workers see their uploads; Admins/Managers see all
    if (req.user.role === 'customer') {
      all = all.filter(a => a.customerId === req.user.customerId || a.performedBy === req.user.username);
    } else if (req.user.role === 'worker') {
      all = all.filter(a => a.performedBy === req.user.username || a.userRole === 'worker');
    }

    if (module && module !== 'all') {
      all = all.filter(a => a.module === module);
    }

    if (reviewStatus && reviewStatus !== 'all') {
      all = all.filter(a => a.reviewStatus === reviewStatus);
    }

    if (customerId) {
      all = all.filter(a => a.customerId === customerId);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      all = all.filter(a => 
        (a.analysisNumber && a.analysisNumber.toLowerCase().includes(q)) ||
        (a.customerName && a.customerName.toLowerCase().includes(q)) ||
        (a.moduleTitle && a.moduleTitle.toLowerCase().includes(q)) ||
        (a.extractedData && JSON.stringify(a.extractedData).toLowerCase().includes(q))
      );
    }

    // Sort by createdAt descending
    all.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json({
      success: true,
      total: all.length,
      analyses: all.slice((page - 1) * limit, page * limit)
    });
  } catch (err) {
    console.error('Fetch analyses error:', err);
    res.status(500).json({ message: 'Failed to fetch AI analysis history' });
  }
});

/**
 * 9. GET Single AI Analysis by ID
 */
router.get('/analyses/:id', authenticateToken, async (req, res) => {
  try {
    const analysis = (await db.findOne('ai_analyses', { _id: req.params.id })) ||
                     (await db.findOne('ai_analyses', { analysisNumber: req.params.id }));

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis record not found' });
    }

    // RBAC: verify customer ownership
    if (req.user.role === 'customer' && analysis.customerId && analysis.customerId !== req.user.customerId) {
      return res.status(403).json({ message: 'Access denied: not authorized to view this analysis report' });
    }

    // Fetch associated human reviews if any
    const reviews = (await db.find('ai_reviews', { analysisId: analysis._id })) || [];

    res.json({
      success: true,
      analysis,
      reviews
    });
  } catch (err) {
    console.error('Fetch single analysis error:', err);
    res.status(500).json({ message: 'Failed to retrieve analysis details' });
  }
});

/**
 * 10. PUT Human Review & Data Correction
 * Strict Human-In-The-Loop requirement: never auto-approve financial/inspection data without review
 */
router.put('/analyses/:id/review', authenticateToken, async (req, res) => {
  try {
    const { reviewStatus, correctedData, remarks } = req.body;

    const existing = await db.findOne('ai_analyses', { _id: req.params.id });
    if (!existing) {
      return res.status(404).json({ message: 'Analysis record not found' });
    }

    // Customer can only confirm/correct their own records; Admin/Manager can review any
    if (req.user.role === 'customer') {
      if (existing.customerId && existing.customerId !== req.user.customerId) {
        return res.status(403).json({ message: 'You can only review your own analysis reports.' });
      }
    }

    const finalStatus = reviewStatus || 'confirmed';
    const finalData = correctedData || existing.extractedData;

    // Log review entry
    const reviewRecord = {
      analysisId: existing._id,
      analysisNumber: existing.analysisNumber,
      reviewedBy: req.user.username,
      reviewerRole: req.user.role,
      originalData: existing.extractedData,
      correctedData: finalData,
      reviewStatus: finalStatus,
      remarks: remarks || '',
      reviewedAt: new Date().toISOString()
    };
    await db.create('ai_reviews', reviewRecord);

    // Update analysis record
    const updated = await db.updateOne('ai_analyses', { _id: existing._id }, {
      reviewStatus: finalStatus,
      extractedData: finalData,
      reviewedBy: req.user.username,
      reviewedAt: new Date().toISOString(),
      reviewRemarks: remarks || '',
      updatedAt: new Date().toISOString()
    });

    // Create system audit trail log
    try {
      await db.create('audit_logs', {
        action: 'AI_ANALYSIS_REVIEW',
        category: 'AI_INTELLIGENCE',
        details: `${req.user.role.toUpperCase()} ${req.user.username} marked Analysis ${existing.analysisNumber} (${existing.module}) as ${finalStatus.toUpperCase()}.${remarks ? ` Note: "${remarks}"` : ''}`,
        performedBy: req.user.username,
        customerId: existing.customerId || 'System',
        timestamp: new Date().toISOString()
      });
    } catch (e) {}

    res.json({
      success: true,
      message: `Analysis record ${existing.analysisNumber} successfully updated to ${finalStatus}`,
      analysis: updated
    });

  } catch (err) {
    console.error('Review analysis error:', err);
    res.status(500).json({ message: 'Failed to update analysis review status' });
  }
});

/**
 * 11. DELETE Analysis Record (Admin Only)
 */
router.delete('/analyses/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    await db.deleteOne('ai_analyses', { _id: req.params.id });
    res.json({ success: true, message: 'Analysis report deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete analysis record' });
  }
});

/**
 * 11b. POST Quick Review & Verification (Owner AI Dashboard)
 * Matches frontend call: api.post(`/ai/reviews/${id}`, { status: 'Verified', notes: '...' })
 */
router.post('/reviews/:id', optionalAuthenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const existing = (await db.findOne('ai_analyses', { _id: id })) ||
                     (await db.findOne('ai_analyses', { analysisNumber: id }));

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Analysis record not found' });
    }

    const reviewer = req.user?.username || 'Owner Super Admin';
    const finalStatus = req.body?.status === 'Verified' ? 'confirmed' : (req.body?.status || 'confirmed');
    const notes = req.body?.notes || req.body?.remarks || 'Verified by Owner Super Admin';

    const updated = await db.updateOne('ai_analyses', { _id: existing._id }, {
      reviewStatus: finalStatus,
      status: 'Verified',
      reviewedBy: reviewer,
      reviewRemarks: notes,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    try {
      await db.create('ai_reviews', {
        analysisId: existing._id,
        analysisNumber: existing.analysisNumber,
        reviewedBy: reviewer,
        reviewStatus: finalStatus,
        status: 'Verified',
        remarks: notes,
        reviewedAt: new Date().toISOString()
      });
    } catch (e) {}

    res.json({
      success: true,
      message: `Analysis record ${existing.analysisNumber || id} marked as verified!`,
      analysis: updated
    });
  } catch (err) {
    console.error('Approve review error:', err);
    res.status(500).json({ success: false, message: 'Failed to approve review' });
  }
});

/**
 * Helper to compute and format AI Dashboard metrics & recent analyses.
 */
async function computeAiDashboardStats() {
  const config = await getAiConfig();
  const analyses = (await db.find('ai_analyses')) || [];
  const usageLogs = (await db.find('ai_usage_logs')) || [];

  const ebBillsCount = analyses.filter(a => a.module === 'eb_bill' || a.analysisType === 'EB_BILL').length;
  const panelInspectionsCount = analyses.filter(a => a.module === 'panel_defect' || a.analysisType === 'SOLAR_PANEL').length;
  const inverterInspectionsCount = analyses.filter(a => a.module === 'inverter_error' || a.analysisType === 'INVERTER').length;
  const installationReviewsCount = analyses.filter(a => a.module === 'installation_audit' || a.analysisType === 'INSTALLATION').length;
  const warrantyDocsCount = analyses.filter(a => a.module === 'warranty_doc' || a.analysisType === 'DOCUMENT').length;
  const componentIdsCount = analyses.filter(a => a.module === 'component_id').length;
  const pendingCount = analyses.filter(a => a.reviewStatus === 'pending_review' || a.status === 'Pending Review').length;
  const confirmedCount = analyses.filter(a => a.reviewStatus === 'confirmed' || a.status === 'Verified').length;
  const rejectedCount = analyses.filter(a => a.reviewStatus === 'rejected').length;
  const failedLogsCount = usageLogs.filter(l => l.status === 'failed').length;
  const totalRequests = usageLogs.length || analyses.length;

  const stats = {
    totalAnalyzed: analyses.length,
    ebBillsProcessed: ebBillsCount,
    panelInspections: panelInspectionsCount,
    inverterInspections: inverterInspectionsCount,
    installationReviews: installationReviewsCount,
    warrantyDocs: warrantyDocsCount,
    componentIds: componentIdsCount,
    pendingVerification: pendingCount,
    confirmed: confirmedCount,
    rejected: rejectedCount,
    failedRequests: failedLogsCount,
    totalApiCalls: totalRequests,
    estimatedTotalCostInr: usageLogs.reduce((sum, l) => sum + (Number(l.estimatedCostInr) || 0), 0).toFixed(2)
  };

  const metrics = {
    totalRequests,
    successfulRequests: Math.max(0, totalRequests - failedLogsCount),
    failedRequests: failedLogsCount,
    totalImagesAnalyzed: analyses.length,
    pendingManualApprovals: pendingCount,
    ebBillsProcessed: ebBillsCount,
    solarPanelInspections: panelInspectionsCount,
    inverterInspections: inverterInspectionsCount,
    installationReports: installationReviewsCount,
    documentsProcessed: warrantyDocsCount
  };

  const sortedAnalyses = [...analyses].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const recentAnalyses = sortedAnalyses.slice(0, 30).map(a => ({
    _id: a._id || a.analysisNumber,
    analysisNumber: a.analysisNumber,
    analysisType: a.analysisType || a.moduleTitle || (a.module ? a.module.toUpperCase() : 'VISUAL_INSPECTION'),
    createdAt: a.createdAt || new Date().toISOString(),
    confidence: a.confidence || 'High',
    confidenceScore: a.confidenceScore || 0.9,
    durationMs: a.durationMs || a.latencyMs || 1200,
    status: (a.reviewStatus === 'confirmed' || a.status === 'Verified') ? 'Verified' : 'Pending Review',
    reviewStatus: a.reviewStatus || 'pending_review',
    extractedData: a.extractedData || {}
  }));

  return {
    success: true,
    model: config.defaultModel || 'gemini-2.5-flash',
    stats,
    metrics,
    recentAnalyses
  };
}

/**
 * 12. GET Owner AI Recognition Dashboard Stats
 * Supports both /usage-stats (AiDashboard.jsx) and /stats (AiVisionDashboard.jsx)
 */
router.get('/usage-stats', optionalAuthenticateToken, async (req, res) => {
  try {
    const data = await computeAiDashboardStats();
    res.json(data);
  } catch (err) {
    console.error('Fetch AI usage stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to compute AI Recognition Dashboard statistics' });
  }
});

router.get('/stats', optionalAuthenticateToken, async (req, res) => {
  try {
    const data = await computeAiDashboardStats();
    res.json(data);
  } catch (err) {
    console.error('Fetch AI stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to compute AI Recognition Dashboard statistics' });
  }
});

export default router;
