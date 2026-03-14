// ═══════════════════════════════════════════════════════════════
// PROPER NOUNS API ROUTE
// app/api/jobs/[id]/proper-nouns/route.ts
//
// Manages CSRProperNoun entries for a job's CSRRecord
// Used by the Live Notes Capture feature during depositions
// ═══════════════════════════════════════════════════════════════

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withRouteProtection, type ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { UserRole } from '@/lib/enums/roles';
import { getProperNounsByJob, createProperNoun, getOrCreateCsrRecordId, bulkDeleteProperNouns } from '@/lib/supabase/queries/proper-nouns';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { logger } from '@/lib/logger';
import { properNounSchema } from '@/lib/api/schemas';
import { isAdminRole } from '@/lib/admin';

// ═══════════════════════════════════════════════════════════════
// GET - List all proper nouns for a job
// ═══════════════════════════════════════════════════════════════

const getHandler = async (_request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  try {
    const jobId = params.id;

    // Find the job and verify access using query module
    const job = await getJobById(supabase, jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check access: admin, job owner, or same firm
    const hasAccess =
      isAdminRole(user.role) ||
      (job as any).created_by_id === user.id ||
      ((job as any).firm_id && (job as any).firm_id === user.firm_id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get proper nouns using query module (handles CSR record creation if needed)
    const properNouns = await getProperNounsByJob(supabase, jobId);

    // Get CSR record ID for response via query layer
    const csrRecordId = await getOrCreateCsrRecordId(jobId);

    return NextResponse.json({
      properNouns: properNouns.map((noun: any) => ({
        ...noun,
        csrRecordId: noun.csr_record_id,
        phoneticHint: noun.phonetic_hint,
        useInTranscription: noun.use_in_transcription,
        createdAt: noun.created_at,
      })),
      csrRecordId,
      count: properNouns.length,
    });

  } catch (err) {
    logger.error('Error fetching proper nouns', err instanceof Error ? err : new Error(String(err)), { jobId: params.id });
    return NextResponse.json(
      { error: 'Failed to fetch proper nouns' },
      { status: 500 },
    );
  }
};

// ═══════════════════════════════════════════════════════════════
// POST - Create a new proper noun
// ═══════════════════════════════════════════════════════════════

const postHandler = async (request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  try {
    const jobId = params.id;
    const body = await request.json();
    const parsed = properNounSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    const { value, category, phoneticHint, source, useInTranscription, priority } = parsed.data;

    // Find the job and verify access using query module
    const job = await getJobById(supabase, jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check access
    const hasAccess =
      isAdminRole(user.role) ||
      (job as any).created_by_id === user.id ||
      ((job as any).firm_id && (job as any).firm_id === user.firm_id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create proper noun using query module (handles CSR record creation and duplicate check)
    try {
      const properNoun = await createProperNoun(supabase, jobId, {
        value: value.trim(),
        category: category as string,
        phonetic_hint: phoneticHint?.trim() || null,
        source: source || 'manual_entry',
        use_in_transcription: useInTranscription,
        priority,
      });

      return NextResponse.json({
        success: true,
        properNoun: {
          ...properNoun,
          csrRecordId: (properNoun as any).csr_record_id,
          phoneticHint: (properNoun as any).phonetic_hint,
          useInTranscription: (properNoun as any).use_in_transcription,
          createdAt: (properNoun as any).created_at,
        },
      }, { status: 201 });
    } catch (err) {
      if (err instanceof Error && err.message === 'This term already exists for this job') {
        return NextResponse.json(
          { error: 'This term already exists for this job' },
          { status: 409 },
        );
      }
      logger.error('Error creating proper noun', err instanceof Error ? err : new Error(String(err)), { jobId });
      return NextResponse.json(
        { error: 'Failed to create proper noun' },
        { status: 500 },
      );
    }
  } catch (err) {
    logger.error('Error creating proper noun', err instanceof Error ? err : new Error(String(err)), { jobId: params.id });
    return NextResponse.json(
      { error: 'Failed to create proper noun' },
      { status: 500 },
    );
  }
};

// ═══════════════════════════════════════════════════════════════
// DELETE - Bulk delete proper nouns
// ═══════════════════════════════════════════════════════════════

const deleteHandler = async (request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  try {
    const jobId = params.id;
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids')?.split(',').filter(Boolean);

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { error: 'No IDs provided for deletion' },
        { status: 400 },
      );
    }

    // Find the job and verify access using query module
    const job = await getJobById(supabase, jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check access
    const hasAccess =
      isAdminRole(user.role) ||
      (job as any).created_by_id === user.id ||
      ((job as any).firm_id && (job as any).firm_id === user.firm_id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Bulk delete proper nouns via query layer
    const deleteResult = await bulkDeleteProperNouns(jobId, ids);

    if (!deleteResult.success) {
      logger.error('Bulk delete error', new Error(deleteResult.error || 'Unknown error'), { jobId, ids });
      return NextResponse.json(
        { error: deleteResult.error || 'Failed to delete proper nouns' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: deleteResult.deletedCount || 0,
    });

  } catch (err) {
    logger.error('Error deleting proper nouns', err instanceof Error ? err : new Error(String(err)), { jobId: params.id });
    return NextResponse.json(
      { error: 'Failed to delete proper nouns' },
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

export const POST = withRouteProtection(
  { requireAuth: true, requireRole: JOB_ROLES, requireFirm: true },
  postHandler,
);

export const DELETE = withRouteProtection(
  { requireAuth: true, requireRole: JOB_ROLES, requireFirm: true },
  deleteHandler,
);
