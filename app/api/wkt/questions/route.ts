// ═══════════════════════════════════════════════════════════════
// WKT QUESTIONS API
// ═══════════════════════════════════════════════════════════════

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getQuestions } from '@/lib/wkt/queries';
import type { WKTCategory } from '@/types/wkt';

/**
 * GET /api/wkt/questions
 * Get questions with optional filters
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
    const category = searchParams.get('category') as WKTCategory | null;
    const difficulty = searchParams.get('difficulty')
      ? parseInt(searchParams.get('difficulty')!)
      : undefined;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 20;
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0;

    // Get questions
    const questions = await getQuestions({
      category: category || undefined,
      difficulty,
      limit,
      offset,
    });

    // Get total count (for pagination)
    let total = questions.length;
    if (category || difficulty) {
      // If filtering, we'd need a separate count query
      // For now, return the length of results
      total = questions.length;
    }

    return NextResponse.json({
      questions,
      total,
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}
