/**
 * MRS SOLAR - PM Surya Ghar Muft Bijli Yojana Subsidy Lifecycle Helper
 * Standardized 5-stage central government financial assistance tracking.
 */

export const SUBSIDY_STAGES = [
  {
    id: 1,
    key: 'APPLICATION_SUBMITTED',
    titleEn: 'Application & Feasibility Submitted',
    titleTa: 'விண்ணப்பம் மற்றும் சாத்தியக்கூறு சமர்ப்பிக்கப்பட்டது',
    descEn: 'National Portal (pmsuryaghar.gov.in) registration and technical feasibility request submitted to TANGEDCO.',
    descTa: 'தேசிய சோலார் போர்ட்டலில் விண்ணப்பிக்கப்பட்டு TANGEDCO மின்வாரியத்திடம் தொழில்நுட்ப அனுமதி கோரப்பட்டுள்ளது.'
  },
  {
    id: 2,
    key: 'TNEB_APPROVAL',
    titleEn: 'TANGEDCO Feasibility Sanctioned',
    titleTa: 'TANGEDCO தொழில்நுட்ப சாத்தியக்கூறு அனுமதி',
    descEn: 'TANGEDCO division engineer approved grid feasibility and cleared installation of bi-directional net-meter.',
    descTa: 'TANGEDCO உதவி செயற்பொறியாளர் கள ஆய்வு செய்து சோலார் கட்டமைப்புக்கான ஒப்புதல் அளித்துள்ளார்.'
  },
  {
    id: 3,
    key: 'INSTALLATION_COMPLETE',
    titleEn: 'Rooftop Solar Plant Commissioned',
    titleTa: 'சோலார் மேற்கூரை கட்டமைப்பு பொருத்துதல் முடிந்தது',
    descEn: 'Tier-1 Mono PERC modules, on-grid inverter, HDGI structure, earthing, and lightning arrestor fully installed by MRS SOLAR.',
    descTa: 'MRS SOLAR குழுமத்தால் சோலார் பேனல்கள், இன்வெர்ட்டர் மற்றும் எர்த்திங் அமைப்பு முழுமையாக நிறுவப்பட்டது.'
  },
  {
    id: 4,
    key: 'NET_METER_INSPECTED',
    titleEn: 'Bi-Directional Net-Meter Synchronized (JIR)',
    titleTa: 'இருவழி நெட்-மீட்டர் ஆய்வு மற்றும் இணைப்பு',
    descEn: 'TANGEDCO safety testing completed, bi-directional net meter installed, and Joint Inspection Report (JIR) uploaded.',
    descTa: 'TNEB அதிகாரிகளால் இருவழி மின்மீட்டர் பொருத்தப்பட்டு, கூட்டு ஆய்வு அறிக்கை (JIR) தேசிய போர்ட்டலில் பதிவேற்றப்பட்டது.'
  },
  {
    id: 5,
    key: 'SUBSIDY_DISBURSED',
    titleEn: 'Central Subsidy Credited via DBT',
    titleTa: 'மத்திய அரசு மானியம் வங்கிக் கணக்கில் வரவு',
    descEn: 'Central Financial Assistance (CFA) subsidy disbursed directly into customer bank account via Aadhaar-linked DBT.',
    descTa: 'மத்திய அரசின் PM சூர்யா கர் மானியத் தொகை வாடிக்கையாளரின் வங்கிக் கணக்கில் (DBT) நேரடியாக வரவு வைக்கப்பட்டது.'
  }
];

/**
 * Calculates central government PM Surya Ghar subsidy entitlement based on system capacity
 * 1 kW = ₹30,000
 * 2 kW = ₹60,000
 * 3 kW or higher = ₹78,000
 */
export function calculateSubsidyAmount(capacity = 1) {
  const cap = Number(capacity) || 1;
  if (cap >= 3) return 78000;
  if (cap >= 2) return 60000;
  return 30000;
}

/**
 * Generates default or enriched subsidy details for a customer
 */
export function getDefaultSubsidyDetails(customer = {}) {
  const cap = Number(customer.solarCapacity) || 1;
  const formulaAmount = calculateSubsidyAmount(cap);
  const eligibleAmount = Number(customer.subsidyDetails?.eligibleAmount) || formulaAmount;
  const custId = customer.customerId || 'CUST';
  const cleanId = custId.replace(/[^a-zA-Z0-9]/g, '');
  const appNo = customer.subsidyDetails?.applicationNumber || `PMSGY-TN-2026-${cleanId}`;

  // Default stage based on loanStatus or existing stage
  let stage = Number(customer.subsidyDetails?.currentStage);
  if (!stage || isNaN(stage) || stage < 1 || stage > 5) {
    if (customer.loanStatus === 'Completed') {
      stage = 5;
    } else {
      stage = 3; // Default to installation completed for ongoing customers
    }
  }

  const existingDates = customer.subsidyDetails?.stageDates || {};
  const todayStr = new Date().toISOString().split('T')[0];

  const stagesWithStatus = SUBSIDY_STAGES.map((s) => {
    let status = 'pending';
    let date = existingDates[s.id] || null;

    if (s.id < stage) {
      status = 'completed';
      if (!date) date = customer.loanStartDate || todayStr;
    } else if (s.id === stage) {
      status = stage === 5 ? 'completed' : 'in_progress';
      if (!date) date = todayStr;
    }

    return {
      id: s.id,
      key: s.key,
      titleEn: s.titleEn,
      titleTa: s.titleTa,
      descEn: s.descEn,
      descTa: s.descTa,
      status,
      date
    };
  });

  return {
    scheme: 'PM Surya Ghar: Muft Bijli Yojana',
    applicationNumber: appNo,
    eligibleAmount,
    currentStage: stage,
    stages: stagesWithStatus,
    stageDates: existingDates,
    disbursedDate: stage === 5 ? (customer.subsidyDetails?.disbursedDate || todayStr) : null,
    lastUpdated: customer.subsidyDetails?.lastUpdated || todayStr,
    nationalPortalUrl: 'https://pmsuryaghar.gov.in'
  };
}

/**
 * Enriches a customer object with subsidy details if missing or partial
 */
export function enrichCustomerWithSubsidy(customer) {
  if (!customer) return customer;
  const subsidyDetails = getDefaultSubsidyDetails(customer);
  return {
    ...customer,
    subsidyDetails: {
      ...subsidyDetails,
      ...(customer.subsidyDetails || {})
    }
  };
}
