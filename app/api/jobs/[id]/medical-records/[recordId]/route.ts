// app/api/jobs/[id]/medical-records/[recordId]/route.ts
// GET: Get a single medical record
// DELETE: Delete a medical record and its entries

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withRouteProtection, type ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { UserRole } from '@/lib/enums/roles';
import {
  getMedicalRecordById,
  deleteMedicalRecord,
} from '@/lib/supabase/queries/medical';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { logger } from '@/lib/logger';
import { isAdminRole } from '@/lib/admin';

const getHandler = async (_request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  try {
    const jobId = params.id;
    const recordId = params.recordId;

    // Verify job exists and belongs to user's firm
    const job = await getJobById(supabase, jobId);
    if (!job || (user.firm_id && (job as any).firm_id && (job as any).firm_id !== user.firm_id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const record = await getMedicalRecordById(supabase, recordId);
    if (!record || record.job_id !== jobId) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({ data: record });
  } catch (err) {
    logger.error('[api/medical-records/[recordId]] GET error', err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json(
      { error: 'Failed to get medical record' },
      { status: 500 },
    );
  }
};

const deleteHandler = async (_request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  try {
    const jobId = params.id;
    const recordId = params.recordId;

    // Verify job exists and belongs to user's firm
    const job = await getJobById(supabase, jobId);
    if (!job || (user.firm_id && (job as any).firm_id && (job as any).firm_id !== user.firm_id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const record = await getMedicalRecordById(supabase, recordId);
    if (!record || record.job_id !== jobId) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // Only uploader or admin can delete
    if (record.uploaded_by_id !== user.id && !isAdminRole(user.role)) {
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
  } catch (err) {
    logger.error('[api/medical-records/[recordId]] DELETE error', err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json(
      { error: 'Failed to delete medical record' },
      { status: 500 },
    );
  }
};

const JOB_ROLES = [
  UserRole.ADMIN,
  UserRole.COURT_REPORTER,
  UserRole.REPORTER,
  UserRole.SCOPIST,
  UserRole.ATTORNEY,
  UserRole.AGENCY_OWNER,
  UserRole.AGENCY_MANAGER,
];

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: JOB_ROLES, requireFirm: true },
  getHandler,
);

export const DELETE = withRouteProtection(
  { requireAuth: true, requireRole: JOB_ROLES, requireFirm: true },
  deleteHandler,
);
