import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ProperNounCategory as _ProperNounCategory } from '@/types/database';
import { getProperNounById, updateProperNoun, deleteProperNoun } from '@/lib/supabase/queries/proper-nouns';
import { getJobById } from '@/lib/supabase/queries/jobs';

interface RouteContext {
  params: Promise<{ id: string; nounId: string }>;
}

/**
 * GET /api/jobs/[id]/proper-nouns/[nounId]
 * Get a single proper noun
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId, nounId } = await context.params;

    // Get proper noun using query module
    const supabase = await createSupabaseServerClient();
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
    const user = session.user as any;
    const userFirmId = user.firmId || null;
    const hasAccess =
      user.role === 'ADMIN' ||
      job.created_by_id === user.id ||
      (job.firm_id && job.firm_id === userFirmId);

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

  } catch (error) {
    console.error('Error fetching proper noun:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proper noun' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/jobs/[id]/proper-nouns/[nounId]
 * Update a CSRProperNoun entry
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId, nounId } = await context.params;
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
    const supabase = await createSupabaseServerClient();
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
    const user = session.user as any;
    const userFirmId = user.firmId || null;
    const hasAccess =
      user.role === 'ADMIN' ||
      (job as any).created_by_id === user.id ||
      ((job as any).firm_id && (job as any).firm_id === userFirmId);

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
    } catch (error) {
      if (error instanceof Error && error.message === 'This term already exists for this job') {
        return NextResponse.json(
          { error: 'A term with this value already exists' },
          { status: 409 },
        );
      }
      console.error('Error updating proper noun:', error);
      return NextResponse.json({ error: 'Failed to update proper noun' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error updating proper noun:', error);
    return NextResponse.json({ error: 'Failed to update proper noun' }, { status: 500 });
  }
}

/**
 * DELETE /api/jobs/[id]/proper-nouns/[nounId]
 * Delete a CSRProperNoun entry
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId, nounId } = await context.params;

    // Get proper noun using query module
    const supabase = await createSupabaseServerClient();
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
    const user = session.user as any;
    const userFirmId = user.firmId || null;
    const hasAccess =
      user.role === 'ADMIN' ||
      (job as any).created_by_id === user.id ||
      ((job as any).firm_id && (job as any).firm_id === userFirmId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete the proper noun using query module
    await deleteProperNoun(supabase, nounId, jobId);

    return NextResponse.json({
      success: true,
      message: 'Proper noun deleted',
    });
  } catch (error) {
    console.error('Error deleting proper noun:', error);
    return NextResponse.json({ error: 'Failed to delete proper noun' }, { status: 500 });
  }
}
