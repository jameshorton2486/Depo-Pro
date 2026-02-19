/**
 * Calendar Query Stub
 * Calendar feature is pending Phase 1 rebuild (multi-tenant architecture).
 * All functions return null/empty. DO NOT add real logic here — implement in Phase 1.
 */

export async function getCalendarEventById(_supabaseOrId: any, _maybeId?: string): Promise<any> {
  return null;
}

export async function listCalendarEvents(_supabaseOrFilters: any, _maybeFilters?: any): Promise<any[]> {
  return [];
}

export async function createCalendarEvent(_supabaseOrData: any, _maybeData?: any): Promise<any> {
  return null;
}

export async function updateCalendarEvent(_supabaseOrId: any, _idOrUpdates?: any, _maybeUpdates?: any): Promise<any> {
  return null;
}

export async function deleteCalendarEvent(_supabaseOrId: any, _maybeId?: string): Promise<any> {
  return null;
}

export async function getBookingRequestById(_supabaseOrId: any, _maybeId?: string): Promise<any> {
  return null;
}

export async function rescheduleEvent(_supabaseOrId: any, _idOrData?: any, _dataOrOptions?: any, _maybeOptions?: any): Promise<any> {
  return null;
}

export async function convertEventToJob(_supabaseOrEventId: any, _eventIdOrJobData?: any, _maybeJobData?: any): Promise<any> {
  return { success: false, jobId: undefined };
}

export async function addEventNotes(_supabaseOrId: any, _idOrNotes?: any, _maybeNotes?: any): Promise<any> {
  return null;
}

export async function validateEventMove(_supabaseOrData: any, _maybeData?: any): Promise<any> {
  return { valid: false };
}

export async function getCalendarEventNotes(_supabaseOrId: any, _maybeIdOrInclude?: string | boolean): Promise<any> {
  return { notes: null, internalNotes: null };
}

export async function addNoteToCalendarEvent(_supabaseOrId: any, _idOrNote?: any, _noteOrOptions?: any, _maybeOptions?: any): Promise<any> {
  return null;
}

export async function rescheduleCalendarEvent(_supabaseOrId: any, _idOrData?: any, _maybeData?: any, _extraArg?: any): Promise<any> {
  return { success: false };
}

export async function getCalendarEventByJobId(_supabaseOrJobId: any, _maybeJobId?: string): Promise<any> {
  return null;
}
