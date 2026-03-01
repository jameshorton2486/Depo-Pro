import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUsersByRole } from '@/lib/supabase/queries/users';
import { logger } from '@/lib/logger';

// ============================================
// GET /api/users/reporters - List reporters for assignment
// ============================================

async function GETHandler(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const firmId = searchParams.get('firmId');
    const agencyId = searchParams.get('agencyId');
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '25', 10), 1), 100);
    const offset = (page - 1) * limit;

    const supabase = await createSupabaseServerClient();

    // Get reporters by role
    let reporters = await getUsersByRole(supabase, 'COURT_REPORTER', firmId || undefined);

    // Filter by agency if provided (would need agencyId in user_metadata)
    if (agencyId) {
      reporters = reporters.filter(
        (r: any) => r.user_metadata?.agencyId === agencyId || r.user_metadata?.agency_id === agencyId
      );
    }

    // Filter active users (if isActive is in metadata)
    reporters = reporters.filter(
      (r: any) => r.user_metadata?.isActive !== false
    );

    // Sort and format
    const formattedReporters = reporters
      .map((r: any) => ({
        id: r.id,
        firstName: r.user_metadata?.firstName || '',
        lastName: r.user_metadata?.lastName || '',
        email: r.email || '',
      }))
      .sort((a: any, b: any) => {
        if (a.lastName !== b.lastName) {
          return a.lastName.localeCompare(b.lastName);
        }
        return a.firstName.localeCompare(b.firstName);
      });

    const totalCount = formattedReporters.length;
    const pagedReporters = formattedReporters.slice(offset, offset + limit);
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      reporters: pagedReporters,
      total: totalCount,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    logger.error('Reporters GET error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to fetch reporters' },
      { status: 500 }
    );
  }
}

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN] },
  GETHandler as any
);

