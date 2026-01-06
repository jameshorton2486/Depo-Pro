// =============================================================================
// POLICY ENGINE
// lib/policies/policy-engine.ts
//
// Phase 4A-1: Policy-driven permissions that augment route-access.ts
// =============================================================================

import type { UserRole } from '@/types/database';
import { hasRouteAccess } from '@/lib/permissions/route-access';

export type PolicyAction = 'allow' | 'deny' | 'require_reason';

export interface PolicyCondition {
  type: 'time' | 'state' | 'ownership' | 'role';
  params: Record<string, unknown>;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  condition: PolicyCondition;
  action: PolicyAction;
  priority?: number;
  isActive?: boolean;
}

export interface PolicyContext {
  userId: string;
  userRole: UserRole;
  action: string;
  resource?: {
    type: string;
    id: string;
    ownerId?: string;
    state?: string;
  };
  timestamp?: Date;
}

export interface PolicyResult {
  allowed: boolean;
  reason?: string;
  requiresInput?: boolean;
  policyId?: string;
}

/**
 * Evaluate a single policy against context
 */
export async function evaluatePolicy(
  policy: Policy,
  context: PolicyContext
): Promise<PolicyResult> {
  if (!policy.isActive) {
    return { allowed: true }; // Inactive policies don't block
  }

  // Evaluate condition
  const conditionMet = await evaluateCondition(policy.condition, context);

  if (!conditionMet) {
    return { allowed: true }; // Condition not met = policy doesn't apply
  }

  // Condition met - apply action
  switch (policy.action) {
    case 'allow':
      return { allowed: true, policyId: policy.id };
    
    case 'deny':
      return {
        allowed: false,
        reason: `Policy violation: ${policy.name}`,
        policyId: policy.id,
      };
    
    case 'require_reason':
      return {
        allowed: true,
        requiresInput: true,
        reason: `Policy requires reason: ${policy.name}`,
        policyId: policy.id,
      };
    
    default:
      return { allowed: true };
  }
}

/**
 * Evaluate a condition against context
 */
async function evaluateCondition(
  condition: PolicyCondition,
  context: PolicyContext
): Promise<boolean> {
  switch (condition.type) {
    case 'time': {
      const { startHour, endHour, timezone: _timezone } = condition.params;
      const now = new Date();
      const hour = now.getHours();
      return hour >= (startHour as number) && hour < (endHour as number);
    }

    case 'state': {
      const { role, action, allowedStates } = condition.params;
      if (role && context.userRole !== role) return false;
      if (action && context.action !== action) return false;
      if (allowedStates && context.resource?.state) {
        return (allowedStates as string[]).includes(context.resource.state);
      }
      return true;
    }

    case 'ownership': {
      const { action } = condition.params;
      if (action && context.action !== action) return false;
      if (!context.resource?.ownerId) return false;
      return context.resource.ownerId === context.userId;
    }

    case 'role': {
      const { role, action } = condition.params;
      if (role && context.userRole !== role) return false;
      if (action && context.action !== action) return false;
      return true;
    }

    default:
      return false;
  }
}

/**
 * Evaluate all applicable policies for a context
 * Returns combined result (all policies must pass)
 */
export async function evaluatePolicies(
  policies: Policy[],
  context: PolicyContext
): Promise<PolicyResult> {
  // Sort by priority (higher = evaluated first)
  const sortedPolicies = [...policies].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  for (const policy of sortedPolicies) {
    const result = await evaluatePolicy(policy, context);
    
    // If any policy denies, return deny
    if (!result.allowed) {
      return result;
    }
    
    // If any policy requires input, return that
    if (result.requiresInput) {
      return result;
    }
  }

  return { allowed: true };
}

/**
 * Check access with both route-access.ts and policies
 * Phase 4A-1: Policies augment, never replace route-access
 */
export async function checkAccessWithPolicies(
  route: string,
  userRole: UserRole,
  policies: Policy[],
  context: Omit<PolicyContext, 'userId' | 'userRole'>
): Promise<PolicyResult> {
  // Step 1: Check route-access.ts (must pass)
  const hasRoute = hasRouteAccess(route, userRole);
  if (!hasRoute) {
    return {
      allowed: false,
      reason: 'Route access denied',
    };
  }

  // Step 2: Check applicable policies (all must pass)
  const fullContext: PolicyContext = {
    userId: (context as PolicyContext).userId || 'unknown',
    userRole,
    action: context.action || 'access',
    resource: context.resource,
    timestamp: context.timestamp || new Date(),
  };

  return evaluatePolicies(policies, fullContext);
}

/**
 * Default policies (can be overridden by database)
 */
export const DEFAULT_POLICIES: Policy[] = [
  {
    id: 'admin-override-reason',
    name: 'Admin Override Requires Reason',
    description: 'Admin actions that override normal rules require a reason',
    condition: {
      type: 'role',
      params: {
        role: 'ADMIN',
        action: 'unlock_transcript',
      },
    },
    action: 'require_reason',
    priority: 10,
    isActive: true,
  },
  {
    id: 'scopist-edit-in-review',
    name: 'Scopist Edit During Review',
    description: 'Scopists can only edit transcripts in IN_REVIEW state',
    condition: {
      type: 'state',
      params: {
        role: 'SCOPIST',
        action: 'edit_transcript',
        allowedStates: ['IN_REVIEW'],
      },
    },
    action: 'deny',
    priority: 5,
    isActive: true,
  },
];
