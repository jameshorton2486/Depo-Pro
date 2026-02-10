// ═══════════════════════════════════════════════════════════════
// EMAIL SERVICE (Zoho Mail SMTP via Nodemailer)
// ═══════════════════════════════════════════════════════════════

import nodemailer from 'nodemailer';
import { logger } from '@/lib/logger';

const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.zoho.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Depo-Pro <info@depo-pro.com>';

const EMAIL_ENABLED = !!(EMAIL_USER && EMAIL_PASSWORD);

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!EMAIL_ENABLED) {
    console.warn('[Email Service] Email not configured - emails will be logged only');
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD,
      },
    });
  }

  return transporter;
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
  const transport = getTransporter();

  if (!transport) {
    // Development mode: log email instead of sending
    if (process.env.NODE_ENV === 'production') {
      console.error('[Email Service] Email sending is not configured in production');
      return {
        id: '',
        success: false,
        error: 'Email service not configured',
      };
    }

    // Development: log email
    logger.debug('📧 [MOCK EMAIL] Email service not configured', {
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      preview: options.text || 'HTML email (text not provided)',
    });

    return {
      id: `mock_email_${Date.now()}`,
      success: true,
    };
  }

  try {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    const info = await transport.sendMail({
      from: EMAIL_FROM,
      to: recipients.join(', '),
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    logger.debug('✅ Email sent via SMTP', { messageId: info.messageId });
    return {
      id: info.messageId || `email_${Date.now()}`,
      success: true,
    };
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
      <h1>🎯 New Job Assignment</h1>
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
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard" class="button">View Assignment</a>
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

View your assignment at: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard

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
      <h1>✅ Transcript Ready</h1>
    </div>
    <div class="content">
      <p>Hello ${data.reporterName},</p>
      <p>Your transcript is now ready for review!</p>
      <h3>Case Information:</h3>
      <ul>
        <li><strong>Case Number:</strong> ${data.caseNumber}</li>
      </ul>
      <p style="margin-top: 30px;">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/transcripts/${data.transcriptId}" class="button">View Transcript</a>
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

View transcript at: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/transcripts/${data.transcriptId}

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
      <h1>💰 Invoice</h1>
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
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/invoices/${data.invoiceNumber}" class="button">View & Pay Invoice</a>
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

View and pay invoice at: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/invoices/${data.invoiceNumber}

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


