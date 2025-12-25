import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Props) {
  const { id: transcriptId } = await params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify access
  const share = await db.transcriptShare.findFirst({
    where: {
      transcriptId,
      recipientEmail: session.user.email,
      status: 'ACTIVE',
      accessLevel: { in: ['COMMENT', 'EDIT'] },
    },
  });

  const access = await db.transcriptAccess.findUnique({
    where: {
      transcriptId_userId: {
        transcriptId,
        userId: session.user.id
      }
    }
  });

  if (!share && (!access || access.accessLevel === 'VIEW') && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { content, pageNumber, lineNumber, timestamp, isPrivate } = body;

    const note = await db.transcriptNote.create({
      data: {
        transcriptId,
        userId: session.user.id,
        content,
        pageNumber,
        lineNumber,
        timestamp,
        isPrivate: isPrivate ?? true,
      },
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error('Failed to create annotation/note:', error);
    return NextResponse.json({ error: 'Failed to save annotation' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: Props) {
  const { id: transcriptId } = await params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const notes = await db.transcriptNote.findMany({
    where: {
      transcriptId,
      OR: [
        { userId: session.user.id },
        { isPrivate: false }
      ]
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(notes);
}
