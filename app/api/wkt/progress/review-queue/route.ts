// ═══════════════════════════════════════════════════════════════
// WKT REVIEW QUEUE API
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getQuestionsForReview } from '@/lib/wkt/queries';

/**
 * GET /api/wkt/progress/review-queue
 * Get questions due for review
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Validate auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const questions = await getQuestionsForReview(user.id, 50);

    return NextResponse.json({
      questions,
      count: questions.length,
    });
  } catch (error) {
    console.error('Error fetching review queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review queue' },
      { status: 500 }
    );
  }
}
