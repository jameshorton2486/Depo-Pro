import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Exhibits API (Global) - Not Implemented
 *
 * Global exhibits endpoint is not available in v1.3.
 * Use job-specific endpoints: /api/jobs/[id]/exhibits
 */

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(
    { error: 'Global exhibits API is not available. Use /api/jobs/[id]/exhibits instead.' },
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
