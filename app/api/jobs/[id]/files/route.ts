// ═══════════════════════════════════════════════════════════════
// FILE UPLOAD API ENDPOINT
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { FileType } from '@prisma/client';
import { uploadFile } from '@/lib/storage';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

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

    // 🔍 Fetch job with access check
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        createdById: true,
        assignments: {
          select: {
            scopistId: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 🔒 Security: Verify access rights
    const hasAccess =
      session.user.role === 'ADMIN' ||
      job.createdById === session.user.id ||
      job.assignments.some((a) => a.scopistId === session.user.id);

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

    // 💿 Save file metadata to database
    const uploadedFile = await db.jobFile.create({
      data: {
        jobId,
        fileName: file.name,
        mimeType: file.type,
        fileSize: buffer.length,
        type: getFileType(file.type),
        storagePath,
        storageUrl: storagePath,
      },
    });

    return NextResponse.json({ file: uploadedFile }, { status: 201 });
  } catch (error) {
    console.error('File upload error:', error);
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

    // 🔍 Fetch job with access check
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        createdById: true,
        assignments: {
          select: {
            scopistId: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 🔒 Security: Verify access rights
    const hasAccess =
      session.user.role === 'ADMIN' ||
      job.createdById === session.user.id ||
      job.assignments.some((a) => a.scopistId === session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 📋 Fetch all files for this job
    const files = await db.jobFile.findMany({
      where: { jobId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ files }, { status: 200 });
  } catch (error) {
    console.error('Fetch files error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 },
    );
  }
}
