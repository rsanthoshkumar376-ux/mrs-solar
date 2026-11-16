import { GoogleGenAI } from '@google/genai';
import { db } from '../database/db.js';

// Simple in-memory cache for non-sensitive repeated queries to optimize Free Tier usage
const responseCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Retrieves the Gemini API Key from environment or database settings
 */
export async function getApiKey() {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    return process.env.GEMINI_API_KEY.trim();
  }
  try {
    const settings = await db.findOne('settings', { key: 'ai' });
    if (settings?.geminiApiKey && settings.geminiApiKey.trim()) {
      return settings.geminiApiKey.trim();
    }
  } catch (err) {
    console.warn('[Gemini] Warning reading settings:', err.message);
  }
  return '';
}

/**
 * Returns model ID from environment or default 'gemini-2.5-flash'
 */
export function getModelId() {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}

/**
 * Initializes and returns a GoogleGenAI client instance
 */
export async function getGeminiClient() {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please add your Gemini API Key in backend .env or Settings > AI Engine.');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Logs an AI operation to database for audit & usage monitoring
 */
export async function logAiUsage({ endpoint, model, tokensUsed = 0, status = 'success', error = null, durationMs = 0, userId = null, role = null }) {
  try {
    await db.create('ai_usage_logs', {
      endpoint,
      model,
      tokensUsed,
      status,
      error: error ? String(error) : null,
      durationMs,
      userId,
      role,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[Gemini] Failed to write usage log:', err.message);
  }
}

/**
 * Cleans image base64 data by stripping data URL headers
 */
export function cleanBase64(data) {
  if (!data) return '';
  return data.includes(',') ? data.split(',')[1] : data;
}

/**
 * Builds role-specific context to inject into Gemini prompts
 */
export async function buildRoleContext(user, role) {
  let context = 'Role: Prospective Visitor (General Inquiries).';
  if (!user || !role) return context;

  try {
    if (role === 'admin') {
      const [customers, payments, projects, tasks, leads] = await Promise.all([
        db.find('customers').catch(() => []),
        db.find('payments').catch(() => []),
        db.find('solar_projects').catch(() => []),
        db.find('tasks').catch(() => []),
        db.find('leads').catch(() => [])
      ]);
      const activeCust = customers.filter(c => c.loanStatus === 'Active').length;
      const totalCollected = payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
      const ongoingProj = projects.filter(p => p.status !== 'Completed').length;
      const pendingTasks = tasks.filter(t => t.status === 'Submitted for Approval').length;
      const newLeads = leads.filter(l => l.status === 'New').length;

      context = `Role: Owner / Super Admin.
Business Summary:
- Active Customer Loans: ${activeCust}
- Total Capital Collected: ₹${totalCollected.toLocaleString('en-IN')}
- Active Solar Installations: ${ongoingProj}
- Pending Task Approvals: ${pendingTasks}
- New Referral Leads: ${newLeads}
Guidelines: Provide concise, high-level executive summaries with accurate numbers and actionable next steps.`;
    } else if (role === 'manager') {
      const [tasks, targets, leaves] = await Promise.all([
        db.find('tasks').catch(() => []),
        db.find('targets').catch(() => []),
        db.find('leave_requests').catch(() => [])
      ]);
      const pendingReview = tasks.filter(t => t.status === 'Submitted for Approval').length;
      const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;

      context = `Role: Manager / Team Leader (${user.fullName || user.username || 'Team Manager'}).
Department: ${user.department || 'Sales & Installation'}.
Team Context:
- Submissions awaiting your approval: ${pendingReview}
- Pending worker leave requests: ${pendingLeaves}
Guidelines: Assist with team task allocation, target distribution, photo verification, and field technical troubleshooting.`;
    } else if (role === 'worker') {
      const myId = user.employeeId || '';
      const [tasks, targets] = await Promise.all([
        db.find('tasks', { assigneeId: myId }).catch(() => []),
        db.find('targets', { assignedTo: myId }).catch(() => [])
      ]);
      const myActiveTasks = tasks.filter(t => ['Assigned', 'In Progress'].includes(t.status)).length;

      context = `Role: Field Worker / Technical Consultant (${user.fullName || 'Consultant'}).
Employee ID: ${myId}.
Personal Context:
- My Active Field Tasks: ${myActiveTasks}
Guidelines: Provide practical installation tips, wiring standards (strict on-grid battery-free), rooftop safety steps, shadow analysis guidance, and customer communication advice.`;
    } else if (role === 'customer') {
      const cust = await db.findOne('customers', { customerId: user.customerId || user.username });
      if (cust) {
        context = `Role: Verified Customer (${cust.fullName || 'Valued Customer'}).
Customer ID: ${cust.customerId}.
Solar System: ${cust.solarCapacity || 3} kWp Strict On-Grid Battery-Free System.
Installation Address: ${cust.installationAddress || 'Tamil Nadu'}.
Loan Balance: ₹${(cust.loanAmount || 0).toLocaleString('en-IN')}.
Monthly EMI: ₹${(cust.monthlyEmi || 0).toLocaleString('en-IN')} due on date ${cust.emiSchedule?.[0]?.dueDate || '5th of month'}.
Payment Status: ${cust.paymentStatus || 'Up to date'}.
PM Surya Ghar Subsidy: ₹${Number(cust.solarCapacity) >= 3 ? '78,000' : '60,000'} sanctioned.
Guidelines: Give personalized, polite support regarding upcoming EMI dates, UPI payments, net-meter EB billing, and inverter maintenance.`;
      }
    }
  } catch (err) {
    console.warn('[Gemini] Error building role context:', err.message);
  }

  return context;
}

/**
 * Core Chat Function with Gemini 2.5 Flash
 */
export async function chatWithGemini({ message, language = 'en', user = null, role = null, imageAttachment = null, conversationHistory = [] }) {
  const startTime = Date.now();
  const model = getModelId();

  // Free Tier cache check for simple non-personalized text questions
  const cacheKey = !user && !imageAttachment ? `chat_${language}_${message.trim().toLowerCase()}` : null;
  if (cacheKey && responseCache.has(cacheKey)) {
    const cached = responseCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return { reply: cached.reply, source: 'Gemini 2.5 Flash (Cached)', cached: true };
    }
  }

  const roleContext = await buildRoleContext(user, role);

  const systemInstruction = `You are "MRS SOLAR AI", the advanced intelligent copilot of MRS SOLAR — Tamil Nadu's premier On-Grid Rooftop Solar and Solar Loan platform.
Location: Thiruvallur / Chennai, Tamil Nadu, India. Contact Helpline: +91 80724 54996.

CORE COMPANY STANDARDS:
1. STRICT BATTERY-FREE ON-GRID SYSTEM: MRS SOLAR installs 100% On-Grid Rooftop Solar tied to the TNEB / TANGEDCO bi-directional net-meter. We DO NOT use batteries (no expensive replacement costs, no toxic lead/acid).
2. PM SURYA GHAR MUFT BIJLI YOJANA: Up to ₹78,000 direct DBT central government subsidy for 3 kWp systems (₹30,000 for 1kW, ₹60,000 for 2kW, ₹78,000 for 3kW+).
3. 10-YEAR REDUCING BALANCE LOAN: 120-month financing at 7% p.a. interest with zero prepayment penalty.
4. TNEB WHITE-METER TARIFF 1A: Free first 100 units; surplus solar generation is exported to the grid and credited against bi-monthly consumption.

USER CONTEXT:
${roleContext}

COMMUNICATION INSTRUCTIONS:
- Preferred language: ${language === 'ta' ? 'Tamil (தமிழ்)' : 'English'}. If Tamil, respond in natural, professional spoken Tamil.
- Maintain a helpful, technical, and respectful tone.
- If asked about financial status, quote the real data in the user context. Never invent financial transactions.
- Keep answers structured with bullet points and bold highlights for readability.`;

  try {
    const ai = await getGeminiClient();

    // Prepare contents
    const contents = [];

    // Include recent history (up to last 6 messages)
    if (Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-6)) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content || msg.text || '' }]
        });
      }
    }

    // User message parts
    const currentParts = [];
    if (imageAttachment) {
      const mime = imageAttachment.mimeType || 'image/jpeg';
      const b64 = cleanBase64(imageAttachment.base64 || imageAttachment.data);
      currentParts.push({
        inlineData: {
          mimeType: mime,
          data: b64
        }
      });
    }
    currentParts.push({ text: message });
    contents.push({ role: 'user', parts: currentParts });

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        temperature: 0.3,
        maxOutputTokens: 1200
      }
    });

    const reply = response.text ? response.text.trim() : 'I received your request. How else may I assist with your rooftop solar system?';
    const durationMs = Date.now() - startTime;

    await logAiUsage({
      endpoint: '/api/ai/chat',
      model,
      status: 'success',
      durationMs,
      userId: user?._id || user?.customerId || user?.employeeId,
      role
    });

    if (cacheKey) {
      responseCache.set(cacheKey, { reply, timestamp: Date.now() });
    }

    return {
      reply,
      source: `Google Gemini 2.5 Flash (${model})`,
      durationMs
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    console.error('[Gemini] Chat API error:', err.message);

    await logAiUsage({
      endpoint: '/api/ai/chat',
      model,
      status: 'error',
      error: err.message,
      durationMs,
      userId: user?._id,
      role
    });

    // Check for Free Tier 429 quota exhaustion
    if (err.message && (err.message.includes('429') || err.message.toLowerCase().includes('quota') || err.message.toLowerCase().includes('rate limit'))) {
      const friendlyMsg = language === 'ta'
        ? 'மன்னிக்கவும்! Google Gemini இலவச API பயன்பாட்டு வரம்பு (Free-Tier Limit) எட்டப்பட்டுள்ளது. தயவுசெய்து சில நொடிகள் கழித்து மீண்டும் முயற்சிக்கவும்.'
        : 'The Google Gemini 2.5 Flash Free-Tier rate limit has been reached for this minute. Please wait a few seconds and try again.';
      return { reply: friendlyMsg, isQuotaError: true, source: 'Rate Limiter' };
    }

    // Friendly configuration missing error
    if (err.message.includes('GEMINI_API_KEY')) {
      return {
        reply: language === 'ta'
          ? 'Google Gemini API Key இன்னும் கட்டமைக்கப்படவில்லை. தயவுசெய்து Admin Settings > AI Engine பக்கத்தில் API கீயை இணைக்கவும்.'
          : 'Google Gemini API Key is not yet configured. Please add your key in Settings > AI Engine or backend .env.',
        isKeyMissing: true
      };
    }

    throw err;
  }
}

