// app/api/download/[token]/route.ts
// One-time secure download endpoint for attorney transcript delivery.
// No authentication required — access is controlled by the token itself.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { validateDownloadToken, markTokenUsed } from '@/lib/security/download-tokens';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!token) {
    return new NextResponse('Invalid download link.', { status: 400 });
  }

  // Validate the token
  const tokenData = await validateDownloadToken(token);

  if (!tokenData) {
    return new NextResponse(
      'This download link is invalid, has expired, or has already been used. ' +
      'Please contact your court reporter for a new link.',
      { status: 410 }
    );
  }

  try {
    const adminClient = createAdminClient();

    // Fetch the transcript metadata
    const { data: transcription } = await adminClient
      .from('transcriptions')
      .select('metadata')
      .eq('id', tokenData.transcriptId)
      .single();

    // Get DOCX storage path from job files
    const { data: files } = await adminClient
      .from('job_files')
      .select('storage_path, file_name, mime_type')
      .eq('job_id', tokenData.jobId)
      .eq('file_type', 'FINAL_TRANSCRIPT')
      .order('created_at', { ascending: false })
      .limit(1);

    let storagePath: string | null = files?.[0]?.storage_path ?? null;

    if (!storagePath) {
      // Check metadata for DOCX URL stored by export route
      const meta = transcription?.metadata as Record<string, any> | null;
      storagePath = meta?.docx_storage_path ?? null;
    }

    if (!storagePath) {
      return new NextResponse(
        'The certified transcript is not yet available for download. ' +
        'Please contact your court reporter.',
        { status: 404 }
      );
    }

    // Generate a fresh signed URL (1 hour)
    const { data: signedData, error: signError } = await adminClient.storage
      .from('depo-files')
      .createSignedUrl(storagePath, 3600);

    if (signError || !signedData?.signedUrl) {
      console.error('[download] Failed to generate signed URL:', signError?.message);
      return new NextResponse('Download temporarily unavailable.', { status: 500 });
    }

    // Mark token as used BEFORE redirecting
    await markTokenUsed(tokenData.jobId, token);

    console.warn(`[download] Token used — job ${tokenData.jobId}, recipient ${tokenData.recipientEmail}`);

    // Redirect to the signed storage URL
    return NextResponse.redirect(signedData.signedUrl);

  } catch (err: any) {
    console.error('[download] Unexpected error:', err.message);
    return new NextResponse('Download failed. Please try again or contact your court reporter.', { status: 500 });
  }
}
