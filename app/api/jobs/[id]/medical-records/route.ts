// app/api/jobs/[id]/medical-records/route.ts
// GET: List medical records for a job
// POST: Upload a new medical record (PDF)

import type { NextRequest } from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { NextResponse } from 'next/server';
import { getJobById } from '@/lib/supabase/queries/jobs';
import {
  listMedicalRecordsByJob,
  createMedicalRecord,
} from '@/lib/supabase/queries/medical';
import { logger } from '@/lib/logger';

const GETHandler = async (
  request: NextRequest,
  context: ProtectedContext,
) => {
  try {
    void request;

    const { id: jobId } = context.params;
    const supabase = context.supabase;

    // Verify job exists
    const job = await getJobById(supabase, jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Tenant isolation: verify job belongs to user's firm
    const userFirmId = (context.user as any).firmId ?? context.user.firm_id ?? null;
    const jobFirmId = (job as any).firm_id ?? null;
    if (userFirmId && jobFirmId && userFirmId !== jobFirmId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const records = await listMedicalRecordsByJob(supabase, jobId);

    return NextResponse.json({ data: records });
  } catch (error) {
    logger.error('[api/medical-records] GET error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to list medical records' },
      { status: 500 },
    );
  }
};

const POSTHandler = async (
  request: NextRequest,
  context: ProtectedContext,
) => {
  try {
    const currentUser = context.user;

    const { id: jobId } = context.params;
    const supabase = context.supabase;

    // Verify job exists
    const job = await getJobById(supabase, jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Only reporters and admins can upload medical records
    if (!['ADMIN', 'REPORTER', 'COURT_REPORTER'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 },
      );
    }

    // Validate file type
    const allowedTypes = ['application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF files are supported for medical records' },
        { status: 400 },
      );
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 },
      );
    }

    // Upload to Supabase Storage
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `medical-records/${jobId}/${timestamp}_${safeName}`;

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from('depo-files')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error('[api/medical-records] Upload error', uploadError instanceof Error ? uploadError : new Error(String(uploadError)));
      return NextResponse.json(
        { error: `File upload failed: ${uploadError.message}` },
        { status: 500 },
      );
    }

    // Create database record
    const record = await createMedicalRecord(supabase, {
      job_id: jobId,
      file_name: file.name,
      file_url: storagePath,
      file_size_bytes: file.size,
      mime_type: file.type,
      uploaded_by_id: currentUser.id,
    });

    logger.info('[api/medical-records] Record created', {
      recordId: record.id,
      jobId,
      fileName: file.name,
    });

    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    logger.error('[api/medical-records] POST error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to upload medical record' },
      { status: 500 },
    );
  }
};

export const GET = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.REPORTER, UserRole.COURT_REPORTER, UserRole.SCOPIST],
    rateLimit: { limit: 30, windowMs: 60_000 },
  },
  GETHandler
);

export const POST = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.REPORTER, UserRole.COURT_REPORTER, UserRole.SCOPIST],
    rateLimit: { limit: 5, windowMs: 60_000 },
  },
  POSTHandler
);
