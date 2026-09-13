import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import { db } from '../database/db.js';

// Force IPv4 first to prevent ENETUNREACH errors on cloud host (Render)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

/**
 * Retrieve dynamic email configurations from database settings with process.env fallback
 */
export async function getEmailConfig() {
  let dbConfig = null;
  try {
    dbConfig = await db.findOne('settings', { key: 'email' });
  } catch (e) {
    // Database query fallback
  }

  const relayUrl = (dbConfig?.relayUrl || process.env.GMAIL_RELAY_URL || '').trim();
  const brevoApiKey = (dbConfig?.brevoApiKey || process.env.BREVO_API_KEY || '').trim();
  const resendApiKey = (dbConfig?.resendApiKey || process.env.RESEND_API_KEY || '').trim();
  const senderEmail = (dbConfig?.senderEmail || process.env.EMAIL_USER || 'mrsassociates19@gmail.com').trim();
  const rawPass = process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || 'vapjyjdezglprkbp';
  const senderPass = typeof rawPass === 'string' ? rawPass.replace(/\s+/g, '') : 'vapjyjdezglprkbp';

  let activeMethod = 'Direct Gmail SMTP';
  if (relayUrl) activeMethod = 'Google Apps Script HTTPS Relay';
  else if (brevoApiKey) activeMethod = 'Brevo HTTPS API';
  else if (resendApiKey) activeMethod = 'Resend HTTPS API';

  return {
    relayUrl,
    brevoApiKey,
    resendApiKey,
    senderEmail,
    senderPass,
    activeMethod
  };
}

/**
 * Sends email via Google Apps Script Web App HTTPS Relay (Port 443 — Immune to Render firewall)
 */
async function sendViaGoogleRelay(relayUrl, mailOptions) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(relayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html,
        name: 'MRS ASSOCIATES SOLAR'
      }),
      redirect: 'follow',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const text = await res.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (res.ok && (data.success || text.includes('success'))) {
      return { success: true, method: 'Google Apps Script HTTPS Relay', messageId: data.messageId || 'GMAIL-APPS-SCRIPT' };
    } else {
      if (text.includes('Terms of Service') || text.includes('violation of our Terms of Service')) {
        throw new Error('Google flagged this Apps Script URL (Terms of Service restriction). Use Brevo API Key instead or deploy new script with GmailApp.');
      }
      throw new Error(data.error || `Relay returned status ${res.status}: ${text.slice(0, 120)}`);
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Google Apps Script relay timed out after 12s');
    }
    throw err;
  }
}

/**
 * Sends email via Brevo (Sendinblue) HTTP API (Port 443 — Free 300 emails/day)
 */
async function sendViaBrevo(apiKey, senderEmail, mailOptions) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        sender: { name: 'MRS Associates Solar', email: senderEmail || 'mrsassociates19@gmail.com' },
        to: [{ email: mailOptions.to }],
        subject: mailOptions.subject,
        htmlContent: mailOptions.html
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({}));
    if (res.status === 201 || res.status === 200) {
      return { success: true, method: 'Brevo HTTPS API', messageId: data.messageId || 'BREVO-API' };
    } else {
      throw new Error(data.message || `Brevo returned HTTP ${res.status}`);
    }
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Sends email via Resend HTTP API (Port 443)
 */
async function sendViaResend(apiKey, mailOptions) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'MRS Associates <onboarding@resend.dev>',
        to: [mailOptions.to],
        subject: mailOptions.subject,
        html: mailOptions.html
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return { success: true, method: 'Resend HTTPS API', messageId: data.id || 'RESEND-API' };
    } else {
      throw new Error(data.message || `Resend returned HTTP ${res.status}`);
    }
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Sends email via Direct SMTP (Gmail) with short timeouts so it never freezes
 */
async function sendViaDirectSmtp(mailOptions, config) {
  const attempts = [
    { port: 465, secure: true, name: 'Port 465 SSL' },
    { port: 587, secure: false, name: 'Port 587 TLS' }
  ];

  let lastErr = null;
  for (const tier of attempts) {
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: tier.port,
        secure: tier.secure,
        family: 4,
        auth: { user: config.senderEmail, pass: config.senderPass },
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 5000,
        tls: { rejectUnauthorized: false }
      });

      const info = await transporter.sendMail(mailOptions);
      return { success: true, method: `Direct SMTP (${tier.name})`, messageId: info.messageId };
    } catch (err) {
      lastErr = err;
      console.warn(`[Email] Direct SMTP attempt (${tier.name}) error:`, err.message);
    }
  }

  let errMsg = lastErr ? lastErr.message : 'SMTP connection failed';
  if (errMsg.includes('timeout') || errMsg.includes('ETIMEDOUT') || errMsg.includes('ESOCKETTIMEDOUT') || errMsg.includes('ENETUNREACH')) {
    errMsg = 'Cloud host (Render) blocked outbound SMTP (Ports 465/587). Please activate Brevo API or Google Apps Script in Email Settings.';
  } else if (errMsg.includes('534-5.7.9') || errMsg.includes('Invalid login') || errMsg.includes('Username and Password not accepted')) {
    errMsg = 'Google blocked login: 16-character App Password required.';
  }

  throw new Error(errMsg);
}

