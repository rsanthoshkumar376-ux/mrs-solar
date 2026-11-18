import fs from 'fs';
import path from 'path';

function findFiles(dir, list = []) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      findFiles(full, list);
    } else if (f.endsWith('.jsx') || f.endsWith('.js')) {
      list.push(full);
    }
  }
  return list;
}

const files = findFiles('C:/Users/Admin/.gemini/antigravity/scratch/mrs-solari/frontend/src');

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');

  // Extract all imports from 'lucide-react'
  const lucideMatches = [...code.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g)];
  const importedIcons = new Set();
  for (const m of lucideMatches) {
    m[1].split(',').forEach(s => {
      const icon = s.trim().split(/\s+as\s+/).pop().trim();
      if (icon) importedIcons.add(icon);
    });
  }

  // Find all icon usages like: icon: SomeIcon, icon={SomeIcon}, <SomeIcon
  // Also check all identifiers used as <IconName or icon: IconName
  const iconUsage1 = [...code.matchAll(/\bicon:\s*([A-Z][a-zA-Z0-9]+)\b/g)].map(m => m[1]);
  const iconUsage2 = [...code.matchAll(/<([A-Z][a-zA-Z0-9]+)\b/g)].map(m => m[1]);
  const iconUsage3 = [...code.matchAll(/\bicon=\{([A-Z][a-zA-Z0-9]+)\}/g)].map(m => m[1]);

  const allUsages = new Set([...iconUsage1, ...iconUsage2, ...iconUsage3]);

  // Exclude known React component names / HTML tags
  const reactBuiltins = new Set([
    'React', 'Suspense', 'StrictMode', 'Fragment', 'BrowserRouter', 'Routes', 'Route', 'Navigate', 'Link', 'NavLink',
    'AuthProvider', 'ProtectedRoute', 'Layout', 'ErrorBoundary',
    // Modals & subcomponents
    'AdminDashboard', 'LeadManager', 'CustomerManager', 'CustomerDetails', 'AuditLogs', 'BackupRestore',
    'EmailSettings', 'UpiSettings', 'Settings', 'EmployeeManager', 'TargetManager', 'TaskManager',
    'SolarProjectManager', 'AttendanceManager', 'WorkforceReports', 'AiDashboard', 'AiVisionDashboard',
    'SecurityPasswords', 'ChangePassword', 'ManagerDashboard', 'WorkerDashboard', 'CustomerDashboard',
    'EmiHistory', 'ReferralPortal', 'ActivateAccount', 'ForgotPassword', 'Login',
    'AppUpdateModal', 'AppUpdateModalButton', 'InstallAppBanner', 'SolarSunriseBackground',
    'SolarCalculatorModal', 'NewCustomerReferralModal', 'AiChatbot', 'AiImageAnalyzerModal',
    'AiImageUploadModal', 'AppDownloadModal', 'AutoPayModal', 'BulkReminderModal',
    'InstallationChecklistModal', 'LoanStatementModal', 'ReferralShareCard', 'SanctionLetterModal',
    'ServiceTicketModal', 'SolarQuotationModal', 'SolarSiteMap', 'SolarTrackerCard',
    'SubsidyAdminCard', 'SubsidyTrackerCard', 'TaxInvoiceModal', 'TnebBillScannerModal', 'UpiPaymentModal',
    'ManagerCustomerManager', 'ManagerWorkerManager', 'ManagerTaskManager', 'ManagerAccountManager',
    'ManagerSupportManager', 'ManagerActivityLogs', 'CustomerSupportMonitoring', 'QRCodeCanvas', 'QRCodeSVG'
  ]);

  for (const icon of allUsages) {
    if (reactBuiltins.has(icon)) continue;

    // Check if defined locally (e.g. const Icon = ...)
    const isDeclared = new RegExp('\\b(const|let|var|function|class)\\s+' + icon + '\\b').test(code);
    const isImportedElsewhere = new RegExp('import\\s+.*\\b' + icon + '\\b.*from').test(code);

    if (!importedIcons.has(icon) && !isDeclared && !isImportedElsewhere) {
      console.log(`MISSING ICON: "${icon}" in ${file}`);
    }
  }
}

console.log('Icon audit completed.');
