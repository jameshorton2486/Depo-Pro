import { logger } from '@/lib/logger';
/**
 * Cost Control Service
 * Usage tracking and quota management
 */

export type PricingTier = 'free' | 'starter' | 'professional' | 'enterprise';

export interface QuotaResult {
  allowed: boolean;
  withinQuota?: boolean;
  remaining: number;
  limit: number;
  resetAt?: string;
}

export interface UsageStats {
  transcriptionMinutes: number;
  exports: number;
  storage: number;
  apiCalls: number;
}

export interface UsageSummary {
  currentPeriod: UsageStats;
  limits: UsageStats;
  percentUsed: Record<keyof UsageStats, number>;
  tier: PricingTier;
}

/**
 * Check and consume quota for an operation
 * @param firmId - Firm ID
 * @param quotaType - Type of quota to check
 * @param amount - Amount to consume
 */
export async function useQuota(
  firmId: string,
  quotaType: keyof UsageStats,
  amount: number = 1
): Promise<QuotaResult> {
  // Phase 2: Replace with real Stripe usage tracking
  logger.debug('[Quota] useQuota called - stub', { firmId, quotaType, amount });
  return {
    allowed: true,
    remaining: 999,
  } as QuotaResult;
}

/**
 * Check quota without consuming
 */
export async function checkQuota(
  firmId: string,
  quotaType: keyof UsageStats
): Promise<QuotaResult> {
  // Phase 2: Replace with real Stripe usage tracking
  logger.debug('[Quota] checkQuota called - stub', { firmId, quotaType });
  return { withinQuota: true } as QuotaResult;
}

/**
 * Get usage statistics for a firm
 */
export async function getUsageStats(firmId: string): Promise<UsageStats> {
  // Phase 2: Replace with real Stripe usage tracking
  logger.debug('[Quota] getUsageStats called - stub', { firmId });
  return { used: 0, limit: 999 } as unknown as UsageStats;
}

/**
 * Get usage summary including limits and percentages
 */
export async function getUsageSummary(firmId: string): Promise<UsageSummary> {
  // Phase 2: Replace with real Stripe usage tracking
  logger.debug('[Quota] getUsageSummary called - stub', { firmId });
  return { totalJobs: 0, totalMinutes: 0 } as unknown as UsageSummary;
}

/**
 * Get firm usage (alias for getUsageStats)
 */
export async function getFirmUsage(firmId: string): Promise<UsageStats> {
  return getUsageStats(firmId);
}
