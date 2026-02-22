// =============================================================================
// STEP 4: GOOGLE CALENDAR OAUTH CALLBACK
// =============================================================================
// app/api/external-calendar/google/callback/route.ts
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import type { ExternalCalendarProvider } from '@/lib/enums';
import { externalCalendarSyncService } from '@/lib/external-calendar/sync-service';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(
        new URL('/settings/calendar?error=oauth_denied', request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings/calendar?error=missing_params', request.url)
      );
    }

    // Decode state
    let stateData: {
      userId: string;
      firmId: string;
      provider: ExternalCalendarProvider;
      timestamp: number;
    };

    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return NextResponse.redirect(
        new URL('/settings/calendar?error=invalid_state', request.url)
      );
    }

    // Verify session matches state
    const currentUser = await getCurrentUser();
    if (!currentUser?.id || currentUser.id !== stateData.userId) {
      return NextResponse.redirect(
        new URL('/settings/calendar?error=session_mismatch', request.url)
      );
    }

    // Verify state isn't too old (15 minutes)
    if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
      return NextResponse.redirect(
        new URL('/settings/calendar?error=state_expired', request.url)
      );
    }

    // Connect calendar
    const result = await externalCalendarSyncService.connectCalendar(
      stateData.userId,
      stateData.firmId,
      stateData.provider,
      code
    );

    if (!result.success) {
      logger.error('Failed to connect calendar', new Error(result.error || 'connection_failed'), { userId: stateData.userId, provider: stateData.provider });
      return NextResponse.redirect(
        new URL(`/settings/calendar?error=${encodeURIComponent(result.error || 'connection_failed')}`, request.url)
      );
    }

    return NextResponse.redirect(
      new URL('/settings/calendar?success=connected', request.url)
    );
  } catch (error) {
    logger.error('Error in Google OAuth callback', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.redirect(
      new URL('/settings/calendar?error=internal_error', request.url)
    );
  }
}
