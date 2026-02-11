// app/api/jobs/[id]/chronology/route.ts
// GET: List chronology entries for a job (with filters)
// POST: Create a manual chronology entry

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getJobById } from '@/lib/supabase/queries/jobs';
import {
  listChronologyEntries,
  createChronologyEntry,
  getChronologySummary,
} from '@/lib/supabase/queries/medical';
import type { ChronologyFilters, ChronologyCategory } from '@/types/medical';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;
    const supabase = await createSupabaseServerClient();

    // Verify job exists
    const job = await getJobById(supabase, jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Parse query filters
    const url = new URL(request.url);
    const filters: ChronologyFilters = {};

    const category = url.searchParams.get('category');
    if (category) filters.category = category;

    const provider = url.searchParams.get('provider');
    if (provider) filters.provider = provider;

    const startDate = url.searchParams.get('startDate');
    if (startDate) filters.startDate = startDate;

    const endDate = url.searchParams.get('endDate');
    if (endDate) filters.endDate = endDate;

    const sourceType = url.searchParams.get('sourceType');
    if (sourceType) filters.sourceType = sourceType as ChronologyFilters['sourceType'];

    const isVerified = url.searchParams.get('isVerified');
    if (isVerified !== null) filters.isVerified = isVerified === 'true';

    const medicalRecordId = url.searchParams.get('medicalRecordId');
    if (medicalRecordId) filters.medicalRecordId = medicalRecordId;

    // Check if summary is requested
    const includeSummary = url.searchParams.get('summary') === 'true';

    const entries = await listChronologyEntries(supabase, jobId, filters);

    const response: Record<string, unknown> = { data: entries };

    if (includeSummary) {
      response.summary = await getChronologySummary(supabase, jobId);
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error('[api/chronology] GET error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to list chronology entries' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;
    const user = session.user as { id: string; role: string };
    const supabase = await createSupabaseServerClient();

    // Verify job exists
    const job = await getJobById(supabase, jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.event_date || !body.summary || !body.category) {
      return NextResponse.json(
        { error: 'event_date, summary, and category are required' },
        { status: 400 },
      );
    }

    // Validate category
    const validCategories: ChronologyCategory[] = [
      'Visit', 'Surgery', 'Imaging', 'Lab', 'Prescription', 'Diagnosis',
      'Therapy', 'Hospitalization', 'Consultation', 'Procedure', 'Follow-Up', 'Other',
    ];
    if (!validCategories.includes(body.category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 },
      );
    }

    const entry = await createChronologyEntry(supabase, {
      job_id: jobId,
      medical_record_id: body.medical_record_id || null,
      event_date: body.event_date,
      event_date_end: body.event_date_end || null,
      date_precision: body.date_precision || 'DAY',
      provider: body.provider || null,
      category: body.category,
      summary: body.summary,
      details: body.details || null,
      page_reference: body.page_reference || null,
      source_type: 'MANUAL',
      source_document_name: body.source_document_name || null,
      confidence: 1.0,
      created_by_id: user.id,
    });

    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error) {
    logger.error('[api/chronology] POST error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to create chronology entry' },
      { status: 500 },
    );
  }
}
