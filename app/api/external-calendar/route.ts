// =============================================================================
// STEP 4: EXTERNAL CALENDAR API ROUTES
// =============================================================================
// app/api/external-calendar/route.ts
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ExternalCalendarProvider, ExternalCalendarSyncMode } from '@/lib/enums';
import { FEATURES } from '@/lib/feature-flags';
import { ExternalCalendarSyncService } from '@/lib/external-calendar/sync-service';

// =============================================================================
// GET: List user's external calendar connections
// =============================================================================

export async function GET(_request: NextRequest) {
  // Feature flag guard
  if (!FEATURES.EXTERNAL_CALENDAR_SYNC) {
    return NextResponse.json({ connections: [] }, { status: 200 });
  }

  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.firmId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }

    const supabase = await createSupabaseServerClient();
    
    const { data: connections, error: connectionsError } = await supabase
      .from('external_calendar_connections')
      .select('id, provider, sync_mode, calendar_name, is_enabled, last_synced_at, last_sync_error, created_at')
      .eq('user_id', session.user.id)
      .eq('firm_id', session.user.firmId)
      .order('created_at', { ascending: false });

    if (connectionsError) {
      throw connectionsError;
    }

    // Transform to match expected format
    const transformedConnections = (connections || []).map((conn: any) => ({
      id: conn.id,
      provider: conn.provider,
      syncMode: conn.sync_mode,
      calendarName: conn.calendar_name,
      isEnabled: conn.is_enabled,
      lastSyncedAt: conn.last_synced_at,
      lastSyncError: conn.last_sync_error,
      createdAt: conn.created_at,
    }));

    return NextResponse.json({ connections: transformedConnections });
  } catch (error) {
    console.error('Error fetching external calendars:', error);
    return NextResponse.json(
      { error: 'Failed to fetch external calendars', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST: Initiate OAuth flow for external calendar
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.firmId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { provider } = body as { provider: ExternalCalendarProvider };

    if (!provider || provider !== 'GOOGLE') {
      return NextResponse.json(
        { error: `Provider ${provider} is not supported`, code: 'INVALID_PROVIDER' },
        { status: 400 }
      );
    }

    // Phase 5 feature - provider implementation disabled
    // Return error until feature is enabled
    return NextResponse.json(
      { error: 'External calendar sync is disabled', code: 'FEATURE_DISABLED' },
      { status: 503 }
    );
  } catch (error) {
    console.error('Error initiating OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH: Update connection settings
// =============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.firmId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { connectionId, syncMode, isEnabled } = body as {
      connectionId: string;
      syncMode?: ExternalCalendarSyncMode;
      isEnabled?: boolean;
    };

    const supabase = await createSupabaseServerClient();

    // Verify ownership
    const { data: connection, error: connectionError } = await supabase
      .from('external_calendar_connections')
      .select('id')
      .eq('id', connectionId)
      .eq('user_id', session.user.id)
      .eq('firm_id', session.user.firmId)
      .maybeSingle();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'Connection not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (syncMode !== undefined) updateData.sync_mode = syncMode;
    if (isEnabled !== undefined) updateData.is_enabled = isEnabled;

    const { data: updated, error: updateError } = await supabase
      .from('external_calendar_connections')
      .update(updateData)
      .eq('id', connectionId)
      .select('id, provider, sync_mode, is_enabled, last_synced_at')
      .single();

    if (updateError) {
      throw updateError;
    }

    const transformedUpdated = {
      id: updated.id,
      provider: updated.provider,
      syncMode: updated.sync_mode,
      isEnabled: updated.is_enabled,
      lastSyncedAt: updated.last_synced_at,
    };

    return NextResponse.json({ connection: transformedUpdated });
  } catch (error) {
    console.error('Error updating connection:', error);
    return NextResponse.json(
      { error: 'Failed to update connection', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE: Disconnect external calendar
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.firmId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Verify ownership
    const { data: connection, error: connectionError } = await supabase
      .from('external_calendar_connections')
      .select('id')
      .eq('id', connectionId)
      .eq('user_id', session.user.id)
      .eq('firm_id', session.user.firmId)
      .maybeSingle();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'Connection not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const syncService = new ExternalCalendarSyncService();
    await (syncService as any).disconnectCalendar(
      connectionId,
      session.user.id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting calendar:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect calendar', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}


