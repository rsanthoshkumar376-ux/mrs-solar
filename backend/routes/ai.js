import express from 'express';
import multer from 'multer';
import { db } from '../database/db.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { getAiConfig, saveAiConfig, callGeminiApi } from '../utils/aiConfig.js';
import { generateSolarDiagnostics, generateSmartChatResponse, extractKycFromText } from '../utils/aiEngines.js';

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

    if (req.user.role === 'customer') {
      customerData = await db.findOne('customers', { customerId: req.user.customerId });
    } else if (req.user.role === 'admin') {
      // Fetch light summary stats for admin context
      const customers = await db.find('customers');
      const activeCustomers = customers.filter(c => c.loanStatus === 'Active').length;
      adminStatsData = {
        totalCustomers: customers.length,
        activeCustomers,
        overdueCustomers: customers.filter(c => c.paymentStatus === 'Overdue').length
      };
    }

    const config = await getAiConfig();

    if (config.geminiApiKey) {
      try {
        let systemPrompt = `You are the official AI Solar & Financing Assistant for "MRS SOLAR", a premier rooftop solar EPC and loan financing firm in Tamil Nadu, India.
Always be extremely polite, accurate, concise, and helpful.
Support both Tamil (தமிழ்) and English seamlessly. Answer in the same language the user asks.`;

        if (customerData) {
          systemPrompt += `\n\nLOGGED IN CUSTOMER CONTEXT:
Customer Name: ${customerData.fullName}
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
