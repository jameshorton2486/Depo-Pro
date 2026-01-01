// ═══════════════════════════════════════════════════════════════
// JOB API ROUTES - /api/jobs/[id]
// ═══════════════════════════════════════════════════════════════
// GET    /api/jobs/[id] - Get single job (🔒 firmId filtered)
// PUT    /api/jobs/[id] - Update job (🔒 firmId filtered)
// DELETE /api/jobs/[id] - Delete job (🔒 firmId filtered)

import { NextRequest, NextResponse } from 'next/server';
import { JobStatus } from '@prisma/client';

import { db } from '@/lib/db';
import { withRequestLogging } from '@/lib/observability';
import { checkRateLimit, requireAuth } from '@/lib/security';
import { invalidateDashboardCache, invalidateEntityCache } from '@/lib/cache';
import { lockNotesForJob } from '@/lib/phase6a/note-locking';

// ───────────────────────────────────────────────────────────────
// GET /api/jobs/[id] - Get single job
// ───────────────────────────────────────────────────────────────

export const GET = withRequestLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const session = await requireAuth(request);
    const { id } = await params;

    // Rate limiting
    const rateLimit = checkRateLimit(session.user.id, 'API_GLOBAL');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Check for include query parameter
    const searchParams = request.nextUrl.searchParams;
    const includeParam = searchParams.get('include');
    const includes = includeParam ? includeParam.split(',') : [];

    const job = await db.job.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignments: {
          include: {
            scopist: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        files: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        transcripts: {
          orderBy: {
            versionNumber: 'desc',
          },
        },
        // Include transcription if requested
        ...(includes.includes('transcription') && {
          transcription: {
            select: {
              id: true,
              words: true,
              utterances: true,
              fullTranscript: true,
              wordCount: true,
              flaggedWordCount: true,
              averageConfidence: true,
              status: true,
            },
          },
        }),
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Transform data if transcription is included
    if (includes.includes('transcription') && job.transcription) {
      const transcription = job.transcription as any;
      
      // Transform utterances to segments format if utterances exist
      if (transcription.utterances) {
        const utterances = Array.isArray(transcription.utterances) 
          ? transcription.utterances 
          : JSON.parse(transcription.utterances as string || '[]');
        
        // Convert utterances to segments format expected by components
        transcription.segments = utterances.map((utterance: any) => ({
          speaker: utterance.speaker || 0,
          words: utterance.words || [],
          start: utterance.start || 0,
          end: utterance.end || 0,
        }));
      } else if (transcription.words) {
        // Fallback: create segments from words if utterances don't exist
        const words = Array.isArray(transcription.words)
          ? transcription.words
          : JSON.parse(transcription.words as string || '[]');
        
        // Group words by speaker to create segments
        const segmentsMap = new Map<number, any[]>();
        words.forEach((word: any) => {
          const speaker = word.speaker || 0;
          if (!segmentsMap.has(speaker)) {
            segmentsMap.set(speaker, []);
          }
          segmentsMap.get(speaker)!.push(word);
        });
        
        transcription.segments = Array.from(segmentsMap.entries()).map(([speaker, wordsArray]) => ({
          speaker,
          words: wordsArray,
          start: wordsArray[0]?.start || 0,
          end: wordsArray[wordsArray.length - 1]?.end || 0,
        }));
      }
    }

    // Ensure files have url property (matching expected format)
    if (includes.includes('files') && job.files) {
      job.files = job.files.map((file: any) => ({
        ...file,
        url: file.storageUrl || file.url,
      }));
    }

    return NextResponse.json(job);

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw error;
  }
});

// ───────────────────────────────────────────────────────────────
// PUT /api/jobs/[id] - Update job
// ───────────────────────────────────────────────────────────────

export const PUT = withRequestLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const session = await requireAuth(request);
    const { id } = await params;

    // Rate limiting
    const rateLimit = checkRateLimit(session.user.id, 'API_GLOBAL');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Check if job exists and user has access
    const existingJob = await db.job.findUnique({
      where: { id },
      select: {
        createdById: true,
      },
    });

    if (!existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 🔒 Security: Only reporter or admin can update
    const canUpdate =
      session.user.role === 'ADMIN' ||
      existingJob.createdById === session.user.id;

    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    // Use safe update service (Phase 1: Domain Enforcement)
    const { safeUpdateJob } = await import('@/lib/services/job-field-lock-service');
    
    const result = await safeUpdateJob(id, body, session.user.id);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 },
      );
    }

    // Fetch updated job
    const job = await db.job.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Invalidate caches
    invalidateDashboardCache();
    invalidateEntityCache('job', id);

    return NextResponse.json(job);

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error },
        { status: 400 },
      );
    }
    throw error;
  }
});

// ───────────────────────────────────────────────────────────────
// PATCH /api/jobs/[id] - Update job status only
// ───────────────────────────────────────────────────────────────

export const PATCH = withRequestLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const session = await requireAuth(request);
    const { id } = await params;

    // Rate limiting
    const rateLimit = checkRateLimit(session.user.id, 'API_GLOBAL');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const { status } = body as { status?: JobStatus };

    if (!status || !Object.values(JobStatus).includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    const job = await db.job.findUnique({
      where: { id },
      include: {
        assignments: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const isOwner = job.createdById === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';
    const isAssignedScopist =
      session.user.role === 'SCOPIST' &&
      job.assignments.some((assignment) => assignment.scopistId === session.user.id);

    if (!isOwner && !isAdmin && !isAssignedScopist) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use status transition service (Phase 1: Domain Enforcement)
    const { transitionJobStatus } = await import('@/lib/services/job-field-lock-service');
    
    const transitionResult = await transitionJobStatus(id, status, session.user.id);
    
    if (!transitionResult.success) {
      return NextResponse.json(
        { error: transitionResult.error },
        { status: 400 },
      );
    }

    const updatedJob = await db.job.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    // Phase 6A: Auto-lock notes when transcript is finalized
    if (status === JobStatus.COMPLETED || status === JobStatus.REVIEW_COMPLETE) {
      try {
        await lockNotesForJob(id, session.user.id);
      } catch (error) {
        // Log error but don't fail the status update
        console.error('Failed to lock notes for job:', error);
      }
    }

    // Invalidate caches
    invalidateDashboardCache();
    invalidateEntityCache('job', id);

    return NextResponse.json(updatedJob);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw error;
  }
});

// ───────────────────────────────────────────────────────────────
// DELETE /api/jobs/[id] - Delete job
// ───────────────────────────────────────────────────────────────

export const DELETE = withRequestLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const session = await requireAuth(request);
    const { id } = await params;

    // Rate limiting
    const rateLimit = checkRateLimit(session.user.id, 'API_GLOBAL');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Check if job exists and user has access
    const existingJob = await db.job.findUnique({
      where: { id },
      select: {
        createdById: true,
      },
    });

    if (!existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 🔒 Security: Only reporter or admin can delete
    const canDelete =
      session.user.role === 'ADMIN' ||
      existingJob.createdById === session.user.id;

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.job.delete({
      where: { id },
    });

    // Invalidate caches
    invalidateDashboardCache();
    invalidateEntityCache('job', id);

    return NextResponse.json({ success: true });

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw error;
  }
});
