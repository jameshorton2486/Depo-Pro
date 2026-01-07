// ═══════════════════════════════════════════════════════════════
// PROPER NOUNS API ROUTE
// app/api/jobs/[id]/proper-nouns/route.ts
//
// Manages CSRProperNoun entries for a job's CSRRecord
// Used by the Live Notes Capture feature during depositions
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ProperNounCategory as _ProperNounCategory } from '@/types/database';
import { getProperNounsByJob, createProperNoun } from '@/lib/supabase/queries/proper-nouns';
import { getJobById } from '@/lib/supabase/queries/jobs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ═══════════════════════════════════════════════════════════════
// GET - List all proper nouns for a job
// ═══════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await context.params;

    // Find the job and verify access using query module
    const supabase = await createSupabaseServerClient();
    const job = await getJobById(supabase, jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check access: admin, job owner, or same firm
    const user = session.user as any;
    const userFirmId = user.firmId || null;
    const hasAccess =
      user.role === 'ADMIN' ||
      (job as any).created_by_id === user.id ||
      ((job as any).firm_id && (job as any).firm_id === userFirmId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get proper nouns using query module (handles CSR record creation if needed)
    const properNouns = await getProperNounsByJob(supabase, jobId);
    
    // Get CSR record ID for response (query module creates it if needed)
    const { data: csrRecord } = await supabase
      .from('csr_records')
      .select('id')
      .eq('job_id', jobId)
      .maybeSingle();

    return NextResponse.json({
      properNouns: properNouns.map(noun => ({
        ...noun,
        csrRecordId: noun.csr_record_id,
        phoneticHint: noun.phonetic_hint,
        useInTranscription: noun.use_in_transcription,
        createdAt: noun.created_at,
      })),
      csrRecordId: csrRecord?.id || null,
      count: properNouns.length,
    });

  } catch (error) {
    console.error('Error fetching proper nouns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proper nouns' },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// POST - Create a new proper noun
// ═══════════════════════════════════════════════════════════════

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await context.params;
    const body = await request.json();

    const {
      value,
      category = 'OTHER',
      phoneticHint,
      source,
      useInTranscription = true,
      priority = 0,
    } = body;

    // Validate required fields
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      return NextResponse.json(
        { error: 'Value is required and must be a non-empty string' },
        { status: 400 },
      );
    }

    // Validate category
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

    // Find the job and verify access using query module
    const supabase = await createSupabaseServerClient();
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
    } catch (error) {
      if (error instanceof Error && error.message === 'This term already exists for this job') {
        return NextResponse.json(
          { error: 'This term already exists for this job' },
          { status: 409 },
        );
      }
      console.error('Error creating proper noun:', error);
      return NextResponse.json(
        { error: 'Failed to create proper noun' },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Error creating proper noun:', error);
    return NextResponse.json(
      { error: 'Failed to create proper noun' },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// DELETE - Bulk delete proper nouns
// ═══════════════════════════════════════════════════════════════

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await context.params;
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids')?.split(',').filter(Boolean);

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { error: 'No IDs provided for deletion' },
        { status: 400 },
      );
    }

    // Find the job and verify access using query module
    const supabase = await createSupabaseServerClient();
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

    // Get CSR record (needed for bulk delete - could be moved to query module)
    const { data: csrRecord } = await supabase
      .from('csr_records')
      .select('id')
      .eq('job_id', jobId)
      .maybeSingle();

    if (!csrRecord) {
      return NextResponse.json({ error: 'No CSR record for this job' }, { status: 404 });
    }

    // Delete the proper nouns (bulk delete - could be added to query module)
    const { data: deleted, error: deleteError } = await supabase
      .from('csr_proper_nouns')
      .delete()
      .in('id', ids)
      .eq('csr_record_id', csrRecord.id)
      .select();

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete proper nouns' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: deleted?.length || 0,
    });

  } catch (error) {
    console.error('Error deleting proper nouns:', error);
    return NextResponse.json(
      { error: 'Failed to delete proper nouns' },
      { status: 500 },
    );
  }
}
