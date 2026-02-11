// app/api/jobs/[id]/medical-records/[recordId]/route.ts
// GET: Get a single medical record
// DELETE: Delete a medical record and its entries

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getMedicalRecordById,
  deleteMedicalRecord,
} from '@/lib/supabase/queries/medical';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recordId } = await params;
    const supabase = await createSupabaseServerClient();

    const record = await getMedicalRecordById(supabase, recordId);
    if (!record) {
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
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recordId } = await params;
    const user = session.user as { id: string; role: string };
    const supabase = await createSupabaseServerClient();

    const record = await getMedicalRecordById(supabase, recordId);
    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // Only uploader or admin can delete
    if (record.uploaded_by_id !== user.id && user.role !== 'ADMIN') {
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
