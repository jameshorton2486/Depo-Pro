// =============================================================================
// RESTORE VERSION API
// app/api/transcripts/[id]/versions/[version]/restore/route.ts
//
// Phase 4B-1: Restore a transcript version
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { restoreVersion } from '@/lib/_future/transcripts/version-service';

interface RouteContext {
  params: Promise<{ id: string; version: string }>;
}

/**
 * POST /api/transcripts/[id]/versions/[version]/restore
 * Restore a version (creates new version, doesn't overwrite)
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transcriptId, version } = await context.params;
    const body = await request.json();
    const { reason } = body;

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json(
        { error: 'Reason is required for restore' },
        { status: 400 }
      );
    }

    const versionNumber = parseInt(version, 10);
    if (isNaN(versionNumber)) {
      return NextResponse.json(
        { error: 'Invalid version number' },
        { status: 400 }
      );
    }

    const result = await restoreVersion(
      transcriptId,
      versionNumber,
      session.user.id,
      reason
    );

    return NextResponse.json({
      message: 'Version restored successfully',
      version: result,
    });
  } catch (error) {
    console.error('Error restoring version:', error);
    return NextResponse.json(
      { error: 'Failed to restore version' },
      { status: 500 }
    );
  }
}
