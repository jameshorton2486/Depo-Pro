import { db } from '@/lib/db';
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-compat';

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

    // Build where clause
    const where: Record<string, unknown> = {
      role: 'COURT_REPORTER',
      isActive: true,
    };

    // Filter by firm if provided
    if (firmId) {
      where.firmId = firmId;
    }

    // Filter by agency if provided
    if (agencyId) {
      where.agencyId = agencyId;
    }

    const reporters = await db.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });

    return NextResponse.json({ reporters });
  } catch (error) {
    console.error('Reporters GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reporters' },
      { status: 500 }
    );
  }
}

