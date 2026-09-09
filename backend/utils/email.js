import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

export function getTransporter() {
  const user = process.env.EMAIL_USER || 'mrsassociates19@gmail.com';
  // Check for app password or configured password
  const pass = process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || 'Perumal!1';

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
}

/**
 * Sends a formal payment receipt email to the customer
 */
export async function sendReceiptEmail(payment, customer, recipientEmail = null) {
  const targetEmail = recipientEmail || customer?.email;
  if (!targetEmail || !targetEmail.includes('@')) {
    console.warn(`[Email] No valid email address found for customer ${customer?.fullName} (${customer?.customerId}). Skipping receipt email.`);
    return { success: false, reason: 'No valid recipient email address' };
  }

  const transporter = getTransporter();
  const emiAmount = Number(payment.baseEmiAmount || payment.paidAmount || 0);
  const paidAmount = Number(payment.paidAmount || 0);
  const lateFee = Number(payment.lateFeePaid || 0);
  const interest = Number(payment.interestPaid || 0);
  const principal = Number(payment.principalPaid || 0);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
        .receipt-card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #0d9488, #0f766e); padding: 28px; text-align: center; color: white; }
        .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
        .header p { margin: 0; font-size: 13px; opacity: 0.9; }
        .receipt-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 10px; }
        .content { padding: 24px; }
        .details-grid { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .details-grid td { padding: 8px 0; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
        .label { color: #64748b; width: 45%; }
        .value { color: #0f172a; font-weight: 600; text-align: right; }
        .amount-box { background: #f8fafc; border: 2px dashed #0d9488; border-radius: 12px; padding: 16px; text-align: center; margin: 20px 0; }
        .amount-label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; }
        .amount-number { font-size: 28px; color: #0d9488; font-weight: 800; margin: 4px 0 0 0; }
        .footer { background: #f8fafc; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        .status-paid { display: inline-block; background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; }
      </style>
    </head>
    <body>
      <div class="receipt-card">
        <div class="header">
          <h1>MRS ASSOCIATES</h1>
          <p>Solar Panel Financing & Loan Management System</p>
          <div class="receipt-badge">Official Payment Receipt • ${payment.receiptId}</div>
        </div>
        <div class="content">
          <p style="font-size: 14px; margin-top: 0;">Dear <strong>${customer?.fullName || 'Customer'}</strong>,</p>
          <p style="font-size: 13px; color: #475569;">Thank you for your payment. Your installment repayment has been received, verified, and officially recorded in the system.</p>
          
          <div class="amount-box">
            <div class="amount-label">Total Amount Paid</div>
            <div class="amount-number">₹${paidAmount.toLocaleString('en-IN')}</div>
            <div style="margin-top: 6px;"><span class="status-paid">PAID & VERIFIED</span></div>
          </div>

          <table class="details-grid">
            <tr>
              <td class="label">Customer ID</td>
              <td class="value">${customer?.customerId || payment.customerId}</td>
            </tr>
            <tr>
              <td class="label">Installment Period</td>
              <td class="value">EMI #${payment.emiNumber}</td>
            </tr>
            <tr>
              <td class="label">Payment Date</td>
              <td class="value">${payment.paymentDate}</td>
            </tr>
            <tr>
              <td class="label">Base Installment</td>
              <td class="value">₹${emiAmount.toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td class="label">Principal Part</td>
              <td class="value">₹${principal.toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td class="label">Interest Part (2%)</td>
              <td class="value">₹${interest.toLocaleString('en-IN')}</td>
            </tr>
            ${lateFee > 0 ? `
            <tr>
              <td class="label" style="color: #ef4444;">Late Penalty Fee</td>
              <td class="value" style="color: #ef4444;">₹${lateFee.toLocaleString('en-IN')}</td>
            </tr>` : ''}
            <tr>
              <td class="label">Payment Remarks</td>
              <td class="value">${payment.remarks || 'Standard UPI / Bank Transfer'}</td>
            </tr>
          </table>

          <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
            This is a computer-generated receipt from <strong>MRS ASSOCIATES</strong>. Please keep this email for your records. For any support or inquiries, please reach out to us at <a href="mailto:mrsassociates19@gmail.com" style="color: #0d9488;">mrsassociates19@gmail.com</a>.
          </p>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} MRS ASSOCIATES • All Rights Reserved<br>
          Authorized Solar Loan & Financing Partner
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"MRS Associates Solar" <${process.env.EMAIL_USER || 'mrsassociates19@gmail.com'}>`,
      to: targetEmail,
      subject: `Official Payment Receipt: EMI #${payment.emiNumber} - ₹${paidAmount.toLocaleString('en-IN')} [${payment.receiptId}]`,
      html: htmlContent
    });
    console.log(`[Email] Receipt sent to ${targetEmail}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    let friendlyError = err.message;
    if (err.message.includes('534-5.7.9') || err.message.includes('Application-specific password') || err.message.includes('Invalid login')) {
      friendlyError = 'Google blocked login: An App Password is required for mrsassociates19@gmail.com. Please generate a 16-character App Password at myaccount.google.com/apppasswords and set EMAIL_PASS in Render Environment Variables.';
    }
    console.error(`[Email] Failed to send receipt to ${targetEmail}:`, friendlyError);
    return { success: false, error: friendlyError };
  }
}

