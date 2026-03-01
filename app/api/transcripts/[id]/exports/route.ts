// =============================================================================
// EXPORT HISTORY API
// app/api/transcripts/[id]/exports/route.ts
//
// Phase 3C-3: Export history tracking
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { getTranscriptWithTokensAndJob } from '@/lib/supabase/queries/transcripts';

const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.REPORTER, UserRole.SCOPIST];

/**
 * GET /api/transcripts/[id]/exports
 * Get export history for a transcript
 */
const GETHandler = async (
  _request: NextRequest,
  { user, supabase, params }: ProtectedContext
) => {
  try {
    const transcriptId = params.id;

    // Verify transcript exists and user has access
    const transcript = await getTranscriptWithTokensAndJob(supabase, transcriptId, user.id);

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Check access
    const isCreator = transcript.job.createdById === user.id;
    const isAdmin = user.role === 'ADMIN';

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
};

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: ALLOWED_ROLES },
  GETHandler
);
