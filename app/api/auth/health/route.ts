// app/api/auth/health/route.ts
// ═══════════════════════════════════════════════════════════════
// AUTH HEALTH CHECK
// ═══════════════════════════════════════════════════════════════
// One-click health check for authentication system
// Protected by middleware → ADMIN only

import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import { UserRole } from '@/lib/enums/roles';

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.SUPER_ADMIN], enforceTenant: false },
  async () => {
    try {
      const supabase = getSupabaseAdminClient();

      // Test Supabase Auth connection (list users)
      const { error: usersError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });

      // Check environment variables
      const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
      const hasPublishableKey = !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

      const status = {
        supabase: 'ok',
        auth: usersError ? 'error' : 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        config: {
          hasUrl,
          hasPublishableKey,
          hasServiceKey,
        },
        errors: {
          auth: usersError?.message || null,
        },
      };

      const statusCode = status.auth === 'ok' && hasUrl && hasPublishableKey && hasServiceKey ? 200 : 503;

      return NextResponse.json(status, { status: statusCode });
    } catch (error: any) {
      return NextResponse.json(
        {
          supabase: 'error',
          auth: 'error',
          timestamp: new Date().toISOString(),
          error: error.message || 'Unknown error',
        },
        { status: 500 }
      );
    }
  }
);
