// ═══════════════════════════════════════════════════════════════════════════
// FLAGGED WORDS API ENDPOINT
// app/api/jobs/[id]/flagged-words/route.ts
//
// Provides low-confidence words for scopist review panel
// ═══════════════════════════════════════════════════════════════════════════

import type { NextRequest} from 'next/server';
import { UserRole as GuardRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isJobLockedByOther } from '@/lib/supabase/queries/locks';
import { updateFlaggedWordSchema } from '@/lib/api/schemas';

export const runtime = 'nodejs';

interface FlaggedWord {
  id: string;
  word: string;
  confidence: number;
  start: number;
  end: number;
  speaker?: number;
  context: string;
  isReviewed: boolean;
  correctedTo?: string;
}

interface FlaggedSegment {
  text?: string;
  word?: string;
  confidence: number;
  start: number;
  end: number;
  speaker?: number;
  context?: string;
  words?: Array<{ word: string; start: number; end: number; confidence: number }>;
}

// GET /api/jobs/[id]/flagged-words
// Returns flagged low-confidence words for scopist review
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'pending';
    const sortBy = searchParams.get('sort') || 'confidence';

    const supabase = await createSupabaseServerClient();

    // Verify user has access to this job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, created_by_id, firm_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check access (owner, admin, or same firm)
    const isOwner = job.created_by_id === currentUser.id;
    const isAdmin = currentUser.role === 'ADMIN';
    const sameFirm = job.firm_id === (currentUser as any).firmId;

    if (!isOwner && !isAdmin && !sameFirm) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get transcription with flagged segments
    const { data: transcription, error: transcriptionError } = await supabase
      .from('transcriptions')
      .select('id, flagged_segments, status, updated_at')
      .eq('job_id', jobId)
      .single();

    if (transcriptionError || !transcription) {
      // No transcription yet - return empty
      return NextResponse.json({
        flaggedWords: [],
        stats: {
          total: 0,
          pending: 0,
          reviewed: 0,
          averageConfidence: null,
        },
        updatedAt: null,
      });
    }

    // Parse flagged segments (could be stored as JSON or JSONB)
    const segments: FlaggedSegment[] = Array.isArray(transcription.flagged_segments)
      ? transcription.flagged_segments
      : [];

    if (segments.length === 0) {
      return NextResponse.json({
        flaggedWords: [],
        stats: {
          total: 0,
          pending: 0,
          reviewed: 0,
          averageConfidence: null,
        },
        updatedAt: transcription.updated_at,
      });
    }

    // Get existing edits to determine reviewed status
    const { data: edits } = await supabase
      .from('transcription_edits')
      .select('word_index, edited_text, edit_type')
      .eq('transcription_id', transcription.id);

    const editMap = new Map<number, { editedText: string | null; editType: string }>();
    (edits || []).forEach((edit) => {
      if (edit.word_index !== null) {
        editMap.set(edit.word_index, {
          editedText: edit.edited_text,
          editType: edit.edit_type,
        });
      }
    });

    // Transform flagged segments into flagged words
    let flaggedWords: FlaggedWord[] = segments.map((segment, index) => {
      const edit = editMap.get(index);
      return {
        id: `${transcription.id}-${index}`,
        word: segment.text || segment.word || 'Unknown',
        confidence: segment.confidence,
        start: segment.start,
        end: segment.end,
        speaker: segment.speaker,
        context: segment.context || segment.text || '',
        isReviewed: editMap.has(index),
        correctedTo: edit?.editedText || undefined,
      };
    });

    // Apply filter
    if (filter === 'pending') {
      flaggedWords = flaggedWords.filter((w) => !w.isReviewed);
    } else if (filter === 'reviewed') {
      flaggedWords = flaggedWords.filter((w) => w.isReviewed);
    }

    // Apply sort
    switch (sortBy) {
      case 'confidence':
        flaggedWords.sort((a, b) => a.confidence - b.confidence);
        break;
      case 'time':
        flaggedWords.sort((a, b) => a.start - b.start);
        break;
      case 'speaker':
        flaggedWords.sort((a, b) => (a.speaker || 0) - (b.speaker || 0));
        break;
    }

    // Calculate stats
    const total = segments.length;
    const reviewed = editMap.size;
    const pending = total - reviewed;
    const avgConfidence =
      segments.length > 0
        ? segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length
        : null;

    return NextResponse.json({
      flaggedWords,
      stats: {
        total,
        pending,
        reviewed,
        averageConfidence: avgConfidence,
      },
      updatedAt: transcription.updated_at,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[CRITICAL] flagged words read failure', error);
    }
    console.error('Flagged words GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load flagged words' },
      { status: 500 }
    );
  }
}

