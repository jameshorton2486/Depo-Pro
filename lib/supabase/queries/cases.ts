// ═══════════════════════════════════════════════════════════════
// CASE QUERY FUNCTIONS
// lib/supabase/queries/cases.ts
// ═══════════════════════════════════════════════════════════════
// All database access for cases goes through these functions

import { SupabaseClient } from '@supabase/supabase-js';

export interface CaseFilter {
  firm_id?: string;
  attorney_id?: string;
  status?: string;
  case_type?: string;
  role?: string;
  court_type?: string;
  state?: string;
  has_transcripts?: boolean;
  date_from?: Date;
  date_to?: Date;
  search?: string;
}

export interface CaseSort {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * List cases with filtering, search, and pagination
 */
export async function listCases(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
  filters: CaseFilter,
  sort: CaseSort,
  pagination: { skip: number; limit: number }
) {
  // Build base query - get all cases the attorney has access to
  // This is complex because we need to check:
  // 1. Direct attorney assignment (case_attorneys table)
  // 2. Case membership (case_memberships table)
  // 3. Transcript access (via jobs -> transcripts -> transcript_access)
  
  // Start with a query that gets all cases
  let query = supabase
    .from('cases')
    .select('*', { count: 'exact' });

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.court_type) {
    query = query.ilike('court_type', `%${filters.court_type}%`);
  }
  if (filters.state) {
    query = query.eq('state', filters.state);
  }
  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from.toISOString());
  }
  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to.toISOString());
  }
  if (filters.search) {
    query = query.or(`case_number.ilike.%${filters.search}%,case_style.ilike.%${filters.search}%,short_title.ilike.%${filters.search}%,court_name.ilike.%${filters.search}%,judge_assigned.ilike.%${filters.search}%`);
  }

  // Apply sorting
  query = query.order(sort.field, { ascending: sort.order === 'asc' });

  // Apply pagination
  query = query.range(pagination.skip, pagination.skip + pagination.limit - 1);

  const { data: cases, error, count } = await query;

  if (error) {
    throw error;
  }

  if (!cases || cases.length === 0) {
    return { cases: [], totalCount: 0 };
  }

  // Now we need to filter by access and enrich with related data
  // Get case IDs that the attorney has access to
  const caseIds = cases.map(c => c.id);

  // Check attorney assignments
  const { data: attorneyAssignments } = await supabase
    .from('case_attorneys')
    .select('case_id, role, attorney_id')
    .in('case_id', caseIds)
    .or(`email.eq.${userEmail},attorney_id.eq.${userId}`);

  // Check memberships
  const { data: memberships } = await supabase
    .from('case_memberships')
    .select('case_id')
    .in('case_id', caseIds)
    .eq('user_id', userId);

  // Get accessible case IDs
  const accessibleCaseIds = new Set<string>();
  attorneyAssignments?.forEach(a => accessibleCaseIds.add(a.case_id));
  memberships?.forEach(m => accessibleCaseIds.add(m.case_id));

  // Filter cases to only accessible ones
  const accessibleCases = cases.filter(c => accessibleCaseIds.has(c.id));

  // Enrich with related data
  const enrichedCases = await Promise.all(
    accessibleCases.map(async (c) => {
      // Get firm
      let firm = null;
      if (c.firm_id) {
        const { data: firmData } = await supabase
          .from('firms')
          .select('id, name')
          .eq('id', c.firm_id)
          .single();
        firm = firmData;
      }

      // Get attorneys for this case
      const { data: caseAttorneys } = await supabase
        .from('case_attorneys')
        .select('id, name, email, role, firm')
        .eq('case_id', c.id);

      // Get recent jobs (limit 5)
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, case_name, case_number, deposition_date, title, status')
        .eq('case_id', c.id)
        .order('deposition_date', { ascending: false })
        .limit(5);

      // Get transcript counts for each job
      const jobsWithTranscripts = await Promise.all(
        (jobs || []).map(async (job) => {
          const { count: transcriptCount } = await supabase
            .from('transcriptions')
            .select('*', { count: 'exact', head: true })
            .eq('job_id', job.id);
          return {
            ...job,
            _count: { transcripts: transcriptCount || 0 },
            hasTranscript: (transcriptCount || 0) > 0,
          };
        })
      );

      // Get counts
      const { count: jobsCount } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('case_id', c.id);

      const { count: attorneysCount } = await supabase
        .from('case_attorneys')
        .select('*', { count: 'exact', head: true })
        .eq('case_id', c.id);

      const { count: termsCount } = await supabase
        .from('case_extracted_terms')
        .select('*', { count: 'exact', head: true })
        .eq('case_id', c.id);

      // Find attorney's role
      const attorneyEntry = caseAttorneys?.find(a => a.email === userEmail);
      const myRole = attorneyEntry?.role || 'VIEWER';

      return {
        id: c.id,
        caseNumber: c.case_number,
        caseStyle: c.case_style,
        shortTitle: c.short_title,
        status: c.status,
        caseType: c.case_style, // Using case_style instead of case_type
        courtName: c.court_name,
        courtType: c.court_type,
        county: c.county,
        state: c.state,
        judgeAssigned: c.judge_assigned,
        firm,
        myRole,
        recentJobs: jobsWithTranscripts,
        attorneys: caseAttorneys || [],
        counts: {
          jobs: jobsCount || 0,
          attorneys: attorneysCount || 0,
          extractedTerms: termsCount || 0,
          sourceDocuments: 0, // TODO: Add if this table exists
        },
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      };
    })
  );

  return {
    cases: enrichedCases,
    totalCount: count || 0,
  };
}

/**
 * Get case by ID
 */
export async function getCaseById(
  supabase: SupabaseClient,
  caseId: string,
  _userId: string
) {
  const { data: case_, error } = await supabase
    .from('cases')
    .select('*')
    .eq('id', caseId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return case_;
}
