/**
 * Calendar Query Layer for Depo-Pro v1.3
 *
 * NOTE: Calendar/scheduling out of v1.3 MVP scope
 * This is a compatibility stub for legacy code
 */

/**
 * Get calendar event by ID (stub)
 */
export async function getCalendarEventById(
  supabaseOrId: any,
  _maybeId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Calendar feature not available in v1.3') };
}

/**
 * List calendar events (stub)
 */
export async function listCalendarEvents(
  supabaseOrFilters: any,
  _maybeFilters?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrFilters === 'object' && supabaseOrFilters.from;
  return isOldPattern ? [] : { data: [], error: null };
}

/**
 * Create calendar event (stub)
 */
export async function createCalendarEvent(
  supabaseOrData: any,
  _maybeData?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrData === 'object' && supabaseOrData.from;
  return isOldPattern ? null : { data: null, error: new Error('Calendar feature not available in v1.3') };
}

/**
 * Update calendar event (stub)
 */
export async function updateCalendarEvent(
  supabaseOrId: any,
  _idOrUpdates?: any,
  _maybeUpdates?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Calendar feature not available in v1.3') };
}

/**
 * Delete calendar event (stub)
 */
export async function deleteCalendarEvent(
  supabaseOrId: any,
  _maybeId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Calendar feature not available in v1.3') };
}

/**
 * Get booking request (stub)
 */
export async function getBookingRequestById(
  supabaseOrId: any,
  _maybeId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Calendar feature not available in v1.3') };
}

/**
 * Reschedule event (stub)
 * Supports: rescheduleEvent(supabase, id, data, options) or rescheduleEvent(id, data)
 */
export async function rescheduleEvent(
  supabaseOrId: any,
  _idOrData?: any,
  _dataOrOptions?: any,
  _maybeOptions?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Calendar feature not available in v1.3') };
}

/**
 * Convert to job (stub)
 */
export async function convertEventToJob(
  supabaseOrEventId: any,
  _eventIdOrJobData?: any,
  _maybeJobData?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrEventId === 'object' && supabaseOrEventId?.from;
  return isOldPattern ? null : { success: false, jobId: undefined, data: null, error: new Error('Calendar feature not available in v1.3') };
}

/**
 * Add event notes (stub)
 */
export async function addEventNotes(
  supabaseOrId: any,
  __idOrNotes?: any,
  _maybeNotes?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Calendar feature not available in v1.3') };
}

/**
 * Validate move (stub)
 */
export async function validateEventMove(
  supabaseOrData: any,
  _maybeData?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrData === 'object' && supabaseOrData.from;
  return isOldPattern ? { valid: false } : { data: { valid: false }, error: null };
}

/**
 * Get calendar event notes (stub)
 */
export async function getCalendarEventNotes(
  supabaseOrId: any,
  __maybeIdOrInclude?: string | boolean
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId?.from;
  return isOldPattern ? null : { notes: null, internalNotes: null };
}

/**
 * Add note to calendar event (stub)
 * Supports: addNoteToCalendarEvent(supabase, id, note, options) or addNoteToCalendarEvent(id, note)
 */
export async function addNoteToCalendarEvent(
  supabaseOrId: any,
  _idOrNote?: any,
  _noteOrOptions?: any,
  _maybeOptions?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Calendar feature not available in v1.3') };
}

/**
 * Reschedule calendar event (stub)
 */
export async function rescheduleCalendarEvent(
  supabaseOrId: any,
  _idOrData?: any,
  _maybeData?: any,
  _extraArg?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { success: false, data: null, error: new Error('Calendar feature not available in v1.3'), conflict: undefined };
}

/**
 * Get calendar event by job ID (stub)
 */
export async function getCalendarEventByJobId(
  supabaseOrJobId: any,
  _maybeJobId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrJobId === 'object' && supabaseOrJobId.from;
  return isOldPattern ? null : { data: null, error: null };
}
