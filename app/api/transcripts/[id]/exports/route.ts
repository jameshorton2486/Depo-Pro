// =============================================================================
// EXPORT HISTORY API
// app/api/transcripts/[id]/exports/route.ts
//
// Phase 3C-3: Export history tracking
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTranscriptWithTokensAndJob } from '@/lib/supabase/queries/transcripts';

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
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transcriptId } = await context.params;

    // Verify transcript exists and user has access
    const supabase = await createSupabaseServerClient();
    const transcript = await getTranscriptWithTokensAndJob(supabase, transcriptId, currentUser.id);

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Check access
    const isCreator = transcript.job.createdById === currentUser.id;
    const isAdmin = currentUser.role === 'ADMIN';

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get export history from audit logs
    const { data: exports, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('target_type', 'Transcription')
      .eq('target_id', transcriptId)
      .ilike('action', '%EXPORT%')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      exports: (exports || []).map((log: any) => ({
        id: log.id,
        userId: log.actor_user_id,
        format: log.metadata?.format || 'unknown',
        profileId: log.metadata?.profileId,
        createdAt: log.created_at,
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
