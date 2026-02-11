import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Firms API - Not Implemented
 *
 * The firms management API is not available in v1.3.
 */

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(
    { error: 'Firms API is not available in v1.3' },
    { status: 501 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: 'This feature is not implemented' },
    { status: 501 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'This feature is not implemented' },
    { status: 501 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'This feature is not implemented' },
    { status: 501 }
  );
}
