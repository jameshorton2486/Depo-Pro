import { NextResponse, type NextRequest } from 'next/server';
import { withRouteProtection, type ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { UserRole } from '@/lib/enums/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { getJobById, isUserAssignedToJob } from '@/lib/supabase/queries/jobs';
import { isAdminRole } from '@/lib/admin';

const AUDIO_BUCKET = 'depo-audio';

const ALLOWED_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/x-m4a',
  'audio/m4a',
  'audio/mp4',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
]);

/** Sanitize filename: keep alphanumeric, dashes, underscores, dots. */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g, '.');
}

const handler = async (request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  const jobId = params.id;

  const body = await request.json();
  const { filename, contentType } = body as { filename?: string; contentType?: string };

  if (!filename || !contentType) {
    return NextResponse.json({ error: 'filename and contentType are required' }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    return NextResponse.json({ error: `File type ${contentType} not allowed` }, { status: 400 });
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

  const safeName = sanitizeFilename(filename);
  const storagePath = `${jobId}/${Date.now()}-${safeName}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(AUDIO_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    console.error('[upload-url] Failed to create signed URL:', error);
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    storagePath,
  });
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
