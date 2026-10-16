/**
 * Intelligent Solar & Fintech AI Engines for MRS SOLAR
 * Provides high-precision rule, financial calculation, and NLP fallbacks
 * ensuring 100% availability even when external cloud AI services are offline.
 */

/**
 * Intelligent Solar Inverter & Health Diagnostics
 */
export function generateSolarDiagnostics({
  solarCapacity = 3,
  currentKw = 0,
  dailyKwh = 0,
  gridVoltage = 230,
  inverterTemp = 42,
  weather = 'Sunny',
  lang = 'en'
}) {
  const cap = Number(solarCapacity) || 3;
  const current = Number(currentKw) || 0;
  const daily = Number(dailyKwh) || 0;
  const voltage = Number(gridVoltage) || 230;
  const temp = Number(inverterTemp) || 42;

  // Tamil Nadu average daily solar insolation: ~4.4 kWh per kW peak
  const expectedDailyKwh = +(cap * 4.4).toFixed(1);
  const hourOfDay = new Date().getHours();

  // Expected progress throughout the daylight hours (6 AM to 6 PM)
  let daylightFactor = 1.0;
  if (hourOfDay >= 6 && hourOfDay <= 18) {
    const peakHourDist = Math.abs(hourOfDay - 12);
    daylightFactor = Math.max(0.2, (1 - (peakHourDist / 7)));
  }

  const expectedProgressKwh = +(expectedDailyKwh * daylightFactor).toFixed(1);
  const efficiencyScore = Math.min(100, Math.max(30, Math.round((daily / (expectedProgressKwh || 1)) * 95)));

  let status = 'Optimal';
  let badgeColor = 'emerald';
  let titleEn = 'Peak Performance';
  let titleTa = 'உச்சக்கட்ட செயல்திறன்';
  let issues = [];
  let tipsEn = [];
  let tipsTa = [];

  // Check Grid Voltage Anomaly (Standard TN grid: 220V - 245V)
  if (voltage > 250) {
    issues.push('High AC Grid Voltage (Potential Inverter Curtailment / Trip)');
    tipsEn.push(`Grid voltage is high (${voltage}V). Ensure AC breaker connections are secure.`);
    tipsTa.push(`மின் கட்டமைப்பு மின்னழுத்தம் அதிகம் (${voltage}V). AC இணைப்புகளை சரிபார்க்கவும்.`);
    status = 'Needs Attention';
    badgeColor = 'amber';
  } else if (voltage < 200) {
    issues.push('Low AC Grid Voltage');
    tipsEn.push(`Grid voltage is low (${voltage}V), which may limit active solar export.`);
    tipsTa.push(`குறைந்த மின்னழுத்தம் (${voltage}V) சோலார் ஏற்றுமதியை குறைக்கலாம்.`);
  }

  // Check Inverter Temperature (Ideal < 55°C, Warning > 65°C)
  if (temp > 65) {
    issues.push('Elevated Heat-Sink Temperature');
    tipsEn.push(`Inverter temperature (${temp}°C) is above optimal range. Ensure ventilation area is clear.`);
    tipsTa.push(`இன்வெர்ட்டர் வெப்பநிலை (${temp}°C) அதிகமாக உள்ளது. காற்று புகும் வசதியை சரிபார்க்கவும்.`);
    status = 'Warning';
    badgeColor = 'rose';
  }

  // Check Panel Dust / Soiling Loss
  if (efficiencyScore < 75 && weather.toLowerCase().includes('sun')) {
    issues.push('Soiling / Dust Shading Detected');
    tipsEn.push('Estimated generation is ~18% lower than expected for clear sunshine. Clean PV panel glass with fresh water early in the morning.');
    tipsTa.push('தூசி அல்லது நிழல் காரணமாக உற்பத்தி 18% குறைந்துள்ளது. காலையில் சோலார் பேனல்களை நன்னீரால் சுத்தம் செய்யவும்.');
    status = 'Needs Attention';
    badgeColor = 'amber';
  }

  if (tipsEn.length === 0) {
    tipsEn.push(`System is performing exceptionally. Generating ~${(daily).toFixed(1)} units today against benchmark ${expectedDailyKwh} units.`);
    tipsTa.push(`சோலார் கட்டமைப்பு சிறப்பாக இயங்குகிறது. இன்று இதுவரை ${(daily).toFixed(1)} யூனிட்கள் உற்பத்தி செய்யப்பட்டுள்ளது.`);
  }

  const monthlyEstSavings = Math.round(expectedDailyKwh * 30 * 6.5); // Average ~₹6.5/unit TNEB slab credit

  return {
    score: efficiencyScore,
    status,
    badgeColor,
    title: lang === 'ta' ? titleTa : titleEn,
    expectedDailyKwh,
    actualDailyKwh: daily,
    monthlyProjectedUnits: Math.round(expectedDailyKwh * 30),
    monthlyEstSavings,
    detectedIssues: issues,
    recommendations: lang === 'ta' ? tipsTa : tipsEn,
    timestamp: new Date().toISOString()
  };
}

