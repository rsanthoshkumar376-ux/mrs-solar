import { db } from '../database/db.js';
import { recalculateCustomerEmiStatus } from './calculations.js';
import { sendDueReminderEmail } from './email.js';

/**
 * Returns Indian Standard Time (IST, UTC+5:30) calendar date string in YYYY-MM-DD format.
 * This guarantees consistent calendar dates regardless of server host UTC offset.
 *
 * @param {Date} date - Input date
 * @returns {string} Date string (e.g. '2026-10-11')
 */
export function getISTDateString(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
  } catch (e) {
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (330 * 60000));
    return ist.toISOString().split('T')[0];
  }
}

/**
 * Checks all customers, updates overdue penalties, and triggers alerts.
 * Runs at midnight or when manual/external action is triggered.
 *
 * Idempotency guarantees:
 * 1. Checks `audit_runs` collection by calendar date in IST. If an audit has already completed for that date and `!force`, execution is safely skipped.
 * 2. Deduplicates all notifications (3-day reminders, due-today reminders, overdue alerts, completion alerts) before insertion.
 * 3. Never duplicates late fee charges or alert notifications when called multiple times on the same date.
 *
 * @param {Date} checkDate - Reference date for audit (default: current date/time)
 * @param {Object} options - { force: boolean, triggeredBy: string }
 * @returns {Promise<Object>} Summary of audit execution
 */
export async function runDailyInterestAndPenaltyCheck(checkDate = new Date(), options = {}) {
  const force = Boolean(options.force);
  const triggeredBy = options.triggeredBy || 'internal-scheduler';
  const auditDate = getISTDateString(checkDate);

  console.log(`[Scheduler] Initiating daily audit for date: ${auditDate} (Triggered by: ${triggeredBy}, Force: ${force})`);

  // Idempotency check: Skip duplicate execution if already successfully run today unless force=true
  if (!force) {
    const existingRun = await db.findOne('audit_runs', { auditDate, status: 'SUCCESS' });
    if (existingRun) {
      console.log(`[Scheduler] Audit for ${auditDate} has already completed successfully (Run ID: ${existingRun._id}). Skipping duplicate execution.`);
      return {
        success: true,
        alreadyRun: true,
        auditDate,
        message: `Midnight audit for ${auditDate} has already completed successfully. Duplicate execution skipped to preserve idempotency.`,
        lastRun: existingRun
      };
    }
  }

  const startTime = Date.now();
  const runRecord = await db.create('audit_runs', {
    auditDate,
    startedAt: new Date().toISOString(),
    status: 'IN_PROGRESS',
    triggeredBy,
    force
  });

  try {
    const customers = await db.find('customers');
    let updatedCount = 0;
    let totalNotificationsCreated = 0;
    let totalPenaltiesCalculated = 0;

    for (const customer of customers) {
      if (customer.loanStatus === 'Completed') continue;

      const prevLateFee = Number(customer.latePaymentCharges) || 0;

      // Recalculate status and penalty
      const updatedCustomer = recalculateCustomerEmiStatus({ ...customer }, checkDate);
      const newLateFee = Number(updatedCustomer.latePaymentCharges) || 0;
      if (newLateFee > prevLateFee) {
        totalPenaltiesCalculated += (newLateFee - prevLateFee);
      }

      // Save updated customer record
      await db.updateOne('customers', { _id: customer._id }, updatedCustomer);
      updatedCount++;

      // Generate strictly deduplicated notifications
      const notifCount = await processCustomerNotifications(customer._id, customer, updatedCustomer, checkDate);
      totalNotificationsCreated += notifCount;
    }

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    await db.updateOne('audit_runs', { _id: runRecord._id }, {
      status: 'SUCCESS',
      completedAt,
      durationMs,
      checkedCount: updatedCount,
      notificationsCreated: totalNotificationsCreated,
      totalPenaltiesCalculated: Math.round(totalPenaltiesCalculated * 100) / 100
    });

    console.log(`[Scheduler] Completed daily audit for ${auditDate} in ${durationMs}ms: ${updatedCount} customers checked, ${totalNotificationsCreated} notifications created.`);

    return {
      success: true,
      alreadyRun: false,
      auditDate,
      runId: runRecord._id,
      checkedCount: updatedCount,
      notificationsCreated: totalNotificationsCreated,
      durationMs,
      triggeredBy
    };
  } catch (error) {
    console.error(`[Scheduler] Daily audit failed for ${auditDate}:`, error);
    await db.updateOne('audit_runs', { _id: runRecord._id }, {
      status: 'FAILED',
      failedAt: new Date().toISOString(),
      error: error.message
    }).catch(() => {});
    throw error;
  }
}

/**
 * Generates notification logs and sends email alerts for customers.
 * Every notification type is strictly deduplicated against the database
 * to guarantee that multiple runs on the same day never produce duplicate alerts.
 *
 * @returns {Promise<number>} Number of newly created notifications
 */
