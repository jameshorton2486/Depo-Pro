/**
 * Cost Control Service
 * Usage tracking and quota management
 */

export type PricingTier = 'free' | 'starter' | 'professional' | 'enterprise';

export interface QuotaResult {
  allowed: boolean;
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
  console.log('[Quota] useQuota called - stub', { firmId, quotaType, amount });
  return {
    allowed: true,
    remaining: 1000,
    limit: 1000,
  };
}

/**
 * Check quota without consuming
 */
export async function checkQuota(
  firmId: string,
  quotaType: keyof UsageStats
): Promise<QuotaResult> {
  console.log('[Quota] checkQuota called - stub', { firmId, quotaType });
  return {
    allowed: true,
    remaining: 1000,
    limit: 1000,
  };
}

/**
 * Get usage statistics for a firm
 */
export async function getUsageStats(firmId: string): Promise<UsageStats> {
  console.log('[Quota] getUsageStats called - stub', { firmId });
  return {
    transcriptionMinutes: 0,
    exports: 0,
    storage: 0,
    apiCalls: 0,
  };
}

/**
 * Get usage summary including limits and percentages
 */
export async function getUsageSummary(firmId: string): Promise<UsageSummary> {
  console.log('[Quota] getUsageSummary called - stub', { firmId });
  const stats = await getUsageStats(firmId);
  const limits: UsageStats = {
    transcriptionMinutes: 1000,
    exports: 100,
    storage: 10000,
    apiCalls: 10000,
  };
  
  return {
    currentPeriod: stats,
    limits,
    percentUsed: {
      transcriptionMinutes: (stats.transcriptionMinutes / limits.transcriptionMinutes) * 100,
      exports: (stats.exports / limits.exports) * 100,
      storage: (stats.storage / limits.storage) * 100,
      apiCalls: (stats.apiCalls / limits.apiCalls) * 100,
    },
    tier: 'professional',
  };
}

/**
 * Get firm usage (alias for getUsageStats)
 */
export async function getFirmUsage(firmId: string): Promise<UsageStats> {
  return getUsageStats(firmId);
}
