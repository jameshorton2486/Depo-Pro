import { db } from '@/lib/db';
// ============================================================
// BOOKING REQUEST API ROUTES
// Path: app/api/calendar/booking-requests/route.ts
// Task 2.3.3 - Attorney Booking Request Workflow
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';

// ------------------------------------------------------------
// VALIDATION SCHEMAS
// ------------------------------------------------------------

const createBookingRequestSchema = z.object({
  caseName: z.string().min(1, 'Case name is required'),
  caseNumber: z.string().optional(),
  preferredDate: z.string().datetime(),
  alternateDate1: z.string().datetime().optional(),
  alternateDate2: z.string().datetime().optional(),
  estimatedDuration: z.number().min(30).max(480).default(240), // 30 min to 8 hours
  eventType: z.enum(['DEPOSITION', 'HEARING', 'ARBITRATION', 'MEDIATION', 'EUO', 'STATEMENT', 'OTHER']).default('DEPOSITION'),
  location: z.string().optional(),
  isRemote: z.boolean().default(false),
  deponentName: z.string().min(1, 'Deponent name is required'),
  deponentContact: z.string().optional(),
  needsInterpreter: z.boolean().default(false),
  interpreterLanguage: z.string().optional(),
  needsVideographer: z.boolean().default(false),
  needsRealtime: z.boolean().default(false),
  specialNotes: z.string().optional(),
});

const querySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'MODIFIED']).optional(),
  requestedById: z.string().optional(),
});

// ------------------------------------------------------------
// GET - Fetch booking requests
// ------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      status: searchParams.get('status') || undefined,
      requestedById: searchParams.get('requestedById') || undefined,
    });

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, firmId: true },
    });

    if (!user?.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    // Build where clause based on role
    const whereClause: any = {
      firmId: user.firmId,
    };

    // Attorneys only see their own requests
    if (user.role === 'ATTORNEY') {
      whereClause.requestedById = user.id;
    } else if (query.requestedById) {
      whereClause.requestedById = query.requestedById;
    }

    // Status filter
    if (query.status) {
      whereClause.status = query.status;
    }

    const requests = await db.bookingRequest.findMany({
      where: whereClause,
      include: {
        requestedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        respondedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        calendarEvent: {
          select: { id: true, title: true, startTime: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      requests,
      total: requests.length,
    });

  } catch (error) {
    console.error('Booking requests GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

// ------------------------------------------------------------
// POST - Create booking request (Attorneys)
// ------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, firmId: true },
    });

    if (!user?.firmId) {
      return NextResponse.json({ error: 'User not associated with firm' }, { status: 403 });
    }

    // Typically attorneys create requests, but agency can too
    if (!['ADMIN', 'REPORTER', 'SCOPIST', 'COURT_REPORTER', 'ATTORNEY', 'AGENCY'].includes(user.role)) {
      return NextResponse.json({ error: 'Only attorneys can submit booking requests' }, { status: 403 });
    }

    const body = await request.json();
    const data = createBookingRequestSchema.parse(body);

    // Validate interpreter language if needed
    if (data.needsInterpreter && !data.interpreterLanguage) {
      return NextResponse.json({ 
        error: 'Interpreter language is required when interpreter is needed' 
      }, { status: 400 });
    }

    // Create the booking request
    const bookingRequest = await db.bookingRequest.create({
      data: {
        firmId: user.firmId,
        requestedById: user.id,
        caseName: data.caseName,
        caseNumber: data.caseNumber,
        preferredDate: new Date(data.preferredDate),
        alternateDate1: data.alternateDate1 ? new Date(data.alternateDate1) : null,
        alternateDate2: data.alternateDate2 ? new Date(data.alternateDate2) : null,
        estimatedDuration: data.estimatedDuration,
        eventType: data.eventType,
        location: data.location,
        isRemote: data.isRemote,
        deponentName: data.deponentName,
        deponentContact: data.deponentContact,
        needsInterpreter: data.needsInterpreter,
        interpreterLanguage: data.interpreterLanguage,
        needsVideographer: data.needsVideographer,
        needsRealtime: data.needsRealtime,
        specialNotes: data.specialNotes,
        status: 'PENDING',
      },
      include: {
        requestedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // TODO: Notify agency of new booking request
    // await notifyAgencyOfNewRequest(bookingRequest);

    return NextResponse.json({
      message: 'Booking request submitted',
      request: bookingRequest,
    }, { status: 201 });

  } catch (error) {
    console.error('Booking request POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}

