// ═══════════════════════════════════════════════════════════════
// BILLING SERVICE
// lib/services/billing-service.ts
//
// Core billing logic for Depo-Pro transcription services
// Handles rate calculation, usage tracking, and invoice generation
// ═══════════════════════════════════════════════════════════════

import {
  BillingServiceType,
  BillingUnit,
  InvoiceStatus,
  Prisma,
} from '@/types/database';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface BillingCalculation {
  serviceType: BillingServiceType;
  quantity: number;
  unit: BillingUnit;
  unitPriceCents: number;
  totalCents: number;
  rateVersion: number;
  description: string;
}

export interface JobBillingSnapshot {
  jobId: string;
  firmId: string;
  processingMode: 'AUTOMATED' | 'MANUAL_RX';
  audioDurationMinutes: number;
  modelTier: 'STANDARD' | 'ENHANCED';
  lineItems: BillingCalculation[];
  totalCents: number;
  createdAt: Date;
}

export interface CreateInvoiceOptions {
  firmId: string;
  periodStart: Date;
  periodEnd: Date;
  jobIds?: string[];
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT RATES (Used when no firm-specific rate exists)
// ═══════════════════════════════════════════════════════════════

// =============================================================================
// LOCKED PRICING (matches Authoritative Build Specification - Phase 6B)
// =============================================================================
export const DEFAULT_RATES: Record<BillingServiceType, {
  unit: BillingUnit;
  amountCents: number;
  description: string;
}> = {
  TRANSCRIPTION_AUTOMATED: {
    unit: 'PER_MINUTE',
    amountCents: 160, // $1.60 per minute (Phase 6B spec)
    description: 'Automated transcription with AI enhancement',
  },
  MODEL_UPGRADE: {
    unit: 'PER_MINUTE',
    amountCents: 40, // $0.40 per minute additional (1.25× multiplier = base + 25%)
    description: 'Enhanced ASR model upgrade',
  },
  HUMAN_REVIEW_CONFIDENCE: {
    unit: 'PER_WORD',
    amountCents: 0.035, // $0.35 per 1,000 words = $0.00035 per word (Phase 6B spec)
    description: 'Human review of low-confidence words (<90% confidence)',
  },
  HUMAN_REVIEW_FULL: {
    unit: 'PER_MINUTE',
    amountCents: 125, // $1.25 per minute (Phase 6B spec)
    description: 'Full human scopist review',
  },
  FORENSIC_AUDIO_RX: {
    unit: 'PER_FILE',
    amountCents: 15000, // $150 flat fee per file (Phase 6B spec)
    description: 'Manual forensic audio enhancement (iZotope RX)',
  },
};

// ═══════════════════════════════════════════════════════════════
// BILLING SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

export class BillingService {
  // ═══════════════════════════════════════════════════════════════
  // GET OR CREATE BILLING ACCOUNT
  // ═══════════════════════════════════════════════════════════════

