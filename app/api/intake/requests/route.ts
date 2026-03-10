import { NextResponse, type NextRequest } from 'next/server';
import { withRouteProtection, type ProtectedContext } from '@/lib/middleware/withRouteProtection';

const handler = async (request: NextRequest, { supabase, user }: ProtectedContext) => {
  const status = request.nextUrl.searchParams.get('status');
  const countOnly = request.nextUrl.searchParams.get('count') === 'true';

  let query = supabase.from('transcript_requests').select('*', { count: 'exact' }).eq('firm_id', user.firm_id);

  if (user.role !== 'ADMIN') {
    query = query.eq('submitted_by', user.id);
  }
  if (status) {
    query = query.eq('status', status);
  }

  const { data, count, error } = await query.order('submitted_at', { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (countOnly) {
    return NextResponse.json({ count: count ?? 0 });
  }

  return NextResponse.json({ requests: data ?? [], count: count ?? 0 });
};

export const GET = withRouteProtection(
  {
    requireAuth: true,
    requireRole: ['ADMIN', 'ATTORNEY', 'PARALEGAL', 'LAW_FIRM', 'AGENCY'] as unknown as any,
    requireFirm: true,
  },
  handler,
);
