// ═══════════════════════════════════════════════════════════════
// FILE DELETE API ENDPOINT
// ═══════════════════════════════════════════════════════════════

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getFileWithJob, deleteFile } from '@/lib/supabase/queries/files';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { logger } from '@/lib/logger';
import { isAdminRole } from '@/lib/admin';

export const runtime = 'nodejs'; // Required for fs/path usage

const UPLOAD_DIR = join(process.cwd(), 'uploads');

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: fileId } = await params;

    // 🔍 Fetch file with job info
    const supabase = await createSupabaseServerClient();
    const file = await getFileWithJob(supabase, fileId);

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // 🔒 Security: Only uploader, reporter, or admin can delete
    const canDelete =
      isAdminRole(session.role) ||
      file.job.createdById === session.id;

    if (!canDelete) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 🗑️ Delete file from filesystem
    try {
      const filePath = join(UPLOAD_DIR, file.file_name);
      await unlink(filePath);
    } catch (error) {
      logger.error('Failed to delete file from filesystem', error instanceof Error ? error : new Error(String(error)), { fileId });
      // Continue with database deletion even if file doesn't exist
    }

    // 💿 Delete file record from database
    await deleteFile(supabase, fileId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const { id: fileId } = await params;
    logger.error('File deletion error', error instanceof Error ? error : new Error(String(error)), { fileId });
    return NextResponse.json(
      { error: 'Failed to delete file' },
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

    const { id: fileId } = await params;

    // 🔍 Fetch file with access check
    const supabase = await createSupabaseServerClient();
    const file = await getFileWithJob(supabase, fileId);

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // 🔒 Security: Verify access rights
    const hasAccess =
      isAdminRole(session.role) ||
      file.job.createdById === session.id ||
      file.job.assignments.some((a: any) => a.scopistId === session.id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 📥 Return file metadata
    return NextResponse.json({ file }, { status: 200 });
  } catch (error) {
    const { id: fileId } = await params;
    logger.error('Fetch file error', error instanceof Error ? error : new Error(String(error)), { fileId });
    return NextResponse.json(
      { error: 'Failed to fetch file' },
      { status: 500 },
    );
  }
}
