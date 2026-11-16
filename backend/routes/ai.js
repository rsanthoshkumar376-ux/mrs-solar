import express from 'express';
import multer from 'multer';
import { db } from '../database/db.js';
import { authenticateToken, optionalAuthenticateToken, authorizeRole } from '../middleware/auth.js';
import { getAiConfig, saveAiConfig } from '../utils/aiConfig.js';
import {
  chatWithGemini,
  analyzeImageWithGemini,
  getApiKey,
  getModelId,
  getGeminiClient,
  cleanBase64
} from '../services/geminiService.js';

const router = express.Router();

// Memory storage for fast image-to-AI processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

/**
 * Helper to extract base64 and mimeType from either multipart file or JSON body
 */
function extractImageData(req) {
  if (req.file) {
    return {
      base64: req.file.buffer.toString('base64'),
      mimeType: req.file.mimetype || 'image/jpeg'
    };
  }
  if (req.body?.imageBase64 || req.body?.image) {
    const raw = req.body.imageBase64 || req.body.image;
    return {
      base64: cleanBase64(raw),
      mimeType: req.body.mimeType || 'image/jpeg'
    };
  }
  return null;
}

// ─── 1. ADVANCED MRS SOLAR AI CHATBOT ─────────────────────────────────────────

/**
 * POST /api/ai/chat
 * Multi-turn, role-context aware, multimodal solar chatbot
 */
