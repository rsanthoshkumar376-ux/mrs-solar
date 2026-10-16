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
 * Deep bilingual (Tamil & English) domain expertise on Solar EPC, Loans & TNEB
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
  if (/\b(hi|hello|hey|vanakkam|வணக்கம்|namaste|good morning|good afternoon|good evening|start)\b/i.test(query)) {
    if (isTa) {
      return role === 'customer' && customer
        ? `வணக்கம் ${customer.fullName || ''}! நான் MRS SOLAR AI உதவியாளர். உங்கள் ${customer.solarCapacity || 3} kW சோலார் கட்டமைப்பு, EMI தவணை தேதி அல்லது TNEB பில் சேமிப்பு பற்றி என்ன அறிய விரும்புகிறீர்கள்?`
        : `வணக்கம்! நான் MRS SOLAR AI உதவியாளர். சோலார் மின் உற்பத்தி, மத்திய அரசு மானியம், கடன் தவணை அல்லது TNEB நெட்-மீட்டரிங் பற்றி என்னிடம் கேட்கலாம்.`;
    }
    return role === 'customer' && customer
      ? `Hello ${customer.fullName || 'there'}! I am your MRS SOLAR AI Copilot. How can I assist you with your ${customer.solarCapacity || 3} kW solar system, upcoming EMI installment, or power generation today?`
      : `Hello! I am your MRS SOLAR Assistant. Ask me anything about solar electricity generation, Central PM Surya Ghar subsidies, loan repayment, or TNEB net metering.`;
  }

  // 2. SOLAR ELECTRICITY GENERATION & UNITS (Handles "How much solar electricity will my system generate?", "units", "kw", etc.)
  if (
    /(generat|electric|power|solar|units?|kwh|capacity|kilowatt|rooftop|output|produce|production|yield|how much.*(solar|electr|unit|power)|கரண்ட்|மின்சாரம்|உற்பத்தி|யூனிட்|தயாரிக்கும்|சோலார்.*கரண்ட்)/i.test(query) &&
    !/(cost|price|quotation|subsidy|emi|due|clean|wash|dust|service|maintenance|warranty|contact|phone|help|number)/i.test(query)
  ) {
    if (customer && customer.solarCapacity) {
      const cap = Number(customer.solarCapacity);
      const dailyEst = (cap * 4.4).toFixed(1);
      const monthlyEst = Math.round(cap * 4.4 * 30);
      const annualEst = Math.round(cap * 4.4 * 365);
      const monthlySavings = Math.round(monthlyEst * 6.5);

      if (isTa) {
        return `வணக்கம் ${customer.fullName || ''}! உங்கள் **${cap} kW** கூரை சோலார் அமைப்பின் மின் உற்பத்தி விவரங்கள்:

⚡ **தினசரி உற்பத்தி**: ~${dailyEst} யூனிட்கள் (kWh)
📅 **மாதாந்திர உற்பத்தி**: ~${monthlyEst} யூனிட்கள்
☀️ **வருடாந்திர உற்பத்தி**: ~${annualEst.toLocaleString('en-IN')} யூனிட்கள்
💰 **உத்தேச EB பில் சேமிப்பு**: ~₹${monthlySavings.toLocaleString('en-IN')} / மாதம்

(தமிழ்நாட்டின் சராசரி 4.4 மணிநேர சூரிய வெளிச்சம் அடிப்படையில் கணக்கிடப்பட்டது. TANGEDCO நெட்-மீட்டர் மூலம் இந்த யூனிட்கள் உங்கள் இருமாத பில்லில் கழிக்கப்படும்).`;
      }

      return `Hello ${customer.fullName || ''}! Here is the generation estimate for your **${cap} kW** Rooftop Solar System:

⚡ **Average Daily Output**: ~${dailyEst} Units (kWh)
📅 **Monthly Output**: ~${monthlyEst} Units (kWh)
☀️ **Annual Generation**: ~${annualEst.toLocaleString('en-IN')} Units
💰 **Estimated TNEB Bill Savings**: ~₹${monthlySavings.toLocaleString('en-IN')} / month

*(Calculated based on standard Tamil Nadu solar irradiance of 4.4 peak sun hours/day. Under TANGEDCO Net-Metering, these units directly offset your consumption).*`;
    }

    // Benchmark Table for Admin or General Visitors
    if (isTa) {
      return `தமிழ்நாட்டின் சராசரி 4.4 - 5.0 மணிநேர சூரிய வெளிச்சத்தில் சோலார் உற்பத்தி விவரங்கள்:

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

  // 3. EMI DUE DATE, AMOUNT & LOAN REPAYMENT
  if (/(next emi|due date|when is.*emi|how much emi|pending emi|emi amount|installment|loan status|loan amount|balance|outstanding|late fee|penalty|grace period|pay emi|அடுத்த தவணை|தவணை தேதி|நிலுவை|கடன்|அபராதம்|வட்டி|எப்போது தவணை|தவணை எவ்வளவு)/i.test(query)) {
    if (customer) {
      const schedule = Array.isArray(customer.emiSchedule) ? customer.emiSchedule : [];
      const nextPending = schedule.find(e => e.status !== 'Paid');

      if (!nextPending) {
        return isTa
          ? `வாழ்த்துகள்! உங்கள் சோலார் கடன் தவணைகள் அனைத்தும் முழுமையாக செலுத்தப்பட்டுவிட்டன. உங்களிடம் நிலுவைத் தொகை ஏதுமில்லை.`
          : `Congratulations! All installments for your solar system loan are fully paid off. Your account balance is zero.`;
      }

      if (isTa) {
        return `வணக்கம் ${customer.fullName || ''}! உங்கள் அடுத்த தவணை விவரங்கள்:

📋 **தவணை எண்**: #${nextPending.emiNumber}
💵 **தவணை தொகை**: ₹${Number(nextPending.emiAmount).toLocaleString('en-IN')}
📅 **செலுத்த வேண்டிய கடைசி தேதி**: ${nextPending.dueDate || 'மாதாந்திர தவணை'}
⚠️ **தாமதக் கட்டணம்**: ₹${nextPending.lateFee || 0}
🏦 **மொத்த கடன் நிலுவை**: ₹${Number(customer.totalOutstandingAmount || nextPending.emiAmount).toLocaleString('en-IN')}

UPI அல்லது Google Pay மூலம் உடனே செலுத்த உங்கள் டாஷ்போர்டில் உள்ள **"தவணை செலுத்து (Pay Installment)"** பொத்தானைப் பயன்படுத்தவும்.`;
      }

      return `Hello ${customer.fullName || ''}! Here are your upcoming EMI installment details:

📋 **Installment Number**: #${nextPending.emiNumber}
💵 **EMI Amount**: ₹${Number(nextPending.emiAmount).toLocaleString('en-IN')}
📅 **Due Date**: ${nextPending.dueDate || 'Upcoming Monthly Due'}
⚠️ **Late Fee Penalty**: ₹${nextPending.lateFee || 0}
🏦 **Total Remaining Balance**: ₹${Number(customer.totalOutstandingAmount || nextPending.emiAmount).toLocaleString('en-IN')}

To pay securely, tap the **"Pay Installment"** button on your dashboard to scan the instant UPI QR code.`;
    }

    // Admin or General Overview for Loans
    if (isTa) {
      return `MRS SOLAR கடன் மேலாண்மை வழிகாட்டி:

• **கடன் காலம்**: 12 முதல் 60 மாதங்கள் வரை எளிதான தவணைகள்.
• **வட்டி விகிதம்**: ஆண்டுக்கு 12% நிலையான அல்லது குறைந்துவரும் இருப்பு முறை.
• **அபராத சலுகை**: தவணை தேதிக்கு பிறகு 3 நாட்கள் சலுகைக் காலம் (Grace Period). அதற்குப் பின் நாள் ஒன்றுக்கு 0.05% தாமதக் கட்டணம் கணக்கிடப்படும்.
• நிர்வாகியாக நீங்கள் **வாடிக்கையாளர்கள் (Customers)** பக்கத்தில் எந்த வாடிக்கையாளரின் தவணை அட்டவணையையும் முழுமையாகப் பார்வையிடலாம்.`;
    }

    return `MRS SOLAR Financing & Loan Terms:

• **Flexible Tenures**: 12 to 60 monthly installments.
• **Competitive Interest**: Standard 12% p.a. fixed or reducing balance models.
• **Grace Period**: 3 days grace period from the due date before late fees apply (0.05%/day).
• **Automated Midnight Audit**: Daily interest and overdue statuses are automatically verified every night at 00:00 IST.
• As an Admin, you can review any customer's real-time schedule by selecting them in the **Customers** tab.`;
  }

  // 4. CENTRAL GOVERNMENT PM SURYA GHAR SUBSIDY (₹78,000)
  if (/(subsidy|pm surya|surya ghar|surya|muft bijli|central government|central subsidy|78000|30000|60000|dbt|national portal|government scheme|solar scheme|மானியம்|சூர்யா கர்|மத்திய அரசு|முஃப்ட் பிஜ்லி|78000|மத்திய மானியம்|திட்டம்)/i.test(query)) {
    if (isTa) {
      return `மத்திய அரசின் **PM சூர்யா கர்: முஃப்ட் பிஜ்லி யோஜனா** நேரடி சோலார் மானிய விவரங்கள்:

• **1 kW அமைப்புக்கு**: ₹30,000 மத்திய மானியம்
• **2 kW அமைப்புக்கு**: ₹60,000 மத்திய மானியம்
• **3 kW அல்லது அதற்கு மேல்**: அதிகபட்சமாக **₹78,000** நேரடி மானியம்

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

  // 5. TNEB / TANGEDCO NET-METERING & BILL SAVINGS
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

  // 6. UPI, GPAY & PHONEPE PAYMENT ASSISTANCE
  if (/(upi|gpay|google pay|phonepe|paytm|qr code|qr|how to pay|payment method|pay installment|bank transfer|utr|receipt|செலுத்து|பணம் கட்ட|கூகிள் பே|போன்பே|ஸ்கேன்|க்யூஆர்|ரசீது|வங்கிக் குறிப்பு)/i.test(query)) {
    if (isTa) {
      return `Google Pay, PhonePe அல்லது Paytm மூலம் தவணை செலுத்தும் முறை:

1. உங்கள் வாடிக்கையாளர் தளத்தில் உள்ள **"தவணை செலுத்து (Pay Installment)"** பொத்தானை அழுத்தவும்.
2. உங்கள் தவணை தொகைக்கு தானாக உருவாக்கப்பட்ட UPI QR குறியீட்டை ஏதேனும் UPI ஆப் மூலம் ஸ்கேன் செய்யவும்.
3. பணம் செலுத்திய பின் வங்கி வழங்கிய **12-இலக்க UTR எண் (Reference No)** உள்ளிடவும்.
4. நிர்வாகி சரிபார்த்தவுடன் அதிகாரப்பூர்வ ஜிஎஸ்டி ரசீது உங்கள் மின்னஞ்சலுக்கு உடனே அனுப்பி வைக்கப்படும்.`;
    }

    return `How to pay your monthly EMI via UPI / Google Pay:

1. Tap the **"Pay Installment"** button on your Customer Dashboard.
2. Scan the dynamic UPI QR code generated specifically for your pending installment using Google Pay, PhonePe, or Paytm.
3. Enter the **12-digit Bank UTR / Reference Number** after completing the payment.
4. Once verified, your formal GST Tax Invoice & Receipt is generated and emailed to you automatically.`;
  }

  // 7. SOLAR SYSTEM COST, PRICING & ROI (PAYBACK)
  if (/(cost|price|pricing|quotation|quote|rate|expense|investment|payback|roi|expensive|worth|how much.*(cost|price|setup|system)|விலை|செலவு|மதிப்பு|கொட்டேஷன்|எவ்வளவு ஆகும்|முதலீடு)/i.test(query)) {
    if (isTa) {
      return `தமிழ்நாட்டில் சோலார் திட்ட மதிப்பீடு & செலவு விவரங்கள்:

• **1 kW கூரை சோலார்**: ~₹70,000 (மத்திய மானியம் ₹30,000 கழித்த பின் நிகர செலவு: ~₹40,000)
• **2 kW கூரை சோலார்**: ~₹1,35,000 (மத்திய மானியம் ₹60,000 கழித்த பின் நிகர செலவு: ~₹75,000)
• **3 kW கூரை சோலார்**: ~₹1,95,000 (மத்திய மானியம் ₹78,000 கழித்த பின் நிகர செலவு: ~₹1,17,000)

💡 **முதலீட்டு மீட்புக் காலம் (Payback)**: 3 முதல் 4 ஆண்டுகளில் முதலீடு முழுமையாக திரும்பக் கிடைக்கும். அமைப்பின் ஆயுட்காலம் 25+ ஆண்டுகள் என்பதால் அடுத்த 20+ ஆண்டுகள் மின்சாரம் முற்றிலும் இலவசம்!`;
    }

    return `Standard Rooftop Solar System Pricing in Tamil Nadu (Turnkey EPC):

• **1 kW System**: ~₹70,000 *(Net cost after ₹30,000 subsidy: ~₹40,000)*
• **2 kW System**: ~₹1,35,000 *(Net cost after ₹60,000 subsidy: ~₹75,000)*
• **3 kW System (Recommended)**: ~₹1,95,000 *(Net cost after ₹78,000 subsidy: ~₹1,17,000)*

💡 **Return on Investment (ROI)**: Payback period is typically **3 to 4 years**. Since the Tier-1 solar panels are warrantied for **25 years**, you enjoy over 20 years of completely free electricity!`;
  }

  // 8. PANEL CLEANING, MAINTENANCE & INVERTER HEALTH
  if (/(clean|dust|wash|water|dirty|maintenance|service|servicing|heat|temperature|inverter.*(temp|hot|error|fault)|low.*generation|not working|repair|சுத்தம்|தூசி|கழுவ|சர்வீஸ்|பராமரிப்பு|இன்வெர்ட்டர்|பழுது)/i.test(query)) {
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

  // 9. WARRANTY & EQUIPMENT QUALITY
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

  // 10. CONTACT, OFFICE & SUPPORT
  if (/(contact|phone|mobile|call|number|support|help|customer care|office|address|location|trichy|where is|தொடர்பு|போன்|எண்|அலுவலகம்|முகவரி|உதவி)/i.test(query)) {
    if (isTa) {
      return `MRS SOLAR வாடிக்கையாளர் உதவி மையம்:

📞 **தொலைபேசி**: +91 94892 88376
📧 **மின்னஞ்சல்**: mrsassociates19@gmail.com
📍 **அலுவலகம்**: MRS Solar Systems & Financing, Tamil Nadu, India.
⏰ **பணி நேரம்**: திங்கள் முதல் சனி வரை, காலை 9:00 முதல் மாலை 7:00 மணி வரை.`;
    }

    return `MRS SOLAR Customer Support & Headquarters:

📞 **Helpline**: +91 94892 88376
📧 **Email**: mrsassociates19@gmail.com
📍 **Head Office**: MRS Solar Systems & Financing, Tamil Nadu, India.
⏰ **Operating Hours**: Monday to Saturday, 9:00 AM – 7:00 PM IST.`;
  }

  // 11. ADMIN PORTFOLIO & RECOVERY STATS
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

  // 12. DYNAMIC CONVERSATIONAL FALLBACK (Replaces static repeated block)
  const previewTopic = query.length > 30 ? `${query.slice(0, 30)}...` : query;

  if (isTa) {
    return `நான் உங்கள் கேள்வியைப் புரிந்து கொள்ள முயற்சிக்கிறேன்: **"${previewTopic}"**

சரியான தகவலை உடனடியாகப் பெற பின்வரும் தலைப்புகளில் ஒன்றை தேர்ந்தெடுக்கலாம்:
• ☀️ **சோலார் உற்பத்தி**: "3 kW அமைப்பு எவ்வளவு கரண்ட் தயாரிக்கும்?"
• 💰 **கடன் தவணை (EMI)**: "அடுத்த தவணை தேதி எப்போது?"
• 🏛️ **மத்திய மானியம்**: "PM சூர்யா கர் ₹78,000 மானிய விவரங்கள்"
• ⚡ **TNEB சேமிப்பு**: "நெட்-மீட்டர் விதிகள் மற்றும் 100 இலவச யூனிட்கள்"
• 💳 **UPI தவணை**: "Google Pay மூலம் பணம் செலுத்துவது எப்படி?"
• 🧼 **பராமரிப்பு**: "சோலார் பேனல்களை எவ்வாறு சுத்தம் செய்வது?"

💡 *நிர்வாகிகள் Settings > AI Engine பக்கத்தில் Google Gemini API Key சேர்த்தால், AI எந்தவொரு தனிப்பயன் கேள்விக்கும் நேரடியாக பதிலளிக்கும்.*`;
  }

  return `I understand you are asking about: **"${previewTopic}"**

Here are the most popular topics you can ask me about right away:
• ☀️ **Solar Generation**: "How much solar electricity will my system generate?"
• 💰 **Loan & EMI**: "When is my next EMI due and amount?"
• 🏛️ **Govt Subsidy**: "PM Surya Ghar ₹78,000 subsidy details"
• ⚡ **EB Bill Zero**: "TANGEDCO Net Metering rules & bill savings"
• 💳 **UPI Payment**: "How to pay my EMI via Google Pay / UPI?"
• 🧼 **Maintenance**: "How often should I clean my solar panels?"

💡 *Admins can configure a free Google Gemini API key in Settings > AI Engine for open-ended conversational intelligence!*`;
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
