// =============================================================================
// NOTIFICATION JOB HANDLER
// =============================================================================
// Handles async notification delivery (email, webhooks)
// =============================================================================

import { logger } from '@/lib/logger';
import {
  JobType,
  JobHandler,
  QueueJob,
  NotificationEmailPayload,
  NotificationWebhookPayload,
} from '../types';
import { registerHandler } from '../queue';

// =============================================================================
// EMAIL NOTIFICATION HANDLER
// =============================================================================

const emailNotificationHandler: JobHandler<NotificationEmailPayload> = {
  type: JobType.NOTIFICATION_EMAIL,
  
  async handle(job: QueueJob<NotificationEmailPayload>) {
    const { to, subject, template, data } = job.payload;
    
    logger.info('Sending email notification', { to, subject, template });
    
    try {
      // Import email service dynamically
      const { sendEmail } = await import('@/lib/email');
      
      const htmlContent = (data?.htmlContent as string) || `Email notification: ${subject}`;
      const textContent = (data?.textContent as string) || `Email notification: ${subject}`;

      await sendEmail({
        to,
        subject,
        html: htmlContent,
        text: textContent,
      });
      
      logger.info('Email sent successfully', { to, subject });
      
    } catch (error) {
      logger.error('Failed to send email', error as Error, { to, subject });
      throw error;
    }
  },
  
  onError: async (job, error) => {
    logger.error('Email notification failed', error, {
      to: job.payload.to,
      attempts: job.attempts,
    });
  },
  
  shouldRetry: (job, error) => {
    // Don't retry for invalid email addresses
    if (error.message.includes('Invalid email') ||
        error.message.includes('rejected')) {
      return false;
    }
    return job.attempts < job.maxAttempts;
  },
};

// =============================================================================
// WEBHOOK NOTIFICATION HANDLER
// =============================================================================

const webhookNotificationHandler: JobHandler<NotificationWebhookPayload> = {
  type: JobType.NOTIFICATION_WEBHOOK,
  
  async handle(job: QueueJob<NotificationWebhookPayload>) {
    const { webhookUrl, event, payload, firmId } = job.payload;
    
    logger.info('Dispatching webhook', { webhookUrl, event, firmId });
    
    try {
      const { signPayload } = await import('@/lib/webhooks/sign');
      
      const body = JSON.stringify({
        event,
        payload,
        timestamp: new Date().toISOString(),
        firmId,
      });
      
      const signature = signPayload(body);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
          'X-Webhook-Timestamp': new Date().toISOString(),
        },
        body,
      });
      
      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }
      
      logger.info('Webhook dispatched successfully', { webhookUrl, event });
      
    } catch (error) {
      logger.error('Webhook dispatch failed', error as Error, { webhookUrl, event });
      throw error;
    }
  },
  
  shouldRetry: (job, error) => {
    // Retry for network errors
    if (error.message.includes('fetch failed') ||
        error.message.includes('ECONNREFUSED')) {
      return job.attempts < job.maxAttempts;
    }
    
    // Don't retry for 4xx errors (client errors)
    if (error.message.includes('status 4')) {
      return false;
    }
    
    return job.attempts < job.maxAttempts;
  },
};

// =============================================================================
// REGISTER HANDLERS
// =============================================================================

registerHandler(emailNotificationHandler);
registerHandler(webhookNotificationHandler);

export { emailNotificationHandler, webhookNotificationHandler };
