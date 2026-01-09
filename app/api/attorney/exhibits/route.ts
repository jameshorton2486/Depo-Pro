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
export async function GET(request: NextRequest) {
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

    return NextResponse.json({ exhibits: enrichedExhibits });
  } catch (error) {
    console.error('Error fetching exhibits:', error);
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
export async function POST(request: NextRequest) {
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

    // TODO: Upload file to storage (Supabase/S3)
    // For now, we'll use a placeholder URL
    const fileUrl = `/api/attorney/exhibits/files/${Date.now()}-${file.name}`;
    const fileType = file.type.startsWith('image/') ? 'IMAGE' : file.type.includes('pdf') ? 'PDF' : 'DOCX';

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
      job_id: depositionId || '',
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

    // TODO: Add audit log entry
    // await db.auditLog.create({ ... });

    return NextResponse.json({ exhibit: enrichedExhibit }, { status: 201 });
  } catch (error) {
    console.error('Error uploading exhibit:', error);
    return NextResponse.json(
      { error: 'Failed to upload exhibit' },
      { status: 500 },
    );
  }
}





