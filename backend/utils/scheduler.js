import { db } from '../database/db.js';
import { recalculateCustomerEmiStatus } from './calculations.js';

/**
 * Checks all customers, updates overdue penalties, and triggers alerts.
 * Runs at midnight or when manual action is triggered.
 */
export async function runDailyInterestAndPenaltyCheck(checkDate = new Date()) {
  console.log(`[Scheduler] Starting daily loan status and penalty check for date: ${checkDate.toISOString()}`);
  const customers = await db.find('customers');
  let updatedCount = 0;

  for (const customer of customers) {
    if (customer.loanStatus === 'Completed') continue;

    // Save previous payment status and outstanding values to check if notifications should trigger
    const prevPaymentStatus = customer.paymentStatus;
    const prevLateFee = customer.latePaymentCharges || 0;

    // Recalculate status and penalty
    const updatedCustomer = recalculateCustomerEmiStatus({ ...customer }, checkDate);

    // Save updated customer record
    await db.updateOne('customers', { _id: customer._id }, updatedCustomer);
    updatedCount++;

    // Generate Notifications based on changes or conditions
    await processCustomerNotifications(customer._id, customer, updatedCustomer, checkDate);
  }

  console.log(`[Scheduler] Successfully checked and updated ${updatedCount} customers.`);
  return { checkedCount: updatedCount };
}

/**
 * Generates notification logs for customers and owner/admin.
 */
async function processCustomerNotifications(customerId, oldCustomer, newCustomer, checkDate) {
  const tomorrow = new Date(checkDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const threeDaysLater = new Date(checkDate);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  const threeDaysLaterStr = threeDaysLater.toISOString().split('T')[0];

  // Check EMIs in schedule
  for (const emi of newCustomer.emiSchedule) {
    if (emi.status === 'Paid') continue;

    // 1. EMI due in 3 days -> Customer Reminder
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
          message: `Your EMI #${emi.emiNumber} of ₹${emi.emiAmount.toLocaleString('en-IN')} is due on ${emi.dueDate}.`,
          type: 'EMI_Reminder_3d',
          emiNumber: emi.emiNumber,
          read: false
        });
      }
    }

    // 2. EMI due tomorrow -> Owner notification
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
      }
    }

    // 3. Overdue -> Customer & Admin notifications
    if (emi.status === 'Overdue') {
      const diffTime = checkDate.getTime() - new Date(emi.dueDate).getTime();
      const daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

      if (daysOverdue > 0) {
        // Send notification to customer about late fee accumulation
        await db.create('notifications', {
          customerId,
          role: 'customer',
          title: 'Overdue EMI Alert',
          message: `Your EMI #${emi.emiNumber} of ₹${emi.emiAmount.toLocaleString('en-IN')} is late by ${daysOverdue} days. Accumulating late penalty: ₹${emi.lateFee.toLocaleString('en-IN')}.`,
          type: `Customer_Overdue_${daysOverdue}d`,
          emiNumber: emi.emiNumber,
          read: false
        });

        // Send alert to admin
        await db.create('notifications', {
          role: 'admin',
          customerId,
          title: 'Customer Overdue Alert',
          message: `Customer ${newCustomer.fullName} (ID: ${newCustomer.customerId}) is overdue on EMI #${emi.emiNumber} by ${daysOverdue} days. Current late fee: ₹${emi.lateFee.toLocaleString('en-IN')}.`,
          type: `Owner_Overdue_${daysOverdue}d`,
          emiNumber: emi.emiNumber,
          read: false
        });
      }
    }
  }

  // 4. Loan completion notification
  if (oldCustomer.loanStatus !== 'Completed' && newCustomer.loanStatus === 'Completed') {
    await db.create('notifications', {
      customerId,
      role: 'customer',
      title: 'Congratulations! Loan Completed',
      message: `Your Solar Panel installation loan has been fully settled. Thank you for choosing MRS SOLARI!`,
      type: 'Loan_Completed_Cust',
      read: false
    });

    await db.create('notifications', {
      role: 'admin',
      customerId,
      title: 'Loan Completed',
      message: `Customer ${newCustomer.fullName} (ID: ${newCustomer.customerId}) has successfully paid off their solar installation loan.`,
      type: 'Loan_Completed_Admin',
      read: false
    });
  }
}
