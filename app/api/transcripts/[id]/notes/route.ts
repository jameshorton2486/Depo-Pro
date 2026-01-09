import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTranscriptNotes } from '@/lib/supabase/queries/transcripts';

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

  const supabase = await createSupabaseServerClient();

  const { data: note, error } = await supabase
    .from('transcript_note')
    .insert({
      transcript_id: id,
      user_id: session.user.id,
      content,
      line_number: lineNumber,
      page_number: pageNumber,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(note);
}

export async function GET(_request: NextRequest, { params }: Props) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const notes = await getTranscriptNotes(supabase, id, session.user.id);

  return NextResponse.json(notes);
}
