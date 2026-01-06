// =============================================================================
// COST CONTROL SERVICE
// =============================================================================
// Track and limit expensive operations to prevent runaway costs
// =============================================================================

import { logger } from '@/lib/logger';

// =============================================================================
// COST CONFIGURATION
// =============================================================================

export const CostConfig = {
  // Monthly limits per firm (adjust based on pricing tier)
  FIRM_LIMITS: {
    FREE: {
      transcriptionMinutes: 60,        // 1 hour
      storageGB: 1,                    // 1 GB
      apiCalls: 10000,                 // 10k calls
      exports: 50,                     // 50 exports
      webhookEvents: 100,              // 100 events
    },
    STARTER: {
      transcriptionMinutes: 600,       // 10 hours
      storageGB: 10,                   // 10 GB
      apiCalls: 100000,                // 100k calls
      exports: 500,                    // 500 exports
      webhookEvents: 1000,             // 1k events
    },
    PROFESSIONAL: {
      transcriptionMinutes: 3000,      // 50 hours
      storageGB: 100,                  // 100 GB
      apiCalls: 500000,                // 500k calls
      exports: 2500,                   // 2.5k exports
      webhookEvents: 10000,            // 10k events
    },
    ENTERPRISE: {
      transcriptionMinutes: -1,        // Unlimited
      storageGB: -1,                   // Unlimited
      apiCalls: -1,                    // Unlimited
      exports: -1,                     // Unlimited
      webhookEvents: -1,               // Unlimited
    },
  },
  
  // Cost per unit (for internal tracking, not billing)
  UNIT_COSTS: {
    transcriptionPerMinute: 0.006,     // ~$0.36/hour (Deepgram)
    storagePerGB: 0.023,               // ~$0.023/GB/month (Supabase)
    apiCallPer1000: 0.0001,            // Negligible
    exportPerDocument: 0.001,          // Compute cost
    webhookPerEvent: 0.0001,           // Negligible
  },
  
  // Warning thresholds (percentage of limit)
  WARNING_THRESHOLD: 0.8,  // Warn at 80%
  HARD_CAP_THRESHOLD: 1.0, // Block at 100%
} as const;

export type PricingTier = keyof typeof CostConfig.FIRM_LIMITS;
export type UsageType = keyof typeof CostConfig.FIRM_LIMITS.FREE;

// =============================================================================
// USAGE TRACKING
// =============================================================================

