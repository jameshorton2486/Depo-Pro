import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
// =============================================================================
// GOOGLE CALENDAR SYNC ROUTE (Server-Only, Safe)
// app/api/calendar/google/sync/route.ts
//
// Security Rules:
// - Server routes only (runtime = 'nodejs')
// - OAuth tokens stored encrypted in Supabase
// - Never expose Google APIs to client
// =============================================================================

export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getGoogleClient, isTokenExpired, refreshGoogleToken } from '@/lib/google';
import { logger } from '@/lib/logger';

/**
 * POST /api/calendar/google/sync
 * Sync calendar events from Google Calendar
 */
async function POSTHandler(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn('[google-sync] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get stored Google token
    const { data: token, error: tokenError } = await supabase
      .from('google_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !token) {
      logger.warn('[google-sync] No Google token found', { userId: user.id });
      return NextResponse.json(
        { error: 'Google Calendar not connected. Please connect your Google account first.' },
        { status: 400 }
      );
    }

    // Check if token needs refresh
    let accessToken = token.access_token;
    let expiresAt = token.expires_at;

    if (isTokenExpired(token)) {
      logger.info('[google-sync] Refreshing expired token', { userId: user.id });
      
      try {
        const refreshed = await refreshGoogleToken(token.refresh_token);
        accessToken = refreshed.access_token;
        expiresAt = refreshed.expires_at;

        // Update stored token
        await supabase
          .from('google_tokens')
          .update({
            access_token: accessToken,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      } catch (refreshError) {
        logger.error('[google-sync] Token refresh failed', refreshError instanceof Error ? refreshError : new Error(String(refreshError)), { userId: user.id });
        return NextResponse.json(
          { error: 'Failed to refresh Google token. Please reconnect your Google account.' },
          { status: 500 }
        );
      }
    }

    // Get Google Calendar client
    const calendar = getGoogleClient({
      access_token: accessToken,
      refresh_token: token.refresh_token,
      expires_at: expiresAt,
    });

    // Fetch events from Google Calendar
    const { data: { start, end } } = await req.json().catch(() => ({ data: {} }));
    
    const now = new Date();
    const timeMin = start ? new Date(start) : now;
    const timeMax = end ? new Date(end) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];

    logger.info('[google-sync] Events synced', {
      userId: user.id,
      eventCount: events.length,
      timeRange: { start: timeMin.toISOString(), end: timeMax.toISOString() },
    });

    return NextResponse.json({
      success: true,
      events: events.map((event) => ({
        id: event.id,
        title: event.summary || 'Untitled Event',
        description: event.description,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        location: event.location,
        htmlLink: event.htmlLink,
        status: event.status,
      })),
      count: events.length,
    });

  } catch (error) {
    logger.error('[google-sync] Sync error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to sync Google Calendar events' },
      { status: 500 }
    );
  }
}

export const POST = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.SCOPIST] },
  POSTHandler as any
);

