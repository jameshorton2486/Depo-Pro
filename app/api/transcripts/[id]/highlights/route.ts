import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Props) {
  const { id } = await params;
  const session = await auth();
  
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify access
  const share = await db.transcriptShare.findFirst({
    where: {
      transcriptId: id,
      recipientEmail: session.user.email,
      status: 'ACTIVE',
      OR: [
        { expiresAt: { gt: new Date() } },
        { expiresAt: null }
      ],
      accessLevel: { in: ['COMMENT', 'EDIT'] },
    },
  });

  const directAccess = await db.transcriptAccess.findUnique({
    where: {
      transcriptId_userId: {
        transcriptId: id,
        userId: session.user.id
      }
    }
  });

  if (!share && (!directAccess || directAccess.accessLevel === 'VIEW')) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const body = await request.json();
  const { startIndex, endIndex, color, highlightedText, note } = body;

  const highlight = await db.transcriptHighlight.create({
    data: {
      transcriptId: id,
      userId: session.user.id,
      startIndex,
      endIndex,
      color,
      highlightedText,
      note,
    },
  });

  return NextResponse.json(highlight);
}

export async function GET(_request: NextRequest, { params }: Props) {
  const { id } = await params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const highlights = await db.transcriptHighlight.findMany({
    where: {
      transcriptId: id,
      userId: session.user.id,
    },
    orderBy: { startIndex: 'asc' },
  });

  return NextResponse.json(highlights);
}