router.post('/chat', optionalAuthenticateToken, upload.single('attachment'), async (req, res) => {
  try {
    const { message, language = 'en', conversationId } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const user = req.user || null;
    const role = user?.role || 'visitor';
    const imageAttachment = extractImageData(req);

    // Retrieve previous messages if conversationId is provided
    let conversationHistory = [];
    let convId = conversationId;
    if (convId) {
      const pastMessages = await db.find('ai_messages', { conversationId: convId });
      conversationHistory = pastMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else {
      convId = `CONV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await db.create('ai_conversations', {
        conversationId: convId,
        userId: user?._id || user?.customerId || user?.employeeId || 'guest',
        role,
        language,
        title: message.slice(0, 40),
        lastMessageAt: new Date().toISOString()
      });
    }

    // Save user message to database
    await db.create('ai_messages', {
      conversationId: convId,
      role: 'user',
      content: message,
      hasImage: Boolean(imageAttachment),
      createdAt: new Date().toISOString()
    });

    // Call Gemini 2.5 Flash
    const result = await chatWithGemini({
      message,
      language,
      user,
      role,
      imageAttachment,
      conversationHistory
    });

    // Save assistant reply to database
    await db.create('ai_messages', {
      conversationId: convId,
      role: 'assistant',
      content: result.reply,
      source: result.source,
      createdAt: new Date().toISOString()
    });

    // Update conversation last message timestamp
    await db.updateOne('ai_conversations', { conversationId: convId }, {
      lastMessageAt: new Date().toISOString()
    }).catch(() => {});

    res.json({
      success: true,
      conversationId: convId,
      reply: result.reply,
      source: result.source,
      isQuotaError: result.isQuotaError || false,
      isKeyMissing: result.isKeyMissing || false,
      durationMs: result.durationMs
    });
  } catch (err) {
    console.error('Chat endpoint error:', err);
    res.status(500).json({
      error: 'Failed to process AI chat request',
      details: err.message
    });
  }
});

// ─── 2. SPECIALIZED MULTIMODAL IMAGE RECOGNITION ─────────────────────────────

/**
 * POST /api/ai/analyze-image (General Analyzer)
 */
router.post('/analyze-image', optionalAuthenticateToken, upload.single('image'), async (req, res) => {
  try {
    const imgData = extractImageData(req);
    if (!imgData) {
      return res.status(400).json({ error: 'Image file or Base64 data is required' });
    }

    const { analysisType = 'GENERAL', prompt } = req.body;
    const result = await analyzeImageWithGemini({
      imageBase64: imgData.base64,
      mimeType: imgData.mimeType,
      analysisType,
      customPrompt: prompt,
      user: req.user,
      role: req.user?.role
    });

    res.json(result);
  } catch (err) {
    console.error('Analyze image error:', err);
    res.status(500).json({ error: err.message || 'Image analysis failed' });
  }
});

/**
 * POST /api/ai/analyze-eb-bill (TNEB Bill Recognition)
 */
router.post('/analyze-eb-bill', optionalAuthenticateToken, upload.single('billImage'), async (req, res) => {
  try {
    const imgData = extractImageData(req);
    if (!imgData) {
      return res.status(400).json({ error: 'Electricity bill photograph is required' });
    }

    const result = await analyzeImageWithGemini({
      imageBase64: imgData.base64,
      mimeType: imgData.mimeType,
      analysisType: 'EB_BILL',
      user: req.user,
      role: req.user?.role
    });

    res.json(result);
  } catch (err) {
    console.error('EB Bill analysis error:', err);
    res.status(500).json({ error: err.message || 'EB bill analysis failed' });
  }
});

/**
 * POST /api/ai/analyze-solar-panel (Panel Damage & Soiling)
 */
router.post('/analyze-solar-panel', optionalAuthenticateToken, upload.single('panelImage'), async (req, res) => {
  try {
    const imgData = extractImageData(req);
    if (!imgData) {
      return res.status(400).json({ error: 'Solar panel photograph is required' });
    }

    const result = await analyzeImageWithGemini({
      imageBase64: imgData.base64,
      mimeType: imgData.mimeType,
      analysisType: 'SOLAR_PANEL',
      user: req.user,
      role: req.user?.role
    });

    res.json(result);
  } catch (err) {
    console.error('Solar panel analysis error:', err);
    res.status(500).json({ error: err.message || 'Solar panel analysis failed' });
  }
});

/**
 * POST /api/ai/analyze-inverter (Inverter Display & Error Codes)
 */
router.post('/analyze-inverter', optionalAuthenticateToken, upload.single('inverterImage'), async (req, res) => {
  try {
    const imgData = extractImageData(req);
    if (!imgData) {
      return res.status(400).json({ error: 'Inverter photograph is required' });
    }

    const result = await analyzeImageWithGemini({
      imageBase64: imgData.base64,
      mimeType: imgData.mimeType,
      analysisType: 'INVERTER',
      user: req.user,
      role: req.user?.role
    });

    res.json(result);
  } catch (err) {
    console.error('Inverter analysis error:', err);
    res.status(500).json({ error: err.message || 'Inverter analysis failed' });
  }
});

/**
 * POST /api/ai/analyze-installation (Installation QA & Milestone Verification)
 */
router.post('/analyze-installation', authenticateToken, authorizeRole(['admin', 'manager', 'worker']), upload.single('installationImage'), async (req, res) => {
  try {
    const imgData = extractImageData(req);
    if (!imgData) {
      return res.status(400).json({ error: 'Installation photograph is required' });
    }

    const result = await analyzeImageWithGemini({
      imageBase64: imgData.base64,
      mimeType: imgData.mimeType,
      analysisType: 'INSTALLATION',
      user: req.user,
      role: req.user?.role
    });

    res.json(result);
  } catch (err) {
    console.error('Installation analysis error:', err);
    res.status(500).json({ error: err.message || 'Installation verification failed' });
  }
});

/**
 * POST /api/ai/analyze-document (Invoices, Quotations, Warranties)
 */
router.post('/analyze-document', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    const imgData = extractImageData(req);
    if (!imgData) {
      return res.status(400).json({ error: 'Document photograph or scan is required' });
    }

    const result = await analyzeImageWithGemini({
      imageBase64: imgData.base64,
      mimeType: imgData.mimeType,
      analysisType: 'DOCUMENT',
      user: req.user,
      role: req.user?.role
    });

    res.json(result);
  } catch (err) {
    console.error('Document analysis error:', err);
    res.status(500).json({ error: err.message || 'Document analysis failed' });
  }
});

// ─── 3. CONVERSATIONS & ANALYSIS HISTORY ──────────────────────────────────────

/**
 * GET /api/ai/conversations
 */
router.get('/conversations', optionalAuthenticateToken, async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.customerId || req.user?.employeeId;
    let query = {};
    if (userId) {
      query = { userId };
    }
    const conversations = await db.find('ai_conversations', query);
    res.json({
      success: true,
      conversations: conversations.sort((a, b) => new Date(b.lastMessageAt || b.createdAt) - new Date(a.lastMessageAt || a.createdAt))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * GET /api/ai/analysis-history
 */
router.get('/analysis-history', authenticateToken, async (req, res) => {
  try {
    const role = req.user?.role;
    let analyses = await db.find('ai_image_analyses');
    
    // If worker or customer, filter to their own submissions
    if (role === 'worker' || role === 'customer') {
      const myId = req.user?._id || req.user?.customerId || req.user?.employeeId;
      analyses = analyses.filter(a => a.userId === myId);
    }

    res.json({
      success: true,
      analyses: analyses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analysis history' });
  }
});

/**
 * POST /api/ai/reviews/:id (Manager / Admin Approval of Analysis)
 */
router.post('/reviews/:id', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const { status = 'Verified', notes = '' } = req.body;
    const analysis = await db.findOne('ai_image_analyses', { _id: req.params.id });
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis record not found' });
    }

    const updated = await db.updateOne('ai_image_analyses', { _id: analysis._id }, {
      status,
      managerNotes: notes,
      reviewedBy: req.user?.fullName || req.user?.username,
      reviewedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Analysis marked as ${status}`,
      record: updated
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to review analysis record' });
  }
});

// ─── 4. OWNER AI DASHBOARD & USAGE METRICS ────────────────────────────────────

/**
 * GET /api/ai/usage-stats (Admin Only)
 */
router.get('/usage-stats', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const [usageLogs, analyses] = await Promise.all([
      db.find('ai_usage_logs').catch(() => []),
      db.find('ai_image_analyses').catch(() => [])
    ]);

    const totalRequests = usageLogs.length;
    const successfulRequests = usageLogs.filter(l => l.status === 'success').length;
    const failedRequests = usageLogs.filter(l => l.status === 'error').length;

    const totalImages = analyses.length;
    const ebBillsCount = analyses.filter(a => a.analysisType === 'EB_BILL').length;
    const panelInspectionsCount = analyses.filter(a => a.analysisType === 'SOLAR_PANEL').length;
    const inverterCount = analyses.filter(a => a.analysisType === 'INVERTER').length;
    const installationCount = analyses.filter(a => a.analysisType === 'INSTALLATION').length;
    const documentCount = analyses.filter(a => a.analysisType === 'DOCUMENT').length;
    const pendingManualReview = analyses.filter(a => a.status === 'Pending Review').length;

    // Average latency
    const validDurations = usageLogs.map(l => Number(l.durationMs) || 0).filter(d => d > 0);
    const avgLatencyMs = validDurations.length > 0 ? Math.round(validDurations.reduce((a, b) => a + b, 0) / validDurations.length) : 0;

    res.json({
      success: true,
      model: getModelId(),
      apiKeyConfigured: Boolean(await getApiKey()),
      metrics: {
        totalRequests,
        successfulRequests,
        failedRequests,
        totalImagesAnalyzed: totalImages,
        ebBillsProcessed: ebBillsCount,
        solarPanelInspections: panelInspectionsCount,
        inverterInspections: inverterCount,
        installationReports: installationCount,
        documentsProcessed: documentCount,
        pendingManualApprovals: pendingManualReview,
        estimatedCostUSD: 0.00, // Gemini 2.5 Flash Free Tier
        freeTierStatus: 'Active (Within Quota)',
        averageLatencyMs: avgLatencyMs
      },
      recentAnalyses: analyses.slice(-10).reverse()
    });
  } catch (err) {
    console.error('Fetch AI usage stats error:', err);
    res.status(500).json({ error: 'Failed to calculate AI analytics' });
  }
});