  static async getOrCreateBillingAccount(firmId: string, billingEmail: string) {
    let account = await db.billingAccount.findUnique({
      where: { firmId },
    });

    if (!account) {
      account = await db.billingAccount.create({
        data: {
          firmId,
          billingEmail,
        },
      });

      // Create default rates for the account
      await this.initializeDefaultRates(firmId);
    }

    return account;
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZE DEFAULT RATES
  // ═══════════════════════════════════════════════════════════════

  static async initializeDefaultRates(firmId: string) {
    const rates = Object.entries(DEFAULT_RATES).map(([serviceType, config]) => ({
      firmId,
      serviceType: serviceType as BillingServiceType,
      unit: config.unit,
      amountCents: config.amountCents,
      version: 1,
      isActive: true,
    }));

    await db.billingRate.createMany({
      data: rates,
      skipDuplicates: true,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // GET CURRENT RATE
  // ═══════════════════════════════════════════════════════════════

  static async getCurrentRate(
    firmId: string,
    serviceType: BillingServiceType,
  ): Promise<{ amountCents: number; unit: BillingUnit; version: number }> {
    const rate = await db.billingRate.findFirst({
      where: {
        firmId,
        serviceType,
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });

    if (rate) {
      return {
        amountCents: rate.amountCents,
        unit: rate.unit,
        version: rate.version,
      };
    }

    // Fall back to default rate
    const defaultRate = DEFAULT_RATES[serviceType];
    return {
      amountCents: defaultRate.amountCents,
      unit: defaultRate.unit,
      version: 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // CALCULATE JOB BILLING
  // ═══════════════════════════════════════════════════════════════

  static async calculateJobBilling(
    jobId: string,
    firmId: string,
    options: {
      processingMode: 'AUTOMATED' | 'MANUAL_RX';
      audioDurationMinutes: number;
      modelTier: 'STANDARD' | 'ENHANCED';
      humanReviewMinutes?: number;
      wordsReviewed?: number;
      fullScopistReview?: boolean;
    },
  ): Promise<JobBillingSnapshot> {
    const lineItems: BillingCalculation[] = [];

    // 1. Base transcription (always charged)
    const transcriptionRate = await this.getCurrentRate(
      firmId,
      'TRANSCRIPTION_AUTOMATED',
    );
    
    const transcriptionTotal = Math.ceil(options.audioDurationMinutes) * transcriptionRate.amountCents;
    
    lineItems.push({
      serviceType: 'TRANSCRIPTION_AUTOMATED',
      quantity: Math.ceil(options.audioDurationMinutes),
      unit: transcriptionRate.unit,
      unitPriceCents: transcriptionRate.amountCents,
      totalCents: transcriptionTotal,
      rateVersion: transcriptionRate.version,
      description: `Automated transcription (${Math.ceil(options.audioDurationMinutes)} min)`,
    });

    // 2. Model upgrade (if enhanced tier)
    if (options.modelTier === 'ENHANCED') {
      const modelRate = await this.getCurrentRate(firmId, 'MODEL_UPGRADE');
      const modelTotal = Math.ceil(options.audioDurationMinutes) * modelRate.amountCents;
      
      lineItems.push({
        serviceType: 'MODEL_UPGRADE',
        quantity: Math.ceil(options.audioDurationMinutes),
        unit: modelRate.unit,
        unitPriceCents: modelRate.amountCents,
        totalCents: modelTotal,
        rateVersion: modelRate.version,
        description: `Enhanced ASR model (${Math.ceil(options.audioDurationMinutes)} min)`,
      });
    }

    // 3. Forensic RX enhancement (if manual mode)
    if (options.processingMode === 'MANUAL_RX') {
      const rxRate = await this.getCurrentRate(firmId, 'FORENSIC_AUDIO_RX');
      
      lineItems.push({
        serviceType: 'FORENSIC_AUDIO_RX',
        quantity: 1,
        unit: rxRate.unit,
        unitPriceCents: rxRate.amountCents,
        totalCents: rxRate.amountCents,
        rateVersion: rxRate.version,
        description: 'Manual forensic audio enhancement (iZotope RX)',
      });
    }

    // 4. Confidence-based human review (if words reviewed)
    if (options.wordsReviewed && options.wordsReviewed > 0) {
      const reviewRate = await this.getCurrentRate(firmId, 'HUMAN_REVIEW_CONFIDENCE');
      const reviewTotal = options.wordsReviewed * reviewRate.amountCents;
      
      lineItems.push({
        serviceType: 'HUMAN_REVIEW_CONFIDENCE',
        quantity: options.wordsReviewed,
        unit: reviewRate.unit,
        unitPriceCents: reviewRate.amountCents,
        totalCents: reviewTotal,
        rateVersion: reviewRate.version,
        description: `Human review of flagged words (${options.wordsReviewed} words)`,
      });
    }

    // 5. Full scopist review (if requested)
    if (options.fullScopistReview) {
      const scopistRate = await this.getCurrentRate(firmId, 'HUMAN_REVIEW_FULL');
      const scopistTotal = Math.ceil(options.audioDurationMinutes) * scopistRate.amountCents;
      
      lineItems.push({
        serviceType: 'HUMAN_REVIEW_FULL',
        quantity: Math.ceil(options.audioDurationMinutes),
        unit: scopistRate.unit,
        unitPriceCents: scopistRate.amountCents,
        totalCents: scopistTotal,
        rateVersion: scopistRate.version,
        description: `Full scopist review (${Math.ceil(options.audioDurationMinutes)} min)`,
      });
    }

    // Calculate total
    const totalCents = lineItems.reduce((sum, item) => sum + item.totalCents, 0);

    return {
      jobId,
      firmId,
      processingMode: options.processingMode,
      audioDurationMinutes: options.audioDurationMinutes,
      modelTier: options.modelTier,
      lineItems,
      totalCents,
      createdAt: new Date(),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // RECORD USAGE
  // ═══════════════════════════════════════════════════════════════

  static async recordUsage(
    firmId: string,
    jobId: string,
    serviceType: BillingServiceType,
    quantity: number,
    unit: BillingUnit,
  ) {
    return db.billingUsageRecord.create({
      data: {
        firmId,
        jobId,
        serviceType,
        quantity: new Prisma.Decimal(quantity),
        unit,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // RECORD ALL JOB USAGE FROM SNAPSHOT
  // ═══════════════════════════════════════════════════════════════

  static async recordJobUsage(snapshot: JobBillingSnapshot) {
    const records = snapshot.lineItems.map((item) => ({
      firmId: snapshot.firmId,
      jobId: snapshot.jobId,
      serviceType: item.serviceType,
      quantity: new Prisma.Decimal(item.quantity),
      unit: item.unit,
    }));

    await db.billingUsageRecord.createMany({
      data: records,
    });

    return records.length;
  }

  // ═══════════════════════════════════════════════════════════════
  // GET UNBILLED USAGE
  // ═══════════════════════════════════════════════════════════════

  static async getUnbilledUsage(firmId: string, beforeDate?: Date) {
    return db.billingUsageRecord.findMany({
      where: {
        firmId,
        invoiceLineItemId: null,
        ...(beforeDate && { recordedAt: { lte: beforeDate } }),
      },
      orderBy: { recordedAt: 'asc' },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // GENERATE INVOICE NUMBER
  // ═══════════════════════════════════════════════════════════════

  static async generateInvoiceNumber(firmId: string): Promise<string> {
    const count = await db.invoice.count({
      where: {
        billingAccount: { firmId },
      },
    });

    const year = new Date().getFullYear();
    const sequence = (count + 1).toString().padStart(4, '0');
    
    return `INV-${year}-${sequence}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // CREATE INVOICE FROM USAGE
  // ═══════════════════════════════════════════════════════════════

  static async createInvoice(options: CreateInvoiceOptions) {
    const { firmId, periodStart, periodEnd, jobIds } = options;

    // Get billing account
    const account = await db.billingAccount.findUnique({
      where: { firmId },
    });

    if (!account) {
      throw new Error('Billing account not found');
    }

    // Get unbilled usage for the period
    const usageRecords = await db.billingUsageRecord.findMany({
      where: {
        firmId,
        invoiceLineItemId: null,
        recordedAt: {
          gte: periodStart,
          lte: periodEnd,
        },
        ...(jobIds && { jobId: { in: jobIds } }),
      },
      orderBy: { recordedAt: 'asc' },
    });

    if (usageRecords.length === 0) {
      throw new Error('No unbilled usage found for the period');
    }

    // Group usage by service type
    const groupedUsage = usageRecords.reduce((acc, record) => {
      const key = record.serviceType;
      if (!acc[key]) {
        acc[key] = {
          serviceType: record.serviceType,
          unit: record.unit,
          quantity: 0,
          records: [],
        };
      }
      acc[key].quantity += Number(record.quantity);
      acc[key].records.push(record);
      return acc;
    }, {} as Record<string, { serviceType: BillingServiceType; unit: BillingUnit; quantity: number; records: typeof usageRecords }>);

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(firmId);

    // Create invoice with line items
    const invoice = await db.invoice.create({
      data: {
        billingAccountId: account.id,
        invoiceNumber,
        periodStart,
        periodEnd,
        totalCents: 0, // Will be updated
        status: 'DRAFT',
        lineItems: {
          create: await Promise.all(
            Object.values(groupedUsage).map(async (group) => {
              const rate = await this.getCurrentRate(firmId, group.serviceType);
              const totalCents = Math.round(group.quantity * rate.amountCents);
              const description = DEFAULT_RATES[group.serviceType].description;

              return {
                serviceType: group.serviceType,
                description: `${description} (${group.quantity.toFixed(2)} ${group.unit.toLowerCase().replace('per_', '')})`,
                quantity: new Prisma.Decimal(group.quantity),
                unit: group.unit,
                unitPriceCents: rate.amountCents,
                totalCents,
                rateVersion: rate.version,
              };
            }),
          ),
        },
      },
      include: {
        lineItems: true,
      },
    });

    // Calculate total
    const totalCents = invoice.lineItems.reduce((sum, item) => sum + item.totalCents, 0);

    // Update invoice total
    await db.invoice.update({
      where: { id: invoice.id },
      data: { totalCents },
    });

    // Link usage records to line items
    for (const group of Object.values(groupedUsage)) {
      const lineItem = invoice.lineItems.find(
        (li) => li.serviceType === group.serviceType,
      );
      
      if (lineItem) {
        await db.billingUsageRecord.updateMany({
          where: {
            id: { in: group.records.map((r) => r.id) },
          },
          data: {
            invoiceLineItemId: lineItem.id,
          },
        });
      }
    }

    return {
      ...invoice,
      totalCents,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // GET INVOICE BY ID
  // ═══════════════════════════════════════════════════════════════

  static async getInvoice(invoiceId: string) {
    return db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        lineItems: {
          include: {
            billingUsageRecords: true,
          },
        },
        billingAccount: {
          include: {
            firm: true,
          },
        },
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // GET INVOICES FOR FIRM
  // ═══════════════════════════════════════════════════════════════

  static async getInvoicesForFirm(firmId: string, options?: {
    status?: InvoiceStatus;
    limit?: number;
  }) {
    return db.invoice.findMany({
      where: {
        billingAccount: { firmId },
        ...(options?.status && { status: options.status }),
      },
      include: {
        lineItems: true,
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // UPDATE INVOICE STATUS
  // ═══════════════════════════════════════════════════════════════

  static async updateInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
    return db.invoice.update({
      where: { id: invoiceId },
      data: { status },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // GET BILLING SUMMARY FOR JOB
  // ═══════════════════════════════════════════════════════════════

  static async getJobBillingSummary(jobId: string) {
    const usageRecords = await db.billingUsageRecord.findMany({
      where: { jobId },
      include: {
        invoiceLineItem: {
          include: {
            invoice: true,
          },
        },
      },
    });

    const totalCents = usageRecords.reduce((sum, record) => {
      if (record.invoiceLineItem) {
        const portion = (Number(record.quantity) / Number(record.invoiceLineItem.quantity)) *
          record.invoiceLineItem.totalCents;
        return sum + portion;
      }
      return sum;
    }, 0);

    return {
      jobId,
      usageRecords,
      totalCents: Math.round(totalCents),
      invoiced: usageRecords.some((r) => r.invoiceLineItem !== null),
    };
  }
}

export default BillingService;
