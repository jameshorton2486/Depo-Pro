// =============================================================================
// TRANSCRIPT VERSIONS API
// app/api/transcripts/[id]/versions/route.ts
//
// Phase 4B-1: Get version history for a transcript
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// Stub for getVersions (replaces _future/transcripts/version-service)
async function getVersions(_transcriptId: string): Promise<any[]> {
  // TODO: Implement version history with Supabase
  // For now, return empty array (will be implemented later)
  return [];
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/transcripts/[id]/versions
 * Get all versions for a transcript
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

    // Verify access to transcript
    // (Would check transcript ownership/assignment here)

    const versions = await getVersions(transcriptId);

    return NextResponse.json({
      versions: versions.map((v: any) => ({
        id: v.id,
        version: v.version,
        versionType: v.versionType,
        wordCount: v.wordCount,
        flaggedCount: v.flaggedCount,
        createdBy: {
          firstName: v.creator.firstName,
          lastName: v.creator.lastName,
        },
        createdAt: v.createdAt.toISOString(),
        metadata: v.metadata,
      })),
    });
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
}
