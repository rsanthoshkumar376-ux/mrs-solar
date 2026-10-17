import cron from 'node-cron';
import fs from 'fs/promises';
import app, { connectDB, seedAdmin, uploadsPath } from './app.js';
import { runDailyInterestAndPenaltyCheck } from './utils/scheduler.js';

const PORT = process.env.PORT || 5000;

// Scheduler — Runs at 9:00 AM IST (03:30 UTC) every day
// Sends due-date emails and updates loan statuses/penalties
cron.schedule('30 3 * * *', async () => {
  try {
    console.log('[Cron] Running morning 9 AM IST daily check — sending due-date emails...');
    await runDailyInterestAndPenaltyCheck(new Date());
  } catch (err) {
    console.error('[Cron] Error running morning daily audit:', err);
  }
});

// Also run at midnight UTC (5:30 AM IST) for penalty updates
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('[Cron] Running midnight UTC penalty and status update...');
    await runDailyInterestAndPenaltyCheck(new Date());
  } catch (err) {
    console.error('[Cron] Error running midnight audit:', err);
  }
});

// Start Server — listen on port immediately for Render / local dev, then connect to database
async function startServer() {
  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`[Server] MRS SOLAR backend listening on port ${PORT}`);
    
    // Connect to database (MySQL / Mongo)
    await connectDB();
    await seedAdmin();

    // Make sure upload folders exist
    try {
      await fs.mkdir(uploadsPath, { recursive: true });
    } catch (err) {
      console.error('Failed to create uploads directory:', err);
    }

    // Public HTTPS Keep-Alive Ping (Resets cloud edge proxy inactivity timers)
    setInterval(() => {
      try {
        import('https').then(({ default: https }) => {
          ['https://mrs-solar-yj6e.vercel.app/api/health'].forEach(url => {
            https.get(url, () => {}).on('error', () => {});
          });
        });
      } catch (e) {}
    }, 3 * 60 * 1000); // every 3 minutes
  });
}

// Only start listening if run directly (not in Vercel serverless)
if (!process.env.VERCEL) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
  });
}

export default app;
