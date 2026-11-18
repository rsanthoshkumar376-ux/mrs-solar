import fs from 'fs';
import path from 'path';

const managerFiles = [
  'frontend/src/pages/manager/ManagerCustomerManager.jsx',
  'frontend/src/pages/manager/ManagerWorkerManager.jsx',
  'frontend/src/pages/manager/ManagerAccountManager.jsx',
  'frontend/src/pages/manager/ManagerEmailLogs.jsx',
  'frontend/src/pages/manager/ManagerActivityLogs.jsx',
  'frontend/src/pages/worker/WorkerDashboard.jsx'
];

for (const rel of managerFiles) {
  const full = path.join('C:/Users/Admin/.gemini/antigravity/scratch/mrs-solari', rel);
  const code = fs.readFileSync(full, 'utf8');

  // Check isTa
  if (/\bisTa\b/.test(code)) {
    if (!/(const|let|var)\s+isTa\b/.test(code)) {
      console.log('  MISSING isTa in', rel);
    }
  }

  // Check lang
  if (/\blang\b/.test(code)) {
    if (!code.includes('lang') || (!code.includes('const [lang') && !code.includes('const lang') && !code.includes('let lang'))) {
      console.log('  POTENTIAL MISSING lang in', rel);
    }
  }
}
console.log('Manager subcomponents check finished successfully.');
