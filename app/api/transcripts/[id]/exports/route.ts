// =============================================================================
// EXPORT HISTORY API
// app/api/transcripts/[id]/exports/route.ts
//
// Phase 3C-3: Export history tracking
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/transcripts/[id]/exports
 * Get export history for a transcript
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transcriptId } = await context.params;

    // Verify transcript exists and user has access
    const transcript = await db.transcript.findUnique({
      where: { id: transcriptId },
      select: {
        id: true,
        job: {
          select: {
            createdById: true,
            firmId: true,
          },
        },
      },
    });

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Check access
    const isCreator = transcript.job.createdById === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get export history
    // Note: We'll use AuditLog to track exports for now
    // In a full implementation, we'd create an ExportLog model
    const exports = await db.auditLog.findMany({
      where: {
        targetType: 'Transcription',
        targetId: transcriptId,
        action: {
          contains: 'EXPORT',
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return NextResponse.json({
      exports: exports.map((log) => ({
        id: log.id,
        userId: log.actorUserId,
        user: log.user,
        format: (log.metadata as any)?.format || 'unknown',
        profileId: (log.metadata as any)?.profileId,
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching export history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch export history' },
      { status: 500 }
    );
  }
}
