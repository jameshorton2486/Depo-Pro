// ═══════════════════════════════════════════════════════════════
// PROPER NOUN QUERY FUNCTIONS
// lib/supabase/queries/proper-nouns.ts
// ═══════════════════════════════════════════════════════════════
// All database access for proper nouns goes through these functions

import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Get proper nouns for a job (via CSR record)
 */
export async function getProperNounsByJob(
  supabase: SupabaseClient,
  jobId: string
) {
  // First, get or create CSR record for this job
  let { data: csrRecord } = await supabase
    .from('csr_records')
    .select('id')
    .eq('job_id', jobId)
    .single();

  if (!csrRecord) {
    // Get job details to create CSR record
    const { data: job } = await supabase
      .from('jobs')
      .select('id, deposition_date, case_name, case_number, location')
      .eq('id', jobId)
      .single();

    if (!job) {
      return [];
    }

    // Create CSR record
    const { data: newCsrRecord, error: createError } = await supabase
      .from('csr_records')
      .insert({
        job_id: jobId,
        deposition_date: job.deposition_date,
        case_caption: job.case_name || 'Untitled Case',
        cause_number: job.case_number,
        location_address: job.location,
      })
      .select('id')
      .single();

    if (createError) {
      throw createError;
    }

    csrRecord = newCsrRecord;
  }

  // Get proper nouns
  const { data, error } = await supabase
    .from('csr_proper_nouns')
    .select('*')
    .eq('csr_record_id', csrRecord.id)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Get proper noun by ID
 */
export async function getProperNounById(
  supabase: SupabaseClient,
  nounId: string,
  jobId: string
) {
  // Get CSR record for job
  const { data: csrRecord } = await supabase
    .from('csr_records')
    .select('id')
    .eq('job_id', jobId)
    .single();

  if (!csrRecord) {
    return null;
  }

  const { data, error } = await supabase
    .from('csr_proper_nouns')
    .select('*')
    .eq('id', nounId)
    .eq('csr_record_id', csrRecord.id)
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
 * Create a proper noun
 */
export async function createProperNoun(
  supabase: SupabaseClient,
  jobId: string,
  nounData: {
    value: string;
    category: string;
    phonetic_hint?: string | null;
    source?: string;
    use_in_transcription?: boolean;
    priority?: number;
  }
) {
  // Get or create CSR record
  let { data: csrRecord } = await supabase
    .from('csr_records')
    .select('id')
    .eq('job_id', jobId)
    .single();

  if (!csrRecord) {
    // Get job details
    const { data: job } = await supabase
      .from('jobs')
      .select('id, deposition_date, case_name, case_number, location')
      .eq('id', jobId)
      .single();

    if (!job) {
      throw new Error('Job not found');
    }

    // Create CSR record
    const { data: newCsrRecord, error: createError } = await supabase
      .from('csr_records')
      .insert({
        job_id: jobId,
        deposition_date: job.deposition_date,
        case_caption: job.case_name || 'Untitled Case',
        cause_number: job.case_number,
        location_address: job.location,
      })
      .select('id')
      .single();

    if (createError) {
      throw createError;
    }

    csrRecord = newCsrRecord;
  }

  // Check for duplicate
  const { data: existing } = await supabase
    .from('csr_proper_nouns')
    .select('id')
    .eq('csr_record_id', csrRecord.id)
    .eq('value', nounData.value.trim())
    .maybeSingle();

  if (existing) {
    throw new Error('This term already exists for this job');
  }

  // Create proper noun
  const { data, error } = await supabase
    .from('csr_proper_nouns')
    .insert({
      csr_record_id: csrRecord.id,
      value: nounData.value.trim(),
      category: nounData.category,
      phonetic_hint: nounData.phonetic_hint?.trim() || null,
      source: nounData.source || 'manual_entry',
      use_in_transcription: nounData.use_in_transcription ?? true,
      priority: nounData.priority ?? 0,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update a proper noun
 */
export async function updateProperNoun(
  supabase: SupabaseClient,
  nounId: string,
  jobId: string,
  updates: {
    value?: string;
    category?: string;
    phonetic_hint?: string | null;
    use_in_transcription?: boolean;
    priority?: number;
  }
) {
  // Get CSR record for job
  const { data: csrRecord } = await supabase
    .from('csr_records')
    .select('id')
    .eq('job_id', jobId)
    .single();

  if (!csrRecord) {
    throw new Error('CSR record not found for this job');
  }

  // Check if value is being updated and would create duplicate
  if (updates.value) {
    const { data: existing } = await supabase
      .from('csr_proper_nouns')
      .select('id')
      .eq('csr_record_id', csrRecord.id)
      .eq('value', updates.value.trim())
      .neq('id', nounId)
      .maybeSingle();

    if (existing) {
      throw new Error('This term already exists for this job');
    }
  }

  const updateData: Record<string, unknown> = {};
  if (updates.value !== undefined) updateData.value = updates.value.trim();
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.phonetic_hint !== undefined) updateData.phonetic_hint = updates.phonetic_hint?.trim() || null;
  if (updates.use_in_transcription !== undefined) updateData.use_in_transcription = updates.use_in_transcription;
  if (updates.priority !== undefined) updateData.priority = updates.priority;

  const { data, error } = await supabase
    .from('csr_proper_nouns')
    .update(updateData)
    .eq('id', nounId)
    .eq('csr_record_id', csrRecord.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Delete a proper noun
 */
export async function deleteProperNoun(
  supabase: SupabaseClient,
  nounId: string,
  jobId: string
) {
  // Get CSR record for job
  const { data: csrRecord } = await supabase
    .from('csr_records')
    .select('id')
    .eq('job_id', jobId)
    .single();

  if (!csrRecord) {
    throw new Error('CSR record not found for this job');
  }

  const { error } = await supabase
    .from('csr_proper_nouns')
    .delete()
    .eq('id', nounId)
    .eq('csr_record_id', csrRecord.id);

  if (error) {
    throw error;
  }
}

/**
 * Get CSR record ID for a job (creates if doesn't exist)
 */
export async function getOrCreateCsrRecordId(jobId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  
  let { data: csrRecord } = await supabase
    .from('csr_records')
    .select('id')
    .eq('job_id', jobId)
    .maybeSingle();

  if (!csrRecord) {
    // Get job details to create CSR record
    const { data: job } = await supabase
      .from('jobs')
      .select('id, deposition_date, case_name, case_number, location')
      .eq('id', jobId)
      .single();

    if (!job) {
      return null;
    }

    // Create CSR record
    const { data: newCsrRecord, error: createError } = await supabase
      .from('csr_records')
      .insert({
        job_id: jobId,
        deposition_date: job.deposition_date,
        case_caption: job.case_name || 'Untitled Case',
        cause_number: job.case_number,
        location_address: job.location,
      })
      .select('id')
      .single();

    if (createError) {
      return null;
    }

    csrRecord = newCsrRecord;
  }

  return csrRecord.id;
}

/**
 * Bulk delete proper nouns
 */
export async function bulkDeleteProperNouns(
  jobId: string,
  nounIds: string[]
): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  const supabase = await createSupabaseServerClient();
  
  try {
    const csrRecordId = await getOrCreateCsrRecordId(jobId);
    
    if (!csrRecordId) {
      return { success: false, error: 'CSR record not found for this job' };
    }

    const { data: deleted, error: deleteError } = await supabase
      .from('csr_proper_nouns')
      .delete()
      .in('id', nounIds)
      .eq('csr_record_id', csrRecordId)
      .select();

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    return { success: true, deletedCount: deleted?.length || 0 };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