/**
 * Intelligent Conversational AI Knowledge Base
 */
export function generateSmartChatResponse({
  message = '',
  language = 'en',
  customer = null,
  adminStats = null,
  role = 'customer'
}) {
  const query = (message || '').toLowerCase().trim();
  const isTa = language === 'ta' || /[அ-ஹ]/.test(message);

  // 1. GREETINGS
  if (/^(hi|hello|vanakkam|வணக்கம்|hey|good morning|namaste)/i.test(query)) {
    if (isTa) {
      return role === 'customer' && customer
        ? `வணக்கம் ${customer.fullName || ''}! MRS SOLAR AI உதவியாளர் உங்களுக்காக தயாராக உள்ளார். உங்கள் சோலார் கடன் தவணை, உற்பத்தி அல்லது TNEB பில் சேமிப்பு பற்றி என்ன அறிய விரும்புகிறீர்கள்?`
        : `வணக்கம்! MRS SOLAR AI உதவியாளர். வாடிக்கையாளர் கடன்கள், சோலார் திட்டங்கள் அல்லது தணிக்கை விவரங்களை கேட்கலாம்.`;
    }
    return role === 'customer' && customer
      ? `Hello ${customer.fullName || 'there'}! I am your MRS SOLAR AI Copilot. How can I assist you with your solar loan, EMI schedule, or power generation today?`
      : `Hello! I am your MRS SOLAR Assistant. How can I help you inspect customer financing, solar installations, or portfolio metrics today?`;
  }

  // 2. EMI DUE DATE & AMOUNT
  if (/(next emi|due date|how much emi|pending emi|அடுத்த தவணை|தவணை தேதி|எவ்வளவு பணம்)/i.test(query)) {
    if (role === 'customer' && customer) {
      const schedule = Array.isArray(customer.emiSchedule) ? customer.emiSchedule : [];
      const nextPending = schedule.find(e => e.status !== 'Paid');

      if (!nextPending) {
        return isTa
          ? `வாழ்த்துகள்! உங்கள் சோலார் தவணைகள் அனைத்தும் முழுமையாக செலுத்தப்பட்டுவிட்டன. கடன் கணக்கு முடிவடைந்தது.`
          : `Congratulations! All your solar financing installments are completely paid off. You have zero pending dues.`;
      }

      if (isTa) {
        return `உங்கள் அடுத்த EMI தவணை #${nextPending.emiNumber}:
• தொகை: ₹${Number(nextPending.emiAmount).toLocaleString('en-IN')}
• செலுத்த வேண்டிய தேதி: ${nextPending.dueDate || 'மாதாந்திர தவணை'}
• தாமத கட்டணம்: ₹${nextPending.lateFee || 0}
• மொத்த நிலுவை: ₹${Number(customer.totalOutstandingAmount || nextPending.emiAmount).toLocaleString('en-IN')}

UPI அல்லது Google Pay மூலம் உடனே செலுத்த டாஷ்போர்டில் உள்ள "தவணை செலுத்து" பொத்தானைப் பயன்படுத்தவும்.`;
      }

      return `Your upcoming EMI installment #${nextPending.emiNumber} details:
• Installment Amount: ₹${Number(nextPending.emiAmount).toLocaleString('en-IN')}
• Due Date: ${nextPending.dueDate || 'Monthly due'}
• Late Penalty: ₹${nextPending.lateFee || 0}
• Total Outstanding: ₹${Number(customer.totalOutstandingAmount || nextPending.emiAmount).toLocaleString('en-IN')}

You can pay instantly via UPI / Google Pay using the "Pay Installment" button on your dashboard.`;
    }
  }

  // 3. SOLAR POWER GENERATION & UNITS
  if (/(generation|units|solar production|solar power|சோலார் உற்பத்தி|எத்தனை யூனிட்|மின் உற்பத்தி)/i.test(query)) {
    const cap = customer?.solarCapacity || 3;
    const dailyEst = (cap * 4.4).toFixed(1);
    const monthlyEst = Math.round(cap * 4.4 * 30);
    const annualEst = Math.round(cap * 4.4 * 365);
    const monthlySavings = Math.round(monthlyEst * 6.5);

    if (isTa) {
      return `உங்கள் ${cap} kW கூரை சோலார் அமைப்பின் உற்பத்தி விவரங்கள்:
• தினசரி சராசரி உற்பத்தி: ~${dailyEst} யூனிட்கள் (kWh)
• மாதாந்திர உற்பத்தி: ~${monthlyEst} யூனிட்கள்
• ஆண்டு உற்பத்தி: ~${annualEst.toLocaleString('en-IN')} யூனிட்கள்
• உத்தேச TNEB பில் சேமிப்பு: ~₹${monthlySavings.toLocaleString('en-IN')} / மாதம்

(தமிழ்நாட்டின் தினசரி சராசரி 4.4 மணிநேர சூரிய வெளிச்சத்தை அடிப்படையாகக் கொண்டது).`;
    }

    return `Your ${cap} kW Rooftop Solar generation profile:
• Average Daily Generation: ~${dailyEst} Units (kWh)
• Monthly Output: ~${monthlyEst} Units
• Annual Output: ~${annualEst.toLocaleString('en-IN')} Units
• Estimated TNEB Bill Savings: ~₹${monthlySavings.toLocaleString('en-IN')} / month

(Calculated based on standard Tamil Nadu solar irradiance of 4.4 peak sun hours/day).`;
  }

  // 4. PM SURYA GHAR SUBSIDY (CENTRAL GOVERNMENT)
  if (/(subsidy|pm surya|surya ghar|surya|மானியம்|சூரிய கர்)/i.test(query)) {
    if (isTa) {
      return `மத்திய அரசின் **PM சூர்யா கர்: முஃப்ட் பிஜ்லி யோஜனா** சோலார் மானிய விவரங்கள்:
• 1 kW அமைப்புக்கு: ₹30,000 மத்திய மானியம்
• 2 kW அமைப்புக்கு: ₹60,000 மத்திய மானியம்
• 3 kW அல்லது அதற்கு மேல்: ₹78,000 அதிகபட்ச நேரடி மானியம்

மானியம் பெறுவதற்கான தகுதிகள்:
1. சொந்த கூரை மற்றும் உள்நாட்டு TANGEDCO LT-1A மின் இணைப்பு.
2. நிறுவல் முடிந்ததும் மின்வாரிய நெட்-மீட்டர் பொருத்தப்பட்ட பிறகு மானியத் தொகை வாடிக்கையாளர் வங்கிக் கணக்கில் நேரடியாக வரவு வைக்கப்படும்.`;
    }

    return `**PM Surya Ghar: Muft Bijli Yojana** Central Government Solar Subsidy details:
• For 1 kW capacity: ₹30,000 Direct Subsidy
• For 2 kW capacity: ₹60,000 Direct Subsidy
• For 3 kW and above: Up to ₹78,000 Maximum Subsidy

Eligibility:
1. Residential rooftop with active TANGEDCO LT-1A domestic connection.
2. Following net-meter synchronization and inspection, the subsidy is credited directly to the customer's bank account via DBT.`;
  }

  // 5. TANGEDCO / TNEB NET-METERING SLABS
  if (/(tangedco|tneb|net meter|tariff|slab|கரண்ட் பில்|நெட் மீட்டர்|மின்வாரியம்)/i.test(query)) {
    if (isTa) {
      return `தமிழ்நாடு மின்சார ஒழுங்குமுறை ஆணையத்தின் (TNERC LT-1A) சோலார் நெட்-மீட்டர் விதிகள்:
• முதல் 100 யூனிட்கள் முற்றிலும் இலவசம் (தமிழக அரசின் இலவச மின்சாரம்).
• உங்கள் சோலார் உபரி மின்சாரம் பகலில் மின்சார கட்டமைப்புக்கு (Grid) ஏற்றுமதி செய்யப்பட்டு இருமாத கணக்கீட்டில் கழிக்கப்படும்.
• சோலார் மூலம் நீங்கள் உற்பத்தி செய்யும் மின்சாரத்திற்கு TNEB மின் கட்டணம் செலுத்த தேவையில்லை.`;
    }

    return `TANGEDCO / TNERC Tariff LT-1A Domestic Net-Metering Rules:
• The first 100 units bi-monthly are 100% free under Tamil Nadu government subsidy.
• Solar units exported to the grid during daylight hours are credited 1:1 against your bi-monthly consumption.
• Surplus solar export rolls over to future billing cycles, lowering your electricity bills to near zero.`;
  }

  // 6. UPI PAYMENT HELP
  if (/(upi|pay|payment|gpay|phonepe|paytm|செலுத்து|பணம் கட்ட)/i.test(query)) {
    if (isTa) {
      return `தவணை செலுத்துவது எப்படி:
1. வாடிக்கையாளர் தளத்தில் உள்ள "தவணை செலுத்து" பொத்தானை கிளிக் செய்யவும்.
2. தோன்றும் QR குறியீட்டை Google Pay, PhonePe அல்லது Paytm மூலம் ஸ்கேன் செய்து தொகையை செலுத்தவும்.
3. பணம் செலுத்தியதும் வங்கிக் குறிப்பு எண்ணை (12-இலக்க UTR) சமர்ப்பிக்கவும். நிர்வாகி உடனே சரிபார்த்து ரசீது வழங்குவார்.`;
    }

    return `How to pay your monthly EMI:
1. Tap the "Pay Installment" button in your Customer Dashboard.
2. Scan the instant UPI QR code using Google Pay, PhonePe, or Paytm.
3. Enter the 12-digit bank UTR reference code upon completion. Your official GST receipt will be available immediately after verification.`;
  }

  // 7. ADMIN STATS INQUIRY
  if (role === 'admin' && adminStats) {
    if (/(collection|overdue|portfolio|par|stats|profit|வசூல்|லாபம்)/i.test(query)) {
      if (isTa) {
        return `நிகழ்நேர நிதி நிலவரம்:
• மொத்த வாடிக்கையாளர்கள்: ${adminStats.totalCustomers || 0}
• வசூலிக்கப்பட்ட மூலதனம்: ₹${Number(adminStats.totalAmountCollected || 0).toLocaleString('en-IN')}
• நிலுவைத் தொகை: ₹${Number(adminStats.totalOutstandingAmount || 0).toLocaleString('en-IN')}
• தவணை கடந்த வாடிக்கையாளர்கள்: ${adminStats.overdueCustomers || 0}
• மொத்த லாபம் (வட்டி + அபராதம்): ₹${Number(adminStats.totalProfit || 0).toLocaleString('en-IN')}
• வசூல் திறன்: ${adminStats.parMetrics?.collectionEfficiencyPct || '100'}%`;
      }

      return `Live Financial & Portfolio Summary:
• Total Customers: ${adminStats.totalCustomers || 0}
• Total Capital Collected: ₹${Number(adminStats.totalAmountCollected || 0).toLocaleString('en-IN')}
• Net Outstanding Dues: ₹${Number(adminStats.totalOutstandingAmount || 0).toLocaleString('en-IN')}
• Overdue Customers: ${adminStats.overdueCustomers || 0}
• Total Interest & Late Fee Profit: ₹${Number(adminStats.totalProfit || 0).toLocaleString('en-IN')}
• Recovery Efficiency: ${adminStats.parMetrics?.collectionEfficiencyPct || '100'}%`;
    }
  }

  // DEFAULT HELPFUL FALLBACK
  if (isTa) {
    return `நான் MRS SOLAR-ன் செயற்கை நுண்ணறிவு உதவியாளர். நான் உங்களுக்கு பின்வரும் தகவல்களில் உதவ முடியும்:
1. அடுத்த தவணை (EMI) தேதி மற்றும் நிலுவைத் தொகை
2. உங்கள் சோலார் மின் உற்பத்தி மற்றும் EB பில் சேமிப்பு கணக்கீடு
3. மத்திய அரசு PM சூர்யா கர் ₹78,000 மானிய விவரங்கள்
4. TANGEDCO நெட்-மீட்டர் விதிகள்
5. UPI / Google Pay மூலம் கடன் தவணை செலுத்துதல்

உங்கள் கேள்வியை தெளிவாக உள்ளிடவும் அல்லது கீழே உள்ள விரைவு தலைப்புகளில் ஒன்றை தேர்ந்தெடுக்கவும்.`;
  }

  return `I am your MRS SOLAR AI Assistant. I can assist you with:
1. Your next EMI installment due date, amount, and late fee waiver status
2. Rooftop solar power generation & TNEB bi-monthly bill savings estimation
3. Central PM Surya Ghar ₹78,000 rooftop solar subsidy guidelines
4. TANGEDCO Net-metering LT-1A tariffs and bi-monthly credits
5. Instant 1-tap UPI / Google Pay repayment guidance

Please ask your question or select one of the quick prompt chips below.`;
}

