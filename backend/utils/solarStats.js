/**
 * MRS SOLAR - Battery-Free On-Grid Solar Generation, Inverter & TNEB Net-Meter Engine
 * Handles daily kWh generation tracking, active on-grid inverter runtime,
 * energy consumption, bi-directional grid export/import readings,
 * and official TNERC / TANGEDCO LT-1A electricity bill tallying.
 */

const DEFAULT_TARIFF_PER_UNIT = 6.5; // Average TANGEDCO residential tariff (₹6.50/kWh)
const AVG_SUNLIGHT_HOURS = 7.4; // Average active solar inverter runtime hours per day in Tamil Nadu
const UNITS_PER_KW_DAY = 4.3; // Average kWh units generated per 1 kW panel per day in South India

/**
 * Returns YYYY-MM-DD formatted date string in IST / local time
 */
export function getFormattedDate(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Deterministic pseudo-random variation based on date string so estimates stay consistent across page reloads
 */
function getDayVariance(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  const factor = (Math.abs(hash) % 20 - 10) / 100; // -10% to +10%
  return 1 + factor;
}

/**
 * Calculates official Tamil Nadu TANGEDCO / TNERC Bi-Monthly Domestic (Tariff 1A)
 * electricity bill including 100 Free Units subsidy.
 * 
 * @param {number} units - Net units consumed over a 2-month cycle
 * @returns {number} Bill amount in INR
 */
export function computeTnebSlabBill(units = 0) {
  const u = Math.max(0, Math.round(Number(units) || 0));
  if (u <= 100) return 0; // 100 Free units for all domestic consumers in Tamil Nadu

  let bill = 0;
  if (u <= 500) {
    // 0 - 100: FREE
    // 101 - 200: ₹2.25/unit
    const slab2 = Math.min(100, Math.max(0, u - 100));
    bill += slab2 * 2.25;
    // 201 - 400: ₹4.50/unit
    const slab3 = Math.min(200, Math.max(0, u - 200));
    bill += slab3 * 4.50;
    // 401 - 500: ₹6.00/unit
    const slab4 = Math.min(100, Math.max(0, u - 400));
    bill += slab4 * 6.00;
  } else {
    // High consumption tier (> 500 units)
    // 0 - 100: FREE
    // 101 - 400: ₹4.50/unit
    const slab2 = Math.min(300, Math.max(0, u - 100));
    bill += slab2 * 4.50;
    // 401 - 500: ₹6.00/unit
    const slab3 = Math.min(100, Math.max(0, u - 400));
    bill += slab3 * 6.00;
    // 501 - 600: ₹8.00/unit
    const slab4 = Math.min(100, Math.max(0, u - 500));
    bill += slab4 * 8.00;
    // 601 - 800: ₹9.00/unit
    const slab5 = Math.min(200, Math.max(0, u - 600));
    bill += slab5 * 9.00;
    // 801 - 1000: ₹10.00/unit
    const slab6 = Math.min(200, Math.max(0, u - 800));
    bill += slab6 * 10.00;
    // > 1000: ₹11.00/unit
    const slab7 = Math.max(0, u - 1000);
    bill += slab7 * 11.00;
  }
  return Math.round(bill);
}

/**
 * Computes comprehensive battery-free on-grid solar generation, runtime, consumption,
 * bi-directional grid export/import tally, and official TNEB financial savings.
 */
export function calculateSolarStats(customer) {
  const capacity = Number(customer?.solarCapacity) || 3.0; // default 3 kW if not set
  const logs = Array.isArray(customer?.solarLogs) ? customer.solarLogs : [];
  const tariff = Number(customer?.tariffPerUnit) || DEFAULT_TARIFF_PER_UNIT;

  // Build a lookup map of recorded logs by date
  const logMap = {};
  let hasVerifiedLog = false;
  let latestVerifiedLog = null;

  logs.forEach(l => {
    if (l && l.date) {
      logMap[l.date] = l;
      if (Number(l.unitsGenerated) > 0 || Number(l.gridExport) > 0 || Number(l.gridImport) > 0) {
        hasVerifiedLog = true;
        if (!latestVerifiedLog || new Date(l.date) > new Date(latestVerifiedLog.date)) {
          latestVerifiedLog = l;
        }
      }
    }
  });

  const todayStr = getFormattedDate();

  // Generate past 7 days records (combining recorded logs + verified/estimated flags)
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = getFormattedDate(d);
    
    if (logMap[dateStr]) {
      const recorded = logMap[dateStr];
      const unitsGen = Number(recorded.unitsGenerated) || 0;
      const runtime = Number(recorded.runtimeHours) || 0;
      const consumed = Number(recorded.unitsConsumed) || Math.round(unitsGen * 0.72 * 10) / 10;
      const exported = Number(recorded.gridExport) !== undefined && recorded.gridExport !== ''
        ? Number(recorded.gridExport)
        : Math.max(0, Math.round((unitsGen - consumed) * 10) / 10);
      const imported = Number(recorded.gridImport) !== undefined && recorded.gridImport !== ''
        ? Number(recorded.gridImport)
        : Math.round(consumed * 0.40 * 10) / 10;
      const savings = Math.round(unitsGen * tariff);

      last7Days.push({
        date: dateStr,
        dayLabel: d.toLocaleDateString('en-US', { weekday: 'short' }),
        unitsGenerated: unitsGen,
        runtimeHours: runtime,
        unitsConsumed: consumed,
        gridExport: exported,
        gridImport: imported,
        savingsAmount: savings,
        isRecorded: true,
        verificationStatus: 'Verified Reading',
        notes: recorded.notes || ''
      });
    } else {
      // Intelligent estimate based on plant capacity and seasonal sunlight
      const variance = getDayVariance(dateStr);
      const unitsGen = Math.round(capacity * UNITS_PER_KW_DAY * variance * 10) / 10;
      const runtime = Math.round(AVG_SUNLIGHT_HOURS * variance * 10) / 10;
      const consumed = Math.round(unitsGen * 0.70 * 10) / 10;
      const exported = Math.max(0, Math.round((unitsGen - consumed) * 10) / 10);
      const imported = Math.round(consumed * 0.45 * 10) / 10;
      const savings = Math.round(unitsGen * tariff);

      last7Days.push({
        date: dateStr,
        dayLabel: d.toLocaleDateString('en-US', { weekday: 'short' }),
        unitsGenerated: unitsGen,
        runtimeHours: runtime,
        unitsConsumed: consumed,
        gridExport: exported,
        gridImport: imported,
        savingsAmount: savings,
        isRecorded: false,
        verificationStatus: 'Estimated Yield',
        notes: 'Estimated from installed on-grid capacity'
      });
    }
  }

  // Today's entry is the last element of last7Days
  const todayStats = last7Days[last7Days.length - 1];

  // Lifetime & Cumulative metrics
  let totalRecordedUnits = 0;
  logs.forEach(l => {
    totalRecordedUnits += Number(l.unitsGenerated) || 0;
  });

  // Days since installation or 90 days default
  let activeDays = 90;
  if (customer?.installationDate || customer?.loanStartDate) {
    const installTime = new Date(customer.installationDate || customer.loanStartDate).getTime();
    if (!isNaN(installTime)) {
      const diffDays = Math.floor((Date.now() - installTime) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) activeDays = diffDays;
    }
  }

  const avgDailyUnits = Math.round(capacity * UNITS_PER_KW_DAY * 10) / 10;
  const lifetimeUnits = Math.round(Math.max(totalRecordedUnits, activeDays * avgDailyUnits));
  const lifetimeSavings = Math.round(lifetimeUnits * tariff);
  const co2OffsetKg = Math.round(lifetimeUnits * 0.82);
  const treesPlantedEquivalent = Math.round(co2OffsetKg / 20);

  // Bi-Monthly TNEB Net-Meter Tally (60-day billing cycle in Tamil Nadu)
  // Bi-monthly solar production estimate = capacity * 4.3 units/day * 60 days
  const biMonthlySolarExport = Math.round(capacity * UNITS_PER_KW_DAY * 60 * 0.35); // ~35% exported, 65% consumed daytime
  const biMonthlyGridImport = Math.round(capacity * UNITS_PER_KW_DAY * 60 * 0.45); // night & non-solar draw

  // If customer has recorded logs with verified import/export, calculate actual 60-day rate
  let tallyImport = biMonthlyGridImport;
  let tallyExport = biMonthlySolarExport;
  let isVerified = false;

  if (latestVerifiedLog && (Number(latestVerifiedLog.gridImport) > 0 || Number(latestVerifiedLog.gridExport) > 0)) {
    isVerified = true;
    // Scale daily reading to bi-monthly or use cumulative log
    const dailyImp = Number(latestVerifiedLog.gridImport) || 0;
    const dailyExp = Number(latestVerifiedLog.gridExport) || 0;
    if (dailyImp > 0) tallyImport = Math.round(dailyImp * 60);
    if (dailyExp > 0) tallyExport = Math.round(dailyExp * 60);
  }

  const netUnits = Math.max(0, tallyImport - tallyExport);
  const bankedUnits = Math.max(0, tallyExport - tallyImport);
  const grossBill = computeTnebSlabBill(tallyImport);
  const netBill = computeTnebSlabBill(netUnits);
  const biMonthlySavings = Math.max(0, grossBill - netBill);
  const annualSavings = biMonthlySavings * 6;

  const netMeterTally = {
    systemType: 'battery-free-on-grid',
    systemDescription: 'Battery-Free On-Grid Rooftop Solar with Bi-Directional Net Metering',
    inverterType: customer?.solarBrand ? `${customer.solarBrand} On-Grid String Inverter` : 'On-Grid String Inverter (Grid-Tied)',
    isVerified,
    calculationBasis: isVerified ? 'Verified Bi-Directional Net-Meter Readings' : 'Capacity-Based Projected Yield',
    latestReadingDate: latestVerifiedLog?.date || null,
    biMonthlyImport: tallyImport,
    biMonthlyExport: tallyExport,
    netUnits,
    bankedUnits,
    grossBill,
    netBill,
    biMonthlySavings,
    annualSavings,
    isFreeTier: netUnits <= 100,
    freeUnitsApplied: Math.min(100, netUnits)
  };

  return {
    today: todayStats,
    last7Days,
    capacity,
    tariff,
    totalLoggedDays: logs.length,
    lifetimeUnits,
    lifetimeSavings,
    co2OffsetKg,
    treesPlantedEquivalent,
    tnebConsumerNumber: customer?.tnebConsumerNumber || '',
    systemType: 'battery-free-on-grid',
    systemDescription: 'Battery-Free On-Grid Rooftop Solar with Bi-Directional Net Metering',
    netMeterTally
  };
}
