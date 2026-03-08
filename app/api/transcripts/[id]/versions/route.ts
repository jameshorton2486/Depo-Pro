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

    // Fetch transcript metadata for wordCount/flaggedCount
    const { data: transcript } = await supabase
      .from('transcriptions')
      .select('word_count, flagged_word_count')
      .eq('id', transcriptId)
      .single();

    const wordCount = transcript?.word_count ?? 0;
    const flaggedCount = transcript?.flagged_word_count ?? 0;

    return NextResponse.json({
      versions: (chain ?? []).map((entry: any) => {
        const fullName: string = entry.creator?.full_name ?? '';
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

        return {
          id: entry.id,
          // Legacy timeline fields
          version: entry.version_number,
          versionType: entry.edit_id ? 'edit' : 'snapshot',
          wordCount,
          flaggedCount,
          // Integrity chain fields
          versionNumber: entry.version_number,
          transcriptHash: entry.transcript_hash,
          previousHash: entry.previous_hash,
          previousVersionHash: entry.previous_hash,
          currentVersionHash: entry.transcript_hash,
          integrityStatus: entry.previous_hash || entry.version_number === 1 ? 'valid' : 'unknown',
          editId: entry.edit_id ?? null,
          createdBy: {
            id: entry.creator?.id ?? entry.created_by,
            email: entry.creator?.email ?? null,
            name: fullName || null,
            firstName,
            lastName,
          },
          createdAt: entry.created_at,
        };
      }),
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
