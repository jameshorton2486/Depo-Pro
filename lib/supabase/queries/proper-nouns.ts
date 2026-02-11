/**
 * Proper Nouns Query Layer for Depo-Pro v1.3
 *
 * NOTE: Proper nouns feature out of v1.3 MVP scope
 * This is a compatibility stub for legacy code
 */


/**
 * Get proper noun by ID (stub)
 * Supports: getProperNounById(supabase, id, options) or getProperNounById(id)
 */
export async function getProperNounById(
  supabaseOrId: any,
  _idOrOptions?: string | any,
  _maybeOptions?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Proper nouns feature not available in v1.3') };
}

/**
 * List proper nouns by job (stub)
 * Supports: listProperNounsByJob(supabase, jobId, options) or listProperNounsByJob(jobId)
 */
export async function listProperNounsByJob(
  _supabaseOrJobId: any,
  _jobIdOrOptions?: string | any,
  _maybeOptions?: any
): Promise<any> {
  const isOldPattern = typeof _supabaseOrJobId === 'object' && _supabaseOrJobId.from;
  return isOldPattern ? [] : { data: [], error: null };
}

/**
 * Create proper noun (stub)
 * Supports: createProperNoun(supabase, data, options) or createProperNoun(data)
 */
export async function createProperNoun(
  supabaseOrData: any,
  _dataOrOptions?: any,
  _maybeOptions?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrData === 'object' && supabaseOrData.from;
  return isOldPattern ? null : { data: null, error: new Error('Proper nouns feature not available in v1.3') };
}

/**
 * Update proper noun (stub)
 * Supports: updateProperNoun(supabase, id, updates, options) or updateProperNoun(id, updates)
 */
export async function updateProperNoun(
  supabaseOrId: any,
  _idOrUpdates?: any,
  _updatesOrOptions?: any,
  _maybeOptions?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Proper nouns feature not available in v1.3') };
}

/**
 * Delete proper noun (stub)
 * Supports: deleteProperNoun(supabase, id, options) or deleteProperNoun(id)
 */
export async function deleteProperNoun(
  supabaseOrId: any,
  _idOrOptions?: string | any,
  _maybeOptions?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Proper nouns feature not available in v1.3') };
}

/**
 * Get proper nouns by job (alias for listProperNounsByJob)
 */
export async function getProperNounsByJob(
  _supabaseOrJobId: any,
  _jobIdOrOptions?: string | any,
  _maybeOptions?: any
): Promise<any> {
  return listProperNounsByJob(_supabaseOrJobId, _jobIdOrOptions, _maybeOptions);
}

/**
 * Get or create CSR record ID (stub)
 */
export async function getOrCreateCsrRecordId(
_supabaseOrJobId: any,
  _maybeJobId?: string
): Promise<string | null> {
  // Stub - return null
  return null;
}

/**
 * Bulk delete proper nouns (stub)
 */
export async function bulkDeleteProperNouns(
  supabaseOrIds: any,
  _maybeIds?: string[]
): Promise<any> {
  const isOldPattern = typeof supabaseOrIds === 'object' && supabaseOrIds.from;
  return isOldPattern ? null : { data: null, error: new Error('Proper nouns feature not available in v1.3') };
}
