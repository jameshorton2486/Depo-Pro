import { db } from '@/lib/db';
// ============================================================
// GET AVAILABLE REPORTERS API
// ============================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { canPerformAction } from '@/lib/rbac';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, firmId: true },
    });

    if (!user?.firmId) {
      return NextResponse.json({ error: 'User not associated with a firm' }, { status: 403 });
    }

    if (!canPerformAction(user.role, 'ASSIGN_REPORTER')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const effectiveFirmId = user.role === 'ADMIN' ? (searchParams.get('firmId') || user.firmId) : user.firmId;

    const whereClause: any = {
      role: 'REPORTER',
      firmId: effectiveFirmId,
    };

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const reporters = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        csrNumber: true,
        availability: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const formattedReporters = reporters.map((r: any) => ({
      id: r.id,
      name: `${r.firstName} ${r.lastName}`,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      phone: r.phone,
      csrNumber: r.csrNumber,
      availability: r.availability,
      activeAssignments: 0,
    }));

    return NextResponse.json({ reporters: formattedReporters, total: formattedReporters.length });

  } catch (error) {
    console.error('Get reporters error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}



