import { NextRequest, NextResponse } from 'next/server';
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

  const body = await request.json();
  const { lineNumber, label } = body;

  const bookmark = await db.transcriptBookmark.create({
    data: {
      transcriptId: id,
      userId: session.user.id,
      lineNumber,
      label,
    },
  });

  return NextResponse.json(bookmark);
}

export async function GET(_request: NextRequest, { params }: Props) {
  const { id } = await params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bookmarks = await db.transcriptBookmark.findMany({
    where: {
      transcriptId: id,
      userId: session.user.id,
    },
    orderBy: { lineNumber: 'asc' },
  });

  return NextResponse.json(bookmarks);
}
