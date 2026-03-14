// app/api/jobs/[id]/chronology/[entryId]/route.ts
// PATCH: Update a chronology entry
// DELETE: Delete a chronology entry

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withRouteProtection, type ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { UserRole } from '@/lib/enums/roles';
import {
  getChronologyEntryById,
  updateChronologyEntry,
  deleteChronologyEntry,
  verifyChronologyEntry,
} from '@/lib/supabase/queries/medical';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { logger } from '@/lib/logger';
import { isAdminRole } from '@/lib/admin';

const patchHandler = async (request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  try {
    const jobId = params.id;
    const entryId = params.entryId;

    // Verify job exists and belongs to user's firm
    const job = await getJobById(supabase, jobId);
    if (!job || (user.firm_id && (job as any).firm_id && (job as any).firm_id !== user.firm_id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const existing = await getChronologyEntryById(supabase, entryId);
    if (!existing || existing.job_id !== jobId) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const body = await request.json();

    // Handle verify action
    if (body.action === 'verify') {
      const updated = await verifyChronologyEntry(supabase, entryId, user.id);
      return NextResponse.json({ data: updated });
    }

    // Handle unverify
    if (body.action === 'unverify') {
      const updated = await updateChronologyEntry(supabase, entryId, {
        is_verified: false,
        verified_by_id: null,
        verified_at: null,
      });
      return NextResponse.json({ data: updated });
    }

    // Standard field update
    const allowedFields = [
      'event_date', 'event_date_end', 'date_precision', 'provider',
      'category', 'summary', 'details', 'page_reference', 'confidence',
    ];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // If editing an AI-extracted entry, mark it as EDITED
    if (existing.source_type === 'AI_EXTRACTED' && Object.keys(updateData).length > 0) {
      updateData.source_type = 'EDITED';
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 },
      );
    }

    const updated = await updateChronologyEntry(supabase, entryId, updateData);

    return NextResponse.json({ data: updated });
  } catch (err) {
    logger.error('[api/chronology/[entryId]] PATCH error', err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json(
      { error: 'Failed to update chronology entry' },
      { status: 500 },
    );
  }
};

const deleteHandler = async (_request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  try {
    const jobId = params.id;
    const entryId = params.entryId;

    // Verify job exists and belongs to user's firm
    const job = await getJobById(supabase, jobId);
    if (!job || (user.firm_id && (job as any).firm_id && (job as any).firm_id !== user.firm_id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const existing = await getChronologyEntryById(supabase, entryId);
    if (!existing || existing.job_id !== jobId) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Only creator or admin can delete
    if (existing.created_by_id !== user.id && !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteChronologyEntry(supabase, entryId);

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('[api/chronology/[entryId]] DELETE error', err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json(
      { error: 'Failed to delete chronology entry' },
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

export const PATCH = withRouteProtection(
  { requireAuth: true, requireRole: JOB_ROLES, requireFirm: true },
  patchHandler,
);

export const DELETE = withRouteProtection(
  { requireAuth: true, requireRole: JOB_ROLES, requireFirm: true },
  deleteHandler,
);
