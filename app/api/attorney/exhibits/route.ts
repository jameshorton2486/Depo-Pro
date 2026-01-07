import { db } from '@/lib/db';
// ═══════════════════════════════════════════════════════════════
// ATTORNEY EXHIBITS API
// ═══════════════════════════════════════════════════════════════
// API routes for exhibit management (attorney unified view)

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
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

    // SECURITY: Enforce case access
    const accessCheck = await requireAttorneyCaseAccess(user.id, caseId);
    if (accessCheck && typeof accessCheck === "object" && "status" in accessCheck) return accessCheck;

    // Verify case exists
    const caseRecord = await db.case.findUnique({
      where: { id: caseId },
      select: { id: true, firmId: true },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Build where clause
    const where: any = { caseId };
    if (depositionId) {
      where.jobId = depositionId;
    }

    // Fetch exhibits
    const exhibits = await db.exhibit.findMany({
      where,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            caseName: true,
            depositionDate: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        case: {
          select: {
            id: true,
            caseNumber: true,
            caseStyle: true,
          },
        },
      },
      orderBy: [
        { jobId: 'asc' }, // Group by deposition
        { exhibitNumber: 'asc' }, // Then by exhibit number
        { exhibitLabel: 'asc' }, // Then by label
      ],
    });

    return NextResponse.json({ exhibits });
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

    // SECURITY: Enforce case access and upload permission
    const caseAccess = await requireAttorneyCaseAccess(user.id, caseId);
    if (caseAccess && typeof caseAccess === "object" && "status" in caseAccess) return caseAccess;

    const uploadPermission = await requireExhibitUpload(user.id, caseId);
    if (uploadPermission && typeof uploadPermission === "object" && "status" in uploadPermission) return uploadPermission;

    // Verify case exists
    const caseRecord = await db.case.findUnique({
      where: { id: caseId },
      select: { id: true, firmId: true },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // If depositionId provided, verify it exists and belongs to case
    if (depositionId) {
      const job = await db.job.findUnique({
        where: { id: depositionId },
        select: { id: true, caseId: true },
      });

      if (!job) {
        return NextResponse.json({ error: 'Deposition not found' }, { status: 404 });
      }

      if (job.caseId !== caseId) {
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
    const existingExhibits = await db.exhibit.findMany({
      where: {
        caseId,
        jobId: depositionId || null,
      },
      select: { exhibitNumber: true },
      orderBy: { exhibitNumber: 'desc' },
      take: 1,
    });

    const nextExhibitNumber = existingExhibits.length > 0 && existingExhibits[0].exhibitNumber
      ? existingExhibits[0].exhibitNumber + 1
      : 1;

    // Create exhibit record
    const exhibit = await db.exhibit.create({
      data: {
        caseId,
        jobId: depositionId || null,
        exhibitLabel,
        exhibitNumber: nextExhibitNumber,
        description,
        originalFileUrl: fileUrl,
        fileType,
        mimeType: file.type,
        fileName: file.name,
        fileSize: file.size,
        uploadedByRole: user.role as any,
        createdById: user.id,
        stamped: false,
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
          },
        },
        case: {
          select: {
            id: true,
            caseNumber: true,
          },
        },
      },
    });

    // TODO: Add audit log entry
    // await db.auditLog.create({ ... });

    return NextResponse.json({ exhibit }, { status: 201 });
  } catch (error) {
    console.error('Error uploading exhibit:', error);
    return NextResponse.json(
      { error: 'Failed to upload exhibit' },
      { status: 500 },
    );
  }
}





