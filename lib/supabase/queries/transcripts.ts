/**
 * Transcripts Query Layer for Depo-Pro v1.3
 *
 * Handles transcript queries (legacy compatibility layer)
 * NOTE: In v1.3, transcripts table is replaced by transcriptions table
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Get transcript by ID (legacy - maps to transcriptions)
 */
export async function getTranscriptById(
  supabaseOrId: any,
  maybeId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  const supabase = isOldPattern ? supabaseOrId : await createClient();
  const id = isOldPattern ? maybeId : supabaseOrId;

  const result = await supabase
    .from('transcriptions')
    .select('*')
    .eq('id', id)
    .single();

  return isOldPattern ? result.data : result;
}

/**
 * Get transcript for export
 */
export async function getTranscriptForExport(
  supabaseOrId: any,
  maybeId?: string
): Promise<any> {
  return getTranscriptById(supabaseOrId, maybeId);
}

/**
 * Get transcript edits
 */
export async function getTranscriptEdits(
  supabaseOrTranscriptId: any,
  maybeTranscriptId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrTranscriptId === 'object' && supabaseOrTranscriptId.from;
  const supabase = isOldPattern ? supabaseOrTranscriptId : await createClient();
  const transcriptId = isOldPattern ? maybeTranscriptId : supabaseOrTranscriptId;

  const result = await supabase
    .from('transcription_edits')
    .select('*')
    .eq('transcription_id', transcriptId)
    .order('created_at', { ascending: false });

  return isOldPattern ? result.data : result;
}

/**
 * Update transcript (legacy - maps to transcriptions)
 */