// ─── 5. PRESERVED BACKWARD COMPATIBLE SETTINGS & SCAN ROUTES ──────────────────

router.get('/settings', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const config = await getAiConfig();
    const key = await getApiKey();
    const hasKey = Boolean(key);
    const maskedKey = hasKey ? `${key.slice(0, 6)}...${key.slice(-4)}` : '';

    res.json({
      hasKey,
      maskedKey,
      defaultModel: getModelId(),
      enabledFeatures: config.enabledFeatures || {
        kycScanner: true,
        chatCopilot: true,
        solarDiagnostics: true
      },
      updatedAt: config.updatedAt
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch AI configuration' });
  }
});

router.post('/settings', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { geminiApiKey, defaultModel, enabledFeatures } = req.body;
    const updated = await saveAiConfig({
      geminiApiKey,
      defaultModel: defaultModel || 'gemini-2.5-flash',
      enabledFeatures
    });

    res.json({
      success: true,
      message: 'AI engine settings updated successfully!',
      hasKey: Boolean(updated.geminiApiKey),
      defaultModel: updated.defaultModel
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save AI configuration' });
  }
});

router.post('/test-key', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const startTime = Date.now();
  try {
    const { apiKey, model } = req.body;
    const keyToTest = apiKey || await getApiKey();

    if (!keyToTest) {
      return res.status(400).json({
        success: false,
        message: 'No Google Gemini API key provided. Please configure a key first.'
      });
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: keyToTest });
    const response = await ai.models.generateContent({
      model: model || getModelId(),
      contents: [{ role: 'user', parts: [{ text: 'Respond with "OK" if connection is live.' }] }]
    });

    const durationMs = Date.now() - startTime;
    res.json({
      success: true,
      message: `Gemini 2.5 Flash connection verified! Latency: ${durationMs}ms`,
      reply: response.text?.trim() || 'OK',
      latencyMs: durationMs
    });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    res.status(500).json({
      success: false,
      message: `Gemini API test failed: ${err.message}`,
      latencyMs: durationMs
    });
  }
});

// Preserved TNEB scanner route for public referral portal
router.post('/scan-tneb-bill', upload.single('billImage'), async (req, res) => {
  try {
    const imgData = extractImageData(req);
    if (!imgData) {
      return res.status(400).json({ message: 'Please provide a TNEB electricity bill image to scan' });
    }

    const result = await analyzeImageWithGemini({
      imageBase64: imgData.base64,
      mimeType: imgData.mimeType,
      analysisType: 'EB_BILL'
    });

    res.json({
      success: true,
      source: 'Gemini 2.5 Flash AI',
      data: result.data
    });
  } catch (err) {
    console.error('TNEB scan error:', err);
    res.status(500).json({ message: err.message || 'Failed to scan TNEB bill' });
  }
});

export default router;
