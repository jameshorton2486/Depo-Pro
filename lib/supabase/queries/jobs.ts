// ═══════════════════════════════════════════════════════════════
// JOB QUERY FUNCTIONS
// lib/supabase/queries/jobs.ts
// ═══════════════════════════════════════════════════════════════
// All database access for jobs goes through these functions

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Job as _Job, JobFile as _JobFile, Transcript as _Transcript, JobAssignment as _JobAssignment } from '@/types/database';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Get job by ID with optional includes
 */
export async function getJobById(
  supabase: SupabaseClient,
  jobId: string,
  options?: {
    includeCreatedBy?: boolean;
    includeAssignments?: boolean;
    includeFiles?: boolean;
    includeTranscripts?: boolean;
    includeTranscription?: boolean;
  }
) {
  // Base query - always fetch job
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobError) {
    if (jobError.code === 'PGRST116') {
      return null; // Not found
    }
    throw jobError;
  }

  if (!job) return null;

  // Fetch related data based on includes
  const result: any = { ...job };

  // Include createdBy user
  if (options?.includeCreatedBy) {
    const adminClient = getSupabaseAdminClient();
    const { data: userData } = await adminClient.auth.admin.getUserById(job.created_by_id);
    if (userData?.user) {
      result.createdBy = {
        id: userData.user.id,
        firstName: userData.user.user_metadata?.firstName || '',
        lastName: userData.user.user_metadata?.lastName || '',
        email: userData.user.email || '',
      };
    }
  }

  // Include assignments with scopist
  if (options?.includeAssignments) {
    const { data: assignments, error: assignmentsError } = await supabase
      .from('job_assignments')
      .select('*')
      .eq('job_id', jobId);

    if (!assignmentsError && assignments) {
      // Fetch scopist info for each assignment
      const assignmentsWithScopist = await Promise.all(
        assignments.map(async (assignment) => {
          const adminClient = getSupabaseAdminClient();
          const { data: scopistData } = await adminClient.auth.admin.getUserById(assignment.scopist_id);
          return {
            ...assignment,
            scopist: scopistData?.user ? {
              id: scopistData.user.id,
              firstName: scopistData.user.user_metadata?.firstName || '',
              lastName: scopistData.user.user_metadata?.lastName || '',
              email: scopistData.user.email || '',
            } : null,
          };
        })
      );
      result.assignments = assignmentsWithScopist;
    } else {
      result.assignments = [];
    }
  }

  // Include files (ordered by created_at desc)
  if (options?.includeFiles) {
    const { data: files, error: filesError } = await supabase
      .from('job_files')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (!filesError && files) {
      result.files = files.map((file: any) => ({
        ...file,
        url: file.storage_url || file.url,
      }));
    } else {
      result.files = [];
    }
  }

  // Include transcripts (ordered by version_number desc)
  if (options?.includeTranscripts) {
    const { data: transcripts, error: transcriptsError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('job_id', jobId)
      .order('version_number', { ascending: false });

    if (!transcriptsError && transcripts) {
      result.transcripts = transcripts;
    } else {
      result.transcripts = [];
    }
  }

  // Include transcription
  if (options?.includeTranscription) {
    const { data: transcription, error: transcriptionError } = await supabase
      .from('transcriptions')
      .select('id, words, utterances, full_transcript, word_count, flagged_word_count, average_confidence, status')
      .eq('job_id', jobId)
      .maybeSingle();

    if (!transcriptionError && transcription) {
      // Transform utterances to segments format
      if (transcription.utterances) {
        const utterances = Array.isArray(transcription.utterances)
          ? transcription.utterances
          : JSON.parse(transcription.utterances as string || '[]');

        (transcription as any).segments = utterances.map((utterance: any) => ({
          speaker: utterance.speaker || 0,
          words: utterance.words || [],
          start: utterance.start || 0,
          end: utterance.end || 0,
        }));
      } else if (transcription.words) {
        // Fallback: create segments from words
        const words = Array.isArray(transcription.words)
          ? transcription.words
          : JSON.parse(transcription.words as string || '[]');

        const segmentsMap = new Map<number, any[]>();
        words.forEach((word: any) => {
          const speaker = word.speaker || 0;
          if (!segmentsMap.has(speaker)) {
            segmentsMap.set(speaker, []);
          }
          segmentsMap.get(speaker)!.push(word);
        });

        (transcription as any).segments = Array.from(segmentsMap.entries()).map(([speaker, wordsArray]) => ({
          speaker,
          words: wordsArray,
          start: wordsArray[0]?.start || 0,
          end: wordsArray[wordsArray.length - 1]?.end || 0,
        }));
      }

      result.transcription = {
        id: transcription.id,
        words: transcription.words,
        utterances: transcription.utterances,
        fullTranscript: transcription.full_transcript,
        wordCount: transcription.word_count,
        flaggedWordCount: transcription.flagged_word_count,
        averageConfidence: transcription.average_confidence,
        status: transcription.status,
        segments: (transcription as any).segments,
      };
    }
  }

  return result;
}

/**
 * Get job by ID (minimal - just for access checks)
 */
