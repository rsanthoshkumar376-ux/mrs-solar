import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// ─── Ensure Local Data Dirs ──────────────────────────────────────────────────
async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  await fs.mkdir(path.join(DATA_DIR, 'uploads'), { recursive: true });
}

// Write queue for local JSON file fallback
const writeQueues = {};

// ─── Local JSON Database Engine (Fallback) ──────────────────────────────────
class JsonDatabaseEngine {
  getFilePath(collection) {
    return path.join(DATA_DIR, `${collection}.json`);
  }

  async readCollection(collection) {
    await ensureDirs();
    const filePath = this.getFilePath(collection);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      console.error(`Error reading collection ${collection}:`, error);
      return [];
    }
  }

  async writeCollection(collection, data) {
    await ensureDirs();
    const filePath = this.getFilePath(collection);
    
    if (!writeQueues[collection]) {
      writeQueues[collection] = Promise.resolve();
    }

    const writePromise = writeQueues[collection].then(async () => {
      const tempPath = `${filePath}.tmp`;
      try {
        await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
        await fs.rename(tempPath, filePath);
      } catch (err) {
        console.error(`Error writing collection ${collection}:`, err);
        try { await fs.unlink(tempPath); } catch {}
      }
    });

    writeQueues[collection] = writePromise.catch(() => {});
    return writePromise;
  }

  async find(collection, query = {}) {
    const data = await this.readCollection(collection);
    return data.filter(item => this.matchQuery(item, query));
  }

  async findOne(collection, query = {}) {
    const data = await this.readCollection(collection);
    return data.find(item => this.matchQuery(item, query)) || null;
  }

  async create(collection, record) {
    const data = await this.readCollection(collection);
    const newRecord = {
      _id: record._id || this.generateId(collection),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...record
    };
    data.push(newRecord);
    await this.writeCollection(collection, data);
    return newRecord;
  }

  async updateOne(collection, query, updateData) {
    const data = await this.readCollection(collection);
    const index = data.findIndex(item => this.matchQuery(item, query));
    if (index === -1) return null;

    const cleanUpdate = { ...updateData };
    delete cleanUpdate._id;
    delete cleanUpdate.createdAt;

    data[index] = {
      ...data[index],
      ...cleanUpdate,
      updatedAt: new Date().toISOString()
    };

    await this.writeCollection(collection, data);
    return data[index];
  }

  async updateMany(collection, query, updateData) {
    const data = await this.readCollection(collection);
    let count = 0;
    
    const cleanUpdate = { ...updateData };
    delete cleanUpdate._id;
    delete cleanUpdate.createdAt;

    const updatedData = data.map(item => {
      if (this.matchQuery(item, query)) {
        count++;
        return {
          ...item,
          ...cleanUpdate,
          updatedAt: new Date().toISOString()
        };
      }
      return item;
    });

    if (count > 0) {
      await this.writeCollection(collection, updatedData);
    }
    return { modifiedCount: count };
  }

  async deleteOne(collection, query) {
    const data = await this.readCollection(collection);
    const index = data.findIndex(item => this.matchQuery(item, query));
    if (index === -1) return { deletedCount: 0 };

    data.splice(index, 1);
    await this.writeCollection(collection, data);
    return { deletedCount: 1 };
  }

  generateId(collection) {
    const prefix = collection.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${timestamp}-${random}`;
  }

  matchQuery(item, query) {
    for (const key in query) {
      if (query[key] && typeof query[key] === 'object' && !Array.isArray(query[key])) {
        if (JSON.stringify(item[key]) !== JSON.stringify(query[key])) return false;
      } else {
        if (item[key] !== query[key]) return false;
      }
    }
    return true;
  }
}

const jsonDb = new JsonDatabaseEngine();

// ─── Mongoose Model Cache ───────────────────────────────────────────────────
function getModel(name) {
  if (mongoose.models[name]) return mongoose.models[name];
  const schema = new mongoose.Schema(
    { _id: { type: String, required: true } },
    { strict: false, timestamps: true, collection: name }
  );
  return mongoose.model(name, schema);
}

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

// ─── Hybrid Database Adapter ────────────────────────────────────────────────
class HybridDatabase {
  async find(collection, query = {}) {
    if (isMongoConnected()) {
      try {
        const Model = getModel(collection);
        return await Model.find(query).lean();
      } catch (err) {
        console.error(`MongoDB find error on ${collection}, falling back to local DB:`, err.message);
      }
    }
    return jsonDb.find(collection, query);
  }

  async findOne(collection, query = {}) {
    if (isMongoConnected()) {
      try {
        const Model = getModel(collection);
        const doc = await Model.findOne(query).lean();
        return doc || null;
      } catch (err) {
        console.error(`MongoDB findOne error on ${collection}, falling back:`, err.message);
      }
    }
    return jsonDb.findOne(collection, query);
  }

  async create(collection, record) {
    const id = record._id || jsonDb.generateId(collection);
    const newRecord = { _id: id, ...record };

    if (isMongoConnected()) {
      try {
        const Model = getModel(collection);
        const doc = new Model(newRecord);
        await doc.save();
        // Also sync local for fallback continuity
        await jsonDb.create(collection, newRecord).catch(() => {});
        return doc.toObject({ versionKey: false });
      } catch (err) {
        console.error(`MongoDB create error on ${collection}, falling back:`, err.message);
      }
    }
    return jsonDb.create(collection, newRecord);
  }

  async updateOne(collection, query, updateData) {
    const cleanUpdate = { ...updateData };
    delete cleanUpdate.__v;

    if (isMongoConnected()) {
      try {
        const Model = getModel(collection);
        const doc = await Model.findOneAndUpdate(
          query,
          { $set: cleanUpdate },
          { new: true, upsert: false, strict: false }
        ).lean();
        await jsonDb.updateOne(collection, query, updateData).catch(() => {});
        if (doc) return doc;
      } catch (err) {
        console.error(`MongoDB updateOne error on ${collection}, falling back:`, err.message);
      }
    }
    return jsonDb.updateOne(collection, query, updateData);
  }

  async updateMany(collection, query, updateData) {
    const cleanUpdate = { ...updateData };
    delete cleanUpdate._id;
    delete cleanUpdate.__v;

    if (isMongoConnected()) {
      try {
        const Model = getModel(collection);
        const result = await Model.updateMany(query, { $set: cleanUpdate }, { strict: false });
        await jsonDb.updateMany(collection, query, updateData).catch(() => {});
        return { modifiedCount: result.modifiedCount };
      } catch (err) {
        console.error(`MongoDB updateMany error on ${collection}, falling back:`, err.message);
      }
    }
    return jsonDb.updateMany(collection, query, updateData);
  }

  async deleteOne(collection, query) {
    if (isMongoConnected()) {
      try {
        const Model = getModel(collection);
        const result = await Model.deleteOne(query);
        await jsonDb.deleteOne(collection, query).catch(() => {});
        return { deletedCount: result.deletedCount };
      } catch (err) {
        console.error(`MongoDB deleteOne error on ${collection}, falling back:`, err.message);
      }
    }
    return jsonDb.deleteOne(collection, query);
  }

  async backup() {
    await ensureDirs();
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
    await ensureDirs();
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
      await fs.access(backupPath);
    }

    for (const col of collections) {
      const backupPath = path.join(backupSubdir, `${col}.json`);
      const raw = await fs.readFile(backupPath, 'utf-8');
      const records = JSON.parse(raw);

      if (isMongoConnected()) {
        const Model = getModel(col);
        await Model.deleteMany({});
        if (records.length > 0) {
          await Model.insertMany(records, { ordered: false, strict: false });
        }
      }
      await jsonDb.writeCollection(col, records);
    }

    return { restored: true };
  }
}

// ─── Non-Blocking MongoDB Connection ───────────────────────────────────────
export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('⚠️ MONGODB_URI not found. Running with local JSON database fallback.');
    return false;
  }

  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    await mongoose.connect(uri, {
      dbName: 'mrs-solar',
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ Successfully connected to MongoDB Atlas (mrs-solar database)!');
    return true;
  } catch (err) {
    console.error('❌ MongoDB Atlas connection failed:', err.message);
    console.warn('⚠️ Server will operate using local JSON DB fallback so website stays online.');
    return false;
  }
}

export const db = new HybridDatabase();
