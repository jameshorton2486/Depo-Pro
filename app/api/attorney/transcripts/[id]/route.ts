// ═══════════════════════════════════════════════════════════════
// ATTORNEY TRANSCRIPT API (Single)
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Role } from '@/lib/constants';

/**
 * GET /api/attorney/transcripts/[id]
 * Get a single transcript with annotations
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getCurrentUser();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== Role.ATTORNEY && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const transcript = await db.attorneyTranscript.findUnique({
      where: { id },
      include: {
        annotations: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Check access (only creator or admin)
    if (transcript.uploadedById !== session.user.id && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcript' },
      { status: 500 },
    );
  }
}

