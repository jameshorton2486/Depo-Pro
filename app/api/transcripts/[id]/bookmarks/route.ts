import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTranscriptBookmarks, createTranscriptBookmark } from '@/lib/supabase/queries/transcripts';

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Props) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  
  if (!currentUser?.id || !currentUser?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { lineNumber, label } = body;

  const supabase = await createSupabaseServerClient();
  const bookmark = await createTranscriptBookmark(supabase, {
    transcription_id: id,
    user_id: currentUser.id,
    line_number: lineNumber,
    label: label || null,
  });

  return NextResponse.json(bookmark);
}

export async function GET(_request: NextRequest, { params }: Props) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const bookmarks = await getTranscriptBookmarks(supabase, id, currentUser.id);

  return NextResponse.json(bookmarks);
}
