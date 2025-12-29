// =============================================================================
// WEBHOOK SIGNING & VERIFICATION
// =============================================================================
// Cryptographic signing for webhook payloads
// =============================================================================

import crypto from 'crypto';

// =============================================================================
// CONFIGURATION
// =============================================================================

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'webhook-secret-change-in-production';
const SIGNATURE_HEADER = 'X-Webhook-Signature';
const TIMESTAMP_HEADER = 'X-Webhook-Timestamp';
const TOLERANCE_SECONDS = 300; // 5 minutes

// =============================================================================
// SIGNING
// =============================================================================

/**
 * Sign a webhook payload
 * Returns HMAC-SHA256 signature
 */
export function signPayload(payload: string, secret: string = WEBHOOK_SECRET): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Create a signed webhook payload with timestamp
 */
export function createSignedPayload(
  event: string,
  data: Record<string, unknown>,
  secret: string = WEBHOOK_SECRET
): {
  body: string;
  signature: string;
  timestamp: string;
} {
  const timestamp = new Date().toISOString();
  
  const body = JSON.stringify({
    event,
    data,
    timestamp,
    version: '1.0',
  });
  
  // Include timestamp in signature to prevent replay attacks
  const signedContent = `${timestamp}.${body}`;
  const signature = signPayload(signedContent, secret);
  
  return {
    body,
    signature,
    timestamp,
  };
}

// =============================================================================
// VERIFICATION
// =============================================================================

export interface VerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Verify a webhook signature
 */
export function verifySignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string = WEBHOOK_SECRET
): VerificationResult {
  // Check timestamp to prevent replay attacks
  const timestampMs = Date.parse(timestamp);
  if (isNaN(timestampMs)) {
    return { valid: false, error: 'Invalid timestamp' };
  }
  
  const ageSeconds = (Date.now() - timestampMs) / 1000;
  if (ageSeconds > TOLERANCE_SECONDS) {
    return { valid: false, error: 'Timestamp too old (possible replay attack)' };
  }
  
  if (ageSeconds < -TOLERANCE_SECONDS) {
    return { valid: false, error: 'Timestamp in future' };
  }
  
  // Verify signature
  const signedContent = `${timestamp}.${payload}`;
  const expectedSignature = signPayload(signedContent, secret);
  
  // Use timing-safe comparison
  try {
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    
    if (sigBuffer.length !== expectedBuffer.length) {
      return { valid: false, error: 'Invalid signature' };
    }
    
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: false, error: 'Invalid signature' };
    }
  } catch {
    return { valid: false, error: 'Invalid signature format' };
  }
  
  return { valid: true };
}

/**
 * Verify webhook from request headers
 */
export function verifyWebhookRequest(
  body: string,
  headers: Headers | Record<string, string>,
  secret: string = WEBHOOK_SECRET
): VerificationResult {
  const getHeader = (name: string): string | null => {
    if (headers instanceof Headers) {
      return headers.get(name);
    }
    return headers[name] || headers[name.toLowerCase()] || null;
  };
  
  const signature = getHeader(SIGNATURE_HEADER);
  const timestamp = getHeader(TIMESTAMP_HEADER);
  
  if (!signature) {
    return { valid: false, error: 'Missing signature header' };
  }
  
  if (!timestamp) {
    return { valid: false, error: 'Missing timestamp header' };
  }
  
  return verifySignature(body, signature, timestamp, secret);
}

// =============================================================================
// HEADER HELPERS
// =============================================================================

/**
 * Get webhook headers for outgoing request
 */
export function getWebhookHeaders(
  signature: string,
  timestamp: string,
  event: string
): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    [SIGNATURE_HEADER]: signature,
    [TIMESTAMP_HEADER]: timestamp,
    'X-Webhook-Event': event,
    'X-Webhook-Version': '1.0',
  };
}
