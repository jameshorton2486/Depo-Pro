// =============================================================================
// HIGH-ACCURACY TRANSCRIPTION TOOL API
// app/api/transcription-tool/start/route.ts
//
// Accepts audio/video file upload, uploads to Supabase Storage,
// creates or attaches to a job, and triggers the pipeline with
// audio normalization (16kHz mono WAV) for maximum accuracy.
// =============================================================================

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processTranscriptionJob } from '@/lib/transcription/pipeline';
import { checkCombinedRateLimit, rateLimitResponse } from '@/lib/rate-limit-service';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for Vercel Pro

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
  'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/flac',
  'audio/ogg', 'audio/webm',
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4', 'video/quicktime', 'video/x-matroska',
  'video/avi', 'video/x-msvideo', 'video/webm',
];

const ALLOWED_TYPES = [...ALLOWED_AUDIO_TYPES, ...ALLOWED_VIDEO_TYPES];

export async function POST(request: NextRequest) {
  try {
    // --- AUTH ---
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = currentUser as {
      id: string;
      role: string;
      firmId?: string;
      email?: string;
    };

    // Role check: REPORTER, SCOPIST, ADMIN only
    const allowedRoles = ['REPORTER', 'SCOPIST', 'ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Your role does not have access to this tool' },
        { status: 403 },
      );
    }

    // Rate limit
    if (user.firmId) {
      const rateLimit = checkCombinedRateLimit(
        user.id,
        user.firmId,
        'TRANSCRIPTION',
        'TRANSCRIPTION',
      );
      if (!rateLimit.allowed) {
        return rateLimitResponse(rateLimit.userResult);
      }
    }

    // --- PARSE FORM DATA ---
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const jobId = formData.get('jobId') as string | null;
    const caseName = formData.get('caseName') as string | null;
    const title = formData.get('title') as string | null;
    const createNewJob = formData.get('createNewJob') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // --- VALIDATE FILE ---
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 2GB.` },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    // Check MIME type (also allow by extension as fallback)
    const mimeOk = ALLOWED_TYPES.includes(file.type);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const extOk = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'webm', 'mp4', 'mov', 'mkv', 'avi'].includes(ext);

    if (!mimeOk && !extOk) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${file.type || ext}. Supported: MP3, WAV, M4A, AAC, FLAC, MP4, MOV, MKV, AVI`,
        },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const adminClient = createAdminClient();

    // --- RESOLVE OR CREATE JOB ---
    let targetJobId: string;

    if (jobId && !createNewJob) {
      // Attach to existing job — verify access
      const { data: existingJob, error: jobError } = await supabase
        .from('jobs')
        .select('id, created_by_id, firm_id, status')
        .eq('id', jobId)
        .single();

      if (jobError || !existingJob) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      // Scopists can only attach to jobs assigned to them
      if (user.role === 'SCOPIST') {
        const { data: assignment } = await supabase
          .from('job_assignments')
          .select('id')
          .eq('job_id', jobId)
          .eq('scopist_id', user.id)
          .single();

        if (!assignment) {
          return NextResponse.json(
            { error: 'You can only attach to jobs assigned to you' },
            { status: 403 },
          );
        }
      }

      // Reporters/Admins can attach to their own firm's jobs
      if (user.role === 'REPORTER') {
        const isOwner = existingJob.created_by_id === user.id;
        const isSameFirm = existingJob.firm_id && existingJob.firm_id === user.firmId;
        if (!isOwner && !isSameFirm) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }

      targetJobId = existingJob.id;
    } else {
      // Create a new job
      if (user.role === 'SCOPIST') {
        return NextResponse.json(
          { error: 'Scopists cannot create new jobs. Select an existing job.' },
          { status: 403 },
        );
      }

      const { data: newJob, error: createError } = await adminClient
        .from('jobs')
        .insert({
          title: title || `Transcription - ${file.name}`,
          case_name: caseName || 'Untitled Case',
          status: 'CREATED',
          created_by_id: user.id,
          firm_id: user.firmId || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createError || !newJob) {
        logger.error('Failed to create job', createError as any);
        return NextResponse.json(
          { error: 'Failed to create job' },
          { status: 500 },
        );
      }

      targetJobId = newJob.id;
    }

    // --- UPLOAD TO SUPABASE STORAGE ---
    const storagePath = `${user.firmId || 'no-firm'}/${targetJobId}/${Date.now()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await adminClient.storage
      .from('depo-audio')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      logger.error('Storage upload failed', uploadError as any);
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 },
      );
    }

    // Create file record
    await adminClient.from('files').insert({
      job_id: targetJobId,
      name: file.name,
      type: file.type.startsWith('video/') ? 'VIDEO' : 'AUDIO',
      mime_type: file.type,
      size: file.size,
      storage_path: storagePath,
      uploaded_by_id: user.id,
      created_at: new Date().toISOString(),
    });

    // Update job status
    await adminClient
      .from('jobs')
      .update({
        status: 'FILES_UPLOADED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetJobId);

    logger.info('High-accuracy transcription started', {
      jobId: targetJobId,
      userId: user.id,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    // --- TRIGGER PIPELINE (async, don't await in response) ---
    // The pipeline includes normalization to 16kHz mono WAV
    processTranscriptionJob(targetJobId, storagePath).catch((err) => {
      logger.error('Pipeline failed', err instanceof Error ? err : new Error(String(err)));
    });

    return NextResponse.json({
      success: true,
      jobId: targetJobId,
      message: 'File uploaded. High-accuracy transcription with audio normalization started.',
      storagePath,
    });
  } catch (error) {
    logger.error(
      'Transcription tool error',
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}


