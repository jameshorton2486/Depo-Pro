import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTranscriptHighlights } from '@/lib/supabase/queries/transcripts';
import { createHighlightSchema } from '@/lib/api/schemas';

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Props) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser?.id || !currentUser?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();

  // Verify access
  const { data: share } = await supabase
    .from('transcript_share')
    .select()
    .eq('transcript_id', id)
    .eq('recipient_email', currentUser.email)
    .eq('status', 'ACTIVE')
    .in('access_level', ['COMMENT', 'EDIT'])
    .maybeSingle();

  const { data: directAccess } = await supabase
    .from('transcript_access')
    .select()
    .eq('transcript_id', id)
    .eq('user_id', currentUser.id)
    .maybeSingle();

  if (!share && (!directAccess || (directAccess as any).access_level === 'VIEW')) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  let data: z.infer<typeof createHighlightSchema>;
  try {
    const body = await request.json();
    data = createHighlightSchema.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { data: highlight, error } = await supabase
    .from('transcript_highlight')
    .insert({
      transcript_id: id,
      user_id: currentUser.id,
      start_index: data.startIndex,
      end_index: data.endIndex,
      color: data.color,
      highlighted_text: data.highlightedText,
      note: data.note,
    })
    .select()
    .single();

  if (error || !highlight) {
    return NextResponse.json({ error: 'Failed to create highlight' }, { status: 500 });
  }

  return NextResponse.json(highlight);
}

export async function GET(_request: NextRequest, { params }: Props) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const highlights = await getTranscriptHighlights(supabase, id, currentUser.id);

  return NextResponse.json(highlights);
}
