import { detectProblem, buildEscalationChatReply } from '../utils/problemDetector.js';
import { db } from '../database/db.js';

describe('Problem Detection & Owner Escalation Engine', () => {
  test('flags inverter breakdown as a big problem', () => {
    const res = detectProblem('my inverter is not working and showing red light');
    expect(res.isProblem).toBe(true);
    expect(res.isBigProblem).toBe(true);
    expect(res.category).toBe('INVERTER_FAULT');
    expect(res.severity).toBe('HIGH');
  });

  test('flags smoke or burning hazard as critical big problem', () => {
    const res = detectProblem('there is smoke and burning smell from the solar switch');
    expect(res.isBigProblem).toBe(true);
    expect(res.category).toBe('SAFETY_HAZARD');
    expect(res.severity).toBe('CRITICAL');
  });

  test('flags zero generation as a big problem', () => {
    const res = detectProblem('solar is not generating any power today, zero units');
    expect(res.isBigProblem).toBe(true);
    expect(res.category).toBe('ZERO_GENERATION');
  });

  test('flags broken panel or physical damage', () => {
    const res = detectProblem('one solar panel glass is broken after tree fell');
    expect(res.isBigProblem).toBe(true);
    expect(res.category).toBe('PHYSICAL_DAMAGE');
  });

  test('flags payment deduction failure', () => {
    const res = detectProblem('money deducted from bank account but emi still showing pending');
    expect(res.isBigProblem).toBe(true);
    expect(res.category).toBe('PAYMENT_FAILURE');
  });

  test('flags Tamil critical problem', () => {
    const res = detectProblem('சோலார் இன்வெர்ட்டர் பழுது வேலை செய்யவில்லை');
    expect(res.isBigProblem).toBe(true);
  });

  test('does NOT flag routine generation calculation or general queries as big problem', () => {
    expect(detectProblem('tell me how many kw for sunju').isBigProblem).toBe(false);
    expect(detectProblem('how much solar electricity will my system generate?').isBigProblem).toBe(false);
    expect(detectProblem('when is my next emi due').isBigProblem).toBe(false);
    expect(detectProblem('how often should I clean my solar panels?').isBigProblem).toBe(false);
    expect(detectProblem('what is pm surya ghar subsidy').isBigProblem).toBe(false);
  });

  test('builds escalation chat reply with customer info and short note', () => {
    const customer = {
      fullName: 'Santhosh Kumar r',
      customerId: 'SOL-1002',
      mobileNumber: '8072454996'
    };
    const problem = {
      isProblem: true,
      isBigProblem: true,
      category: 'INVERTER_FAULT',
      severity: 'HIGH',
      summaryEn: 'Solar Inverter Breakdown / System Fault',
      summaryTa: 'சோலார் இன்வெர்ட்டர் பழுது'
    };

    const reply = buildEscalationChatReply({
      customer,
      problem,
      message: 'inverter stopped working with error E03',
      language: 'en'
    });

    expect(reply).toContain('Urgent Incident Note Dispatched to Owner Portal');
    expect(reply).toContain('Santhosh Kumar r');
    expect(reply).toContain('SOL-1002');
    expect(reply).toContain('8072454996');
    expect(reply).toContain('+91 80724 54996');
  });

  test('builds Tamil escalation chat reply with emergency guidance and owner helpline', () => {
    const customer = {
      fullName: 'Santhosh Kumar r',
      customerId: 'SOL-1002',
      mobileNumber: '8072454996'
    };
    const problem = {
      isProblem: true,
      isBigProblem: true,
      category: 'SAFETY_HAZARD',
      severity: 'CRITICAL',
      summaryEn: 'Critical Safety Hazard (Smoke / Spark / Fire Risk)',
      summaryTa: 'உடனடி பாதுகாப்பு அபாயம் (புகை / தீ / மின்கசிவு)'
    };

    const reply = buildEscalationChatReply({
      customer,
      problem,
      message: 'இன்வெர்ட்டரில் இருந்து புகை வருகிறது',
      language: 'ta'
    });

    expect(reply).toContain('அவசர தொழில்நுட்ப குறிப்பு நிர்வாகி தளத்திற்கு');
    expect(reply).toContain('Santhosh Kumar r');
    expect(reply).toContain('SOL-1002');
    expect(reply).toContain('+91 80724 54996');
    expect(reply).toContain('இன்வெர்ட்டர் AC Isolator சுவிட்சை உடனடியாக அணைக்கவும்');
  });

  test('dispatches short note to notifications and audit_logs in db for owner portal', async () => {
    const custId = 'SOL-TEST-999';
    const problem = detectProblem('inverter is not working with red light');
    expect(problem.isBigProblem).toBe(true);

    const shortNote = `Test Customer (${custId}) - ${problem.summaryEn}: "inverter is not working with red light"`;

    // Clean prior test records
    await db.deleteMany('notifications', { customerId: custId });
    await db.deleteMany('audit_logs', { customerId: custId });

    // Simulate dispatch
    await db.create('notifications', {
      role: 'admin',
      type: 'CUSTOMER_PROBLEM_ALERT',
      priority: 'urgent',
      title: `🚨 ${problem.summaryEn}`,
      message: `Short Note: ${shortNote}. Contact: 9876543210. Immediate owner attention requested.`,
      customerId: custId,
      customerName: 'Test Customer',
      customerPhone: '9876543210',
      issueCategory: problem.category,
      severity: problem.severity,
      read: false,
      createdAt: new Date().toISOString()
    });

    await db.create('audit_logs', {
      action: 'CUSTOMER_PROBLEM_ESCALATION',
      category: 'SUPPORT',
      details: shortNote,
      customerId: custId,
      performedBy: 'Test Customer',
      severity: problem.severity,
      timestamp: new Date().toISOString()
    });

    // Verify stored correctly for Owner Portal
    const ownerNotifs = await db.find('notifications', { role: 'admin', customerId: custId });
    expect(ownerNotifs.length).toBe(1);
    expect(ownerNotifs[0].type).toBe('CUSTOMER_PROBLEM_ALERT');
    expect(ownerNotifs[0].priority).toBe('urgent');
    expect(ownerNotifs[0].message).toContain('Short Note: Test Customer');

    const auditEntries = await db.find('audit_logs', { customerId: custId });
    expect(auditEntries.length).toBe(1);
    expect(auditEntries[0].action).toBe('CUSTOMER_PROBLEM_ESCALATION');

    // Cleanup
    await db.deleteMany('notifications', { customerId: custId });
    await db.deleteMany('audit_logs', { customerId: custId });
  });
});
