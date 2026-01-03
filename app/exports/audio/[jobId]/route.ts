import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

/**
 * GET /exports/audio/[jobId]
 * Download audio file for a job
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await context.params;

    // Verify job exists
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: {
        createdBy: {
          select: { id: true },
        },
        files: {
          where: {
            type: 'AUDIO',
          },
          select: {
            id: true,
            storageUrl: true,
            fileName: true,
          },
          take: 1,
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check access
    const user = session.user as { id: string; role: string };
    const isCreator = job.createdById === user.id;
    const isAdmin = user.role === 'ADMIN';
    const isScopist = job.scopistId === user.id;

    if (!isCreator && !isAdmin && !isScopist) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!job.files || job.files.length === 0) {
      return NextResponse.json(
        { error: 'Audio file not found for this job' },
        { status: 404 }
      );
    }

    const audioFile = job.files[0];

    // Redirect to file download endpoint
    return NextResponse.redirect(new URL(`/api/files/${audioFile.id}/download`, request.url));
  } catch (error) {
    console.error('Error in audio export route:', error);
    return NextResponse.json(
      { error: 'Failed to download audio' },
      { status: 500 }
    );
  }
}
