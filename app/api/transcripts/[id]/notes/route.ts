import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTranscriptNotes } from '@/lib/supabase/queries/transcripts';
import { createNoteSchema } from '@/lib/api/schemas';

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Props) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser?.id || !currentUser?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let data: z.infer<typeof createNoteSchema>;
  try {
    const body = await request.json();
    data = createNoteSchema.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { data: note, error } = await supabase
    .from('transcript_note')
    .insert({
      transcript_id: id,
      user_id: currentUser.id,
      content: data.content,
      line_number: data.lineNumber,
      page_number: data.pageNumber,
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
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const notes = await getTranscriptNotes(supabase, id, currentUser.id);

  return NextResponse.json(notes);
}
