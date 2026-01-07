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

  const body = await request.json();
  const { content, lineNumber, pageNumber } = body;

  const note = await db.transcriptNote.create({
    data: {
      transcriptId: id,
      userId: session.user.id,
      content,
      lineNumber,
      pageNumber,
    },
  });

  return NextResponse.json(note);
}

export async function GET(_request: NextRequest, { params }: Props) {
  const { id } = await params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const notes = await db.transcriptNote.findMany({
    where: {
      transcriptId: id,
      userId: session.user.id,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(notes);
}
