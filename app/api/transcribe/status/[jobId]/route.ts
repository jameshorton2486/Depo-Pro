import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { _authConfig } from '@/lib/auth-options';
import { _db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Query transcription status from database
    // const transcription = await db.transcription.findUnique({
    //   where: { jobId: params.jobId },
    //   select: {
    //     id: true,
    //     jobId: true,
    //     status: true,
    //     progress: true,
    //     error: true,
    //     createdAt: true,
    //     completedAt: true,
    //   },
    // });

    // if (!transcription) {
    //   return NextResponse.json(
    //     { error: 'Transcription not found' },
    //     { status: 404 }
    //   );
    // }

    return NextResponse.json({
      jobId: params.jobId,
      status: 'PENDING',
      progress: 0
    }, { status: 200 });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}