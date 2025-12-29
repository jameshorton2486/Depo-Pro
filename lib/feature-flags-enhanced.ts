// =============================================================================
// FEATURE FLAGS - ENHANCED VERSION
// =============================================================================
// Centralized feature flag management for controlled rollouts
// Compatible with existing implementation
// =============================================================================

export const FeatureFlags = {
  BILLING_PHASE_6: 'ENABLE_BILLING_PHASE_6',
  STRIPE_LIVE_MODE: 'STRIPE_LIVE_MODE',
  BILLING_UI: 'ENABLE_BILLING_UI',
  // Phase 5 flags
  SCHEDULING_SUGGESTIONS: 'ENABLE_SCHEDULING_SUGGESTIONS',
  EXTERNAL_CALENDAR_SYNC: 'ENABLE_EXTERNAL_CALENDAR_SYNC',
} as const;

/**
 * Check if a feature flag is enabled
 * Defaults to FALSE for safety - features must be explicitly enabled
 */
export function isFeatureEnabled(flag: keyof typeof FeatureFlags): boolean {
  const envVar = FeatureFlags[flag];
  const value = process.env[envVar];
  
  // Explicit true required - anything else is false
  return value === 'true' || value === '1';
}

/**
 * Guard function - throws if feature is disabled
 * Use in API routes to block access to unfinished features
 */
export function requireFeature(flag: keyof typeof FeatureFlags): void {
  if (!isFeatureEnabled(flag)) {
    throw new Error(`Feature ${flag} is not enabled`);
  }
}

/**
 * HOC for API routes - returns 404 if feature disabled
 */
export function withFeatureFlag<T extends (...args: any[]) => Promise<Response>>(
  flag: keyof typeof FeatureFlags,
  handler: T
): T {
  return (async (...args: any[]) => {
    if (!isFeatureEnabled(flag)) {
      return new Response(
        JSON.stringify({ error: 'Feature not available' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ) as any;
    }
    return handler(...args);
  }) as T;
}

// Convenience functions
export const isBillingEnabled = () => isFeatureEnabled('BILLING_PHASE_6');
export const isStripeEnabled = () => isFeatureEnabled('STRIPE_LIVE_MODE');
export const isBillingUIEnabled = () => isFeatureEnabled('BILLING_UI');

