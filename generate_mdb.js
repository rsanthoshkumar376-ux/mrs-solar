import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'backend', 'data');
const downloadsDir = 'C:\\Users\\Admin\\Downloads';
const outputFile = path.join(downloadsDir, 'MRS_SOLAR_Database_Backup.mdb');

const collections = ['users', 'customers', 'payments', 'notifications', 'audit_logs'];
const exportData = {
  appName: 'MRS SOLAR Loan Management System',
  exportedAt: new Date().toISOString(),
  format: 'MongoDB Dump (JSON-BSON Mongo Export)',
  collections: {}
};

for (const col of collections) {
  const filePath = path.join(dataDir, `${col}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      exportData.collections[col] = JSON.parse(content);
    } catch (e) {
      exportData.collections[col] = [];
    }
  } else {
    exportData.collections[col] = [];
  }
}

fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2), 'utf8');
console.log(`Database exported successfully to: ${outputFile}`);
