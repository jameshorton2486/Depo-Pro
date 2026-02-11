/**
 * Medical Records & Chronology Query Layer
 * Phase 10 — Depo-Pro
 *
 * Typed query functions for medical_records and chronology_entries tables.
 * All functions accept SupabaseClient as first parameter.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MedicalRecordRow,
  ChronologyEntryRow,
  CreateMedicalRecordInput,
  UpdateMedicalRecordInput,
  CreateChronologyEntryInput,
  UpdateChronologyEntryInput,
  ChronologyFilters,
  ChronologySummary,
  MedicalRecordWithStats,
} from '@/types/medical';

// ═══════════════════════════════════════════════════════════════
// MEDICAL RECORDS
// ═══════════════════════════════════════════════════════════════

/**
 * List all medical records for a job, ordered by creation date
 */
export async function listMedicalRecordsByJob(
  supabase: SupabaseClient,
  jobId: string,
): Promise<MedicalRecordWithStats[]> {
  // Get records
  const { data: records, error } = await supabase
    .from('medical_records')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[medical-queries] listMedicalRecordsByJob error:', error);
    throw new Error(`Failed to list medical records: ${error.message}`);
  }

  if (!records || records.length === 0) return [];

  // Get entry counts per record
  const recordIds = records.map((r: MedicalRecordRow) => r.id);
  const { data: entryCounts } = await supabase
    .from('chronology_entries')
    .select('medical_record_id, is_verified')
    .in('medical_record_id', recordIds);

  // Build count map
  const countMap = new Map<string, { total: number; verified: number }>();
  if (entryCounts) {
    for (const entry of entryCounts) {
      const id = entry.medical_record_id;
      if (!id) continue;
      const existing = countMap.get(id) || { total: 0, verified: 0 };
      existing.total++;
      if (entry.is_verified) existing.verified++;
      countMap.set(id, existing);
    }
  }

  return records.map((r: MedicalRecordRow) => ({
    ...r,
    entry_count: countMap.get(r.id)?.total ?? 0,
    verified_count: countMap.get(r.id)?.verified ?? 0,
  }));
}

/**
 * Get a single medical record by ID
 */
export async function getMedicalRecordById(
  supabase: SupabaseClient,
  recordId: string,
): Promise<MedicalRecordRow | null> {
  const { data, error } = await supabase
    .from('medical_records')
    .select('*')
    .eq('id', recordId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('[medical-queries] getMedicalRecordById error:', error);
    throw new Error(`Failed to get medical record: ${error.message}`);
  }

  return data;
}

/**
 * Create a new medical record
 */
export async function createMedicalRecord(
  supabase: SupabaseClient,
  input: CreateMedicalRecordInput,
): Promise<MedicalRecordRow> {
  const { data, error } = await supabase
    .from('medical_records')
    .insert({
      job_id: input.job_id,
      file_name: input.file_name,
      file_url: input.file_url,
      file_size_bytes: input.file_size_bytes,
      mime_type: input.mime_type || 'application/pdf',
      page_count: input.page_count || null,
      uploaded_by_id: input.uploaded_by_id,
      status: 'UPLOADED',
    })
    .select()
    .single();

  if (error) {
    console.error('[medical-queries] createMedicalRecord error:', error);
    throw new Error(`Failed to create medical record: ${error.message}`);
  }

  return data;
}

/**
 * Update a medical record (status, extraction results, etc.)
 */
export async function updateMedicalRecord(
  supabase: SupabaseClient,
  recordId: string,
  input: UpdateMedicalRecordInput,
): Promise<MedicalRecordRow> {
  const { data, error } = await supabase
    .from('medical_records')
    .update(input)
    .eq('id', recordId)
    .select()
    .single();

  if (error) {
    console.error('[medical-queries] updateMedicalRecord error:', error);
    throw new Error(`Failed to update medical record: ${error.message}`);
  }

  return data;
}

/**
 * Delete a medical record and its associated chronology entries
 */
