// ═══════════════════════════════════════════════════════════════
// EMAIL SERVICE (Resend API)
// ═══════════════════════════════════════════════════════════════

import { Resend } from 'resend';
import { logger } from '@/lib/logger';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = 'Depo-Pro <notifications@depo-pro.com>';
const EMAIL_ENABLED = !!RESEND_API_KEY;

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!EMAIL_ENABLED) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface EmailResult {
  id: string;
  success: boolean;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// EMAIL SENDING
// ═══════════════════════════════════════════════════════════════

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const client = getResendClient();

  if (!client) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Email Service] RESEND_API_KEY not configured in production');
      return { id: '', success: false, error: 'Email service not configured' };
    }

    logger.debug('[MOCK EMAIL] Resend not configured', {
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
    });

    return { id: `mock_email_${Date.now()}`, success: true };
  }

  try {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    const { data, error } = await client.emails.send({
      from: EMAIL_FROM,
      to: recipients,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error('[Email Service] Resend error:', error);
      return { id: '', success: false, error: error.message };
    }

    return { id: data?.id ?? `email_${Date.now()}`, success: true };
  } catch (error) {
    console.error('[Email Service] Failed to send email:', error);
    return {
      id: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function isEmailConfigured(): boolean {
  return EMAIL_ENABLED;
}

// ═══════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════

export function jobAssignedEmail(data: {
  scopistName: string;
  scopistEmail: string;
  reporterName: string;
  caseNumber: string;
  depositionDate?: Date;
  notes?: string;
}): EmailOptions {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
    .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Job Assignment</h1>
    </div>
    <div class="content">
      <p>Hello ${data.scopistName},</p>
      <p>You have been assigned a new job by <strong>${data.reporterName}</strong>.</p>
      <h3>Job Details:</h3>
      <ul>
        <li><strong>Case Number:</strong> ${data.caseNumber}</li>
        ${data.depositionDate ? `<li><strong>Deposition Date:</strong> ${data.depositionDate.toLocaleDateString()}</li>` : ''}
        ${data.notes ? `<li><strong>Notes:</strong> ${data.notes}</li>` : ''}
      </ul>
      <p style="margin-top: 30px;">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://depo-pro.com'}/dashboard" class="button">View Assignment</a>
      </p>
    </div>
    <div class="footer">
      <p>Depo-Pro Court Reporting Management System</p>
      <p>This is an automated notification. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
`;

  const text = `
Hello ${data.scopistName},

You have been assigned a new job by ${data.reporterName}.

Job Details:
- Case Number: ${data.caseNumber}
${data.depositionDate ? `- Deposition Date: ${data.depositionDate.toLocaleDateString()}` : ''}
${data.notes ? `- Notes: ${data.notes}` : ''}

View your assignment at: ${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://depo-pro.com'}/dashboard

---
Depo-Pro Court Reporting Management System
`;

  return {
    to: data.scopistEmail,
    subject: `New Job Assignment: ${data.caseNumber}`,
    html,
    text,
  };
}

export function transcriptReadyEmail(data: {
  reporterName: string;
  reporterEmail: string;
  caseNumber: string;
  transcriptId: string;
}): EmailOptions {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
    .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Transcript Ready</h1>
    </div>
    <div class="content">
      <p>Hello ${data.reporterName},</p>
      <p>Your transcript is now ready for review!</p>
      <h3>Case Information:</h3>
      <ul>
        <li><strong>Case Number:</strong> ${data.caseNumber}</li>
      </ul>
      <p style="margin-top: 30px;">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://depo-pro.com'}/transcripts/${data.transcriptId}" class="button">View Transcript</a>
      </p>
    </div>
    <div class="footer">
      <p>Depo-Pro Court Reporting Management System</p>
      <p>This is an automated notification. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
`;

  const text = `
Hello ${data.reporterName},

Your transcript is now ready for review!

Case Number: ${data.caseNumber}

View transcript at: ${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://depo-pro.com'}/transcripts/${data.transcriptId}

---
Depo-Pro Court Reporting Management System
`;

  return {
    to: data.reporterEmail,
    subject: `Transcript Ready: ${data.caseNumber}`,
    html,
    text,
  };
}

export function invoiceEmail(data: {
  clientName: string;
  clientEmail: string;
  invoiceNumber: string;
  amount: number;
  dueDate: Date;
}): EmailOptions {
  const formattedAmount = `$${(data.amount / 100).toFixed(2)}`;
  const adminEmail = process.env.ADMIN_EMAIL || 'info@depo-pro.com';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
    .button { display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; }
    .amount { font-size: 24px; font-weight: bold; color: #f59e0b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Invoice</h1>
    </div>
    <div class="content">
      <p>Hello ${data.clientName},</p>
      <p>Please find your invoice details below:</p>
      <h3>Invoice Details:</h3>
      <ul>
        <li><strong>Invoice Number:</strong> ${data.invoiceNumber}</li>
        <li><strong>Amount Due:</strong> <span class="amount">${formattedAmount}</span></li>
        <li><strong>Due Date:</strong> ${data.dueDate.toLocaleDateString()}</li>
      </ul>
      <p style="margin-top: 30px;">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://depo-pro.com'}/invoices/${data.invoiceNumber}" class="button">View & Pay Invoice</a>
      </p>
    </div>
    <div class="footer">
      <p>Depo-Pro Court Reporting Management System</p>
      <p>Questions? Contact us at ${adminEmail}</p>
    </div>
  </div>
</body>
</html>
`;

  const text = `
Hello ${data.clientName},

Please find your invoice details below:

Invoice Number: ${data.invoiceNumber}
Amount Due: ${formattedAmount}
Due Date: ${data.dueDate.toLocaleDateString()}

View and pay invoice at: ${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://depo-pro.com'}/invoices/${data.invoiceNumber}

Questions? Contact us at ${adminEmail}

---
Depo-Pro Court Reporting Management System
`;

  return {
    to: data.clientEmail,
    subject: `Invoice ${data.invoiceNumber} - Amount Due: ${formattedAmount}`,
    html,
    text,
  };
}