/**
 * Universal dispatcher: routes email through the best available transport channel
 */
export async function sendEmail(mailOptions, description = 'Email') {
  const config = await getEmailConfig();
  const errors = [];

  // Channel 1: Google Apps Script Web App HTTPS Relay
  if (config.relayUrl) {
    try {
      const res = await sendViaGoogleRelay(config.relayUrl, mailOptions);
      console.log(`[Email] ${description} delivered to ${mailOptions.to} via Google Apps Script Relay`);
      return res;
    } catch (err) {
      console.warn(`[Email] Google Apps Script relay failed: ${err.message}. Falling back to next channel...`);
      errors.push(`Google Relay: ${err.message}`);
    }
  }

  // Channel 2: Brevo HTTPS API
  if (config.brevoApiKey) {
    try {
      const res = await sendViaBrevo(config.brevoApiKey, config.senderEmail, mailOptions);
      console.log(`[Email] ${description} delivered to ${mailOptions.to} via Brevo API`);
      return res;
    } catch (err) {
      console.warn(`[Email] Brevo API failed: ${err.message}. Falling back to next channel...`);
      errors.push(`Brevo API: ${err.message}`);
    }
  }

  // Channel 3: Resend HTTPS API
  if (config.resendApiKey) {
    try {
      const res = await sendViaResend(config.resendApiKey, mailOptions);
      console.log(`[Email] ${description} delivered to ${mailOptions.to} via Resend API`);
      return res;
    } catch (err) {
      console.warn(`[Email] Resend API failed: ${err.message}. Falling back to next channel...`);
      errors.push(`Resend API: ${err.message}`);
    }
  }

  // Channel 4: Direct SMTP (Gmail)
  try {
    const res = await sendViaDirectSmtp(mailOptions, config);
    console.log(`[Email] ${description} delivered to ${mailOptions.to} via Direct SMTP: ${res.messageId}`);
    return res;
  } catch (err) {
    errors.push(`Direct SMTP: ${err.message}`);
    console.error(`[Email] Delivery failed for ${mailOptions.to}:`, err.message);
    const combinedError = errors.join(' → ');
    return { success: false, error: combinedError };
  }
}

/**
 * Sends a formal payment receipt email to the customer
 */
export async function sendReceiptEmail(payment, customer, recipientEmail = null) {
  const targetEmail = String(recipientEmail || customer?.email || '').trim().toLowerCase();
  if (!targetEmail || !targetEmail.includes('@') || !targetEmail.includes('.')) {
    console.log(`[Email] No recipient email address provided for customer ${customer?.fullName || customer?.customerId}. Skipping email receipt.`);
    return { success: false, reason: 'No recipient email address provided', skipped: true };
  }

  const emiAmount = Number(payment.baseEmiAmount || payment.emiAmount || 0);
  const lateFee = Number(payment.lateFeePaid || payment.lateFee || 0);
  let paidAmount = Number(payment.paidAmount);
  if (!paidAmount || isNaN(paidAmount) || paidAmount <= 0) {
    paidAmount = Math.round((emiAmount + lateFee) * 100) / 100;
  }
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

  const mailOptions = {
    from: `"MRS Associates Solar" <${(process.env.EMAIL_USER || 'mrsassociates19@gmail.com').trim()}>`,
    to: targetEmail,
    subject: `Official Payment Receipt: EMI #${payment.emiNumber} - ₹${paidAmount.toLocaleString('en-IN')} [${payment.receiptId}]`,
    html: htmlContent
  };

  return await sendEmail(mailOptions, `Receipt (EMI #${payment.emiNumber})`);
}


/**
 * Sends an EMI due-date reminder email to the customer
 */
