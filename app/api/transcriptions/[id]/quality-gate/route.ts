import { NextResponse } from 'next/server';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import { runQualityGate } from '@/lib/transcription/formatter/quality-gate';

async function handler(
  _request: Request,
  context: { user: { firm_id: string }; params: Record<string, string> }
) {
  const result = await runQualityGate(context.params.id, {
    firmId: context.user.firm_id,
  });

  return NextResponse.json(result);
}

export const GET = withRouteProtection(
  {
    requireAuth: true,
    requireRole: ['COURT_REPORTER', 'SCOPIST', 'ADMIN'] as any,
  },
  handler as any
);
