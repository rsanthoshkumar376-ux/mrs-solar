import { db } from '../database/db.js';

export const DEFAULT_AI_CONFIG = {
  key: 'ai',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  defaultModel: 'gemini-1.5-flash',
  enabledFeatures: {
    kycScanner: true,
    chatCopilot: true,
    solarDiagnostics: true
  },
  updatedAt: new Date().toISOString()
};

/**
 * Retrieves the AI settings document from database, falling back to process.env
 */
export async function getAiConfig() {
  try {
    let config = await db.findOne('settings', { key: 'ai' });
    if (!config) {
      config = await db.create('settings', { ...DEFAULT_AI_CONFIG });
    }
    // Fallback to environment variable if database key is empty
    if (!config.geminiApiKey && process.env.GEMINI_API_KEY) {
      config.geminiApiKey = process.env.GEMINI_API_KEY;
    }
    return config;
  } catch (err) {
    console.error('Error fetching AI config:', err);
    return { ...DEFAULT_AI_CONFIG };
  }
}

/**
 * Saves AI configuration
 */
export async function saveAiConfig(newConfig) {
  const existing = await getAiConfig();
  const updated = {
    ...existing,
    geminiApiKey: (newConfig.geminiApiKey ?? existing.geminiApiKey ?? '').trim(),
    defaultModel: newConfig.defaultModel || existing.defaultModel || 'gemini-1.5-flash',
    enabledFeatures: {
      ...existing.enabledFeatures,
      ...(newConfig.enabledFeatures || {})
    },
    updatedAt: new Date().toISOString()
  };

  if (existing._id) {
    await db.updateOne('settings', { _id: existing._id }, updated);
  } else {
    await db.create('settings', updated);
  }

  return updated;
}

/**
 * Direct call to Google Gemini API (gemini-1.5-flash or gemini-2.0-flash)
 * Uses native Node 18+ fetch without external npm dependencies.
 */
export async function callGeminiApi({
  apiKey,
  model = 'gemini-1.5-flash',
  prompt,
  systemInstruction,
  imageBase64,
  mimeType = 'image/jpeg',
  responseSchema,
  temperature = 0.2,
  maxOutputTokens = 1000
}) {
  const keyToUse = (apiKey || process.env.GEMINI_API_KEY || '').trim();
  if (!keyToUse) {
    throw new Error('Google Gemini API Key is not configured. Please add your key in Settings > AI Engine.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(keyToUse)}`;

  const contents = [];
  const parts = [];

  if (imageBase64) {
    // Strip data URL header if present (e.g. data:image/jpeg;base64,...)
    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    parts.push({
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: cleanBase64
      }
    });
  }

  if (prompt) {
    parts.push({ text: prompt });
  }

  contents.push({ role: 'user', parts });

  const requestBody = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens
    }
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  if (responseSchema) {
    requestBody.generationConfig.responseMimeType = 'application/json';
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const errMsg = data.error?.message || `Gemini API returned status ${response.status}`;
    console.error('Gemini API Error:', errMsg);
    throw new Error(errMsg);
  }

  const candidate = data.candidates?.[0];
  const responseText = candidate?.content?.parts?.[0]?.text || '';
  return responseText;
}
