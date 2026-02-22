// app/api/jobs/[id]/medical-records/[recordId]/extract/route.ts
// POST: Trigger Claude AI extraction on a medical record

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getMedicalRecordById,
} from '@/lib/supabase/queries/medical';
import { processMedicalRecord } from '@/lib/services/medical-extraction';
import { logger } from '@/lib/logger';

export const maxDuration = 120; // Allow up to 2 minutes for Claude processing

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId, recordId } = await params;    const supabase = await createSupabaseServerClient();

    // Only reporters and admins can trigger extraction
    if (!['ADMIN', 'REPORTER', 'COURT_REPORTER'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify record exists and belongs to this job
    const record = await getMedicalRecordById(supabase, recordId);
    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    if (record.job_id !== jobId) {
      return NextResponse.json({ error: 'Record does not belong to this job' }, { status: 400 });
    }

    // Prevent re-extraction while processing
    if (record.status === 'PROCESSING') {
      return NextResponse.json(
        { error: 'Extraction already in progress' },
        { status: 409 },
      );
    }

    // Check for reprocess flag
    const body = await request.json().catch(() => ({}));
    const reprocess = body.reprocess === true || record.status === 'EXTRACTED';

    // Run extraction pipeline
    const { entriesCreated, result } = await processMedicalRecord(
      supabase,
      recordId,
      jobId,
      currentUser.id,
      { reprocess },
    );

    logger.info('[api/extract] Extraction complete', {
      recordId,
      jobId,
      entriesCreated,
      documentType: result.document_type,
    });

    return NextResponse.json({
      data: {
        recordId,
        status: 'EXTRACTED',
        document_type: result.document_type,
        provider_name: result.provider_name,
        facility_name: result.facility_name,
        summary: result.summary,
        entries_created: entriesCreated,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Extraction failed';
    logger.error('[api/extract] POST error', error instanceof Error ? error : new Error(message));
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
