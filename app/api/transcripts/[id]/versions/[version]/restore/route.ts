// =============================================================================
// RESTORE VERSION API
// app/api/transcripts/[id]/versions/[version]/restore/route.ts
//
// Phase 4B-1: Restore a transcript version
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// Stub for restoreVersion (replaces _future/transcripts/version-service)
async function restoreVersion(
  _transcriptId: string,
  _versionId: string,
  _userId: string,
  _reason?: string
): Promise<{ success: boolean; error?: string }> {
  // TODO: Implement version restoration with Supabase
  // For now, return error (will be implemented later)
  return { success: false, error: 'Version restoration not yet implemented' };
}

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
      versionNumber.toString(),
      session.user.id,
      undefined // reason parameter
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
