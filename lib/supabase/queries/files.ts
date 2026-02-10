/**
 * Files Query Layer for Depo-Pro v1.3
 *
 * NOTE: File management out of v1.3 MVP scope
 * This is a compatibility stub for legacy code
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Get file by ID (stub)
 */
export async function getFileById(
  supabaseOrId: any,
  maybeId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('File management not available in v1.3') };
}

/**
 * List files by job (stub)
 */
export async function listFilesByJob(
  supabaseOrJobId: any,
  maybeJobId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrJobId === 'object' && supabaseOrJobId.from;
  return isOldPattern ? [] : { data: [], error: null };
}

/**
 * Upload file (stub)
 */
export async function uploadFile(
  supabaseOrData: any,
  maybeData?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrData === 'object' && supabaseOrData.from;
  return isOldPattern ? null : { data: null, error: new Error('File management not available in v1.3') };
}

/**
 * Delete file (stub)
 */
export async function deleteFile(
  supabaseOrId: any,
  maybeId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('File management not available in v1.3') };
}

/**
 * Get file download URL (stub)
 */
export async function getFileDownloadUrl(
  supabaseOrId: any,
  maybeId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('File management not available in v1.3') };
}
