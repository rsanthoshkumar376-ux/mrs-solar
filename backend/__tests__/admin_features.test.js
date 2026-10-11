import { describe, test, expect, beforeEach } from '@jest/globals';
import { db } from '../database/db.js';
import { invalidateDashboardCache } from '../routes/admin.js';

describe('UnifiedDatabase Pagination & Indexing Methods', () => {
  beforeEach(async () => {
    // Populate test collection
    const existing = await db.find('test_pagination');
    for (const item of existing) {
      await db.deleteOne('test_pagination', { _id: item._id });
    }

    for (let i = 1; i <= 25; i++) {
      await db.create('test_pagination', {
        index: i,
        name: `Customer ${i}`,
        status: i % 2 === 0 ? 'Active' : 'Pending',
        createdAt: new Date(2026, 0, i).toISOString()
      });
    }
  });

  test('countDocuments returns exact count of matching records', async () => {
    const total = await db.countDocuments('test_pagination');
    expect(total).toBe(25);

    const activeCount = await db.countDocuments('test_pagination', { status: 'Active' });
    expect(activeCount).toBe(12);

    const pendingCount = await db.countDocuments('test_pagination', { status: 'Pending' });
    expect(pendingCount).toBe(13);
  });

  test('findPaginated returns correct page slice and pagination metadata', async () => {
    const page1 = await db.findPaginated('test_pagination', {}, { page: 1, limit: 10, sort: { index: 1 } });
    expect(page1.page).toBe(1);
    expect(page1.limit).toBe(10);
    expect(page1.total).toBe(25);
    expect(page1.totalPages).toBe(3);
    expect(page1.data.length).toBe(10);
    expect(page1.data[0].index).toBe(1);
    expect(page1.data[9].index).toBe(10);

    const page2 = await db.findPaginated('test_pagination', {}, { page: 2, limit: 10, sort: { index: 1 } });
    expect(page2.page).toBe(2);
    expect(page2.data.length).toBe(10);
    expect(page2.data[0].index).toBe(11);

    const page3 = await db.findPaginated('test_pagination', {}, { page: 3, limit: 10, sort: { index: 1 } });
    expect(page3.page).toBe(3);
    expect(page3.data.length).toBe(5);
    expect(page3.data[4].index).toBe(25);
  });

  test('findPaginated correctly respects query filters', async () => {
    const activePaginated = await db.findPaginated('test_pagination', { status: 'Active' }, { page: 1, limit: 5 });
    expect(activePaginated.total).toBe(12);
    expect(activePaginated.totalPages).toBe(3);
    expect(activePaginated.data.length).toBe(5);
    expect(activePaginated.data.every(d => d.status === 'Active')).toBe(true);
  });
});

describe('Bank CSV Parser & Reconciliation Matching Logic', () => {
  // Test helper simulating reconciler CSV matching
  function simulateCsvMatcher(csvText, customers) {
    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const dateIdx = headers.findIndex(h => h.includes('date'));
    const descIdx = headers.findIndex(h => h.includes('narration') || h.includes('desc'));
    const refIdx = headers.findIndex(h => h.includes('ref') || h.includes('utr'));
    const creditIdx = headers.findIndex(h => h.includes('credit') || h.includes('amount'));

    const extractUtr = (str) => {
      if (!str) return '';
      const match = str.match(/\b\d{12}\b/);
      return match ? match[0] : '';
    };

    const matched = [];
    const unmatched = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      const dateVal = parts[dateIdx] || '';
      const narrationVal = parts[descIdx] || '';
      const rawRefVal = parts[refIdx] || '';
      const amount = parseFloat(parts[creditIdx]) || 0;
      if (amount <= 0) continue;

      const utr = extractUtr(rawRefVal) || extractUtr(narrationVal) || '';

      let matchedCust = null;
      let matchedEmi = null;

      for (const cust of customers) {
        const pending = cust.emiSchedule.filter(e => e.status !== 'Paid');
        if (pending.length === 0) continue;

        if (utr && cust.submittedUtr && cust.submittedUtr === utr) {
          matchedCust = cust;
          matchedEmi = cust.emiSchedule.find(e => e.emiNumber === cust.requestingEmi) || pending[0];
          break;
        }

        const narrationClean = narrationVal.toLowerCase();
        const matchesMobile = cust.mobileNumber && narrationClean.includes(cust.mobileNumber);
        const matchesId = cust.customerId && narrationClean.includes(cust.customerId.toLowerCase());
        const amountMatch = pending.find(e => Math.abs(e.emiAmount - amount) <= 5);

        if (amountMatch && (matchesMobile || matchesId)) {
          matchedCust = cust;
          matchedEmi = amountMatch;
          break;
        }
      }

      if (matchedCust && matchedEmi) {
        matched.push({ amount, utr, customerId: matchedCust.customerId, emiNumber: matchedEmi.emiNumber });
      } else {
        unmatched.push({ amount, utr, narration: narrationVal });
      }
    }

    return { matched, unmatched };
  }

  test('reconciles payment when customer submitted UTR matches bank transaction UTR', () => {
    const customers = [
      {
        customerId: 'SOL-1001',
        fullName: 'Ramesh Kumar',
        mobileNumber: '9876543210',
        requestingEmi: 2,
        submittedUtr: '428190123456',
        emiSchedule: [
          { emiNumber: 1, emiAmount: 5500, status: 'Paid' },
          { emiNumber: 2, emiAmount: 5500, status: 'Pending' }
        ]
      }
    ];

    const csvData = `Date,Narration,Ref/UTR,Credit
15-10-2026,UPI/428190123456/CR/MRS SOLAR,428190123456,5500
15-10-2026,RANDOM UNRELATED TRANSFER,999999999999,1200`;

    const result = simulateCsvMatcher(csvData, customers);
    expect(result.matched.length).toBe(1);
    expect(result.matched[0].customerId).toBe('SOL-1001');
    expect(result.matched[0].emiNumber).toBe(2);
    expect(result.matched[0].amount).toBe(5500);

    expect(result.unmatched.length).toBe(1);
    expect(result.unmatched[0].amount).toBe(1200);
  });

  test('reconciles payment when narration contains customer mobile and amount matches EMI', () => {
    const customers = [
      {
        customerId: 'SOL-1002',
        fullName: 'Priya Sundar',
        mobileNumber: '9840123456',
        emiSchedule: [
          { emiNumber: 1, emiAmount: 4200, status: 'Pending' }
        ]
      }
    ];

    const csvData = `Date,Narration,Ref/UTR,Credit
16-10-2026,NEFT transfer from 9840123456 Priya,NEFT123456,4200`;

    const result = simulateCsvMatcher(csvData, customers);
    expect(result.matched.length).toBe(1);
    expect(result.matched[0].customerId).toBe('SOL-1002');
    expect(result.matched[0].emiNumber).toBe(1);
    expect(result.matched[0].amount).toBe(4200);
  });
});
