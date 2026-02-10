/**
 * Vocabulary Query Layer for Depo-Pro v1.3
 *
 * Manages job-specific and firm-wide vocabulary terms
 * Terms are used to boost Deepgram keyword recognition
 */

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase-generated';

type JobVocabularyInsert = Database['public']['Tables']['job_vocabulary']['Insert'];
type FirmVocabularyInsert = Database['public']['Tables']['firm_vocabulary']['Insert'];

/**
 * Get all vocabulary terms for a job
 * Returns job-specific terms only
 */
export async function getJobVocabulary(jobId: string) {
  const supabase = await createClient();

  return await supabase
    .from('job_vocabulary')
    .select('*')
    .eq('job_id', jobId)
    .order('term', { ascending: true });
}

/**
 * Get all firm vocabulary terms
 */
export async function getFirmVocabulary(firmId: string) {
  const supabase = await createClient();

  return await supabase
    .from('firm_vocabulary')
    .select('*')
    .eq('firm_id', firmId)
    .order('term', { ascending: true });
}

/**
 * Get merged vocabulary (job + firm)
 * Returns deduplicated list of terms for Deepgram
 */
export async function getMergedVocabulary(jobId: string, firmId: string) {
  const supabase = await createClient();

  const [jobResult, firmResult] = await Promise.all([
    supabase
      .from('job_vocabulary')
      .select('term, boost_factor')
      .eq('job_id', jobId),
    supabase
      .from('firm_vocabulary')
      .select('term, boost_factor')
      .eq('firm_id', firmId),
  ]);

  if (jobResult.error || firmResult.error) {
    return {
      data: null,
      error: jobResult.error || firmResult.error,
    };
  }

  // Merge and deduplicate (job terms take precedence)
  const termMap = new Map<string, number>();

  firmResult.data?.forEach((item) => {
    termMap.set(item.term.toLowerCase(), item.boost_factor || 1.0);
  });

  jobResult.data?.forEach((item) => {
    termMap.set(item.term.toLowerCase(), item.boost_factor || 1.0);
  });

  const merged = Array.from(termMap.entries()).map(([term, boost]) => ({
    term,
    boost_factor: boost,
  }));

  return { data: merged, error: null };
}

/**
 * Add a term to job vocabulary
 */
export async function addJobTerm(data: {
  job_id: string;
  term: string;
  boost_factor?: number;
  phonetic_spelling?: string | null;
  added_by: string;
}) {
  const supabase = await createClient();

  const termData: JobVocabularyInsert = {
    job_id: data.job_id,
    term: data.term,
    boost_factor: data.boost_factor || 1.0,
    phonetic_spelling: data.phonetic_spelling || null,
    added_by: data.added_by,
    created_at: new Date().toISOString(),
  };

  return await supabase
    .from('job_vocabulary')
    .insert(termData)
    .select()
    .single();
}

/**
 * Add a term to firm vocabulary
 */
export async function addFirmTerm(data: {
  firm_id: string;
  term: string;
  boost_factor?: number;
  phonetic_spelling?: string | null;
  added_by: string;
}) {
  const supabase = await createClient();

  const termData: FirmVocabularyInsert = {
    firm_id: data.firm_id,
    term: data.term,
    boost_factor: data.boost_factor || 1.0,
    phonetic_spelling: data.phonetic_spelling || null,
    added_by: data.added_by,
    created_at: new Date().toISOString(),
  };

  return await supabase
    .from('firm_vocabulary')
    .insert(termData)
    .select()
    .single();
}

/**
 * Bulk add job vocabulary terms
 */
export async function bulkAddJobTerms(
  jobId: string,
  terms: Array<{
    term: string;
    boost_factor?: number;
    phonetic_spelling?: string | null;
  }>,
  addedBy: string
) {
  const supabase = await createClient();

  const termData = terms.map(
    (term): JobVocabularyInsert => ({
      job_id: jobId,
      term: term.term,
      boost_factor: term.boost_factor || 1.0,
      phonetic_spelling: term.phonetic_spelling || null,
      added_by: addedBy,
      created_at: new Date().toISOString(),
    })
  );

  return await supabase
    .from('job_vocabulary')
    .insert(termData)
    .select();
}

