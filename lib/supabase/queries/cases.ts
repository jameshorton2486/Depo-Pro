// ═══════════════════════════════════════════════════════════════
// CASE QUERY FUNCTIONS
// lib/supabase/queries/cases.ts
// ═══════════════════════════════════════════════════════════════
// All database access for cases goes through these functions

import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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

/**
 * Create a case with initial job and related records
 * Used by the case intake route
 */
export async function createCaseWithInitialJob(
  input: {
    // Case data
    firmId: string;
    createdById: string;
    caseNumber?: string | null;
    caseStyle?: string | null;
    shortTitle?: string | null;
    courtName?: string | null;
    courtType?: string | null;
    county?: string | null;
    state?: string | null;
    judgeAssigned?: string | null;
    plaintiffs?: Array<{ name: string; type: string; role?: string }>;
    defendants?: Array<{ name: string; type: string; role?: string }>;
    otherParties?: Array<{ name: string; type: string; role: string }>;
    attorneys?: Array<{
      name: string;
      barNumber?: string | null;
      firm?: string | null;
      role: string;
      representing?: string | null;
      email?: string | null;
      phone?: string | null;
      fax?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      zip?: string | null;
      deliveryFormat?: string | null;
      deliveryPriority?: string | null;
    }>;
    extractedTerms?: Array<{
      term: string;
      normalizedTerm: string;
      category: string;
      source: string;
    }>;
    // Job data (if createJob is true)
    createJob?: boolean;
    jobData?: Record<string, unknown>;
  }
): Promise<{ success: boolean; data?: { caseId: string; jobId?: string }; error?: string }> {
  const supabase = await createSupabaseServerClient();
  
  try {
    let caseId: string | undefined;

    // Create case if requested
    if (input.caseNumber || input.caseStyle) {
      const caseData: Record<string, unknown> = {
        firm_id: input.firmId,
        created_by_id: input.createdById,
        case_number: input.caseNumber || `TEMP-${Date.now()}`,
        case_style: input.caseStyle || 'Unknown Case',
        short_title: input.shortTitle || null,
        court_name: input.courtName || null,
        court_type: input.courtType || null,
        county: input.county || null,
        state: input.state || 'Texas',
        judge_assigned: input.judgeAssigned || null,
        plaintiffs: input.plaintiffs || [],
        defendants: input.defendants || [],
        other_parties: input.otherParties || [],
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: newCase, error: caseError } = await supabase
        .from('cases')
        .insert(caseData)
        .select('id')
        .single();

      if (caseError) {
        return { success: false, error: caseError.message };
      }

      caseId = newCase.id;

      // Create attorney records
      if (input.attorneys && input.attorneys.length > 0) {
        const attorneyData = input.attorneys.map(att => ({
          case_id: caseId,
          name: att.name,
          bar_number: att.barNumber || null,
          firm: att.firm || null,
          role: mapAttorneyRole(att.role),
          representing: att.representing || null,
          email: att.email || null,
          phone: att.phone || null,
          fax: att.fax || null,
          address: att.address || null,
          city: att.city || null,
          state: att.state || null,
          zip_code: att.zip || null,
          delivery_format: att.deliveryFormat || null,
          delivery_priority: att.deliveryPriority || null,
        }));

        const { error: attorneyError } = await supabase
          .from('case_attorneys')
          .insert(attorneyData);

        if (attorneyError) {
          // Log but don't fail - attorneys are optional
          console.warn('Failed to create case attorneys:', attorneyError);
        }
      }

      // Create extracted terms
      if (input.extractedTerms && input.extractedTerms.length > 0) {
        const termData = input.extractedTerms.map(term => ({
          case_id: caseId,
          term: term.term,
          normalized_term: term.normalizedTerm,
          category: mapTermCategory(term.category),
          source: term.source,
          use_in_transcription: true,
        }));

        // Use insert with ignore duplicates
        const { error: termError } = await supabase
          .from('case_extracted_terms')
          .insert(termData);

        if (termError) {
          // Log but don't fail - terms are optional
          console.warn('Failed to create extracted terms:', termError);
        }
      }
    }

    // Create job if requested
    let jobId: string | undefined;
    if (input.createJob && input.jobData) {
      const { data: newJob, error: jobError } = await supabase
        .from('jobs')
        .insert({
          ...input.jobData,
          case_id: caseId || null,
          created_by_id: input.createdById,
          firm_id: input.firmId,
          status: 'CREATED',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (jobError) {
        return { success: false, error: jobError.message };
      }

      jobId = newJob.id;
    }

    return {
      success: true,
      data: {
        caseId: caseId || '',
        jobId,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Helper: Map attorney role string to enum
 */
function mapAttorneyRole(role: string): 'PLAINTIFF_COUNSEL' | 'DEFENSE_COUNSEL' | 'ORDERING_ATTORNEY' | 'COPY_ATTORNEY' | 'OTHER' {
  const roleMap: Record<string, 'PLAINTIFF_COUNSEL' | 'DEFENSE_COUNSEL' | 'ORDERING_ATTORNEY' | 'COPY_ATTORNEY' | 'OTHER'> = {
    'ordering': 'ORDERING_ATTORNEY',
    'copy': 'COPY_ATTORNEY',
    'plaintiff': 'PLAINTIFF_COUNSEL',
    'defense': 'DEFENSE_COUNSEL',
    'other': 'OTHER',
  };
  return roleMap[role.toLowerCase()] || 'OTHER';
}

/**
 * Helper: Map term category string to enum
 */
function mapTermCategory(category: string): 'PERSON_NAME' | 'COMPANY_NAME' | 'PLACE_NAME' | 'LEGAL_TERM' | 'MEDICAL_TERM' | 'TECHNICAL_TERM' | 'CASE_SPECIFIC' {
  const categoryMap: Record<string, 'PERSON_NAME' | 'COMPANY_NAME' | 'PLACE_NAME' | 'LEGAL_TERM' | 'MEDICAL_TERM' | 'TECHNICAL_TERM' | 'CASE_SPECIFIC'> = {
    'person_name': 'PERSON_NAME',
    'company_name': 'COMPANY_NAME',
    'place_name': 'PLACE_NAME',
    'legal_term': 'LEGAL_TERM',
    'medical_term': 'MEDICAL_TERM',
    'technical_term': 'TECHNICAL_TERM',
    'case_specific': 'CASE_SPECIFIC',
    'attorney_name': 'PERSON_NAME',
    'witness_name': 'PERSON_NAME',
    'product_name': 'CASE_SPECIFIC',
    'vehicle_info': 'CASE_SPECIFIC',
  };
  return categoryMap[category.toLowerCase()] || 'CASE_SPECIFIC';
}
