import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { TranscriptAccessLevel } from '@prisma/client';
import { z } from 'zod';

const createNoteSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1, 'Note content is required'),
  lineNumber: z.number().int().optional(),
  pageNumber: z.number().int().optional(),
  timestamp: z.string().optional(),
});

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify access
    const access = await db.transcriptAccess.findFirst({
      where: {
        transcriptId: id,
        userId: session.user.id,
        accessLevel: { in: [TranscriptAccessLevel.COMMENT, TranscriptAccessLevel.EDIT] },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    const share = access ? null : await db.transcriptShare.findFirst({
      where: {
        transcriptId: id,
        recipientEmail: session.user.email,
        accessLevel: { in: [TranscriptAccessLevel.COMMENT, TranscriptAccessLevel.EDIT] },
        status: 'ACTIVE',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (!access && !share) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const validated = createNoteSchema.parse(body);

    const note = await db.transcriptNote.create({
      data: {
        transcriptId: id,
        userId: session.user.id,
        title: validated.title || null,
        content: validated.content,
        lineNumber: validated.lineNumber || null,
        pageNumber: validated.pageNumber || null,
        timestamp: validated.timestamp || null,
      },
    });

    return NextResponse.json(note);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Error creating note:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify access
    const access = await db.transcriptAccess.findFirst({
      where: {
        transcriptId: id,
        userId: session.user.id,
      },
    });

    const share = access ? null : await db.transcriptShare.findFirst({
      where: {
        transcriptId: id,
        recipientEmail: session.user.email,
        status: 'ACTIVE',
      },
    });

    if (!access && !share) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const notes = await db.transcriptNote.findMany({
      where: {
        transcriptId: id,
        userId: session.user.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

