import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// Helper to ensure directories exist
async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  await fs.mkdir(path.join(DATA_DIR, 'uploads'), { recursive: true });
}

// Queue for write operations to prevent corruption
const writeQueues = {};

class JsonDatabase {
  constructor() {
    ensureDirs().catch(err => console.error('Failed to create database directories:', err));
  }

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
      // If file doesn't exist, return empty array
      if (error.code === 'ENOENT') {
        return [];
      }
      console.error(`Error reading collection ${collection}:`, error);
      throw error;
    }
  }

  async writeCollection(collection, data) {
    await ensureDirs();
    const filePath = this.getFilePath(collection);
    
    // Use queue to serialize writes to the same collection
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
        throw err;
      }
    });

    writeQueues[collection] = writePromise.catch(() => {});
    return writePromise;
  }

  // Find multiple records matching query
  async find(collection, query = {}) {
    const data = await this.readCollection(collection);
    return data.filter(item => this.matchQuery(item, query));
  }

  // Find single record matching query
  async findOne(collection, query = {}) {
    const data = await this.readCollection(collection);
    const item = data.find(item => this.matchQuery(item, query));
    return item || null;
  }

  // Insert a new record
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

  // Update a single record matching query
  async updateOne(collection, query, updateData) {
    const data = await this.readCollection(collection);
    const index = data.findIndex(item => this.matchQuery(item, query));
    if (index === -1) return null;

    // Remove immutable fields from updateData
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

  // Update multiple records matching query
  async updateMany(collection, query, updateData) {
    const data = await this.readCollection(collection);
    let count = 0;
    
    // Remove immutable fields from updateData
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

  // Delete a single record matching query
  async deleteOne(collection, query) {
    const data = await this.readCollection(collection);
    const index = data.findIndex(item => this.matchQuery(item, query));
    if (index === -1) return { deletedCount: 0 };

    data.splice(index, 1);
    await this.writeCollection(collection, data);
    return { deletedCount: 1 };
  }

  // Generate ID helper
  generateId(collection) {
    const prefix = collection.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${timestamp}-${random}`;
  }

  // Matcher helper
  matchQuery(item, query) {
    for (const key in query) {
      if (query[key] && typeof query[key] === 'object' && !Array.isArray(query[key])) {
        // Handle basic logical operators if needed, or recursive matches
        // For simplicity, we match sub-objects if needed, or exact matches
        if (JSON.stringify(item[key]) !== JSON.stringify(query[key])) {
          return false;
        }
      } else {
        // Exact value comparison
        if (item[key] !== query[key]) {
          return false;
        }
      }
    }
    return true;
  }

  // Backup data collections
  async backup() {
    await ensureDirs();
    const collections = ['users', 'customers', 'payments', 'audit_logs', 'notifications'];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupSubdir = path.join(BACKUP_DIR, `backup-${timestamp}`);
    await fs.mkdir(backupSubdir, { recursive: true });

    for (const col of collections) {
      const srcPath = this.getFilePath(col);
      const destPath = path.join(backupSubdir, `${col}.json`);
      try {
        await fs.copyFile(srcPath, destPath);
      } catch (err) {
        // If file doesn't exist yet, we write an empty array to backup
        if (err.code === 'ENOENT') {
          await fs.writeFile(destPath, '[]', 'utf-8');
        } else {
          throw err;
        }
      }
    }

    return { backupName: `backup-${timestamp}`, timestamp };
  }

  // List backups
  async listBackups() {
    await ensureDirs();
    try {
      const dirs = await fs.readdir(BACKUP_DIR);
      return dirs.filter(name => name.startsWith('backup-'));
    } catch {
      return [];
    }
  }

  // Restore database
  async restore(backupName) {
    await ensureDirs();
    const backupSubdir = path.join(BACKUP_DIR, backupName);
    const collections = ['users', 'customers', 'payments', 'audit_logs', 'notifications'];

    // Verify all files exist in backup before restoring to prevent partial state
    for (const col of collections) {
      const backupPath = path.join(backupSubdir, `${col}.json`);
      try {
        await fs.access(backupPath);
      } catch {
        throw new Error(`Invalid backup: missing collection ${col}`);
      }
    }

    // Copy back files
    for (const col of collections) {
      const backupPath = path.join(backupSubdir, `${col}.json`);
      const destPath = this.getFilePath(col);
      await fs.copyFile(backupPath, destPath);
    }

    return { restored: true };
  }
}

export const db = new JsonDatabase();
