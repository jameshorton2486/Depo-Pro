// ═══════════════════════════════════════════════════════════════
// CALENDAR QUERY FUNCTIONS
// lib/supabase/queries/calendar.ts
// ═══════════════════════════════════════════════════════════════
// All database access for calendar events goes through these functions

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * List calendar events for a firm
 */
export async function listCalendarEvents(
  supabase: SupabaseClient,
  firmId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    assignedReporterId?: string;
  }
) {
  let query = supabase
    .from('calendar_events')
    .select('*')
    .eq('firm_id', firmId);

  if (options?.startDate) {
    query = query.gte('start_time', options.startDate.toISOString());
  }

  if (options?.endDate) {
    query = query.lte('end_time', options.endDate.toISOString());
  }

  if (options?.assignedReporterId) {
    query = query.eq('assigned_reporter_id', options.assignedReporterId);
  }

  query = query.order('start_time', { ascending: true });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Get calendar event by ID
 */
export async function getCalendarEventById(
  supabase: SupabaseClient,
  eventId: string
) {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('id', eventId)
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
 * Create a calendar event
 */
export async function createCalendarEvent(
  supabase: SupabaseClient,
  eventData: {
    firm_id: string;
    created_by_id: string;
    title: string;
    start_time: string;
    end_time: string;
    event_type: string;
    assigned_reporter_id?: string | null;
    location?: string | null;
    notes?: string | null;
    status?: string;
  }
) {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert(eventData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update a calendar event
 */
export async function updateCalendarEvent(
  supabase: SupabaseClient,
  eventId: string,
  updates: {
    title?: string;
    start_time?: string;
    end_time?: string;
    assigned_reporter_id?: string | null;
    location?: string | null;
    notes?: string | null;
    status?: string;
  }
) {
  const { data, error } = await supabase
    .from('calendar_events')
    .update(updates)
    .eq('id', eventId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(
  supabase: SupabaseClient,
  eventId: string
) {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId);

  if (error) {
    throw error;
  }
}

/**
 * Assign reporter to event
 */
export async function assignReporterToEvent(
  supabase: SupabaseClient,
  eventId: string,
  reporterId: string | null
) {
  const { data, error } = await supabase
    .from('calendar_events')
    .update({ assigned_reporter_id: reporterId })
    .eq('id', eventId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Reschedule event
 */
export async function rescheduleEvent(
  supabase: SupabaseClient,
  eventId: string,
  newStart: string,
  newEnd: string,
  location?: string | null
) {
  const updates: Record<string, unknown> = {
    start_time: newStart,
    end_time: newEnd,
  };

  if (location !== undefined) {
    updates.location = location;
  }

  const { data, error } = await supabase
    .from('calendar_events')
    .update(updates)
    .eq('id', eventId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get event conflicts for a reporter
 */
export async function getEventConflicts(
  supabase: SupabaseClient,
  reporterId: string,
  startTime: string,
  endTime: string,
  excludeEventId?: string
) {
  let query = supabase
    .from('calendar_events')
    .select('id, title, start_time, end_time, status')
    .eq('assigned_reporter_id', reporterId)
    .or(`start_time.lt.${endTime},end_time.gt.${startTime}`)
    .neq('status', 'CANCELLED');

  if (excludeEventId) {
    query = query.neq('id', excludeEventId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Get reporter availability for a date
 */
export async function getAvailability(
  supabase: SupabaseClient,
  reporterId: string,
  date: string
) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('calendar_events')
    .select('id, start_time, end_time, status')
    .eq('assigned_reporter_id', reporterId)
    .gte('start_time', startOfDay.toISOString())
    .lte('end_time', endOfDay.toISOString())
    .neq('status', 'CANCELLED')
    .order('start_time', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Convert calendar event to job
 */
export async function convertEventToJob(
  supabase: SupabaseClient,
  eventId: string,
  jobData: {
    case_name: string;
    case_number?: string | null;
    deposition_date: string;
    location?: string | null;
    created_by_id: string;
    firm_id: string;
  }
) {
  // Create job
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert({
      ...jobData,
      status: 'CREATED',
    })
    .select()
    .single();

  if (jobError) {
    throw jobError;
  }

  // Update event status to CONVERTED
  const { error: eventError } = await supabase
    .from('calendar_events')
    .update({ status: 'CONVERTED' })
    .eq('id', eventId);

  if (eventError) {
    throw eventError;
  }

  return job;
}
