// app/api/transcriptions/[id]/status/route.ts
// Get transcription pipeline status and progress

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withRouteProtection, type ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { UserRole } from '@/lib/enums/roles';
import { getJobById, isUserAssignedToJob } from '@/lib/supabase/queries/jobs';
import { isAdminRole } from '@/lib/admin';

const getHandler = async (_request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  try {
    const transcriptionId = params.id;

    // Get transcription record
    const { data: transcription, error } = await supabase
      .from('transcriptions')
      .select('job_id, status, chunk_count')
      .eq('id', transcriptionId)
      .single();

    if (error || !transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    const job = await getJobById(supabase, transcription.job_id, {
      includeAssignments: true,
    });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const hasAccess =
      isAdminRole(user.role) ||
      (job as any).created_by_id === user.id ||
      await isUserAssignedToJob(transcription.job_id, user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const totalChunks = transcription.chunk_count || 1;
    let currentChunk: number | null = null;
    let progress = 0;

    // Calculate progress based on completed chunks
    if (totalChunks > 1) {
      const { data: chunks } = await supabase
        .from('transcription_chunks')
        .select('chunk_index, status')
        .eq('transcription_id', transcriptionId)
        .order('chunk_index', { ascending: true });

      if (chunks) {
        const completedChunks = chunks.filter((c: any) => c.status === 'COMPLETE').length;
        const processingChunk = chunks.find((c: any) => c.status === 'PROCESSING');

        currentChunk = processingChunk ? processingChunk.chunk_index : completedChunks;
        progress = Math.round((completedChunks / totalChunks) * 100);
      }
    } else {
      // Single chunk
      progress = transcription.status === 'COMPLETE' ? 100 : 50;
    }

    return NextResponse.json({
      transcriptionId,
      jobId: transcription.job_id,
      status: transcription.status,
      progress,
      currentChunk,
      totalChunks,
    });
  } catch (err: any) {
    console.error('Error fetching transcription status:', err);
    return NextResponse.json(
      { error: 'Failed to fetch transcription status' },
      { status: 500 }
    );
  }
};

const JOB_ROLES = [
  UserRole.ADMIN,
  UserRole.COURT_REPORTER,
  UserRole.REPORTER,
  UserRole.SCOPIST,
  UserRole.ATTORNEY,
  UserRole.AGENCY_OWNER,
  UserRole.AGENCY_MANAGER,
];

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: JOB_ROLES, requireFirm: true },
  getHandler,
);
