// =============================================================================
// TRANSCRIPT VERSIONS API
// app/api/transcripts/[id]/versions/route.ts
//
// Returns the integrity chain for a transcript — every snapshot hash recorded
// before an edit session begins. Backed by transcript_integrity_chain table.
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/transcripts/[id]/versions
 * Returns all integrity chain entries for a transcript, ordered by version.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transcriptId } = await context.params;

    const supabase = await createSupabaseServerClient();

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
}
