// lib/storage.ts
// File storage operations

import fs from 'fs/promises';
import path from 'path';
import { createAdminClient } from '@/lib/supabase/admin';

// Storage bucket names
const AUDIO_BUCKET = 'depo-audio';
const FILES_BUCKET = 'depo-files';

export interface UploadResult {
  /** Storage path relative to bucket root — store this in the database. */
  storagePath: string;
  /** Immediate-use URL. Public for audio; 1-hour signed for private files.
   *  Do NOT persist this in the database — use storagePath for DB columns. */
  url: string;
}

/**
 * Upload a file to Supabase Storage.
 * Returns { storagePath, url } where:
 * - storagePath should be stored in the database column
 * - url is for immediate use only (public URL for audio, 1-hour signed for private files)
 */
export async function uploadFileToSupabase(
  buffer: Buffer,
  filename: string,
  storagePath: string,
  mimeType: string,
  isAudio: boolean = false,
): Promise<UploadResult> {
  const supabase = createAdminClient();
  const bucket = isAudio ? AUDIO_BUCKET : FILES_BUCKET;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType: mimeType || 'application/octet-stream',
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  if (isAudio) {
    // Public bucket — permanent URL safe for streaming and storage
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    return { storagePath, url: publicUrl };
  }

  // Private bucket — 1-hour signed URL for immediate display only
  const { data, error: signErr } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, 3600);
  if (signErr) throw new Error(`Storage sign failed: ${signErr.message}`);
  return { storagePath, url: data.signedUrl };
}



// ============================================
// DOWNLOAD FILE
// ============================================

export async function downloadFile(fileUrl: string): Promise<Buffer> {
  // Check if it's a local file path
  if (fileUrl.startsWith('/') || fileUrl.startsWith('./') || fileUrl.startsWith('file://')) {
    const localPath = fileUrl.replace('file://', '');
    return await fs.readFile(localPath);
  }

  // Handle HTTP/HTTPS URLs
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    const response = await fetch(fileUrl);

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // Handle Supabase storage URLs or relative paths
  // Adjust this based on your storage configuration
  const uploadsDir = process.env.UPLOADS_DIR || './uploads';
  const localPath = path.join(uploadsDir, fileUrl);

  try {
    return await fs.readFile(localPath);
  } catch {
    throw new Error(`File not found: ${localPath}`);
  }
}

// ============================================
// UPLOAD FILE
// ============================================

export async function uploadFile(
  buffer: Buffer,
  filename: string,
  directory: string = 'uploads',
): Promise<string> {
  const uploadsDir = process.env.UPLOADS_DIR || './uploads';
  const targetDir = path.join(uploadsDir, directory);

  // Ensure directory exists
  await fs.mkdir(targetDir, { recursive: true });

  const filePath = path.join(targetDir, filename);
  await fs.writeFile(filePath, buffer);

  return path.join(directory, filename);
}

// ============================================
// DELETE FILE
// ============================================

export async function deleteFile(filePath: string): Promise<void> {
  const uploadsDir = process.env.UPLOADS_DIR || './uploads';
  const fullPath = path.join(uploadsDir, filePath);

  try {
    await fs.unlink(fullPath);
  } catch (error) {
    console.warn(`Failed to delete file: ${fullPath}`, error);
  }
}

// ============================================
// CHECK FILE EXISTS
// ============================================

export async function fileExists(filePath: string): Promise<boolean> {
  const uploadsDir = process.env.UPLOADS_DIR || './uploads';
  const fullPath = filePath.startsWith('/') ? filePath : path.join(uploadsDir, filePath);

  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}
