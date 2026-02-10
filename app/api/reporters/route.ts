// ============================================================
// GET AVAILABLE REPORTERS API
// ============================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-compat';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserById, getUsersByRole } from '@/lib/supabase/queries/users';
import { canPerformAction } from '@/lib/rbac';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    const userData = await getUserById(supabase, session.user.id);

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }

    const user = {
      id: userData.id,
      role: userData.user_metadata?.role as string,
      firmId: userData.user_metadata?.firmId || userData.user_metadata?.firm_id as string | null,
    };

    if (!user.firmId) {
      return NextResponse.json({ error: 'User not associated with a firm' }, { status: 403 });
    }

    if (!canPerformAction(user.role, 'ASSIGN_REPORTER')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '25', 10), 1), 100);
    const offset = (page - 1) * limit;
    const effectiveFirmId = user.role === 'ADMIN' ? (searchParams.get('firmId') || user.firmId) : user.firmId;

    // Get reporters by role and firm
    let reporters = await getUsersByRole(supabase, 'REPORTER', effectiveFirmId || undefined);

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      reporters = reporters.filter((r: any) => {
        const firstName = (r.user_metadata?.firstName || '').toLowerCase();
        const lastName = (r.user_metadata?.lastName || '').toLowerCase();
        const email = (r.email || '').toLowerCase();
        return firstName.includes(searchLower) || lastName.includes(searchLower) || email.includes(searchLower);
      });
    }

    // Format and sort
    const formattedReporters = reporters
      .map((r: any) => ({
        id: r.id,
        name: `${r.user_metadata?.firstName || ''} ${r.user_metadata?.lastName || ''}`.trim(),
        firstName: r.user_metadata?.firstName || '',
        lastName: r.user_metadata?.lastName || '',
        email: r.email || '',
        phone: r.user_metadata?.phone || null,
        csrNumber: r.user_metadata?.csrNumber || r.user_metadata?.csr_number || null,
        availability: r.user_metadata?.availability || null,
        activeAssignments: 0,
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
    logger.error('Get reporters error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}


