/**
 * Formats clean WhatsApp Receipt Message URL
 */
export function getWhatsAppReceiptUrl({
  mobileNumber,
  customerName,
  customerId,
  receiptId,
  emiNumber,
  paidAmount,
  paymentDate,
  remainingBalance = 0
}) {
  // Format mobile number for international WhatsApp link (+91 for India if 10 digits)
  let cleanMobile = (mobileNumber || '').replace(/\D/g, '');
  if (cleanMobile.length === 10) {
    cleanMobile = '91' + cleanMobile;
  }

  const messageText = `☀️ *MRS SOLARI - Official Payment Receipt* ☀️

Dear *${customerName || 'Customer'}* (${customerId || ''}),

Thank you for your payment! Your official EMI receipt details are below:

🧾 *Receipt ID:* ${receiptId || 'REC-PAYMENT'}
📅 *Payment Date:* ${paymentDate || new Date().toISOString().split('T')[0]}
📌 *Installment:* EMI #${emiNumber}
💵 *Total Paid Amount:* ₹${Number(paidAmount || 0).toLocaleString('en-IN')}
📊 *Remaining Balance:* ₹${Number(remainingBalance || 0).toLocaleString('en-IN')}

Your payment has been verified and recorded in our official ledger.

*MRS Associates & Solar Solutions*
Contact Email: mrsassociates19@gmail.com
Thank you for choosing MRS SOLARI! 🌿`;

  const encodedText = encodeURIComponent(messageText);

  if (cleanMobile) {
    return `https://api.whatsapp.com/send?phone=${cleanMobile}&text=${encodedText}`;
  } else {
    return `https://api.whatsapp.com/send?text=${encodedText}`;
  }
}

export function openWhatsAppReceipt(data) {
  const url = getWhatsAppReceiptUrl(data);
  window.open(url, '_blank', 'noopener,noreferrer');
}
