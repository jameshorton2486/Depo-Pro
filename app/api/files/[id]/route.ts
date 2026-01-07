// ═══════════════════════════════════════════════════════════════
// FILE DELETE API ENDPOINT
// ═══════════════════════════════════════════════════════════════

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs'; // Required for fs/path usage

const UPLOAD_DIR = join(process.cwd(), 'uploads');

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getCurrentUser();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: fileId } = await params;

    // 🔍 Fetch file with job info
    const file = await db.jobFile.findUnique({
      where: { id: fileId },
      include: {
        job: {
          select: {
            id: true,
            createdById: true,
            assignments: {
              select: {
                scopistId: true,
              },
            },
          },
        },
      },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // 🔒 Security: Only uploader, reporter, or admin can delete
    const canDelete =
      session.user.role === 'ADMIN' ||
      file.job.createdById === session.user.id;

    if (!canDelete) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 🗑️ Delete file from filesystem
    try {
      const filePath = join(UPLOAD_DIR, file.fileName);
      await unlink(filePath);
    } catch (error) {
      logger.error('Failed to delete file from filesystem', error instanceof Error ? error : new Error(String(error)), { fileId });
      // Continue with database deletion even if file doesn't exist
    }

    // 💿 Delete file record from database
    await db.jobFile.delete({
      where: { id: fileId },
    });

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
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: fileId } = await params;

    // 🔍 Fetch file with access check
    const file = await db.jobFile.findUnique({
      where: { id: fileId },
      include: {
        job: {
          select: {
            id: true,
            createdById: true,
            assignments: {
              select: {
                scopistId: true,
              },
            },
          },
        },
      },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // 🔒 Security: Verify access rights
    const hasAccess =
      session.user.role === 'ADMIN' ||
      file.job.createdById === session.user.id ||
      file.job.assignments.some((a: any) => a.scopistId === session.user.id);

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
