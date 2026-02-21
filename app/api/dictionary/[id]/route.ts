import { NextResponse } from 'next/server';
import { requireAuthV2 } from '@/lib/permissions/api-guards';

export async function GET() {
  const auth = await requireAuthV2();
  if (!auth.authorized) return auth.response;

  return NextResponse.json({ error: 'Dictionary feature is currently disabled' }, { status: 503 });
}

export async function POST() {
  const auth = await requireAuthV2();
  if (!auth.authorized) return auth.response;

  return NextResponse.json({ error: 'Dictionary feature is currently disabled' }, { status: 503 });
}

export async function PUT() {
  const auth = await requireAuthV2();
  if (!auth.authorized) return auth.response;

  return NextResponse.json({ error: 'Dictionary feature is currently disabled' }, { status: 503 });
}

export async function DELETE() {
  const auth = await requireAuthV2();
  if (!auth.authorized) return auth.response;

  return NextResponse.json({ error: 'Dictionary feature is currently disabled' }, { status: 503 });
}