// PATCH /api/jobs/[id]/flagged-words
// Update a flagged word (mark as reviewed, correct text)
const PATCHHandler = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;
    let parsed: z.infer<typeof updateFlaggedWordSchema>;
    try {
      const body = await request.json();
      parsed = updateFlaggedWordSchema.parse(body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 });
      }
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { wordId, correctedText, expectedUpdatedAt } = parsed;

    const supabase = await createSupabaseServerClient();

    // Verify user has access to this job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, created_by_id, firm_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check edit access (scopist, reporter owner, or admin)
    const isOwner = job.created_by_id === currentUser.id;
    const isAdmin = currentUser.role === 'ADMIN';
    const isScopist = currentUser.role === 'SCOPIST';

    if (!isOwner && !isAdmin && !isScopist) {
      return NextResponse.json({ error: 'Unauthorized to edit' }, { status: 403 });
    }

    // Get transcription
    const { data: transcription, error: transcriptionError } = await supabase
      .from('transcriptions')
      .select('id, updated_at')
      .eq('job_id', jobId)
      .single();

    if (transcriptionError || !transcription) {
      return NextResponse.json({ error: 'Transcription not found' }, { status: 404 });
    }

    const expectedDate = new Date(expectedUpdatedAt);
    const actualDate = new Date(transcription.updated_at);
    if (Math.abs(actualDate.getTime() - expectedDate.getTime()) > 1000) {
      return NextResponse.json(
        {
          error: 'Conflict detected',
          code: 'CONFLICT',
          message: 'This transcript was modified since you loaded it. Refresh to see changes.',
          serverUpdatedAt: actualDate.toISOString(),
        },
        { status: 409 },
      );
    }

    const isLocked = await isJobLockedByOther(jobId, currentUser.id);
    if (isLocked) {
      return NextResponse.json(
        { error: 'Job is locked by another user', code: 'LOCKED' },
        { status: 423 },
      );
    }

    // Extract word index from wordId (format: transcriptionId-index)
    const parts = wordId.split('-');
    const wordIndex = parseInt(parts[parts.length - 1], 10);

    if (isNaN(wordIndex)) {
      return NextResponse.json({ error: 'Invalid wordId format' }, { status: 400 });
    }

    // Upsert the edit
    const { error: upsertError } = await supabase
      .from('transcription_edits')
      .upsert(
        {
          transcription_id: transcription.id,
          word_index: wordIndex,
          edited_text: correctedText || null,
          edit_type: 'WORD_CORRECTION',
          editor_id: currentUser.id,
          editor_role: currentUser.role,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'transcription_id,word_index',
        }
      );

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      throw upsertError;
    }

    const { data: touchedTranscription, error: touchError } = await supabase
      .from('transcriptions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', transcription.id)
      .select('updated_at')
      .single();

    if (touchError) {
      console.error('Error touching transcription updated_at:', touchError);
    }

    return NextResponse.json({
      success: true,
      wordId,
      correctedText,
      reviewedBy: currentUser.id,
      updatedAt: touchedTranscription?.updated_at || new Date().toISOString(),
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[CRITICAL] flagged words mutation failure', error);
    }
    console.error('Flagged words PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update flagged word' },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs/[id]/flagged-words
// Remove a word edit (un-review)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;
    const { searchParams } = new URL(request.url);
    const wordId = searchParams.get('wordId');

    if (!wordId) {
      return NextResponse.json({ error: 'wordId is required' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Get transcription
    const { data: transcription } = await supabase
      .from('transcriptions')
      .select('id')
      .eq('job_id', jobId)
      .single();

    if (!transcription) {
      return NextResponse.json({ error: 'Transcription not found' }, { status: 404 });
    }

    // Extract word index
    const parts = wordId.split('-');
    const wordIndex = parseInt(parts[parts.length - 1], 10);

    // Delete the edit
    const { error: deleteError } = await supabase
      .from('transcription_edits')
      .delete()
      .eq('transcription_id', transcription.id)
      .eq('word_index', wordIndex);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[CRITICAL] flagged words delete failure', error);
    }
    console.error('Flagged words DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to remove edit' },
      { status: 500 }
    );
  }
}




export const PATCH = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [GuardRole.ADMIN, GuardRole.SCOPIST, GuardRole.REPORTER, GuardRole.COURT_REPORTER],
    rateLimit: { limit: 60, windowMs: 60_000 },
  },
  async (request, { params }) => ((PATCHHandler) as any)(request, { params: Promise.resolve(params as any) })
);
