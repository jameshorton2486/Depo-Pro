import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Password reset is disabled for MVP.' },
    { status: 410 }
  );
}
