import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withRouteProtection, type ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { UserRole } from '@/lib/enums/roles';
import { getProperNounById, updateProperNoun, deleteProperNoun } from '@/lib/supabase/queries/proper-nouns';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { isAdminRole } from '@/lib/admin';

/**
 * GET /api/jobs/[id]/proper-nouns/[nounId]
 * Get a single proper noun
 */
const getHandler = async (_request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  try {
    const jobId = params.id;
    const nounId = params.nounId;

    // Get proper noun using query module
    const properNoun = await getProperNounById(supabase, nounId, jobId);

    if (!properNoun) {
      return NextResponse.json({ error: 'Proper noun not found' }, { status: 404 });
    }

    // Get job to check access using query module
    const job = await getJobById(supabase, jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check access
    const hasAccess =
      isAdminRole(user.role) ||
      job.created_by_id === user.id ||
      (job.firm_id && job.firm_id === user.firm_id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      properNoun: {
        ...properNoun,
        csrRecordId: properNoun.csr_record_id,
        phoneticHint: properNoun.phonetic_hint,
        useInTranscription: properNoun.use_in_transcription,
        createdAt: properNoun.created_at,
      }
    });

  } catch (err) {
    console.error('Error fetching proper noun:', err);
    return NextResponse.json(
      { error: 'Failed to fetch proper noun' },
      { status: 500 },
    );
  }
};

/**
 * PATCH /api/jobs/[id]/proper-nouns/[nounId]
 * Update a CSRProperNoun entry
 */
const patchHandler = async (request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  try {
    const jobId = params.id;
    const nounId = params.nounId;
    const body = await request.json();

    const {
      value,
      category,
      phoneticHint,
      source: _source,
      useInTranscription,
      priority,
    } = body;

    // Get proper noun using query module
    const existingNoun = await getProperNounById(supabase, nounId, jobId);

    if (!existingNoun) {
      return NextResponse.json({ error: 'Proper noun not found' }, { status: 404 });
    }

    // Get job to check access using query module
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

    // Build update data
    const updateData: {
      value?: string;
      category?: string;
      phonetic_hint?: string | null;
      use_in_transcription?: boolean;
      priority?: number;
    } = {};

    if (value !== undefined) {
      if (typeof value !== 'string' || value.trim().length === 0) {
        return NextResponse.json(
          { error: 'Value must be a non-empty string' },
          { status: 400 },
        );
      }
      updateData.value = value.trim();
    }

    if (category !== undefined) {
      const validCategories: string[] = [
        'PERSON_NAME',
        'COMPANY_NAME',
        'PLACE_NAME',
        'PRODUCT_NAME',
        'LEGAL_TERM',
        'MEDICAL_TERM',
        'TECHNICAL_TERM',
        'ACRONYM',
        'OTHER',
      ];

      if (!validCategories.includes(category)) {
        return NextResponse.json(
          { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
          { status: 400 },
        );
      }
      updateData.category = category;
    }

    if (phoneticHint !== undefined) {
      updateData.phonetic_hint = phoneticHint?.trim() || null;
    }

    if (useInTranscription !== undefined) {
      updateData.use_in_transcription = Boolean(useInTranscription);
    }

    if (priority !== undefined) {
      updateData.priority = Number(priority) || 0;
    }

    // Update the proper noun using query module (handles duplicate check)
    try {
      const updatedNoun = await updateProperNoun(supabase, nounId, jobId, updateData);

      return NextResponse.json({
        success: true,
        properNoun: {
          ...updatedNoun,
          csrRecordId: (updatedNoun as any).csr_record_id,
          phoneticHint: (updatedNoun as any).phonetic_hint,
          useInTranscription: (updatedNoun as any).use_in_transcription,
          createdAt: (updatedNoun as any).created_at,
        },
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'This term already exists for this job') {
        return NextResponse.json(
          { error: 'A term with this value already exists' },
          { status: 409 },
        );
      }
      console.error('Error updating proper noun:', err);
      return NextResponse.json({ error: 'Failed to update proper noun' }, { status: 500 });
    }
  } catch (err: any) {
    console.error('Error updating proper noun:', err);
    return NextResponse.json({ error: 'Failed to update proper noun' }, { status: 500 });
  }
};

/**
 * DELETE /api/jobs/[id]/proper-nouns/[nounId]
 * Delete a CSRProperNoun entry
 */
const deleteHandler = async (_request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  try {
    const jobId = params.id;
    const nounId = params.nounId;

    // Get proper noun using query module
    const existingNoun = await getProperNounById(supabase, nounId, jobId);

    if (!existingNoun) {
      return NextResponse.json({ error: 'Proper noun not found' }, { status: 404 });
    }

    // Get job to check access using query module
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

    // Delete the proper noun using query module
    await deleteProperNoun(supabase, nounId, jobId);

    return NextResponse.json({
      success: true,
      message: 'Proper noun deleted',
    });
  } catch (err) {
    console.error('Error deleting proper noun:', err);
    return NextResponse.json({ error: 'Failed to delete proper noun' }, { status: 500 });
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

export const PATCH = withRouteProtection(
  { requireAuth: true, requireRole: JOB_ROLES, requireFirm: true },
  patchHandler,
);

export const DELETE = withRouteProtection(
  { requireAuth: true, requireRole: JOB_ROLES, requireFirm: true },
  deleteHandler,
);
