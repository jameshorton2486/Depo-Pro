// =============================================================================
// TRANSCRIPT SHARES API ROUTE
// =============================================================================
// POST: Create a new transcript share
// GET: List shares for a transcript
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-compat';
import { db } from '@/lib/db';
import { dispatchShareCreated } from '@/lib/webhooks';
import { createAuditLog, AuditAction, AuditTargetType } from '@/lib/audit-service';
import { z } from 'zod';

const createShareSchema = z.object({
  recipientEmail: z.string().email(),
  accessLevel: z.enum(['VIEW', 'COMMENT', 'EDIT']),
  expiresAt: z.string().optional().nullable(),
});

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { id: transcriptId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify transcript exists and user has access
    const transcript = await db.transcript.findUnique({
      where: { id: transcriptId },
      include: {
        job: {
          select: {
            id: true,
            firmId: true,
            createdById: true,
          },
        },
      },
    });

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Check permissions (Creator, Admin, or same Firm)
    const canShare = 
      transcript.job.createdById === session.user.id || 
      session.user.role === 'ADMIN' ||
      (transcript.job.firmId && transcript.job.firmId === (session.user as any).firmId);

    if (!canShare) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createShareSchema.parse(body);

    // Create the share
    const share = await db.transcriptShare.create({
      data: {
        transcriptId,
        sharedById: session.user.id,
        recipientEmail: validatedData.recipientEmail,
        accessLevel: validatedData.accessLevel,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
        status: 'ACTIVE',
        shareType: 'USER',
      },
    });

    // Log share creation
    await createAuditLog({
      actorUserId: session.user.id,
      firmId: transcript.job.firmId || (session.user as any).firmId || null,
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
    }).catch(() => {}); // Fire and forget

    // Dispatch webhook
    await dispatchShareCreated(share.id, transcriptId);

    return NextResponse.json(share, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('Error creating share:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(_request: NextRequest, { params }: Props) {
  try {
    const { id: transcriptId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shares = await db.transcriptShare.findMany({
      where: { transcriptId },
      include: {
        sharedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(shares);
  } catch (error) {
    console.error('Error fetching shares:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

