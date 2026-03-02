// lib/middleware/withRouteProtection.ts
// Security Audit D.1 - Centralized Route Guard Wrapper
// Eliminates #1 vulnerability: forgotten auth/tenant checks

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import type { SessionUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { UserRole } from '@/lib/enums/roles';

export interface RouteProtectionOptions {
  requireAuth?: boolean;         // Default: true
  requireRole?: UserRole[];      // Allowed roles (empty = any authenticated)
  enforceTenant?: boolean;       // Default: true for job-scoped routes
  requireFirm?: boolean;         // Default: true when enforceTenant is enabled
  rateLimit?: {
    limit: number;               // Max requests
    windowMs: number;            // Window in milliseconds
  };
  auditAction?: string;          // Handler uses this for audit semantics
}

export interface ProtectedContext {
  user: { id: string; role: string; firm_id: string };
  supabase: any;
  params: Record<string, string>;
}

type ProtectedHandler = (
  request: NextRequest,
  context: ProtectedContext
) => Promise<NextResponse>;

// In-memory rate limit store (replace with Upstash Redis for production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Route protection middleware that enforces:
 * - Authentication (Supabase auth)
 * - Role-based authorization
 * - Tenant isolation (firm_id checks)
 * - Rate limiting
 *
 * @example
 * ```ts
 * export const POST = withRouteProtection(
 *   {
 *     requireAuth: true,
 *     requireRole: ['ADMIN', 'COURT_REPORTER'],
 *     rateLimit: { limit: 20, windowMs: 60_000 },
 *   },
 *   async (request, { user, supabase, params }) => {
 *     // Auth, role, tenant, rate limit already enforced
 *     // Your business logic here
 *   }
 * );
 * ```
 */
export function withRouteProtection(
  options: RouteProtectionOptions,
  handler: ProtectedHandler
) {
  return async (
    request: NextRequest,
    routeContext: { params: Promise<Record<string, string>> }
  ) => {
    try {
      const params = await routeContext.params;

      // ══════════════════════════════════════════════════════════
      // STEP 1: AUTHENTICATION
      // ══════════════════════════════════════════════════════════
      if (options.requireAuth !== false) {
        const currentUser: SessionUser | null = await getCurrentUser();
        if (!currentUser) {
          logger.warn('[guard] Unauthenticated request', {
            path: request.nextUrl.pathname,
            method: request.method,
          });
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        }
        const supabase = await createSupabaseServerClient();

        // ══════════════════════════════════════════════════════════
        // STEP 2: ROLE-BASED AUTHORIZATION
        // ══════════════════════════════════════════════════════════
        if (options.requireRole?.length) {
          if (!options.requireRole.includes(currentUser.role as UserRole)) {
            logger.warn('[guard] Role denied', {
              userId: currentUser.id,
              role: currentUser.role,
              required: options.requireRole,
              path: request.nextUrl.pathname,
            });
            return NextResponse.json(
              { error: 'Forbidden - insufficient permissions' },
              { status: 403 }
            );
          }
        }

        // ══════════════════════════════════════════════════════════
        // STEP 3: TENANT ISOLATION (firm_id)
        // ══════════════════════════════════════════════════════════
        let profile: { firm_id?: string | null; role?: string | null } | null = null;
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('firm_id, role')
            .eq('id', currentUser.id)
            .single();
          profile = profileData;
        } catch {
          // Profile query threw — fall through to session-data fallback below
        }

        if (!profile) {
          const sessionFirmId = (currentUser as any).firmId || (currentUser as any).firm_id;
          if (sessionFirmId) {
            profile = { firm_id: sessionFirmId, role: currentUser.role };
          } else {
            logger.error('[guard] Profile not found', undefined, {
              userId: currentUser.id,
            });
            return NextResponse.json(
              { error: 'Profile not found' },
              { status: 403 }
            );
          }
        }

        if (options.requireFirm !== false && options.enforceTenant !== false) {
          if (!profile.firm_id) {
            logger.warn('[guard] User has no firm_id for tenant-scoped route', {
              userId: currentUser.id,
              role: profile.role,
              path: request.nextUrl.pathname,
            });
            return NextResponse.json(
              { error: 'Firm assignment required' },
              { status: 403 }
            );
          }
        }

        // ══════════════════════════════════════════════════════════
        // STEP 4: RATE LIMITING
        // ══════════════════════════════════════════════════════════
        if (options.rateLimit) {
          const key = `${currentUser.id}:${request.nextUrl.pathname}`;
          const now = Date.now();
          const entry = rateLimitStore.get(key);

          if (entry && entry.resetAt > now) {
            if (entry.count >= options.rateLimit.limit) {
              logger.warn('[guard] Rate limit exceeded', {
                userId: currentUser.id,
                path: request.nextUrl.pathname,
                limit: options.rateLimit.limit,
              });
              return NextResponse.json(
                {
                  error: 'Rate limit exceeded',
                  retryAfter: Math.ceil((entry.resetAt - now) / 1000),
                },
                { status: 429 }
              );
            }
            entry.count++;
          } else {
            rateLimitStore.set(key, {
              count: 1,
              resetAt: now + options.rateLimit.windowMs,
            });
          }

          // Cleanup old entries (every 100 requests)
          if (rateLimitStore.size > 1000 && Math.random() < 0.01) {
            for (const [k, v] of rateLimitStore.entries()) {
              if (v.resetAt < now) {
                rateLimitStore.delete(k);
              }
            }
          }
        }

        // ══════════════════════════════════════════════════════════
        // PASS TO HANDLER WITH FULL CONTEXT
        // ══════════════════════════════════════════════════════════
        // STEP 5: AUDIT LOGGING (if configured)
        // The actual audit log is created by the handler.
        // This middleware only enforces that the context is available.
        return handler(request, {
          user: { id: currentUser.id, role: currentUser.role, firm_id: profile?.firm_id || '' },
          supabase,
          params,
        });
      }

      // ══════════════════════════════════════════════════════════
      // PUBLIC ROUTES (no auth required)
      // ══════════════════════════════════════════════════════════
      const supabase = await createSupabaseServerClient();
      return handler(request, {
        user: { id: '', role: '', firm_id: '' },
        supabase,
        params,
      });
    } catch (error) {
      logger.error('[guard] Unhandled error', error as Error, {
        path: request.nextUrl.pathname,
      });
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Helper: Verify job belongs to user's firm
 * Call this after loading a job in routes with enforceTenant=true
 */
export async function verifyJobTenantAccess(
  supabase: any,
  jobId: string,
  userFirmId: string,
  userId: string,
  userRole: string
): Promise<{ allowed: boolean; job?: any; error?: string }> {
  const { data: job, error } = await supabase
    .from('jobs')
    .select('id, firm_id, reporter_id, scopist_id')
    .eq('id', jobId)
    .single();

  if (error || !job) {
    return { allowed: false, error: 'Job not found' };
  }

  // Tenant boundary check
  if (job.firm_id !== userFirmId) {
    logger.warn('[guard] Cross-firm access attempt', {
      userId,
      jobId,
      userFirmId,
      jobFirmId: job.firm_id,
    });
    return { allowed: false, error: 'Forbidden - cross-firm access denied' };
  }

  // Role-specific checks
  if (userRole === 'SCOPIST' && job.scopist_id !== userId) {
    return { allowed: false, error: 'Forbidden - not assigned to this job' };
  }

  if (userRole === 'COURT_REPORTER' && job.reporter_id !== userId) {
    return { allowed: false, error: 'Forbidden - not owner of this job' };
  }

  // ADMIN and ATTORNEY roles can access any job in their firm (already passed tenant check)

  return { allowed: true, job };
}
