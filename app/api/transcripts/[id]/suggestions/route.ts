// app/api/transcripts/[id]/suggestions/route.ts
// GET: returns all pending AI suggestions for a transcript.

export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';

const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.REPORTER, UserRole.SCOPIST];

const GETHandler = async (
  _req: NextRequest,
  { supabase, params }: ProtectedContext,
) => {
  const transcriptId = params.id;

  const { data: suggestions, error } = await supabase
    .from('ai_suggestions')
    .select('*')
    .eq('transcription_id', transcriptId)
    .eq('applied', false)
    .eq('dismissed', false)
    .order('word_index', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }

  return NextResponse.json({ suggestions: suggestions || [] });
};

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: ALLOWED_ROLES },
  GETHandler,
);
