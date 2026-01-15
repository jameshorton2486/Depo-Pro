// =============================================================================
// CALENDAR EVENTS API ROUTE (RLS-Safe)
// app/api/calendar/events/route.ts
//
// Uses Supabase with Row-Level Security (RLS)
// Client routes → publishable key + RLS
// Never bypasses RLS silently
// =============================================================================

export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { audit } from '@/lib/audit';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const EventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  start: z.string().datetime(),
  end: z.string().datetime(),
  timezone: z.string().default('America/Chicago'),
  location: z.string().optional(),
  isRemote: z.boolean().default(false),
  meetingLink: z.string().url().optional(),
  assignedReporterId: z.string().optional(),
  jobId: z.string().optional(),
  notes: z.string().optional(),
});

// =============================================================================
// POST - Create calendar event (RLS-enforced)
// =============================================================================

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get authenticated user (RLS will enforce access)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn('[calendar] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const event = EventSchema.parse(body);

    // Validate times
    const startTime = new Date(event.start);
    const endTime = new Date(event.end);

    if (endTime <= startTime) {
      logger.warn('[calendar] Invalid time range', { start: event.start, end: event.end });
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    // Check for conflicts (events that overlap with the new event)
    // Overlap condition: new_start < existing_end AND new_end > existing_start
    const { data: conflicts } = await supabase
      .from('calendar_events')
      .select('id, title, start_time, end_time')
      .eq('user_id', user.id)
      .lt('start_time', endTime.toISOString())
      .gt('end_time', startTime.toISOString());

    if (conflicts && conflicts.length > 0) {
      logger.warn('[calendar] Time conflict detected', { conflicts, userId: user.id });
      return NextResponse.json(
        { 
          error: 'Time conflict detected',
          conflicts: conflicts.map(c => ({
            id: c.id,
            title: c.title,
            start: c.start_time,
            end: c.end_time,
          }))
        },
        { status: 409 }
      );
    }

    // Insert event (RLS will enforce user_id and firm_id)
    const { data: insertedEvent, error: insertError } = await supabase
      .from('calendar_events')
      .insert({
        user_id: user.id,
        title: event.title,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        timezone: event.timezone,
        location: event.location || null,
        is_remote: event.isRemote,
        meeting_link: event.meetingLink || null,
        assigned_reporter_id: event.assignedReporterId || null,
        job_id: event.jobId || null,
        notes: event.notes || null,
        status: 'SCHEDULED',
      })
      .select()
      .single();

    if (insertError) {
      logger.error('[calendar] Insert failed', insertError, { userId: user.id, title: event.title });
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    logger.info('[calendar] Event created', { eventId: insertedEvent.id, userId: user.id, title: event.title });
    
    // Audit log
    await audit.calendarEventCreated(insertedEvent.id, {
      title: event.title,
      start: event.start,
      end: event.end,
    });
    
    return NextResponse.json({ success: true, event: insertedEvent }, { status: 201 });

  } catch (err) {
    if (err instanceof z.ZodError) {
      logger.warn('[calendar] Validation error', { issues: err.issues });
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 });
    }
    logger.error('[calendar] Unexpected error', err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET - Fetch calendar events (RLS-enforced)
// =============================================================================

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn('[calendar] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    // Build query (RLS will filter by user_id/firm_id automatically)
    let query = supabase
      .from('calendar_events')
      .select('*')
      .order('start_time', { ascending: true });

    // Date range filter
    if (start) {
      query = query.gte('start_time', start);
    }
    if (end) {
      query = query.lte('end_time', end);
    }

    const { data: events, error: queryError } = await query;

    if (queryError) {
      logger.error('[calendar] Query failed', queryError, { userId: user.id });
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    logger.info('[calendar] Events fetched', { count: events?.length || 0, userId: user.id });
    return NextResponse.json({ events: events || [], total: events?.length || 0 });

  } catch (err) {
    logger.error('[calendar] Unexpected error', err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
