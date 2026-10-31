export type LicensingState = 'trial'|'active'|'grace'|'canceled_at_period_end'|'expired'|'suspended';

export function effectiveState(row: {
  state: LicensingState; trial_ends_at?: string|null; grace_ends_at?: string|null;
}, now = new Date()): LicensingState {
  if (row.state === 'trial' && row.trial_ends_at && new Date(row.trial_ends_at) <= now) return 'expired';
  if (row.state === 'grace' && row.grace_ends_at && new Date(row.grace_ends_at) <= now) return 'expired';
  return row.state;
}

export function allowsCloud(state: LicensingState): boolean {
  return ['trial','active','grace','canceled_at_period_end'].includes(state);
}

export function stripeState(status: string, cancelAtPeriodEnd = false): LicensingState {
  if (cancelAtPeriodEnd && ['active','trialing'].includes(status)) return 'canceled_at_period_end';
  if (status === 'active') return 'active';
  if (status === 'trialing') return 'trial';
  if (['past_due','unpaid','incomplete'].includes(status)) return 'grace';
  if (status === 'paused') return 'suspended';
  return 'expired';
}
