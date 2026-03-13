// =============================================================================
// TRANSCRIPT SHARES API ROUTE
// =============================================================================
// POST: Create a new transcript share
// GET: List shares for a transcript
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { getTranscriptWithTokensAndJob, getTranscriptShares, createTranscriptShare } from '@/lib/supabase/queries/transcripts';
import { createAuditLog, AuditAction, AuditTargetType } from '@/lib/audit-service';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { isAdminRole } from '@/lib/admin';

const createShareSchema = z.object({
  recipientEmail: z.string().email(),
  accessLevel: z.enum(['VIEW', 'COMMENT', 'EDIT']),
  expiresAt: z.string().optional().nullable(),
});

const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.REPORTER, UserRole.SCOPIST, UserRole.ATTORNEY];

const POSTHandler = async (request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  try {
    const transcriptId = params.id;

    // Verify transcript exists and user has access
    const transcript = await getTranscriptWithTokensAndJob(supabase, transcriptId, user.id);

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Check permissions (Creator, Admin, or same Firm)
    const canShare = 
      transcript.job.createdById === user.id || 
      isAdminRole(user.role) ||
      (transcript.job.firmId && transcript.job.firmId === user.firm_id);

    if (!canShare) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createShareSchema.parse(body);

    // Create the share
    const share = await createTranscriptShare(supabase, transcriptId, {
      email: validatedData.recipientEmail,
      expires_at: validatedData.expiresAt || null,
      created_by_id: user.id,
    });

    // Log share creation
    await createAuditLog({
      actorUserId: user.id,
      firmId: transcript.job.firmId || user.firm_id || null,
      action: AuditAction.SHARE_CREATED,
      targetType: AuditTargetType.TRANSCRIPT_SHARE,
      targetId: share.id,
      metadata: {
        transcriptId,
        accessLevel: share.accessLevel,
        recipientType: share.recipientEmail ? 'email' : 'link',
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    }).catch((error) => {
      logger.warn('Failed to write share audit log', {
        transcriptId,
        shareId: share.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }); // Fire and forget

    return NextResponse.json(share, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('Error creating share:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

const GETHandler = async (_request: NextRequest, { supabase, params }: ProtectedContext) => {
  try {
    const transcriptId = params.id;
    const shares = await getTranscriptShares(supabase, transcriptId);

    return NextResponse.json(shares);
  } catch (error) {
    console.error('Error fetching shares:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const POST = withRouteProtection(
  { requireAuth: true, requireRole: ALLOWED_ROLES },
  POSTHandler
);

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: ALLOWED_ROLES },
  GETHandler
);


