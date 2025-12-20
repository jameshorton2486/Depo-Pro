// app/api/jobs/[id]/exhibits/route.ts
// API routes for exhibit management (list and create)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { 
  uploadExhibitOriginal, 
  uploadExhibitStamped,
  getFileTypeFromMime 
} from '@/lib/exhibits/storage';
import { stampExhibitPdf } from '@/lib/exhibits/pdf-stamper';

// GET /api/jobs/[id]/exhibits - List all exhibits for a job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;
    const user = session.user as { id: string; role: string };

    // Verify job exists and user has access
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: { 
        id: true, 
        createdById: true, 
        firmId: true,
        assignments: {
          select: { scopistId: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check permissions
    const hasAccess = 
      job.createdById === user.id ||
      job.assignments.some(a => a.scopistId === user.id) ||
      user.role === 'ADMIN' ||
      (user.role === 'REPORTER' && job.createdById === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch exhibits
    const exhibits = await db.exhibit.findMany({
      where: { jobId },
      orderBy: { exhibitNumber: 'asc' },
    });

    return NextResponse.json({ exhibits });
  } catch (error) {
    console.error('Error fetching exhibits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exhibits' },
      { status: 500 }
    );
  }
}

// POST /api/jobs/[id]/exhibits - Upload new exhibits
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;
    const user = session.user as { id: string; role: string };

    // Get job with case details for stamping
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        createdById: true,
        firmId: true,
        caseName: true,
        title: true,
        depositionDate: true,
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check permissions (only reporter who created job, or admin can upload)
    const canUpload = 
      job.createdById === user.id ||
      user.role === 'ADMIN';

    if (!canUpload) {
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
        { status: 400 }
      );
    }

    // Get current max exhibit number for this job
    const maxExhibit = await db.exhibit.findFirst({
      where: { jobId },
      orderBy: { exhibitNumber: 'desc' },
      select: { exhibitNumber: true },
    });
    
    const nextExhibitNumber = (maxExhibit?.exhibitNumber ?? 0) + 1;

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
      if (applyStamp && fileType === 'PDF' && job.caseName && job.title) {
        try {
          // Read file as buffer
          const arrayBuffer = await file.arrayBuffer();
          const pdfBuffer = Buffer.from(arrayBuffer);

          // Stamp the PDF
          const stampedBuffer = await stampExhibitPdf({
            pdfBuffer,
            exhibitNumber,
            caseName: job.caseName,
            deponentName: job.title,
            depositionDate: job.depositionDate || new Date(),
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

      // Create database record
      const exhibit = await db.exhibit.create({
        data: {
          jobId,
          exhibitNumber,
          description,
          originalFileUrl: originalUpload.url,
          stampedFileUrl: stampedUpload?.url || null,
          fileType,
          mimeType: file.type,
          fileName: file.name,
          fileSize: file.size,
          stamped: !!stampedUpload,
          createdById: user.id,
        },
      });

      createdExhibits.push(exhibit);
    }

    return NextResponse.json({ 
      exhibits: createdExhibits,
      message: `Successfully uploaded ${createdExhibits.length} exhibit(s)`,
    });
  } catch (error) {
    console.error('Error uploading exhibits:', error);
    return NextResponse.json(
      { error: 'Failed to upload exhibits' },
      { status: 500 }
    );
  }
}
