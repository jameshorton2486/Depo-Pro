/**
 * Notification Job Handlers
 */

import { registerHandler } from '../queue';

export interface EmailNotificationPayload {
  to: string;
  subject: string;
  body: string;
  template?: string;
}

export interface WebhookNotificationPayload {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: Record<string, any>;
}

async function handleEmailNotification(data: Record<string, unknown>): Promise<void> {
  console.log('[NotificationHandler] Sending email', data);
}

async function handleWebhookNotification(data: Record<string, unknown>): Promise<void> {
  console.log('[NotificationHandler] Sending webhook', data);
}

// Register handlers
registerHandler('EMAIL_NOTIFICATION', handleEmailNotification);
registerHandler('WEBHOOK_NOTIFICATION', handleWebhookNotification);

export { handleEmailNotification, handleWebhookNotification };
