import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// ─── Mongoose Schemas ───────────────────────────────────────────────────────

// Generic flexible schema for all collections — uses strict:false so any field can be stored
function makeModel(name) {
  if (mongoose.models[name]) return mongoose.models[name];
  const schema = new mongoose.Schema(
    {
      _id: { type: String, required: true }
    },
    {
      strict: false,        // allow any fields
      timestamps: true,     // auto createdAt / updatedAt
      collection: name      // map to correct MongoDB collection name
    }
  );
  return mongoose.model(name, schema);
}

// ─── ID Generator ──────────────────────────────────────────────────────────

function generateId(collection) {
  const prefix = collection.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${timestamp}-${random}`;
}

// ─── Query Matcher (for in-memory fallback & filtering) ────────────────────

function matchQuery(item, query) {
  for (const key in query) {
    if (query[key] && typeof query[key] === 'object' && !Array.isArray(query[key])) {
      if (JSON.stringify(item[key]) !== JSON.stringify(query[key])) return false;
    } else {
      if (item[key] !== query[key]) return false;
    }
  }
  return true;
}

// Convert a Mongoose document to a plain object compatible with legacy code
function toPlain(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject({ versionKey: false }) : { ...doc };
  return obj;
}

// ─── MongoDB Database Adapter ───────────────────────────────────────────────

class MongoDatabase {

  // Find multiple records matching query
  async find(collection, query = {}) {
    const Model = makeModel(collection);
    const docs = await Model.find(query).lean();
    return docs;
  }

  // Find single record matching query
  async findOne(collection, query = {}) {
    const Model = makeModel(collection);
    const doc = await Model.findOne(query).lean();
    return doc || null;
  }

  // Insert a new record
  async create(collection, record) {
    const Model = makeModel(collection);
    const newRecord = {
      _id: record._id || generateId(collection),
      ...record
    };
    const doc = new Model(newRecord);
    await doc.save();
    return doc.toObject({ versionKey: false });
  }

  // Update a single record matching query
  async updateOne(collection, query, updateData) {
    const Model = makeModel(collection);
    const cleanUpdate = { ...updateData };
    delete cleanUpdate.__v;

    const doc = await Model.findOneAndUpdate(
      query,
      { $set: cleanUpdate },
      { new: true, upsert: false, strict: false }
    ).lean();
    return doc || null;
  }

  // Update multiple records matching query
  async updateMany(collection, query, updateData) {
    const Model = makeModel(collection);
    const cleanUpdate = { ...updateData };
    delete cleanUpdate._id;
    delete cleanUpdate.__v;

    const result = await Model.updateMany(
      query,
      { $set: cleanUpdate },
      { strict: false }
    );
    return { modifiedCount: result.modifiedCount };
  }

  // Delete a single record matching query
  async deleteOne(collection, query) {
    const Model = makeModel(collection);
    const result = await Model.deleteOne(query);
    return { deletedCount: result.deletedCount };
  }

  // ─── Backup / Restore ────────────────────────────────────────────────────

  async backup() {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const collections = ['users', 'customers', 'payments', 'audit_logs', 'notifications'];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupSubdir = path.join(BACKUP_DIR, `backup-${timestamp}`);
    await fs.mkdir(backupSubdir, { recursive: true });

    for (const col of collections) {
      try {
        const data = await this.find(col);
        await fs.writeFile(
          path.join(backupSubdir, `${col}.json`),
          JSON.stringify(data, null, 2),
          'utf-8'
        );
      } catch {
        await fs.writeFile(path.join(backupSubdir, `${col}.json`), '[]', 'utf-8');
      }
    }

    return { backupName: `backup-${timestamp}`, timestamp };
  }

  async listBackups() {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    try {
      const dirs = await fs.readdir(BACKUP_DIR);
      return dirs.filter(name => name.startsWith('backup-'));
    } catch {
      return [];
    }
  }

  async restore(backupName) {
    const collections = ['users', 'customers', 'payments', 'audit_logs', 'notifications'];
    const backupSubdir = path.join(BACKUP_DIR, backupName);

    for (const col of collections) {
      const backupPath = path.join(backupSubdir, `${col}.json`);
      await fs.access(backupPath); // throws if missing
    }

    for (const col of collections) {
      const backupPath = path.join(backupSubdir, `${col}.json`);
      const raw = await fs.readFile(backupPath, 'utf-8');
      const records = JSON.parse(raw);

      const Model = makeModel(col);
      await Model.deleteMany({});
      if (records.length > 0) {
        await Model.insertMany(records, { ordered: false, strict: false });
      }
    }

    return { restored: true };
  }
}

// ─── Connect to MongoDB ─────────────────────────────────────────────────────

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI environment variable is not set!');
    console.error('   Please add MONGODB_URI to your Render environment variables.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      dbName: 'mrs-solar',
      serverSelectionTimeoutMS: 10000
    });
    console.log('✅ Connected to MongoDB Atlas (mrs-solar database)');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

export const db = new MongoDatabase();
