// app/api/transcripts/[id]/suggestions/[suggestionId]/route.ts
// POST: apply or dismiss an AI suggestion.
// Query param: action=apply | action=dismiss

export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { logger } from '@/lib/logger';

const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.REPORTER, UserRole.SCOPIST];

const POSTHandler = async (
  request: NextRequest,
  { user, supabase, params }: ProtectedContext,
) => {
  const transcriptId = params.id;
  const suggestionId = params.suggestionId;
  const action = request.nextUrl.searchParams.get('action');
  const userFirmId = (user as { firmId?: string | null; firm_id?: string | null }).firmId
    ?? (user as { firmId?: string | null; firm_id?: string | null }).firm_id
    ?? null;

  if (action !== 'apply' && action !== 'dismiss') {
    return NextResponse.json(
      { error: 'Invalid action. Use ?action=apply or ?action=dismiss' },
      { status: 400 },
    );
  }

  // Enforce tenant boundary before processing suggestion updates.
  const { data: transcriptTenant, error: tenantError } = await supabase
    .from('transcriptions')
    .select('id, job:jobs!inner(firm_id)')
    .eq('id', transcriptId)
    .single();

  if (tenantError || !transcriptTenant) {
    return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
  }

  const transcriptFirmId = (
    transcriptTenant as { job?: { firm_id?: string | null } | Array<{ firm_id?: string | null }> }
  ).job;
  const resolvedTranscriptFirmId = Array.isArray(transcriptFirmId)
    ? transcriptFirmId[0]?.firm_id ?? null
    : transcriptFirmId?.firm_id ?? null;

  if (userFirmId && resolvedTranscriptFirmId && userFirmId !== resolvedTranscriptFirmId) {
    console.warn('[TENANT_VIOLATION]', {
      userId: user.id,
      transcriptFirmId: resolvedTranscriptFirmId,
      userFirmId,
    });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch suggestion
  const { data: suggestion, error: fetchError } = await supabase
    .from('ai_suggestions')
    .select('*')
    .eq('id', suggestionId)
    .eq('transcription_id', transcriptId)
    .single();

  if (fetchError || !suggestion) {
    return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
  }

  if (suggestion.applied || suggestion.dismissed) {
    return NextResponse.json({ error: 'Suggestion already processed' }, { status: 400 });
  }

  if (action === 'dismiss') {
    const { error: updateError } = await supabase
      .from('ai_suggestions')
      .update({ dismissed: true, updated_at: new Date().toISOString() })
      .eq('id', suggestionId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to dismiss suggestion' }, { status: 500 });
    }

    return NextResponse.json({ dismissed: true, suggestion_id: suggestionId });
  }

  // action === 'apply'
  // 1. Update the flagged word with the suggested correction
  const now = new Date().toISOString();

  const { error: wordError } = await supabase
    .from('flagged_words')
    .update({
      corrected_word: suggestion.suggested_word,
      status: 'CORRECTED',
      reviewed_by: user.id,
      reviewed_at: now,
      review_notes: `AI suggestion applied (model: ${suggestion.model})`,
    })
    .eq('id', suggestion.word_id);

  if (wordError) {
    logger.error('[suggestions] Failed to apply correction to flagged_words', wordError, { suggestionId });
    return NextResponse.json({ error: 'Failed to apply correction' }, { status: 500 });
  }

  // 2. Write to transcription_edits audit trail
  await supabase.from('transcription_edits').insert({
    transcription_id: transcriptId,
    word_index: suggestion.word_index,
    old_value: suggestion.original_word,
    new_value: suggestion.suggested_word,
    editor_id: user.id,
    source: 'ai_suggestion',
    metadata: {
      suggestion_id: suggestionId,
      model: suggestion.model,
      reasoning: suggestion.reasoning,
    },
  });

  // 3. Mark suggestion as applied
  await supabase
    .from('ai_suggestions')
    .update({ applied: true, updated_at: now })
    .eq('id', suggestionId);

  return NextResponse.json({
    applied: true,
    suggestion_id: suggestionId,
    corrected_word: suggestion.suggested_word,
  });
};

export const POST = withRouteProtection(
  { requireAuth: true, requireRole: ALLOWED_ROLES },
  POSTHandler,
);
