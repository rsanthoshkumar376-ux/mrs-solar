/**
 * MRS SOLARI - Calculation Utilities
 */

/**
 * Calculates standard reducing balance monthly EMI.
 * Formula: EMI = [P x r x (1+r)^n] / [(1+r)^n - 1]
 * 
 * @param {number} principal - Loan Principal Amount (Total Cost - Down Payment)
 * @param {number} monthlyRate - Monthly Interest Rate (e.g. 0.02 for 2%)
 * @param {number} durationMonths - Loan Duration in Months
 * @returns {number} Monthly EMI rounded to 2 decimal places
 */
export function calculateEmiAmount(principal, monthlyRate, durationMonths) {
  if (principal <= 0 || monthlyRate <= 0 || durationMonths <= 0) {
    return 0;
  }
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, durationMonths)) /
              (Math.pow(1 + monthlyRate, durationMonths) - 1);
  return Math.round(emi * 100) / 100;
}

/**
 * Generates the nominal amortisation schedule for a loan.
 * 
 * @param {number} principal - Loan Principal
 * @param {number} monthlyRate - Monthly Rate (0.02)
 * @param {number} durationMonths - Duration
 * @param {string} startDateString - Loan Start Date ISO string
 * @returns {Array} List of scheduled EMI payments
 */
export function generateAmortizationSchedule(principal, monthlyRate, durationMonths, startDateString) {
  const schedule = [];
  let remainingBalance = principal;
  const emiAmount = calculateEmiAmount(principal, monthlyRate, durationMonths);
  const startDate = new Date(startDateString);

  for (let i = 1; i <= durationMonths; i++) {
    // Interest part of current EMI
    const interest = Math.round(remainingBalance * monthlyRate * 100) / 100;
    // Principal part of current EMI (EMI - Interest, caps at remaining principal)
    let principalPaid = Math.round((emiAmount - interest) * 100) / 100;
    
    if (i === durationMonths || principalPaid > remainingBalance) {
      principalPaid = Math.round(remainingBalance * 100) / 100;
    }

    remainingBalance = Math.max(0, Math.round((remainingBalance - principalPaid) * 100) / 100);

    // Calculate due date (same day of month, incrementing month)
    const dueDate = new Date(startDate);
    dueDate.setMonth(startDate.getMonth() + i);

    schedule.push({
      emiNumber: i,
      dueDate: dueDate.toISOString().split('T')[0],
      emiAmount: Math.round(emiAmount * 100) / 100,
      interestPaid: interest,
      principalPaid: principalPaid,
      remainingBalance: remainingBalance,
      status: 'Pending', // 'Pending', 'Paid', 'Overdue'
      paidAmount: 0,
      paidDate: null,
      lateFee: 0,
      totalOutstanding: Math.round(emiAmount * 100) / 100,
      remarks: ''
    });
  }

  return schedule;
}

/**
 * Calculates late payment fee/penalty.
 * Business Rule: Penalty = 1% of the overdue EMI amount per day late.
 * 
 * @param {string} dueDateString - Due date of EMI (YYYY-MM-DD)
 * @param {number} emiAmount - Outstanding EMI amount
 * @param {Date} checkDate - Current date for comparison (default now)
 * @returns {Object} { daysLate, penalty, totalOutstanding }
 */
export function calculateLateFee(dueDateString, emiAmount, checkDate = new Date()) {
  const dueDate = new Date(dueDateString);
  // Set times to midnight to calculate exact calendar days
  dueDate.setHours(0, 0, 0, 0);
  
  const current = new Date(checkDate);
  current.setHours(0, 0, 0, 0);

  const diffTime = current.getTime() - dueDate.getTime();
  const daysLate = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  let penalty = 0;
  if (daysLate > 0) {
    // Late Penalty = 1% of overdue EMI amount per day late
    penalty = Math.round(emiAmount * 0.01 * daysLate * 100) / 100;
  }

  return {
    daysLate,
    penalty,
    totalOutstanding: Math.round((emiAmount + penalty) * 100) / 100
  };
}

/**
 * Recalculates all pending and overdue EMIs for a customer up to checkDate.
 * 
 * @param {Object} customer - The customer record containing emiSchedule
 * @param {Date} checkDate - Date to check overdue status (default now)
 * @returns {Object} Updated customer details with recalculated metrics
 */
export function recalculateCustomerEmiStatus(customer, checkDate = new Date()) {
  if (!customer.emiSchedule || customer.emiSchedule.length === 0) {
    return customer;
  }

  let totalLateFeeAccumulated = 0;
  let remainingLoanBalance = customer.loanAmount; // nominal remaining principal
  let nextEmiDueDate = null;
  let totalAmountOutstanding = 0; // Total principal + interest + late fees currently due/overdue
  let overallEmiStatus = 'Paid';

  customer.emiSchedule = customer.emiSchedule.map(emi => {
    // If already paid, we don't recalculate penalty but reduce loan balance by the principal paid
    if (emi.status === 'Paid') {
      remainingLoanBalance = Math.max(0, Math.round((remainingLoanBalance - emi.principalPaid) * 100) / 100);
      return emi;
    }

    const { daysLate, penalty, totalOutstanding } = calculateLateFee(emi.dueDate, emi.emiAmount, checkDate);
    
    let updatedStatus = 'Pending';
    if (daysLate > 0) {
      updatedStatus = 'Overdue';
      overallEmiStatus = 'Overdue';
    } else {
      // Check if due soon (e.g. within 3 days)
      const dueDate = new Date(emi.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const curr = new Date(checkDate);
      curr.setHours(0, 0, 0, 0);
      const diffTime = dueDate.getTime() - curr.getTime();
      const daysUntilDue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue >= 0 && daysUntilDue <= 3) {
        updatedStatus = 'Due Soon';
        if (overallEmiStatus !== 'Overdue') {
          overallEmiStatus = 'Due Soon';
        }
      }
    }

    if (!nextEmiDueDate && (updatedStatus === 'Pending' || updatedStatus === 'Due Soon' || updatedStatus === 'Overdue')) {
      nextEmiDueDate = emi.dueDate;
    }

    totalLateFeeAccumulated += penalty;
    totalAmountOutstanding += totalOutstanding;

    return {
      ...emi,
      status: updatedStatus,
      lateFee: penalty,
      totalOutstanding: totalOutstanding
    };
  });

  // Calculate remaining loan balance as starting loan amount minus principal paid so far
  const totalPrincipalPaid = customer.emiSchedule
    .filter(e => e.status === 'Paid')
    .reduce((sum, e) => sum + e.principalPaid, 0);

  const calculatedRemainingBalance = Math.max(0, Math.round((customer.loanAmount - totalPrincipalPaid) * 100) / 100);

  // If all EMIs are paid, remaining loan status is Completed
  const allPaid = customer.emiSchedule.every(e => e.status === 'Paid');
  const loanStatus = allPaid ? 'Completed' : 'Active';

  return {
    ...customer,
    remainingBalance: calculatedRemainingBalance,
    totalOutstandingAmount: Math.round(totalAmountOutstanding * 100) / 100,
    latePaymentCharges: Math.round(totalLateFeeAccumulated * 100) / 100,
    emiDueDate: nextEmiDueDate || customer.emiSchedule[customer.emiSchedule.length - 1].dueDate,
    loanStatus,
    paymentStatus: allPaid ? 'Paid' : overallEmiStatus
  };
}
