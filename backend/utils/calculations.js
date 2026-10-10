/**
 * MRS SOLARI - High-Precision Financial Calculations Engine
 *
 * Design Rule:
 * All internal financial calculations (principal, EMI, interest, penalties, remaining balance)
 * are executed strictly in INTEGER PAISE (1 Rupee = 100 Paise) using Math.round().
 * This completely eliminates IEEE 754 floating-point rounding drift across multi-year loan schedules.
 *
 * Rupee values (2-decimal floats) are also provided on records for UI rendering and backwards compatibility.
 */

/**
 * Converts Rupees (float/number/string) to Integer Paise.
 * Uses Math.round to eliminate floating-point representation anomalies (e.g. 0.1 + 0.2).
 *
 * @param {number|string} rupees - Amount in Rupees
 * @returns {number} Amount in integer paise
 */
export function toPaise(rupees) {
  if (rupees === undefined || rupees === null || isNaN(rupees)) return 0;
  return Math.round(Number(rupees) * 100);
}

/**
 * Converts Integer Paise to Rupees (float rounded to 2 decimal places).
 *
 * @param {number} paise - Amount in Paise
 * @returns {number} Amount in Rupees
 */
export function toRupees(paise) {
  if (paise === undefined || paise === null || isNaN(paise)) return 0;
  return Math.round(Number(paise)) / 100;
}

/**
 * Formats integer paise into standard Indian Rupee string (e.g. ₹9,455.96).
 *
 * @param {number} paise - Amount in paise
 * @returns {string} Formatted INR currency string
 */
export function formatPaise(paise) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(toRupees(paise));
}

/**
 * Checks if a given Gregorian calendar year is a leap year.
 *
 * @param {number} year - Four-digit year
 * @returns {boolean} True if leap year
 */
export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Safely adds months to a calendar date (YYYY-MM-DD), correctly handling:
 * 1. Leap years (Feb 29 in leap years like 2024, 2028; Feb 28 in non-leap years)
 * 2. Month-end clamping (e.g. Jan 31 -> Feb 28/29, Mar 31 -> Apr 30)
 * 3. Year boundaries
 *
 * @param {string|Date} baseDate - Base date (YYYY-MM-DD string or Date object)
 * @param {number} monthsToAdd - Number of months to advance
 * @returns {string} YYYY-MM-DD ISO date string
 */
export function addMonthsSafely(baseDate, monthsToAdd) {
  const d = typeof baseDate === 'string'
    ? new Date(baseDate.includes('T') ? baseDate : baseDate + 'T00:00:00Z')
    : new Date(baseDate);

  const startDay = d.getUTCDate();
  const startMonth = d.getUTCMonth();
  const startYear = d.getUTCFullYear();

  const targetMonthIndex = startMonth + monthsToAdd;
  const targetYear = startYear + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;

  // Last calendar day of the target month
  const maxDaysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();

  // Clamp the day if target month has fewer days (e.g., Jan 31 -> Feb 28/29)
  const finalDay = Math.min(startDay, maxDaysInTargetMonth);

  const finalDate = new Date(Date.UTC(targetYear, targetMonth, finalDay));
  return finalDate.toISOString().split('T')[0];
}

/**
 * Calculates calendar day difference between two dates.
 * Accounts for leap days without timezone distortion.
 *
 * @param {string|Date} dueDate - Due date
 * @param {string|Date} checkDate - Current comparison date
 * @returns {number} Days difference (positive if checkDate is after dueDate)
 */
