import { NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/permissions/api-guards';

/**
 * Depositions API - Not Implemented
 *
 * The depositions feature is not available in v1.3.
 */

export async function GET() {
  const auth = await requireAuthV2();
  if (!auth.authorized) return auth.response;

  return NextResponse.json(
    { error: 'Depositions feature is not available in v1.3' },
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
