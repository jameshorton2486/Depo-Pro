// =============================================================================
// TRANSCRIPT STATUS API
// app/api/transcripts/[id]/status/route.ts
//
// Phase 3B-1: Status transition endpoint
// =============================================================================

import type { NextRequest} from 'next/server';
import { UserRole as GuardRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { transitionTranscriptStatus } from '@/lib/services/transcript-status';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTranscriptById } from '@/lib/supabase/queries/transcripts';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/transcripts/[id]/status
 * Transition transcript to a new status
 */
const PATCHHandler = async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transcriptId } = await context.params;
    const body = await request.json();
    const { status, reason: _reason } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Transition status
    const result = await transitionTranscriptStatus(
      transcriptId,
      status,
      currentUser.role as string
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
    requireRole: [GuardRole.ADMIN, GuardRole.REPORTER, GuardRole.COURT_REPORTER],
    rateLimit: { limit: 30, windowMs: 60_000 },
  },
  async (request, { params }) => ((PATCHHandler) as any)(request, { params: Promise.resolve(params as any) })
);
