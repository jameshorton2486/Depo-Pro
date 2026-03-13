// =============================================================================
// TRANSCRIPT UNLOCK API
// app/api/transcripts/[id]/unlock/route.ts
//
// Phase 3B-5: Admin unlock endpoint
// =============================================================================

import type { NextRequest} from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { unlockTranscript } from '@/lib/supabase/queries/transcripts';
import { createAuditLog, AuditTargetType } from '@/lib/audit-service';
import { logger } from '@/lib/logger';
import { unlockTranscriptSchema } from '@/lib/api/schemas';
import { isAdminRole } from '@/lib/admin';

/**
 * POST /api/transcripts/[id]/unlock
 * Unlock a finalized transcript (Admin only)
 */
const POSTHandler = async (
  request: NextRequest,
  { user, params }: ProtectedContext
) => {
  try {
    if (!isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const transcriptId = params.id;
    const body = await request.json();
    const parsed = unlockTranscriptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Reason is required for unlocking' }, { status: 400 });
    }
    const { reason } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const result = await unlockTranscript(supabase, transcriptId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to unlock transcript' },
        { status: 400 }
      );
    }

    await createAuditLog({
      actorUserId: user.id,
      firmId: user.firm_id || null,
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


export const POST = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.REPORTER, UserRole.COURT_REPORTER],
    rateLimit: { limit: 30, windowMs: 60_000 },
  },
  POSTHandler as any
);
