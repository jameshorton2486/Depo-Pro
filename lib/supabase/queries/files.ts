/**
 * Files Query Layer for Depo-Pro
 *
 * Reads/writes to the `job_files` table.
 * All functions support both old (supabase, ...) and new (...) calling patterns.
 */

import { createClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isSupabaseClient(v: any): boolean {
  return typeof v === 'object' && v !== null && typeof v.from === 'function';
}

// ---------------------------------------------------------------------------
// getFileById
// ---------------------------------------------------------------------------

export async function getFileById(
  supabaseOrId: any,
  _maybeId?: string
): Promise<any> {
  const old = isSupabaseClient(supabaseOrId);
  const supabase = old ? supabaseOrId : await createClient();
  const fileId = old ? _maybeId : supabaseOrId;

  const { data, error } = await supabase
    .from('job_files')
    .select('*')
    .eq('id', fileId)
    .single();

  if (error) return old ? null : { data: null, error };
  return old ? data : { data, error: null };
}

// ---------------------------------------------------------------------------
// listFilesByJob
// ---------------------------------------------------------------------------

export async function listFilesByJob(
  supabaseOrJobId: any,
  _maybeJobId?: string
): Promise<any> {
  const old = isSupabaseClient(supabaseOrJobId);
  const supabase = old ? supabaseOrJobId : await createClient();
  const jobId = old ? _maybeJobId : supabaseOrJobId;

  const { data, error } = await supabase
    .from('job_files')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });

  if (error) return old ? [] : { data: [], error };
  return old ? (data ?? []) : { data: data ?? [], error: null };
}

// ---------------------------------------------------------------------------
// listFilesForJob (alias)
// ---------------------------------------------------------------------------

export async function listFilesForJob(
  supabaseOrJobId: any,
  _maybeJobId?: string
): Promise<any> {
  return listFilesByJob(supabaseOrJobId, _maybeJobId);
}

// ---------------------------------------------------------------------------
// createFile
// ---------------------------------------------------------------------------

export async function createFile(
  supabaseOrData: any,
  _maybeData?: any
): Promise<any> {
  const old = isSupabaseClient(supabaseOrData);
  const supabase = old ? supabaseOrData : await createClient();
  const fileData = old ? _maybeData : supabaseOrData;

  const { data, error } = await supabase
    .from('job_files')
    .insert(fileData)
    .select()
    .single();

  if (error) return old ? null : { data: null, error };
  return old ? data : { data, error: null };
}

// ---------------------------------------------------------------------------
// deleteFile
// ---------------------------------------------------------------------------

export async function deleteFile(
  supabaseOrId: any,
  _maybeId?: string
): Promise<any> {
  const old = isSupabaseClient(supabaseOrId);
  const supabase = old ? supabaseOrId : await createClient();
  const fileId = old ? _maybeId : supabaseOrId;

  const { error } = await supabase
    .from('job_files')
    .delete()
    .eq('id', fileId);

  if (error) return old ? null : { data: null, error };
  return old ? true : { data: true, error: null };
}

// ---------------------------------------------------------------------------
// getFileWithJob  (used by DELETE /api/files/[id])
// ---------------------------------------------------------------------------

export async function getFileWithJob(
  supabaseOrId: any,
  _maybeId?: string
): Promise<any> {
  const old = isSupabaseClient(supabaseOrId);
  const supabase = old ? supabaseOrId : await createClient();
  const fileId = old ? _maybeId : supabaseOrId;

  const { data, error } = await supabase
    .from('job_files')
    .select(`
      *,
      job:jobs(id, firm_id, reporter_id, scopist_id, created_by_id)
    `)
    .eq('id', fileId)
    .single();

  if (error) return old ? null : { data: null, error };

  // Flatten for backwards compat — callers expect file.job.createdById
  if (data?.job) {
    data.job.createdById = data.job.created_by_id;
    data.job.assignments = []; // no separate assignments table
  }
  data.file_name = data.file_name ?? data.storage_path?.split('/').pop();

  return old ? data : { data, error: null };
}

// ---------------------------------------------------------------------------
// getFileDownloadUrl
// ---------------------------------------------------------------------------

export async function getFileDownloadUrl(
  supabaseOrId: any,
  _maybeId?: string
): Promise<any> {
  const old = isSupabaseClient(supabaseOrId);
  const supabase = old ? supabaseOrId : await createClient();
  const fileId = old ? _maybeId : supabaseOrId;

  const file = await getFileById(supabase, fileId);
  const fileData = old ? file : file?.data;
  if (!fileData) return old ? null : { data: null, error: new Error('File not found') };

  const isAudio = fileData.mime_type?.startsWith('audio/') || fileData.mime_type?.startsWith('video/');
  const bucket = isAudio ? 'depo-audio' : 'depo-files';

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(fileData.storage_path, 3600);

  if (error) return old ? null : { data: null, error };
  return old ? data.signedUrl : { data: data.signedUrl, error: null };
}

// ---------------------------------------------------------------------------
// uploadFile (legacy alias — callers should use createFile + uploadFileToSupabase)
// ---------------------------------------------------------------------------

export async function uploadFile(
  supabaseOrData: any,
  _maybeData?: any
): Promise<any> {
  return createFile(supabaseOrData, _maybeData);
}
