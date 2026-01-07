import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ProperNounCategory as _ProperNounCategory } from '@/types/database';

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

    // Find the proper noun with job verification
    const supabase = await createSupabaseServerClient();
    const { data: properNoun, error: nounError } = await supabase
      .from('csr_proper_nouns')
      .select('*, csr_records!inner(job_id)')
      .eq('id', nounId)
      .single();

    if (nounError || !properNoun) {
      return NextResponse.json({ error: 'Proper noun not found' }, { status: 404 });
    }

    // Get CSR record and verify job
    const csrRecord = properNoun.csr_records as any;
    if (!csrRecord || csrRecord.job_id !== jobId) {
      return NextResponse.json({ error: 'Proper noun not found' }, { status: 404 });
    }

    // Get job to check access
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, created_by_id, firm_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
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
      source,
      useInTranscription,
      priority,
    } = body;

    // Find the proper noun with job verification
    const supabase = await createSupabaseServerClient();
    const { data: existingNoun, error: nounError } = await supabase
      .from('csr_proper_nouns')
      .select('*, csr_records!inner(job_id)')
      .eq('id', nounId)
      .single();

    if (nounError || !existingNoun) {
      return NextResponse.json({ error: 'Proper noun not found' }, { status: 404 });
    }

    // Get CSR record and verify job
    const csrRecord = existingNoun.csr_records as any;
    if (!csrRecord || csrRecord.job_id !== jobId) {
      return NextResponse.json({ error: 'Proper noun not found' }, { status: 404 });
    }

    // Get job to check access
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, created_by_id, firm_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
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

    // Build update data
    const updateData: any = {};

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

    if (source !== undefined) {
      updateData.source = source;
    }

    if (useInTranscription !== undefined) {
      updateData.use_in_transcription = Boolean(useInTranscription);
    }

    if (priority !== undefined) {
      updateData.priority = Number(priority) || 0;
    }

    // Check for duplicate value if value is being changed
    if (updateData.value && updateData.value !== existingNoun.value) {
      const { data: duplicate } = await supabase
        .from('csr_proper_nouns')
        .select('id')
        .eq('csr_record_id', existingNoun.csr_record_id)
        .eq('value', updateData.value)
        .single();

      if (duplicate) {
        return NextResponse.json(
          { error: 'A term with this value already exists' },
          { status: 409 },
        );
      }
    }

    // Update the proper noun
    const { data: updatedNoun, error: updateError } = await supabase
      .from('csr_proper_nouns')
      .update(updateData)
      .eq('id', nounId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update proper noun' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      properNoun: {
        ...updatedNoun,
        csrRecordId: updatedNoun.csr_record_id,
        phoneticHint: updatedNoun.phonetic_hint,
        useInTranscription: updatedNoun.use_in_transcription,
        createdAt: updatedNoun.created_at,
      },
    });
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

    // Find the proper noun with job verification
    const supabase = await createSupabaseServerClient();
    const { data: existingNoun, error: nounError } = await supabase
      .from('csr_proper_nouns')
      .select('*, csr_records!inner(job_id)')
      .eq('id', nounId)
      .single();

    if (nounError || !existingNoun) {
      return NextResponse.json({ error: 'Proper noun not found' }, { status: 404 });
    }

    // Get CSR record and verify job
    const csrRecord = existingNoun.csr_records as any;
    if (!csrRecord || csrRecord.job_id !== jobId) {
      return NextResponse.json({ error: 'Proper noun not found' }, { status: 404 });
    }

    // Get job to check access
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, created_by_id, firm_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
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

    // Delete the proper noun
    const { error: deleteError } = await supabase
      .from('csr_proper_nouns')
      .delete()
      .eq('id', nounId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete proper noun' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Proper noun deleted',
    });
  } catch (error) {
    console.error('Error deleting proper noun:', error);
    return NextResponse.json({ error: 'Failed to delete proper noun' }, { status: 500 });
  }
}