export async function sendDueReminderEmail(customer, emi) {
  const targetEmail = String(customer?.email || '').trim().toLowerCase();
  if (!targetEmail || !targetEmail.includes('@') || !targetEmail.includes('.')) {
    return { success: false, reason: 'No valid recipient email address' };
  }

  const emiAmount = Number(emi.emiAmount || 0);
  const daysUntilDue = Math.ceil((new Date(emi.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
  const isToday = daysUntilDue <= 0;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, ${isToday ? '#dc2626, #b91c1c' : '#d97706, #b45309'}); padding: 28px; text-align: center; color: white; }
        .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 700; }
        .header p { margin: 0; font-size: 13px; opacity: 0.9; }
        .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-top: 10px; }
        .content { padding: 24px; }
        .amount-box { background: #fef3c7; border: 2px dashed #d97706; border-radius: 12px; padding: 16px; text-align: center; margin: 20px 0; }
        .amount-label { font-size: 12px; color: #92400e; text-transform: uppercase; font-weight: 600; }
        .amount-number { font-size: 30px; color: #b45309; font-weight: 800; margin: 4px 0 0 0; }
        table.info { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table.info td { padding: 8px 0; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
        .label { color: #64748b; width: 45%; }
        .value { color: #0f172a; font-weight: 600; text-align: right; }
        .footer { background: #f8fafc; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        .cta { display: block; margin: 16px auto; padding: 12px 28px; background: #0d9488; color: white; border-radius: 10px; text-align: center; font-weight: 700; font-size: 14px; text-decoration: none; width: fit-content; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>MRS ASSOCIATES</h1>
          <p>Solar Panel Financing &amp; Loan Management System</p>
          <div class="badge">${isToday ? '⚠️ EMI Due Today' : `📅 EMI Due in ${daysUntilDue} Day${daysUntilDue !== 1 ? 's' : ''}`}</div>
        </div>
        <div class="content">
          <p style="font-size: 14px; margin-top: 0;">Dear <strong>${customer.fullName}</strong>,</p>
          <p style="font-size: 13px; color: #475569;">
            ${isToday
              ? `Your EMI installment <strong>#${emi.emiNumber}</strong> is <strong>due TODAY</strong>. Please make your payment immediately to avoid any late penalty charges.`
              : `This is a friendly reminder that your EMI installment <strong>#${emi.emiNumber}</strong> is due in <strong>${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}</strong> on <strong>${emi.dueDate}</strong>.`
            }
          </p>

          <div class="amount-box">
            <div class="amount-label">Amount Due for EMI #${emi.emiNumber}</div>
            <div class="amount-number">₹${emiAmount.toLocaleString('en-IN')}</div>
          </div>

          <table class="info">
            <tr>
              <td class="label">Customer ID</td>
              <td class="value">${customer.customerId}</td>
            </tr>
            <tr>
              <td class="label">Installment Number</td>
              <td class="value">EMI #${emi.emiNumber}</td>
            </tr>
            <tr>
              <td class="label">Due Date</td>
              <td class="value" style="color: ${isToday ? '#dc2626' : '#d97706'};">${emi.dueDate}</td>
            </tr>
            <tr>
              <td class="label">EMI Amount</td>
              <td class="value">₹${emiAmount.toLocaleString('en-IN')}</td>
            </tr>
          </table>

          <p style="font-size: 13px; color: #64748b; background: #fef9c3; border-left: 3px solid #facc15; padding: 10px 14px; border-radius: 6px;">
            ⚠️ <strong>Please Note:</strong> Late payments attract a penalty of <strong>1% per day</strong> on the outstanding EMI amount. Pay on time to avoid extra charges.
          </p>

          <a href="mailto:mrsassociates19@gmail.com" class="cta">Contact MRS Associates</a>

          <p style="font-size: 12px; color: #64748b; margin-bottom: 0; margin-top: 16px;">
            For any support or inquiries, contact us at <a href="mailto:mrsassociates19@gmail.com" style="color: #0d9488;">mrsassociates19@gmail.com</a>.
          </p>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} MRS ASSOCIATES • All Rights Reserved<br>
          Authorized Solar Loan &amp; Financing Partner
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"MRS Associates Solar" <${(process.env.EMAIL_USER || 'mrsassociates19@gmail.com').trim()}>`,
    to: targetEmail,
    subject: isToday
      ? `⚠️ EMI #${emi.emiNumber} Due TODAY — ₹${emiAmount.toLocaleString('en-IN')} | MRS Associates`
      : `📅 EMI Reminder: ₹${emiAmount.toLocaleString('en-IN')} due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''} (EMI #${emi.emiNumber}) | MRS Associates`,
    html: htmlContent
  };

  return await sendEmail(mailOptions, `Due Reminder (EMI #${emi.emiNumber})`);
}

/**
 * Diagnostic test tool to verify email delivery and measure latency
 */
export async function testEmailConnection(targetEmail) {
  const startTime = Date.now();
  const config = await getEmailConfig();

  const dummyPayment = {
    receiptId: `TEST-${Date.now().toString().slice(-4)}`,
    emiNumber: 1,
    paymentDate: new Date().toISOString().split('T')[0],
    paidAmount: 500,
    baseEmiAmount: 500,
    lateFeePaid: 0,
    interestPaid: 10,
    principalPaid: 490,
    remarks: 'Diagnostic Verification Test'
  };

  const dummyCustomer = {
    fullName: 'System Test User',
    customerId: 'TEST-001',
    email: targetEmail
  };

  const result = await sendReceiptEmail(dummyPayment, dummyCustomer, targetEmail);
  const durationMs = Date.now() - startTime;

  return {
    ...result,
    targetEmail,
    durationMs,
    configSummary: {
      activeMethod: result.method || config.activeMethod,
      senderEmail: config.senderEmail,
      hasRelayUrl: !!config.relayUrl,
      hasBrevoKey: !!config.brevoApiKey,
      hasResendKey: !!config.resendApiKey
    }
  };
}

