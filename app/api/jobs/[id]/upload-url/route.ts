import { NextResponse, type NextRequest } from 'next/server';
import { withRouteProtection, type ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { createAdminClient } from '@/lib/supabase/admin';
import { getJobById, isUserAssignedToJob } from '@/lib/supabase/queries/jobs';
import { isAdminRole } from '@/lib/admin';
import { UserRole } from '@/lib/enums/roles';
import { logger } from '@/lib/logger';

const AUDIO_BUCKET = 'depo-audio';
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/x-m4a', 'audio/m4a',
  'audio/mp4', 'audio/ogg', 'audio/webm', 'video/mp4', 'video/quicktime',
  'video/x-msvideo', 'video/webm',
]);

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

    const body = await request.json() as { fileName?: string; mimeType?: string; fileSize?: number };
    const { fileName, mimeType, fileSize } = body;

    if (!fileName || !mimeType || !fileSize) {
      return NextResponse.json({ error: 'fileName, mimeType, and fileSize are required' }, { status: 400 });
    }
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json({ error: 'File type not allowed: ' + mimeType }, { status: 400 });
    }
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds 2GB limit' }, { status: 400 });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-s]/g, '_').replace(/s+/g, '_').slice(0, 200);
    const storagePath = jobId + '/' + Date.now() + '-' + safeName;

    const adminClient = createAdminClient();
    const { data, error } = await adminClient.storage
      .from(AUDIO_BUCKET)
      .createSignedUploadUrl(storagePath);

    if (error || !data?.signedUrl || !data?.token) {
      logger.error('[upload-url] signed URL creation failed', new Error(error?.message ?? 'no data'), { jobId });
      return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
    }

    logger.info('[upload-url] signed URL issued', { jobId, storagePath, mimeType });
    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      storagePath,
    });
  } catch (err) {
    logger.error('[upload-url] unexpected error', err instanceof Error ? err : new Error(String(err)), { jobId: params.id });
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
