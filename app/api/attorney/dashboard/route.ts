// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3.2.2: ATTORNEY DASHBOARD API ROUTE
// ═══════════════════════════════════════════════════════════════════════════════
// File: app/api/attorney/dashboard/route.ts
// Provides dashboard data for attorney users
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/attorney/dashboard
// Returns dashboard data for the authenticated attorney
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify user is an attorney
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        attorneyProfile: true,
      },
    });
    
    if (!user || user.role !== 'ATTORNEY') {
      return NextResponse.json({ error: 'Attorney access required' }, { status: 403 });
    }
    
    // Get URL params for date filtering
    const { searchParams } = new URL(request.url);
    const daysBack = parseInt(searchParams.get('daysBack') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    // Parallel fetch all dashboard data
    const [
      // Cases the attorney has access to
      cases,
      // Recent transcripts with access
      recentTranscripts,
      // Upcoming depositions (from calendar events)
      upcomingDepositions,
      // Recent activity (shares, access)
      recentActivity,
      // Annotation counts
      annotationStats,
    ] = await Promise.all([
      // Cases: Get all cases where attorney is listed
      db.caseAttorney.findMany({
        where: {
          OR: [
            { email: user.email },
            { case: { memberships: { some: { userId: user.id } } } },
          ],
        },
        include: {
          case: {
            include: {
              firm: { select: { id: true, name: true } },
              jobs: {
                select: {
                  id: true,
                  caseName: true,
                  depositionDate: true,
                  status: true,
                  title: true,
                },
                orderBy: { depositionDate: 'desc' },
                take: 5,
              },
              _count: {
                select: { jobs: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      
      // Recent Transcripts: Get transcripts the attorney can access
      db.transcriptAccess.findMany({
        where: {
          userId: user.id,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        include: {
          transcript: {
            include: {
              job: {
                select: {
                  id: true,
                  caseName: true,
                  caseNumber: true,
                  depositionDate: true,
                  title: true,
                  status: true,
                  case: {
                    select: {
                      id: true,
                      caseNumber: true,
                      caseStyle: true,
                    },
                  },
                },
              },
            },
          },
          grantedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      
      // Upcoming Depositions: From calendar events
      db.calendarEvent.findMany({
        where: {
          OR: [
            { participants: { some: { userId: user.id } } },
            { 
              job: { 
                case: { 
                  OR: [
                    { memberships: { some: { userId: user.id } } },
                    { attorneys: { some: { email: user.email } } },
                  ],
                },
              },
            },
          ],
          startTime: { gte: new Date() },
          eventType: { in: ['DEPOSITION', 'HEARING', 'ARBITRATION', 'MEDIATION', 'EUO'] },
        },
        include: {
          job: {
            select: {
              id: true,
              caseName: true,
              caseNumber: true,
              title: true,
            },
          },
          assignedReporter: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { startTime: 'asc' },
        take: 10,
      }),
      
      // Recent Activity: Track recent shares and access
      db.transcriptShare.findMany({
        where: {
          OR: [
            { sharedById: user.id },
            { recipientEmail: user.email },
          ],
          createdAt: { gte: startDate },
        },
        include: {
          transcript: {
            include: {
              job: {
                select: { caseName: true, caseNumber: true },
              },
            },
          },
          sharedBy: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      
      // Annotation Stats: Count user's annotations
      Promise.all([
        db.transcriptHighlight.count({ where: { userId: user.id } }),
        db.transcriptNote.count({ where: { userId: user.id } }),
        db.transcriptBookmark.count({ where: { userId: user.id } }),
      ]),
    ]);
    
    // Process and format data
    const formattedCases = cases.map((ca) => ({
      id: ca.case.id,
      caseNumber: ca.case.caseNumber,
      caseStyle: ca.case.caseStyle,
      shortTitle: ca.case.shortTitle,
      status: ca.case.status,
      courtName: ca.case.courtName,
      firm: ca.case.firm,
      role: ca.role,
      recentJobs: ca.case.jobs,
      jobCount: ca.case._count.jobs,
    }));
    
    const formattedTranscripts = recentTranscripts.map((ta) => ({
      id: ta.transcript.id,
      accessLevel: ta.accessLevel,
      grantedAt: ta.createdAt,
      grantedBy: ta.grantedBy,
      lastAccessed: ta.lastAccessedAt,
      accessCount: ta.accessCount,
      job: ta.transcript.job,
      expiresAt: ta.expiresAt,
    }));
    
    const formattedDepositions = upcomingDepositions.map((event) => ({
      id: event.id,
      title: event.title,
      eventType: event.eventType,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      isRemote: event.isRemote,
      meetingLink: event.meetingLink,
      job: event.job,
      reporter: event.assignedReporter || null,
      status: event.status,
    }));
    
    // Calculate stats
    const stats = {
      totalCases: formattedCases.length,
      activeCases: formattedCases.filter((c) => c.status === 'ACTIVE').length,
      accessibleTranscripts: recentTranscripts.length,
      upcomingDepositions: upcomingDepositions.length,
      annotations: {
        highlights: annotationStats[0],
        notes: annotationStats[1],
        bookmarks: annotationStats[2],
        total: annotationStats[0] + annotationStats[1] + annotationStats[2],
      },
    };
    
    return NextResponse.json({
      stats,
      cases: formattedCases,
      recentTranscripts: formattedTranscripts,
      upcomingDepositions: formattedDepositions,
      recentActivity,
      profile: user.attorneyProfile,
    });
  } catch (error) {
    console.error('Attorney dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}
