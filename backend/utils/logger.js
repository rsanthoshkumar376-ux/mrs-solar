import { db } from '../database/db.js';

/**
 * Creates an entry in the audit_logs collection for admin tracking.
 * 
 * @param {string} username - Admin username / email
 * @param {string} action - Description of action (e.g. "Create Customer")
 * @param {string} target - Target ID or name (e.g. "CUST-1001")
 * @param {Object} details - Additional contextual metadata
 */
export async function logAdminAction(username, action, target, details = {}) {
  try {
    await db.create('audit_logs', {
      username,
      action,
      target,
      details,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Audit logger failed:', error);
  }
}
