import { generateSmartChatResponse } from '../utils/aiEngines.js';

describe('Intelligent Conversational AI Copilot (aiEngines.js)', () => {
  const mockCustomers = [
    {
      customerId: 'SOL-1001',
      fullName: 'deepi',
      solarCapacity: 1,
      solarBrand: 'mrs',
      solarCost: 1900,
      downPayment: 1000,
      loanAmount: 900,
      monthlyEmi: 35.31,
      loanStatus: 'Active',
      paymentStatus: 'Pending',
      mobileNumber: '08072454996',
      emiSchedule: [
        { emiNumber: 1, dueDate: '2026-11-12', emiAmount: 35.31, status: 'Pending', lateFee: 0 }
      ]
    },
    {
      customerId: 'SOL-1002',
      fullName: 'Santhosh Kumar r',
      solarCapacity: 3,
      solarBrand: 'MRS Solar',
      solarCost: 60000,
      downPayment: 10000,
      loanAmount: 50000,
      monthlyEmi: 4727.98,
      loanStatus: 'Active',
      paymentStatus: 'Pending',
      mobileNumber: '8072454996',
      emiSchedule: [
        { emiNumber: 1, dueDate: '2026-11-12', emiAmount: 4727.98, status: 'Pending', lateFee: 0 }
      ]
    }
  ];

  test('answers "tell me how many kw for sunju" with 3 kW and Santhosh Kumar r', () => {
    const reply = generateSmartChatResponse({
      message: 'tell me how many kw for sunju',
      allCustomers: mockCustomers,
      role: 'admin'
    });

    expect(reply).toContain('Santhosh Kumar r');
    expect(reply).toContain('3 kW');
    expect(reply).toContain('SOL-1002');
    expect(reply).not.toContain('Here are the most popular topics');
  });

  test('answers "how many kw for deepi" with 1 kW and deepi', () => {
    const reply = generateSmartChatResponse({
      message: 'how many kw for deepi',
      allCustomers: mockCustomers,
      role: 'admin'
    });

    expect(reply).toContain('deepi');
    expect(reply).toContain('1 kW');
    expect(reply).toContain('SOL-1001');
    expect(reply).not.toContain('Here are the most popular topics');
  });

  test('answers EMI query for Sanju with due date and amount', () => {
    const reply = generateSmartChatResponse({
      message: 'when is emi due for sanju',
      allCustomers: mockCustomers,
      role: 'admin'
    });

    expect(reply).toContain('Santhosh Kumar r');
    expect(reply).toContain('4,727.98');
    expect(reply).toContain('2026-11-12');
  });

  test('lists all customers when requested', () => {
    const reply = generateSmartChatResponse({
      message: 'list all customers',
      allCustomers: mockCustomers,
      role: 'admin'
    });

    expect(reply).toContain('Santhosh Kumar r');
    expect(reply).toContain('deepi');
    expect(reply).toContain('3 kW');
    expect(reply).toContain('1 kW');
  });

  test('dynamically calculates arbitrary kW generation for 5kw', () => {
    const reply = generateSmartChatResponse({
      message: 'how many units will a 5kw system generate?',
      allCustomers: mockCustomers
    });

    expect(reply).toContain('5 kW');
    expect(reply).toContain('22'); // 5 * 4.4 = 22
  });

  test('handles Tamil query for Sunju correctly', () => {
    const reply = generateSmartChatResponse({
      message: 'sunju சோலார் திறன் என்ன',
      language: 'ta',
      allCustomers: mockCustomers,
      role: 'admin'
    });

    expect(reply).toContain('Santhosh Kumar r');
    expect(reply).toContain('3 kW');
    expect(reply).toContain('மின் உற்பத்தி');
  });

  test('does not output robotic "ask another question" boilerplate on general query', () => {
    const reply = generateSmartChatResponse({
      message: 'what should I consider before installing solar on my roof?',
      allCustomers: mockCustomers
    });

    expect(reply).not.toContain('Here are the most popular topics you can ask me about right away');
  });
});
