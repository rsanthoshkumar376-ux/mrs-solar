import { calculateEmiAmount, calculateLateFee, generateAmortizationSchedule } from '../utils/calculations.js';

describe('MRS SOLARI Calculation Rules', () => {
  
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
