/**
 * Problem Detection & Owner Escalation Engine
 * Identifies high-severity customer issues (inverter failure, zero power, smoke, physical damage, payment discrepancies)
 * and dispatches short alert notes to the Owner/Admin Portal.
 */

export function detectProblem(message = '') {
  const text = String(message || '').toLowerCase().trim();

  // 1. Critical Safety Hazards (Smoke, Fire, Spark, Shock, Blast)
  if (/\b(smoke|burning|smell|spark|sparking|fire|blast|explosion|electric shock|shock|short circuit|புகை|வெடிப்பு|தீ|ஷாக்|எரிகிறது)\b/i.test(text)) {
    return {
      isProblem: true,
      isBigProblem: true,
      category: 'SAFETY_HAZARD',
      severity: 'CRITICAL',
      summaryEn: 'Critical Safety Hazard (Smoke / Spark / Fire Risk)',
      summaryTa: 'உடனடி பாதுகாப்பு அபாயம் (புகை / தீ / மின்கசிவு)'
    };
  }

  // 2. Inverter Breakdown & Error Codes (handles "inverter is not working", "inverter error", "red light", etc.)
  if (
    /(inverter.*?(?:not working|down|dead|off|stopped|fault|error|tripped|trip|blown|fail|warning)|error code|red light|fault code|inverter error|e0[1-9]|f0[1-9]|இன்வெர்ட்டர்.*?(?:வேலை செய்யவில்லை|பழுது|ஆஃப்|எர்ரர்|ட்ரிப்))/i.test(text) ||
    (/(inverter|இன்வெர்ட்டர்)/i.test(text) && /(not working|fault|error|broken|stopped|பழுது|வேலை செய்யவில்லை)/i.test(text))
  ) {
    return {
      isProblem: true,
      isBigProblem: true,
      category: 'INVERTER_FAULT',
      severity: 'HIGH',
      summaryEn: 'Solar Inverter Breakdown / System Fault',
      summaryTa: 'சோலார் இன்வெர்ட்டர் பழுது / தவறு குறியீடு'
    };
  }

  // 3. Zero Generation / Power Outage / Complete Failure
  if (
    /(zero generation|no generation|0 generation|not generating|not producing|generation stopped|no power|no current|current not coming|solar not working|solar system down|generation dropped drastically|தயாரிக்கவில்லை|உற்பத்தி இல்லை|கரண்ட் வரவில்லை|உற்பத்தி நின்றுவிட்டது)/i.test(text) ||
    (/(solar|சோலார்|கரண்ட்|மின்சாரம்)/i.test(text) && /(no power|not generating|stopped|zero|வரவில்லை|உற்பத்தி இல்லை|வேலை செய்யவில்லை)/i.test(text))
  ) {
    return {
      isProblem: true,
      isBigProblem: true,
      category: 'ZERO_GENERATION',
      severity: 'HIGH',
      summaryEn: 'Zero Solar Generation / Total System Outage',
      summaryTa: 'சோலார் மின் உற்பத்தி முற்றிலும் நின்றுவிட்டது'
    };
  }

  // 4. Physical PV Module or Roof Structure Damage
  if (
    /(panel.*?(?:broken|crack|cracked|damaged|shattered|fell)|glass.*?(?:broken|crack)|structure.*?(?:bent|broken|loose|rusted)|leakage|water leaking|roof damage|cyclone damage|உடைந்துவிட்டது|கண்ணாடி உடைந்தது|பேனல்.*?(?:பழுது|உடை))/i.test(text) ||
    (/(panel|பேனல்)/i.test(text) && /(broken|crack|damage|shattered|உடை|சேதம்)/i.test(text))
  ) {
    return {
      isProblem: true,
      isBigProblem: true,
      category: 'PHYSICAL_DAMAGE',
      severity: 'HIGH',
      summaryEn: 'Physical Solar Panel / Roof Structure Damage',
      summaryTa: 'சோலார் பேனல் அல்லது கட்டமைப்பு சேதம்'
    };
  }

  // 5. TNEB / Net-Meter Malfunction or Excessive Billing
  if (
    /(net meter.*?(?:stopped|not working|reverse|error|fault)|meter not running|excessive eb bill|huge eb bill|bill not reduced|meter complaint|மீட்டர் ஓடவில்லை|நெட் மீட்டர்.*?(?:பழுது|பிரச்சனை)|அதிக கரண்ட் பில்)/i.test(text) ||
    (/(net meter|tneb meter|மீட்டர்)/i.test(text) && /(not working|stopped|error|fault|பழுது|ஓடவில்லை)/i.test(text))
  ) {
    return {
      isProblem: true,
      isBigProblem: true,
      category: 'METER_TNEB_ISSUE',
      severity: 'HIGH',
      summaryEn: 'TANGEDCO Net-Meter Stoppage / Metering Dispute',
      summaryTa: 'TNEB நெட்-மீட்டர் பழுது / பில் முரண்பாடு'
    };
  }

  // 6. Payment / EMI Deduction Discrepancy
  if (
    /(money deducted|amount debited|deducted from bank|payment failed|paid but not updated|double deduction|double debited|பணம் பிடித்தம்|வங்கி பிடித்தம்|தவணை அப்டேட் ஆகவில்லை)/i.test(text) ||
    (/(deducted|debited|பிடித்தம்)/i.test(text) && /(not updated|pending|failed|திரும்ப|வங்கி)/i.test(text))
  ) {
    return {
      isProblem: true,
      isBigProblem: true,
      category: 'PAYMENT_FAILURE',
      severity: 'HIGH',
      summaryEn: 'Bank Debited but EMI Payment Not Updated',
      summaryTa: 'வங்கிக் கணக்கில் பணம் பிடித்தம் செய்யப்பட்டது, ஆனால் EMI அப்டேட் ஆகவில்லை'
    };
  }

  // 7. General Minor Complaints / Routine Queries
  if (/\b(problem|issue|complaint|trouble|help me|not proper|பழுது|பிரச்சனை)\b/i.test(text)) {
    return {
      isProblem: true,
      isBigProblem: false,
      category: 'GENERAL_INQUIRY',
      severity: 'NORMAL',
      summaryEn: 'General Technical or Account Inquiry',
      summaryTa: 'பொதுவான தொழில்நுட்ப அல்லது கணக்கு விசாரணை'
    };
  }

  return {
    isProblem: false,
    isBigProblem: false,
    category: 'NONE',
    severity: 'LOW',
    summaryEn: '',
    summaryTa: ''
  };
}

