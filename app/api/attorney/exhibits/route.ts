import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
// ═══════════════════════════════════════════════════════════════
// ATTORNEY EXHIBITS API
// ═══════════════════════════════════════════════════════════════
// API routes for exhibit management (attorney unified view)

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCaseById } from '@/lib/supabase/queries/cases';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { listExhibitsByCase, listExhibitsByJob, createExhibit } from '@/lib/supabase/queries/exhibits';
import { getUserById } from '@/lib/supabase/queries/users';
import { Role } from '@/lib/constants';
import { uploadExhibitOriginal, getFileTypeFromMime } from '@/lib/exhibits/storage';
import { createAuditLog, AuditTargetType } from '@/lib/audit-service';
import { logger } from '@/lib/logger';
import {
  requireAuth,
  requireAttorneyCaseAccess,
  requireExhibitUpload,
} from '@/lib/permissions/api-guards';

/**
 * GET /api/attorney/exhibits
 * List all exhibits for a case (unified view)
 * Query params:
 *   - caseId: Filter by case
 *   - depositionId: Filter by deposition (optional)
 */
async function GETHandler(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);
    if (user && typeof user === "object" && "status" in user) return user;

    // Only attorneys and admins can access
    if (user.role !== Role.ATTORNEY && user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');
    const depositionId = searchParams.get('depositionId');
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 100);
    const offset = (page - 1) * limit;

    if (!caseId) {
      return NextResponse.json(
        { error: 'caseId query parameter is required' },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();

    // SECURITY: Enforce case access
    const accessCheck = await requireAttorneyCaseAccess(user.id, caseId);
    if (accessCheck && typeof accessCheck === "object" && "status" in accessCheck) return accessCheck;

    // Verify case exists
    const caseRecord = await getCaseById(supabase, caseId, user.id);

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Fetch exhibits
    let exhibits;
    if (depositionId) {
      exhibits = await listExhibitsByJob(supabase, depositionId);
    } else {
      exhibits = await listExhibitsByCase(supabase, caseId);
    }

    // Enrich with related data
    const enrichedExhibits = await Promise.all(
      exhibits.map(async (exhibit: any) => {
        const job = exhibit.job_id ? await getJobById(supabase, exhibit.job_id) : null;
        const createdBy = await getUserById(supabase, exhibit.created_by_id);
        const caseData = await getCaseById(supabase, exhibit.case_id, user.id);

        return {
          ...exhibit,
          job: job ? {
            id: job.id,
            title: (job as any).title,
            caseName: (job as any).case_name,
            depositionDate: (job as any).deposition_date,
          } : null,
          createdBy: createdBy ? {
            id: createdBy.id,
            firstName: createdBy.user_metadata?.firstName || '',
            lastName: createdBy.user_metadata?.lastName || '',
            role: createdBy.user_metadata?.role || '',
          } : null,
          case: caseData ? {
            id: caseData.id,
            caseNumber: (caseData as any).case_number,
            caseStyle: (caseData as any).case_style,
          } : null,
        };
      })
    );

    // Sort: by job_id, then exhibit_number, then exhibit_label
    enrichedExhibits.sort((a: any, b: any) => {
      if (a.job?.id !== b.job?.id) {
        return (a.job?.id || '').localeCompare(b.job?.id || '');
      }
      if (a.exhibit_number !== b.exhibit_number) {
        return (a.exhibit_number || 0) - (b.exhibit_number || 0);
      }
      return (a.exhibit_label || '').localeCompare(b.exhibit_label || '');
    });

    const totalCount = enrichedExhibits.length;
    const pagedExhibits = enrichedExhibits.slice(offset, offset + limit);
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      exhibits: pagedExhibits,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    logger.error('Error fetching exhibits', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to fetch exhibits' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/attorney/exhibits
 * Upload a new exhibit (attorney can upload globally or per-deposition)
 */
async function POSTHandler(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);
    if (user && typeof user === "object" && "status" in user) return user;

    if (user.role !== Role.ATTORNEY && user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const caseId = formData.get('caseId') as string | null;
    const depositionId = formData.get('depositionId') as string | null;
    const exhibitLabel = formData.get('exhibitLabel') as string | null;
    const description = formData.get('description') as string | null;

    // Validate required fields
    if (!file || !caseId || !exhibitLabel || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: file, caseId, exhibitLabel, description' },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();

    // SECURITY: Enforce case access and upload permission
    const caseAccess = await requireAttorneyCaseAccess(user.id, caseId);
    if (caseAccess && typeof caseAccess === "object" && "status" in caseAccess) return caseAccess;

    const uploadPermission = await requireExhibitUpload(user.id, caseId);
    if (uploadPermission && typeof uploadPermission === "object" && "status" in uploadPermission) return uploadPermission;

    // Verify case exists
    const caseRecord = await getCaseById(supabase, caseId, user.id);

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // If depositionId provided, verify it exists and belongs to case
    if (depositionId) {
      const job = await getJobById(supabase, depositionId);

      if (!job) {
        return NextResponse.json({ error: 'Deposition not found' }, { status: 404 });
      }

      const jobCaseId = (job as any).case_id || (job as any).caseId;
      if (jobCaseId !== caseId) {
        return NextResponse.json(
          { error: 'Deposition does not belong to this case' },
          { status: 400 },
        );
      }
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} not allowed. Allowed: PDF, images, DOCX` },
        { status: 400 },
      );
    }

    const storageKey = depositionId || caseId;
    const originalUpload = await uploadExhibitOriginal({
      jobId: storageKey,
      file,
      filename: file.name,
    });
    const fileUrl = originalUpload.url;
    const fileType = getFileTypeFromMime(file.type);

    // Get next exhibit number for this case+deposition combination
    const existingExhibits = depositionId
      ? await listExhibitsByJob(supabase, depositionId)
      : await listExhibitsByCase(supabase, caseId);

    const sortedExhibits = existingExhibits
      .map((e: any) => e.exhibit_number || e.exhibitNumber || 0)
      .sort((a: number, b: number) => b - a);

    const nextExhibitNumber = sortedExhibits.length > 0 && sortedExhibits[0]
      ? sortedExhibits[0] + 1
      : 1;

    // Create exhibit record
    const exhibit = await createExhibit(supabase, {
      case_id: caseId,
      job_id: depositionId || null,
      exhibit_label: exhibitLabel,
      exhibit_number: nextExhibitNumber,
      description,
      original_file_url: fileUrl,
      file_type: fileType,
      mime_type: file.type,
      file_name: file.name,
      file_size: file.size,
      stamped: false,
      uploaded_by_role: user.role,
      created_by_id: user.id,
    });

    // Get job and case info for response
    const job = depositionId ? await getJobById(supabase, depositionId) : null;
    const caseData = await getCaseById(supabase, caseId, user.id);

    const enrichedExhibit = {
      ...exhibit,
      job: job ? {
        id: job.id,
        title: (job as any).title,
      } : null,
      case: caseData ? {
        id: caseData.id,
        caseNumber: (caseData as any).case_number,
      } : null,
    };

    await createAuditLog({
      actorUserId: user.id,
      firmId: (caseRecord as any).firm_id || (caseRecord as any).firmId || null,
      action: 'EXHIBIT_UPLOADED',
      targetType: AuditTargetType.FILE,
      targetId: exhibit.id,
      metadata: {
        caseId,
        jobId: depositionId || null,
        fileName: file.name,
        fileType,
        fileSize: file.size,
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ exhibit: enrichedExhibit }, { status: 201 });
  } catch (error) {
    logger.error('Error uploading exhibit', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to upload exhibit' },
      { status: 500 },
    );
  }
}

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.ATTORNEY, UserRole.COURT_REPORTER] },
  GETHandler as any
);

export const POST = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.ATTORNEY, UserRole.COURT_REPORTER] },
  POSTHandler as any
);

