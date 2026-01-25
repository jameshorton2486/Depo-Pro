// ═══════════════════════════════════════════════════════════════
// WKT RANDOM QUESTIONS API
// ═══════════════════════════════════════════════════════════════

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getRandomQuestions } from '@/lib/wkt/queries';
import type { WKTCategory } from '@/types/wkt';

/**
 * GET /api/wkt/questions/random
 * Get random questions for practice
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Validate auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const count = searchParams.get('count')
      ? parseInt(searchParams.get('count')!)
      : 10;
    const category = searchParams.get('category') as WKTCategory | null;

    // Get random questions
    const questions = await getRandomQuestions(count, category || undefined);

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Error fetching random questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}
