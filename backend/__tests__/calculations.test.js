import {
  calculateEmiAmount,
  calculateEmiAmountPaise,
  calculateLateFee,
  calculateLateFeePaise,
  generateAmortizationSchedule,
  recalculateCustomerEmiStatus,
  processPartialEmiPayment,
  calculateEarlyClosurePayoff,
  processEarlyClosure,
  applyPartPrepayment,
  toPaise,
  toRupees,
  formatPaise,
  isLeapYear,
  addMonthsSafely,
  getCalendarDaysDifference
} from '../utils/calculations.js';

describe('MRS SOLARI Calculation Rules', () => {

  // ───────────────────────────────────────────────────────────────────────────
  // 1. ORIGINAL CORE TESTS (Preserved for backwards compatibility)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Core Baseline Calculations', () => {
    test('EMI Amount Calculation (Standard Amortization Formula)', () => {
      const principal = 100000;
      const rate = 0.02; // 2% per month
      const duration = 12; // 12 months

      const emi = calculateEmiAmount(principal, rate, duration);
      // Calculated: 100000 * 0.02 * (1.02)^12 / ((1.02)^12 - 1) = 9455.96
      expect(emi).toBe(9455.96);
    });

    test('Amortization Schedule Generation', () => {
      const principal = 10000;
      const rate = 0.02;
      const duration = 3;
      const startDate = '2026-01-01';

      const schedule = generateAmortizationSchedule(principal, rate, duration, startDate);

      expect(schedule.length).toBe(3);

      // Check first payment due date
      expect(schedule[0].dueDate).toBe('2026-02-01');
      expect(schedule[1].dueDate).toBe('2026-03-01');
      expect(schedule[2].dueDate).toBe('2026-04-01');

      // Total principal paid across all cycles should equal starting principal
      const totalPrincipal = schedule.reduce((sum, item) => sum + item.principalPaid, 0);
      expect(Math.round(totalPrincipal)).toBe(10000);

      // Final remaining balance should be 0
      expect(schedule[2].remainingBalance).toBe(0);
    });

    test('Late Fee Penalty Accumulator (1% per day)', () => {
      const emiAmount = 5000;
      const dueDate = '2026-07-10';

      // Test case A: 5 days late
      const checkDateA = new Date('2026-07-15T12:00:00Z');
      const resA = calculateLateFee(dueDate, emiAmount, checkDateA);
      expect(resA.daysLate).toBe(5);
      expect(resA.penalty).toBe(250); // 5000 * 1% * 5 days = 250
      expect(resA.totalOutstanding).toBe(5250);

      // Test case B: 10 days late
      const checkDateB = new Date('2026-07-20T08:00:00Z');
      const resB = calculateLateFee(dueDate, emiAmount, checkDateB);
      expect(resB.daysLate).toBe(10);
      expect(resB.penalty).toBe(500); // 5000 * 1% * 10 days = 500
      expect(resB.totalOutstanding).toBe(5500);

      // Test case C: Not late (Due today)
      const checkDateC = new Date('2026-07-10T15:00:00Z');
      const resC = calculateLateFee(dueDate, emiAmount, checkDateC);
      expect(resC.daysLate).toBe(0);
      expect(resC.penalty).toBe(0);
      expect(resC.totalOutstanding).toBe(5000);

      // Test case D: Before due date
      const checkDateD = new Date('2026-07-08T09:00:00Z');
      const resD = calculateLateFee(dueDate, emiAmount, checkDateD);
      expect(resD.daysLate).toBe(0);
      expect(resD.penalty).toBe(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. INTEGER MONEY (PAISE) PRECISION & ZERO-DRIFT TESTS
  // ───────────────────────────────────────────────────────────────────────────
  describe('Integer Money (Paise) Anti-Drift Engine', () => {
    test('toPaise converts float amounts to exact integer paise without IEEE 754 drift', () => {
      expect(toPaise(100.5)).toBe(10050);
      expect(toPaise(9455.96)).toBe(945596);
      // Classic JS float bug: 0.1 + 0.2 === 0.30000000000000004
      expect(toPaise(0.1 + 0.2)).toBe(30);
      expect(toPaise(0)).toBe(0);
      expect(toPaise(null)).toBe(0);
    });

    test('toRupees converts integer paise accurately back to 2-decimal Rupees', () => {
      expect(toRupees(10050)).toBe(100.5);
      expect(toRupees(945596)).toBe(9455.96);
      expect(toRupees(30)).toBe(0.3);
      expect(toRupees(0)).toBe(0);
    });

    test('formatPaise produces localized INR currency strings', () => {
      const formatted = formatPaise(945596);
      expect(formatted).toContain('9,455.96');
    });

    test('Zero Rounding Drift: 12-month schedule total principal paid equals starting principal exactly in paise', () => {
      const principal = 100000; // ₹1,00,000 = 10,000,000 paise
      const initialPrincipalPaise = toPaise(principal);
      const schedule = generateAmortizationSchedule(principal, 0.02, 12, '2026-01-01');

      // Check every installment contains integer paise
      for (const emi of schedule) {
        expect(Number.isInteger(emi.emiAmountPaise)).toBe(true);
        expect(Number.isInteger(emi.interestPaidPaise)).toBe(true);
        expect(Number.isInteger(emi.principalPaidPaise)).toBe(true);
        expect(Number.isInteger(emi.remainingBalancePaise)).toBe(true);
      }

      // Sum of principal paid in paise must equal starting principal to the exact single paisa
      const totalPrincipalPaidPaise = schedule.reduce((sum, item) => sum + item.principalPaidPaise, 0);
      expect(totalPrincipalPaidPaise).toBe(initialPrincipalPaise);

      // Final remaining balance in paise must be exactly 0 (not 0.000000000001 or -0.000000000001)
      expect(schedule[11].remainingBalancePaise).toBe(0);
      expect(schedule[11].remainingBalance).toBe(0);
    });

    test('Zero Rounding Drift: 36-month multi-year schedule completes at exactly 0 paise', () => {
      const principal = 250000; // ₹2,50,000 = 25,000,000 paise
      const initialPrincipalPaise = toPaise(principal);
      const schedule = generateAmortizationSchedule(principal, 0.015, 36, '2026-01-01');

      expect(schedule.length).toBe(36);
      const totalPrincipalPaidPaise = schedule.reduce((sum, item) => sum + item.principalPaidPaise, 0);
      expect(totalPrincipalPaidPaise).toBe(initialPrincipalPaise);
      expect(schedule[35].remainingBalancePaise).toBe(0);
      expect(schedule[35].remainingBalance).toBe(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. LEAP YEAR & CALENDAR EDGE-CASE TESTS
  // ───────────────────────────────────────────────────────────────────────────
  describe('Leap Year & Month-End Clamping Tests', () => {
    test('isLeapYear identifies leap and non-leap years accurately', () => {
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2028)).toBe(true);
      expect(isLeapYear(2000)).toBe(true); // century leap year
      expect(isLeapYear(2025)).toBe(false);
      expect(isLeapYear(2026)).toBe(false);
      expect(isLeapYear(2100)).toBe(false); // century non-leap year
    });

    test('addMonthsSafely clamps Jan 31 to Feb 29 in leap year 2024, and Feb 28 in non-leap year 2025', () => {
      // Leap year 2024
      expect(addMonthsSafely('2024-01-31', 1)).toBe('2024-02-29');
      // Non-leap year 2025
      expect(addMonthsSafely('2025-01-31', 1)).toBe('2025-02-28');
      // Subsequent months preserve full month-ends
      expect(addMonthsSafely('2024-01-31', 2)).toBe('2024-03-31');
      expect(addMonthsSafely('2024-01-31', 3)).toBe('2024-04-30');
    });

    test('Loan starting on Feb 29 leap day advances accurately across non-leap and future leap years', () => {
      const leapDayStart = '2024-02-29';
      // 1 year later (2025 is non-leap): clamps to Feb 28
      expect(addMonthsSafely(leapDayStart, 12)).toBe('2025-02-28');
      // 4 years later (2028 is leap): hits Feb 29
      expect(addMonthsSafely(leapDayStart, 48)).toBe('2028-02-29');
    });

    test('Calendar days overdue calculation accurately counts Feb 29 during leap year', () => {
      // In 2024 (leap year), Feb 28 to Mar 1 is 2 days (Feb 29 exists)
      const daysOverdueLeap = getCalendarDaysDifference('2024-02-28', '2024-03-01');
      expect(daysOverdueLeap).toBe(2);

      // In 2025 (non-leap year), Feb 28 to Mar 1 is 1 day
      const daysOverdueNonLeap = getCalendarDaysDifference('2025-02-28', '2025-03-01');
      expect(daysOverdueNonLeap).toBe(1);

      // Overdue penalty check in leap year: 2 days late = 2% penalty
      const resLeap = calculateLateFee('2024-02-28', 10000, new Date('2024-03-01T00:00:00Z'));
      expect(resLeap.daysLate).toBe(2);
      expect(resLeap.penalty).toBe(200); // 10000 * 1% * 2 = 200

      // Overdue penalty check in non-leap year: 1 day late = 1% penalty
      const resNonLeap = calculateLateFee('2025-02-28', 10000, new Date('2025-03-01T00:00:00Z'));
      expect(resNonLeap.daysLate).toBe(1);
      expect(resNonLeap.penalty).toBe(100); // 10000 * 1% * 1 = 100
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. PARTIAL PAYMENT TESTS
  // ───────────────────────────────────────────────────────────────────────────
  describe('Partial Payment Processing', () => {
    let testCustomer;

    beforeEach(() => {
      const schedule = generateAmortizationSchedule(60000, 0.02, 6, '2026-01-01');
      testCustomer = {
        customerId: 'CUST-PARTIAL-TEST',
        fullName: 'Partial Payment Tester',
        loanAmount: 60000,
        loanAmountPaise: 6000000,
        interestRate: 2,
        loanStatus: 'Active',
        paymentStatus: 'Pending',
        emiSchedule: schedule
      };
    });

    test('Customer pays less than scheduled EMI amount: marks Partially Paid with exact remaining balance', () => {
      const emi1 = testCustomer.emiSchedule[0];
      const scheduledAmount = emi1.emiAmount; // ~₹10,714.49

      // Customer makes partial payment of ₹5,000 on due date
      const { updatedCustomer, paymentSummary } = processPartialEmiPayment(
        testCustomer,
        1,
        5000,
        new Date('2026-02-01T00:00:00Z')
      );

      expect(paymentSummary.isFullySettled).toBe(false);
      expect(paymentSummary.paymentAmountRupees).toBe(5000);
      expect(paymentSummary.paymentAmountPaise).toBe(500000);

      const updatedEmi1 = updatedCustomer.emiSchedule[0];
      expect(updatedEmi1.status).toBe('Partially Paid');
      expect(updatedEmi1.paidAmount).toBe(5000);
      expect(updatedEmi1.paidAmountPaise).toBe(500000);
      expect(updatedEmi1.unpaidAmountPaise).toBe(toPaise(scheduledAmount) - 500000);
      expect(updatedEmi1.totalOutstandingPaise).toBe(updatedEmi1.unpaidAmountPaise);
    });

    test('Overdue late fee is calculated strictly on the UNPAID balance, not the full EMI', () => {
      const emi1 = testCustomer.emiSchedule[0];
      const baseEmiPaise = emi1.emiAmountPaise;

      // Partial payment of ₹5,000 made on due date
      processPartialEmiPayment(testCustomer, 1, 5000, new Date('2026-02-01T00:00:00Z'));

      // Check status 5 days later (2026-02-06)
      const recalculated = recalculateCustomerEmiStatus(testCustomer, new Date('2026-02-06T00:00:00Z'));
      const overdueEmi = recalculated.emiSchedule[0];

      expect(overdueEmi.status).toBe('Overdue');

      const expectedUnpaidPaise = baseEmiPaise - 500000;
      // 1% per day on the unpaid portion: expectedUnpaidPaise * 0.01 * 5 days
      const expectedLateFeePaise = Math.round(expectedUnpaidPaise * 0.01 * 5);
      expect(overdueEmi.lateFeePaise).toBe(expectedLateFeePaise);
      expect(overdueEmi.lateFee).toBe(toRupees(expectedLateFeePaise));

      // Total outstanding is unpaid balance + late fee
      expect(overdueEmi.totalOutstandingPaise).toBe(expectedUnpaidPaise + expectedLateFeePaise);
    });

    test('Second payment clearing the remaining unpaid balance transitions EMI to Paid', () => {
      const emi1 = testCustomer.emiSchedule[0];
      const baseEmiAmount = emi1.emiAmount;

      // 1st Partial Payment: ₹6,000
      processPartialEmiPayment(testCustomer, 1, 6000, new Date('2026-02-01T00:00:00Z'));

      // 2nd Payment: clears remaining amount + 0 penalty (paid on due date)
      const remainingToClear = baseEmiAmount - 6000;
      const { updatedCustomer, paymentSummary } = processPartialEmiPayment(
        testCustomer,
        1,
        remainingToClear,
        new Date('2026-02-01T00:00:00Z')
      );

      expect(paymentSummary.isFullySettled).toBe(true);
      expect(updatedCustomer.emiSchedule[0].status).toBe('Paid');
      expect(updatedCustomer.emiSchedule[0].unpaidAmountPaise).toBe(0);
      expect(updatedCustomer.emiSchedule[0].totalOutstandingPaise).toBe(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. PART-PREPAYMENT TESTS (LUMP SUM TOWARDS PRINCIPAL)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Part-Prepayment Processing', () => {
    let testCustomer;

    beforeEach(() => {
      const schedule = generateAmortizationSchedule(100000, 0.02, 12, '2026-01-01');
      testCustomer = {
        customerId: 'CUST-PREPAY-TEST',
        fullName: 'Prepayment Tester',
        loanAmount: 100000,
        loanAmountPaise: 10000000,
        interestRate: 2,
        loanStartDate: '2026-01-01',
        loanStatus: 'Active',
        paymentStatus: 'Pending',
        emiSchedule: schedule
      };
    });

    test('Strategy REDUCE_TENURE: Lowers remaining principal while keeping EMI constant, shortening duration', () => {
      const initialPrincipal = testCustomer.loanAmount; // ₹1,00,000
      const initialTenure = testCustomer.emiSchedule.length; // 12 months

      // Customer makes a ₹40,000 lump sum prepayment towards principal
      const { updatedCustomer, prepaymentSummary } = applyPartPrepayment(testCustomer, 40000, {
        strategy: 'REDUCE_TENURE',
        paymentDate: '2026-01-01'
      });

      expect(prepaymentSummary.prepaymentRupees).toBe(40000);
      expect(prepaymentSummary.priorPrincipalRupees).toBe(initialPrincipal);
      expect(prepaymentSummary.newPrincipalRupees).toBe(60000);

      // Remaining tenure must be shorter than original 12 months
      expect(prepaymentSummary.newRemainingTenureMonths).toBeLessThan(initialTenure);
      expect(updatedCustomer.emiSchedule.length).toBeLessThan(initialTenure);

      // Final remaining balance in paise must be exactly 0
      const lastEmi = updatedCustomer.emiSchedule[updatedCustomer.emiSchedule.length - 1];
      expect(lastEmi.remainingBalancePaise).toBe(0);
    });

    test('Strategy REDUCE_EMI: Lowers monthly installment while preserving remaining tenure', () => {
      const origEmi = testCustomer.emiSchedule[0].emiAmount;

      // Customer makes a ₹30,000 lump sum prepayment
      const { updatedCustomer, prepaymentSummary } = applyPartPrepayment(testCustomer, 30000, {
        strategy: 'REDUCE_EMI',
        paymentDate: '2026-01-01'
      });

      expect(prepaymentSummary.newPrincipalRupees).toBe(70000);
      // Tenure stays 12 months
      expect(prepaymentSummary.newRemainingTenureMonths).toBe(12);

      // Monthly EMI must be lower than original
      expect(prepaymentSummary.newMonthlyEmiRupees).toBeLessThan(origEmi);
      expect(updatedCustomer.emiSchedule[0].emiAmount).toBeLessThan(origEmi);

      // Final balance is exactly 0 paise
      const lastEmi = updatedCustomer.emiSchedule[11];
      expect(lastEmi.remainingBalancePaise).toBe(0);
    });

    test('Rejects prepayment exceeding remaining principal balance', () => {
      expect(() => {
        applyPartPrepayment(testCustomer, 150000); // ₹1,50,000 > ₹1,00,000
      }).toThrow('cannot exceed remaining principal balance');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. EARLY CLOSURE (FORECLOSURE / FULL SETTLEMENT) TESTS
  // ───────────────────────────────────────────────────────────────────────────
  describe('Early Closure & Foreclosure Processing', () => {
    let testCustomer;

    beforeEach(() => {
      const schedule = generateAmortizationSchedule(50000, 0.02, 6, '2026-01-01');
      testCustomer = {
        customerId: 'CUST-CLOSURE-TEST',
        fullName: 'Early Closure Tester',
        loanAmount: 50000,
        loanAmountPaise: 5000000,
        interestRate: 2,
        loanStartDate: '2026-01-01',
        loanStatus: 'Active',
        paymentStatus: 'Pending',
        emiSchedule: schedule
      };
    });

    test('calculateEarlyClosurePayoff computes exact remaining principal without unearned future interest', () => {
      // Mark EMI #1 as paid
      testCustomer.emiSchedule[0].status = 'Paid';
      testCustomer.emiSchedule[0].paidAmount = testCustomer.emiSchedule[0].emiAmount;
      testCustomer.emiSchedule[0].paidAmountPaise = testCustomer.emiSchedule[0].emiAmountPaise;

      const quote = calculateEarlyClosurePayoff(testCustomer, new Date('2026-02-05T00:00:00Z'));

      expect(quote.remainingPrincipal).toBeLessThan(50000);
      expect(quote.totalPayoffAmount).toBe(quote.remainingPrincipal);
      // Customer saves all future unearned interest
      expect(quote.unearnedInterestSaved).toBeGreaterThan(0);
      expect(Number.isInteger(quote.totalPayoffAmountPaise)).toBe(true);
    });

    test('processEarlyClosure settles loan in full, completes status, and marks future EMIs as Closed', () => {
      const quote = calculateEarlyClosurePayoff(testCustomer, '2026-01-15');

      const { updatedCustomer, closureSummary } = processEarlyClosure(
        testCustomer,
        quote.totalPayoffAmount,
        '2026-01-15',
        'Customer chose early foreclosure'
      );

      // Loan completed
      expect(updatedCustomer.loanStatus).toBe('Completed');
      expect(updatedCustomer.paymentStatus).toBe('Paid');
      expect(updatedCustomer.remainingBalancePaise).toBe(0);
      expect(updatedCustomer.remainingBalance).toBe(0);
      expect(updatedCustomer.totalOutstandingAmountPaise).toBe(0);
      expect(updatedCustomer.totalOutstandingAmount).toBe(0);

      // All EMIs marked Closed
      for (const emi of updatedCustomer.emiSchedule) {
        expect(['Paid', 'Closed']).toContain(emi.status);
        expect(emi.totalOutstandingPaise).toBe(0);
      }

      expect(closureSummary.totalPayoffAmount).toBe(quote.totalPayoffAmount);
    });

    test('Rejects early closure when paid amount is insufficient', () => {
      const quote = calculateEarlyClosurePayoff(testCustomer, '2026-01-15');
      const insufficientAmount = quote.totalPayoffAmount - 1000;

      expect(() => {
        processEarlyClosure(testCustomer, insufficientAmount, '2026-01-15');
      }).toThrow('Insufficient payment for early closure');
    });
  });

});
