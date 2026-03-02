import { NextResponse } from 'next/server';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';

/**
 * Matters API - Not Implemented
 *
 * The matters feature is not available in v1.3.
 */

export const GET = withRouteProtection(
  { requireAuth: true, enforceTenant: false },
  async () => NextResponse.json({ error: 'Matters feature is not available in v1.3' }, { status: 501 })
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
