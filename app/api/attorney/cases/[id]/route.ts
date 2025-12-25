// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3.2.3: ATTORNEY CASE DETAIL API ROUTE
// ═══════════════════════════════════════════════════════════════════════════════
// File: app/api/attorney/cases/[id]/route.ts
// Provides detailed case view for attorneys
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
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
                accessGrants: {
                  where: { userId: user.id },
                  select: {
                    accessLevel: true,
                    expiresAt: true,
                    lastAccessedAt: true,
                  },
                },
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
    });
    
    if (!caseData) {
      return NextResponse.json({ error: 'Case not found or access denied' }, { status: 404 });
    }
    
    // Get attorney's role in this case
    const attorneyEntry = caseData.attorneys?.find((a: any) => a.email === user.email);
    
    // Format jobs with transcript access info
    const jobsWithAccess = caseData.jobs?.map((job: any) => ({
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
      transcripts: job.transcripts?.map((t: any) => ({
        id: t.id,
        version: t.version,
        versionNumber: t.versionNumber,
        status: t.status,
        createdAt: t.createdAt,
        hasAccess: t.accessGrants.length > 0,
        accessLevel: t.accessGrants[0]?.accessLevel || null,
        accessExpires: t.accessGrants[0]?.expiresAt || null,
        lastAccessed: t.accessGrants[0]?.lastAccessedAt || null,
      })),
      counts: job._count,
    }));
    
    // Parse JSON fields safely
    let plaintiffs = [];
    let defendants = [];
    let otherParties = [];
    
    try {
      plaintiffs = caseData.plaintiffs ? JSON.parse(caseData.plaintiffs as string) : [];
      defendants = caseData.defendants ? JSON.parse(caseData.defendants as string) : [];
      otherParties = caseData.otherParties ? JSON.parse(caseData.otherParties as string) : [];
    } catch {
      // If parsing fails, keep empty arrays
    }
    
    return NextResponse.json({
      case: {
        id: caseData.id,
        caseNumber: caseData.caseNumber,
        caseStyle: caseData.caseStyle,
        shortTitle: caseData.shortTitle,
        status: caseData.status,
        caseType: caseData.caseStyle, // Using caseStyle instead of caseType
        
        // Court info
        courtName: caseData.courtName,
        courtType: caseData.courtType,
        county: caseData.county,
        state: caseData.state,
        judgeAssigned: caseData.judgeAssigned,
        
        // Parties
        plaintiffs,
        defendants,
        otherParties,
        
        // Related data
        firm: caseData.firm || null,
        createdBy: caseData.createdBy || null,
        attorneys: caseData.attorneys || [],
        
        // Current user's role
        myRole: attorneyEntry?.role || 'VIEWER',
        
        // Jobs and transcripts
        jobs: jobsWithAccess,
        
        // Dictionary terms
        extractedTerms: caseData.extractedTerms,
        
        // Source documents
        sourceDocuments: caseData.sourceDocuments,
        
        // Team members
        teamMembers: (caseData.memberships || []).map((m: any) => ({
          ...m.user,
          roleInCase: m.roleInCase,
          joinedAt: m.createdAt,
        })),
        
        // Counts
        counts: caseData._count,
        
        // Timestamps
        createdAt: caseData.createdAt,
        updatedAt: caseData.updatedAt,
        notes: caseData.notes,
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
