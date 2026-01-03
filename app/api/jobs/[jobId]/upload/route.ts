// =============================================================================
// JOB UPLOAD API
// app/api/jobs/[jobId]/upload/route.ts
//
// Upload audio file for a job
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

/**
 * POST /api/jobs/[jobId]/upload
 * Upload audio file for transcription
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await context.params;
    const user = session.user as { id: string; role: string };

    // Get job
    const job = await db.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Check access
    if (user.role !== 'ADMIN' && job.createdById !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // In production, upload to Supabase storage
    // For now, just update job status
    await db.job.update({
      where: { id: jobId },
      data: {
        status: 'FILES_UPLOADED',
      },
    });

    // TODO: Upload file to Supabase storage
    // TODO: Start transcription process

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
