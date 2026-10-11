import { db } from '../database/db.js';

export const DEFAULT_UPI_CONFIG = {
  key: 'upi',
  activeUpiId: 'rsanthoshkumar376@oksbi',
  accounts: [
    {
      id: 'upi-default-sbi',
      upiId: 'rsanthoshkumar376@oksbi',
      payeeName: 'Mr Santhoshkumar R',
      mobileNumber: '8072454996',
      bankName: 'State Bank of India (SBI)',
      label: 'Primary SBI Account',
      isDefault: true,
      createdAt: '2026-09-01T00:00:00.000Z'
    }
  ]
};

/**
 * Retrieves the complete UPI settings document from database,
 * initializing default configuration if not present.
 */
export async function getUpiConfig() {
  try {
    let config = await db.findOne('settings', { key: 'upi' });
    if (!config) {
      config = await db.create('settings', { ...DEFAULT_UPI_CONFIG });
    }
    // Ensure accounts array exists and has at least the default account
    if (!config.accounts || !Array.isArray(config.accounts) || config.accounts.length === 0) {
      config.accounts = [...DEFAULT_UPI_CONFIG.accounts];
      config.activeUpiId = DEFAULT_UPI_CONFIG.activeUpiId;
      await db.updateOne('settings', { _id: config._id }, config);
    }
    return config;
  } catch (err) {
    console.error('Error fetching UPI config:', err);
    return { ...DEFAULT_UPI_CONFIG };
  }
}

/**
 * Retrieves the currently active UPI account object.
 */
export async function getActiveUpiAccount() {
  const config = await getUpiConfig();
  const active = config.accounts.find(
    a => a.upiId === config.activeUpiId || a.id === config.activeUpiId
  ) || config.accounts[0];

  return {
    id: active.id,
    upiId: active.upiId,
    payeeName: active.payeeName,
    mobileNumber: active.mobileNumber,
    bankName: active.bankName || 'Bank Account',
    label: active.label || 'Active UPI',
    isDefault: !!active.isDefault
  };
}

/**
 * Selects an existing account as the active UPI ID for customer repayments.
 */
export async function setActiveUpiAccount(targetIdOrUpi) {
  if (!targetIdOrUpi) {
    throw new Error('Target UPI ID or Account ID is required');
  }

  const config = await getUpiConfig();
  const target = config.accounts.find(
    a => a.id === targetIdOrUpi || a.upiId.toLowerCase() === targetIdOrUpi.toLowerCase()
  );

  if (!target) {
    throw new Error(`UPI account "${targetIdOrUpi}" not found in registered accounts list`);
  }

  config.activeUpiId = target.upiId;
  config.updatedAt = new Date().toISOString();

  await db.updateOne('settings', { _id: config._id }, config);
  return target;
}

/**
 * Creates or updates a UPI account in the settings.
 */
export async function saveUpiAccount({ id, upiId, payeeName, mobileNumber, bankName, label, setAsActive }) {
  const cleanUpi = String(upiId || '').trim();
  const cleanPayee = String(payeeName || '').trim();
  const cleanMobile = String(mobileNumber || '').replace(/\D/g, '');
  const cleanBank = String(bankName || '').trim();
  const cleanLabel = String(label || '').trim();

  // Basic validation
  if (!cleanUpi || !cleanUpi.includes('@') || cleanUpi.length < 5) {
    throw new Error('Please enter a valid UPI ID (e.g. yourname@oksbi, mobile@paytm)');
  }
  if (!cleanPayee) {
    throw new Error('Please enter the Payee / Account holder name');
  }

  const config = await getUpiConfig();
  let existingIndex = -1;

  if (id) {
    existingIndex = config.accounts.findIndex(a => a.id === id);
  } else {
    // Check if UPI ID already exists
    existingIndex = config.accounts.findIndex(a => a.upiId.toLowerCase() === cleanUpi.toLowerCase());
  }

  const accountId = id || (existingIndex >= 0 ? config.accounts[existingIndex].id : `upi-${Date.now()}`);

  const accountRecord = {
    id: accountId,
    upiId: cleanUpi,
    payeeName: cleanPayee,
    mobileNumber: cleanMobile || '8072454996',
    bankName: cleanBank || 'Bank Account',
    label: cleanLabel || `${cleanPayee} (${cleanUpi.split('@')[1] || 'UPI'})`,
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    config.accounts[existingIndex] = {
      ...config.accounts[existingIndex],
      ...accountRecord
    };
  } else {
    accountRecord.createdAt = new Date().toISOString();
    config.accounts.push(accountRecord);
  }

  if (setAsActive) {
    config.activeUpiId = cleanUpi;
  }

  config.updatedAt = new Date().toISOString();
  await db.updateOne('settings', { _id: config._id }, config);

  return {
    account: accountRecord,
    activeUpiId: config.activeUpiId
  };
}

/**
 * Removes a saved UPI account (cannot delete the active account).
 */
export async function deleteUpiAccount(id) {
  const config = await getUpiConfig();
  const account = config.accounts.find(a => a.id === id || a.upiId === id);

  if (!account) {
    throw new Error('UPI account not found');
  }

  if (config.accounts.length <= 1) {
    throw new Error('Cannot delete the last remaining UPI account. At least one UPI ID must be configured.');
  }

  if (account.upiId === config.activeUpiId || account.id === config.activeUpiId) {
    throw new Error('Cannot delete the currently active UPI ID. Please switch active status to another account before deleting.');
  }

  config.accounts = config.accounts.filter(a => a.id !== id && a.upiId !== id);
  config.updatedAt = new Date().toISOString();

  await db.updateOne('settings', { _id: config._id }, config);
  return { success: true, deletedId: id };
}
