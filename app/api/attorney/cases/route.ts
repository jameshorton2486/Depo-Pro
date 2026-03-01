import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3.2.3: ATTORNEY CASES API ROUTE
// ═══════════════════════════════════════════════════════════════════════════════
// File: app/api/attorney/cases/route.ts
// Provides case list with filtering, search, and pagination for attorneys
// ═══════════════════════════════════════════════════════════════════════════════

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listCases, type CaseFilter, type CaseSort } from '@/lib/supabase/queries/cases';

// GET /api/attorney/cases
// Returns paginated list of cases the attorney has access to
async function GETHandler(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id || !currentUser.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is an attorney
    const userRole = currentUser.role;

    if (userRole !== 'ATTORNEY') {
      return NextResponse.json({ error: 'Attorney access required' }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    const userEmail = currentUser.email || '';
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const skip = (page - 1) * limit;
    
    // Filters
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status'); // ACTIVE, CLOSED, SETTLED, ARCHIVED
    const caseType = searchParams.get('caseType'); // CIVIL, CRIMINAL, etc.
    const role = searchParams.get('role'); // PLAINTIFF, DEFENDANT, etc.
    const courtType = searchParams.get('courtType');
    const state = searchParams.get('state');
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const hasTranscripts = searchParams.get('hasTranscripts') === 'true';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    
    // Build filters
    const filters: CaseFilter = {
      status: status || undefined,
      case_type: caseType || undefined,
      role: role || undefined,
      court_type: courtType || undefined,
      state: state || undefined,
      has_transcripts: hasTranscripts || undefined,
      date_from: dateFrom ? new Date(dateFrom) : undefined,
      date_to: dateTo ? new Date(dateTo) : undefined,
      search: search || undefined,
    };

    // Build sort
    const sort: CaseSort = {
      field: sortBy === 'caseNumber' ? 'case_number' :
             sortBy === 'caseStyle' ? 'case_style' :
             sortBy === 'status' ? 'status' :
             sortBy === 'createdAt' ? 'created_at' :
             sortBy === 'updatedAt' ? 'updated_at' :
             sortBy === 'courtName' ? 'court_name' :
             'updated_at',
      order: sortOrder,
    };

    // Get cases
    const { cases: casesWithRole, totalCount } = await listCases(
      supabase,
      currentUser.id,
      userEmail,
      filters,
      sort,
      { skip, limit }
    );

    // Calculate pagination
    const totalPages = Math.ceil(totalCount / limit);
    
    return NextResponse.json({
      cases: casesWithRole,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      filters: {
        search,
        status,
        caseType,
        role,
        courtType,
        state,
        hasTranscripts,
        dateFrom,
        dateTo,
      },
    });
  } catch (error) {
    console.error('Attorney cases error:', error);
    return NextResponse.json(
      { error: 'Failed to load cases' },
      { status: 500 }
    );
  }
}

// GET /api/attorney/cases/[id]
// Get single case detail (separate file: app/api/attorney/cases/[id]/route.ts)

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.ATTORNEY, UserRole.COURT_REPORTER] },
  GETHandler as any
);