/**
 * Intelligent Document & KYC Regex Heuristic Extraction
 * Used as fallback or enhancement when scanning images.
 */
export function extractKycFromText(rawText) {
  const text = rawText || '';
  const result = {
    fullName: '',
    fatherName: '',
    aadhaarNumber: '',
    panNumber: '',
    address: '',
    city: '',
    district: '',
    state: 'Tamil Nadu',
    pinCode: '',
    tnebConsumerNumber: '',
    mobileNumber: '',
    documentType: 'General'
  };

  // 1. Aadhaar Number (12 digits, often formatted as 4-4-4)
  const aadhaarMatch = text.match(/\b\d{4}\s\d{4}\s\d{4}\b/) || text.match(/\b\d{12}\b/);
  if (aadhaarMatch) {
    result.aadhaarNumber = aadhaarMatch[0].replace(/\s+/g, '');
    result.documentType = 'Aadhaar Card';
  }

  // 2. PAN Number (5 letters + 4 digits + 1 letter, e.g. ABCDE1234F)
  const panMatch = text.match(/\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/);
  if (panMatch) {
    result.panNumber = panMatch[0];
    result.documentType = 'PAN Card';
  }

  // 3. Indian PIN Code (6 digits starting with 6 for Tamil Nadu / South India)
  const pinMatch = text.match(/\b6[0-9]{5}\b/);
  if (pinMatch) {
    result.pinCode = pinMatch[0];
  }

  // 4. Mobile Number (10 digits starting with 6, 7, 8, or 9)
  const mobileMatch = text.match(/\b[6-9]\d{9}\b/);
  if (mobileMatch) {
    result.mobileNumber = mobileMatch[0];
  }

  // 5. TNEB Consumer Number (9 to 12 digits, often with hyphen or region code 01-09)
  const tnebMatch = text.match(/(?:consumer|service|sc|eb|tneb|tangedco)\s*(?:no|num|number)?\s*[:.-]?\s*([0-9]{9,12})/i) ||
                    text.match(/\b0[1-9][0-9]{7,10}\b/);
  if (tnebMatch) {
    result.tnebConsumerNumber = tnebMatch[1] || tnebMatch[0];
    result.documentType = 'TNEB Electricity Bill';
  }

  return result;
}
