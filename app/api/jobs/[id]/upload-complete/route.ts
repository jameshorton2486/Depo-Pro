import { NextResponse, type NextRequest } from 'next/server';
import { withRouteProtection, type ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { getJobById, isUserAssignedToJob } from '@/lib/supabase/queries/jobs';
import { createFile } from '@/lib/supabase/queries/files';
import { isAdminRole } from '@/lib/admin';
import { UserRole } from '@/lib/enums/roles';
import { logger } from '@/lib/logger';

const handler = async (request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  try {
    const jobId = params.id;
    if (!jobId) return NextResponse.json({ error: 'Job ID required' }, { status: 400 });

    const job = await getJobById(supabase, jobId);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const jobFirmId = (job as any).firm_id;
    if (user.firm_id && jobFirmId && user.firm_id !== jobFirmId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isAssigned = await isUserAssignedToJob(jobId, user.id);
    const hasAccess = isAdminRole(user.role) || (job as any).created_by_id === user.id || isAssigned;
    if (!hasAccess) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const body = await request.json() as {
      storagePath?: string; fileName?: string; mimeType?: string; fileSize?: number;
    };
    const { storagePath, fileName, mimeType, fileSize } = body;

    if (!storagePath || !fileName || !mimeType || !fileSize) {
      return NextResponse.json({ error: 'storagePath, fileName, mimeType, and fileSize are required' }, { status: 400 });
    }

    if (!storagePath.startsWith(jobId + '/')) {
      logger.warn('[upload-complete] path/job mismatch', { storagePath, jobId });
      return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 });
    }

    const isAudioOrVideo = mimeType.startsWith('audio/') || mimeType.startsWith('video/');

    let fileId: string | null = null;
    try {
      const f = await createFile(supabase, {
        job_id: jobId,
        file_name: fileName,
        mime_type: mimeType,
        file_size: fileSize,
        type: isAudioOrVideo ? 'AUDIO' : 'EXHIBIT',
        storage_path: storagePath,
        storage_url: storagePath,
        uploaded_by_id: user.id,
      });
      fileId = f?.id ?? null;
    } catch (fileErr) {
      logger.error('[upload-complete] createFile non-fatal', fileErr instanceof Error ? fileErr : new Error(String(fileErr)), { jobId });
    }

    if (isAudioOrVideo) {
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ audio_file_url: storagePath, updated_at: new Date().toISOString() })
        .eq('id', jobId);

      if (updateError) {
        logger.error('[upload-complete] failed to update audio_file_url', new Error(updateError.message), { jobId });
        return NextResponse.json({ error: 'File uploaded but failed to link to job' }, { status: 500 });
      }
    }

    logger.info('[upload-complete] audio registered', { jobId, storagePath });
    return NextResponse.json({ success: true, fileId });
  } catch (err) {
    logger.error('[upload-complete] unexpected error', err instanceof Error ? err : new Error(String(err)), { jobId: params.id });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

const JOB_ROLES = [
  UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.REPORTER,
  UserRole.SCOPIST, UserRole.ATTORNEY, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER,
];

export const POST = withRouteProtection(
  { requireAuth: true, requireRole: JOB_ROLES, requireFirm: true },
  handler,
);
