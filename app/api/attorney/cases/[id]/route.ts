// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3.2.3: ATTORNEY CASE DETAIL API ROUTE
// ═══════════════════════════════════════════════════════════════════════════════
// File: app/api/attorney/cases/[id]/route.ts
// Provides detailed case view for attorneys
// ═══════════════════════════════════════════════════════════════════════════════

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/attorney/cases/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    
    // Get case with access check
    const caseData = await db.case.findFirst({
      where: {
        id,
        OR: [
          { attorneys: { some: { email: user.email } } },
          { memberships: { some: { userId: user.id } } },
        ],
      },
      include: {
        firm: {
          select: { id: true, name: true, address: true, phone: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        attorneys: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            firm: true,
            phone: true,
            barNumber: true,
          },
        },
        jobs: {
          include: {
            createdBy: {
              select: { id: true, firstName: true, lastName: true },
            },
            transcripts: {
              select: {
                id: true,
                version: true,
                versionNumber: true,
                createdAt: true,
              },
              orderBy: { versionNumber: 'desc' },
            },
            files: {
              select: {
                id: true,
                type: true,
                fileName: true,
                fileSize: true,
                createdAt: true,
              },
            },
            _count: {
              select: {
                transcripts: true,
                exhibits: true,
              },
            },
          },
          orderBy: { depositionDate: 'desc' },
        },
        extractedTerms: {
          select: {
            id: true,
            term: true,
            category: true,
          },
          take: 50,
        },
        sourceDocuments: {
          select: {
            id: true,
            fileName: true,
            documentType: true,
            uploadedAt: true,
            extractionStatus: true,
          },
          orderBy: { uploadedAt: 'desc' },
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
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
    }) as any;
    
    if (!caseData) {
      return NextResponse.json({ error: 'Case not found or access denied' }, { status: 404 });
    }
    
    // Type assertion for included relations
    const caseWithRelations = caseData as any;
    
    // Get transcript access grants separately for each transcript
    const transcriptIds = caseWithRelations.jobs?.flatMap((job: any) => 
      job.transcripts?.map((t: any) => t.id) || []
    ) || [];
    
    type AccessGrant = {
      transcriptId: string;
      accessLevel: string;
      expiresAt: Date | null;
      lastAccessedAt: Date | null;
    };
    
    const accessGrants: AccessGrant[] = transcriptIds.length > 0 ? await (db as any).transcriptAccess.findMany({
      where: {
        transcriptId: { in: transcriptIds },
        userId: user.id,
      },
      select: {
        transcriptId: true,
        accessLevel: true,
        expiresAt: true,
        lastAccessedAt: true,
      },
    }) : [];
    
    const accessMap = new Map<string, AccessGrant>(
      accessGrants.map((grant) => [grant.transcriptId, grant])
    );
    
    // Get attorney's role in this case
    const attorneyEntry = caseWithRelations.attorneys?.find((a: { email: string | null }) => a.email === user.email);
    
    // Format jobs with transcript access info
    const jobsWithAccess = caseWithRelations.jobs?.map((job: any) => ({
      id: job.id,
      caseName: job.caseName,
      caseNumber: job.caseNumber,
      depositionDate: job.depositionDate,
      deponentName: job.deponentName,
      deponentRole: job.deponentRole,
      deponentCompany: job.deponentCompany,
      status: job.status,
      createdBy: job.createdBy,
      files: job.files,
      transcripts: job.transcripts?.map((t: any) => {
        const access = accessMap.get(t.id);
        return {
          id: t.id,
          version: t.version,
          versionNumber: t.versionNumber,
          createdAt: t.createdAt,
          hasAccess: !!access,
          accessLevel: access?.accessLevel || null,
          accessExpires: access?.expiresAt || null,
          lastAccessed: access?.lastAccessedAt || null,
        };
      }),
      counts: job._count,
    }));
    
    // Parse JSON fields safely
    let plaintiffs = [];
    let defendants = [];
    let otherParties = [];
    
    try {
      plaintiffs = caseWithRelations.plaintiffs ? JSON.parse(caseWithRelations.plaintiffs as string) : [];
      defendants = caseWithRelations.defendants ? JSON.parse(caseWithRelations.defendants as string) : [];
      otherParties = caseWithRelations.otherParties ? JSON.parse(caseWithRelations.otherParties as string) : [];
    } catch {
      // If parsing fails, keep empty arrays
    }
    
    return NextResponse.json({
      case: {
        id: caseWithRelations.id,
        caseNumber: caseWithRelations.caseNumber,
        caseStyle: caseWithRelations.caseStyle,
        shortTitle: caseWithRelations.shortTitle,
        status: caseWithRelations.status,
        caseType: caseWithRelations.caseStyle, // Using caseStyle instead of caseType
        
        // Court info
        courtName: caseWithRelations.courtName,
        courtType: caseWithRelations.courtType,
        county: caseWithRelations.county,
        state: caseWithRelations.state,
        judgeAssigned: caseWithRelations.judgeAssigned,
        
        // Parties
        plaintiffs,
        defendants,
        otherParties,
        
        // Related data
        firm: caseWithRelations.firm || null,
        createdBy: caseWithRelations.createdBy || null,
        attorneys: caseWithRelations.attorneys || [],
        
        // Current user's role
        myRole: attorneyEntry?.role || 'VIEWER',
        
        // Jobs and transcripts
        jobs: jobsWithAccess,
        
        // Dictionary terms
        extractedTerms: caseWithRelations.extractedTerms,
        
        // Source documents
        sourceDocuments: caseWithRelations.sourceDocuments,
        
        // Team members
        teamMembers: (caseWithRelations.memberships || []).map((m: { user: any; roleInCase: string; createdAt: Date }) => ({
          ...m.user,
          roleInCase: m.roleInCase,
          joinedAt: m.createdAt,
        })),
        
        // Counts
        counts: caseWithRelations._count,
        
        // Timestamps
        createdAt: caseWithRelations.createdAt,
        updatedAt: caseWithRelations.updatedAt,
        notes: caseWithRelations.notes,
      },
    });
  } catch (error) {
    console.error('Attorney case detail error:', error);
    return NextResponse.json(
      { error: 'Failed to load case details' },
      { status: 500 }
    );
  }
}
