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
import type { ProperNounCategory } from '@/types/database';

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

    // Find the job and verify access
    const supabase = await createSupabaseServerClient();
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, created_by_id, firm_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check access: admin, job owner, or same firm
    const user = session.user as any;
    const userFirmId = user.firmId || null;
    const hasAccess =
      user.role === 'ADMIN' ||
      job.created_by_id === user.id ||
      (job.firm_id && job.firm_id === userFirmId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get CSR record
    const { data: csrRecord } = await supabase
      .from('csr_records')
      .select('id')
      .eq('job_id', jobId)
      .single();

    // Get proper nouns if CSR record exists
    let properNouns: any[] = [];
    if (csrRecord) {
      const { data: nouns } = await supabase
        .from('csr_proper_nouns')
        .select('*')
        .eq('csr_record_id', csrRecord.id)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
      
      properNouns = nouns || [];
    }

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
    const validCategories: ProperNounCategory[] = [
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

    // Find the job and verify access
    const supabase = await createSupabaseServerClient();
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

    // Get or create CSRRecord
    let { data: csrRecord } = await supabase
      .from('csr_records')
      .select('id')
      .eq('job_id', jobId)
      .single();

    if (!csrRecord) {
      // Need to fetch more job data to create CSRRecord
      const { data: fullJob, error: fullJobError } = await supabase
        .from('jobs')
        .select('deposition_date, case_name, case_number, location')
        .eq('id', jobId)
        .single();

      if (fullJobError || !fullJob) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      // Create a CSRRecord with required fields from job
      const { data: newCsrRecord, error: createError } = await supabase
        .from('csr_records')
        .insert({
          job_id: jobId,
          deposition_date: fullJob.deposition_date,
          case_caption: fullJob.case_name || 'Untitled Case',
          cause_number: fullJob.case_number,
          location_address: fullJob.location,
        })
        .select()
        .single();

      if (createError) {
        console.error('CSR record creation error:', createError);
        return NextResponse.json(
          { error: 'Failed to create CSR record' },
          { status: 500 }
        );
      }
      csrRecord = newCsrRecord;
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from('csr_proper_nouns')
      .select('id')
      .eq('csr_record_id', csrRecord.id)
      .eq('value', value.trim())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'This term already exists for this job' },
        { status: 409 },
      );
    }

    // Create the proper noun
    const { data: properNoun, error: nounError } = await supabase
      .from('csr_proper_nouns')
      .insert({
        csr_record_id: csrRecord.id,
        value: value.trim(),
        category: category as ProperNounCategory,
        phonetic_hint: phoneticHint?.trim() || null,
        source: source || 'manual_entry',
        use_in_transcription: useInTranscription,
        priority,
      })
      .select()
      .single();

    if (nounError) {
      console.error('Proper noun creation error:', nounError);
      return NextResponse.json(
        { error: 'Failed to create proper noun' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      properNoun: {
        ...properNoun,
        csrRecordId: properNoun.csr_record_id,
        phoneticHint: properNoun.phonetic_hint,
        useInTranscription: properNoun.use_in_transcription,
        createdAt: properNoun.created_at,
      },
    }, { status: 201 });

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

    // Find the job and verify access
    const supabase = await createSupabaseServerClient();
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

    // Get CSR record
    const { data: csrRecord } = await supabase
      .from('csr_records')
      .select('id')
      .eq('job_id', jobId)
      .single();

    if (!csrRecord) {
      return NextResponse.json({ error: 'No CSR record for this job' }, { status: 404 });
    }

    // Delete the proper nouns
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
