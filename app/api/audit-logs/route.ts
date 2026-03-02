import { NextResponse } from 'next/server';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';

/**
 * Audit Logs API - Not Implemented
 *
 * The audit logs feature is not available in v1.3.
 * Use the audit service directly: @/lib/services/audit
 */

export const GET = withRouteProtection(
  { requireAuth: true, enforceTenant: false },
  async () => NextResponse.json(
    { error: 'Audit logs API is not available in v1.3. Use the audit service directly.' },
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
