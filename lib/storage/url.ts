// lib/storage/url.ts
// Generate fresh access URLs from storage paths stored in the database.
//
// RULE: DB columns store storage PATHS (e.g. "firm_123/job_456/audio.mp3").
//       URLs are generated at read time — never persisted.
//
// Usage:
//   const url = await getFileUrl('firm/job/audio.mp3', 'depo-audio');
//   const url = await getFileUrl('firm/job/doc.pdf', 'depo-files');

import { createAdminClient } from '@/lib/supabase/admin';

const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

const PUBLIC_BUCKETS = ['depo-audio'] as const;
const PRIVATE_BUCKETS = ['depo-files', 'depo-exports', 'depo-chunks'] as const;

export type StorageBucket =
  | (typeof PUBLIC_BUCKETS)[number]
  | (typeof PRIVATE_BUCKETS)[number];

/**
 * Generate a fresh access URL for a file stored at the given path.
 * - Public buckets (depo-audio): returns a permanent public URL
 * - Private buckets (depo-files, depo-exports, depo-chunks): returns a 1-hour signed URL
 */
export async function getFileUrl(
  storagePath: string,
  bucket: StorageBucket = 'depo-files',
): Promise<string> {
  const supabase = createAdminClient();

  if ((PUBLIC_BUCKETS as readonly string[]).includes(bucket)) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    return data.publicUrl;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(
      `Failed to generate signed URL for ${bucket}/${storagePath}: ${error?.message ?? 'unknown'}`,
    );
  }

  return data.signedUrl;
}

/**
 * Generate signed URLs for multiple paths in one call.
 */
export async function getFileUrls(
  paths: { storagePath: string; bucket: StorageBucket }[],
): Promise<string[]> {
  return Promise.all(paths.map((p) => getFileUrl(p.storagePath, p.bucket)));
}

/**
 * Given a value that might be a full Supabase URL or a plain storage path,
 * return only the path portion. Handles both old rows (which stored full URLs)
 * and new rows (which store paths directly).
 *
 * @example
 * extractStoragePath('firm/job/audio.mp3') → 'firm/job/audio.mp3'
 * extractStoragePath('https://xyz.supabase.co/storage/v1/object/public/depo-audio/firm/job/audio.mp3')
 *   → 'firm/job/audio.mp3'
 */
export function extractStoragePath(urlOrPath: string): string {
  if (!urlOrPath || !urlOrPath.startsWith('http')) return urlOrPath;

  const allBuckets = [...PUBLIC_BUCKETS, ...PRIVATE_BUCKETS] as readonly string[];
  for (const bucket of allBuckets) {
    for (const marker of [
      `/object/public/${bucket}/`,
      `/object/sign/${bucket}/`,
    ]) {
      const idx = urlOrPath.indexOf(marker);
      if (idx !== -1) {
        // Strip any query string (e.g. signed URL token)
        return urlOrPath.slice(idx + marker.length).split('?')[0];
      }
    }
  }

  // Fallback: return as-is (may already be a path)
  return urlOrPath;
}
