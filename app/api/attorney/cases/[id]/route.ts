// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3.2.3: ATTORNEY CASE DETAIL API ROUTE
// ═══════════════════════════════════════════════════════════════════════════════
// File: app/api/attorney/cases/[id]/route.ts
// Provides detailed case view for attorneys
// ═══════════════════════════════════════════════════════════════════════════════

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserById } from '@/lib/supabase/queries/users';
import { getCaseById } from '@/lib/supabase/queries/cases';
import { getTranscriptByJobId } from '@/lib/supabase/queries/transcripts';

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

    const supabase = await createSupabaseServerClient();

    // Verify user is an attorney
    const userData = await getUserById(supabase, session.user.id);

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRole = userData.user_metadata?.role as string;
    if (userRole !== 'ATTORNEY') {
      return NextResponse.json({ error: 'Attorney access required' }, { status: 403 });
    }

    // Get case with access check
    const caseData = await getCaseById(supabase, id, session.user.id);

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found or access denied' }, { status: 404 });
    }

    // Get additional case data
    const { data: firm } = await supabase
      .from('firms')
      .select('id, name, address, phone')
      .eq('id', (caseData as any).firm_id)
      .maybeSingle();

    const { data: caseAttorneys } = await supabase
      .from('case_attorneys')
      .select('id, name, email, role, firm, phone, bar_number')
      .eq('case_id', id);

    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, case_name, case_number, deposition_date, deponent_name, deponent_role, deponent_company, status, created_by_id')
      .eq('case_id', id)
      .order('deposition_date', { ascending: false });

    // Get jobs with transcripts and files
    const jobsWithDetails = await Promise.all(
      (jobs || []).map(async (job: any) => {
        const transcripts = await getTranscriptByJobId(supabase, job.id);
        const { data: files } = await supabase
          .from('job_files')
          .select('id, type, file_name, file_size, created_at')
          .eq('job_id', job.id);

        const { count: transcriptCount } = await supabase
          .from('transcriptions')
          .select('*', { count: 'exact', head: true })
          .eq('job_id', job.id);

        const { count: exhibitCount } = await supabase
          .from('exhibits')
          .select('*', { count: 'exact', head: true })
          .eq('job_id', job.id);

        const createdBy = await getUserById(supabase, job.created_by_id);

        return {
          ...job,
          createdBy: createdBy ? {
            id: createdBy.id,
            firstName: createdBy.user_metadata?.firstName || '',
            lastName: createdBy.user_metadata?.lastName || '',
          } : null,
          transcripts: transcripts ? [{
            id: transcripts.id,
            version: transcripts.version || null,
            versionNumber: transcripts.version_number || null,
            createdAt: transcripts.created_at,
          }] : [],
          files: files || [],
          _count: {
            transcripts: transcriptCount || 0,
            exhibits: exhibitCount || 0,
          },
        };
      })
    );

    const { data: extractedTerms } = await supabase
      .from('extracted_terms')
      .select('id, term, category')
      .eq('case_id', id)
      .limit(50);

    const { data: sourceDocuments } = await supabase
      .from('source_documents')
      .select('id, file_name, document_type, uploaded_at, extraction_status')
      .eq('case_id', id)
      .order('uploaded_at', { ascending: false });

    const { data: memberships } = await supabase
      .from('case_memberships')
      .select('*, users(*)')
      .eq('case_id', id);

    const { count: jobCount } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('case_id', id);

    const { count: attorneyCount } = await supabase
      .from('case_attorneys')
      .select('*', { count: 'exact', head: true })
      .eq('case_id', id);

    const caseWithRelations = {
      ...caseData,
      firm,
      createdBy: await getUserById(supabase, (caseData as any).created_by_id),
      attorneys: caseAttorneys || [],
      jobs: jobsWithDetails,
      extractedTerms: extractedTerms || [],
      sourceDocuments: sourceDocuments || [],
      memberships: (memberships || []).map((m: any) => ({
        ...m,
        user: m.users ? {
          id: m.users.id,
          firstName: m.users.user_metadata?.firstName || '',
          lastName: m.users.user_metadata?.lastName || '',
          email: m.users.email || '',
          role: m.users.user_metadata?.role || '',
        } : null,
        roleInCase: m.role_in_case,
        createdAt: m.created_at,
      })),
      _count: {
        jobs: jobCount || 0,
        attorneys: attorneyCount || 0,
        extractedTerms: extractedTerms?.length || 0,
        sourceDocuments: sourceDocuments?.length || 0,
      },
    } as any;

    // Get transcript access grants separately for each transcript
    const transcriptIds = caseWithRelations.jobs?.flatMap((job: any) =>
      job.transcripts?.map((t: any) => t.id) || []
    ).filter(Boolean) || [];

    const { data: accessGrants } = transcriptIds.length > 0 ? await supabase
      .from('transcript_access')
      .select('transcription_id, access_level, expires_at, last_accessed_at')
      .in('transcription_id', transcriptIds)
      .eq('user_id', session.user.id) : { data: [] };

    const accessMap = new Map(
      (accessGrants || []).map((grant: any) => [grant.transcription_id, {
        transcriptId: grant.transcription_id,
        accessLevel: grant.access_level,
        expiresAt: grant.expires_at ? new Date(grant.expires_at) : null,
        lastAccessedAt: grant.last_accessed_at ? new Date(grant.last_accessed_at) : null,
      }])
    );

    // Get attorney's role in this case
    const attorneyEntry = caseWithRelations.attorneys?.find((a: any) => a.email === userData.email);

    // Format jobs with transcript access info
    const jobsWithAccess = caseWithRelations.jobs?.map((job: any) => ({
      id: job.id,
      caseName: job.case_name || job.caseName,
      caseNumber: job.case_number || job.caseNumber,
      depositionDate: job.deposition_date || job.depositionDate,
      deponentName: job.deponent_name || job.deponentName,
      deponentRole: job.deponent_role || job.deponentRole,
      deponentCompany: job.deponent_company || job.deponentCompany,
      status: job.status,
      createdBy: job.createdBy,
      files: job.files || [],
      transcripts: job.transcripts?.map((t: any) => {
        const access = accessMap.get(t.id);
        return {
          id: t.id,
          version: t.version,
          versionNumber: t.versionNumber || t.version_number,
          createdAt: t.createdAt || t.created_at,
          hasAccess: !!access,
          accessLevel: access?.accessLevel || null,
          accessExpires: access?.expiresAt || null,
          lastAccessed: access?.lastAccessedAt || null,
        };
      }) || [],
      counts: job._count || {},
    })) || [];

    // Parse JSON fields safely
    let plaintiffs = [];
    let defendants = [];
    let otherParties = [];

    try {
      const plaintiffsData = (caseWithRelations as any).plaintiffs;
      const defendantsData = (caseWithRelations as any).defendants;
      const otherPartiesData = (caseWithRelations as any).other_parties;

      plaintiffs = plaintiffsData ? (typeof plaintiffsData === 'string' ? JSON.parse(plaintiffsData) : plaintiffsData) : [];
      defendants = defendantsData ? (typeof defendantsData === 'string' ? JSON.parse(defendantsData) : defendantsData) : [];
      otherParties = otherPartiesData ? (typeof otherPartiesData === 'string' ? JSON.parse(otherPartiesData) : otherPartiesData) : [];
    } catch {
      // If parsing fails, keep empty arrays
    }

    return NextResponse.json({
      case: {
        id: caseWithRelations.id,
        caseNumber: (caseWithRelations as any).case_number || (caseWithRelations as any).caseNumber,
        caseStyle: (caseWithRelations as any).case_style || (caseWithRelations as any).caseStyle,
        shortTitle: (caseWithRelations as any).short_title || (caseWithRelations as any).shortTitle,
        status: caseWithRelations.status,
        caseType: (caseWithRelations as any).case_style || (caseWithRelations as any).caseStyle,

        // Court info
        courtName: (caseWithRelations as any).court_name || (caseWithRelations as any).courtName,
        courtType: (caseWithRelations as any).court_type || (caseWithRelations as any).courtType,
        county: (caseWithRelations as any).county,
        state: (caseWithRelations as any).state,
        judgeAssigned: (caseWithRelations as any).judge_assigned || (caseWithRelations as any).judgeAssigned,

        // Parties
        plaintiffs,
        defendants,
        otherParties,

        // Related data
        firm: caseWithRelations.firm || null,
        createdBy: caseWithRelations.createdBy ? {
          id: caseWithRelations.createdBy.id,
          firstName: caseWithRelations.createdBy.user_metadata?.firstName || '',
          lastName: caseWithRelations.createdBy.user_metadata?.lastName || '',
          email: caseWithRelations.createdBy.email || '',
        } : null,
        attorneys: caseWithRelations.attorneys || [],

        // Current user's role
        myRole: attorneyEntry?.role || 'VIEWER',

        // Jobs and transcripts
        jobs: jobsWithAccess,

        // Dictionary terms
        extractedTerms: caseWithRelations.extractedTerms || [],

        // Source documents
        sourceDocuments: caseWithRelations.sourceDocuments || [],

        // Team members
        teamMembers: (caseWithRelations.memberships || []).map((m: any) => ({
          ...m.user,
          roleInCase: m.role_in_case || m.roleInCase,
          joinedAt: m.created_at || m.createdAt,
        })),

        // Counts
        counts: caseWithRelations._count || {},

        // Timestamps
        createdAt: (caseWithRelations as any).created_at || (caseWithRelations as any).createdAt,
        updatedAt: (caseWithRelations as any).updated_at || (caseWithRelations as any).updatedAt,
        notes: (caseWithRelations as any).notes,
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
