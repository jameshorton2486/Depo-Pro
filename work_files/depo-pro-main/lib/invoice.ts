// ═══════════════════════════════════════════════════════════════
// INVOICE SERVICE (Mock Implementation - Ready for Stripe)
// ═══════════════════════════════════════════════════════════════

const USE_STRIPE = process.env.USE_STRIPE === 'true';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number; // in cents
  total: number; // in cents
}

export interface InvoiceData {
  invoiceNumber: string;
  jobId: string;
  caseNumber?: string;
  clientName?: string;
  clientEmail?: string;
  clientContact?: string;
  items: InvoiceItem[];
  subtotal: number; // in cents
  tax: number; // in cents
  total: number; // in cents
  dueDate: Date;
  notes?: string;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  clientSecret?: string;
}

// ═══════════════════════════════════════════════════════════════
// INVOICE GENERATION
// ═══════════════════════════════════════════════════════════════

export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
}

export function calculateInvoiceTotal(items: InvoiceItem[], taxRate = 0): {
  subtotal: number;
  tax: number;
  total: number;
} {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + tax;

  return { subtotal, tax, total };
}

// ═══════════════════════════════════════════════════════════════
// STRIPE PAYMENT INTENT (Mock)
// ═══════════════════════════════════════════════════════════════

export async function createPaymentIntent(
  amount: number,
  currency = 'usd',
  _metadata?: Record<string, string>
): Promise<PaymentIntent> {
  if (USE_STRIPE && STRIPE_SECRET_KEY) {
    // TODO: Implement real Stripe integration
    // const stripe = await import('stripe');
    // const stripeClient = new stripe.default(STRIPE_SECRET_KEY, {
    //   apiVersion: '2023-10-16',
    // });
    //
    // const paymentIntent = await stripeClient.paymentIntents.create({
    //   amount,
    //   currency,
    //   metadata,
    // });
    //
    // return {
    //   id: paymentIntent.id,
    //   amount: paymentIntent.amount,
    //   currency: paymentIntent.currency,
    //   status: paymentIntent.status,
    //   clientSecret: paymentIntent.client_secret,
    // };
  }

  // Mock payment intent
  console.log('[MOCK] Creating Stripe PaymentIntent', { amount, currency, metadata: _metadata });
  
  return {
    id: `pi_mock_${Date.now()}`,
    amount,
    currency,
    status: 'requires_payment_method',
    clientSecret: `pi_mock_${Date.now()}_secret_${Math.random().toString(36).slice(2)}`,
  };
}

export async function confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
  if (USE_STRIPE && STRIPE_SECRET_KEY) {
    // TODO: Implement real Stripe confirmation
    // const stripe = await import('stripe');
    // const stripeClient = new stripe.default(STRIPE_SECRET_KEY, {
    //   apiVersion: '2023-10-16',
    // });
    //
    // const paymentIntent = await stripeClient.paymentIntents.confirm(paymentIntentId);
    //
    // return {
    //   id: paymentIntent.id,
    //   amount: paymentIntent.amount,
    //   currency: paymentIntent.currency,
    //   status: paymentIntent.status,
    // };
  }

  // Mock confirmation - simulate success
  return {
    id: paymentIntentId,
    amount: 10000,
    currency: 'usd',
    status: 'succeeded',
  };
}

// ═══════════════════════════════════════════════════════════════
// INVOICE PDF GENERATION (Mock)
// ═══════════════════════════════════════════════════════════════

export async function generateInvoicePDF(invoice: InvoiceData): Promise<Buffer> {
  // TODO: Implement with PDFKit or Puppeteer
  // See lib/export.ts for PDF generation examples

  // Mock: Return formatted text as buffer
  const content = formatInvoiceText(invoice);
  return Buffer.from(content, 'utf-8');
}

function formatInvoiceText(invoice: InvoiceData): string {
  let text = '';
  
  text += '═══════════════════════════════════════════════════════════════\n';
  text += '                           INVOICE\n';
  text += '═══════════════════════════════════════════════════════════════\n\n';
  
  text += `Invoice Number: ${invoice.invoiceNumber}\n`;
  text += `Date: ${new Date().toLocaleDateString()}\n`;
  text += `Due Date: ${invoice.dueDate.toLocaleDateString()}\n\n`;
  
  if (invoice.clientName) {
    text += `Bill To:\n${invoice.clientName}\n`;
    if (invoice.clientEmail) {
      text += `${invoice.clientEmail}\n`;
    }
    text += '\n';
  }
  
  if (invoice.caseNumber) {
    text += `Case Number: ${invoice.caseNumber}\n\n`;
  }
  
  text += '───────────────────────────────────────────────────────────────\n';
  text += 'DESCRIPTION                           QTY    RATE      AMOUNT\n';
  text += '───────────────────────────────────────────────────────────────\n';
  
  invoice.items.forEach(item => {
    const desc = item.description.padEnd(35);
    const qty = item.quantity.toString().padStart(5);
    const rate = formatCurrency(item.unitPrice).padStart(9);
    const total = formatCurrency(item.total).padStart(11);
    text += `${desc} ${qty} ${rate} ${total}\n`;
  });
  
  text += '───────────────────────────────────────────────────────────────\n';
  text += `${'Subtotal:'.padEnd(35)} ${formatCurrency(invoice.subtotal).padStart(30)}\n`;
  text += `${'Tax:'.padEnd(35)} ${formatCurrency(invoice.tax).padStart(30)}\n`;
  text += `${'TOTAL:'.padEnd(35)} ${formatCurrency(invoice.total).padStart(30)}\n`;
  text += '═══════════════════════════════════════════════════════════════\n\n';
  
  if (invoice.notes) {
    text += `Notes:\n${invoice.notes}\n\n`;
  }
  
  text += 'Thank you for your business!\n';
  text += 'Depo-Pro Court Reporting Management System\n';
  
  return text;
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ═══════════════════════════════════════════════════════════════
// PRICING CALCULATIONS
// ═══════════════════════════════════════════════════════════════

export interface PricingRates {
  perPage: number; // cents
  perMinute: number; // cents
  rushMultiplier: number; // e.g., 1.5 for 50% rush fee
  expeditedFee: number; // cents
}

export const DEFAULT_RATES: PricingRates = {
  perPage: 350, // $3.50 per page
  perMinute: 150, // $1.50 per minute
  rushMultiplier: 1.5,
  expeditedFee: 10000, // $100 flat fee
};

export function calculateJobPrice(
  pageCount: number,
  durationMinutes: number,
  isRush: boolean,
  rates = DEFAULT_RATES
): InvoiceItem[] {
  const items: InvoiceItem[] = [];

  // Transcription by pages
  if (pageCount > 0) {
    const basePrice = pageCount * rates.perPage;
    items.push({
      description: `Transcription (${pageCount} pages @ ${formatCurrency(rates.perPage)}/page)`,
      quantity: pageCount,
      unitPrice: rates.perPage,
      total: basePrice,
    });
  }

  // Audio duration charge
  if (durationMinutes > 0) {
    const durationPrice = durationMinutes * rates.perMinute;
    items.push({
      description: `Audio Processing (${durationMinutes} minutes @ ${formatCurrency(rates.perMinute)}/min)`,
      quantity: durationMinutes,
      unitPrice: rates.perMinute,
      total: durationPrice,
    });
  }

  // Rush fee
  if (isRush) {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const rushFee = Math.round(subtotal * (rates.rushMultiplier - 1));
    items.push({
      description: 'Rush Processing Fee (50%)',
      quantity: 1,
      unitPrice: rushFee,
      total: rushFee,
    });
  }

  return items;
}
