// app/api/jobs/[id]/exhibits/route.ts
// API routes for exhibit management (list and create)

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireReporterDepositionAccess } from '@/lib/permissions/api-guards';
import {
  uploadExhibitOriginal,
  uploadExhibitStamped,
  getFileTypeFromMime,
} from '@/lib/exhibits/storage';
import { stampExhibitPdf } from '@/lib/exhibits/pdf-stamper';
import { listExhibitsByJob, createExhibit } from '@/lib/supabase/queries/exhibits';
import { getJobById, isUserAssignedToJob } from '@/lib/supabase/queries/jobs';
import { logger } from '@/lib/logger';

// GET /api/jobs/[id]/exhibits - List all exhibits for a job
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
    const user = session.user as { id: string; role: string };

    // Verify job exists and user has access using query module
    const supabase = await createSupabaseServerClient();
    const job = await getJobById(supabase, jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // SECURITY: Enforce reporter deposition access
    if (user.role === 'REPORTER' || user.role === 'COURT_REPORTER') {
      const accessCheck = await requireReporterDepositionAccess(user.id, jobId);
      if (accessCheck instanceof NextResponse) return accessCheck;
    } else if (user.role !== 'ADMIN') {
      // Allow scopists assigned to the job via query layer
      const isAssigned = await isUserAssignedToJob(jobId, user.id);
      
      if (!isAssigned) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Fetch exhibits using query module
    const exhibits = await listExhibitsByJob(supabase, jobId);

    return NextResponse.json({ exhibits });
  } catch (error) {
    console.error('Error fetching exhibits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exhibits' },
      { status: 500 },
    );
  }
}

// POST /api/jobs/[id]/exhibits - Upload new exhibits
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

    // Get job with case details for stamping using query module
    const supabase = await createSupabaseServerClient();
    const job = await getJobById(supabase, jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // SECURITY: Enforce reporter deposition access for upload
    if (user.role === 'REPORTER' || user.role === 'COURT_REPORTER') {
      const accessCheck = await requireReporterDepositionAccess(user.id, jobId);
      if (accessCheck instanceof NextResponse) return accessCheck;
    } else if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const applyStamp = formData.get('applyStamp') === 'true';
    const descriptionsRaw = formData.get('descriptions') as string | null;

    let descriptions: string[] = [];
    if (descriptionsRaw) {
      try {
        descriptions = JSON.parse(descriptionsRaw);
      } catch {
        descriptions = [];
      }
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 },
      );
    }

    // Get current max exhibit number for this job
    const existingExhibits = await listExhibitsByJob(supabase, jobId);
    const maxExhibitNumber = existingExhibits.length > 0
      ? Math.max(...existingExhibits.map((e: any) => e.exhibit_number || 0))
      : 0;
    const nextExhibitNumber = maxExhibitNumber + 1;

    // Process each file
    const createdExhibits = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const description = descriptions[i] || '';
      const fileType = getFileTypeFromMime(file.type);
      const exhibitNumber = nextExhibitNumber + i;

      // Upload original file
      const originalUpload = await uploadExhibitOriginal({
        jobId,
        file,
        filename: file.name,
      });

      let stampedUpload = null;

      // Stamp PDF if requested
      if (applyStamp && fileType === 'PDF' && (job as any).case_name && (job as any).title) {
        try {
          // Read file as buffer
          const arrayBuffer = await file.arrayBuffer();
          const pdfBuffer = Buffer.from(arrayBuffer);

          // Stamp the PDF
          const stampedBuffer = await stampExhibitPdf({
            pdfBuffer,
            exhibitNumber,
            caseName: (job as any).case_name,
            deponentName: (job as any).title,
            depositionDate: (job as any).deposition_date ? new Date((job as any).deposition_date) : new Date(),
          });

          // Upload stamped version
          stampedUpload = await uploadExhibitStamped({
            jobId,
            buffer: stampedBuffer,
            filename: file.name,
          });
        } catch (stampError) {
          console.error('Failed to stamp PDF:', stampError);
          // Continue without stamping if it fails
        }
      }

      // Create database record using query module
      const exhibit = await createExhibit(supabase, {
        case_id: (job as any).case_id || (job as any).firm_id || '', // Required - get from job
        job_id: jobId,
        exhibit_label: `Exhibit ${exhibitNumber}`, // Required
        exhibit_number: exhibitNumber,
        description,
        original_file_url: originalUpload.url,
        stamped_file_url: stampedUpload?.url || null,
        file_type: fileType,
        mime_type: file.type,
        file_name: file.name,
        file_size: file.size,
        stamped: !!stampedUpload,
        uploaded_by_role: user.role, // Required
        created_by_id: user.id,
      });

      createdExhibits.push(exhibit);
    }

    return NextResponse.json({
      exhibits: createdExhibits,
      message: `Successfully uploaded ${createdExhibits.length} exhibit(s)`,
    });
  } catch (error) {
    const { id: jobId } = await params;
    logger.error('Error uploading exhibits', error instanceof Error ? error : new Error(String(error)), { jobId });
    return NextResponse.json(
      { error: 'Failed to upload exhibits' },
      { status: 500 },
    );
  }
}
