/**
 * Org-scoped access helpers for Phase 1 multi-tenant hardening
 *
 * Returns org/firm IDs the user belongs to. Uses organization_memberships when
 * available, falls back to profiles.firm_id during transition.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get all org/firm IDs the user has access to.
 * Used to scope queries and verify job/case access.
 *
 * - Tries organization_memberships first (if table exists)
 * - Falls back to users.firm_id / profiles.firm_id
 */
export async function getUserOrgIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const ids: string[] = [];

  // 1. Try organization_memberships (v2.2 schema)
  try {
    const { data: memberships } = await supabase
      .from('organization_memberships')
      .select('org_id')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE');

    if (memberships?.length) {
      ids.push(...memberships.map((m) => m.org_id));
    }
  } catch {
    // Table may not exist yet
  }

  // 2. Fallback: firm_id from users or profiles
  if (ids.length === 0) {
    const { data: profile } = await supabase
      .from('users')
      .select('firm_id')
      .eq('id', userId)
      .single();

    if (profile?.firm_id && !ids.includes(profile.firm_id)) {
      ids.push(profile.firm_id);
    }
  }

  // Also try profiles if users didn't have firm_id
  if (ids.length === 0) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('firm_id')
        .eq('id', userId)
        .single();

      if (profile?.firm_id && !ids.includes(profile.firm_id)) {
        ids.push(profile.firm_id);
      }
    } catch {
      // profiles may not exist
    }
  }

  return ids;
}

/**
 * Check if user has access to a job (by firm_id or org_id).
 * Returns true if job belongs to user's org(s) or user is assigned.
 */
export async function userHasJobAccess(
  supabase: SupabaseClient,
  userId: string,
  job: { firm_id?: string | null; org_id?: string | null; reporter_id?: string | null; scopist_id?: string | null; created_by_id?: string | null }
): Promise<boolean> {
  // SUPER_ADMIN bypass
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (profile?.role === 'SUPER_ADMIN') {
    return true;
  }

  // Direct assignment
  if (
    job.reporter_id === userId ||
    job.scopist_id === userId ||
    job.created_by_id === userId
  ) {
    return true;
  }

  const orgIds = await getUserOrgIds(supabase, userId);
  if (orgIds.length === 0) return false;

  const jobOrgId = job.org_id ?? job.firm_id;
  if (!jobOrgId) return false;

  return orgIds.includes(jobOrgId);
}
