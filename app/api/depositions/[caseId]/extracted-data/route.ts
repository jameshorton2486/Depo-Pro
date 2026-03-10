import { NextResponse, type NextRequest } from 'next/server';
import { withRouteProtection, type ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { UserRole } from '@/lib/enums/roles';

const handler = async (_request: NextRequest, { supabase, user, params }: ProtectedContext) => {
  const caseId = params.caseId;

  const { data: metadata, error: metadataError } = await supabase
    .from('case_metadata')
    .select('*')
    .eq('id', caseId)
    .eq('firm_id', user.firm_id)
    .single();

  if (metadataError || !metadata) {
    return NextResponse.json({ error: 'Extracted case data not found' }, { status: 404 });
  }

  const [partiesResult, attorneysResult, sessionsResult] = await Promise.all([
    supabase.from('case_parties').select('*').eq('case_metadata_id', caseId).eq('firm_id', user.firm_id),
    supabase.from('case_attorneys').select('*').eq('case_metadata_id', caseId).eq('firm_id', user.firm_id),
    supabase.from('deposition_sessions').select('*').eq('case_metadata_id', caseId).eq('firm_id', user.firm_id),
  ]);

  return NextResponse.json({
    case_metadata: metadata,
    case_parties: partiesResult.data ?? [],
    case_attorneys: attorneysResult.data ?? [],
    deposition_sessions: sessionsResult.data ?? [],
  });
};

export const GET = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.SCOPIST],
    requireFirm: true,
  },
  handler,
);