export async function getJobForAccessCheck(
  supabase: SupabaseClient,
  jobId: string
) {
  const { data, error } = await supabase
    .from('jobs')
    .select('id, created_by_id, firm_id')
    .eq('id', jobId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Get job with assignments (for status checks)
 */
export async function getJobWithAssignments(
  supabase: SupabaseClient,
  jobId: string
) {
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, created_by_id, status')
    .eq('id', jobId)
    .single();

  if (jobError) {
    if (jobError.code === 'PGRST116') {
      return null;
    }
    throw jobError;
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from('job_assignments')
    .select('scopist_id')
    .eq('job_id', jobId);

  if (assignmentsError) {
    throw assignmentsError;
  }

  return {
    ...job,
    assignments: assignments || [],
  };
}

/**
 * Check if a user is assigned to a job as a scopist
 */
export async function isUserAssignedToJob(
  jobId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('job_assignments')
    .select('id')
    .eq('job_id', jobId)
    .eq('scopist_id', userId)
    .maybeSingle();

  if (error) {
    return false;
  }

  return !!data;
}

/**
 * Update job
 */
export async function updateJob(
  supabase: SupabaseClient,
  jobId: string,
  updates: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from('jobs')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update job status
 */
export async function updateJobStatus(
  supabase: SupabaseClient,
  jobId: string,
  status: string
) {
  const { data, error } = await supabase
    .from('jobs')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .select('id, status')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete job
 */
export async function deleteJob(
  supabase: SupabaseClient,
  jobId: string
) {
  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', jobId);

  if (error) throw error;
  return { success: true };
}

/**
 * List jobs with role-based filtering
 */
export async function listJobs(
  supabase: SupabaseClient,
  userId: string,
  userRole: string,
  options?: {
    limit?: number;
  }
) {
  // Build base query
  let query = supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(options?.limit || 50);

  // Apply role-based filtering
  if (userRole === 'REPORTER') {
    query = query.eq('created_by_id', userId);
  } else if (userRole === 'SCOPIST') {
    // For scopists, we need to join with assignments
    // First get assignment job IDs
    const { data: assignments } = await supabase
      .from('job_assignments')
      .select('job_id')
      .eq('scopist_id', userId)
      .eq('status', 'ACCEPTED');

    if (assignments && assignments.length > 0) {
      const jobIds = assignments.map(a => a.job_id);
      query = query.in('id', jobIds);
    } else {
      // No assignments, return empty
      return { jobs: [], count: 0 };
    }
  }
  // Admin can see all (no filter)

  const { data: jobs, error } = await query;

  if (error) throw error;

  // Fetch related data for each job
  const jobsWithRelations = await Promise.all(
    (jobs || []).map(async (job) => {
      const result: any = { ...job };

      // Fetch createdBy user via Admin API
      const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
      const adminClient = getSupabaseAdminClient();
      const { data: userData } = await adminClient.auth.admin.getUserById(job.created_by_id);

      if (userData?.user) {
        result.createdBy = {
          id: userData.user.id,
          firstName: userData.user.user_metadata?.firstName || '',
          lastName: userData.user.user_metadata?.lastName || '',
        };
      }

      // Fetch assignments (only ACCEPTED, limit 1)
      const { data: assignments } = await supabase
        .from('job_assignments')
        .select('id, status, scopist_id')
        .eq('job_id', job.id)
        .eq('status', 'ACCEPTED')
        .limit(1);

      if (assignments && assignments.length > 0) {
        const assignment = assignments[0];
        const { data: scopistData } = await adminClient.auth.admin.getUserById(assignment.scopist_id);

        result.assignments = [{
          id: assignment.id,
          status: assignment.status,
          scopistId: assignment.scopist_id,
          scopist: scopistData?.user ? {
            id: scopistData.user.id,
            firstName: scopistData.user.user_metadata?.firstName || '',
            lastName: scopistData.user.user_metadata?.lastName || '',
          } : null,
        }];
      } else {
        result.assignments = [];
      }

      return result;
    })
  );

  return { jobs: jobsWithRelations, count: jobsWithRelations.length };
}

/**
 * Create a new job
 */
export async function createJob(
  supabase: SupabaseClient,
  jobData: {
    title: string;
    caseName: string;
    caseNumber?: string | null;
    depositionDate: string;
    firmId: string | null;
    createdById: string;
    deponentName?: string | null;
    location?: string | null;
    notes?: string | null;
  }
) {
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      title: jobData.title,
      case_name: jobData.caseName,
      case_number: jobData.caseNumber || null,
      deposition_date: jobData.depositionDate,
      status: 'CREATED',
      created_by_id: jobData.createdById,
      firm_id: jobData.firmId,
      deponent_name: jobData.deponentName || null,
      location: jobData.location || null,
      notes: jobData.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw error;
  return data;
}
// ═══════════════════════════════════════════════════════════════
// JOB ASSIGNMENT FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get assignment by ID
 */
export async function getAssignmentById(
  supabase: SupabaseClient,
  assignmentId: string
) {
  const { data, error } = await supabase
    .from('job_assignments')
    .select('*')
    .eq('id', assignmentId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Get assignment by job and scopist
 */
export async function getAssignmentByJobAndScopist(
  supabase: SupabaseClient,
  jobId: string,
  scopistId: string
) {
  const { data, error } = await supabase
    .from('job_assignments')
    .select('*')
    .eq('job_id', jobId)
    .eq('scopist_id', scopistId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Create job assignment
 */
export async function createJobAssignment(
  supabase: SupabaseClient,
  data: {
    job_id: string;
    scopist_id: string;
    status: string;
    scopist_notes?: string | null;
  }
) {
  const { data: result, error } = await supabase
    .from('job_assignments')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return result;
}

/**
 * Update job assignment
 */
export async function updateJobAssignment(
  supabase: SupabaseClient,
  assignmentId: string,
  updates: Record<string, any>
) {
  const { data, error } = await supabase
    .from('job_assignments')
    .update(updates)
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete job assignment
 */
export async function deleteJobAssignment(
  supabase: SupabaseClient,
  assignmentId: string
) {
  const { error } = await supabase
    .from('job_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) throw error;
}
