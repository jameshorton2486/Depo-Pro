// =============================================================================
// STEP 4: EXTERNAL CALENDAR API ROUTES
// =============================================================================
// app/api/external-calendar/route.ts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { ExternalCalendarProvider, ExternalCalendarSyncMode } from '@/lib/enums';
import { externalCalendarSyncService } from '@/lib/external-calendar/sync-service';
import { getProvider, hasProvider } from '@/lib/external-calendar/providers/types';

// =============================================================================
// GET: List user's external calendar connections
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.firmId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }

    const connections = await prisma.externalCalendarConnection.findMany({
      where: {
        userId: session.user.id,
        firmId: session.user.firmId,
      },
      select: {
        id: true,
        provider: true,
        syncMode: true,
        calendarName: true,
        isEnabled: true,
        lastSyncedAt: true,
        lastSyncError: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ connections });
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.firmId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { provider } = body as { provider: ExternalCalendarProvider };

    if (!provider || !hasProvider(provider)) {
      return NextResponse.json(
        { error: `Provider ${provider} is not supported`, code: 'INVALID_PROVIDER' },
        { status: 400 }
      );
    }

    const providerImpl = getProvider(provider);

    // Generate state token for OAuth
    const state = Buffer.from(JSON.stringify({
      userId: session.user.id,
      firmId: session.user.firmId,
      provider,
      timestamp: Date.now(),
    })).toString('base64');

    const authUrl = providerImpl.getAuthUrl(state);

    return NextResponse.json({ authUrl });
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
    const session = await getServerSession(authOptions);
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

    // Verify ownership
    const connection = await prisma.externalCalendarConnection.findFirst({
      where: {
        id: connectionId,
        userId: session.user.id,
        firmId: session.user.firmId,
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const updated = await prisma.externalCalendarConnection.update({
      where: { id: connectionId },
      data: {
        ...(syncMode !== undefined && { syncMode }),
        ...(isEnabled !== undefined && { isEnabled }),
      },
      select: {
        id: true,
        provider: true,
        syncMode: true,
        isEnabled: true,
        lastSyncedAt: true,
      },
    });

    return NextResponse.json({ connection: updated });
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
    const session = await getServerSession(authOptions);
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

    // Verify ownership
    const connection = await prisma.externalCalendarConnection.findFirst({
      where: {
        id: connectionId,
        userId: session.user.id,
        firmId: session.user.firmId,
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    await externalCalendarSyncService.disconnectCalendar(
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
