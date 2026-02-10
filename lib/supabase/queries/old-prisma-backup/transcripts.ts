// ═══════════════════════════════════════════════════════════════
// TRANSCRIPT QUERY FUNCTIONS
// lib/supabase/queries/transcripts.ts
// ═══════════════════════════════════════════════════════════════
// All database access for transcripts goes through these functions

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Get transcript with job details for export
 */
export async function getTranscriptForExport(
  supabase: SupabaseClient,
  transcriptId: string
) {
  // Get transcript
  const { data: transcript, error: transcriptError } = await supabase
    .from('transcriptions')
    .select('*')
    .eq('id', transcriptId)
    .single();

  if (transcriptError) {
    if (transcriptError.code === 'PGRST116') {
      return null;
    }
    throw transcriptError;
  }

  if (!transcript) return null;

  // Get job
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', transcript.job_id)
    .single();

  if (jobError) {
    throw jobError;
  }

  // Get createdBy user via Admin API
  const adminClient = getSupabaseAdminClient();
  const { data: userData } = await adminClient.auth.admin.getUserById(job.created_by_id);

  const createdBy = userData?.user ? {
    firstName: userData.user.user_metadata?.firstName || '',
    lastName: userData.user.user_metadata?.lastName || '',
  } : null;

  // Get firm
  let firm = null;
  if (job.firm_id) {
    const { data: firmData } = await supabase
      .from('firms')
      .select('id, name')
      .eq('id', job.firm_id)
      .single();
    firm = firmData;
  }

  return {
    ...transcript,
    job: {
      ...job,
      createdBy,
      firm,
    },
  };
}

/**
 * Get all edits for a transcript
 */
