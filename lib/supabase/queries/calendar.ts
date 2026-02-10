/**
 * Calendar Query Layer for Depo-Pro v1.3
 *
 * NOTE: Calendar/scheduling out of v1.3 MVP scope
 * This is a compatibility stub for legacy code
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Get calendar event by ID (stub)
 */
export async function getCalendarEventById(
  supabaseOrId: any,
  maybeId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Calendar feature not available in v1.3') };
}

/**
 * List calendar events (stub)
 */
export async function listCalendarEvents(
  supabaseOrFilters: any,
  maybeFilters?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrFilters === 'object' && supabaseOrFilters.from;
  return isOldPattern ? [] : { data: [], error: null };
}

/**
 * Create calendar event (stub)
 */
export async function createCalendarEvent(
  supabaseOrData: any,
  maybeData?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrData === 'object' && supabaseOrData.from;
  return isOldPattern ? null : { data: null, error: new Error('Calendar feature not available in v1.3') };
}

/**
 * Update calendar event (stub)
 */
export async function updateCalendarEvent(
  supabaseOrId: any,
  idOrUpdates?: any,
  maybeUpdates?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Calendar feature not available in v1.3') };
}

/**
 * Delete calendar event (stub)
 */
export async function deleteCalendarEvent(
  supabaseOrId: any,
  maybeId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Calendar feature not available in v1.3') };
}

/**
 * Get booking request (stub)
 */
export async function getBookingRequestById(
  supabaseOrId: any,
  maybeId?: string
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
  idOrData?: any,
  dataOrOptions?: any,
  maybeOptions?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Calendar feature not available in v1.3') };
}

/**
 * Convert to job (stub)
 */
export async function convertEventToJob(
  supabaseOrId: any,
  maybeId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Calendar feature not available in v1.3') };
}

/**
 * Add event notes (stub)
 */
export async function addEventNotes(
  supabaseOrId: any,
  idOrNotes?: any,
  maybeNotes?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Calendar feature not available in v1.3') };
}

/**
 * Validate move (stub)
 */
export async function validateEventMove(
  supabaseOrData: any,
  maybeData?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrData === 'object' && supabaseOrData.from;
  return isOldPattern ? { valid: false } : { data: { valid: false }, error: null };
}

/**
 * Get calendar event notes (stub)
 */
export async function getCalendarEventNotes(
  supabaseOrId: any,
  maybeId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? [] : { data: [], error: null };
}

/**
 * Add note to calendar event (stub)
 * Supports: addNoteToCalendarEvent(supabase, id, note, options) or addNoteToCalendarEvent(id, note)
 */
export async function addNoteToCalendarEvent(
  supabaseOrId: any,
  idOrNote?: any,
  noteOrOptions?: any,
  maybeOptions?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Calendar feature not available in v1.3') };
}

/**
 * Reschedule calendar event (stub)
 */
export async function rescheduleCalendarEvent(
  supabaseOrId: any,
  idOrData?: any,
  maybeData?: any
): Promise<any> {
  const isOldPattern = typeof supabaseOrId === 'object' && supabaseOrId.from;
  return isOldPattern ? null : { data: null, error: new Error('Calendar feature not available in v1.3') };
}

/**
 * Get calendar event by job ID (stub)
 */
export async function getCalendarEventByJobId(
  supabaseOrJobId: any,
  maybeJobId?: string
): Promise<any> {
  const isOldPattern = typeof supabaseOrJobId === 'object' && supabaseOrJobId.from;
  return isOldPattern ? null : { data: null, error: null };
}
