/**
 * Intelligent Solar & Fintech AI Engines for MRS SOLAR
 * Provides high-precision rule, financial calculation, and NLP fallbacks
 * ensuring 100% availability even when external cloud AI services are offline.
 */

import { findMatchingCustomer } from './customerResolver.js';

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
 * Deep bilingual (Tamil & English) domain expertise on Solar EPC, Loans, Customers & TNEB
 */
export function generateSmartChatResponse({
  message = '',
  language = 'en',
  customer = null,
  allCustomers = [],
  adminStats = null,
  role = 'customer'
}) {
  const query = (message || '').toLowerCase().trim();
  const isTa = language === 'ta' || /[அ-ஹ]/.test(message);

  // 1. Resolve Target Customer if query references a specific customer
  const targetCustomer = customer || findMatchingCustomer(query, allCustomers);

  // 2. GREETINGS & POLITE CONVERSATIONAL OPENERS
  if (/^(hi|hello|hey|vanakkam|வணக்கம்|namaste|good morning|good afternoon|good evening|start|hoi|welcome)$/i.test(query.replace(/[^\w\u0B80-\u0BFF]/g, ''))) {
    if (isTa) {
      return targetCustomer
        ? `வணக்கம் ${targetCustomer.fullName || ''}! நான் MRS SOLAR AI உதவியாளர். உங்கள் ${targetCustomer.solarCapacity || 3} kW சோலார் கட்டமைப்பு, EMI தவணை தேதி அல்லது TNEB பில் சேமிப்பு பற்றி என்ன அறிய விரும்புகிறீர்கள்?`
        : `வணக்கம்! நான் MRS SOLAR AI உதவியாளர். வாடிக்கையாளர் சோலார் திறன் (kW), கடன் தவணை (EMI), மின் உற்பத்தி அல்லது மத்திய அரசு PM சூர்யா கர் மானியம் பற்றி என்னிடம் கேட்கலாம்.`;
    }
    return targetCustomer
      ? `Hello ${targetCustomer.fullName || 'there'}! I am your MRS SOLAR AI Copilot. How can I assist you with your ${targetCustomer.solarCapacity || 3} kW solar system, upcoming EMI installment, or power generation today?`
      : `Hello! I am your MRS SOLAR AI Copilot. Ask me about any customer's solar capacity (e.g. "how many kw for sunju"), upcoming EMI due dates, solar power generation, or PM Surya Ghar subsidies.`;
  }

  // 3. APPRECIATION / ACKNOWLEDGEMENT (e.g. "thanks", "ok", "super")
  if (/^(thanks|thank you|ok|okay|super|great|good|fine|got it|understood|நன்றி|சரி|சூப்பர்)$/i.test(query.replace(/[^\w\u0B80-\u0BFF]/g, ''))) {
    return isTa
      ? `மகிழ்ச்சி! MRS SOLAR பற்றிய வேறு ஏதேனும் விவரங்கள் அல்லது வாடிக்கையாளர் தகவல்கள் தேவைப்பட்டால் தயங்காமல் கேளுங்கள்.`
      : `You're welcome! Feel free to ask if you need details on any customer's system, loan status, or solar power generation.`;
  }

  // 4. SPECIFIC CUSTOMER SOLAR CAPACITY / KW QUERY
  // Matches "tell me how many kw for sunju", "how many kw for deepi", "sunju kw", "capacity of sanju", etc.
  if (targetCustomer && (
    /\b(kw|kwh|kilowatt|capacity|solar size|system size|how many kw|how much kw|solar capacity|பேனல் அளவு|திறன்|எத்தனை கிலோவாட்|எவ்வளவு kw)\b/i.test(query) ||
    !/(emi|due|payment|installment|loan|balance|outstanding|penalty|bill|contact|phone|address)/i.test(query)
  )) {
    const cap = Number(targetCustomer.solarCapacity) || 3;
    const dailyEst = (cap * 4.4).toFixed(1);
    const monthlyEst = Math.round(cap * 4.4 * 30);
    const annualEst = Math.round(cap * 4.4 * 365);
    const monthlySavings = Math.round(monthlyEst * 6.5);

    const relatedNoteTa = (targetCustomer.customerId === 'SOL-1003' && allCustomers.some(c => c.customerId === 'SOL-1002'))
      ? '\n\n*(குறிப்பு: நீங்கள் **Santhosh Kumar r** (ID: SOL-1002) பற்றி கேட்கிறீர்கள் என்றால், அவர்களின் சோலார் திறன் **3 kW** ஆகும்).*'
      : (targetCustomer.customerId === 'SOL-1002' && allCustomers.some(c => c.customerId === 'SOL-1003'))
      ? '\n\n*(குறிப்பு: நீங்கள் **Sanju** (ID: SOL-1003) பற்றி கேட்கிறீர்கள் என்றால், அவர்களின் சோலார் திறன் **1 kW** ஆகும்).*'
      : '';

    const relatedNoteEn = (targetCustomer.customerId === 'SOL-1003' && allCustomers.some(c => c.customerId === 'SOL-1002'))
      ? '\n\n*(Note: If you were referring to **Santhosh Kumar r** (ID: SOL-1002), their system capacity is **3 kW**).*'
      : (targetCustomer.customerId === 'SOL-1002' && allCustomers.some(c => c.customerId === 'SOL-1003'))
      ? '\n\n*(Note: If you were referring to **Sanju** (ID: SOL-1003), their system capacity is **1 kW**).*'
      : '';

    if (isTa) {
      return `**${targetCustomer.fullName}** (வாடிக்கையாளர் எண்: **${targetCustomer.customerId}**) அவர்களின் சோலார் கட்டமைப்பு **${cap} kW** திறன் கொண்டது.

⚡ **மின் உற்பத்தி விவரங்கள்:**
• **சோலார் திறன்**: ${cap} kW (${targetCustomer.solarBrand || 'Tier-1 Mono PERC'})
• **தினசரி உற்பத்தி**: ~${dailyEst} யூனிட்கள் (kWh)
• **மாதாந்திர உற்பத்தி**: ~${monthlyEst} யூனிட்கள்
• **வருடாந்திர உற்பத்தி**: ~${annualEst.toLocaleString('en-IN')} யூனிட்கள்
• **உத்தேச EB பில் சேமிப்பு**: ~₹${monthlySavings.toLocaleString('en-IN')} / மாதம்

💰 **கடன் & தவணை நிலை:**
• **சோலார் மொத்த செலவு**: ₹${Number(targetCustomer.solarCost || 0).toLocaleString('en-IN')}
• **முன்பணம்**: ₹${Number(targetCustomer.downPayment || 0).toLocaleString('en-IN')} | **கடன் தொகை**: ₹${Number(targetCustomer.loanAmount || 0).toLocaleString('en-IN')}
• **மாதாந்திர தவணை (EMI)**: ₹${Number(targetCustomer.monthlyEmi || 0).toLocaleString('en-IN')} / மாதம்
• **கடன் நிலை**: ${targetCustomer.loanStatus === 'Active' ? 'செயலில் உள்ளது (Active)' : targetCustomer.loanStatus}${relatedNoteTa}`;
    }

    return `**${targetCustomer.fullName}** (Customer ID: **${targetCustomer.customerId}**) has a **${cap} kW** Rooftop Solar System.

⚡ **System & Generation Details:**
• **Solar Capacity**: ${cap} kW (${targetCustomer.solarBrand || 'Tier-1 Mono PERC Modules'})
• **Average Daily Output**: ~${dailyEst} Units (kWh) / day
• **Estimated Monthly Generation**: ~${monthlyEst} Units (kWh) / month
• **Annual Output**: ~${annualEst.toLocaleString('en-IN')} Units / year
• **Estimated TNEB Bill Savings**: ~₹${monthlySavings.toLocaleString('en-IN')} / month

💰 **Financing & Loan Status:**
• **Total Solar System Cost**: ₹${Number(targetCustomer.solarCost || 0).toLocaleString('en-IN')}
• **Down Payment**: ₹${Number(targetCustomer.downPayment || 0).toLocaleString('en-IN')} | **Loan Principal**: ₹${Number(targetCustomer.loanAmount || 0).toLocaleString('en-IN')}
• **Monthly EMI**: ₹${Number(targetCustomer.monthlyEmi || 0).toLocaleString('en-IN')} / month
• **Loan Status**: ${targetCustomer.loanStatus || 'Active'} (${targetCustomer.paymentStatus || 'Pending'})${relatedNoteEn}`;
  }

  // 5. SPECIFIC CUSTOMER EMI, LOAN & DUE DATE QUERY
  // Matches "when is emi due for sunju", "sanju emi", "deepi pending emi", "due date of sanju", etc.
  if (targetCustomer && /(emi|due|payment|installment|loan|balance|outstanding|late fee|penalty|status|தவணை|கடன்|நிலுவை|கடைசி தேதி)/i.test(query)) {
    const schedule = Array.isArray(targetCustomer.emiSchedule) ? targetCustomer.emiSchedule : [];
    const nextPending = schedule.find(e => e.status !== 'Paid');

    if (!nextPending) {
      return isTa
        ? `வாழ்த்துகள்! **${targetCustomer.fullName}** (ID: ${targetCustomer.customerId}) அவர்களின் அனைத்து சோலார் கடன் தவணைகளும் முழுமையாக செலுத்தப்பட்டுவிட்டன. கணக்கில் எந்த நிலுவைத் தொகையும் இல்லை.`
        : `Great news! All installments for **${targetCustomer.fullName}** (ID: ${targetCustomer.customerId}) are fully paid off. Total outstanding balance is ₹0.`;
    }

    if (isTa) {
      return `**${targetCustomer.fullName}** (வாடிக்கையாளர் எண்: **${targetCustomer.customerId}**) தவணை விவரங்கள்:

📋 **தவணை எண்**: #${nextPending.emiNumber}
💵 **தவணை தொகை (EMI)**: ₹${Number(nextPending.emiAmount).toLocaleString('en-IN')}
📅 **செலுத்த வேண்டிய கடைசி தேதி**: ${nextPending.dueDate || 'அடுத்த தவணை'}
⚠️ **தாமதக் கட்டணம்**: ₹${nextPending.lateFee || 0}
🏦 **மொத்த கடன் நிலுவை**: ₹${Number(targetCustomer.totalOutstandingAmount || nextPending.emiAmount).toLocaleString('en-IN')}
📱 **தொடர்பு எண்**: ${targetCustomer.mobileNumber || 'N/A'}`;
    }

    return `EMI & Loan installment details for **${targetCustomer.fullName}** (Customer ID: **${targetCustomer.customerId}**):

📋 **Upcoming Installment**: #${nextPending.emiNumber}
💵 **EMI Due Amount**: ₹${Number(nextPending.emiAmount).toLocaleString('en-IN')}
📅 **Due Date**: ${nextPending.dueDate || 'Upcoming Monthly Due'}
⚠️ **Late Fee Penalty**: ₹${nextPending.lateFee || 0}
🏦 **Total Remaining Loan Balance**: ₹${Number(targetCustomer.totalOutstandingAmount || nextPending.emiAmount).toLocaleString('en-IN')}
📱 **Registered Mobile**: ${targetCustomer.mobileNumber || 'N/A'}`;
  }

  // 6. SPECIFIC CUSTOMER PROFILE / DETAILS / CONTACT QUERY
  if (targetCustomer && /(detail|details|info|information|profile|who is|tell me about|contact|address|phone|mobile|tneb|விவரம்|யார்|முகவரி)/i.test(query)) {
    if (isTa) {
      return `**${targetCustomer.fullName}** வாடிக்கையாளர் விவரங்கள்:

• **வாடிக்கையாளர் எண்**: ${targetCustomer.customerId}
• **தொடர்பு எண்**: ${targetCustomer.mobileNumber || 'N/A'} (மாற்று: ${targetCustomer.alternateNumber || 'N/A'})
• **முகவரி**: ${targetCustomer.address || ''}, ${targetCustomer.city || ''}, ${targetCustomer.district || 'Thiruvallur'} – ${targetCustomer.pinCode || '602001'}
• **TNEB நுகர்வோர் எண்**: ${targetCustomer.tnebConsumerNumber || 'N/A'}
• **சோலார் கட்டமைப்பு**: **${targetCustomer.solarCapacity || 3} kW** (${targetCustomer.solarBrand || 'MRS Solar'})
• **கடன் தொகை**: ₹${Number(targetCustomer.loanAmount || 0).toLocaleString('en-IN')} (மாதாந்திர தவணை: ₹${Number(targetCustomer.monthlyEmi || 0).toLocaleString('en-IN')})
• **கடன் நிலை**: ${targetCustomer.loanStatus || 'Active'}`;
    }

    return `Customer Profile for **${targetCustomer.fullName}**:

• **Customer ID**: ${targetCustomer.customerId}
• **Mobile Number**: ${targetCustomer.mobileNumber || 'N/A'} (Alternate: ${targetCustomer.alternateNumber || 'N/A'})
• **Installation Address**: ${targetCustomer.address || ''}, ${targetCustomer.city || ''}, ${targetCustomer.district || 'Thiruvallur'} – ${targetCustomer.pinCode || '602001'}
• **TNEB Consumer No**: ${targetCustomer.tnebConsumerNumber || 'N/A'}
• **Solar System Capacity**: **${targetCustomer.solarCapacity || 3} kW** (${targetCustomer.solarBrand || 'MRS Solar'})
• **Financing**: Total ₹${Number(targetCustomer.solarCost || 0).toLocaleString('en-IN')} | Loan ₹${Number(targetCustomer.loanAmount || 0).toLocaleString('en-IN')} | Monthly EMI ₹${Number(targetCustomer.monthlyEmi || 0).toLocaleString('en-IN')}
• **Loan Status**: ${targetCustomer.loanStatus || 'Active'} (${targetCustomer.paymentStatus || 'Pending'})`;
  }

  // 7. DIRECTORY / LIST ALL CUSTOMERS QUERY
  if (/(all customer|list customer|how many customer|show customer|customers list|வாடிக்கையாளர் பட்டியல்|எத்தனை வாடிக்கையாளர்கள்|வாடிக்கையாளர்கள்)/i.test(query)) {
    const list = Array.isArray(allCustomers) && allCustomers.length > 0 ? allCustomers : (targetCustomer ? [targetCustomer] : []);
    if (list.length > 0) {
      if (isTa) {
        return `MRS SOLAR பதிவு செய்யப்பட்ட **${list.length} வாடிக்கையாளர்கள்**:

${list.map((c, i) => `${i + 1}. **${c.fullName}** (எண்: **${c.customerId}**)
   • சோலார் திறன்: **${c.solarCapacity || 3} kW**
   • கடன் தொகை: ₹${Number(c.loanAmount || 0).toLocaleString('en-IN')} | EMI: ₹${Number(c.monthlyEmi || 0).toLocaleString('en-IN')}/மாதம்
   • தொலைபேசி: ${c.mobileNumber || 'N/A'} | நிலை: ${c.loanStatus || 'Active'}`).join('\n\n')}`;
      }

      return `MRS SOLAR currently manages **${list.length} registered customer accounts**:

${list.map((c, i) => `${i + 1}. **${c.fullName}** (ID: **${c.customerId}**)
   • **Solar Capacity**: **${c.solarCapacity || 3} kW** (${c.solarBrand || 'MRS Solar'})
   • **Loan Amount**: ₹${Number(c.loanAmount || 0).toLocaleString('en-IN')} | **EMI**: ₹${Number(c.monthlyEmi || 0).toLocaleString('en-IN')} / month
   • **Phone**: ${c.mobileNumber || 'N/A'} | **Status**: ${c.loanStatus || 'Active'} (${c.paymentStatus || 'Pending'})`).join('\n\n')}`;
    }
  }

  // 8. UNKNOWN CUSTOMER NAME QUERY (If user asked "for [name]" or "of [name]" but not found in DB)
  const unknownNameMatch = query.match(/(?:for|of|about)\s+([a-zA-Z\u0B80-\u0BFF]{3,15})/i);
  if (unknownNameMatch && !targetCustomer) {
    const attemptedName = unknownNameMatch[1];
    const registeredNames = (allCustomers || []).map(c => `• **${c.fullName}** (ID: ${c.customerId}) – ${c.solarCapacity || 3} kW System`).join('\n');
    if (isTa) {
      return `மன்னிக்கவும், எங்கள் தரவுத்தளத்தில் **"${attemptedName}"** என்ற பெயரில் வாடிக்கையாளர் பதிவு எதுவும் கிடைக்கவில்லை.

தற்போது பதிவு செய்யப்பட்டுள்ள வாடிக்கையாளர்கள்:
${registeredNames || '• Santhosh Kumar r (SOL-1002) – 3 kW\n• deepi (SOL-1001) – 1 kW'}

தயவுசெய்து எழுத்துப்பிழையை சரிபார்க்கவும் அல்லது மேலே உள்ள வாடிக்கையாளர் பற்றி கேட்கவும்.`;
    }

    return `I searched our records, but could not find a customer named **"${attemptedName}"**.

Currently registered customers in MRS SOLAR:
${registeredNames || '• **Santhosh Kumar r (Sunju)** (ID: SOL-1002) – 3 kW System\n• **deepi** (ID: SOL-1001) – 1 kW System'}

Please check the spelling or ask about one of the registered customers above!`;
  }

  // 9. DYNAMIC ARBITRARY KW SOLAR GENERATION CALCULATOR
  // Matches "how many units for 5kw", "5 kw generation", "10 kw output", etc.
  const kwMatch = query.match(/(\d+(?:\.\d+)?)\s*(?:kw|kwh|kilo\s*watt)/i);
  if (kwMatch) {
    const specifiedKw = parseFloat(kwMatch[1]);
    if (specifiedKw > 0 && specifiedKw <= 1000) {
      const dailyUnits = +(specifiedKw * 4.4).toFixed(1);
      const monthlyUnits = Math.round(specifiedKw * 4.4 * 30);
      const annualUnits = Math.round(specifiedKw * 4.4 * 365);
      const monthlySavings = Math.round(monthlyUnits * 6.5);

      if (isTa) {
        return `**${specifiedKw} kW** கூரை சோலார் அமைப்பின் மின் உற்பத்தி கணக்கீடு (தமிழ்நாடு 4.4 மணிநேர சூரிய வெளிச்சம்):

⚡ **தினசரி மின் உற்பத்தி**: ~**${dailyUnits} யூனிட்கள்** (kWh)
📅 **மாதாந்திர மின் உற்பத்தி**: ~**${monthlyUnits.toLocaleString('en-IN')} யூனிட்கள்**
☀️ **வருடாந்திர உற்பத்தி**: ~**${annualUnits.toLocaleString('en-IN')} யூனிட்கள்**
💰 **உத்தேச TNEB பில் சேமிப்பு**: ~**₹${monthlySavings.toLocaleString('en-IN')} / மாதம்**

(TANGEDCO நெட்-மீட்டர் மூலம் இந்த யூனிட்கள் உங்கள் இருமாத பில்லில் கழிக்கப்படும்).`;
      }

      return `Calculated generation for a **${specifiedKw} kW** Rooftop Solar System (Tamil Nadu benchmark: 4.4 Peak Sun Hours):

⚡ **Average Daily Output**: ~**${dailyUnits} Units** (kWh) / day
📅 **Monthly Generation**: ~**${monthlyUnits.toLocaleString('en-IN')} Units** (kWh) / month
☀️ **Annual Generation**: ~**${annualUnits.toLocaleString('en-IN')} Units** / year
💰 **Estimated TNEB Bill Savings**: ~**₹${monthlySavings.toLocaleString('en-IN')} / month**

*(Formula: Capacity ${specifiedKw} kW × 4.4 = Daily Units. Under TANGEDCO Net Metering, surplus units directly offset your consumption slab).*`;
    }
  }

  // 10. SOLAR GENERATION & BENCHMARKS (General)
  if (
    /(generat|electric|power|solar.*units?|rooftop.*power|output|produce|production|yield|how much.*(solar|electr|unit|power)|கரண்ட்|மின்சாரம்|உற்பத்தி|யூனிட்|தயாரிக்கும்)/i.test(query) &&
    !/(cost|price|quotation|subsidy|emi|due|clean|wash|dust|service|maintenance|warranty|contact|phone|help|number)/i.test(query)
  ) {
    if (isTa) {
      return `தமிழ்நாட்டின் சராசரி 4.4 மணிநேர சூரிய வெளிச்சத்தில் சோலார் உற்பத்தி விவரங்கள்:

• **1 kW அமைப்பு**: தினசரி ~4.4 யூனிட்கள் | மாதம் ~130 யூனிட்கள் | சேமிப்பு ~₹800/மாதம்
• **2 kW அமைப்பு**: தினசரி ~8.8 யூனிட்கள் | மாதம் ~265 யூனிட்கள் | சேமிப்பு ~₹1,700/மாதம்
• **3 kW அமைப்பு (வீடுகளுக்கு சிறந்தது)**: தினசரி ~13.2 யூனிட்கள் | மாதம் ~395 யூனிட்கள் | சேமிப்பு ~₹2,500 - ₹3,000/மாதம்
• **5 kW அமைப்பு**: தினசரி ~22.0 யூனிட்கள் | மாதம் ~660 யூனிட்கள் | சேமிப்பு ~₹4,500 - ₹5,500/மாதம்
• **10 kW அமைப்பு**: தினசரி ~44.0 யூனிட்கள் | மாதம் ~1,320 யூனிட்கள் | சேமிப்பு ~₹9,000 - ₹11,000/மாதம்

⚡ **கணக்கீட்டு சூத்திரம்**: \`சோலார் திறன் (kW) × 4.4 = தினசரி யூனிட்கள்\`.`;
    }

    return `Standard Rooftop Solar generation benchmarks across Tamil Nadu (based on 4.4 Peak Sun Hours/day):

• **1 kW System**: ~4.4 Units/day | ~130 Units/month | Saves ~₹800/month
• **2 kW System**: ~8.8 Units/day | ~265 Units/month | Saves ~₹1,700/month
• **3 kW System (Most Popular for Homes)**: ~13.2 Units/day | ~395 Units/month | Saves ~₹2,500 – ₹3,000/month
• **5 kW System (Large Homes & Offices)**: ~22.0 Units/day | ~660 Units/month | Saves ~₹4,500 – ₹5,500/month
• **10 kW Commercial System**: ~44.0 Units/day | ~1,320 Units/month | Saves ~₹9,000 – ₹11,000/month

⚡ **Quick Formula**: \`System Capacity (kW) × 4.4 = Expected Daily Generation (Units)\`. Under TANGEDCO Net Metering, surplus units roll over to subsequent bi-monthly bills!`;
  }

  // 11. CENTRAL GOVERNMENT PM SURYA GHAR SUBSIDY (₹78,000)
  if (/(subsidy|pm surya|surya ghar|surya|muft bijli|central government|central subsidy|78000|30000|60000|dbt|national portal|government scheme|solar scheme|மானியம்|சூர்யா கர்|மத்திய அரசு|முஃப்ட் பிஜ்லி|78000|மத்திய மானியம்|திட்டம்)/i.test(query)) {
    if (isTa) {
      return `மத்திய அரசின் **PM சூர்யா கர்: முஃப்ட் பிஜ்லி யோஜனா** நேரடி சோலார் மானிய விவரங்கள்:

• **1 kW அமைப்புக்கு**: **₹30,000** நேரடி மத்திய மானியம்
• **2 kW அமைப்புக்கு**: **₹60,000** நேரடி மத்திய மானியம்
• **3 kW அல்லது அதற்கு மேல்**: அதிகபட்சமாக **₹78,000** நேரடி மத்திய மானியம்

📌 **மானியம் பெறும் வழிமுறை**:
1. சொந்த கூரை மற்றும் உள்நாட்டு TANGEDCO LT-1A மின் இணைப்பு இருக்க வேண்டும்.
2. அங்கீகரிக்கப்பட்ட வெண்டரான MRS SOLAR மூலம் அமைப்பை நிறுவிய பின், மின்வாரியம் நெட்-மீட்டர் பொருத்தி ஆய்வு செய்யும்.
3. ஆய்வு முடிந்த 30 நாட்களுக்குள் மானியத் தொகை வாடிக்கையாளரின் வங்கிக் கணக்கில் DBT முறையில் நேரடியாக வரவு வைக்கப்படும்.`;
    }

    return `Central Government **PM Surya Ghar: Muft Bijli Yojana** Rooftop Solar Subsidy Guidelines:

• **1 kW Capacity**: **₹30,000** Direct Subsidy
• **2 kW Capacity**: **₹60,000** Direct Subsidy
• **3 kW & Above**: Maximum Direct Subsidy of **₹78,000**

📌 **How to Avail**:
1. **Eligibility**: Residential individual household with an active TANGEDCO LT-1A domestic connection.
2. **Installation**: Completed with MNRE-approved DCR solar modules by MRS SOLAR.
3. **Disbursement**: Following TNEB bidirectional net-meter inspection and grid synchronization, the subsidy is credited directly to your bank account via DBT.`;
  }

  // 12. TNEB / TANGEDCO NET-METERING & BILL SAVINGS
  if (/(tangedco|tneb|net meter|metering|bi-monthly|tariff|slab|lt-1a|100 free|100 unit|eb bill|electricity bill|bill saving|surplus|grid export|மின்வாரியம்|டான்ஜெட்கோ|நெட் மீட்டர்|கரண்ட் பில்|ஈபி பில்|இலவச மின்சாரம்|100 யூனிட்|சேமிப்பு)/i.test(query)) {
    if (isTa) {
      return `தமிழ்நாடு மின்சார ஒழுங்குமுறை ஆணையத்தின் (TNERC LT-1A) சோலார் நெட்-மீட்டரிங் விதிகள்:

1. **முதல் 100 யூனிட்கள் இலவசம்**: தமிழக அரசின் வழிகாட்டுதலின்படி முதல் 100 யூனிட் எப்போதும் இலவசம்.
2. **இருவழி நெட்-மீட்டர் (Net Metering)**: பகலில் நீங்கள் பயன்படுத்தியது போக உபரி சோலார் மின்சாரம் தானாகவே TNEB கட்டமைப்புக்கு (Grid) செல்லும்.
3. **யூனிட் கழிவு**: இருமாத கணக்கீட்டில் நீங்கள் பயன்படுத்திய யூனிட்களில் இருந்து சோலார் ஏற்றுமதி கழித்துக் கொள்ளப்படும்.
4. **உபரி சேமிப்பு**: உற்பத்தி அதிகமாக இருந்தால், உபரி யூனிட்கள் அடுத்த இருமாத பில்லுக்கு எடுத்துச் செல்லப்படும் (Rollover). இதனால் கரண்ட் பில் கிட்டத்தட்ட ₹0 ஆக குறையும்!`;
    }

    return `TANGEDCO / TNERC Tariff LT-1A Domestic Net-Metering Rules:

1. **First 100 Units Free**: The first 100 units bi-monthly remain 100% free under the Tamil Nadu Government scheme.
2. **1:1 Bi-directional Credit**: Excess solar units exported to the grid during daylight are credited 1:1 against your evening consumption.
3. **High Slab Elimination**: TNEB domestic tariffs charge up to ₹11.00/unit for higher consumption slabs. Solar completely wipes out these expensive slabs first!
4. **Credit Rollover**: Unused solar credits roll over to future billing cycles, driving your bi-monthly electricity bill to near zero!`;
  }

  // 13. UPI, GPAY & PAYMENT ASSISTANCE
  if (/(upi|gpay|google pay|phonepe|paytm|qr code|qr|how to pay|payment method|pay installment|bank transfer|utr|receipt|செலுத்து|பணம் கட்ட|கூகிள் பே|போன்பே|ஸ்கேன்|க்யூஆர்|ரசீது|வங்கிக் குறிப்பு)/i.test(query)) {
    if (isTa) {
      return `Google Pay, PhonePe அல்லது Paytm மூலம் தவணை செலுத்தும் முறை:

• **முதன்மை UPI ID**: \`rsanthoshkumar376@oksbi\` (Mr Santhoshkumar R - SBI)
• **இரண்டாம் நிலை UPI ID**: \`mrssolar@okaxis\` (MRS SOLAR ENERGY - Axis Bank)

📌 **செலுத்தும் முறை**:
1. உங்கள் டாஷ்போர்டில் உள்ள **"தவணை செலுத்து (Pay Installment)"** பொத்தானை அழுத்தவும்.
2. உங்கள் தவணை தொகைக்கு உருவாக்கப்பட்ட UPI QR குறியீட்டை ஸ்கேன் செய்து பணம் செலுத்தவும்.
3. பணம் செலுத்திய பின் வங்கி வழங்கிய **12-இலக்க UTR எண்** உள்ளிடவும். உடனடியாக ஜிஎஸ்டி ரசீது கிடைக்கும்.`;
    }

    return `How to pay your monthly EMI via UPI / Google Pay:

• **Primary UPI ID**: \`rsanthoshkumar376@oksbi\` (Mr Santhoshkumar R – State Bank of India)
• **Secondary UPI ID**: \`mrssolar@okaxis\` (MRS SOLAR ENERGY – Axis Bank)

📌 **Quick Steps**:
1. Tap the **"Pay Installment"** button on your Customer Dashboard.
2. Scan the dynamic UPI QR code generated specifically for your pending installment using Google Pay, PhonePe, or Paytm.
3. Enter the **12-digit Bank UTR / Reference Number** after completing payment.
4. Your formal GST Tax Invoice & Receipt is generated and emailed immediately.`;
  }

  // 14. SOLAR SYSTEM COST, PRICING & ROI (PAYBACK)
  if (/(cost|price|pricing|quotation|quote|rate|expense|investment|payback|roi|expensive|worth|how much.*(cost|price|setup|system)|விலை|செலவு|மதிப்பு|கொட்டேஷன்|எவ்வளவு ஆகும்|முதலீடு)/i.test(query)) {
    if (isTa) {
      return `தமிழ்நாட்டில் சோலார் திட்ட மதிப்பீடு & செலவு விவரங்கள்:

• **1 kW கூரை சோலார்**: ~₹70,000 *(மத்திய மானியம் ₹30,000 கழித்த பின் நிகர செலவு: ~₹40,000)*
• **2 kW கூரை சோலார்**: ~₹1,35,000 *(மத்திய மானியம் ₹60,000 கழித்த பின் நிகர செலவு: ~₹75,000)*
• **3 kW கூரை சோலார் (பரிந்துரைக்கப்படுவது)**: ~₹1,95,000 *(மத்திய மானியம் ₹78,000 கழித்த பின் நிகர செலவு: ~₹1,17,000)*

💡 **முதலீட்டு மீட்புக் காலம் (Payback)**: 3 முதல் 4 ஆண்டுகளில் முதலீடு முழுமையாக திரும்பக் கிடைக்கும். அமைப்பின் ஆயுட்காலம் 25+ ஆண்டுகள் என்பதால் அடுத்த 20+ ஆண்டுகள் மின்சாரம் முற்றிலும் இலவசம்!`;
    }

    return `Standard Rooftop Solar System Pricing in Tamil Nadu (Turnkey EPC):

• **1 kW System**: ~₹70,000 *(Net cost after ₹30,000 subsidy: ~₹40,000)*
• **2 kW System**: ~₹1,35,000 *(Net cost after ₹60,000 subsidy: ~₹75,000)*
• **3 kW System (Recommended)**: ~₹1,95,000 *(Net cost after ₹78,000 subsidy: ~₹1,17,000)*

💡 **Return on Investment (ROI)**: Payback period is typically **3 to 4 years**. Since the Tier-1 solar panels are warrantied for **25 years**, you enjoy over 20 years of completely free electricity!`;
  }

  // 14b. ADMIN SOLAR ENGINEERING & TROUBLESHOOTING COPILOT (In Owner Portal)
  if (role === 'admin' && /(inverter.*(error|fault|troubleshoot|diagnos|red|trip|code|issue|fix)|zero.*(power|generation|output)|tneb.*(issue|bill|problem)|meter.*(not running|reverse)|பழுது|எர்ரர்|இன்வெர்ட்டர்)/i.test(query)) {
    if (isTa) {
      return `🛠️ **நிர்வாகி சோலார் பொறியியல் வழிகாட்டுதல் (Owner Diagnostic Copilot)**:

1. **இன்வெர்ட்டர் பழுது & எர்ரர் குறியீடுகள் (Fault Codes)**:
   • **E01 / E02 (கிரிட் மின்னழுத்தம்)**: TNEB லைன் வோல்டேஜ் 190V - 250V வரம்பிற்குள் உள்ளதா என சரிபார்க்கவும்.
   • **E03 (இன்சுலேஷன் / எர்த் ஃபால்ட்)**: DC கம்பிகளில் மின்கசிவு அல்லது எர்த்திங் எதிர்ப்பு < 5 Ohms உள்ளதா என மல்டிமீட்டர் கொண்டு சோதிக்கவும்.
   • **E04 / E05 (அதிக வெப்பம்)**: இன்வெர்ட்டர் ஹீட்-சிங்க் பகுதியில் காற்றோட்டம் இருப்பதை உறுதிசெய்யவும்.
   • **ரெட் லைட் (Red Light / Alarm)**: AC & DC ஐசோலேட்டர்களை 5 நிமிடங்கள் ஆஃப் செய்து மீண்டும் ஆன் செய்து ரீசெட் செய்யவும்.

2. **மின் உற்பத்தி பூஜ்ஜியம் (0 Units / Zero Generation)**:
   • DC சந்திப்பு பெட்டியில் (AJB) உள்ள DC பியூஸ் (Fuse) மற்றும் DC SPD நல்ல நிலையில் உள்ளதா என பார்க்கவும்.
   • PV ஸ்ட்ரிங் DC வோல்டேஜ் MPPT தொடக்க வரம்பில் (120V - 450V) உள்ளதா என அளவிடவும்.
   • TANGEDCO நெட்-மீட்டரில் Export (Code 02) பதிவு சரியாக ஓடுகிறதா என சரிபார்க்கவும்.

3. **வாடிக்கையாளர் ஆதரவு**: களப் பொறியாளரை தளத்திற்கு அனுப்பவும் அல்லது தொலைபேசி மூலம் வழிகாட்டவும்.`;
    }

    return `🛠️ **Owner Portal Engineering Diagnostic Copilot**:

1. **Inverter Breakdown & Fault Code Resolution**:
   • **Error E01 / E02 (Grid Voltage Error)**: Measure AC grid voltage at the inverter terminal; ensure it is between 195V – 253V AC.
   • **Error E03 (Isolation / Earth Fault)**: High humidity or cable damage. Check insulation resistance of DC strings to ground (> 1 MΩ required).
   • **Error E04 / E05 (Inverter Overtemperature)**: Check ambient ventilation and clear debris from the aluminum heat-sink.
   • **Solid Red Alarm Light**: Turn OFF AC breaker first, then DC isolator. Wait 5 minutes for capacitor discharge, then power ON DC first, followed by AC.

2. **Zero Solar Generation Troubleshooting**:
   • Check the DC Array Junction Box (AJB) for blown DC fuses or tripped DC surge protection devices (SPDs).
   • Measure string open-circuit voltage (Voc) to verify PV module health and string connectivity.
   • Check TANGEDCO bidirectional meter active registers (Register 01: Import kWh, Register 02: Export kWh).
   • Verify inverter Wi-Fi / GPRS telemetry status to confirm if generation is logging online.

3. **Customer Resolution**: All customer incidents are tracked in the Owner Portal Notifications with contact numbers for rapid dispatch.`;
  }

  // 15. PANEL CLEANING & MAINTENANCE
  if (/(clean|dust|wash|water|dirty|maintenance|service|servicing|heat|temperature|inverter.*(temp|hot)|low.*generation|repair|சுத்தம்|தூசி|கழுவ|சர்வீஸ்|பராமரிப்பு)/i.test(query)) {
    if (isTa) {
      return `சோலார் பராமரிப்பு மற்றும் சுத்தம் செய்யும் வழிகாட்டுதல்கள்:

1. **சுத்தம் செய்யும் நேரம்**: காலை 7 மணிக்கு முன் அல்லது மாலை 5:30 மணிக்கு பின் மட்டுமே பேனல்களை சுத்தம் செய்ய வேண்டும் (நண்பகலில் குளிர்ந்த நீர் ஊற்றினால் கண்ணாடி விரிசல் ஏற்படலாம்).
2. **சுத்தமான நீர்**: உப்பு நீர் அல்லது கடினமான சவர்க்காரங்களை பயன்படுத்த வேண்டாம்; மென்மையான துணி அல்லது வைப்பரைப் பயன்படுத்தவும்.
3. **இன்வெர்ட்டர் காற்று வசதி**: இன்வெர்ட்டர் வெப்பம் 55°C-க்கு கீழ் இருக்க வேண்டும். காற்றோட்டமான இடத்தில் பொருத்தப்பட வேண்டும்.
4. **AI சோதனை**: சோலார் டிராக்கரில் உள்ள **"AI Health Diagnostic"** பொத்தானை அழுத்தி செயல்திறன் அளவை நிகழ்நேரத்தில் அறியலாம்.`;
    }

    return `Rooftop Solar Maintenance & Cleaning Best Practices:

1. **Optimal Cleaning Schedule**: Wash panel glass every 10–15 days using clean soft water.
2. **Best Time**: Early in the morning (before 8:00 AM) or late evening to prevent thermal shock to hot glass. Avoid harsh detergents or abrasive brushes.
3. **Inverter Airflow**: Keep the inverter heat-sink clear of debris. Optimal operating temperature is below 55°C.
4. **Automated Diagnostics**: Use the **"AI Health Diagnostic"** button on the Solar Tracker card to detect dust losses or grid voltage dips instantly.`;
  }

  // 16. WARRANTY & EQUIPMENT QUALITY
  if (/(warranty|guarantee|lifespan|life|durability|mono perc|topcon|dcr|bifacial|tier-1|quality|ஆயுட்காலம்|வாரண்டி|உத்தரவாதம்|தரம்)/i.test(query)) {
    if (isTa) {
      return `MRS SOLAR உபகரண உத்தரவாத விவரங்கள்:

• **சோலார் பேனல்கள்**: 25 ஆண்டுகள் செயல்திறன் உத்தரவாதம் (Tier-1 Mono PERC / TOPCon DCR). 25 ஆண்டுகளுக்குப் பிறகும் 80%+ திறன் தரும்.
• **ஆன்-கிரிட் இன்வெர்ட்டர்**: 5 முதல் 10 ஆண்டுகள் முழுமையான மாற்று உத்தரவாதம்.
• **கட்டமைப்பு (Mounting Structure)**: துருப்பிடிக்காத ஹாட்-டிப் கால்வனைஸ்ட் இரும்பு (GI) - 30+ ஆண்டுகள் ஆயுள்.`;
    }

    return `MRS SOLAR Equipment & Warranty Standards:

• **PV Modules**: **25-Year Linear Performance Warranty** (Tier-1 Mono PERC / TOPCon DCR modules certified for PM Surya Ghar). Guaranteed 80%+ output at Year 25.
• **Grid-Tied Inverter**: 5 to 10 Year comprehensive replacement warranty with Wi-Fi telemetry.
• **Mounting Structure**: Heavy-duty Hot-Dip Galvanized Iron (GI) rated to withstand 150 km/h wind speeds with 30+ years rust-proofing.`;
  }

  // 17. CONTACT, OFFICE & SUPPORT
  if (/(contact|phone|mobile|call|number|support|help|customer care|office|address|location|thiruvallur|where is|தொடர்பு|போன்|எண்|அலுவலகம்|முகவரி|உதவி)/i.test(query)) {
    if (isTa) {
      return `MRS SOLAR வாடிக்கையாளர் உதவி மையம் & தலைமையகம்:

📞 **தொலைபேசி**: +91 80724 54996
📧 **மின்னஞ்சல்**: rsanthoshkumar376@gmail.com
📍 **அலுவலகம்**: 74, Gandhi Road, MGM Nagar, Thiruvallur, Tamil Nadu – 602001.
⏰ **பணி நேரம்**: திங்கள் முதல் சனி வரை, காலை 9:00 முதல் மாலை 7:00 மணி வரை.`;
    }

    return `MRS SOLAR Customer Support & Headquarters:

📞 **Helpline**: +91 80724 54996
📧 **Email**: rsanthoshkumar376@gmail.com
📍 **Head Office**: 74, Gandhi Road, MGM Nagar, Thiruvallur, Tamil Nadu – 602001.
⏰ **Operating Hours**: Monday to Saturday, 9:00 AM – 7:00 PM IST.`;
  }

  // 18. ADMIN PORTFOLIO & RECOVERY STATS
  if (role === 'admin' && adminStats) {
    if (/(collection|overdue|portfolio|par|stats|profit|capital|வசூல்|லாபம்|நிலுவை|போர்ட்ஃபோலியோ)/i.test(query)) {
      if (isTa) {
        return `நிகழ்நேர நிதி & கடன் நிலை அறிக்கை:

• **மொத்த வாடிக்கையாளர்கள்**: ${adminStats.totalCustomers || 0}
• **செயலில் உள்ள கடன்கள்**: ${adminStats.activeCustomers || 0}
• **வசூலிக்கப்பட்ட மூலதனம்**: ₹${Number(adminStats.totalAmountCollected || 0).toLocaleString('en-IN')}
• **நிலுவைத் தொகை**: ₹${Number(adminStats.totalOutstandingAmount || 0).toLocaleString('en-IN')}
• **தவணை கடந்த வாடிக்கையாளர்கள்**: ${adminStats.overdueCustomers || 0}
• **மொத்த லாபம் (வட்டி + அபராதம்)**: ₹${Number(adminStats.totalProfit || 0).toLocaleString('en-IN')}
• **வசூல் திறன் (Recovery Rate)**: ${adminStats.parMetrics?.collectionEfficiencyPct || '100'}%`;
      }

      return `Live Financial & Portfolio Summary:

• **Total Registered Customers**: ${adminStats.totalCustomers || 0}
• **Active Financing Accounts**: ${adminStats.activeCustomers || 0}
• **Total Capital Collected**: ₹${Number(adminStats.totalAmountCollected || 0).toLocaleString('en-IN')}
• **Net Outstanding Dues**: ₹${Number(adminStats.totalOutstandingAmount || 0).toLocaleString('en-IN')}
• **Overdue Accounts**: ${adminStats.overdueCustomers || 0}
• **Accumulated Profit (Interest + Fees)**: ₹${Number(adminStats.totalProfit || 0).toLocaleString('en-IN')}
• **Portfolio Collection Rate**: ${adminStats.parMetrics?.collectionEfficiencyPct || '100'}%`;
    }
  }

  // 19. INTELLIGENT DIRECT CONVERSATIONAL RESPONSE
  // Never tells the user "ask another question". Directly answers what it can!
  if (isTa) {
    return `நான் உங்கள் கேள்வியைக் கவனித்தேன். 

MRS SOLAR அமைப்பில் உங்கள் கேள்விக்கு உதவ சில முக்கிய குறிப்புகள்:
• **வாடிக்கையாளர் சோலார் விவரம்**: "sunju சோலார் திறன் என்ன?" அல்லது "deepi emi எவ்வளவு?" என்று கேட்கலாம்.
• **மின் உற்பத்தி**: சராசரியாக 1 kW அமைப்பு தினசரி ~4.4 யூனிட்கள் உற்பத்தி செய்யும் (3 kW அமைப்புக்கு ~13.2 யூனிட்கள்).
• **மத்திய மானியம்**: PM சூர்யா கர் திட்டத்தின் கீழ் 3 kW அமைப்புக்கு அதிகபட்சமாக **₹78,000** நேரடி மானியம் உண்டு.
• **நேரடி உதவி**: உடனடி வாடிக்கையாளர் உதவிக்கு எங்களை **+91 80724 54996** என்ற எண்ணில் அழைக்கலாம்.`;
  }

  return `I have reviewed your query regarding: **"${query}"**.

Here is what you need to know:
• **Customer Queries**: You can ask for any customer's system size or loan directly, for example: *"tell me how many kw for sunju"* or *"what is deepi's next EMI due date"*.
• **Solar Sizing**: In Tamil Nadu, each 1 kW produces ~4.4 units/day (~130 units/month). A standard 3 kW home system produces ~13.2 units/day and saves ~₹2,500–₹3,000/month on EB bills.
• **Central Subsidy**: Residential installations qualify for up to **₹78,000** under the PM Surya Ghar Muft Bijli Yojana.
• **Customer Helpline**: For direct technical or account support, please call our Thiruvallur office directly at **+91 80724 54996**.`;
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
