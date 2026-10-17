import app, { connectDB, seedAdmin } from '../backend/app.js';

let isConnected = false;

export default async function handler(req, res) {
  if (!isConnected) {
    try {
      await connectDB();
      await seedAdmin().catch(() => {});
      isConnected = true;
    } catch (err) {
      console.warn('Vercel serverless DB connect notice:', err.message);
    }
  }
  return app(req, res);
}
