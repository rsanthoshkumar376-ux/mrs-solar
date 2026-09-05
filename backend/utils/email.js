import nodemailer from 'nodemailer';

/**
 * Creates and returns a nodemailer transporter configured with Gmail credentials
 */
const getTransporter = () => {
  const user = process.env.EMAIL_USER || 'mrsassociates19@gmail.com';
  const pass = process.env.EMAIL_PASS || 'Perumal!1';

  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user,
      pass
    }
  });
};

/**
 * Send EMI Payment Receipt Email to Customer
 */
export async function sendPaymentReceiptEmail({
  toEmail,
  customerName,
  customerId,
  receiptId,
  emiNumber,
  paidAmount,
  baseEmiAmount = 0,
  lateFeePaid = 0,
  paymentDate,
  remainingBalance = 0,
  totalLoanAmount = 0,
  solarCapacity = 0
}) {
  if (!toEmail) {
    console.log(`[Email] No email address registered for customer ${customerName} (${customerId}). Skipping email sending.`);
    return { success: false, reason: 'No email provided' };
  }

  const transporter = getTransporter();
  const senderEmail = process.env.EMAIL_USER || 'mrsassociates19@gmail.com';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 28px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 1px; color: #22c55e; }
        .header p { margin: 6px 0 0; font-size: 13px; color: #94a3b8; letter-spacing: 0.5px; }
        .badge { background: #dcfce7; color: #15803d; font-weight: 700; padding: 6px 16px; border-radius: 20px; display: inline-block; font-size: 13px; margin-top: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        .content { padding: 28px 24px; }
        .greeting { font-size: 16px; line-height: 1.6; margin-bottom: 20px; }
        .receipt-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 20px; margin: 24px 0; }
        .receipt-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px; }
        .receipt-title { font-weight: 800; color: #0f172a; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; }
        .receipt-id { font-size: 14px; color: #2563eb; font-family: monospace; font-weight: 700; background: #eff6ff; padding: 4px 8px; border-radius: 4px; }
        .table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        .table td { padding: 10px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
        .table td.label { color: #64748b; font-weight: 500; }
        .table td.value { text-align: right; font-weight: 600; color: #0f172a; }
        .table tr.total td { font-size: 17px; color: #16a34a; font-weight: 800; border-bottom: none; border-top: 2px solid #cbd5e1; padding-top: 14px; }
        .summary-box { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 14px 18px; border-radius: 6px; margin-top: 22px; }
        .summary-box p { margin: 4px 0; font-size: 13px; color: #166534; }
        .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        .footer a { color: #2563eb; text-decoration: none; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>MRS SOLARI</h1>
          <p>SOLAR PANEL FINANCE & EMI MANAGEMENT</p>
          <div class="badge">✓ Payment Confirmed</div>
        </div>
        <div class="content">
          <p class="greeting">Dear <strong>${customerName}</strong>,</p>
          <p>We are pleased to confirm that your payment for <strong>EMI Installment #${emiNumber}</strong> has been successfully received and credited to your account.</p>
          
          <div class="receipt-card">
            <div class="receipt-header">
              <span class="receipt-title">Payment Receipt</span>
              <span class="receipt-id">${receiptId}</span>
            </div>
            <table class="table">
              <tr>
                <td class="label">Customer ID</td>
                <td class="value">${customerId}</td>
              </tr>
              <tr>
                <td class="label">Payment Date</td>
                <td class="value">${paymentDate}</td>
              </tr>
              <tr>
                <td class="label">EMI Installment</td>
                <td class="value">EMI #${emiNumber}</td>
              </tr>
              <tr>
                <td class="label">Base EMI Amount</td>
                <td class="value">₹${Number(baseEmiAmount || paidAmount).toLocaleString('en-IN')}</td>
              </tr>
              ${lateFeePaid > 0 ? `
              <tr>
                <td class="label">Late Fee / Penalty Paid</td>
                <td class="value" style="color: #dc2626;">₹${Number(lateFeePaid).toLocaleString('en-IN')}</td>
              </tr>
              ` : ''}
              <tr class="total">
                <td class="label">Total Paid Amount</td>
                <td class="value">₹${Number(paidAmount).toLocaleString('en-IN')}</td>
              </tr>
            </table>
          </div>

          <div class="summary-box">
            <p><strong>Remaining Outstanding Loan Balance:</strong> ₹${Number(remainingBalance).toLocaleString('en-IN')}</p>
            ${totalLoanAmount ? `<p><strong>Total Sanctioned Loan:</strong> ₹${Number(totalLoanAmount).toLocaleString('en-IN')}</p>` : ''}
            ${solarCapacity ? `<p><strong>Solar Installation Capacity:</strong> ${solarCapacity} kW</p>` : ''}
          </div>

          <p style="margin-top: 24px; font-size: 13px; color: #64748b; line-height: 1.5;">
            Please retain this email as your official digital payment receipt. You can also view and print your full payment history by logging into your MRS SOLARI account.
          </p>
        </div>
        <div class="footer">
          <p><strong>MRS Associates & Solar Solutions</strong></p>
          <p>Official Email: <a href="mailto:${senderEmail}">${senderEmail}</a></p>
          <p>© ${new Date().getFullYear()} MRS SOLARI. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"MRS SOLARI" <${senderEmail}>`,
      to: toEmail,
      subject: `Payment Receipt: EMI #${emiNumber} Confirmed (Receipt ${receiptId}) - MRS SOLARI`,
      html: htmlContent
    });
    console.log(`[Email] Receipt email sent successfully to ${toEmail}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email Error] Failed to send receipt email to ${toEmail}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send Payment Submission Acknowledgment Email to Customer
 */
export async function sendPaymentSubmissionAckEmail({
  toEmail,
  customerName,
  customerId,
  emiNumber
}) {
  if (!toEmail) {
    console.log(`[Email] No email address registered for customer ${customerName} (${customerId}). Skipping notification email.`);
    return { success: false, reason: 'No email provided' };
  }

  const transporter = getTransporter();
  const senderEmail = process.env.EMAIL_USER || 'mrsassociates19@gmail.com';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 28px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 26px; font-weight: 800; color: #3b82f6; }
        .header p { margin: 6px 0 0; font-size: 13px; color: #94a3b8; }
        .content { padding: 28px 24px; }
        .info-card { background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 6px; padding: 16px 20px; margin: 20px 0; color: #1e40af; }
        .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        .footer a { color: #2563eb; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>MRS SOLARI</h1>
          <p>PAYMENT NOTIFICATION RECEIVED</p>
        </div>
        <div class="content">
          <p>Dear <strong>${customerName}</strong>,</p>
          <p>We have received your payment request notification for <strong>EMI #${emiNumber}</strong>.</p>
          <div class="info-card">
            <p style="margin: 0; font-weight: bold; font-size: 15px;">Status: Verification Pending</p>
            <p style="margin: 8px 0 0; font-size: 13px; line-height: 1.5;">Our finance department is verifying the transaction. As soon as payment is confirmed, your official payment receipt will be generated and sent to your email.</p>
          </div>
          <p style="font-size: 13px; color: #64748b;">If you have any questions, feel free to reply to this email or contact MRS Associates support.</p>
        </div>
        <div class="footer">
          <p><strong>MRS Associates & Solar Solutions</strong></p>
          <p>Contact Email: <a href="mailto:${senderEmail}">${senderEmail}</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"MRS SOLARI" <${senderEmail}>`,
      to: toEmail,
      subject: `Payment Submission Received for EMI #${emiNumber} - MRS SOLARI`,
      html: htmlContent
    });
    console.log(`[Email] Submission notification sent to ${toEmail}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email Error] Failed to send submission ack to ${toEmail}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send Overdue EMI Alert Email to Customer
 */
export async function sendOverdueReminderEmail({
  toEmail,
  customerName,
  customerId,
  emiNumber,
  emiAmount,
  dueDate,
  lateFee = 0,
  daysOverdue = 0
}) {
  if (!toEmail) return { success: false, reason: 'No email provided' };

  const transporter = getTransporter();
  const senderEmail = process.env.EMAIL_USER || 'mrsassociates19@gmail.com';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%); color: #ffffff; padding: 28px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 26px; font-weight: 800; color: #fca5a5; }
        .content { padding: 28px 24px; }
        .alert-card { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 18px; margin: 20px 0; color: #991b1b; }
        .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>MRS SOLARI</h1>
          <p>OVERDUE PAYMENT NOTICE</p>
        </div>
        <div class="content">
          <p>Dear <strong>${customerName}</strong> (Customer ID: ${customerId}),</p>
          <p>This is a reminder that your <strong>EMI Installment #${emiNumber}</strong> was due on <strong>${dueDate}</strong> and is currently overdue by <strong>${daysOverdue} days</strong>.</p>
          
          <div class="alert-card">
            <p style="margin: 0;"><strong>EMI Amount Due:</strong> ₹${Number(emiAmount).toLocaleString('en-IN')}</p>
            ${lateFee > 0 ? `<p style="margin: 6px 0 0;"><strong>Accrued Late Fee Penalty:</strong> ₹${Number(lateFee).toLocaleString('en-IN')}</p>` : ''}
            <p style="margin: 8px 0 0; font-weight: bold; font-size: 16px;">Total Payable: ₹${Number(emiAmount + lateFee).toLocaleString('en-IN')}</p>
          </div>

          <p>Please clear your payment at the earliest to prevent further penalty charges.</p>
        </div>
        <div class="footer">
          <p><strong>MRS Associates & Solar Solutions</strong> | Contact: ${senderEmail}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"MRS SOLARI" <${senderEmail}>`,
      to: toEmail,
      subject: `URGENT: Overdue EMI #${emiNumber} Alert - MRS SOLARI`,
      html: htmlContent
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email Error] Failed to send overdue reminder email to ${toEmail}:`, error.message);
    return { success: false, error: error.message };
  }
}
