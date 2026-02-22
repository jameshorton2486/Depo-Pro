// app/api/jobs/[id]/chronology/export/route.ts
// GET: Export chronology as DOCX

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { listChronologyEntries } from '@/lib/supabase/queries/medical';
import { generateChronologyDocx } from '@/lib/services/chronology-export';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;
    const supabase = await createSupabaseServerClient();

    // Verify job exists
    const job = await getJobById(supabase, jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get all chronology entries
    const entries = await listChronologyEntries(supabase, jobId);

    if (entries.length === 0) {
      return NextResponse.json(
        { error: 'No chronology entries to export' },
        { status: 400 },
      );
    }

    // Generate DOCX
    const buffer = await generateChronologyDocx(entries, {
      caseName: (job as Record<string, unknown>).caseName as string || (job as Record<string, unknown>).case_name as string || 'Untitled Case',
      caseNumber: (job as Record<string, unknown>).caseNumber as string || (job as Record<string, unknown>).case_number as string || '',
      deponentName: (job as Record<string, unknown>).deponentName as string || (job as Record<string, unknown>).deponent_name as string || '',
    });

    // Build filename
    const caseName = ((job as Record<string, unknown>).caseName as string || (job as Record<string, unknown>).case_name as string || 'Case')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 40);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${caseName}_Medical_Chronology_${dateStr}.docx`;

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    logger.error('[api/chronology/export] GET error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to export chronology' },
      { status: 500 },
    );
  }
}
