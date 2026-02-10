// ═══════════════════════════════════════════════════════════════
// CALENDAR QUERY FUNCTIONS
// lib/supabase/queries/calendar.ts
// ═══════════════════════════════════════════════════════════════
// All database access for calendar events goes through these functions

import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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
export async function getCalendarEventById(eventId: string) {
  const supabase = await createSupabaseServerClient();
  
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
 * Get calendar event by job ID (for checking reporter assignment)
 */
export async function getCalendarEventByJobId(jobId: string) {
  const supabase = await createSupabaseServerClient();
  
  const { data, error } = await supabase
    .from('calendar_events')
    .select('assigned_reporter_id')
    .eq('job_id', jobId)
    .maybeSingle();

  if (error || !data) {
    return null;
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
  eventId: string,
  updates: {
    title?: string;
    start_time?: string;
    end_time?: string;
    assigned_reporter_id?: string | null;
    location?: string | null;
    notes?: string | null;
    internal_notes?: string | null;
    status?: string;
    [key: string]: unknown;
  }
) {
  const supabase = await createSupabaseServerClient();
  
  const { data, error } = await supabase
    .from('calendar_events')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
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
  eventId: string,
  jobData: {
    title: string;
    case_name: string;
    case_number?: string | null;
    deposition_date: string;
    location?: string | null;
    zoom_link?: string | null;
    created_by_id: string;
    firm_id: string;
    agency_id?: string | null;
    assigned_to_id?: string | null;
    scopist_id?: string | null;
    internal_notes?: string | null;
  }
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  const supabase = await createSupabaseServerClient();
  
  try {
    // Get event first
    const { data: event, error: eventError } = await supabase
      .from('calendar_events')
      .select('id, job_id, status')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return { success: false, error: 'Event not found' };
    }

    if (event.job_id) {
      return { success: false, error: 'Event already converted', jobId: event.job_id };
    }

    if (event.status === 'CANCELLED') {
      return { success: false, error: 'Cannot convert cancelled event' };
    }

    // Create job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        title: jobData.title,
        case_name: jobData.case_name,
        case_number: jobData.case_number || null,
        deposition_date: jobData.deposition_date,
        location: jobData.location || null,
        zoom_link: jobData.zoom_link || null,
        status: 'CREATED',
        created_by_id: jobData.created_by_id,
        firm_id: jobData.firm_id,
        agency_id: jobData.agency_id || null,
        assigned_to_id: jobData.assigned_to_id || null,
        scopist_id: jobData.scopist_id || null,
        internal_notes: jobData.internal_notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (jobError) {
      return { success: false, error: jobError.message };
    }

    // Update event status to CONVERTED
    const { error: updateError } = await supabase
      .from('calendar_events')
      .update({
        job_id: job.id,
        status: 'CONVERTED',
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId);

    if (updateError) {
      // Try to rollback job creation
      await supabase.from('jobs').delete().eq('id', job.id);
      return { success: false, error: updateError.message };
    }

    return { success: true, jobId: job.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Reschedule calendar event with conflict checking
 */
export async function rescheduleCalendarEvent(
  eventId: string,
  newStartTime: string,
  newEndTime: string,
  options?: {
    updateLocation?: boolean;
    location?: string | null;
    isRemote?: boolean;
    meetingLink?: string | null;
  }
): Promise<{ success: boolean; error?: string; conflict?: { eventId: string; title: string; time: string } }> {
  const supabase = await createSupabaseServerClient();
  
  try {
    // Get event with reporter assignment
    const { data: event, error: eventError } = await supabase
      .from('calendar_events')
      .select('id, status, assigned_reporter_id, start_time, end_time')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return { success: false, error: 'Event not found' };
    }

    if (['CANCELLED', 'COMPLETED', 'IN_PROGRESS'].includes(event.status)) {
      return { success: false, error: `Cannot reschedule event in ${event.status} status` };
    }

    // Check for conflicts if reporter assigned
    if (event.assigned_reporter_id) {
      const scheduledStartDate = new Date(newStartTime);
      const scheduledEndDate = new Date(newEndTime);

      const { data: conflicts } = await supabase
        .from('calendar_events')
        .select('id, title, start_time')
        .eq('assigned_reporter_id', event.assigned_reporter_id)
        .neq('id', eventId)
        .neq('status', 'CANCELLED')
        .or(`start_time.lte.${scheduledStartDate.toISOString()},end_time.gt.${scheduledStartDate.toISOString()},start_time.lt.${scheduledEndDate.toISOString()},end_time.gte.${scheduledEndDate.toISOString()},start_time.gte.${scheduledStartDate.toISOString()},end_time.lte.${scheduledEndDate.toISOString()}`);

      if (conflicts && conflicts.length > 0) {
        const conflict = conflicts[0];
        return {
          success: false,
          error: 'Schedule conflict',
          conflict: {
            eventId: conflict.id,
            title: conflict.title || 'Untitled Event',
            time: conflict.start_time,
          },
        };
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      start_time: new Date(newStartTime).toISOString(),
      end_time: new Date(newEndTime).toISOString(),
      status: event.status === 'CONFIRMED' ? 'SCHEDULED' : event.status,
      updated_at: new Date().toISOString(),
    };

    if (options?.updateLocation) {
      updateData.is_remote = options.isRemote || false;
      updateData.location = options.location || null;
      updateData.meeting_link = options.meetingLink || null;
    }

    const { error: updateError } = await supabase
      .from('calendar_events')
      .update(updateData)
      .eq('id', eventId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get calendar event notes
 */
export async function getCalendarEventNotes(
  eventId: string,
  includeInternal: boolean = false
): Promise<{ notes: string | null; internalNotes: string | null } | null> {
  const supabase = await createSupabaseServerClient();
  
  const { data, error } = await supabase
    .from('calendar_events')
    .select('notes, internal_notes')
    .eq('id', eventId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    notes: data.notes || null,
    internalNotes: includeInternal ? (data.internal_notes || null) : null,
  };
}

/**
 * Add note to calendar event
 */
export async function addNoteToCalendarEvent(
  eventId: string,
  content: string,
  isInternal: boolean,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  
  try {
    // Get user info for note attribution
    const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
    const adminClient = getSupabaseAdminClient();
    const { data: userData } = await adminClient.auth.admin.getUserById(userId);

    const firstName = userData?.user?.user_metadata?.firstName || '';
    const lastName = userData?.user?.user_metadata?.lastName || '';
    const userDisplayName = firstName && lastName
      ? `${firstName} ${lastName}`
      : 'Unknown User';
    const timestamp = new Date().toISOString();
    const noteEntry = `[${timestamp}] ${userDisplayName}: ${content}`;

    // Get current notes
    const { data: event, error: eventError } = await supabase
      .from('calendar_events')
      .select('notes, internal_notes')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return { success: false, error: 'Event not found' };
    }

    const noteField = isInternal ? 'internal_notes' : 'notes';
    const currentNotes = event[noteField] || '';
    const updatedNotes = currentNotes
      ? `${currentNotes}\n\n${noteEntry}`
      : noteEntry;

    const { error: updateError } = await supabase
      .from('calendar_events')
      .update({
        [noteField]: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