/**
 * Bulk add firm vocabulary terms
 */
export async function bulkAddFirmTerms(
  firmId: string,
  terms: Array<{
    term: string;
    boost_factor?: number;
    phonetic_spelling?: string | null;
  }>,
  addedBy: string
) {
  const supabase = await createClient();

  const termData = terms.map(
    (term): FirmVocabularyInsert => ({
      firm_id: firmId,
      term: term.term,
      boost_factor: term.boost_factor || 1.0,
      phonetic_spelling: term.phonetic_spelling || null,
      added_by: addedBy,
      created_at: new Date().toISOString(),
    })
  );

  return await supabase
    .from('firm_vocabulary')
    .insert(termData)
    .select();
}

/**
 * Update a job vocabulary term
 */
export async function updateJobTerm(
  termId: string,
  updates: {
    term?: string;
    boost_factor?: number;
    phonetic_spelling?: string | null;
  }
) {
  const supabase = await createClient();

  return await supabase
    .from('job_vocabulary')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', termId)
    .select()
    .single();
}

/**
 * Update a firm vocabulary term
 */
export async function updateFirmTerm(
  termId: string,
  updates: {
    term?: string;
    boost_factor?: number;
    phonetic_spelling?: string | null;
  }
) {
  const supabase = await createClient();

  return await supabase
    .from('firm_vocabulary')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', termId)
    .select()
    .single();
}

/**
 * Delete a job vocabulary term
 */
export async function deleteJobTerm(termId: string) {
  const supabase = await createClient();

  return await supabase
    .from('job_vocabulary')
    .delete()
    .eq('id', termId);
}

/**
 * Delete a firm vocabulary term
 */
export async function deleteFirmTerm(termId: string) {
  const supabase = await createClient();

  return await supabase
    .from('firm_vocabulary')
    .delete()
    .eq('id', termId);
}

/**
 * Search job vocabulary
 */
export async function searchJobVocabulary(jobId: string, searchTerm: string) {
  const supabase = await createClient();

  return await supabase
    .from('job_vocabulary')
    .select('*')
    .eq('job_id', jobId)
    .ilike('term', `%${searchTerm}%`)
    .order('term', { ascending: true });
}

/**
 * Search firm vocabulary
 */
export async function searchFirmVocabulary(firmId: string, searchTerm: string) {
  const supabase = await createClient();

  return await supabase
    .from('firm_vocabulary')
    .select('*')
    .eq('firm_id', firmId)
    .ilike('term', `%${searchTerm}%`)
    .order('term', { ascending: true });
}

/**
 * Get vocabulary statistics
 */
export async function getVocabularyStats(jobId: string, firmId: string) {
  const supabase = await createClient();

  const [jobCount, firmCount] = await Promise.all([
    supabase
      .from('job_vocabulary')
      .select('*', { count: 'exact', head: true })
      .eq('job_id', jobId),
    supabase
      .from('firm_vocabulary')
      .select('*', { count: 'exact', head: true })
      .eq('firm_id', firmId),
  ]);

  return {
    data: {
      jobTerms: jobCount.count || 0,
      firmTerms: firmCount.count || 0,
      totalTerms: (jobCount.count || 0) + (firmCount.count || 0),
    },
    error: jobCount.error || firmCount.error,
  };
}

/**
 * Format vocabulary for Deepgram API
 * Returns array of keyword strings with optional boost
 */
export async function getDeepgramKeywords(
  jobId: string,
  firmId: string
): Promise<{ data: string[] | null; error: any }> {
  const { data, error } = await getMergedVocabulary(jobId, firmId);

  if (error || !data) return { data: null, error };

  // Format: "term:boost_factor" or just "term" if boost is 1.0
  const keywords = data.map((item) => {
    if (item.boost_factor === 1.0) {
      return item.term;
    }
    return `${item.term}:${item.boost_factor}`;
  });

  return { data: keywords, error: null };
}
