// =============================================================================
// TRANSCRIPT VERSIONS API
// app/api/transcripts/[id]/versions/route.ts
//
// Returns the integrity chain for a transcript — every snapshot hash recorded
// before an edit session begins. Backed by transcript_integrity_chain table.
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';

const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.REPORTER, UserRole.SCOPIST];

/**
 * GET /api/transcripts/[id]/versions
 * Returns all integrity chain entries for a transcript, ordered by version.
 */
const GETHandler = async (
  _request: NextRequest,
  { supabase, params }: ProtectedContext
) => {
  try {
    const transcriptId = params.id;

    // Fetch integrity chain entries with creator profile
    const { data: chain, error } = await supabase
      .from('transcript_integrity_chain')
      .select(`
        id,
        version_number,
        transcript_hash,
        previous_hash,
        edit_id,
        created_by,
        created_at,
        creator:profiles!transcript_integrity_chain_created_by_fkey(
          id, full_name, email
        )
      `)
      .eq('transcription_id', transcriptId)
      .order('version_number', { ascending: true });

    if (error) {
      // Table may not exist yet in older deployments — return empty list
      console.error('Error fetching integrity chain:', error.message);
      return NextResponse.json({ versions: [] });
    }

    return NextResponse.json({
      versions: (chain ?? []).map((entry: any) => ({
        id: entry.id,
        versionNumber: entry.version_number,
        transcriptHash: entry.transcript_hash,
        previousHash: entry.previous_hash,
        editId: entry.edit_id ?? null,
        createdBy: entry.creator
          ? { id: entry.creator.id, name: entry.creator.full_name, email: entry.creator.email }
          : { id: entry.created_by, name: null, email: null },
        createdAt: entry.created_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
};

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: ALLOWED_ROLES },
  GETHandler
);
