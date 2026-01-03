// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3.2.3: ATTORNEY CASES API ROUTE
// ═══════════════════════════════════════════════════════════════════════════════
// File: app/api/attorney/cases/route.ts
// Provides case list with filtering, search, and pagination for attorneys
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET /api/attorney/cases
// Returns paginated list of cases the attorney has access to
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify user is an attorney
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });
    
    if (!user || user.role !== 'ATTORNEY') {
      return NextResponse.json({ error: 'Attorney access required' }, { status: 403 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const skip = (page - 1) * limit;
    
    // Filters
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status'); // ACTIVE, CLOSED, SETTLED, ARCHIVED
    const caseType = searchParams.get('caseType'); // CIVIL, CRIMINAL, etc.
    const role = searchParams.get('role'); // PLAINTIFF, DEFENDANT, etc.
    const courtType = searchParams.get('courtType');
    const state = searchParams.get('state');
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const hasTranscripts = searchParams.get('hasTranscripts') === 'true';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    
    // Build base where clause - attorney must have access
    const baseWhere: Prisma.CaseWhereInput = {
      OR: [
        // Attorney is directly listed on the case
        { attorneys: { some: { email: user.email } } },
        // Attorney has case membership
        { memberships: { some: { userId: user.id } } },
        // Attorney has transcript access for a job in this case
        {
          jobs: {
            some: {
              transcripts: {
                some: {
                  accessGrants: {
                    some: { userId: user.id },
                  } as any,
                },
              },
            },
          },
        } as any,
      ],
    };
    
    // Build filter conditions
    const filterConditions: Prisma.CaseWhereInput[] = [baseWhere];
    
    // Search across multiple fields
    if (search) {
      filterConditions.push({
        OR: [
          { caseNumber: { contains: search, mode: 'insensitive' } },
          { caseStyle: { contains: search, mode: 'insensitive' } },
          { shortTitle: { contains: search, mode: 'insensitive' } },
          { courtName: { contains: search, mode: 'insensitive' } },
          { judgeAssigned: { contains: search, mode: 'insensitive' } },
          // Search in jobs
          {
            jobs: {
              some: {
                OR: [
                  { caseName: { contains: search, mode: 'insensitive' } },
                  { title: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
          },
        ],
      });
    }
    
    // Status filter
    if (status) {
      filterConditions.push({ status: status as any });
    }
    
    // Case type filter (using caseStyle since caseType doesn't exist)
    if (caseType) {
      filterConditions.push({ caseStyle: { contains: caseType, mode: 'insensitive' } });
    }
    
    // Role filter (attorney's role in the case)
    if (role) {
      filterConditions.push({
        attorneys: {
          some: {
            email: user.email,
            role: role as any,
          },
        },
      });
    }
    
    // Court type filter
    if (courtType) {
      filterConditions.push({ courtType: { contains: courtType, mode: 'insensitive' } });
    }
    
    // State filter
    if (state) {
      filterConditions.push({ state: state });
    }
    
    // Has transcripts filter
    if (hasTranscripts) {
      filterConditions.push({
        jobs: {
          some: {
            transcripts: {
              some: {},
            },
          },
        },
      });
    }
    
    // Date range filter
    if (dateFrom) {
      filterConditions.push({ createdAt: { gte: new Date(dateFrom) } });
    }
    if (dateTo) {
      filterConditions.push({ createdAt: { lte: new Date(dateTo) } });
    }
    
    const where: Prisma.CaseWhereInput = {
      AND: filterConditions,
    };
    
    // Build orderBy
    const orderByMap: Record<string, Prisma.CaseOrderByWithRelationInput> = {
      caseNumber: { caseNumber: sortOrder },
      caseStyle: { caseStyle: sortOrder },
      status: { status: sortOrder },
      createdAt: { createdAt: sortOrder },
      updatedAt: { updatedAt: sortOrder },
      courtName: { courtName: sortOrder },
    };
    const orderBy = orderByMap[sortBy] || { updatedAt: 'desc' };
    
    // Execute queries in parallel
    const [cases, totalCount] = await Promise.all([
      db.case.findMany({
        where,
        include: {
          firm: {
            select: { id: true, name: true },
          },
          attorneys: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              firm: true,
            },
          },
          jobs: {
            select: {
              id: true,
              caseName: true,
              caseNumber: true,
              depositionDate: true,
              title: true,
              status: true,
              _count: {
                select: { transcripts: true },
              },
            },
            orderBy: { depositionDate: 'desc' },
            take: 5,
          },
          _count: {
            select: {
              jobs: true,
              attorneys: true,
              extractedTerms: true,
              sourceDocuments: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      Prisma.Case.count({ where }),
    ]);
    
    // Get attorney's role for each case
    const casesWithRole = cases.map((c: any) => {
      const attorneyEntry = c.attorneys.find((a: any) => a.email === user.email);
      return {
        id: c.id,
        caseNumber: c.caseNumber,
        caseStyle: c.caseStyle,
        shortTitle: c.shortTitle,
        status: c.status,
        caseType: c.caseStyle, // Using caseStyle instead of caseType
        courtName: c.courtName,
        courtType: c.courtType,
        county: c.county,
        state: c.state,
        judgeAssigned: c.judgeAssigned,
        firm: c.firm,
        myRole: attorneyEntry?.role || 'VIEWER',
        recentJobs: c.jobs.map((j: any) => ({
          ...j,
          hasTranscript: (j._count as { transcripts: number }).transcripts > 0,
        })),
        attorneys: c.attorneys,
        counts: c._count,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });
    
    // Calculate pagination
    const totalPages = Math.ceil(totalCount / limit);
    
    return NextResponse.json({
      cases: casesWithRole,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      filters: {
        search,
        status,
        caseType,
        role,
        courtType,
        state,
        hasTranscripts,
        dateFrom,
        dateTo,
      },
    });
  } catch (error) {
    console.error('Attorney cases error:', error);
    return NextResponse.json(
      { error: 'Failed to load cases' },
      { status: 500 }
    );
  }
}

// GET /api/attorney/cases/[id]
// Get single case detail (separate file: app/api/attorney/cases/[id]/route.ts)
