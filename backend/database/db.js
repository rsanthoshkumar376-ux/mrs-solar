import mongoose from 'mongoose';
import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

// Ensure reliable DNS resolution for cloud SRV/host queries
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  console.warn('Could not set custom DNS servers:', e.message);
}

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

function matchQuery(item, query) {
  if (!item) return false;
  for (const key in query) {
    if (query[key] && typeof query[key] === 'object' && !Array.isArray(query[key])) {
      if (JSON.stringify(item[key]) !== JSON.stringify(query[key])) return false;
    } else {
      if (item[key] !== query[key]) return false;
    }
  }
  return true;
}

function generateId(collection) {
  const prefix = collection.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${timestamp}-${random}`;
}

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
    return data.filter(item => matchQuery(item, query));
  }

  async findOne(collection, query = {}) {
    const data = await this.readCollection(collection);
    return data.find(item => matchQuery(item, query)) || null;
  }

  async create(collection, record) {
    const data = await this.readCollection(collection);
    const newRecord = {
      _id: record._id || generateId(collection),
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
    const index = data.findIndex(item => matchQuery(item, query));
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
      if (matchQuery(item, query)) {
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
    const index = data.findIndex(item => matchQuery(item, query));
    if (index === -1) return { deletedCount: 0 };

    data.splice(index, 1);
    await this.writeCollection(collection, data);
    return { deletedCount: 1 };
  }
}

const jsonDb = new JsonDatabaseEngine();

// ─── MySQL Engine ───────────────────────────────────────────────────────────
let mysqlPool = null;

function isMySQLConnected() {
  return mysqlPool !== null;
}

async function initMySQLTables() {
  if (!mysqlPool) return;
  const collections = ['users', 'customers', 'payments', 'audit_logs', 'notifications'];
  for (const col of collections) {
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS mrs_${col} (
        id VARCHAR(120) PRIMARY KEY,
        data JSON NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }
}

class MySQLDatabaseEngine {
  async find(collection, query = {}) {
    try {
      const [rows] = await mysqlPool.query(`SELECT data FROM mrs_${collection}`);
      const items = rows.map(r => typeof r.data === 'string' ? JSON.parse(r.data) : r.data);
      return items.filter(item => matchQuery(item, query));
    } catch (err) {
      console.error(`MySQL find error on ${collection}:`, err.message);
      return jsonDb.find(collection, query);
    }
  }

  async findOne(collection, query = {}) {
    const items = await this.find(collection, query);
    return items.length > 0 ? items[0] : null;
  }

  async create(collection, record) {
    const id = record._id || generateId(collection);
    const newRecord = {
      _id: id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...record
    };
    try {
      await mysqlPool.query(
        `INSERT INTO mrs_${collection} (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)`,
        [id, JSON.stringify(newRecord)]
      );
      await jsonDb.create(collection, newRecord).catch(() => {});
      return newRecord;
    } catch (err) {
      console.error(`MySQL create error on ${collection}:`, err.message);
      return jsonDb.create(collection, newRecord);
    }
  }

  async updateOne(collection, query, updateData) {
    try {
      const existing = await this.findOne(collection, query);
      if (!existing) return null;

      const cleanUpdate = { ...updateData };
      delete cleanUpdate._id;
      delete cleanUpdate.createdAt;

      const updated = {
        ...existing,
        ...cleanUpdate,
        updatedAt: new Date().toISOString()
      };

      await mysqlPool.query(
        `UPDATE mrs_${collection} SET data = ? WHERE id = ?`,
        [JSON.stringify(updated), existing._id]
      );
      await jsonDb.updateOne(collection, query, updateData).catch(() => {});
      return updated;
    } catch (err) {
      console.error(`MySQL updateOne error on ${collection}:`, err.message);
      return jsonDb.updateOne(collection, query, updateData);
    }
  }

  async updateMany(collection, query, updateData) {
    const items = await this.find(collection, query);
    let count = 0;
    for (const item of items) {
      await this.updateOne(collection, { _id: item._id }, updateData);
      count++;
    }
    return { modifiedCount: count };
  }

  async deleteOne(collection, query) {
    try {
      const existing = await this.findOne(collection, query);
      if (!existing) return { deletedCount: 0 };

      const [res] = await mysqlPool.query(
        `DELETE FROM mrs_${collection} WHERE id = ?`,
        [existing._id]
      );
      await jsonDb.deleteOne(collection, query).catch(() => {});
      return { deletedCount: res.affectedRows };
    } catch (err) {
      console.error(`MySQL deleteOne error on ${collection}:`, err.message);
      return jsonDb.deleteOne(collection, query);
    }
  }
}

const mysqlDb = new MySQLDatabaseEngine();

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

// ─── Multi-Database Unified Adapter ─────────────────────────────────────────
class UnifiedDatabase {
  getEngine() {
    if (isMySQLConnected()) return mysqlDb;
    if (isMongoConnected()) return null; // handled via mongoose
    return jsonDb;
  }

  async find(collection, query = {}) {
    if (isMySQLConnected()) return mysqlDb.find(collection, query);
    if (isMongoConnected()) {
      try {
        const Model = getModel(collection);
        return await Model.find(query).lean();
      } catch (err) {
        console.error(`MongoDB find error on ${collection}:`, err.message);
      }
    }
    return jsonDb.find(collection, query);
  }

  async findOne(collection, query = {}) {
    if (isMySQLConnected()) return mysqlDb.findOne(collection, query);
    if (isMongoConnected()) {
      try {
        const Model = getModel(collection);
        const doc = await Model.findOne(query).lean();
        return doc || null;
      } catch (err) {
        console.error(`MongoDB findOne error on ${collection}:`, err.message);
      }
    }
    return jsonDb.findOne(collection, query);
  }

  async create(collection, record) {
    if (isMySQLConnected()) return mysqlDb.create(collection, record);
    const id = record._id || generateId(collection);
    const newRecord = { _id: id, ...record };

    if (isMongoConnected()) {
      try {
        const Model = getModel(collection);
        const doc = new Model(newRecord);
        await doc.save();
        await jsonDb.create(collection, newRecord).catch(() => {});
        return doc.toObject({ versionKey: false });
      } catch (err) {
        console.error(`MongoDB create error on ${collection}:`, err.message);
      }
    }
    return jsonDb.create(collection, newRecord);
  }

  async updateOne(collection, query, updateData) {
    if (isMySQLConnected()) return mysqlDb.updateOne(collection, query, updateData);
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
        console.error(`MongoDB updateOne error on ${collection}:`, err.message);
      }
    }
    return jsonDb.updateOne(collection, query, updateData);
  }

  async updateMany(collection, query, updateData) {
    if (isMySQLConnected()) return mysqlDb.updateMany(collection, query, updateData);
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
        console.error(`MongoDB updateMany error on ${collection}:`, err.message);
      }
    }
    return jsonDb.updateMany(collection, query, updateData);
  }

  async deleteOne(collection, query) {
    if (isMySQLConnected()) return mysqlDb.deleteOne(collection, query);
    if (isMongoConnected()) {
      try {
        const Model = getModel(collection);
        const result = await Model.deleteOne(query);
        await jsonDb.deleteOne(collection, query).catch(() => {});
        return { deletedCount: result.deletedCount };
      } catch (err) {
        console.error(`MongoDB deleteOne error on ${collection}:`, err.message);
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

      if (isMySQLConnected()) {
        await mysqlPool.query(`DELETE FROM mrs_${col}`);
        for (const item of records) {
          const id = item._id || generateId(col);
          await mysqlPool.query(
            `INSERT INTO mrs_${col} (id, data) VALUES (?, ?)`,
            [id, JSON.stringify(item)]
          );
        }
      } else if (isMongoConnected()) {
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

// ─── Connection Manager ─────────────────────────────────────────────────────
export async function connectDB() {
  // 1. Check if MySQL is configured
  const mysqlUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
  const mysqlHost = process.env.MYSQL_HOST;

  if (mysqlUrl || mysqlHost) {
    try {
      console.log('🔄 Connecting to MySQL Database...');
      let config = {};

      if (mysqlUrl) {
        config = { uri: mysqlUrl };
      } else {
        config = {
          host: mysqlHost,
          user: process.env.MYSQL_USER || 'root',
          password: process.env.MYSQL_PASSWORD || '',
          database: process.env.MYSQL_DATABASE || 'mrs_solar',
          port: Number(process.env.MYSQL_PORT) || 3306,
        };
      }

      // Check if SSL is required (e.g. Aiven, TiDB, PlanetScale, Railway)
      const isCloudMySQL = (mysqlUrl && (mysqlUrl.includes('ssl') || mysqlUrl.includes('tidb') || mysqlUrl.includes('aiven') || mysqlUrl.includes('railway'))) ||
                           (mysqlHost && (mysqlHost.includes('tidb') || mysqlHost.includes('aiven') || mysqlHost.includes('railway')));

      if (process.env.MYSQL_SSL === 'true' || isCloudMySQL) {
        config.ssl = { rejectUnauthorized: false };
      }

      mysqlPool = mysql.createPool({
        ...config,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000
      });

      // Ping MySQL server
      await mysqlPool.query('SELECT 1 as test');
      await initMySQLTables();
      console.log('✅ Successfully connected to MySQL database & initialized tables!');
      return true;
    } catch (err) {
      console.error('❌ MySQL connection failed:', err.message);
      console.warn('⚠️ Falling back to next available database...');
      mysqlPool = null;
    }
  }

  // 2. Fallback to MongoDB Atlas if MONGODB_URI is set
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    try {
      console.log('🔄 Connecting to MongoDB Atlas...');
      await mongoose.connect(mongoUri, {
        dbName: 'mrs-solar',
        serverSelectionTimeoutMS: 15000,
        family: 4
      });
      console.log('✅ Successfully connected to MongoDB Atlas (mrs-solar database)!');
      return true;
    } catch (err) {
      console.error('❌ MongoDB Atlas connection failed:', err.message);
      console.warn('⚠️ Operating with local JSON DB fallback so website stays online.');
      return false;
    }
  }

  console.warn('⚠️ No external database credentials found. Running with local JSON database fallback.');
  return false;
}

export const db = new UnifiedDatabase();
