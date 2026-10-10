import { getISTDateString, runDailyInterestAndPenaltyCheck } from '../utils/scheduler.js';
import { verifyCronAuth } from '../routes/cron.js';
import { db } from '../database/db.js';

describe('Midnight Audit Idempotency & Scheduler Tests', () => {

  describe('1. IST Calendar Date Normalization', () => {
    test('Calculates correct IST date across UTC boundaries (18:30 UTC = 00:00 IST next day)', () => {
      // 18:30 UTC on Oct 10 is exactly 00:00:00 IST on Oct 11
      const utcMidnightIST = new Date('2026-10-10T18:30:00.000Z');
      expect(getISTDateString(utcMidnightIST)).toBe('2026-10-11');
    });

    test('Calculates correct IST date during afternoon UTC', () => {
      // 12:00 UTC on Oct 10 is 17:30 IST on Oct 10
      const afternoonUTC = new Date('2026-10-10T12:00:00.000Z');
      expect(getISTDateString(afternoonUTC)).toBe('2026-10-10');
    });
  });

  describe('2. Idempotent Midnight Audit Execution', () => {
    const testCustomerId = 'TEST-CUST-IDEMPOTENT-001';
    const testDate = new Date('2026-11-15T00:00:00.000Z');
    const testDateIST = getISTDateString(testDate);

    beforeEach(async () => {
      // Clean up test data
      await db.deleteOne('customers', { customerId: testCustomerId }).catch(() => {});
      await db.deleteOne('audit_runs', { auditDate: testDateIST }).catch(() => {});

      // Create a test customer with 1 overdue EMI
      await db.create('customers', {
        customerId: testCustomerId,
        fullName: 'Test Customer Idempotency',
        loanAmount: 60000,
        loanStatus: 'Active',
        paymentStatus: 'Pending',
        latePaymentCharges: 0,
        emiSchedule: [
          {
            emiNumber: 1,
            dueDate: '2026-11-10', // 5 days overdue relative to testDate
            emiAmount: 5000,
            principalPaid: 4000,
            interestPaid: 1000,
            remainingBalance: 56000,
            status: 'Pending',
            paidAmount: 0,
            paidDate: null,
            lateFee: 0,
            totalOutstanding: 5000
          }
        ]
      });
    });

    afterEach(async () => {
      await db.deleteOne('customers', { customerId: testCustomerId }).catch(() => {});
      await db.deleteOne('audit_runs', { auditDate: testDateIST }).catch(() => {});
      // Clean notifications for test customer
      const notifs = await db.find('notifications', { customerId: testCustomerId });
      for (const n of notifs) {
        await db.deleteOne('notifications', { _id: n._id }).catch(() => {});
      }
    });

    test('First run calculates penalties, records audit_runs ledger, and notifies', async () => {
      const result = await runDailyInterestAndPenaltyCheck(testDate, {
        triggeredBy: 'test-runner'
      });

      expect(result.success).toBe(true);
      expect(result.alreadyRun).toBe(false);
      expect(result.auditDate).toBe(testDateIST);

      // Verify audit run was recorded in DB
      const ledgerEntry = await db.findOne('audit_runs', { auditDate: testDateIST, status: 'SUCCESS' });
      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry.status).toBe('SUCCESS');

      // Verify customer penalty was calculated: 5000 * 0.01 * 5 days = 250
      const updatedCustomer = await db.findOne('customers', { customerId: testCustomerId });
      expect(updatedCustomer.latePaymentCharges).toBe(250);
      expect(updatedCustomer.paymentStatus).toBe('Overdue');
      expect(updatedCustomer.emiSchedule[0].lateFee).toBe(250);
    });

    test('Second run on the same date with force=false skips execution (idempotency guarantee)', async () => {
      // First execution
      const run1 = await runDailyInterestAndPenaltyCheck(testDate, { triggeredBy: 'test-run-1' });
      expect(run1.alreadyRun).toBe(false);

      const customerAfterRun1 = await db.findOne('customers', { customerId: testCustomerId });
      const initialLateFee = customerAfterRun1.latePaymentCharges;
      expect(initialLateFee).toBe(250);

      const notifsCountAfterRun1 = (await db.find('notifications', { customerId: testCustomerId })).length;

      // Second execution on same date
      const run2 = await runDailyInterestAndPenaltyCheck(testDate, { triggeredBy: 'test-run-2' });
      expect(run2.success).toBe(true);
      expect(run2.alreadyRun).toBe(true);
      expect(run2.message).toContain('already completed');

      // Penalty must NOT be charged twice
      const customerAfterRun2 = await db.findOne('customers', { customerId: testCustomerId });
      expect(customerAfterRun2.latePaymentCharges).toBe(initialLateFee);

      // Notifications must NOT be duplicated
      const notifsCountAfterRun2 = (await db.find('notifications', { customerId: testCustomerId })).length;
      expect(notifsCountAfterRun2).toBe(notifsCountAfterRun1);
    });

    test('Running with force=true recalculates safely without duplicate notifications', async () => {
      // First execution
      await runDailyInterestAndPenaltyCheck(testDate, { triggeredBy: 'initial' });
      const notifsCountRun1 = (await db.find('notifications', { customerId: testCustomerId })).length;

      // Force re-run
      const forceResult = await runDailyInterestAndPenaltyCheck(testDate, { force: true, triggeredBy: 'manual-force' });
      expect(forceResult.success).toBe(true);
      expect(forceResult.alreadyRun).toBe(false);

      // Verify penalties remain exact (no double charge)
      const customer = await db.findOne('customers', { customerId: testCustomerId });
      expect(customer.latePaymentCharges).toBe(250);

      // Verify 0 duplicate notifications were created
      const notifsCountRun2 = (await db.find('notifications', { customerId: testCustomerId })).length;
      expect(notifsCountRun2).toBe(notifsCountRun1);
    });
  });

  describe('3. Protected External Cron Authentication Middleware', () => {
    const validSecret = process.env.CRON_SECRET || 'mrs_solar_midnight_cron_secret_2026';

    function createMockRes() {
      const res = {
        statusCode: 200,
        responseData: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.responseData = data;
          return this;
        }
      };
      return res;
    }

    test('Rejects request with 401 when no secret is provided', () => {
      const req = { headers: {}, query: {}, body: {} };
      const res = createMockRes();
      let nextCalled = false;

      verifyCronAuth(req, res, () => { nextCalled = true; });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(401);
      expect(res.responseData.error).toBe('Unauthorized');
    });

    test('Rejects request with 401 when incorrect secret is provided', () => {
      const req = { headers: { 'x-cron-secret': 'wrong-secret' }, query: {}, body: {} };
      const res = createMockRes();
      let nextCalled = false;

      verifyCronAuth(req, res, () => { nextCalled = true; });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(401);
    });

    test('Accepts request via x-cron-secret header', () => {
      const req = { headers: { 'x-cron-secret': validSecret }, query: {}, body: {} };
      const res = createMockRes();
      let nextCalled = false;

      verifyCronAuth(req, res, () => { nextCalled = true; });

      expect(nextCalled).toBe(true);
      expect(res.statusCode).toBe(200);
    });

    test('Accepts request via Authorization: Bearer header', () => {
      const req = { headers: { authorization: `Bearer ${validSecret}` }, query: {}, body: {} };
      const res = createMockRes();
      let nextCalled = false;

      verifyCronAuth(req, res, () => { nextCalled = true; });

      expect(nextCalled).toBe(true);
    });

    test('Accepts request via ?secret= query parameter (for cron-job.org)', () => {
      const req = { headers: {}, query: { secret: validSecret }, body: {} };
      const res = createMockRes();
      let nextCalled = false;

      verifyCronAuth(req, res, () => { nextCalled = true; });

      expect(nextCalled).toBe(true);
    });
  });

});
