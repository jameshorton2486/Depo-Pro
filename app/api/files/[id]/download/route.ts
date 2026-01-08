// ═══════════════════════════════════════════════════════════════
// FILE DOWNLOAD API ENDPOINT
// ═══════════════════════════════════════════════════════════════

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getFileWithJob } from '@/lib/supabase/queries/files';
import { downloadFile } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: fileId } = await params;

    // 🔍 Fetch file with access check
    const supabase = await createSupabaseServerClient();
    const file = await getFileWithJob(supabase, fileId);

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // 🔒 Security: Verify access rights
    const hasAccess =
      session.role === 'ADMIN' ||
      file.job.createdById === session.id ||
      file.job.assignments.some((a: any) => a.scopistId === session.id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 📥 Download file from storage
    const buffer = await downloadFile(file.storage_path || file.file_name);
    const contentType = file.mime_type || 'application/octet-stream';

    // 📤 Return file with proper headers
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${file.file_name}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('File download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 },
    );
  }
}