async function processCustomerNotifications(customerId, oldCustomer, newCustomer, checkDate) {
  let createdCount = 0;
  const todayStr = checkDate.toISOString().split('T')[0];

  const tomorrow = new Date(checkDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const threeDaysLater = new Date(checkDate);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  const threeDaysLaterStr = threeDaysLater.toISOString().split('T')[0];

  // Check EMIs in schedule
  for (const emi of newCustomer.emiSchedule) {
    if (emi.status === 'Paid') continue;

    // 1. EMI due in 3 days → Customer Reminder (notification + email)
    if (emi.dueDate === threeDaysLaterStr) {
      const exists = await db.findOne('notifications', {
        customerId,
        type: 'EMI_Reminder_3d',
        emiNumber: emi.emiNumber
      });
      if (!exists) {
        await db.create('notifications', {
          customerId,
          role: 'customer',
          title: 'Upcoming EMI Reminder',
          message: `Your EMI #${emi.emiNumber} of ₹${emi.emiAmount.toLocaleString('en-IN')} is due in 3 days on ${emi.dueDate}. Please arrange payment in advance.`,
          type: 'EMI_Reminder_3d',
          emiNumber: emi.emiNumber,
          read: false
        });
        createdCount++;

        // Send 3-day advance email reminder
        if (newCustomer.email) {
          sendDueReminderEmail(newCustomer, emi).catch(err =>
            console.warn(`[Email] 3-day reminder failed for ${newCustomer.customerId}:`, err.message)
          );
        }
      }
    }

    // 2. EMI due today → Send "Due Today" email to customer + notify admin
    if (emi.dueDate === todayStr) {
      const existsToday = await db.findOne('notifications', {
        customerId,
        type: 'EMI_Due_Today',
        emiNumber: emi.emiNumber
      });
      if (!existsToday) {
        await db.create('notifications', {
          customerId,
          role: 'customer',
          title: '⚠️ EMI Due Today',
          message: `Your EMI #${emi.emiNumber} of ₹${emi.emiAmount.toLocaleString('en-IN')} is due TODAY (${emi.dueDate}). Please pay immediately to avoid late penalty.`,
          type: 'EMI_Due_Today',
          emiNumber: emi.emiNumber,
          read: false
        });
        createdCount++;

        // Send "Due Today" email directly to customer's Gmail
        if (newCustomer.email) {
          sendDueReminderEmail(newCustomer, emi).catch(err =>
            console.warn(`[Email] Due-today email failed for ${newCustomer.customerId}:`, err.message)
          );
        }
      }
    }

    // 3. EMI due tomorrow → Owner/admin notification
    if (emi.dueDate === tomorrowStr) {
      const exists = await db.findOne('notifications', {
        customerId,
        type: 'Owner_Due_Tomorrow',
        emiNumber: emi.emiNumber
      });
      if (!exists) {
        await db.create('notifications', {
          role: 'admin',
          customerId,
          title: 'EMI Due Tomorrow',
          message: `EMI #${emi.emiNumber} for ${newCustomer.fullName} (ID: ${newCustomer.customerId}) is due tomorrow on ${emi.dueDate}.`,
          type: 'Owner_Due_Tomorrow',
          emiNumber: emi.emiNumber,
          read: false
        });
        createdCount++;
      }
    }

    // 4. Overdue → Customer & Admin notifications (strictly deduplicated)
    if (emi.status === 'Overdue') {
      const diffTime = checkDate.getTime() - new Date(emi.dueDate).getTime();
      const daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

      if (daysOverdue > 0) {
        const custOverdueExists = await db.findOne('notifications', {
          customerId,
          type: `Customer_Overdue_${daysOverdue}d`,
          emiNumber: emi.emiNumber
        });
        if (!custOverdueExists) {
          await db.create('notifications', {
            customerId,
            role: 'customer',
            title: 'Overdue EMI Alert',
            message: `Your EMI #${emi.emiNumber} of ₹${emi.emiAmount.toLocaleString('en-IN')} is late by ${daysOverdue} days. Late penalty: ₹${emi.lateFee.toLocaleString('en-IN')}.`,
            type: `Customer_Overdue_${daysOverdue}d`,
            emiNumber: emi.emiNumber,
            read: false
          });
          createdCount++;
        }

        const ownerOverdueExists = await db.findOne('notifications', {
          customerId,
          type: `Owner_Overdue_${daysOverdue}d`,
          emiNumber: emi.emiNumber
        });
        if (!ownerOverdueExists) {
          await db.create('notifications', {
            role: 'admin',
            customerId,
            title: 'Customer Overdue Alert',
            message: `Customer ${newCustomer.fullName} (ID: ${newCustomer.customerId}) is overdue on EMI #${emi.emiNumber} by ${daysOverdue} days. Late fee: ₹${emi.lateFee.toLocaleString('en-IN')}.`,
            type: `Owner_Overdue_${daysOverdue}d`,
            emiNumber: emi.emiNumber,
            read: false
          });
          createdCount++;
        }
      }
    }
  }

  // 5. Loan completion notification (strictly deduplicated)
  if (oldCustomer.loanStatus !== 'Completed' && newCustomer.loanStatus === 'Completed') {
    const custCompExists = await db.findOne('notifications', {
      customerId,
      type: 'Loan_Completed_Cust'
    });
    if (!custCompExists) {
      await db.create('notifications', {
        customerId,
        role: 'customer',
        title: 'Congratulations! Loan Completed',
        message: `Your Solar Panel installation loan has been fully settled. Thank you for choosing MRS ASSOCIATES!`,
        type: 'Loan_Completed_Cust',
        read: false
      });
      createdCount++;
    }

    const adminCompExists = await db.findOne('notifications', {
      customerId,
      type: 'Loan_Completed_Admin'
    });
    if (!adminCompExists) {
      await db.create('notifications', {
        role: 'admin',
        customerId,
        title: 'Loan Completed',
        message: `Customer ${newCustomer.fullName} (ID: ${newCustomer.customerId}) has successfully paid off their solar installation loan.`,
        type: 'Loan_Completed_Admin',
        read: false
      });
      createdCount++;
    }
  }

  return createdCount;
}
