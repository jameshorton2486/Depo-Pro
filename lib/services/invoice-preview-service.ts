import { logger } from '@/lib/logger';
// lib/services/invoice-preview-service.ts
// STUB: Invoice preview generation
//
// Production guard: This service is stubbed and will throw in production
// to prevent returning empty invoice previews.

export async function generateInvoicePreview(_jobId: string) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[InvoicePreviewService] generateInvoicePreview is not implemented. ' +
      'This is a stubbed service - implement real invoice preview generation before production deployment.'
    );
  }
  logger.debug('[STUB] generateInvoicePreview called');
  return {
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
  };
}
