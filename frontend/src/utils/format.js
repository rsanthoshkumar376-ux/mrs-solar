/**
 * Formats a number to Indian Rupee (INR) currency format.
 * Example: 5000 -> ₹5,000.00
 * 
 * @param {number} amount - Amount to format
 * @param {boolean} includeDecimals - Include decimal values (default true)
 * @returns {string} Formatted string
 */
export function formatCurrency(amount, includeDecimals = true) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0';
  }
  
  const options = {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: includeDecimals ? 2 : 0,
    minimumFractionDigits: includeDecimals ? 2 : 0
  };

  return new Intl.NumberFormat('en-IN', options).format(amount);
}

/**
 * Formats an ISO date string to a human-readable format.
 * Example: '2026-07-22' -> '22 Jul 2026'
 * 
 * @param {string|Date} dateVal - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(dateVal) {
  if (!dateVal) return 'N/A';
  try {
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return 'N/A';
    
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return 'N/A';
  }
}
