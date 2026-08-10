import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import cron from 'node-cron';
import dotenv from 'dotenv';

// Import local modules
import { db } from './database/db.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import customerRoutes from './routes/customer.js';
import { runDailyInterestAndPenaltyCheck } from './utils/scheduler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*', // For development accessibility
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploaded Files
const uploadsPath = path.join(__dirname, 'data', 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/customer', customerRoutes);

// Serve Frontend Static Production Build
// Works both locally (backend/server.js) and on Render (node backend/server.js from root)
const frontendDistPath = path.resolve(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDistPath));

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({ message: 'MRS SOLAR Solar Panel Loan API is running' });
});

// SPA Fallback for Client-Side Routing (React Router)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  } else {
    res.status(404).json({ message: 'Resource Not Found' });
  }
});

// Seed Initial Admin User
async function seedAdmin() {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('2332', salt);

    const adminUser = await db.findOne('users', { role: 'admin' });
    if (!adminUser) {
      console.log('Seeding initial owner/admin account...');
      await db.create('users', {
        username: 'MRSassociates',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('Owner account seeded: MRSassociates / 2332');
    } else {
      await db.updateOne('users', { _id: adminUser._id }, { username: 'MRSassociates', password: hashedPassword });
      console.log('Owner account updated: MRSassociates / 2332');
    }

    // Sync existing customer passwords to their mobile numbers and username to full name
    const customers = await db.find('customers');
    for (const c of customers) {
      if (c.mobileNumber) {
        const cSalt = await bcrypt.genSalt(10);
        const cHash = await bcrypt.hash(String(c.mobileNumber).trim(), cSalt);
        const userAcc = await db.findOne('users', { customerId: c.customerId });
        if (userAcc) {
          await db.updateOne('users', { _id: userAcc._id }, { 
            username: c.fullName ? c.fullName.trim() : c.customerId,
            password: cHash 
          });
          console.log(`Synced user login for customer ${c.fullName} (${c.customerId}) with password: ${c.mobileNumber}`);
        }
      }
    }
  } catch (error) {
    console.error('Failed to seed admin user:', error);
  }
}

// Scheduler Setup
// Run every midnight (00:00:00) to update loan statuses & penalties
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('[Cron] Running daily midnight audit and late penalty checker...');
    await runDailyInterestAndPenaltyCheck(new Date());
  } catch (err) {
    console.error('[Cron] Error running daily audit:', err);
  }
});

// Start Server
app.listen(PORT, async () => {
  console.log(`[Server] MRS SOLAR backend listening on http://localhost:${PORT}`);
  await seedAdmin();
  
  // Make sure upload folders exist
  try {
    await fs.mkdir(uploadsPath, { recursive: true });
  } catch (err) {
    console.error('Failed to create uploads directory:', err);
  }
});
