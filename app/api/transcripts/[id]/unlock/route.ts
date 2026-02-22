// =============================================================================
// TRANSCRIPT UNLOCK API
// app/api/transcripts/[id]/unlock/route.ts
//
// Phase 3B-5: Admin unlock endpoint
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { unlockTranscript } from '@/lib/supabase/queries/transcripts';
import { createAuditLog, AuditTargetType } from '@/lib/audit-service';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/transcripts/[id]/unlock
 * Unlock a finalized transcript (Admin only)
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const { id: transcriptId } = await context.params;
    const body = await request.json();
    const { reason } = body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Reason is required for unlocking' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const result = await unlockTranscript(supabase, transcriptId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to unlock transcript' },
        { status: 400 }
      );
    }

    await createAuditLog({
      actorUserId: currentUser.id,
      firmId: currentUser.firmId || null,
      action: 'TRANSCRIPT_UNLOCKED',
      targetType: AuditTargetType.TRANSCRIPT,
      targetId: transcriptId,
      metadata: { reason },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    }).catch((error) => {
      logger.warn('Failed to create transcript unlock audit log', {
        transcriptId,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    return NextResponse.json({
      message: 'Transcript unlocked successfully',
    });
  } catch (error) {
    logger.error('Error unlocking transcript', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to unlock transcript' },
      { status: 500 }
    );
  }
}
