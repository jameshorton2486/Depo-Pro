import { NextResponse } from 'next/server';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';

export const GET = withRouteProtection(
  { requireAuth: true, enforceTenant: false },
  async () => NextResponse.json({ error: 'Dictionary feature is currently disabled' }, { status: 503 })
);

export const POST = withRouteProtection(
  { requireAuth: true, enforceTenant: false },
  async () => NextResponse.json({ error: 'Dictionary feature is currently disabled' }, { status: 503 })
);

export const PUT = withRouteProtection(
  { requireAuth: true, enforceTenant: false },
  async () => NextResponse.json({ error: 'Dictionary feature is currently disabled' }, { status: 503 })
);

export const DELETE = withRouteProtection(
  { requireAuth: true, enforceTenant: false },
  async () => NextResponse.json({ error: 'Dictionary feature is currently disabled' }, { status: 503 })
);