export async function deleteMedicalRecord(
  supabase: SupabaseClient,
  recordId: string,
): Promise<void> {
  const { error } = await supabase
    .from('medical_records')
    .delete()
    .eq('id', recordId);

  if (error) {
    console.error('[medical-queries] deleteMedicalRecord error:', error);
    throw new Error(`Failed to delete medical record: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// CHRONOLOGY ENTRIES
// ═══════════════════════════════════════════════════════════════

/**
 * List chronology entries for a job with optional filters
 */
export async function listChronologyEntries(
  supabase: SupabaseClient,
  jobId: string,
  filters?: ChronologyFilters,
): Promise<ChronologyEntryRow[]> {
  let query = supabase
    .from('chronology_entries')
    .select('*')
    .eq('job_id', jobId);

  // Apply filters
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  if (filters?.provider) {
    query = query.eq('provider', filters.provider);
  }
  if (filters?.startDate) {
    query = query.gte('event_date', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('event_date', filters.endDate);
  }
  if (filters?.sourceType) {
    query = query.eq('source_type', filters.sourceType);
  }
  if (filters?.isVerified !== undefined) {
    query = query.eq('is_verified', filters.isVerified);
  }
  if (filters?.medicalRecordId) {
    query = query.eq('medical_record_id', filters.medicalRecordId);
  }

  // Always sort chronologically
  query = query.order('event_date', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('[medical-queries] listChronologyEntries error:', error);
    throw new Error(`Failed to list chronology entries: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a single chronology entry
 */
export async function getChronologyEntryById(
  supabase: SupabaseClient,
  entryId: string,
): Promise<ChronologyEntryRow | null> {
  const { data, error } = await supabase
    .from('chronology_entries')
    .select('*')
    .eq('id', entryId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[medical-queries] getChronologyEntryById error:', error);
    throw new Error(`Failed to get chronology entry: ${error.message}`);
  }

  return data;
}

/**
 * Create a single chronology entry
 */
export async function createChronologyEntry(
  supabase: SupabaseClient,
  input: CreateChronologyEntryInput,
): Promise<ChronologyEntryRow> {
  const { data, error } = await supabase
    .from('chronology_entries')
    .insert({
      job_id: input.job_id,
      medical_record_id: input.medical_record_id || null,
      event_date: input.event_date,
      event_date_end: input.event_date_end || null,
      date_precision: input.date_precision || 'DAY',
      provider: input.provider || null,
      category: input.category,
      summary: input.summary,
      details: input.details || null,
      page_reference: input.page_reference || null,
      source_type: input.source_type || 'MANUAL',
      source_document_name: input.source_document_name || null,
      confidence: input.confidence ?? 1.0,
      created_by_id: input.created_by_id,
    })
    .select()
    .single();

  if (error) {
    console.error('[medical-queries] createChronologyEntry error:', error);
    throw new Error(`Failed to create chronology entry: ${error.message}`);
  }

  return data;
}

/**
 * Bulk insert chronology entries (used after AI extraction)
 */
export async function bulkCreateChronologyEntries(
  supabase: SupabaseClient,
  entries: CreateChronologyEntryInput[],
): Promise<ChronologyEntryRow[]> {
  if (entries.length === 0) return [];

  const rows = entries.map((input) => ({
    job_id: input.job_id,
    medical_record_id: input.medical_record_id || null,
    event_date: input.event_date,
    event_date_end: input.event_date_end || null,
    date_precision: input.date_precision || 'DAY',
    provider: input.provider || null,
    category: input.category,
    summary: input.summary,
    details: input.details || null,
    page_reference: input.page_reference || null,
    source_type: input.source_type || 'AI_EXTRACTED',
    source_document_name: input.source_document_name || null,
    confidence: input.confidence ?? 0.85,
    created_by_id: input.created_by_id,
  }));

  const { data, error } = await supabase
    .from('chronology_entries')
    .insert(rows)
    .select();

  if (error) {
    console.error('[medical-queries] bulkCreateChronologyEntries error:', error);
    throw new Error(`Failed to bulk create chronology entries: ${error.message}`);
  }

  return data || [];
}

/**
 * Update a chronology entry
 */
export async function updateChronologyEntry(
  supabase: SupabaseClient,
  entryId: string,
  input: UpdateChronologyEntryInput,
): Promise<ChronologyEntryRow> {
  const { data, error } = await supabase
    .from('chronology_entries')
    .update(input)
    .eq('id', entryId)
    .select()
    .single();

  if (error) {
    console.error('[medical-queries] updateChronologyEntry error:', error);
    throw new Error(`Failed to update chronology entry: ${error.message}`);
  }

  return data;
}

/**
 * Delete a chronology entry
 */
export async function deleteChronologyEntry(
  supabase: SupabaseClient,
  entryId: string,
): Promise<void> {
  const { error } = await supabase
    .from('chronology_entries')
    .delete()
    .eq('id', entryId);

  if (error) {
    console.error('[medical-queries] deleteChronologyEntry error:', error);
    throw new Error(`Failed to delete chronology entry: ${error.message}`);
  }
}

/**
 * Delete all chronology entries for a medical record (used before re-extraction)
 */
export async function deleteChronologyEntriesForRecord(
  supabase: SupabaseClient,
  medicalRecordId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('chronology_entries')
    .delete()
    .eq('medical_record_id', medicalRecordId)
    .eq('source_type', 'AI_EXTRACTED')
    .select('id');

  if (error) {
    console.error('[medical-queries] deleteChronologyEntriesForRecord error:', error);
    throw new Error(`Failed to delete entries for record: ${error.message}`);
  }

  return data?.length ?? 0;
}

/**
 * Verify a chronology entry
 */
export async function verifyChronologyEntry(
  supabase: SupabaseClient,
  entryId: string,
  verifiedById: string,
): Promise<ChronologyEntryRow> {
  return updateChronologyEntry(supabase, entryId, {
    is_verified: true,
    verified_by_id: verifiedById,
    verified_at: new Date().toISOString(),
  });
}

/**
 * Get chronology summary/stats for a job
 */
export async function getChronologySummary(
  supabase: SupabaseClient,
  jobId: string,
): Promise<ChronologySummary> {
  // Get all entries
  const { data: entries, error } = await supabase
    .from('chronology_entries')
    .select('category, provider, event_date, is_verified')
    .eq('job_id', jobId)
    .order('event_date', { ascending: true });

  if (error) {
    console.error('[medical-queries] getChronologySummary error:', error);
    throw new Error(`Failed to get chronology summary: ${error.message}`);
  }

  // Get records stats
  const { data: records } = await supabase
    .from('medical_records')
    .select('id, status')
    .eq('job_id', jobId);

  const allEntries = entries || [];
  const allRecords = records || [];

  // Build category counts
  const catMap = new Map<string, number>();
  const provMap = new Map<string, number>();
  let verified = 0;

  for (const e of allEntries) {
    catMap.set(e.category, (catMap.get(e.category) || 0) + 1);
    if (e.provider) {
      provMap.set(e.provider, (provMap.get(e.provider) || 0) + 1);
    }
    if (e.is_verified) verified++;
  }

  const dates = allEntries.map((e: { event_date: string }) => e.event_date).sort();

  return {
    total_entries: allEntries.length,
    verified_entries: verified,
    categories: Array.from(catMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
    providers: Array.from(provMap.entries())
      .map(([provider, count]) => ({ provider, count }))
      .sort((a, b) => b.count - a.count),
    date_range: dates.length > 0
      ? { earliest: dates[0], latest: dates[dates.length - 1] }
      : null,
    records_count: allRecords.length,
    records_processed: allRecords.filter(
      (r: { status: string }) => r.status === 'EXTRACTED'
    ).length,
  };
}
