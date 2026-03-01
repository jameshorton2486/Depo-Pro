import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { getTranscriptHighlights } from '@/lib/supabase/queries/transcripts';
import { createHighlightSchema } from '@/lib/api/schemas';

const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.REPORTER, UserRole.SCOPIST, UserRole.ATTORNEY];

const POSTHandler = async (request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  const id = params.id;
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .maybeSingle();
  const recipientEmail = profile?.email || null;

  // Verify access
  const { data: share } = await supabase
    .from('transcript_share')
    .select()
    .eq('transcript_id', id)
    .eq('recipient_email', recipientEmail)
    .eq('status', 'ACTIVE')
    .in('access_level', ['COMMENT', 'EDIT'])
    .maybeSingle();

  const { data: directAccess } = await supabase
    .from('transcript_access')
    .select()
    .eq('transcript_id', id)
    .eq('user_id', user.id)
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
      user_id: user.id,
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
};

const GETHandler = async (_request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  const highlights = await getTranscriptHighlights(supabase, params.id, user.id);

  return NextResponse.json(highlights);
};

export const POST = withRouteProtection(
  { requireAuth: true, requireRole: ALLOWED_ROLES },
  POSTHandler as any
);

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: ALLOWED_ROLES },
  GETHandler
);
