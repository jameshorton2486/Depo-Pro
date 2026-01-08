import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { audit } from '@/lib/audit';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  location: z.string().optional(),
  event_type: z.enum(['DEPOSITION', 'HEARING', 'MEETING', 'BLOCKED', 'OTHER']).optional(),
  job_id: z.string().uuid().nullable().optional(),
  notes: z.string().optional(),
});

// GET - Get single event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn('[calendar] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { data: event, error } = await supabase
      .from('calendar_events')
      .select('*, jobs(id, case_name)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !event) {
      logger.warn('[calendar] Event not found', { eventId: id, userId: user.id });
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    logger.error('[calendar] GET error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

// PATCH - Update event
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn('[calendar] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = updateEventSchema.safeParse(body);

    if (!validation.success) {
      logger.warn('[calendar] Validation error', { issues: validation.error.issues });
      return NextResponse.json(
        { error: 'Invalid event data', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const updates = validation.data;

    // Get current event for audit
    const { data: currentEvent } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!currentEvent) {
      logger.warn('[calendar] Event not found for update', { eventId: id, userId: user.id });
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check for conflicts if times are changing
    if (updates.start_time || updates.end_time) {
      const startTime = updates.start_time || currentEvent.start_time;
      const endTime = updates.end_time || currentEvent.end_time;

      // Validate time range
      if (new Date(endTime) <= new Date(startTime)) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        );
      }

      // Check for conflicts (events that overlap with the updated event)
      // Overlap condition: new_start < existing_end AND new_end > existing_start
      const { data: conflicts } = await supabase
        .from('calendar_events')
        .select('id, title, start_time, end_time')
        .eq('user_id', user.id)
        .neq('id', id)
        .lt('start_time', endTime)
        .gt('end_time', startTime);

      if (conflicts && conflicts.length > 0) {
        logger.warn('[calendar] Time conflict detected', { eventId: id, conflicts });
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
    }

    // Update event
    const { data: event, error } = await supabase
      .from('calendar_events')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      logger.error('[calendar] Update failed', error, { eventId: id, userId: user.id });
      throw error;
    }

    // Audit log
    await audit.calendarEventUpdated(id, {
      oldValue: currentEvent,
      newValue: event,
    });

    logger.info('[calendar] Event updated', { eventId: id, userId: user.id });
    return NextResponse.json({ event });
  } catch (error) {
    logger.error('[calendar] PATCH error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

// DELETE - Delete event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn('[calendar] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get event for audit before deleting
    const { data: event } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!event) {
      logger.warn('[calendar] Event not found for delete', { eventId: id, userId: user.id });
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      logger.error('[calendar] Delete failed', error, { eventId: id, userId: user.id });
      throw error;
    }

    // Audit log
    await audit.calendarEventDeleted(id, {
      title: event.title,
      start: event.start_time,
      end: event.end_time,
    });

    logger.info('[calendar] Event deleted', { eventId: id, userId: user.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[calendar] DELETE error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
