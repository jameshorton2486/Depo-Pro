import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { getTranscriptBookmarks, createTranscriptBookmark } from '@/lib/supabase/queries/transcripts';
import { createBookmarkSchema } from '@/lib/api/schemas';

const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.REPORTER, UserRole.SCOPIST];

const POSTHandler = async (request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  const id = params.id;
  let data: z.infer<typeof createBookmarkSchema>;
  try {
    const body = await request.json();
    data = createBookmarkSchema.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const bookmark = await createTranscriptBookmark(supabase, {
    transcription_id: id,
    user_id: user.id,
    line_number: data.lineNumber,
    label: data.label || null,
  });

  return NextResponse.json(bookmark);
};

const GETHandler = async (_request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  const bookmarks = await getTranscriptBookmarks(supabase, params.id, user.id);

  return NextResponse.json(bookmarks);
};

export const POST = withRouteProtection(
  { requireAuth: true, requireRole: ALLOWED_ROLES },
  POSTHandler
);

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: ALLOWED_ROLES },
  GETHandler
);
