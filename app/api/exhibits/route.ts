import { NextResponse } from 'next/server';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';

/**
 * Exhibits API (Global) - Not Implemented
 *
 * Global exhibits endpoint is not available in v1.3.
 * Use job-specific endpoints: /api/jobs/[id]/exhibits
 */

export const GET = withRouteProtection(
  { requireAuth: true, enforceTenant: false },
  async () => NextResponse.json(
    { error: 'Global exhibits API is not available. Use /api/jobs/[id]/exhibits instead.' },
    { status: 501 }
  )
);

export const POST = withRouteProtection(
  { requireAuth: true, enforceTenant: false },
  async () => NextResponse.json({ error: 'This feature is not implemented' }, { status: 501 })
);

export const PUT = withRouteProtection(
  { requireAuth: true, enforceTenant: false },
  async () => NextResponse.json({ error: 'This feature is not implemented' }, { status: 501 })
);

export const DELETE = withRouteProtection(
  { requireAuth: true, enforceTenant: false },
  async () => NextResponse.json({ error: 'This feature is not implemented' }, { status: 501 })
);
