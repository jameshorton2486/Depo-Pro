/**
 * Usage Tracking Service
 */

export type PricingTier = 'free' | 'FREE' | 'basic' | 'BASIC' | 'pro' | 'PRO' | 'enterprise' | 'ENTERPRISE';

export interface UsageSummary {
  firmId: string;
  tier?: PricingTier;
  period: {
    start: string;
    end: string;
  };
  usage: {
    transcriptionMinutes: number;
    storageBytes: number;
    exports: number;
    apiCalls: number;
  };
  limits: {
    transcriptionMinutes: number;
    storageBytes: number;
    exports: number;
    apiCalls: number;
  };
  percentages: {
    transcriptionMinutes: number;
    storageBytes: number;
    exports: number;
    apiCalls: number;
  };
  estimatedCost: number;
  warnings: string[];
}

export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  used: number;
}

const DEFAULT_LIMITS = {
  free: { transcriptionMinutes: 60, storageBytes: 1073741824, exports: 10, apiCalls: 1000 },
  basic: { transcriptionMinutes: 300, storageBytes: 10737418240, exports: 100, apiCalls: 10000 },
  pro: { transcriptionMinutes: 1200, storageBytes: 107374182400, exports: 500, apiCalls: 50000 },
  enterprise: { transcriptionMinutes: -1, storageBytes: -1, exports: -1, apiCalls: -1 },
};

export async function getUsageSummary(firmId: string, _tier?: PricingTier): Promise<UsageSummary> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const usage = {
    transcriptionMinutes: 0,
    storageBytes: 0,
    exports: 0,
    apiCalls: 0,
  };
  
  const limits = DEFAULT_LIMITS.free;
  
  const percentages = {
    transcriptionMinutes: limits.transcriptionMinutes > 0 ? (usage.transcriptionMinutes / limits.transcriptionMinutes) * 100 : 0,
    storageBytes: limits.storageBytes > 0 ? (usage.storageBytes / limits.storageBytes) * 100 : 0,
    exports: limits.exports > 0 ? (usage.exports / limits.exports) * 100 : 0,
    apiCalls: limits.apiCalls > 0 ? (usage.apiCalls / limits.apiCalls) * 100 : 0,
  };
  
  const warnings: string[] = [];
  if (percentages.transcriptionMinutes > 80) warnings.push('Approaching transcription limit');
  if (percentages.storageBytes > 80) warnings.push('Approaching storage limit');
  if (percentages.exports > 80) warnings.push('Approaching export limit');
  
  return {
    firmId,
    period: {
      start: startOfMonth.toISOString(),
      end: now.toISOString(),
    },
    usage,
    limits,
    percentages,
    estimatedCost: 0,
    warnings,
  };
}

export async function useQuota(
  firmId: string,
  feature: string,
  amount: number = 1,
  _tier?: PricingTier
): Promise<QuotaCheckResult> {
  console.log('[Usage] useQuota called', { firmId, feature, amount });
  return { allowed: true, remaining: 100, limit: 100, used: amount };
}

export async function checkQuota(
  firmId: string,
  feature: string,
  _tier?: PricingTier
): Promise<QuotaCheckResult> {
  console.log('[Usage] checkQuota called', { firmId, feature });
  return { allowed: true, remaining: 100, limit: 100, used: 0 };
}
