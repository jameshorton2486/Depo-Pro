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
  { supabase, user, params }: ProtectedContext,
) => {
  const transcriptId = params.id;

  // Tenant isolation: verify transcript belongs to user's firm
  const { data: transcript } = await supabase
    .from('transcriptions')
    .select('id, job:jobs!inner(firm_id)')
    .eq('id', transcriptId)
    .single();

  if (!transcript) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const jobFirmId = (transcript as any).job?.firm_id ?? null;
  const userFirmId = (user as any).firmId ?? (user as any).firm_id ?? null;
  if (userFirmId && jobFirmId && userFirmId !== jobFirmId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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