/**
 * Generates the reassuring customer response when an incident has been forwarded to the owner portal.
 */
export function buildEscalationChatReply({ customer, problem, message, language = 'en' }) {
  const isTa = language === 'ta' || /[அ-ஹ]/.test(message);
  const custName = customer?.fullName || 'Valued Customer';
  const custId = customer?.customerId || 'Registered Account';
  const phone = customer?.mobileNumber || '+91 80724 54996';
  const shortNote = `${custName} (${custId}) - ${problem.summaryEn}: "${message.slice(0, 100)}"`;

  if (isTa) {
    let safetyAdvice = '';
    if (problem.category === 'SAFETY_HAZARD') {
      safetyAdvice = '\n⚠️ **உடனடி பாதுகாப்பு வழிகாட்டல்**: தயவுசெய்து இன்வெர்ட்டர் AC Isolator சுவிட்சை உடனடியாக அணைக்கவும். ஈரமான கைகளாலோ கம்பிகளையோ தொட வேண்டாம்!';
    } else if (problem.category === 'INVERTER_FAULT' || problem.category === 'ZERO_GENERATION') {
      safetyAdvice = '\n💡 **முதலுதவி குறிப்பு**: இன்வெர்ட்டர் திரையில் தோன்றும் எர்ரர் குறியீட்டை (Error Code) குறித்துக் கொள்ளவும். மெயின் பிரேக்கரை ரீசெட் செய்ய முயற்சிக்க வேண்டாம்.';
    }

    return `🚨 **அவசர தொழில்நுட்ப குறிப்பு நிர்வாகி தளத்திற்கு (Owner Portal) வெற்றிகரமாக அனுப்பப்பட்டது**

உங்கள் பிரச்சனை தீவிரமானதாக கண்டறியப்பட்டு, **MRS SOLAR நிர்வாகி கட்டுப்பாட்டு மையத்திற்கு (Owner Portal)** உடனடி தீர்வுக்காக அனுப்பப்பட்டுள்ளது:

📝 **அனுப்பப்பட்ட சுருக்கக் குறிப்பு (Short Note)**:
*"${shortNote}"*

👤 **வாடிக்கையாளர்**: ${custName} (${custId})
📱 **தொடர்பு எண்**: ${phone}
⚡ **பிரச்சனை வகை**: ${problem.summaryTa}${safetyAdvice}

எங்கள் தொழில்நுட்ப பொறியாளர் குழு உங்களை நேரடியாக தொடர்பு கொண்டு இந்த பிரச்சனையை விரைவாக சரிசெய்வர். 
அவசர உதவிக்கு நீங்கள் எங்கள் நிர்வாகியை நேரடியாகவும் அழைக்கலாம்: **+91 80724 54996**.`;
  }

  let safetyAdvice = '';
  if (problem.category === 'SAFETY_HAZARD') {
    safetyAdvice = '\n⚠️ **Immediate Safety Precaution**: Please switch OFF the AC Isolator Breaker immediately. Do not touch any exposed wires or wet surfaces!';
  } else if (problem.category === 'INVERTER_FAULT' || problem.category === 'ZERO_GENERATION') {
    safetyAdvice = '\n💡 **Initial Advice**: Note down the specific Error Code displayed on the inverter screen. Avoid tampering with DC isolators.';
  }

  return `🚨 **Urgent Incident Note Dispatched to Owner Portal**

I have detected a high-priority issue and immediately forwarded a **short alert note** to the **MRS SOLAR Owner / Management Portal**:

📝 **Short Note Sent to Owner**:
*"${shortNote}"*

👤 **Customer**: ${custName} (${custId})
📱 **Contact Phone**: ${phone}
⚡ **Issue Category**: ${problem.summaryEn}${safetyAdvice}

Our field engineering team has been notified and will prioritize resolving this problem for you. For immediate emergency assistance, you can also contact the owner directly at **+91 80724 54996**.`;
}
