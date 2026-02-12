// lib/services/usage.ts
// Security Audit D.9 - Cost-Control Safeguards

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * Monthly usage limits per firm
 * Adjust these based on pricing tier in the future
 */
export const MONTHLY_LIMITS = {
  transcription_minutes: 1000, // ~16 hours of audio per month
  ai_extraction: 50, // 50 medical record extractions per month
  export: 200, // 200 exports per month
} as const;

export type UsageType = keyof typeof MONTHLY_LIMITS;

interface UsageCheck {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
}

/**
 * Check if firm can perform an action based on monthly usage
 */
export async function checkUsageLimit(
  firmId: string,
  usageType: UsageType
): Promise<UsageCheck> {
  try {
    const supabase = await createSupabaseServerClient();
    const limit = MONTHLY_LIMITS[usageType];

    const { data, error } = await supabase.rpc('check_usage_limit', {
      p_firm_id: firmId,
      p_usage_type: usageType,
      p_limit: limit,
    });

    if (error) {
      logger.error('[usage] Check failed', error as Error, { firmId, usageType });
      // Fail open: if we can't check usage, allow the action
      return { allowed: true, current: 0, limit, remaining: limit };
    }

    return data as UsageCheck;
  } catch (error) {
    logger.error('[usage] Exception during check', error as Error, { firmId, usageType });
    // Fail open
    return { allowed: true, current: 0, limit: MONTHLY_LIMITS[usageType], remaining: MONTHLY_LIMITS[usageType] };
  }
}

/**
 * Increment usage for a firm (call after successful operation)
 */
export async function incrementUsage(
  firmId: string,
  usageType: UsageType,
  quantity: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.rpc('increment_usage', {
      p_firm_id: firmId,
      p_usage_type: usageType,
      p_quantity: quantity,
      p_metadata: metadata || {},
    });

    if (error) {
      logger.error('[usage] Increment failed', error as Error, { firmId, usageType, quantity });
    }
  } catch (error) {
    // Never block the request if usage tracking fails
    logger.error('[usage] Exception during increment', error as Error, { firmId, usageType });
  }
}

/**
 * Get current month's usage for a firm
 */
export async function getCurrentUsage(
  firmId: string,
  usageType?: UsageType
): Promise<Record<string, number>> {
  try {
    const supabase = await createSupabaseServerClient();
    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);

    let query = supabase
      .from('usage_tracking')
      .select('usage_type, quantity')
      .eq('firm_id', firmId)
      .eq('period_start', periodStart.toISOString().split('T')[0]);

    if (usageType) {
      query = query.eq('usage_type', usageType);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('[usage] Get current usage failed', error as Error, { firmId });
      return {};
    }

    const usage: Record<string, number> = {};
    for (const row of data || []) {
      usage[row.usage_type] = Number(row.quantity);
    }

    return usage;
  } catch (error) {
    logger.error('[usage] Exception during get', error as Error, { firmId });
    return {};
  }
}

/**
 * Get usage summary with limits for admin dashboard
 */
export async function getUsageSummary(firmId: string): Promise<{
  [K in UsageType]: {
    current: number;
    limit: number;
    percentage: number;
  };
}> {
  const usage = await getCurrentUsage(firmId);

  return {
    transcription_minutes: {
      current: usage.transcription_minutes || 0,
      limit: MONTHLY_LIMITS.transcription_minutes,
      percentage: Math.round(((usage.transcription_minutes || 0) / MONTHLY_LIMITS.transcription_minutes) * 100),
    },
    ai_extraction: {
      current: usage.ai_extraction || 0,
      limit: MONTHLY_LIMITS.ai_extraction,
      percentage: Math.round(((usage.ai_extraction || 0) / MONTHLY_LIMITS.ai_extraction) * 100),
    },
    export: {
      current: usage.export || 0,
      limit: MONTHLY_LIMITS.export,
      percentage: Math.round(((usage.export || 0) / MONTHLY_LIMITS.export) * 100),
    },
  };
}
