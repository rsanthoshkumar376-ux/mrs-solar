/**
 * WhatsApp Messaging Utility for MRS SOLAR (100% Free via wa.me deep links)
 */

import { formatCurrency, formatDate } from './format.js';

export const DEFAULT_SUPPORT_PHONE = '9566866288';
export const COMPANY_NAME = 'MRS SOLAR';

/**
 * Normalizes phone numbers for WhatsApp.
 * Strips whitespace, hyphens, and leading zeros.
 * For 10-digit Indian numbers, automatically prepends '91'.
 */
export function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    return '91' + digits;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits;
}

/**
 * Generates an EMI Payment Reminder message in Tamil or English.
 */
export function generateEmiReminderMessage({ customer, emi, language = 'ta', supportPhone = DEFAULT_SUPPORT_PHONE }) {
  const customerName = customer?.fullName || 'வாடிக்கையாளர்';
  const customerId = customer?.customerId || customer?._id || 'N/A';
  const emiNum = emi?.emiNumber || 1;
  const dueDateStr = formatDate(emi?.dueDate);
  const baseAmount = formatCurrency(emi?.emiAmount || 0);
  const lateFee = emi?.lateFee || 0;
  const totalDue = formatCurrency((emi?.emiAmount || 0) + lateFee);
  const isOverdue = emi?.status === 'Overdue' || lateFee > 0;

  if (language === 'ta') {
    return `வணக்கம் *${customerName}* அவர்களுக்கு,

*${COMPANY_NAME}* நிறுவனத்தில் இருந்து உங்கள் சூரிய மின்சக்தி (Solar) கடனுக்கான அன்பான நினைவூட்டல்:

📌 *வாடிக்கையாளர் எண்:* ${customerId}
🔢 *தவணை எண்:* EMI #${emiNum}
📅 *செலுத்த வேண்டிய தேதி:* ${dueDateStr}
💰 *மாத தவணை தொகை:* ${baseAmount}${lateFee > 0 ? `\n⚠️ *தாமத கட்டணம்:* ${formatCurrency(lateFee)}` : ''}
💳 *மொத்த செலுத்த வேண்டிய தொகை:* *${totalDue}*
${isOverdue ? '\n🚨 *குறிப்பு:* உங்கள் தவணை தேதி கடந்துவிட்டது. தயவுசெய்து உடனடியாக செலுத்தவும்.\n' : ''}
வங்கி அல்லது UPI மூலம் செலுத்தியவுடன் ரசீது பெற்றுக்கொள்ளவும்.

ஏதேனும் சந்தேகங்கள் இருந்தால் தொடர்புகொள்ளவும்: 📞 ${supportPhone}
நன்றி,
*${COMPANY_NAME}* குழுமம் ☀️`;
  }

  // English
  return `Dear *${customerName}*,

Greetings from *${COMPANY_NAME}*!

This is a gentle reminder regarding your solar loan installment:

📌 *Customer ID:* ${customerId}
🔢 *Installment:* EMI #${emiNum}
📅 *Due Date:* ${dueDateStr}
💰 *EMI Amount:* ${baseAmount}${lateFee > 0 ? `\n⚠️ *Late Penalty:* ${formatCurrency(lateFee)}` : ''}
💳 *Total Payable:* *${totalDue}*
${isOverdue ? '\n🚨 *Note:* This installment is currently overdue. Please clear the payment at the earliest.\n' : ''}
After payment, kindly share the screenshot/UTR reference to receive your official receipt.

For any queries, contact support: 📞 ${supportPhone}
Thank you,
*${COMPANY_NAME} Team* ☀️`;
}

/**
 * Generates a Payment Confirmation Receipt message in Tamil or English.
 */
export function generatePaymentReceiptMessage({ customer, emi, language = 'ta', supportPhone = DEFAULT_SUPPORT_PHONE }) {
  const customerName = customer?.fullName || 'வாடிக்கையாளர்';
  const customerId = customer?.customerId || customer?._id || 'N/A';
  const emiNum = emi?.emiNumber || 1;
  const paidDateStr = formatDate(emi?.paidDate || new Date());
  const paidAmount = formatCurrency(emi?.paidAmount || emi?.emiAmount || 0);
  const remainingBal = formatCurrency(emi?.remainingBalance || 0);

  if (language === 'ta') {
    return `வணக்கம் *${customerName}* அவர்களுக்கு,

உங்கள் *${COMPANY_NAME}* தவணை தொகை வெற்றிகரமாக பெறப்பட்டது! ✅

🧾 *அதிகாரப்பூர்வ தவணை ரசீது*
━━━━━━━━━━━━━━━━━
📌 *வாடிக்கையாளர் எண்:* ${customerId}
🔢 *தவணை:* EMI #${emiNum} (செலுத்தப்பட்டது)
📅 *செலுத்திய தேதி:* ${paidDateStr}
💵 *பெறப்பட்ட தொகை:* *${paidAmount}*
📉 *மீதமுள்ள கடன் இருப்பு:* ${remainingBal}
━━━━━━━━━━━━━━━━━

உங்களின் சீரான தவணை செலுத்துதலுக்கு நன்றி!
வலைத்தளத்தில் முழு ரசீதை பதிவிறக்கம் செய்துகொள்ளலாம்.

தொடர்புக்கு: 📞 ${supportPhone}
*${COMPANY_NAME}* ☀️`;
  }

  // English
  return `Dear *${customerName}*,

We have successfully received your solar loan payment! ✅

🧾 *OFFICIAL PAYMENT RECEIPT*
━━━━━━━━━━━━━━━━━
📌 *Customer ID:* ${customerId}
🔢 *Installment:* EMI #${emiNum} (PAID)
📅 *Payment Date:* ${paidDateStr}
💵 *Amount Received:* *${paidAmount}*
📉 *Remaining Balance:* ${remainingBal}
━━━━━━━━━━━━━━━━━

Thank you for your prompt payment!
You can view or download the detailed PDF receipt on your customer portal.

Support Helpline: 📞 ${supportPhone}
*${COMPANY_NAME}* ☀️`;
}

/**
 * Opens WhatsApp Web or native WhatsApp app with phone and pre-filled message.
 */
export function openWhatsApp({ phone, message }) {
  const cleanNum = normalizePhone(phone);
  if (!cleanNum) {
    alert('Invalid or missing mobile number.');
    return;
  }
  const encodedText = encodeURIComponent(message);
  const url = `https://wa.me/${cleanNum}?text=${encodedText}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Opens customer support chat directed to MRS SOLAR business phone.
 */
export function openCustomerSupportChat({ customer, supportPhone = DEFAULT_SUPPORT_PHONE }) {
  const customerName = customer?.fullName || 'Customer';
  const customerId = customer?.customerId || 'N/A';
  const cleanSupport = normalizePhone(supportPhone);

  const text = `வணக்கம் MRS SOLAR, நான் *${customerName}* (வாடிக்கையாளர் எண்: *${customerId}*). எனது சூரிய மின்சக்தி கடன் குறித்து தகவல் தேவைப்படுகிறது.

(Hello MRS SOLAR, I am ${customerName}, Customer ID: ${customerId}. I have a query regarding my solar loan.)`;

  const url = `https://wa.me/${cleanSupport}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