export async function updateTranscript(
  supabaseOrId: any,
  idOrUpdates?: string | Record<string, any>,
  maybeUpdates?: Record<string, any>
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;

  let supabase: any;
  let id: string;
  let updates: Record<string, any>;

  if (isOldPattern) {
    supabase = supabaseOrId;
    id = idOrUpdates as string;
    updates = maybeUpdates as Record<string, any>;
  } else {
    supabase = await createClient();
    id = supabaseOrId;
    updates = idOrUpdates as Record<string, any>;
  }

  const result = await supabase
    .from('transcriptions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return isOldPattern ? result.data : result;
}

/**
 * Get transcript by job ID (alias for getTranscriptById)
 */
export async function getTranscriptByJobId(
  supabaseOrJobId: any,
  maybeJobId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrJobId === 'object' && supabaseOrJobId.from;
  const supabase = isOldPattern ? supabaseOrJobId : await createClient();
  const jobId = isOldPattern ? maybeJobId : supabaseOrJobId;

  const result = await supabase
    .from('transcriptions')
    .select('*')
    .eq('job_id', jobId)
    .single();

  return isOldPattern ? result.data : result;
}

/**
 * Get transcript annotations (stub)
 */
export async function getTranscriptAnnotations(
  supabaseOrTranscriptId: any,
  maybeTranscriptId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrTranscriptId === 'object' && supabaseOrTranscriptId.from;
  return isOldPattern ? [] : { data: [], error: new Error('Annotations feature not in v1.3') };
}

/**
 * Create transcript annotation (stub)
 */
export async function createTranscriptAnnotation(
  supabaseOrData: any,
  maybeData?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrData === 'object' && supabaseOrData.from;
  return isOldPattern ? null : { data: null, error: new Error('Annotations feature not in v1.3') };
}

/**
 * Delete transcript annotation (stub)
 */
export async function deleteTranscriptAnnotation(
  supabaseOrId: any,
  maybeId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Annotations feature not in v1.3') };
}

/**
 * Update transcript annotation (stub)
 */
export async function updateTranscriptAnnotation(
  supabaseOrId: any,
  idOrUpdates?: any,
  maybeUpdates?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Annotations feature not in v1.3') };
}

/**
 * Get transcript bookmarks (stub)
 */
export async function getTranscriptBookmarks(
  supabaseOrTranscriptId: any,
  maybeTranscriptId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrTranscriptId === 'object' && supabaseOrTranscriptId.from;
  return isOldPattern ? [] : { data: [], error: null };
}

/**
 * Create transcript bookmark (stub)
 */
export async function createTranscriptBookmark(
  supabaseOrData: any,
  maybeData?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrData === 'object' && supabaseOrData.from;
  return isOldPattern ? null : { data: null, error: new Error('Bookmarks feature not in v1.3') };
}

/**
 * Get transcript with tokens and job (legacy - returns basic transcript data)
 */
export async function getTranscriptWithTokensAndJob(
  supabaseOrId: any,
  maybeId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  const supabase = isOldPattern ? supabaseOrId : await createClient();
  const id = isOldPattern ? maybeId : supabaseOrId;

  const result = await supabase
    .from('transcriptions')
    .select(`
      *,
      job:jobs(*)
    `)
    .eq('id', id)
    .single();

  return isOldPattern ? result.data : result;
}

/**
 * Update transcript status
 */
export async function updateTranscriptStatus(
  supabaseOrId: any,
  idOrStatus?: string | any,
  maybeStatus?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;

  let supabase: any;
  let id: string;
  let status: any;

  if (isOldPattern) {
    supabase = supabaseOrId;
    id = idOrStatus as string;
    status = maybeStatus;
  } else {
    supabase = await createClient();
    id = supabaseOrId;
    status = idOrStatus;
  }

  const result = await supabase
    .from('transcriptions')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  return isOldPattern ? result.data : result;
}

/**
 * Get transcript highlights (stub - maps to edits)
 */
export async function getTranscriptHighlights(
  supabaseOrTranscriptId: any,
  maybeTranscriptId?: string
): Promise<any> {
  return getTranscriptEdits(supabaseOrTranscriptId, maybeTranscriptId);
}

/**
 * Get transcript notes (stub)
 */
export async function getTranscriptNotes(
  supabaseOrTranscriptId: any,
  maybeTranscriptId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrTranscriptId === 'object' && supabaseOrTranscriptId.from;
  return isOldPattern ? [] : { data: [], error: null };
}

/**
 * Create transcript (maps to transcriptions table)
 */
export async function createTranscript(
  supabaseOrData: any,
  maybeData?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrData === 'object' && supabaseOrData.from;

  let supabase: any;
  let data: any;

  if (isOldPattern) {
    supabase = supabaseOrData;
    data = maybeData;
  } else {
    supabase = await createClient();
    data = supabaseOrData;
  }

  const result = await supabase
    .from('transcriptions')
    .insert(data)
    .select()
    .single();

  return isOldPattern ? result.data : result;
}

/**
 * Get transcript shares
 */
export async function getTranscriptShares(
  supabaseOrTranscriptId: any,
  maybeTranscriptId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrTranscriptId === 'object' && supabaseOrTranscriptId.from;
  const supabase = isOldPattern ? supabaseOrTranscriptId : await createClient();
  const transcriptId = isOldPattern ? maybeTranscriptId : supabaseOrTranscriptId;

  const result = await supabase
    .from('transcript_shares')
    .select('*')
    .eq('transcription_id', transcriptId);

  return isOldPattern ? result.data : result;
}

/**
 * Create transcript share
 */
export async function createTranscriptShare(
  supabaseOrData: any,
  maybeData?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrData === 'object' && supabaseOrData.from;

  let supabase: any;
  let data: any;

  if (isOldPattern) {
    supabase = supabaseOrData;
    data = maybeData;
  } else {
    supabase = await createClient();
    data = supabaseOrData;
  }

  const result = await supabase
    .from('transcript_shares')
    .insert(data)
    .select()
    .single();

  return isOldPattern ? result.data : result;
}

/**
 * Unlock transcript (stub)
 */
export async function unlockTranscript(
  supabaseOrId: any,
  maybeId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  // Stub - return success
  return isOldPattern ? { unlocked: true } : { data: { unlocked: true }, error: null };
}
