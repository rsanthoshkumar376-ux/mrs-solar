import { findMatchingCustomer, levenshtein } from '../utils/customerResolver.js';

describe('Customer Resolver Utility', () => {
  const mockCustomers = [
    {
      customerId: 'SOL-1001',
      fullName: 'deepi',
      solarCapacity: 1,
      mobileNumber: '08072454996',
      alternateNumber: '9342914032',
      solarCost: 1900,
      monthlyEmi: 35.31
    },
    {
      customerId: 'SOL-1002',
      fullName: 'Santhosh Kumar r',
      solarCapacity: 3,
      mobileNumber: '8072454996',
      alternateNumber: '9342914032',
      solarCost: 60000,
      monthlyEmi: 4727.98
    }
  ];

  test('calculates correct Levenshtein distance', () => {
    expect(levenshtein('sanju', 'sunju')).toBe(1);
    expect(levenshtein('santhosh', 'santosh')).toBe(1);
    expect(levenshtein('deepi', 'deepi')).toBe(0);
  });

  test('matches "tell me how many kw for sunju" to Santhosh Kumar r', () => {
    const matched = findMatchingCustomer('tell me how many kw for sunju', mockCustomers);
    expect(matched).toBeDefined();
    expect(matched.customerId).toBe('SOL-1002');
    expect(matched.solarCapacity).toBe(3);
  });

  test('matches "sanju emi status" to Santhosh Kumar r', () => {
    const matched = findMatchingCustomer('sanju emi status', mockCustomers);
    expect(matched).toBeDefined();
    expect(matched.customerId).toBe('SOL-1002');
  });

  test('matches "how many kw for deepi" to deepi', () => {
    const matched = findMatchingCustomer('how many kw for deepi', mockCustomers);
    expect(matched).toBeDefined();
    expect(matched.customerId).toBe('SOL-1001');
    expect(matched.solarCapacity).toBe(1);
  });

  test('matches by customer ID SOL-1001 and SOL-1002', () => {
    expect(findMatchingCustomer('what is emi for SOL-1001', mockCustomers)?.customerId).toBe('SOL-1001');
    expect(findMatchingCustomer('details of 1002', mockCustomers)?.customerId).toBe('SOL-1002');
  });

  test('returns null for unknown customer', () => {
    expect(findMatchingCustomer('tell me how many kw for Ramesh', mockCustomers)).toBeNull();
  });
});
