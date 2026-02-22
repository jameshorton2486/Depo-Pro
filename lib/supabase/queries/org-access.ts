/**
 * Org-scoped access helpers for Phase 2 strict org enforcement.
 *
 * Org access is sourced from organization_memberships only.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get all organization IDs the user has access to.
 * Source of truth: organization_memberships with ACTIVE status.
 */
export async function getUserOrgIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data: memberships } = await supabase
    .from('organization_memberships')
    .select('org_id')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE');

  if (!memberships?.length) return [];
  return memberships.map((m) => m.org_id);
}

/**
 * Check if user has access to a job by org membership or direct assignment.
 * Returns true if job belongs to user's org(s) or user is assigned.
 */
export async function userHasJobAccess(
  supabase: SupabaseClient,
  userId: string,
  job: { firm_id?: string | null; org_id?: string | null; reporter_id?: string | null; scopist_id?: string | null; created_by_id?: string | null }
): Promise<boolean> {
  // SUPER_ADMIN bypass
  const { data: profile } = await supabase
    .from('profiles')
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

  const jobOrgId = job.org_id ?? null;
  if (!jobOrgId) return false;

  return orgIds.includes(jobOrgId);
}
