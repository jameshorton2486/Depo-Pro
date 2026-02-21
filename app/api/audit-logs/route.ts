import { NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/permissions/api-guards';

/**
 * Audit Logs API - Not Implemented
 *
 * The audit logs feature is not available in v1.3.
 * Use the audit service directly: @/lib/services/audit
 */

export async function GET() {
  const auth = await requireAuthV2();
  if (!auth.authorized) return auth.response;

  return NextResponse.json(
    { error: 'Audit logs API is not available in v1.3. Use the audit service directly.' },
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