export async function getTranscriptEdits(
  supabase: SupabaseClient,
  transcriptId: string
) {
  const { data: edits, error } = await supabase
    .from('transcription_edits')
    .select('*')
    .eq('transcription_id', transcriptId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return edits || [];
}

/**
 * Get transcript by ID
 */
export async function getTranscriptById(
  supabase: SupabaseClient,
  transcriptId: string
) {
  const { data, error } = await supabase
    .from('transcriptions')
    .select('*')
    .eq('id', transcriptId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Get transcript with tokens and job information
 * Returns transcript with tokens (ordered by index), job details, and assignments
 */
export async function getTranscriptWithTokensAndJob(
  supabase: SupabaseClient,
  transcriptId: string,
  userId: string
) {
  // Get transcript
  const { data: transcript, error: transcriptError } = await supabase
    .from('transcriptions')
    .select('*')
    .eq('id', transcriptId)
    .single();

  if (transcriptError) {
    if (transcriptError.code === 'PGRST116') {
      return null;
    }
    throw transcriptError;
  }

  if (!transcript) return null;

  // Get tokens (ordered by index)
  const { data: tokens, error: tokensError } = await supabase
    .from('transcript_tokens')
    .select('*')
    .eq('transcription_id', transcriptId)
    .order('index', { ascending: true });

  if (tokensError) {
    throw tokensError;
  }

  // Get job with selected fields
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, case_number, deposition_date, status, created_by_id, firm_id')
    .eq('id', transcript.job_id)
    .single();

  if (jobError) {
    throw jobError;
  }

  // Get audio files (type = 'AUDIO', limit 1)
  const { data: audioFiles } = await supabase
    .from('job_files')
    .select('storage_url')
    .eq('job_id', transcript.job_id)
    .eq('type', 'AUDIO')
    .limit(1);

  // Get assignments for this user
  const { data: assignments } = await supabase
    .from('job_assignments')
    .select('scopist_id, status')
    .eq('job_id', transcript.job_id)
    .eq('scopist_id', userId)
    .in('status', ['ACCEPTED', 'IN_PROGRESS', 'SUBMITTED']);

  // Transform to match Prisma-style structure (camelCase)
  return {
    ...transcript,
    content: transcript.full_transcript || transcript.content,
    contentJson: transcript.content_json || transcript.contentJson,
    version: transcript.version || 1,
    versionNumber: transcript.version_number || transcript.versionNumber,
    createdAt: transcript.created_at || transcript.createdAt,
    tokens: tokens || [],
    job: {
      id: job.id,
      caseNumber: job.case_number,
      depositionDate: job.deposition_date,
      status: job.status,
      createdById: job.created_by_id,
      firmId: job.firm_id,
      files: (audioFiles || []).map((f: any) => ({
        storageUrl: f.storage_url,
      })),
      assignments: (assignments || []).map((a: any) => ({
        scopistId: a.scopist_id,
        status: a.status,
      })),
    },
  };
}

/**
 * Get transcript by job ID
 */
export async function getTranscriptByJobId(
  supabase: SupabaseClient,
  jobId: string
) {
  const { data, error } = await supabase
    .from('transcriptions')
    .select('*')
    .eq('job_id', jobId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Create a transcript
 */
export async function createTranscript(
  supabase: SupabaseClient,
  transcriptData: {
    job_id: string;
    status?: string;
    full_transcript?: string | null;
    content?: string | null;
    content_json?: any;
    word_count?: number;
    created_by_id: string;
  }
) {
  // Use full_transcript if provided, otherwise content
  const insertData = {
    job_id: transcriptData.job_id,
    status: transcriptData.status || 'DRAFT',
    full_transcript: transcriptData.full_transcript || transcriptData.content || null,
    content_json: transcriptData.content_json || null,
    word_count: transcriptData.word_count || null,
    created_by_id: transcriptData.created_by_id,
  };

  const { data, error } = await supabase
    .from('transcriptions')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update transcript
 */
export async function updateTranscript(
  supabase: SupabaseClient,
  transcriptId: string,
  updates: {
    full_transcript?: string | null;
    content?: string | null;
    content_json?: any;
    word_count?: number;
    flagged_word_count?: number;
    flagged_segments?: any;
    status?: string;
  }
) {
  // Map content to full_transcript if provided
  const updateData: any = { ...updates };
  if (updates.content !== undefined) {
    updateData.full_transcript = updates.content;
    delete updateData.content;
  }

  const { data, error } = await supabase
    .from('transcriptions')
    .update(updateData)
    .eq('id', transcriptId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update transcript status
 */
export async function updateTranscriptStatus(
  supabase: SupabaseClient,
  transcriptId: string,
  status: string
) {
  const { data, error } = await supabase
    .from('transcriptions')
    .update({ status })
    .eq('id', transcriptId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Lock transcript (stub - implement with actual locking table)
 */
export async function lockTranscript(
  supabase: SupabaseClient,
  transcriptId: string,
  userId: string
) {
  const { data: transcript, error: fetchError } = await supabase
    .from('transcriptions')
    .select('id, locked_by')
    .eq('id', transcriptId)
    .single();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  if (transcript.locked_by && transcript.locked_by !== userId) {
    return { success: false, error: 'Transcript is already locked by another user' };
  }

  const { error } = await supabase
    .from('transcriptions')
    .update({
      locked_by: userId,
      locked_at: new Date().toISOString(),
    })
    .eq('id', transcriptId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Unlock transcript (stub - implement with actual locking table)
 */
export async function unlockTranscript(
  supabase: SupabaseClient,
  transcriptId: string
) {
  const { error } = await supabase
    .from('transcriptions')
    .update({
      locked_by: null,
      locked_at: null,
      lock_reason: null,
    })
    .eq('id', transcriptId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get flagged words for a transcript
 */
export async function getFlaggedWords(
  supabase: SupabaseClient,
  transcriptId: string
) {
  const { data, error } = await supabase
    .from('flagged_words')
    .select('*')
    .eq('transcription_id', transcriptId)
    .order('position', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Update flagged word correction
 */
export async function updateFlaggedWord(
  supabase: SupabaseClient,
  wordId: string,
  correction: string
) {
  const { data, error } = await supabase
    .from('flagged_words')
    .update({ correction, corrected_at: new Date().toISOString() })
    .eq('id', wordId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get transcript versions
 */
export async function getTranscriptVersions(
  supabase: SupabaseClient,
  transcriptId: string
) {
  const { data, error } = await supabase
    .from('transcript_versions')
    .select('*')
    .eq('transcription_id', transcriptId)
    .order('version_number', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Restore transcript version (stub)
 */
export async function restoreTranscriptVersion(
  _supabase: SupabaseClient,
  _transcriptId: string,
  _version: number
) {
  // TODO: Implement version restoration
  // For now, just return success
  return { success: true };
}

/**
 * Get transcript shares
 */
export async function getTranscriptShares(
  supabase: SupabaseClient,
  transcriptId: string
) {
  const { data, error } = await supabase
    .from('transcript_shares')
    .select('*')
    .eq('transcription_id', transcriptId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Create transcript share
 */
export async function createTranscriptShare(
  supabase: SupabaseClient,
  transcriptId: string,
  shareData: {
    email: string;
    expires_at?: string | null;
    created_by_id: string;
  }
) {
  const { data, error } = await supabase
    .from('transcript_shares')
    .insert({
      transcription_id: transcriptId,
      ...shareData,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get transcript notes for a user
 */
export async function getTranscriptNotes(
  supabase: SupabaseClient,
  transcriptId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from('transcript_notes')
    .select('*')
    .eq('transcription_id', transcriptId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Create transcript note
 */
export async function createTranscriptNote(
  supabase: SupabaseClient,
  noteData: {
    transcription_id: string;
    user_id: string;
    content: string;
    line_number?: number | null;
    page_number?: number | null;
  }
) {
  const { data, error } = await supabase
    .from('transcript_notes')
    .insert(noteData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get transcript highlights for a user
 */
export async function getTranscriptHighlights(
  supabase: SupabaseClient,
  transcriptId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from('transcript_highlights')
    .select('*')
    .eq('transcription_id', transcriptId)
    .eq('user_id', userId)
    .order('start_index', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Create transcript highlight
 */
export async function createTranscriptHighlight(
  supabase: SupabaseClient,
  highlightData: {
    transcription_id: string;
    user_id: string;
    start_index: number;
    end_index: number;
    color?: string | null;
    highlighted_text?: string | null;
    note?: string | null;
  }
) {
  const { data, error } = await supabase
    .from('transcript_highlights')
    .insert(highlightData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get transcript bookmarks for a user
 */
export async function getTranscriptBookmarks(
  supabase: SupabaseClient,
  transcriptId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from('transcript_bookmarks')
    .select('*')
    .eq('transcription_id', transcriptId)
    .eq('user_id', userId)
    .order('line_number', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Create transcript bookmark
 */
export async function createTranscriptBookmark(
  supabase: SupabaseClient,
  bookmarkData: {
    transcription_id: string;
    user_id: string;
    line_number: number;
    label?: string | null;
  }
) {
  const { data, error } = await supabase
    .from('transcript_bookmarks')
    .insert(bookmarkData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get transcript annotations
 */
export async function getTranscriptAnnotations(
  supabase: SupabaseClient,
  transcriptId: string
) {
  const { data, error } = await supabase
    .from('transcript_annotations')
    .select('*')
    .eq('transcription_id', transcriptId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Create transcript annotation
 */
export async function createTranscriptAnnotation(
  supabase: SupabaseClient,
  annotationData: {
    transcription_id: string;
    issue_code: string;
    issue_label: string;
    issue_color: string;
    page_start?: number | null;
    line_start?: number | null;
    page_end?: number | null;
    line_end?: number | null;
    note?: string | null;
    created_by_id: string;
  }
) {
  const { data, error } = await supabase
    .from('transcript_annotations')
    .insert(annotationData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update transcript annotation
 */
export async function updateTranscriptAnnotation(
  supabase: SupabaseClient,
  annotationId: string,
  updates: {
    note?: string | null;
    resolved?: boolean;
  }
) {
  const { data, error } = await supabase
    .from('transcript_annotations')
    .update(updates)
    .eq('id', annotationId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Delete transcript annotation
 */
export async function deleteTranscriptAnnotation(
  supabase: SupabaseClient,
  annotationId: string
) {
  const { error } = await supabase
    .from('transcript_annotations')
    .delete()
    .eq('id', annotationId);

  if (error) {
    throw error;
  }
}
