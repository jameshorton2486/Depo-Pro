// ═══════════════════════════════════════════════════════════════
// WKT EXAMS API
// ═══════════════════════════════════════════════════════════════

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getUserExams,
  createMockExam,
  getQuestionById,
} from '@/lib/wkt/queries';
import { generateExamQuestions } from '@/lib/wkt/exam-generator';

/**
 * GET /api/wkt/exams
 * Get user's past exams
 */
export async function GET(request: NextRequest) {
  // request is used for searchParams
  try {
    const supabase = await createSupabaseServerClient();

    // Validate auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 10;

    const exams = await getUserExams(user.id, limit);

    return NextResponse.json({ exams });
  } catch (error) {
    console.error('Error fetching exams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exams' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wkt/exams
 * Create a new mock exam
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Validate auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate exam questions
    const questionIds = await generateExamQuestions(user.id);

    // Create exam record
    const exam = await createMockExam(user.id, questionIds);

    // Fetch full question data
    const questions = await Promise.all(
      questionIds.map((id) => getQuestionById(id))
    );

    const validQuestions = questions.filter(
      (q): q is NonNullable<typeof q> => q !== null
    );

    return NextResponse.json({
      examId: exam.id,
      questions: validQuestions,
    });
  } catch (error) {
    console.error('Error creating exam:', error);
    return NextResponse.json(
      { error: 'Failed to create exam' },
      { status: 500 }
    );
  }
}
