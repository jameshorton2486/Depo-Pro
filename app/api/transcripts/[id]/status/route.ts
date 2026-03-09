// =============================================================================
// TRANSCRIPT STATUS API
// app/api/transcripts/[id]/status/route.ts
//
// Phase 3B-1: Status transition endpoint
// =============================================================================

import type { NextRequest} from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { NextResponse } from 'next/server';
import { transitionTranscriptStatus } from '@/lib/services/transcript-status';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTranscriptById } from '@/lib/supabase/queries/transcripts';
import { transcriptStatusSchema } from '@/lib/api/schemas';

/**
 * PATCH /api/transcripts/[id]/status
 * Transition transcript to a new status
 */
const PATCHHandler = async (
  request: NextRequest,
  { user, params }: ProtectedContext
) => {
  try {
    const transcriptId = params.id;
    const body = await request.json();
    const parsed = transcriptStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    const { status } = parsed.data;

    // Transition status
    const result = await transitionTranscriptStatus(
      transcriptId,
      status,
      user.role as string
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to transition status' },
        { status: 400 }
      );
    }

    // Fetch updated transcript via query layer
    const supabase = await createSupabaseServerClient();
    const transcript = await getTranscriptById(supabase, transcriptId);

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Status updated successfully',
      transcript: {
        id: (transcript as any).id,
        status: (transcript as any).status,
        updatedAt: (transcript as any).updated_at,
      },
    });
  } catch (error) {
    console.error('Error updating transcript status:', error);
    return NextResponse.json(
      { error: 'Failed to update transcript status' },
      { status: 500 }
    );
  }
}



export const PATCH = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.REPORTER, UserRole.COURT_REPORTER, UserRole.SCOPIST],
    requireFirm: true,
    rateLimit: { limit: 30, windowMs: 60_000 },
    auditAction: 'TRANSCRIPT_STATUS_UPDATED',
  },
  PATCHHandler as any
);
