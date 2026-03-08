// ═══════════════════════════════════════════════════════════════
// FILE UPLOAD API ENDPOINT
// ═══════════════════════════════════════════════════════════════

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { FileType } from '@/types/database';
import { uploadFileToSupabase } from '@/lib/storage';
import { listFilesForJob, createFile } from '@/lib/supabase/queries/files';
import { getJobById, isUserAssignedToJob } from '@/lib/supabase/queries/jobs';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'video/mp4',
  'video/quicktime',
];

// Helper function to map MIME type to FileType enum
function getFileType(mimeType: string): FileType {
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('text')) {
    return 'ROUGH_TRANSCRIPT'; // Default to rough transcript for docs
  }
  return 'EXHIBIT'; // Default fallback
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;

    // 🔍 Fetch job with access check using query module
    const supabase = await createSupabaseServerClient();
    const job = await getJobById(supabase, jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Tenant isolation: ensure job belongs to the user's firm
    const userFirmId = (session as any).firmId ?? null;
    const jobFirmId = (job as any).firm_id ?? null;
    if (userFirmId && jobFirmId && userFirmId !== jobFirmId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // 🔒 Security: Verify access rights via query layer
    const isAssigned = await isUserAssignedToJob(jobId, session.id);
    const hasAccess =
      session.role === 'ADMIN' ||
      (job as any).created_by_id === session.id ||
      isAssigned;

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 📥 Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // ✅ Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} not allowed` },
        { status: 400 },
      );
    }

    // ✅ Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 },
      );
    }

    //� Upload file to storage
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const isAudio = file.type.startsWith('audio/') || file.type.startsWith('video/');
    const supabaseStoragePath = `${jobId}/${Date.now()}-${file.name}`;

    const uploadResult = await uploadFileToSupabase(
      buffer,
      file.name,
      supabaseStoragePath,
      file.type,
      isAudio,
    );

    // 💿 Save file metadata to database using query module
    // Store the storage PATH (not the URL) so the DB column never holds expiring signed URLs.
    // Fresh URLs are generated at access time via lib/storage/url.ts.
    const uploadedFile = await createFile(supabase, {
      job_id: jobId,
      file_name: file.name,
      mime_type: file.type,
      file_size: buffer.length,
      type: getFileType(file.type),
      storage_path: uploadResult.storagePath,
      storage_url: uploadResult.storagePath,
    });

    // Persist audio path to jobs.audio_file_url so the transcription pipeline
    // and review page can find it even when the job_files query stub returns [].
    if (isAudio) {
      await supabase
        .from('jobs')
        .update({ audio_file_url: uploadResult.storagePath, updated_at: new Date().toISOString() })
        .eq('id', jobId);
    }

    return NextResponse.json({ file: uploadedFile }, { status: 200 });
  } catch (error) {
    const { id: jobId } = await params;
    logger.error('File upload error', error instanceof Error ? error : new Error(String(error)), { jobId });
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;

    // 🔍 Fetch job with access check using query module
    const supabase = await createSupabaseServerClient();
    const job = await getJobById(supabase, jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Tenant isolation: ensure job belongs to the user's firm
    const userFirmId = (session as any).firmId ?? null;
    const jobFirmId = (job as any).firm_id ?? null;
    if (userFirmId && jobFirmId && userFirmId !== jobFirmId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // 🔒 Security: Verify access rights via query layer
    const isAssigned = await isUserAssignedToJob(jobId, session.id);
    const hasAccess =
      session.role === 'ADMIN' ||
      (job as any).created_by_id === session.id ||
      isAssigned;

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 📋 Fetch all files for this job using query module
    const files = await listFilesForJob(supabase, jobId);

    return NextResponse.json({ files }, { status: 200 });
  } catch (error) {
    const { id: jobId } = await params;
    logger.error('Fetch files error', error instanceof Error ? error : new Error(String(error)), { jobId });
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 },
    );
  }
}
