// ═══════════════════════════════════════════════════════════════
// WKT BOOKMARKS API
// ═══════════════════════════════════════════════════════════════

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getBookmarks,
  addBookmark,
  removeBookmark,
  getQuestionById,
} from '@/lib/wkt/queries';

/**
 * GET /api/wkt/bookmarks
 * Get user's bookmarked questions with full question data
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Validate auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookmarks = await getBookmarks(user.id);

    // Fetch full question data for each bookmark
    const bookmarksWithQuestions = await Promise.all(
      bookmarks.map(async (bookmark) => {
        const question = await getQuestionById(bookmark.question_id);
        return {
          ...bookmark,
          question: question || null,
        };
      })
    );

    return NextResponse.json({
      bookmarks: bookmarksWithQuestions.filter((b) => b.question !== null),
    });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookmarks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wkt/bookmarks
 * Add a bookmark
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Validate auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { questionId, notes } = body;

    if (!questionId || typeof questionId !== 'string') {
      return NextResponse.json(
        { error: 'questionId is required' },
        { status: 400 }
      );
    }

    const bookmark = await addBookmark(user.id, questionId, notes);

    return NextResponse.json({ bookmark });
  } catch (error) {
    console.error('Error adding bookmark:', error);
    return NextResponse.json(
      { error: 'Failed to add bookmark' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/wkt/bookmarks
 * Remove a bookmark
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Validate auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { questionId } = body;

    if (!questionId || typeof questionId !== 'string') {
      return NextResponse.json(
        { error: 'questionId is required' },
        { status: 400 }
      );
    }

    await removeBookmark(user.id, questionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing bookmark:', error);
    return NextResponse.json(
      { error: 'Failed to remove bookmark' },
      { status: 500 }
    );
  }
}
