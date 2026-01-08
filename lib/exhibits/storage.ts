// lib/exhibits/storage.ts
// Storage helpers for exhibit file management

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Lazy Supabase client initialization (BUILD-SAFE)
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Storage client requires these environment variables.'
    );
  }

  supabaseInstance = createClient(supabaseUrl, supabaseServiceKey);
  return supabaseInstance;
}

// Bucket configuration
const BUCKET_NAME = 'depo-files'; // Use existing bucket
const EXHIBITS_PREFIX = 'exhibits';

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Uploads an original exhibit file to storage
 */
export async function uploadExhibitOriginal(params: {
  jobId: string;
  file: File;
  filename: string;
}): Promise<UploadResult> {
  const supabase = getSupabaseClient();
  const { jobId, file, filename } = params;

  // Sanitize filename
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `${EXHIBITS_PREFIX}/${jobId}/original/${Date.now()}_${safeFilename}`;

  // Convert File to ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload exhibit: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

/**
 * Uploads a stamped PDF exhibit to storage
 */
export async function uploadExhibitStamped(params: {
  jobId: string;
  buffer: Buffer;
  filename: string;
}): Promise<UploadResult> {
  const supabase = getSupabaseClient();
  const { jobId, buffer, filename } = params;

  // Sanitize filename and add stamped prefix
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const stampedFilename = `stamped_${safeFilename}`;
  const path = `${EXHIBITS_PREFIX}/${jobId}/stamped/${Date.now()}_${stampedFilename}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload stamped exhibit: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

/**
 * Generates a signed URL for private file access
 */
export async function getExhibitSignedUrl(path: string): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, 3600); // 1 hour expiry

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Deletes exhibit files from storage
 */
export async function deleteExhibitFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;

  const supabase = getSupabaseClient();
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(paths);

  if (error) {
    throw new Error(`Failed to delete exhibit files: ${error.message}`);
  }
}

/**
 * Downloads a file from storage as a Buffer
 */
export async function downloadExhibitFile(path: string): Promise<Buffer> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(path);

  if (error) {
    throw new Error(`Failed to download exhibit: ${error.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Helper to determine file type from MIME type
 */
export function getFileTypeFromMime(mimeType: string): 'PDF' | 'IMAGE' | 'DOCX' {
  if (mimeType === 'application/pdf') {
    return 'PDF';
  }
  if (mimeType.startsWith('image/')) {
    return 'IMAGE';
  }
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    return 'DOCX';
  }
  // Default to DOCX for other document types
  return 'DOCX';
}
