/**
 * Transcripts Query Layer for Depo-Pro v1.3
 *
 * Handles transcript queries (legacy compatibility layer)
 * NOTE: In v1.3, transcripts table is replaced by transcriptions table
 */

import { createClient } from '@/lib/supabase/server';
import type { SupabaseDbClient } from './_scope';
import { userHasJobAccess } from './org-access';

/**
 * NOTE: v1.0 'transcripts' table removed in v1.3
 * These are compatibility stubs - use getTranscriptById, createTranscript, etc. below
 */
export async function getById(_id: string, _supabase?: SupabaseDbClient): Promise<any> {
  throw new Error('Use getTranscriptById() instead - transcripts table removed in v1.3');
}

export async function getManyForMatter(_matterId: string, _supabase?: SupabaseDbClient): Promise<any[]> {
  return [];
}

export async function create(_payload: any, _supabase?: SupabaseDbClient): Promise<any> {
  throw new Error('Use createTranscript() instead - transcripts table removed in v1.3');
}

export async function update(_id: string, _updates: any, _supabase?: SupabaseDbClient): Promise<any> {
  throw new Error('Use updateTranscript() instead - transcripts table removed in v1.3');
}

async function deleteById(_id: string, _supabase?: SupabaseDbClient): Promise<void> {
  throw new Error('Delete not supported in v1.3');
}

export { deleteById as delete };

/**
 * Get transcript by ID (legacy - maps to transcriptions)
 */
export async function getTranscriptById(
  supabaseOrId: any,
  _maybeId?: string,
  _opts?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  const supabase = isOldPattern ? supabaseOrId : await createClient();
  const id = isOldPattern ? _maybeId : supabaseOrId;

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
  _maybeId?: string,
  _opts?: any
): Promise<any> {
  return getTranscriptById(supabaseOrId, _maybeId);
}

/**
 * Get transcript edits
 */
