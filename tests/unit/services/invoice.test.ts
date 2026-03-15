import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  generateInvoiceNumber,
  calculateInvoiceTotal,
  calculateJobPrice,
  createPaymentIntent,
  confirmPaymentIntent,
  DEFAULT_RATES,
} from '@/lib/invoice';

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('Invoice Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.USE_STRIPE;
    delete process.env.STRIPE_SECRET_KEY;
    process.env.NODE_ENV = 'test';
  });

  describe('generateInvoiceNumber', () => {
    it('returns INV-YYMM-XXXX format', () => {
      const num = generateInvoiceNumber();
      expect(num).toMatch(/^INV-\d{4}-\d{4}$/);
    });

    it('generates unique numbers', () => {
      const numbers = new Set(Array.from({ length: 50 }, () => generateInvoiceNumber()));
      // With 10000 possible random suffixes, 50 should all be unique
      expect(numbers.size).toBe(50);
    });
  });

  describe('calculateInvoiceTotal', () => {
    it('sums items correctly with no tax', () => {
      const result = calculateInvoiceTotal([
        { description: 'A', quantity: 1, unitPrice: 1000, total: 1000 },
        { description: 'B', quantity: 2, unitPrice: 500, total: 1000 },
      ]);

      expect(result.subtotal).toBe(2000);
      expect(result.tax).toBe(0);
      expect(result.total).toBe(2000);
    });

    it('applies tax rate', () => {
      const result = calculateInvoiceTotal(
        [{ description: 'Service', quantity: 1, unitPrice: 10000, total: 10000 }],
        0.0825, // 8.25% tax
      );

      expect(result.subtotal).toBe(10000);
      expect(result.tax).toBe(825);
      expect(result.total).toBe(10825);
    });

    it('handles empty items array', () => {
      const result = calculateInvoiceTotal([]);
      expect(result.subtotal).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('calculateJobPrice', () => {
    it('calculates per-page pricing', () => {
      const items = calculateJobPrice(10, 0, false);
      const pageItem = items.find(i => i.description.includes('page'));
      expect(pageItem).toBeDefined();
      expect(pageItem!.total).toBe(10 * DEFAULT_RATES.perPage);
    });

    it('calculates per-minute pricing with 15-min minimum', () => {
      const items = calculateJobPrice(0, 5, false); // 5 minutes → billed as 15
      const minuteItem = items.find(i => i.description.includes('minute'));
      expect(minuteItem).toBeDefined();
      expect(minuteItem!.quantity).toBe(15); // 15-min minimum
      expect(minuteItem!.total).toBe(15 * DEFAULT_RATES.perMinute);
    });

    it('applies rush fee as 50% surcharge', () => {
      const items = calculateJobPrice(0, 30, true);
      const rushItem = items.find(i => i.description.includes('Rush'));
      expect(rushItem).toBeDefined();

      const subtotal = items.filter(i => !i.description.includes('Rush'))
        .reduce((sum, i) => sum + i.total, 0);
      expect(rushItem!.total).toBe(Math.round(subtotal * 0.5));
    });

    it('includes RX enhancement flat fee', () => {
      const items = calculateJobPrice(0, 30, false, DEFAULT_RATES, {
        includeRxEnhancement: true,
      });
      const rxItem = items.find(i => i.description.includes('Forensic'));
      expect(rxItem).toBeDefined();
      expect(rxItem!.total).toBe(DEFAULT_RATES.rxFlatFee); // $150
    });

    it('includes human review per-thousand-words charge', () => {
      const items = calculateJobPrice(0, 30, false, DEFAULT_RATES, {
        humanReviewWordCount: 5000,
      });
      const reviewItem = items.find(i => i.description.includes('Review'));
      expect(reviewItem).toBeDefined();
      expect(reviewItem!.quantity).toBe(5); // 5000 / 1000
    });
  });

  describe('createPaymentIntent (mock mode)', () => {
    it('returns mock payment intent in non-production', async () => {
      const result = await createPaymentIntent(5000, 'usd');

      expect(result.id).toMatch(/^pi_mock_/);
      expect(result.amount).toBe(5000);
      expect(result.currency).toBe('usd');
      expect(result.status).toBe('requires_payment_method');
      expect(result.clientSecret).toBeDefined();
    });
  });

  describe('confirmPaymentIntent (mock mode)', () => {
    it('returns succeeded status in non-production', async () => {
      const result = await confirmPaymentIntent('pi_mock_123');

      expect(result.id).toBe('pi_mock_123');
      expect(result.status).toBe('succeeded');
      expect(result.amount).toBe(10000);
    });
  });

  describe('DEFAULT_RATES', () => {
    it('has expected locked pricing values', () => {
      expect(DEFAULT_RATES.perPage).toBe(350);     // $3.50
      expect(DEFAULT_RATES.perMinute).toBe(160);   // $1.60
      expect(DEFAULT_RATES.rushMultiplier).toBe(1.5);
      expect(DEFAULT_RATES.expeditedFee).toBe(10000); // $100
      expect(DEFAULT_RATES.rxFlatFee).toBe(15000);    // $150
    });
  });
});
