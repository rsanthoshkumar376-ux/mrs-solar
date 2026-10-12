/**
 * MRS SOLAR - Solar Daily Generation, Inverter Runtime & Consumption Engine
 * Handles daily kWh generation tracking, active inverter runtime,
 * energy consumption, grid export/import, and TNEB savings calculations.
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
 * Computes comprehensive solar generation, runtime, consumption, and financial savings stats
 */
export function calculateSolarStats(customer) {
  const capacity = Number(customer?.solarCapacity) || 3.0; // default 3 kW if not set
  const logs = Array.isArray(customer?.solarLogs) ? customer.solarLogs : [];
  const tariff = Number(customer?.tariffPerUnit) || DEFAULT_TARIFF_PER_UNIT;

  // Build a lookup map of recorded logs by date
  const logMap = {};
  logs.forEach(l => {
    if (l && l.date) {
      logMap[l.date] = l;
    }
  });

  const todayStr = getFormattedDate();

  // Generate past 7 days records (combining recorded logs + intelligent estimates)
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = getFormattedDate(d);
    
    if (logMap[dateStr]) {
      const recorded = logMap[dateStr];
      const unitsGen = Number(recorded.unitsGenerated) || 0;
      const runtime = Number(recorded.runtimeHours) || 0;
      const consumed = Number(recorded.unitsConsumed) || Math.round(unitsGen * 0.75 * 10) / 10;
      const exported = Number(recorded.gridExport) || Math.max(0, Math.round((unitsGen - consumed) * 10) / 10);
      const savings = Math.round(unitsGen * tariff);

      last7Days.push({
        date: dateStr,
        dayLabel: d.toLocaleDateString('en-US', { weekday: 'short' }),
        unitsGenerated: unitsGen,
        runtimeHours: runtime,
        unitsConsumed: consumed,
        gridExport: exported,
        savingsAmount: savings,
        isRecorded: true,
        notes: recorded.notes || ''
      });
    } else {
      // Intelligent estimate based on capacity and seasonal sunlight
      const variance = getDayVariance(dateStr);
      const unitsGen = Math.round(capacity * UNITS_PER_KW_DAY * variance * 10) / 10;
      const runtime = Math.round(AVG_SUNLIGHT_HOURS * variance * 10) / 10;
      const consumed = Math.round(unitsGen * 0.72 * 10) / 10;
      const exported = Math.max(0, Math.round((unitsGen - consumed) * 10) / 10);
      const savings = Math.round(unitsGen * tariff);

      last7Days.push({
        date: dateStr,
        dayLabel: d.toLocaleDateString('en-US', { weekday: 'short' }),
        unitsGenerated: unitsGen,
        runtimeHours: runtime,
        unitsConsumed: consumed,
        gridExport: exported,
        savingsAmount: savings,
        isRecorded: false,
        notes: 'Estimated from installed capacity'
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
    tnebConsumerNumber: customer?.tnebConsumerNumber || ''
  };
}
