import { NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/permissions/api-guards';

/**
 * Exhibits API (Global) - Not Implemented
 *
 * Global exhibits endpoint is not available in v1.3.
 * Use job-specific endpoints: /api/jobs/[id]/exhibits
 */

export async function GET() {
  const auth = await requireAuthV2();
  if (!auth.authorized) return auth.response;

  return NextResponse.json(
    { error: 'Global exhibits API is not available. Use /api/jobs/[id]/exhibits instead.' },
    { status: 501 }
  );
}

export async function POST() {
  const auth = await requireAuthV2();
  if (!auth.authorized) return auth.response;

  return NextResponse.json(
    { error: 'This feature is not implemented' },
    { status: 501 }
  );
}

export async function PUT() {
  const auth = await requireAuthV2();
  if (!auth.authorized) return auth.response;

  return NextResponse.json(
    { error: 'This feature is not implemented' },
    { status: 501 }
  );
}

export async function DELETE() {
  const auth = await requireAuthV2();
  if (!auth.authorized) return auth.response;

  return NextResponse.json(
    { error: 'This feature is not implemented' },
    { status: 501 }
  );
}
