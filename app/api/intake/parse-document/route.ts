import { NextResponse, type NextRequest } from 'next/server';
import { withRouteProtection, type ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { parseDocument } from '@/lib/ingestion';

const ACCEPTED_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/pdf',
  'text/plain',
  'application/rtf',
  'text/rtf',
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const ROLES = ['ADMIN', 'REPORTER', 'COURT_REPORTER', 'ATTORNEY', 'PARALEGAL', 'LAW_FIRM', 'AGENCY'] as const;

const handler = async (request: NextRequest, _context: ProtectedContext) => {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const body = await request.json();
    const sourceUrl = typeof body?.source_url === 'string' ? body.source_url : '';
    if (!sourceUrl.includes('docs.google.com')) {
      return NextResponse.json({ error: 'Invalid Google Docs source_url' }, { status: 400 });
    }
    const result = await parseDocument({
      buffer: Buffer.alloc(0),
      mimeType: 'text/plain',
      fileName: 'google-doc.txt',
      sourceUrl,
    });
    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 413 });
  }
  if (!ACCEPTED_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith('.rtf')) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 415 });
  }

  const result = await parseDocument({
    buffer: Buffer.from(await file.arrayBuffer()),
    mimeType: file.type,
    fileName: file.name,
  });

  return NextResponse.json(result, { status: result.success ? 200 : 422 });
};

export const POST = withRouteProtection(
  {
    requireAuth: true,
    requireRole: ROLES as unknown as any,
    requireFirm: true,
  },
  handler,
);
