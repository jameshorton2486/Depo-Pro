import { NextResponse, type NextRequest } from 'next/server';
import { withRouteProtection, type ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { ingestDocument } from '@/lib/ingestion';
import { UserRole } from '@/lib/enums/roles';

const ACCEPTED_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/pdf',
  'text/plain',
  'application/rtf',
  'text/rtf',
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const handler = async (request: NextRequest, { user }: ProtectedContext) => {
  const formData = await request.formData();
  const file = formData.get('file');
  const jobId = formData.get('job_id');
  const sourceUrl = formData.get('source_url');

  if (typeof sourceUrl === 'string' && sourceUrl.trim()) {
    const result = await ingestDocument({
      buffer: Buffer.alloc(0),
      mimeType: 'text/plain',
      originalFileName: 'document-from-url',
      firmId: user.firm_id,
      uploadedBy: user.id,
      jobId: typeof jobId === 'string' ? jobId : undefined,
      sourceUrl: sourceUrl.trim(),
    });
    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 413 });
  }
  if (!ACCEPTED_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith('.rtf')) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 415 });
  }

  const result = await ingestDocument({
    buffer: Buffer.from(await file.arrayBuffer()),
    mimeType: file.type,
    originalFileName: file.name,
    firmId: user.firm_id,
    uploadedBy: user.id,
    jobId: typeof jobId === 'string' ? jobId : undefined,
  });

  return NextResponse.json(result, { status: result.success ? 200 : 422 });
};

export const POST = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.COURT_REPORTER],
    requireFirm: true,
    auditAction: 'DOCUMENT_UPLOADED',
  },
  handler,
);
