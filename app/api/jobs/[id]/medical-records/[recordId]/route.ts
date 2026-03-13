// app/api/jobs/[id]/medical-records/[recordId]/route.ts
// GET: Get a single medical record
// DELETE: Delete a medical record and its entries

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getMedicalRecordById,
  deleteMedicalRecord,
} from '@/lib/supabase/queries/medical';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { logger } from '@/lib/logger';
import { isAdminRole } from '@/lib/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId, recordId } = await params;
    const supabase = await createSupabaseServerClient();

    // Verify job exists and belongs to user's firm
    const job = await getJobById(supabase, jobId);
    if (!job || (currentUser.firmId && (job as any).firm_id && (job as any).firm_id !== currentUser.firmId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const record = await getMedicalRecordById(supabase, recordId);
    if (!record || record.job_id !== jobId) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({ data: record });
  } catch (error) {
    logger.error('[api/medical-records/[recordId]] GET error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to get medical record' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId, recordId } = await params;
    const supabase = await createSupabaseServerClient();

    // Verify job exists and belongs to user's firm
    const job = await getJobById(supabase, jobId);
    if (!job || (currentUser.firmId && (job as any).firm_id && (job as any).firm_id !== currentUser.firmId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const record = await getMedicalRecordById(supabase, recordId);
    if (!record || record.job_id !== jobId) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // Only uploader or admin can delete
    if (record.uploaded_by_id !== currentUser.id && !isAdminRole(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete file from storage
    try {
      await supabase.storage
        .from('depo-files')
        .remove([record.file_url]);
    } catch (storageErr) {
      logger.warn('[api/medical-records] Storage deletion failed', { storageErr });
    }

    // Delete DB record (cascades to chronology entries)
    await deleteMedicalRecord(supabase, recordId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[api/medical-records/[recordId]] DELETE error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to delete medical record' },
      { status: 500 },
    );
  }
}
