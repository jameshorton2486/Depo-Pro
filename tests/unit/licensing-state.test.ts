import { describe,expect,it } from 'vitest';
import { allowsCloud,effectiveState,stripeState } from '@/lib/licensing/state';

describe('licensing state machine',()=>{
  it('allows cloud only while entitled',()=>{
    expect(allowsCloud('active')).toBe(true); expect(allowsCloud('grace')).toBe(true);
    expect(allowsCloud('expired')).toBe(false); expect(allowsCloud('suspended')).toBe(false);
  });
  it('expires trials and grace without removing file access',()=>{
    const now=new Date('2026-10-31T12:00:00Z');
    expect(effectiveState({state:'trial',trial_ends_at:'2026-10-30T00:00:00Z'},now)).toBe('expired');
    expect(effectiveState({state:'grace',grace_ends_at:'2026-10-30T00:00:00Z'},now)).toBe('expired');
  });
  it('maps Stripe recovery and failure states',()=>{
    expect(stripeState('active')).toBe('active');
    expect(stripeState('past_due')).toBe('grace');
    expect(stripeState('canceled')).toBe('expired');
    expect(stripeState('active',true)).toBe('canceled_at_period_end');
  });
});