/**
 * Specialized Multimodal Analysis with Structured JSON Output
 */
export async function analyzeImageWithGemini({ imageBase64, mimeType = 'image/jpeg', analysisType = 'GENERAL', customPrompt = '', user = null, role = null }) {
  const startTime = Date.now();
  const model = getModelId();
  const b64 = cleanBase64(imageBase64);

  if (!b64) {
    throw new Error('Image data (Base64) is required for analysis');
  }

  let prompt = '';
  let systemInstruction = 'You are a certified senior Solar Technical Inspection & Multimodal OCR engineer.';

  switch (analysisType.toUpperCase()) {
    case 'EB_BILL':
      systemInstruction += ' Specialize in Tamil Nadu Electricity Board (TNEB / TANGEDCO) domestic white-meter electricity bills.';
      prompt = `Examine this TNEB / Tamil Nadu Electricity Bill image carefully.
Extract and return a clean JSON object with these exact keys:
{
  "document_type": "EB_BILL",
  "consumer_number": "10 to 12 digit service number or format like 09-234-005-1234, or null if unreadable",
  "consumer_name": "Account holder name or null",
  "billing_period": "e.g. SEP-2026 to NOV-2026 or null",
  "units_consumed": 450 (integer number of units, or null),
  "bill_amount": 2500 (number in Rupees, or null),
  "due_date": "YYYY-MM-DD or readable string, or null",
  "tariff": "LT Tariff 1A (Domestic) or detected tariff",
  "recommended_solar_kw": 3 (suggested kWp based on bi-monthly units: >300 units = 3 kWp, >500 units = 5 kWp),
  "estimated_subsidy": 78000 (standard ₹78,000 for 3kWp+ under PM Surya Ghar),
  "confidence": "high" | "medium" | "low",
  "requires_manual_review": true | false
}
IMPORTANT: Do not invent missing data. Use null for unreadable fields. Output ONLY valid JSON.`;
      break;

    case 'SOLAR_PANEL':
      systemInstruction += ' Specialize in photovoltaic (PV) solar panel surface inspection and visual fault detection.';
      prompt = `Inspect the uploaded solar panel photograph for visual defects and condition.
Extract and return a clean JSON object with these exact keys:
{
  "document_type": "SOLAR_PANEL_INSPECTION",
  "condition": "Excellent" | "Good" | "Needs Cleaning" | "Damaged",
  "dirt_level": "None" | "Light Dust" | "Moderate Soiling" | "Heavy Dirt / Bird Droppings",
  "cracks_detected": false,
  "hotspots_or_burnmarks": false,
  "discoloration": false,
  "physical_structural_damage": "None" | "Frame Bend" | "Glass Microcrack" | "Cable Disconnection",
  "estimated_efficiency_loss_percentage": 5 (number between 0 and 100),
  "cleaning_recommended": true | false,
  "urgency": "Low" | "Medium" | "High",
  "recommendations": "Detailed step-by-step cleaning or maintenance advice for the owner/worker",
  "confidence": "high" | "medium" | "low",
  "requires_manual_review": true
}
IMPORTANT: Base findings only on visible evidence in the photograph. Output ONLY valid JSON.`;
      break;

    case 'INVERTER':
      systemInstruction += ' Specialize in solar grid-tie inverters (Growatt, Solis, Sungrow, Deye, Havells). Note that MRS SOLAR systems are STRICTLY ON-GRID BATTERY-FREE.';
      prompt = `Analyze this solar inverter photograph (front panel, display screen, or error LEDs).
Extract and return a clean JSON object with these exact keys:
{
  "document_type": "INVERTER_ANALYSIS",
  "detected_brand": "e.g. Growatt / Solis / GoodWe / Havells / Unknown",
  "model_series": "Detected model or null",
  "inverter_type": "On-Grid String Inverter (Battery-Free)",
  "display_readings": {
    "current_power_kw": 2.8 (or null if display unreadable),
    "total_energy_kwh": 1450.5 (or null),
    "grid_voltage_v": 230 (or null)
  },
  "led_status": "Normal Green" | "Fault Red" | "Standby Yellow" | "Display Off",
  "error_code_detected": "e.g. Error 102 / PV Isolation Low / Grid Lost or null",
  "error_description": "Clear plain-language explanation of what this error code or light means",
  "troubleshooting_steps": [
    "Step 1: Check AC MCB isolator switch on distribution board",
    "Step 2: Inspect DC rotatory switch beneath inverter",
    "Step 3: Verify TNEB grid power is active"
  ],
  "safety_advisory": "Do not open internal inverter casing. Contact MRS SOLAR service helpline at +91 80724 54996.",
  "confidence": "high" | "medium" | "low",
  "requires_manual_review": false
}
IMPORTANT: Output ONLY valid JSON.`;
      break;

    case 'INSTALLATION':
      systemInstruction += ' Specialize in rooftop solar QA/QC audit and 6-milestone project verification.';
      prompt = `Audit this solar rooftop installation photograph against professional engineering standards.
Extract and return a clean JSON object with these exact keys:
{
  "document_type": "INSTALLATION_VERIFICATION",
  "identified_equipment": [
    "Tier-1 Mono PERC Solar Panels",
    "Aluminium Mounting Structure / Rails",
    "Mid Clamps & End Clamps",
    "UV-resistant DC Solar Cables",
    "AC / DC Isolator Distribution Box"
  ],
  "milestone_stage_identified": "Stage 4: Rooftop Mounting Structure & Panel Installation",
  "structural_alignment": "Properly aligned south-facing" | "Irregular spacing" | "Needs adjustment",
  "cable_dressing_quality": "Neat with conduit/ties" | "Exposed/Loose wiring needs conduit",
  "safety_compliance": "Good" | "Needs Earthing Ground Inspection",
  "missing_photographic_evidence": [
    "Bi-directional TNEB Net-Meter photo needed for Stage 5",
    "Earthing lightning arrestor spike photo needed"
  ],
  "manager_review_verdict": "Verified - Ready for Next Stage" | "Revisions Required",
  "manager_notes": "Summary of observations for the installation team",
  "confidence": "high" | "medium" | "low",
  "requires_manual_review": true
}
IMPORTANT: Output ONLY valid JSON.`;
      break;

    case 'DOCUMENT':
      systemInstruction += ' Specialize in solar invoices, warranty certificates, and serial number capture.';
      prompt = `Read this solar warranty card, purchase invoice, or component serial number label.
Extract and return a clean JSON object with these exact keys:
{
  "document_type": "SOLAR_DOCUMENT",
  "document_category": "Warranty Card" | "Tax Invoice" | "Serial Number Label" | "Sanction Letter",
  "invoice_or_ref_number": "Reference number or null",
  "customer_name": "Full name or null",
  "date_of_issue": "YYYY-MM-DD or null",
  "system_capacity_kw": 3 (or null),
  "total_amount": 195000 (or null),
  "subsidy_amount": 78000 (or null),
  "solar_panel_make": "e.g. Waaree / Tata Power / Vikram Solar or null",
  "panel_serial_numbers": ["SN1029384", "SN1029385"],
  "inverter_serial_number": "INV987654 or null",
  "warranty_period_years": 25 (panel performance warranty),
  "confidence": "high" | "medium" | "low",
  "requires_manual_review": true
}
IMPORTANT: Output ONLY valid JSON.`;
      break;

    default:
      prompt = `Analyze this image in the context of rooftop solar, equipment, documents, or electricity billing.
${customPrompt ? `Specific focus: ${customPrompt}` : ''}
Extract and return a clean JSON object with:
{
  "document_type": "GENERAL_ANALYSIS",
  "detected_category": "Equipment" | "Rooftop" | "Meter" | "Document",
  "summary": "Clear description of what is visible",
  "key_findings": ["Finding 1", "Finding 2"],
  "technical_details": {},
  "confidence": "high" | "medium" | "low",
  "requires_manual_review": false
}
Output ONLY valid JSON.`;
  }

  try {
    const ai = await getGeminiClient();

    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: b64
              }
            }
          ]
        }
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    });

    const rawText = response.text ? response.text.trim() : '{}';
    const cleaned = rawText.replace(/```json\s*/i, '').replace(/```\s*$/i, '').trim();
    let parsedData = {};
    try {
      parsedData = JSON.parse(cleaned);
    } catch (parseErr) {
      console.warn('[Gemini] JSON parse fallback on raw output:', parseErr.message);
      parsedData = { document_type: analysisType, raw_summary: rawText, confidence: 'medium', requires_manual_review: true };
    }

    const durationMs = Date.now() - startTime;

    // Save analysis record in database
    const analysisRecord = await db.create('ai_image_analyses', {
      analysisType,
      model,
      extractedData: parsedData,
      confidence: parsedData.confidence || 'medium',
      requiresManualReview: parsedData.requires_manual_review ?? true,
      status: parsedData.requires_manual_review ? 'Pending Review' : 'Verified',
      userId: user?._id || user?.customerId || user?.employeeId,
      userRole: role,
      durationMs,
      createdAt: new Date().toISOString()
    });

    await logAiUsage({
      endpoint: `/api/ai/analyze-${analysisType.toLowerCase().replace('_', '-')}`,
      model,
      status: 'success',
      durationMs,
      userId: user?._id,
      role
    });

    return {
      success: true,
      analysisId: analysisRecord._id,
      analysisType,
      model: `Gemini 2.5 Flash (${model})`,
      durationMs,
      data: parsedData
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    console.error(`[Gemini] Analysis ${analysisType} error:`, err.message);

    await logAiUsage({
      endpoint: `/api/ai/analyze-${analysisType.toLowerCase().replace('_', '-')}`,
      model,
      status: 'error',
      error: err.message,
      durationMs,
      userId: user?._id,
      role
    });

    if (err.message && (err.message.includes('429') || err.message.toLowerCase().includes('quota'))) {
      throw new Error('Gemini 2.5 Flash Free Tier quota limit reached. Please wait a minute before analyzing another image.');
    }
    throw err;
  }
}
