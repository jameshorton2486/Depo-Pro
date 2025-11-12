// ═══════════════════════════════════════════════════════════════
// FILE STORAGE SERVICE (Mock Implementation - Ready for S3/Supabase)
// ═══════════════════════════════════════════════════════════════

import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
const USE_CLOUD_STORAGE = process.env.USE_CLOUD_STORAGE === 'true';
const S3_BUCKET = process.env.S3_BUCKET_NAME;
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET;

// ═══════════════════════════════════════════════════════════════
// STORAGE INTERFACE
// ═══════════════════════════════════════════════════════════════

export interface UploadResult {
  storageKey: string;
  storageUrl?: string;
  size: number;
}

export interface DownloadResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

// ═══════════════════════════════════════════════════════════════
// LOCAL STORAGE (Current Implementation)
// ═══════════════════════════════════════════════════════════════

async function uploadToLocal(
  buffer: Buffer,
  filename: string,
  _contentType: string
): Promise<UploadResult> {
  const uniqueFilename = `${crypto.randomUUID()}-${filename}`;
  const filePath = join(UPLOAD_DIR, uniqueFilename);

  await writeFile(filePath, buffer);
  
  console.log('[LOCAL] Uploaded file:', { filename, contentType: _contentType, size: buffer.length });

  return {
    storageKey: uniqueFilename,
    size: buffer.length,
  };
}

async function downloadFromLocal(storageKey: string): Promise<DownloadResult> {
  const filePath = join(UPLOAD_DIR, storageKey);

  if (!existsSync(filePath)) {
    throw new Error('File not found');
  }

  const buffer = await readFile(filePath);
  
  // Determine content type from extension
  const ext = storageKey.split('.').pop()?.toLowerCase();
  const contentType = getContentType(ext || '');

  return {
    buffer,
    contentType,
    filename: storageKey,
  };
}

async function deleteFromLocal(storageKey: string): Promise<void> {
  const filePath = join(UPLOAD_DIR, storageKey);
  
  if (existsSync(filePath)) {
    await unlink(filePath);
  }
}

// ═══════════════════════════════════════════════════════════════
// AWS S3 STORAGE (Mock - Ready for Integration)
// ═══════════════════════════════════════════════════════════════

async function uploadToS3(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<UploadResult> {
  // TODO: Implement AWS S3 upload
  // const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  // const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
  
  // const s3Client = new S3Client({
  //   region: process.env.AWS_REGION,
  //   credentials: {
  //     accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  //     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  //   },
  // });

  // const key = `uploads/${crypto.randomUUID()}-${filename}`;
  
  // await s3Client.send(new PutObjectCommand({
  //   Bucket: S3_BUCKET,
  //   Key: key,
  //   Body: buffer,
  //   ContentType: contentType,
  // }));

  // const url = await getSignedUrl(s3Client, new GetObjectCommand({
  //   Bucket: S3_BUCKET,
  //   Key: key,
  // }), { expiresIn: 3600 });

  console.log('S3 upload requested but not configured - using local storage');
  return uploadToLocal(buffer, filename, contentType);
}

async function downloadFromS3(storageKey: string): Promise<DownloadResult> {
  // TODO: Implement AWS S3 download
  console.log('S3 download requested but not configured - using local storage');
  return downloadFromLocal(storageKey);
}

async function deleteFromS3(storageKey: string): Promise<void> {
  // TODO: Implement AWS S3 delete
  console.log('S3 delete requested but not configured - using local storage');
  return deleteFromLocal(storageKey);
}

// ═══════════════════════════════════════════════════════════════
// SUPABASE STORAGE (Mock - Ready for Integration)
// ═══════════════════════════════════════════════════════════════

async function uploadToSupabase(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<UploadResult> {
  // TODO: Implement Supabase Storage upload
  // const { createClient } = await import('@supabase/supabase-js');
  
  // const supabase = createClient(
  //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //   process.env.SUPABASE_SERVICE_ROLE_KEY!
  // );

  // const key = `uploads/${crypto.randomUUID()}-${filename}`;
  
  // const { data, error } = await supabase.storage
  //   .from(SUPABASE_BUCKET!)
  //   .upload(key, buffer, {
  //     contentType,
  //     upsert: false,
  //   });

  // if (error) throw error;

  // const { data: urlData } = supabase.storage
  //   .from(SUPABASE_BUCKET!)
  //   .getPublicUrl(key);

  console.log('Supabase upload requested but not configured - using local storage');
  return uploadToLocal(buffer, filename, contentType);
}

async function downloadFromSupabase(storageKey: string): Promise<DownloadResult> {
  // TODO: Implement Supabase Storage download
  console.log('Supabase download requested but not configured - using local storage');
  return downloadFromLocal(storageKey);
}

async function deleteFromSupabase(storageKey: string): Promise<void> {
  // TODO: Implement Supabase Storage delete
  console.log('Supabase delete requested but not configured - using local storage');
  return deleteFromLocal(storageKey);
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API (Auto-selects storage provider)
// ═══════════════════════════════════════════════════════════════

export async function uploadFile(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<UploadResult> {
  if (USE_CLOUD_STORAGE) {
    if (S3_BUCKET) {
      return uploadToS3(buffer, filename, contentType);
    }
    if (SUPABASE_BUCKET) {
      return uploadToSupabase(buffer, filename, contentType);
    }
  }
  
  return uploadToLocal(buffer, filename, contentType);
}

export async function downloadFile(storageKey: string): Promise<DownloadResult> {
  if (USE_CLOUD_STORAGE) {
    if (S3_BUCKET) {
      return downloadFromS3(storageKey);
    }
    if (SUPABASE_BUCKET) {
      return downloadFromSupabase(storageKey);
    }
  }
  
  return downloadFromLocal(storageKey);
}

export async function deleteFile(storageKey: string): Promise<void> {
  if (USE_CLOUD_STORAGE) {
    if (S3_BUCKET) {
      return deleteFromS3(storageKey);
    }
    if (SUPABASE_BUCKET) {
      return deleteFromSupabase(storageKey);
    }
  }
  
  return deleteFromLocal(storageKey);
}

export async function generateSignedUrl(
  storageKey: string,
  _expiresIn: number = 3600
): Promise<string> {
  // TODO: Generate signed URLs for cloud storage
  // For local storage, return a temporary download token
  const token = crypto.randomBytes(32).toString('hex');
  
  console.log('[LOCAL] Generating signed URL:', { storageKey, expiresIn: _expiresIn });
  
  // Store token temporarily (in production, use Redis)
  // For now, just return a URL that will be validated server-side
  return `/api/files/download/${storageKey}?token=${token}`;
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getContentType(extension: string): string {
  const contentTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
  };

  return contentTypes[extension] || 'application/octet-stream';
}
