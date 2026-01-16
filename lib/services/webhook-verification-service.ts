// lib/services/webhook-verification-service.ts
// STUB: Webhook verification service
//
// Production guard: This service is stubbed and will throw in production
// to prevent unverified webhooks from being processed.

export async function processWebhookRequest(
  _payload: string | Buffer,
  _signature: string | null
): Promise<{ success: boolean; status: number; body?: any; event?: any }> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[WebhookVerificationService] processWebhookRequest is not implemented. ' +
      'This is a stubbed service - implement real webhook verification before production deployment. ' +
      'Unverified webhooks pose a security risk.'
    );
  }
  console.log('[STUB] processWebhookRequest called');
  return { success: false, status: 400, body: { error: 'Webhook verification not implemented' } };
}

export function verifyStripeSignature(_payload: string, ___signature: string) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[WebhookVerificationService] verifyStripeSignature is not implemented. ' +
      'This is a stubbed service - implement real Stripe signature verification before production deployment. ' +
      'Unverified webhooks pose a security risk.'
    );
  }
  console.log('[STUB] verifyStripeSignature called');
  return { valid: false };
}
