import { NextResponse, type NextRequest } from 'next/server';
import { withRouteProtection, type ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { UserRole } from '@/lib/enums/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { getJobById, isUserAssignedToJob } from '@/lib/supabase/queries/jobs';
import { isAdminRole } from '@/lib/admin';
import { logger } from '@/lib/logger';

const AUDIO_BUCKET = 'depo-audio';

const handler = async (request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  const jobId = params.id;

  const body = await request.json();
  const { storagePath, filename, contentType, fileSize } = body as {
    storagePath?: string;
    filename?: string;
    contentType?: string;
    fileSize?: number;
  };

  if (!storagePath || !filename || !contentType) {
    return NextResponse.json({ error: 'storagePath, filename, and contentType are required' }, { status: 400 });
  }

  // Path traversal prevention: storagePath must start with this jobId
  if (!storagePath.startsWith(jobId + '/')) {
    return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 });
  }

  // Verify job exists and belongs to this user's firm
  const job = await getJobById(supabase, jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }
  if (user.firm_id && (job as any).firm_id && user.firm_id !== (job as any).firm_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isAssigned = await isUserAssignedToJob(jobId, user.id);
  const hasAccess = isAdminRole(user.role) || (job as any).created_by_id === user.id || isAssigned;
  if (!hasAccess) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Verify the file actually exists in storage
  const admin = createAdminClient();
  const { data: files, error: listError } = await admin.storage
    .from(AUDIO_BUCKET)
    .list(jobId, { search: storagePath.replace(jobId + '/', '') });

  const fileInStorage = files?.some(f => `${jobId}/${f.name}` === storagePath);

  if (listError || !fileInStorage) {
    logger.warn('[upload-complete] File not found in storage', { storagePath, jobId });
    return NextResponse.json({ error: 'File not found in storage' }, { status: 400 });
  }

  // Update jobs.audio_file_url so the transcription pipeline can find it
  const { error: updateError } = await supabase
    .from('jobs')
    .update({
      audio_file_url: storagePath,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (updateError) {
    logger.error('[upload-complete] Failed to update job', updateError);
    return NextResponse.json({ error: 'Failed to register upload' }, { status: 500 });
  }

  logger.info('[upload-complete] Audio registered', {
    jobId,
    storagePath,
    filename,
    contentType,
    fileSize,
  });

  return NextResponse.json({ success: true, storagePath });
};

const UPLOAD_ROLES = [
  UserRole.ADMIN,
  UserRole.COURT_REPORTER,
  UserRole.REPORTER,
  UserRole.SCOPIST,
  UserRole.ATTORNEY,
  UserRole.AGENCY_OWNER,
  UserRole.AGENCY_MANAGER,
];

export const POST = withRouteProtection(
  { requireAuth: true, requireRole: UPLOAD_ROLES, requireFirm: true },
  handler,
);
