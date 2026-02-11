// app/api/jobs/[id]/chronology/[entryId]/route.ts
// PATCH: Update a chronology entry
// DELETE: Delete a chronology entry

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getChronologyEntryById,
  updateChronologyEntry,
  deleteChronologyEntry,
  verifyChronologyEntry,
} from '@/lib/supabase/queries/medical';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entryId } = await params;
    const user = session.user as { id: string; role: string };
    const supabase = await createSupabaseServerClient();

    const existing = await getChronologyEntryById(supabase, entryId);
    if (!existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const body = await request.json();

    // Handle verify action
    if (body.action === 'verify') {
      const updated = await verifyChronologyEntry(supabase, entryId, user.id);
      return NextResponse.json({ data: updated });
    }

    // Handle unverify
    if (body.action === 'unverify') {
      const updated = await updateChronologyEntry(supabase, entryId, {
        is_verified: false,
        verified_by_id: null,
        verified_at: null,
      });
      return NextResponse.json({ data: updated });
    }

    // Standard field update
    const allowedFields = [
      'event_date', 'event_date_end', 'date_precision', 'provider',
      'category', 'summary', 'details', 'page_reference', 'confidence',
    ];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // If editing an AI-extracted entry, mark it as EDITED
    if (existing.source_type === 'AI_EXTRACTED' && Object.keys(updateData).length > 0) {
      updateData.source_type = 'EDITED';
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 },
      );
    }

    const updated = await updateChronologyEntry(supabase, entryId, updateData);

    return NextResponse.json({ data: updated });
  } catch (error) {
    logger.error('[api/chronology/[entryId]] PATCH error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to update chronology entry' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entryId } = await params;
    const user = session.user as { id: string; role: string };
    const supabase = await createSupabaseServerClient();

    const existing = await getChronologyEntryById(supabase, entryId);
    if (!existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Only creator or admin can delete
    if (existing.created_by_id !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteChronologyEntry(supabase, entryId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[api/chronology/[entryId]] DELETE error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to delete chronology entry' },
      { status: 500 },
    );
  }
}
