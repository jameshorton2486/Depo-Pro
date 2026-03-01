import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { getTranscriptNotes } from '@/lib/supabase/queries/transcripts';
import { createNoteSchema } from '@/lib/api/schemas';

const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.REPORTER, UserRole.SCOPIST];

const POSTHandler = async (request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  const id = params.id;
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

  const { data: note, error } = await supabase
    .from('transcript_note')
    .insert({
      transcript_id: id,
      user_id: user.id,
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
};

const GETHandler = async (_request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  const notes = await getTranscriptNotes(supabase, params.id, user.id);

  return NextResponse.json(notes);
};

export const POST = withRouteProtection(
  { requireAuth: true, requireRole: ALLOWED_ROLES },
  POSTHandler
);

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: ALLOWED_ROLES },
  GETHandler
);
