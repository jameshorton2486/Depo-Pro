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

// Content types accepted when fetching from a URL
const ACCEPTED_URL_CONTENT_TYPES = new Set([
  ...ACCEPTED_TYPES,
  'application/octet-stream', // some servers serve PDFs/docs as octet-stream
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const URL_FETCH_TIMEOUT_MS = 30_000;

const ROLES = ['ADMIN', 'REPORTER', 'COURT_REPORTER', 'ATTORNEY', 'PARALEGAL', 'LAW_FIRM', 'AGENCY'] as const;

/**
 * SSRF protection — block requests to private/internal networks.
 * Only allows HTTPS URLs to public hosts.
 */
function isAllowedUrl(url: string): { allowed: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { allowed: false, reason: 'Invalid URL' };
  }

  // Must be HTTPS (except Google Docs which redirects correctly)
  if (parsed.protocol !== 'https:') {
    return { allowed: false, reason: 'Only HTTPS URLs are allowed' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block private/internal IPs and hostnames
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('172.') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === '[::1]'
  ) {
    return { allowed: false, reason: 'Internal/private URLs are not allowed' };
  }

  return { allowed: true };
}

/**
 * Infer mime type from URL path when server returns ambiguous content-type.
 */
function inferMimeTypeFromUrl(url: string, serverContentType: string): string {
  if (ACCEPTED_TYPES.includes(serverContentType)) {
    return serverContentType;
  }

  const pathname = new URL(url).pathname.toLowerCase();
  if (pathname.endsWith('.pdf')) return 'application/pdf';
  if (pathname.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (pathname.endsWith('.doc')) return 'application/msword';
  if (pathname.endsWith('.txt')) return 'text/plain';
  if (pathname.endsWith('.rtf')) return 'application/rtf';

  // If server says octet-stream and we can't infer, default to PDF (most common)
  if (serverContentType === 'application/octet-stream') return 'application/pdf';

  return serverContentType;
}

const handler = async (request: NextRequest, _context: ProtectedContext) => {
  try {
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      const sourceUrl = typeof body?.source_url === 'string' ? body.source_url.trim() : '';

      if (!sourceUrl) {
        return NextResponse.json({ error: 'No source_url provided' }, { status: 400 });
      }

      // SSRF protection
      const urlCheck = isAllowedUrl(sourceUrl);
      if (!urlCheck.allowed) {
        return NextResponse.json({ error: urlCheck.reason }, { status: 400 });
      }

      // Google Docs: use the existing export-as-text flow
      if (sourceUrl.includes('docs.google.com/document')) {
        const result = await parseDocument({
          buffer: Buffer.alloc(0),
          mimeType: 'text/plain',
          fileName: 'google-doc.txt',
          sourceUrl,
        });
        return NextResponse.json(result, { status: result.success ? 200 : 422 });
      }

      // Universal URL: fetch the document with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch(sourceUrl, {
          signal: controller.signal,
          redirect: 'follow',
          headers: { 'User-Agent': 'Depo-Pro/1.0 (document-intake)' },
        });
      } catch (fetchError) {
        clearTimeout(timeout);
        const msg = fetchError instanceof Error ? fetchError.message : 'Fetch failed';
        if (msg.includes('abort')) {
          return NextResponse.json({ error: 'URL fetch timed out (30s limit)' }, { status: 408 });
        }
        return NextResponse.json({ error: `Failed to fetch URL: ${msg}` }, { status: 502 });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        return NextResponse.json(
          { error: `URL returned HTTP ${response.status}` },
          { status: 422 },
        );
      }

      // Content-type validation
      const remoteContentType = (response.headers.get('content-type') ?? '').split(';')[0].trim();
      if (!ACCEPTED_URL_CONTENT_TYPES.has(remoteContentType)) {
        return NextResponse.json(
          { error: `Unsupported document type from URL: ${remoteContentType}. Supported: PDF, DOCX, DOC, TXT, RTF` },
          { status: 415 },
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: 'Remote document exceeds 10MB limit' }, { status: 413 });
      }

      const mimeType = inferMimeTypeFromUrl(sourceUrl, remoteContentType);
      const fileName = new URL(sourceUrl).pathname.split('/').pop() || 'remote-document';

      const result = await parseDocument({
        buffer: Buffer.from(arrayBuffer),
        mimeType,
        fileName,
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
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[parse-document] UNHANDLED ERROR:', err.message);
    console.error('[parse-document] Stack:', err.stack);
    return NextResponse.json(
      { error: 'Internal server error', detail: err.message },
      { status: 500 },
    );
  }
};

export const POST = withRouteProtection(
  {
    requireAuth: true,
    requireRole: ROLES as unknown as any,
    requireFirm: true,
  },
  handler,
);
