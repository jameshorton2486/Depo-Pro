// ═══════════════════════════════════════════════════════════════
// FILE UPLOAD API ENDPOINT
// ═══════════════════════════════════════════════════════════════

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { FileType } from '@/types/database';
import { uploadFile } from '@/lib/storage';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { listFilesForJob, createFile } from '@/lib/supabase/queries/files';
import { getJobById, isUserAssignedToJob } from '@/lib/supabase/queries/jobs';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs'; // Required for fs/path usage

const UPLOAD_DIR = join(process.cwd(), 'uploads');
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
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;

    // 🔍 Fetch job with access check using query module
    const supabase = await createSupabaseServerClient();
    const job = await getJobById(supabase, jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 🔒 Security: Verify access rights via query layer
    const isAssigned = await isUserAssignedToJob(jobId, session.user.id);
    const hasAccess =
      session.user.role === 'ADMIN' ||
      (job as any).created_by_id === session.user.id ||
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

    // 📂 Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // � Upload file to storage
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const storagePath = await uploadFile(
      buffer,
      file.name,
      'jobs',
    );

    // 💿 Save file metadata to database using query module
    const uploadedFile = await createFile(supabase, {
      job_id: jobId,
      file_name: file.name,
      mime_type: file.type,
      file_size: buffer.length,
      type: getFileType(file.type),
      storage_path: storagePath,
      storage_url: storagePath,
    });

    return NextResponse.json({ file: uploadedFile }, { status: 201 });
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
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;

    // 🔍 Fetch job with access check using query module
    const supabase = await createSupabaseServerClient();
    const job = await getJobById(supabase, jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 🔒 Security: Verify access rights via query layer
    const isAssigned = await isUserAssignedToJob(jobId, session.user.id);
    const hasAccess =
      session.user.role === 'ADMIN' ||
      (job as any).created_by_id === session.user.id ||
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
