import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3.2.2: ATTORNEY DASHBOARD API ROUTE
// ═══════════════════════════════════════════════════════════════════════════════
// File: app/api/attorney/dashboard/route.ts
// Provides dashboard data for attorney users
// ═══════════════════════════════════════════════════════════════════════════════

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserById } from '@/lib/supabase/queries/users';
import { listCases } from '@/lib/supabase/queries/cases';

// GET /api/attorney/dashboard
// Returns dashboard data for the authenticated attorney
async function GETHandler(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabase = await createSupabaseServerClient();
    
    // Verify user is an attorney
    const userData = await getUserById(supabase, currentUser.id);
    
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userRole = userData.user_metadata?.role as string;
    if (userRole !== 'ATTORNEY') {
      return NextResponse.json({ error: 'Attorney access required' }, { status: 403 });
    }
    
    // Get attorney profile
    const { data: attorneyProfile } = await supabase
      .from('attorney_profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .maybeSingle();
    
    const _user = {
      id: userData.id,
      email: userData.email || '',
      role: userRole,
      attorneyProfile,
    };
    
    // Get URL params for date filtering
    const { searchParams } = new URL(request.url);
    const daysBack = parseInt(searchParams.get('daysBack') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    // Parallel fetch all dashboard data
    const [
      // Cases the attorney has access to
      casesResult,
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
      (async () => {
        const { cases: casesWithRole } = await listCases(
          supabase,
          currentUser.id,
          currentUser.email,
          {},
          { field: 'created_at', order: 'desc' },
          { skip: 0, limit: 50 }
        );
        
        // Get case attorneys for role info
        const caseIds = casesWithRole.map((c: any) => c.id);
        const { data: caseAttorneys } = await supabase
          .from('case_attorneys')
          .select('case_id, role')
          .in('case_id', caseIds)
          .or(`email.eq.${currentUser.email},attorney_id.eq.${currentUser.id}`);
        
        const roleMap = new Map(caseAttorneys?.map((ca: any) => [ca.case_id, ca.role]) || []);
        
        // Get jobs for each case
        const casesWithJobs = await Promise.all(
          casesWithRole.map(async (c: any) => {
            const { data: jobs } = await supabase
              .from('jobs')
              .select('id, case_name, deposition_date, status, title')
              .eq('case_id', c.id)
              .order('deposition_date', { ascending: false })
              .limit(5);
            
            const { count: jobCount } = await supabase
              .from('jobs')
              .select('*', { count: 'exact', head: true })
              .eq('case_id', c.id);
            
            return {
              case: {
                ...c,
                role: roleMap.get(c.id) || 'VIEWER',
                jobs: jobs || [],
                _count: { jobs: jobCount || 0 },
              },
            };
          })
        );
        
        return casesWithJobs;
      })(),
      
      // Recent Transcripts: Get transcripts the attorney can access
      (async () => {
        const { data: transcriptAccess } = await supabase
          .from('transcript_access')
          .select('*')
          .eq('user_id', currentUser.id)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (!transcriptAccess || transcriptAccess.length === 0) {
          return [];
        }
        
        const transcriptIds = transcriptAccess.map((ta: any) => ta.transcription_id);
        const { data: transcripts } = await supabase
          .from('transcriptions')
          .select('*, jobs(*)')
          .in('id', transcriptIds);
        
        // Get granted by info
        const grantedByIds = [...new Set(transcriptAccess.map((ta: any) => ta.granted_by_id))];
        const grantedByUsers = await Promise.all(
          grantedByIds.map(id => getUserById(supabase, id))
        );
        const grantedByMap = new Map(
          grantedByUsers.map((u: any, i: number) => [grantedByIds[i], u ? {
            id: u.id,
            firstName: u.user_metadata?.firstName || '',
            lastName: u.user_metadata?.lastName || '',
          } : null])
        );
        
        return transcriptAccess.map((ta: any) => {
          const transcript = transcripts?.find((t: any) => t.id === ta.transcription_id);
          return {
            transcript: transcript ? {
              id: transcript.id,
              job: transcript.jobs ? {
                id: transcript.jobs.id,
                caseName: transcript.jobs.case_name,
                caseNumber: transcript.jobs.case_number,
                depositionDate: transcript.jobs.deposition_date,
                title: transcript.jobs.title,
                status: transcript.jobs.status,
              } : null,
            } : null,
            accessLevel: ta.access_level,
            grantedBy: grantedByMap.get(ta.granted_by_id),
            createdAt: ta.created_at,
            lastAccessedAt: ta.last_accessed_at,
            expiresAt: ta.expires_at,
            accessCount: ta.access_count || 0,
          };
        });
      })(),
      
      // Upcoming Depositions: From calendar events
      (async () => {
        const { data: events } = await supabase
          .from('calendar_events')
          .select('*, jobs(*)')
          .gte('start_time', new Date().toISOString())
          .in('event_type', ['DEPOSITION', 'HEARING', 'ARBITRATION', 'MEDIATION', 'EUO'])
          .order('start_time', { ascending: true })
          .limit(10);
        
        if (!events) return [];
        
        // Get assigned reporter info
        const reporterIds = events
          .map((e: any) => e.assigned_reporter_id)
          .filter(Boolean);
        const reporters = await Promise.all(
          reporterIds.map(id => getUserById(supabase, id))
        );
        const reporterMap = new Map(
          reporters.map((r: any, i: number) => [reporterIds[i], r ? {
            id: r.id,
            firstName: r.user_metadata?.firstName || '',
            lastName: r.user_metadata?.lastName || '',
            email: r.email || '',
          } : null])
        );
        
        return events.map((event: any) => ({
          id: event.id,
          title: event.title,
          eventType: event.event_type,
          startTime: event.start_time,
          endTime: event.end_time,
          location: event.location,
          isRemote: event.is_remote,
          meetingLink: event.meeting_link,
          job: event.jobs ? {
            id: event.jobs.id,
            caseName: event.jobs.case_name,
            caseNumber: event.jobs.case_number,
            title: event.jobs.title,
          } : null,
          reporter: event.assigned_reporter_id ? reporterMap.get(event.assigned_reporter_id) : null,
          status: event.status,
        }));
      })(),
      
      // Recent Activity: Track recent shares and access
      (async () => {
        const { data: shares } = await supabase
          .from('transcript_shares')
          .select('*')
          .or(`created_by_id.eq.${currentUser.id},recipient_email.eq.${currentUser.email}`)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (!shares) return [];
        
        // Get transcript and job info
        const transcriptIds = shares.map((s: any) => s.transcription_id);
        const { data: transcripts } = await supabase
          .from('transcriptions')
          .select('*, jobs(*)')
          .in('id', transcriptIds);
        
        const sharedByIds = [...new Set(shares.map((s: any) => s.created_by_id))];
        const sharedByUsers = await Promise.all(
          sharedByIds.map(id => getUserById(supabase, id))
        );
        const sharedByMap = new Map(
          sharedByUsers.map((u: any, i: number) => [sharedByIds[i], u ? {
            firstName: u.user_metadata?.firstName || '',
            lastName: u.user_metadata?.lastName || '',
          } : null])
        );
        
        return shares.map((share: any) => {
          const transcript = transcripts?.find((t: any) => t.id === share.transcription_id);
          return {
            ...share,
            transcript: transcript ? {
              id: transcript.id,
              job: transcript.jobs ? {
                caseName: transcript.jobs.case_name,
                caseNumber: transcript.jobs.case_number,
              } : null,
            } : null,
            sharedBy: sharedByMap.get(share.created_by_id),
          };
        });
      })(),
      
      // Annotation Stats: Count user's annotations
      Promise.all([
        supabase.from('transcript_highlights').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id),
        supabase.from('transcript_notes').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id),
        supabase.from('transcript_bookmarks').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id),
      ]).then(([highlights, notes, bookmarks]) => [
        highlights.count || 0,
        notes.count || 0,
        bookmarks.count || 0,
      ]),
    ]);
    
    // Process and format data
    const formattedCases = (casesResult as any[]).map((ca: any) => ({
      id: ca.case.id,
      caseNumber: ca.case.case_number || ca.case.caseNumber,
      caseStyle: ca.case.case_style || ca.case.caseStyle,
      shortTitle: ca.case.short_title || ca.case.shortTitle,
      status: ca.case.status,
      courtName: ca.case.court_name || ca.case.courtName,
      firm: ca.case.firm || null,
      role: ca.case.role,
      recentJobs: ca.case.jobs || [],
      jobCount: ca.case._count?.jobs || 0,
    }));
    
    const formattedTranscripts = (recentTranscripts as any[]).map((ta: any) => ({
      id: ta.transcript.id,
      accessLevel: ta.accessLevel,
      grantedAt: ta.createdAt,
      grantedBy: ta.grantedBy,
      lastAccessed: ta.lastAccessedAt,
      accessCount: ta.accessCount,
      job: ta.transcript.job,
      expiresAt: ta.expiresAt,
    }));
    
    const formattedDepositions = (upcomingDepositions as any[]).map((event: any) => ({
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
      activeCases: formattedCases.filter((c: any) => c.status === 'ACTIVE').length,
      accessibleTranscripts: recentTranscripts.length,
      upcomingDepositions: (upcomingDepositions as any[]).length,
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
      profile: attorneyProfile,
    });
  } catch (error) {
    console.error('Attorney dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.ATTORNEY, UserRole.COURT_REPORTER] },
  GETHandler as any
);

