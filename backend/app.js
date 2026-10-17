import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import syncFs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import dns from 'dns';

// Enforce IPv4 first to prevent ENETUNREACH errors on cloud hosting
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

// Import local modules
import { db, connectDB } from './database/db.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import customerRoutes from './routes/customer.js';
import cronRoutes from './routes/cron.js';
import aiRoutes from './routes/ai.js';
import { runDailyInterestAndPenaltyCheck } from './utils/scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

export const app = express();

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Lazy DB Connection Middleware (Guarantees connection for Serverless / Vercel)
let isConnected = false;
app.use(async (req, res, next) => {
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
    } catch (err) {
      console.warn('DB lazy connection note:', err.message);
    }
  }
  next();
});

// Serve Uploaded Files
const uploadsPath = path.join(__dirname, 'data', 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/ai', aiRoutes);

// Serve Frontend Static Production Build
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');

// Serve Service Worker with no-cache and root scope allowed
app.get('/sw.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.join(frontendDistPath, 'sw.js'));
});

app.use(express.static(frontendDistPath));

// Direct Android APK Download Endpoint
app.get(['/api/download-apk', '/MRS-SOLAR.apk', '/download/apk'], (req, res) => {
  const possiblePaths = [
    path.join(frontendDistPath, 'MRS-SOLAR.apk'),
    path.join(__dirname, '..', 'frontend', 'public', 'MRS-SOLAR.apk'),
    path.join(__dirname, 'test_download.apk')
  ];
  for (const apkPath of possiblePaths) {
    if (syncFs.existsSync(apkPath)) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="MRS-SOLAR.apk"');
      return res.sendFile(path.resolve(apkPath));
    }
  }
  res.redirect('https://github.com/rsanthoshkumar376-ux/mrs-solar/releases/download/app-release/MRS-SOLAR.apk');
});

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MRS SOLAR Solar Panel Loan API is running' });
});

// App Version & Update Info Endpoint
app.get('/api/version', (req, res) => {
  res.json({
    version: '1.4.0',
    buildNumber: 140,
    releaseDate: '2026-10-11',
    apkDownloadUrl: '/api/download-apk',
    cloudMirrorUrl: 'https://github.com/rsanthoshkumar376-ux/mrs-solar/releases/download/app-release/MRS-SOLAR.apk',
    changelog: [
      'Admin UPI Settings: Configure & dynamically select active payment UPI',
      'Dynamic Customer Quick Pay QR Code with 1-Tap GPay / PhonePe / Paytm',
      'Customer record editing (Personal, Bank, Solar specs)',
      '12-digit UPI UTR payment verification & receipts',
      'Automated Bank CSV Statement Reconciler'
    ]
  });
});

// SPA Fallback for Client-Side Routing (React Router)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    if (req.path.includes('/assets/') || /\.(js|css|png|jpg|jpeg|gif|svg|ico|json|woff|woff2|ttf|map)$/i.test(req.path)) {
      const fileName = path.basename(req.path);
      const assetPath = path.join(frontendDistPath, 'assets', fileName);
      return res.sendFile(assetPath, (err) => {
        if (err) {
          res.status(404).json({ message: 'Static asset not found' });
        }
      });
    }

    const indexPath = path.join(frontendDistPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        res.status(200).send('<h1>MRS SOLAR Server is Running!</h1><p>Frontend is currently initializing.</p>');
      }
    });
  } else {
    res.status(404).json({ message: 'Resource Not Found' });
  }
});

// Seed Initial Admin User
export async function seedAdmin() {
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
        }
      }
    }
  } catch (error) {
    console.error('Failed to seed admin user:', error);
  }
}

export { connectDB, db, uploadsPath, frontendDistPath };
export default app;