export async function getTranscriptEdits(
  supabaseOrTranscriptId: any,
  _maybeTranscriptId?: string,
  _opts?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrTranscriptId === 'object' && supabaseOrTranscriptId.from;
  const supabase = isOldPattern ? supabaseOrTranscriptId : await createClient();
  const transcriptId = isOldPattern ? _maybeTranscriptId : supabaseOrTranscriptId;

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
  _idOrUpdates?: string | Record<string, any>,
  _maybeUpdates?: Record<string, any>
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;

  let supabase: any;
  let id: string;
  let updates: Record<string, any>;

  if (isOldPattern) {
    supabase = supabaseOrId;
    id = _idOrUpdates as string;
    updates = _maybeUpdates as Record<string, any>;
  } else {
    supabase = await createClient();
    id = supabaseOrId;
    updates = _idOrUpdates as Record<string, any>;
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
  maybeJobId?: string,
  _opts?: any
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
  _maybeTranscriptId?: string,
  _opts?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrTranscriptId === 'object' && supabaseOrTranscriptId.from;
  return isOldPattern ? [] : { data: [], error: new Error('Annotations feature not in v1.3') };
}

/**
 * Create transcript annotation (stub)
 */
export async function createTranscriptAnnotation(
  supabaseOrData: any,
  _maybeData?: any,
  _opts?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrData === 'object' && supabaseOrData.from;
  return isOldPattern ? null : { data: null, error: new Error('Annotations feature not in v1.3') };
}

/**
 * Delete transcript annotation (stub)
 */
export async function deleteTranscriptAnnotation(
  supabaseOrId: any,
  _maybeId?: string,
  _opts?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Annotations feature not in v1.3') };
}

/**
 * Update transcript annotation (stub)
 */
export async function updateTranscriptAnnotation(
  supabaseOrId: any,
  _idOrUpdates?: any,
  _maybeUpdates?: any,
  _opts?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Annotations feature not in v1.3') };
}

/**
 * Get transcript bookmarks (stub)
 */
export async function getTranscriptBookmarks(
  supabaseOrTranscriptId: any,
  _maybeTranscriptId?: string,
  _opts?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrTranscriptId === 'object' && supabaseOrTranscriptId.from;
  return isOldPattern ? [] : { data: [], error: null };
}

/**
 * Create transcript bookmark (stub)
 */
export async function createTranscriptBookmark(
  supabaseOrData: any,
  _maybeData?: any,
  _opts?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrData === 'object' && supabaseOrData.from;
  return isOldPattern ? null : { data: null, error: new Error('Bookmarks feature not in v1.3') };
}

/**
 * Get transcript with tokens and job (legacy - returns basic transcript data)
 */
export async function getTranscriptWithTokensAndJob(
  supabaseOrId: any,
  _maybeId?: string,
  _opts?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  const supabase = isOldPattern ? supabaseOrId : await createClient();
  const id = isOldPattern ? _maybeId : supabaseOrId;
  const options = isOldPattern
    ? (typeof _opts === 'object' && _opts !== null ? _opts : { verifyAccessForUserId: _opts })
    : (_maybeId ?? {});
  const verifyUserId: string | undefined = options?.verifyAccessForUserId;

  const result = await supabase
    .from('transcriptions')
    .select(`
      *,
      job:jobs(*)
    `)
    .eq('id', id)
    .single();

  if (!result.error && result.data && verifyUserId) {
    const job = result.data.job as any;
    const hasAccess = await userHasJobAccess(supabase, verifyUserId, {
      firm_id: job?.firm_id ?? null,
      org_id: job?.org_id ?? null,
      reporter_id: job?.reporter_id ?? null,
      scopist_id: job?.scopist_id ?? null,
      created_by_id: job?.created_by_id ?? null,
    });

    if (!hasAccess) {
      if (isOldPattern) return null;
      return { data: null, error: { message: 'Access denied', code: 'PGRST116' } };
    }
  }

  return isOldPattern ? result.data : result;
}

/**
 * Update transcript status
 */
export async function updateTranscriptStatus(
  supabaseOrId: any,
  idOrStatus?: string | any,
  maybeStatus?: any,
  _opts?: any
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
  _maybeTranscriptId?: string,
  _opts?: any
): Promise<any> {
  return getTranscriptEdits(supabaseOrTranscriptId, _maybeTranscriptId);
}

/**
 * Get transcript notes (stub)
 */
export async function getTranscriptNotes(
  supabaseOrTranscriptId: any,
  _maybeTranscriptId?: string,
  _opts?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrTranscriptId === 'object' && supabaseOrTranscriptId.from;
  return isOldPattern ? [] : { data: [], error: null };
}

/**
 * Create transcript (maps to transcriptions table)
 */
export async function createTranscript(
  supabaseOrData: any,
  _maybeData?: any,
  _opts?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrData === 'object' && supabaseOrData.from;

  let supabase: any;
  let data: any;

  if (isOldPattern) {
    supabase = supabaseOrData;
    data = _maybeData;
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
  _maybeTranscriptId?: string,
  _opts?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrTranscriptId === 'object' && supabaseOrTranscriptId.from;
  const supabase = isOldPattern ? supabaseOrTranscriptId : await createClient();
  const transcriptId = isOldPattern ? _maybeTranscriptId : supabaseOrTranscriptId;

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
  _maybeData?: any,
  _opts?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrData === 'object' && supabaseOrData.from;

  let supabase: any;
  let data: any;

  if (isOldPattern) {
    supabase = supabaseOrData;
    // 3-arg: (supabase, transcriptId, sharePayload) => merge transcriptId into payload
    data = _opts != null && typeof _maybeData === 'string'
      ? { transcription_id: _maybeData, ..._opts }
      : _maybeData;
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
  _maybeId?: string,
  _opts?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  // Stub - return success
  return isOldPattern ? { unlocked: true } : { data: { unlocked: true }, error: null };
}