export interface UsageRecord {
  firmId: string;
  type: UsageType;
  amount: number;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Get current billing period dates
 */
function getCurrentPeriod(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}

/**
 * Get current usage for a firm
 */
export async function getFirmUsage(
  firmId: string
): Promise<Record<UsageType, number>> {
  const { start, end } = getCurrentPeriod();
  
  const usage = await prisma.usageRecord.groupBy({
    by: ['type'],
    where: {
      firmId,
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    _sum: {
      amount: true,
    },
  });
  
  // Initialize all types to 0
  const result: Record<UsageType, number> = {
    transcriptionMinutes: 0,
    storageGB: 0,
    apiCalls: 0,
    exports: 0,
    webhookEvents: 0,
  };
  
  // Fill in actual values
  for (const record of usage) {
    const type = record.type as UsageType;
    if (type in result) {
      result[type] = record._sum.amount || 0;
    }
  }
  
  return result;
}

/**
 * Record usage
 */
export async function recordUsage(
  firmId: string,
  type: UsageType,
  amount: number
): Promise<void> {
  try {
    await prisma.usageRecord.create({
      data: {
        firmId,
        type,
        amount,
      },
    });
  } catch (error) {
    logger.error('Failed to record usage', error as Error, { firmId, type, amount });
  }
}

/**
 * Increment usage counter
 */
export async function incrementUsage(
  firmId: string,
  type: UsageType,
  amount: number = 1
): Promise<void> {
  await recordUsage(firmId, type, amount);
}

// =============================================================================
// LIMIT CHECKING
// =============================================================================

export interface UsageLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  warning: boolean;
  reason?: string;
}

/**
 * Check if operation is within limits
 */
export async function checkUsageLimit(
  firmId: string,
  type: UsageType,
  tier: PricingTier = 'FREE',
  additionalAmount: number = 1
): Promise<UsageLimitResult> {
  const limits = CostConfig.FIRM_LIMITS[tier];
  const limit = limits[type];
  
  // Unlimited (-1)
  if (limit === -1) {
    return {
      allowed: true,
      current: 0,
      limit: -1,
      remaining: -1,
      percentUsed: 0,
      warning: false,
    };
  }
  
  const usage = await getFirmUsage(firmId);
  const current = usage[type];
  const projected = current + additionalAmount;
  const percentUsed = projected / limit;
  
  // Check hard cap
  if (projected > limit) {
    return {
      allowed: false,
      current,
      limit,
      remaining: Math.max(0, limit - current),
      percentUsed: Math.min(1, percentUsed),
      warning: true,
      reason: `${type} limit exceeded (${current}/${limit})`,
    };
  }
  
  // Check warning threshold
  const warning = percentUsed >= CostConfig.WARNING_THRESHOLD;
  
  if (warning) {
    logger.warn('Usage approaching limit', {
      firmId,
      type,
      current,
      limit,
      percentUsed: Math.round(percentUsed * 100),
    });
  }
  
  return {
    allowed: true,
    current,
    limit,
    remaining: limit - current,
    percentUsed,
    warning,
  };
}

/**
 * Pre-check and record usage in one call
 */
export async function useQuota(
  firmId: string,
  type: UsageType,
  amount: number,
  tier: PricingTier = 'FREE'
): Promise<UsageLimitResult> {
  const result = await checkUsageLimit(firmId, type, tier, amount);
  
  if (result.allowed) {
    await incrementUsage(firmId, type, amount);
  }
  
  return result;
}

// =============================================================================
// COST ESTIMATION
// =============================================================================

export interface CostEstimate {
  transcription: number;
  storage: number;
  api: number;
  exports: number;
  webhooks: number;
  total: number;
}

/**
 * Estimate monthly cost for a firm
 */
export async function estimateMonthlyCost(
  firmId: string
): Promise<CostEstimate> {
  const usage = await getFirmUsage(firmId);
  const costs = CostConfig.UNIT_COSTS;
  
  const estimate: CostEstimate = {
    transcription: usage.transcriptionMinutes * costs.transcriptionPerMinute,
    storage: usage.storageGB * costs.storagePerGB,
    api: (usage.apiCalls / 1000) * costs.apiCallPer1000,
    exports: usage.exports * costs.exportPerDocument,
    webhooks: usage.webhookEvents * costs.webhookPerEvent,
    total: 0,
  };
  
  estimate.total = 
    estimate.transcription +
    estimate.storage +
    estimate.api +
    estimate.exports +
    estimate.webhooks;
  
  return estimate;
}

// =============================================================================
// HIGH-COST OPERATION WARNINGS
// =============================================================================

export interface HighCostWarning {
  operation: string;
  estimatedCost: number;
  requiresConfirmation: boolean;
  message: string;
}

/**
 * Check if operation requires cost warning
 */
export function getHighCostWarning(
  operation: 'transcription' | 'bulk_export' | 'storage_upload',
  details: { minutes?: number; fileCount?: number; sizeMB?: number }
): HighCostWarning | null {
  const costs = CostConfig.UNIT_COSTS;
  
  switch (operation) {
    case 'transcription': {
      const minutes = details.minutes || 0;
      const cost = minutes * costs.transcriptionPerMinute;
      
      if (minutes > 60) {
        return {
          operation,
          estimatedCost: cost,
          requiresConfirmation: minutes > 120,
          message: `Transcribing ${minutes} minutes will cost approximately $${cost.toFixed(2)}`,
        };
      }
      break;
    }
    
    case 'bulk_export': {
      const fileCount = details.fileCount || 0;
      const cost = fileCount * costs.exportPerDocument;
      
      if (fileCount > 50) {
        return {
          operation,
          estimatedCost: cost,
          requiresConfirmation: fileCount > 100,
          message: `Exporting ${fileCount} files will use ${fileCount} export credits`,
        };
      }
      break;
    }
    
    case 'storage_upload': {
      const sizeGB = (details.sizeMB || 0) / 1024;
      const cost = sizeGB * costs.storagePerGB;
      
      if (sizeGB > 1) {
        return {
          operation,
          estimatedCost: cost,
          requiresConfirmation: sizeGB > 5,
          message: `Uploading ${sizeGB.toFixed(2)} GB will cost approximately $${cost.toFixed(2)}/month`,
        };
      }
      break;
    }
  }
  
  return null;
}

// =============================================================================
// USAGE SUMMARY
// =============================================================================

export interface UsageSummary {
  period: { start: Date; end: Date };
  usage: Record<UsageType, number>;
  limits: Record<UsageType, number>;
  percentages: Record<UsageType, number>;
  estimatedCost: CostEstimate;
  warnings: string[];
}

/**
 * Get comprehensive usage summary for a firm
 */
export async function getUsageSummary(
  firmId: string,
  tier: PricingTier = 'FREE'
): Promise<UsageSummary> {
  const period = getCurrentPeriod();
  const usage = await getFirmUsage(firmId);
  const limits = CostConfig.FIRM_LIMITS[tier];
  const estimatedCost = await estimateMonthlyCost(firmId);
  
  const percentages: Record<UsageType, number> = {} as any;
  const warnings: string[] = [];
  
  for (const type of Object.keys(usage) as UsageType[]) {
    const limit = limits[type];
    if (limit === -1) {
      percentages[type] = 0;
    } else {
      const percent = (usage[type] / limit) * 100;
      percentages[type] = Math.round(percent);
      
      if (percent >= 80) {
        warnings.push(`${type} is at ${percent.toFixed(0)}% of limit`);
      }
    }
  }
  
  return {
    period,
    usage,
    limits: limits as Record<UsageType, number>,
    percentages,
    estimatedCost,
    warnings,
  };
}