export function getCalendarDaysDifference(dueDate, checkDate = new Date()) {
  const due = typeof dueDate === 'string'
    ? new Date(dueDate.includes('T') ? dueDate : dueDate + 'T00:00:00Z')
    : new Date(dueDate);

  const curr = typeof checkDate === 'string'
    ? new Date(checkDate.includes('T') ? checkDate : checkDate + 'T00:00:00Z')
    : new Date(checkDate);

  const dueMidnightUTC = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const currMidnightUTC = Date.UTC(curr.getUTCFullYear(), curr.getUTCMonth(), curr.getUTCDate());

  const diffMs = currMidnightUTC - dueMidnightUTC;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculates reducing balance monthly EMI strictly in INTEGER PAISE.
 * Formula: EMI = [P x r x (1+r)^n] / [(1+r)^n - 1]
 *
 * @param {number} principalPaise - Loan Principal in Paise (integer)
 * @param {number} monthlyRate - Monthly Interest Rate (e.g. 0.02 for 2%)
 * @param {number} durationMonths - Loan Duration in Months
 * @returns {number} Monthly EMI in Paise (integer)
 */
export function calculateEmiAmountPaise(principalPaise, monthlyRate, durationMonths) {
  if (principalPaise <= 0 || monthlyRate <= 0 || durationMonths <= 0) {
    return 0;
  }
  const factor = Math.pow(1 + monthlyRate, durationMonths);
  const emiPaise = (principalPaise * monthlyRate * factor) / (factor - 1);
  return Math.round(emiPaise);
}

/**
 * Standard backward-compatible EMI calculation returning float Rupees.
 *
 * @param {number} principal - Loan Principal in Rupees
 * @param {number} monthlyRate - Monthly Interest Rate (e.g. 0.02 for 2%)
 * @param {number} durationMonths - Duration in Months
 * @returns {number} Monthly EMI in Rupees (rounded to 2 decimals)
 */
export function calculateEmiAmount(principal, monthlyRate, durationMonths) {
  const principalPaise = toPaise(principal);
  const emiPaise = calculateEmiAmountPaise(principalPaise, monthlyRate, durationMonths);
  return toRupees(emiPaise);
}

/**
 * Generates the nominal amortisation schedule strictly using INTEGER PAISE.
 * Guarantees that:
 * 1. Total principal paid across all cycles equals starting principal exactly (zero rounding drift).
 * 2. Final remaining balance is exactly 0 paise.
 * 3. Leap years and month-end dates are preserved accurately.
 *
 * @param {number} principal - Loan Principal in Rupees (or integer paise if isPaise=true)
 * @param {number} monthlyRate - Monthly Rate (e.g. 0.02)
 * @param {number} durationMonths - Loan Duration in Months
 * @param {string} startDateString - Loan Start Date (YYYY-MM-DD)
 * @param {boolean} isPaise - True if principal is already passed in paise
 * @returns {Array} List of scheduled EMI payment objects with both paise and rupee fields
 */
export function generateAmortizationSchedule(principal, monthlyRate, durationMonths, startDateString, isPaise = false) {
  const schedule = [];
  const initialPrincipalPaise = isPaise ? Math.round(principal) : toPaise(principal);
  let remainingBalancePaise = initialPrincipalPaise;

  const emiAmountPaise = calculateEmiAmountPaise(initialPrincipalPaise, monthlyRate, durationMonths);
  const startDate = startDateString || new Date().toISOString().split('T')[0];

  for (let i = 1; i <= durationMonths; i++) {
    // Interest part in integer paise
    const interestPaise = Math.round(remainingBalancePaise * monthlyRate);

    // Principal part in integer paise
    let principalPaidPaise = emiAmountPaise - interestPaise;

    // Final month or overpayment cap: principal paid equals remaining balance
    if (i === durationMonths || principalPaidPaise > remainingBalancePaise) {
      principalPaidPaise = remainingBalancePaise;
    }

    remainingBalancePaise = Math.max(0, remainingBalancePaise - principalPaidPaise);

    // Safe calendar date calculation (handles leap years & month-end days)
    const dueDate = addMonthsSafely(startDate, i);

    schedule.push({
      emiNumber: i,
      dueDate,

      // High-precision Integer Paise fields
      emiAmountPaise,
      interestPaidPaise: interestPaise,
      principalPaidPaise,
      remainingBalancePaise,
      paidAmountPaise: 0,
      lateFeePaise: 0,
      totalOutstandingPaise: emiAmountPaise,

      // Rupee fields for UI display & backward compatibility
      emiAmount: toRupees(emiAmountPaise),
      interestPaid: toRupees(interestPaise),
      principalPaid: toRupees(principalPaidPaise),
      remainingBalance: toRupees(remainingBalancePaise),
      paidAmount: 0,
      paidDate: null,
      lateFee: 0,
      totalOutstanding: toRupees(emiAmountPaise),

      status: 'Pending', // 'Pending', 'Partially Paid', 'Paid', 'Overdue', 'Closed'
      remarks: ''
    });
  }

  return schedule;
}

/**
 * Calculates late payment fee/penalty in INTEGER PAISE.
 * Business Rule: Penalty = 1% of the overdue/unpaid EMI amount per day late.
 *
 * @param {string} dueDateString - Due date of EMI (YYYY-MM-DD)
 * @param {number} emiAmountPaise - Outstanding EMI amount in Paise
 * @param {Date} checkDate - Current date for comparison (default now)
 * @param {number|null} unpaidAmountPaise - If partially paid, amount remaining unpaid in paise
 * @returns {Object} { daysLate, penaltyPaise, totalOutstandingPaise, penalty, totalOutstanding }
 */
export function calculateLateFeePaise(dueDateString, emiAmountPaise, checkDate = new Date(), unpaidAmountPaise = null) {
  const daysLate = Math.max(0, getCalendarDaysDifference(dueDateString, checkDate));

  // If partially paid, late fee applies strictly to the unpaid balance
  const basePaise = (unpaidAmountPaise !== null && unpaidAmountPaise !== undefined)
    ? unpaidAmountPaise
    : emiAmountPaise;

  let penaltyPaise = 0;
  if (daysLate > 0 && basePaise > 0) {
    // 1% per day in paise integer
    penaltyPaise = Math.round(basePaise * 0.01 * daysLate);
  }

  const totalOutstandingPaise = basePaise + penaltyPaise;

  return {
    daysLate,
    penaltyPaise,
    totalOutstandingPaise,
    penalty: toRupees(penaltyPaise),
    totalOutstanding: toRupees(totalOutstandingPaise)
  };
}

/**
 * Backward-compatible wrapper for calculateLateFee using Rupees.
 *
 * @param {string} dueDateString - Due date of EMI (YYYY-MM-DD)
 * @param {number} emiAmount - Outstanding EMI amount in Rupees
 * @param {Date} checkDate - Current date for comparison (default now)
 * @param {number|null} unpaidAmount - If partially paid, amount remaining unpaid in Rupees
 * @returns {Object} { daysLate, penalty, totalOutstanding, penaltyPaise, totalOutstandingPaise }
 */
export function calculateLateFee(dueDateString, emiAmount, checkDate = new Date(), unpaidAmount = null) {
  const emiAmountPaise = toPaise(emiAmount);
  const unpaidPaise = unpaidAmount !== null && unpaidAmount !== undefined ? toPaise(unpaidAmount) : null;
  return calculateLateFeePaise(dueDateString, emiAmountPaise, checkDate, unpaidPaise);
}

/**
 * Recalculates all pending, partially paid, and overdue EMIs for a customer up to checkDate.
 * Operates strictly with integer paise to prevent any multi-year drift.
 *
 * @param {Object} customer - The customer record containing emiSchedule
 * @param {Date} checkDate - Date to check overdue status (default now)
 * @returns {Object} Updated customer details with recalculated metrics
 */
export function recalculateCustomerEmiStatus(customer, checkDate = new Date()) {
  if (!customer.emiSchedule || customer.emiSchedule.length === 0) {
    return customer;
  }

  const loanAmountPaise = customer.loanAmountPaise || toPaise(customer.loanAmount);
  let totalLateFeePaise = 0;
  let totalOutstandingPaise = 0;
  let nextEmiDueDate = null;
  let overallEmiStatus = 'Paid';

  customer.emiSchedule = customer.emiSchedule.map(emi => {
    const emiAmountPaise = emi.emiAmountPaise || toPaise(emi.emiAmount);
    const paidAmountPaise = emi.paidAmountPaise || toPaise(emi.paidAmount || 0);

    // If fully paid or closed, preserve existing paid metrics
    if (emi.status === 'Paid' || emi.status === 'Closed') {
      return {
        ...emi,
        emiAmountPaise,
        paidAmountPaise,
        totalOutstandingPaise: 0,
        totalOutstanding: 0,
        lateFeePaise: emi.lateFeePaise || toPaise(emi.lateFee || 0),
        lateFee: toRupees(emi.lateFeePaise || toPaise(emi.lateFee || 0))
      };
    }

    // Determine unpaid portion for this EMI
    const unpaidPaise = Math.max(0, emiAmountPaise - paidAmountPaise);

    const { daysLate, penaltyPaise, totalOutstandingPaise: itemTotalPaise } = calculateLateFeePaise(
      emi.dueDate,
      emiAmountPaise,
      checkDate,
      unpaidPaise
    );

    let updatedStatus = paidAmountPaise > 0 ? 'Partially Paid' : 'Pending';

    if (daysLate > 0) {
      updatedStatus = 'Overdue';
      overallEmiStatus = 'Overdue';
    } else {
      const daysUntilDue = getCalendarDaysDifference(checkDate, emi.dueDate);
      if (daysUntilDue >= 0 && daysUntilDue <= 3) {
        if (updatedStatus !== 'Partially Paid') updatedStatus = 'Due Soon';
        if (overallEmiStatus !== 'Overdue') {
          overallEmiStatus = 'Due Soon';
        }
      } else if (updatedStatus === 'Partially Paid' && overallEmiStatus !== 'Overdue') {
        overallEmiStatus = 'Partially Paid';
      } else if (overallEmiStatus === 'Paid') {
        overallEmiStatus = 'Pending';
      }
    }

    if (!nextEmiDueDate && (updatedStatus === 'Pending' || updatedStatus === 'Due Soon' || updatedStatus === 'Overdue' || updatedStatus === 'Partially Paid')) {
      nextEmiDueDate = emi.dueDate;
    }

    totalLateFeePaise += penaltyPaise;
    totalOutstandingPaise += itemTotalPaise;

    return {
      ...emi,
      status: updatedStatus,
      emiAmountPaise,
      paidAmountPaise,
      lateFeePaise: penaltyPaise,
      lateFee: toRupees(penaltyPaise),
      totalOutstandingPaise: itemTotalPaise,
      totalOutstanding: toRupees(itemTotalPaise),
      unpaidAmountPaise: unpaidPaise,
      unpaidAmount: toRupees(unpaidPaise)
    };
  });

  // Total principal paid across all cycles in integer paise
  const totalPrincipalPaidPaise = customer.emiSchedule
    .filter(e => e.status === 'Paid' || e.status === 'Closed')
    .reduce((sum, e) => sum + (e.principalPaidPaise || toPaise(e.principalPaid)), 0);

  const remainingBalancePaise = Math.max(0, loanAmountPaise - totalPrincipalPaidPaise);

  const allCompleted = customer.emiSchedule.every(e => e.status === 'Paid' || e.status === 'Closed');
  const loanStatus = allCompleted ? 'Completed' : 'Active';

  return {
    ...customer,
    // Integer Paise fields
    loanAmountPaise,
    remainingBalancePaise,
    totalOutstandingAmountPaise: totalOutstandingPaise,
    latePaymentChargesPaise: totalLateFeePaise,

    // Rupee fields for UI & backward compatibility
    remainingBalance: toRupees(remainingBalancePaise),
    totalOutstandingAmount: toRupees(totalOutstandingPaise),
    latePaymentCharges: toRupees(totalLateFeePaise),

    emiDueDate: nextEmiDueDate || customer.emiSchedule[customer.emiSchedule.length - 1].dueDate,
    loanStatus,
    paymentStatus: allCompleted ? 'Paid' : overallEmiStatus
  };
}

/**
 * Processes a Partial Payment on a specific EMI in INTEGER PAISE.
 *
 * @param {Object} customer - Customer object with emiSchedule
 * @param {number} emiNumber - Target EMI number
 * @param {number} amountPaidRupees - Amount paid in Rupees
 * @param {Date|string} paymentDate - Payment receipt date
 * @param {string} remarks - Optional remarks
 * @returns {Object} { updatedCustomer, paymentSummary }
 */
export function processPartialEmiPayment(customer, emiNumber, amountPaidRupees, paymentDate = new Date(), remarks = '') {
  const scheduleIndex = customer.emiSchedule.findIndex(e => e.emiNumber === Number(emiNumber));
  if (scheduleIndex === -1) {
    throw new Error(`EMI #${emiNumber} not found in customer schedule`);
  }

  const emi = customer.emiSchedule[scheduleIndex];
  if (emi.status === 'Paid' || emi.status === 'Closed') {
    throw new Error(`EMI #${emiNumber} has already been settled`);
  }

  const paymentPaise = toPaise(amountPaidRupees);
  if (paymentPaise <= 0) {
    throw new Error(`Payment amount must be greater than zero`);
  }

  const emiAmountPaise = emi.emiAmountPaise || toPaise(emi.emiAmount);
  const priorPaidPaise = emi.paidAmountPaise || toPaise(emi.paidAmount || 0);
  const priorUnpaidPaise = Math.max(0, emiAmountPaise - priorPaidPaise);

  // Calculate accrued late fee on unpaid portion up to paymentDate
  const { penaltyPaise } = calculateLateFeePaise(emi.dueDate, emiAmountPaise, paymentDate, priorUnpaidPaise);

  // Total required to clear this EMI including penalty
  const totalDueForEmiPaise = priorUnpaidPaise + penaltyPaise;

  const totalPaidNowPaise = priorPaidPaise + paymentPaise;
  const isFullySettled = paymentPaise >= totalDueForEmiPaise;

  const dateStr = typeof paymentDate === 'string'
    ? paymentDate.split('T')[0]
    : new Date(paymentDate).toISOString().split('T')[0];

  if (isFullySettled) {
    emi.status = 'Paid';
    emi.paidAmountPaise = emiAmountPaise + penaltyPaise;
    emi.paidAmount = toRupees(emi.paidAmountPaise);
    emi.paidDate = dateStr;
    emi.lateFeePaise = penaltyPaise;
    emi.lateFee = toRupees(penaltyPaise);
    emi.totalOutstandingPaise = 0;
    emi.totalOutstanding = 0;
    emi.unpaidAmountPaise = 0;
    emi.unpaidAmount = 0;
    emi.remarks = remarks || `Fully settled with payment of ₹${toRupees(paymentPaise)}`;
  } else {
    emi.status = 'Partially Paid';
    emi.paidAmountPaise = totalPaidNowPaise;
    emi.paidAmount = toRupees(totalPaidNowPaise);
    emi.paidDate = dateStr;
    emi.lateFeePaise = penaltyPaise;
    emi.lateFee = toRupees(penaltyPaise);

    const remainingUnpaidPaise = Math.max(0, emiAmountPaise - totalPaidNowPaise);
    emi.unpaidAmountPaise = remainingUnpaidPaise;
    emi.unpaidAmount = toRupees(remainingUnpaidPaise);
    emi.totalOutstandingPaise = remainingUnpaidPaise + penaltyPaise;
    emi.totalOutstanding = toRupees(emi.totalOutstandingPaise);
    emi.remarks = remarks || `Partially paid: ₹${toRupees(paymentPaise)} received, ₹${toRupees(remainingUnpaidPaise)} remaining`;
  }

  const updatedCustomer = recalculateCustomerEmiStatus(customer, paymentDate);

  return {
    updatedCustomer,
    paymentSummary: {
      emiNumber,
      paymentAmountRupees: toRupees(paymentPaise),
      paymentAmountPaise: paymentPaise,
      penaltyPaidPaise: penaltyPaise,
      isFullySettled,
      remainingUnpaidPaise: emi.unpaidAmountPaise,
      remainingUnpaidRupees: emi.unpaidAmount
    }
  };
}

/**
 * Calculates accurate Early Closure / Foreclosure payoff quote in INTEGER PAISE.
 * Rule: Customer does NOT pay future unearned interest.
 * Payoff = Current Remaining Principal + Accrued Penalties on Overdue EMIs.
 *
 * @param {Object} customer - Customer object with emiSchedule
 * @param {Date|string} asOfDate - Payoff quote date (default now)
 * @returns {Object} Payoff breakdown with both paise and rupee amounts
 */
export function calculateEarlyClosurePayoff(customer, asOfDate = new Date()) {
  const recalculated = recalculateCustomerEmiStatus(customer, asOfDate);
  const remainingPrincipalPaise = recalculated.remainingBalancePaise || toPaise(recalculated.remainingBalance);
  const accruedLateFeePaise = recalculated.latePaymentChargesPaise || toPaise(recalculated.latePaymentCharges);

  const totalPayoffPaise = remainingPrincipalPaise + accruedLateFeePaise;

  // Unearned future interest saved by paying early
  const unearnedInterestSavedPaise = recalculated.emiSchedule
    .filter(e => e.status !== 'Paid' && e.status !== 'Closed')
    .reduce((sum, e) => sum + (e.interestPaidPaise || toPaise(e.interestPaid)), 0);

  return {
    remainingPrincipalPaise,
    remainingPrincipal: toRupees(remainingPrincipalPaise),
    accruedLateFeePaise,
    accruedLateFee: toRupees(accruedLateFeePaise),
    totalPayoffAmountPaise: totalPayoffPaise,
    totalPayoffAmount: toRupees(totalPayoffPaise),
    unearnedInterestSavedPaise,
    unearnedInterestSaved: toRupees(unearnedInterestSavedPaise)
  };
}

/**
 * Executes Early Closure / Foreclosure of a loan in INTEGER PAISE.
 *
 * @param {Object} customer - Customer object
 * @param {number} amountPaidRupees - Payoff amount paid
 * @param {Date|string} paymentDate - Date of closure
 * @param {string} remarks - Optional closure remarks
 * @returns {Object} { updatedCustomer, closureSummary }
 */
export function processEarlyClosure(customer, amountPaidRupees, paymentDate = new Date(), remarks = '') {
  const payoffQuote = calculateEarlyClosurePayoff(customer, paymentDate);
  const amountPaidPaise = toPaise(amountPaidRupees);

  if (amountPaidPaise < payoffQuote.totalPayoffAmountPaise) {
    throw new Error(
      `Insufficient payment for early closure. Required: ₹${payoffQuote.totalPayoffAmount}, Provided: ₹${toRupees(amountPaidPaise)}`
    );
  }

  const dateStr = typeof paymentDate === 'string'
    ? paymentDate.split('T')[0]
    : new Date(paymentDate).toISOString().split('T')[0];

  // Mark all remaining pending / overdue EMIs as Closed
  customer.emiSchedule = customer.emiSchedule.map(emi => {
    if (emi.status !== 'Paid') {
      return {
        ...emi,
        status: 'Closed',
        paidAmountPaise: 0,
        paidAmount: 0,
        totalOutstandingPaise: 0,
        totalOutstanding: 0,
        lateFeePaise: 0,
        lateFee: 0,
        remarks: `Closed early on ${dateStr}. Future interest waived.`
      };
    }
    return emi;
  });

  customer.loanStatus = 'Completed';
  customer.paymentStatus = 'Paid';
  customer.remainingBalancePaise = 0;
  customer.remainingBalance = 0;
  customer.totalOutstandingAmountPaise = 0;
  customer.totalOutstandingAmount = 0;
  customer.closedAt = dateStr;
  customer.closureRemarks = remarks || 'Loan foreclosed & settled in full ahead of tenure.';

  return {
    updatedCustomer: customer,
    closureSummary: {
      ...payoffQuote,
      settledAt: dateStr,
      remarks: customer.closureRemarks
    }
  };
}

/**
 * Applies a Part-Prepayment (lump sum principal reduction) in INTEGER PAISE.
 *
 * Strategies supported:
 * 1. 'REDUCE_TENURE' (default): Monthly EMI stays the same; loan duration is shortened.
 * 2. 'REDUCE_EMI': Remaining duration stays the same; monthly EMI amount drops.
 *
 * @param {Object} customer - Customer object
 * @param {number} prepaymentRupees - Lump sum amount paid towards principal in Rupees
 * @param {Object} options - { strategy: 'REDUCE_TENURE' | 'REDUCE_EMI', paymentDate: Date|string, remarks: string }
 * @returns {Object} { updatedCustomer, prepaymentSummary }
 */
export function applyPartPrepayment(customer, prepaymentRupees, options = {}) {
  const strategy = options.strategy || 'REDUCE_TENURE';
  const paymentDate = options.paymentDate || new Date();
  const prepaymentPaise = toPaise(prepaymentRupees);

  if (prepaymentPaise <= 0) {
    throw new Error('Prepayment amount must be greater than zero');
  }

  const recalculated = recalculateCustomerEmiStatus(customer, paymentDate);
  const currentRemainingPrincipalPaise = recalculated.remainingBalancePaise || toPaise(recalculated.remainingBalance);

  if (prepaymentPaise > currentRemainingPrincipalPaise) {
    throw new Error(
      `Prepayment (₹${toRupees(prepaymentPaise)}) cannot exceed remaining principal balance (₹${toRupees(currentRemainingPrincipalPaise)})`
    );
  }

  // If prepayment equals remaining principal, perform full early closure
  if (prepaymentPaise === currentRemainingPrincipalPaise) {
    return processEarlyClosure(customer, prepaymentRupees, paymentDate, options.remarks || 'Full payoff via prepayment');
  }

  const newRemainingPrincipalPaise = currentRemainingPrincipalPaise - prepaymentPaise;
  const monthlyRate = Number(customer.interestRate) / 100 || 0.02;

  // Identify remaining pending EMIs
  const paidEmis = customer.emiSchedule.filter(e => e.status === 'Paid' || e.status === 'Closed');
  const pendingEmis = customer.emiSchedule.filter(e => e.status !== 'Paid' && e.status !== 'Closed');

  let newPendingSchedule = [];

  if (strategy === 'REDUCE_TENURE') {
    // Keep same monthly EMI, calculate how many months needed for the smaller principal
    const currentEmiPaise = pendingEmis[0]?.emiAmountPaise || toPaise(pendingEmis[0]?.emiAmount);

    let remainingBalPaise = newRemainingPrincipalPaise;
    let emiCounter = paidEmis.length + 1;
    const lastPaidDueDate = paidEmis.length > 0 ? paidEmis[paidEmis.length - 1].dueDate : customer.loanStartDate;

    while (remainingBalPaise > 0) {
      const interestPaise = Math.round(remainingBalPaise * monthlyRate);
      let principalPaidPaise = currentEmiPaise - interestPaise;

      if (principalPaidPaise <= 0) {
        principalPaidPaise = remainingBalPaise;
      }
      if (principalPaidPaise > remainingBalPaise) {
        principalPaidPaise = remainingBalPaise;
      }

      remainingBalPaise = Math.max(0, remainingBalPaise - principalPaidPaise);
      const dueDate = addMonthsSafely(lastPaidDueDate, emiCounter - paidEmis.length);

      newPendingSchedule.push({
        emiNumber: emiCounter,
        dueDate,
        emiAmountPaise: currentEmiPaise,
        interestPaidPaise: interestPaise,
        principalPaidPaise,
        remainingBalancePaise: remainingBalPaise,
        paidAmountPaise: 0,
        lateFeePaise: 0,
        totalOutstandingPaise: currentEmiPaise,
        emiAmount: toRupees(currentEmiPaise),
        interestPaid: toRupees(interestPaise),
        principalPaid: toRupees(principalPaidPaise),
        remainingBalance: toRupees(remainingBalPaise),
        paidAmount: 0,
        paidDate: null,
        lateFee: 0,
        totalOutstanding: toRupees(currentEmiPaise),
        status: 'Pending',
        remarks: ''
      });

      emiCounter++;
    }
  } else {
    // REDUCE_EMI: keep remaining months count, recalculate lower EMI in paise
    const remainingMonths = pendingEmis.length;
    const lowerEmiPaise = calculateEmiAmountPaise(newRemainingPrincipalPaise, monthlyRate, remainingMonths);
    let remainingBalPaise = newRemainingPrincipalPaise;

    for (let i = 0; i < remainingMonths; i++) {
      const origEmi = pendingEmis[i];
      const interestPaise = Math.round(remainingBalPaise * monthlyRate);
      let principalPaidPaise = lowerEmiPaise - interestPaise;

      if (i === remainingMonths - 1 || principalPaidPaise > remainingBalPaise) {
        principalPaidPaise = remainingBalPaise;
      }

      remainingBalPaise = Math.max(0, remainingBalPaise - principalPaidPaise);

      newPendingSchedule.push({
        ...origEmi,
        emiAmountPaise: lowerEmiPaise,
        interestPaidPaise: interestPaise,
        principalPaidPaise,
        remainingBalancePaise: remainingBalPaise,
        totalOutstandingPaise: lowerEmiPaise,
        emiAmount: toRupees(lowerEmiPaise),
        interestPaid: toRupees(interestPaise),
        principalPaid: toRupees(principalPaidPaise),
        remainingBalance: toRupees(remainingBalPaise),
        totalOutstanding: toRupees(lowerEmiPaise),
        status: 'Pending'
      });
    }
  }

  customer.emiSchedule = [...paidEmis, ...newPendingSchedule];
  const updatedCustomer = recalculateCustomerEmiStatus(customer, paymentDate);

  return {
    updatedCustomer,
    prepaymentSummary: {
      prepaymentRupees: toRupees(prepaymentPaise),
      prepaymentPaise,
      strategy,
      priorPrincipalRupees: toRupees(currentRemainingPrincipalPaise),
      newPrincipalRupees: toRupees(newRemainingPrincipalPaise),
      newRemainingTenureMonths: newPendingSchedule.length,
      newMonthlyEmiRupees: newPendingSchedule.length > 0 ? newPendingSchedule[0].emiAmount : 0
    }
  };
}
