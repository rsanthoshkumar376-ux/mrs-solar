/**
 * Export data to UTF-8 CSV formatted for Microsoft Excel & Google Sheets
 */

function downloadCsv(content, filename) {
  // Add UTF-8 BOM so Excel properly opens non-ASCII and rupee symbols
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvCell(cell) {
  if (cell === null || cell === undefined) return '""';
  const str = String(cell).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportCustomersToCsv(customers = []) {
  const headers = [
    'Customer ID',
    'Full Name',
    'Mobile Number',
    'Alternate Number',
    'Email Address',
    'Address',
    'City',
    'District',
    'Aadhaar Number',
    'PAN Number',
    'Solar Capacity (kW)',
    'Solar Brand',
    'Total System Cost (INR)',
    'Down Payment (INR)',
    'Net Loan Principal (INR)',
    'Monthly Interest Rate (%)',
    'EMI Duration (Months)',
    'Monthly EMI (INR)',
    'Loan Start Date',
    'Loan Status',
    'Payment Status',
    'Late Penalties (INR)',
    'Total Outstanding (INR)',
    'Roof Latitude',
    'Roof Longitude'
  ];

  const rows = customers.map(c => [
    escapeCsvCell(c.customerId),
    escapeCsvCell(c.fullName),
    escapeCsvCell(c.mobileNumber),
    escapeCsvCell(c.alternateNumber || ''),
    escapeCsvCell(c.email || ''),
    escapeCsvCell(c.installationAddress || c.address || ''),
    escapeCsvCell(c.city || ''),
    escapeCsvCell(c.district || ''),
    escapeCsvCell(c.aadhaarNumber || ''),
    escapeCsvCell(c.panNumber || ''),
    escapeCsvCell(c.solarCapacity || 0),
    escapeCsvCell(c.solarBrand || ''),
    escapeCsvCell(c.solarCost || 0),
    escapeCsvCell(c.downPayment || 0),
    escapeCsvCell(c.loanAmount || 0),
    escapeCsvCell(c.interestRate || 2),
    escapeCsvCell(c.emiDuration || 12),
    escapeCsvCell(c.monthlyEmi || 0),
    escapeCsvCell(c.loanStartDate || ''),
    escapeCsvCell(c.loanStatus || 'Active'),
    escapeCsvCell(c.paymentStatus || 'Pending'),
    escapeCsvCell(c.latePaymentCharges || 0),
    escapeCsvCell(c.totalOutstandingAmount || 0),
    escapeCsvCell(c.latitude || ''),
    escapeCsvCell(c.longitude || '')
  ]);

  const csvContent = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map(r => r.join(','))
  ].join('\r\n');

  const today = new Date().toISOString().split('T')[0];
  downloadCsv(csvContent, `MRS_SOLAR_Customers_${today}.csv`);
}

export function exportEmisToCsv(emis = []) {
  const headers = [
    'Customer ID',
    'Client Name',
    'Mobile Number',
    'EMI No.',
    'Due Date',
    'Base Installment (INR)',
    'Interest Part (INR)',
    'Principal Part (INR)',
    'Late Fee (INR)',
    'Total Due (INR)',
    'Status'
  ];

  const rows = emis.map(e => [
    escapeCsvCell(e.customerId || ''),
    escapeCsvCell(e.customerName || ''),
    escapeCsvCell(e.customerMobile || ''),
    escapeCsvCell(e.emiNumber || ''),
    escapeCsvCell(e.dueDate || ''),
    escapeCsvCell(e.emiAmount || 0),
    escapeCsvCell(e.interestPaid || 0),
    escapeCsvCell(e.principalPaid || 0),
    escapeCsvCell(e.lateFee || 0),
    escapeCsvCell((e.emiAmount || 0) + (e.lateFee || 0)),
    escapeCsvCell(e.status || 'Pending')
  ]);

  const csvContent = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map(r => r.join(','))
  ].join('\r\n');

  const today = new Date().toISOString().split('T')[0];
  downloadCsv(csvContent, `MRS_SOLAR_Repayments_Queue_${today}.csv`);
}
