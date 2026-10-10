import express from 'express';
import { db } from '../database/db.js';
import { runDailyInterestAndPenaltyCheck, getISTDateString } from '../utils/scheduler.js';

const router = express.Router();

/**
 * Authentication Middleware for protected external Cron triggers.
 * Verifies secret against CRON_SECRET environment variable.
 * Accepts secret via:
 * 1. Header: 'x-cron-secret: <secret>'
 * 2. Header: 'Authorization: Bearer <secret>'
 * 3. Query string: '?secret=<secret>' or '?token=<secret>'
 * 4. Request Body: '{ "secret": "<secret>" }'
 */
export function verifyCronAuth(req, res, next) {
  const configuredSecret = process.env.CRON_SECRET || 'mrs_solar_midnight_cron_secret_2026';

  const headerSecret = req.headers['x-cron-secret'];

  let bearerSecret = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    bearerSecret = authHeader.substring(7).trim();
  }

  const querySecret = req.query.secret || req.query.token;
  const bodySecret = req.body?.secret || req.body?.token;

  const providedSecret = headerSecret || bearerSecret || querySecret || bodySecret;

  if (!providedSecret || providedSecret !== configuredSecret) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or missing cron secret. Please pass via x-cron-secret header, Bearer token, or ?secret= query parameter.'
    });
  }

  next();
}

/**
 * Public ping endpoint — wakes Render up from sleep or responds to health checks.
 */
router.get('/ping', (req, res) => {
  res.json({
    status: 'awake',
    message: 'MRS SOLAR Cron Endpoint is awake and healthy',
    serverTimeUTC: new Date().toISOString(),
    istDate: getISTDateString(new Date())
  });
});

/**
 * Handler for Midnight Audit Execution.
 * Supports both POST and GET to accommodate simple webhooks and external services.
 */
async function handleMidnightAudit(req, res) {
  try {
    const force = req.query.force === 'true' || req.body?.force === true;
    const targetDate = req.query.date || req.body?.date 
      ? new Date(req.query.date || req.body?.date) 
      : new Date();

    const clientSource = req.query.source || req.body?.source || req.headers['user-agent'] || 'external-trigger';
    const triggeredBy = `external:${clientSource}`;

    console.log(`[Cron API] /midnight-audit triggered by ${triggeredBy} (force=${force})`);

    const result = await runDailyInterestAndPenaltyCheck(targetDate, {
      force,
      triggeredBy
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('[Cron API] Midnight audit failed:', error);
    res.status(500).json({
      success: false,
      error: 'Audit execution failed',
      message: error.message
    });
  }
}

// Register both POST and GET for maximum compatibility with free cron providers (cron-job.org, EasyCron, curl)
router.post('/midnight-audit', verifyCronAuth, handleMidnightAudit);
router.get('/midnight-audit', verifyCronAuth, handleMidnightAudit);

/**
 * Audit history endpoint — returns previous audit runs and their execution metrics.
 */
router.get('/history', verifyCronAuth, async (req, res) => {
  try {
    const runs = await db.find('audit_runs');
    runs.sort((a, b) => new Date(b.startedAt || b.createdAt || 0) - new Date(a.startedAt || a.createdAt || 0));
    res.json({
      success: true,
      totalRuns: runs.length,
      recentRuns: runs.slice(0, 30)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
