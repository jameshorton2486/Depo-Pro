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

  // Any access level can bookmark
  const share = await db.transcriptShare.findFirst({
    where: {
      transcriptId,
      recipientEmail: session.user.email,
      status: 'ACTIVE',
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

  if (!share && !access && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { label, description, lineNumber, pageNumber, timestamp, snippetText } = body;

    const bookmark = await db.transcriptBookmark.create({
      data: {
        transcriptId,
        userId: session.user.id,
        label,
        description,
        lineNumber: lineNumber ?? 0,
        pageNumber,
        timestamp,
        snippetText,
      },
    });

    return NextResponse.json(bookmark);
  } catch (error) {
    console.error('Failed to create bookmark:', error);
    return NextResponse.json({ error: 'Failed to save bookmark' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: Props) {
  const { id: transcriptId } = await params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bookmarks = await db.transcriptBookmark.findMany({
    where: {
      transcriptId,
      userId: session.user.id,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(bookmarks);
}
