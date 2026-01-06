/**
 * Role Check Utilities
 * Functions for checking user roles
 */

export function requireRole(userRole: string, allowedRoles: string[]): boolean {
  // Handle REPORTER alias
  const normalizedRole = userRole === 'REPORTER' ? 'COURT_REPORTER' : userRole;
  const normalizedAllowed = allowedRoles.map(r => r === 'REPORTER' ? 'COURT_REPORTER' : r);
  return normalizedAllowed.includes(normalizedRole);
}

export function requireAnyRole(userRole: string, allowedRoles: string[]): boolean {
  return requireRole(userRole, allowedRoles);
}

export function isAdmin(userRole: string): boolean {
  return userRole === 'ADMIN';
}

export function isReporter(userRole: string): boolean {
  return userRole === 'COURT_REPORTER' || userRole === 'REPORTER';
}

export function isScopist(userRole: string): boolean {
  return userRole === 'SCOPIST';
}

export function isAttorney(userRole: string): boolean {
  return userRole === 'ATTORNEY';
}

export async function checkReporterJobAccess(userId: string, jobId: string): Promise<boolean> {
  // Import here to avoid circular dependency
  const { createSupabaseServerClient } = await import('@/lib/supabase/server');
  const supabase = await createSupabaseServerClient();
  
  const { data: job } = await supabase
    .from('jobs')
    .select('created_by_id, assigned_reporter_id')
    .eq('id', jobId)
    .single();
  
  if (!job) return false;
  return job.created_by_id === userId || job.assigned_reporter_id === userId;
}
