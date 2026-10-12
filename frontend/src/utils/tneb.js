/**
 * MRS SOLAR - TNEB / TANGEDCO Quick Pay & Portal Integration Helper
 * Provides 1-click clipboard copy of consumer number & direct launch of official portals.
 */

export const TNEB_QUICK_PAY_URL = 'https://www.tnebnet.org/qwp/qpay';
export const TNEB_LOGIN_URL = 'https://www.tnebnet.org/awp/login';
export const TNEB_BBPS_PAY_URL = 'https://paytm.com/electricity-bill-payment/tamil-nadu/tangedco';

/**
 * Copies the customer's TNEB consumer number and opens the official portal in a new tab.
 * @param {string} consumerNumber - 10 to 12 digit service number
 * @param {string} toastMessage - Optional localized message
 */
export async function launchTnebQuickPay(consumerNumber, toastMessage) {
  const cleanNumber = String(consumerNumber || '').trim().replace(/\s+/g, '');

  if (cleanNumber) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(cleanNumber);
      }
    } catch (err) {
      console.warn('Clipboard write warning:', err);
    }

    const defaultMsg = `TNEB Consumer No. "${cleanNumber}" copied to clipboard!\n\nOpening official TNEB Quick Pay portal in a new tab...\nJust Paste (Ctrl+V) and solve the 4-digit captcha to view and pay your electricity bill.`;
    alert(toastMessage || defaultMsg);
  }

  // Open official TNEB Quick Pay portal directly
  window.open(TNEB_QUICK_PAY_URL, '_blank', 'noopener,noreferrer');
}

/**
 * Launches BBPS UPI Payment page (Paytm / Google Pay / PhonePe) for TNEB
 */
export async function launchTnebBbpsPay(consumerNumber) {
  const cleanNumber = String(consumerNumber || '').trim().replace(/\s+/g, '');
  if (cleanNumber && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(cleanNumber);
    } catch {}
  }
  window.open(TNEB_BBPS_PAY_URL, '_blank', 'noopener,noreferrer');
}
