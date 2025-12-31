import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getProperNounKeywords } from '@/lib/transcription/buildKeywords';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;
    const user = session.user as { id: string; role: string };

    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        createdById: true,
        assignments: { 
          select: { 
            scopistId: true, 
            status: true 
          } 
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Permission: Reporter (own), Scopist (assigned), Admin
    const canAccess = checkAccess(user, job);
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const properNouns = await getProperNounKeywords(jobId);

    return NextResponse.json({
      properNouns,
    });
  } catch (error) {
    console.error('Error fetching proper nouns:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

function checkAccess(user: { id: string; role: string }, job: any): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'REPORTER' && job.createdById === user.id) return true;
  if (user.role === 'SCOPIST') {
    return job.assignments.some((a: any) => a.scopistId === user.id && a.status !== 'DECLINED');
  }
  return false;
}
