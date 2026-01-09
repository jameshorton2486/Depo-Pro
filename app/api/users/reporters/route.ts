import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-compat';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUsersByRole } from '@/lib/supabase/queries/users';

// ============================================
// GET /api/users/reporters - List reporters for assignment
// ============================================

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const firmId = searchParams.get('firmId');
    const agencyId = searchParams.get('agencyId');

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
      .sort((a, b) => {
        if (a.lastName !== b.lastName) {
          return a.lastName.localeCompare(b.lastName);
        }
        return a.firstName.localeCompare(b.firstName);
      });

    return NextResponse.json({ reporters: formattedReporters });
  } catch (error) {
    console.error('Reporters GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reporters' },
      { status: 500 }
    );
  }
}

