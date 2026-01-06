// =============================================================================
// STEP 4: EXTERNAL CALENDAR SYNC SERVICE
// =============================================================================
// lib/external-calendar/sync-service.ts
// =============================================================================

import { logAudit } from '@/lib/audit';
import { 
  ExternalCalendarProvider, 
  ExternalCalendarSyncMode,
  ExternalEventSyncStatus,
  CalendarEventStatus,
  AuditAction,
  AuditEntityType,
} from '@/lib/enums';
import { 
  getProvider, 
  hasProvider,
  ExternalEvent,
  SyncResult,
  SyncError,
  _canWriteExternal,
} from './providers/types';

// =============================================================================
// TYPES
// =============================================================================

interface SyncContext {
  connectionId: string;
  firmId: string;
  userId: string;
  provider: ExternalCalendarProvider;
  syncMode: ExternalCalendarSyncMode;
  calendarId: string;
}

interface ConflictInfo {
  externalEventId: string;
  internalEventIds: string[];
  type: 'OVERLAP' | 'DOUBLE_BOOKING';
}

// =============================================================================
// SYNC SERVICE CLASS
// =============================================================================

export class ExternalCalendarSyncService {
  
  // ===========================================================================
  // MAIN SYNC METHOD
  // ===========================================================================

  async syncCalendar(connectionId: string, fullSync = false): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: SyncError[] = [];
    let eventsCreated = 0;
    let eventsUpdated = 0;
    let eventsDeleted = 0;
    let conflictsFound = 0;

    // Get connection details
    const connection = await prisma.externalCalendarConnection.findUnique({
      where: { id: connectionId },
      include: { user: true },
    });

    if (!connection) {
      throw new Error('External calendar connection not found');
    }

    if (!connection.isEnabled) {
      return {
        success: false,
        eventsCreated: 0,
        eventsUpdated: 0,
        eventsDeleted: 0,
        conflictsFound: 0,
        errors: [{ code: 'DISABLED', message: 'Calendar sync is disabled' }],
      };
    }

    // Check provider availability
    if (!hasProvider(connection.provider as ExternalCalendarProvider)) {
      return {
        success: false,
        eventsCreated: 0,
        eventsUpdated: 0,
        eventsDeleted: 0,
        conflictsFound: 0,
        errors: [{ code: 'NO_PROVIDER', message: `Provider ${connection.provider} not configured` }],
      };
    }

    const provider = getProvider(connection.provider as ExternalCalendarProvider);

    // Refresh token if expired
    let accessToken = connection.accessToken;
    if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
      if (connection.refreshToken) {
        try {
          const newTokens = await provider.refreshAccessToken(connection.refreshToken);
          accessToken = newTokens.accessToken;
          
          await prisma.externalCalendarConnection.update({
            where: { id: connectionId },
            data: {
              accessToken: newTokens.accessToken,
              tokenExpiresAt: newTokens.expiresAt,
            },
          });
        } catch (error) {
          errors.push({
            code: 'TOKEN_REFRESH_FAILED',
            message: (error as Error).message,
          });
          await this.logSyncResult(connectionId, 'INCREMENTAL', 'FAILED', {
            eventsCreated: 0,
            eventsUpdated: 0,
            eventsDeleted: 0,
            conflictsFound: 0,
            errors,
            durationMs: Date.now() - startTime,
          });
          return {
            success: false,
            eventsCreated: 0,
            eventsUpdated: 0,
            eventsDeleted: 0,
            conflictsFound: 0,
            errors,
          };
        }
      }
    }

    const context: SyncContext = {
      connectionId,
      firmId: connection.firmId,
      userId: connection.userId,
      provider: connection.provider as ExternalCalendarProvider,
      syncMode: connection.syncMode as ExternalCalendarSyncMode,
      calendarId: connection.providerCalendarId,
    };

    try {
      // Fetch events from external calendar
      const syncOptions = fullSync 
        ? { fullSync: true, timeMin: new Date() }
        : { syncToken: connection.lastSyncToken || undefined, timeMin: new Date() };

      const { events: externalEvents, nextSyncToken } = await provider.listEvents(
        accessToken,
        connection.providerCalendarId,
        syncOptions
      );

      // Process each external event
      for (const externalEvent of externalEvents) {
        try {
          const result = await this.processExternalEvent(context, externalEvent);
          if (result.created) eventsCreated++;
          if (result.updated) eventsUpdated++;
          if (result.hasConflict) conflictsFound++;
        } catch (error) {
          errors.push({
            eventId: externalEvent.id,
            code: 'PROCESS_ERROR',
            message: (error as Error).message,
          });
        }
      }

      // Handle deleted events (mark as deleted in our system)
      if (!fullSync && connection.lastSyncToken) {
        const deletedCount = await this.markDeletedEvents(context, externalEvents);
        eventsDeleted = deletedCount;
      }

      // Update connection with sync state
      await prisma.externalCalendarConnection.update({
        where: { id: connectionId },
        data: {
          lastSyncedAt: new Date(),
          lastSyncToken: nextSyncToken,
          syncErrorCount: errors.length > 0 ? connection.syncErrorCount + 1 : 0,
          lastSyncError: errors.length > 0 ? errors[0].message : null,
        },
      });

      // Log sync result
      await this.logSyncResult(connectionId, fullSync ? 'FULL' : 'INCREMENTAL', 
        errors.length === 0 ? 'SUCCESS' : 'PARTIAL', {
        eventsCreated,
        eventsUpdated,
        eventsDeleted,
        conflictsFound,
        errors,
        durationMs: Date.now() - startTime,
      });

      // Audit log
      await logAudit({
        action: 'EXTERNAL_CALENDAR_SYNCED' as AuditAction,
        entityType: AuditEntityType.CalendarEvent,
        entityId: connectionId,
        userId: connection.userId,
        details: {
          firmId: connection.firmId,
          provider: connection.provider,
          eventsCreated,
          eventsUpdated,
          eventsDeleted,
          conflictsFound,
        },
      });

      return {
        success: errors.length === 0,
        eventsCreated,
        eventsUpdated,
        eventsDeleted,
        conflictsFound,
        nextSyncToken,
        errors,
      };

    } catch (error) {
      errors.push({
        code: 'SYNC_FAILED',
        message: (error as Error).message,
      });

      await this.logSyncResult(connectionId, fullSync ? 'FULL' : 'INCREMENTAL', 'FAILED', {
        eventsCreated,
        eventsUpdated,
        eventsDeleted,
        conflictsFound,
        errors,
        durationMs: Date.now() - startTime,
      });

      // Audit log failure
      await logAudit({
        action: 'EXTERNAL_CALENDAR_SYNC_FAILED' as AuditAction,
        entityType: AuditEntityType.CalendarEvent,
        entityId: connectionId,
        userId: connection.userId,
        details: {
          firmId: connection.firmId,
          provider: connection.provider,
          error: (error as Error).message,
        },
      });

      return {
        success: false,
        eventsCreated,
        eventsUpdated,
        eventsDeleted,
        conflictsFound,
        errors,
      };
    }
  }

  // ===========================================================================
  // PROCESS EXTERNAL EVENT
  // ===========================================================================

  private async processExternalEvent(
    context: SyncContext,
    externalEvent: ExternalEvent
  ): Promise<{ created: boolean; updated: boolean; hasConflict: boolean }> {
    // Check if we already have this event
    const existing = await prisma.externalCalendarEvent.findUnique({
      where: {
        connectionId_providerEventId: {
          connectionId: context.connectionId,
          providerEventId: externalEvent.id,
        },
      },
    });

    // Detect conflicts with internal events
    const conflicts = await this.detectConflicts(context, externalEvent);
    const hasConflict = conflicts.length > 0;

    if (existing) {
      // Update existing event
      // Only update if etag changed (event was modified)
      if (existing.providerEtag !== externalEvent.etag) {
        await prisma.externalCalendarEvent.update({
          where: { id: existing.id },
          data: {
            title: externalEvent.title,
            description: externalEvent.description,
            startTime: externalEvent.startTime,
            endTime: externalEvent.endTime,
            timezone: externalEvent.timezone,
            isAllDay: externalEvent.isAllDay,
            location: externalEvent.location,
            meetingLink: externalEvent.meetingLink,
            providerEtag: externalEvent.etag,
            lastSyncedAt: new Date(),
            syncStatus: hasConflict 
              ? ExternalEventSyncStatus.CONFLICT 
              : ExternalEventSyncStatus.SYNCED,
            hasConflict,
            conflictingEventIds: conflicts.flatMap(c => c.internalEventIds),
            providerMetadata: externalEvent.metadata as any,
          },
        });
        return { created: false, updated: true, hasConflict };
      }
      return { created: false, updated: false, hasConflict };
    }

    // Create new external event record
    await prisma.externalCalendarEvent.create({
      data: {
        firmId: context.firmId,
        connectionId: context.connectionId,
        providerEventId: externalEvent.id,
        providerCalendarId: externalEvent.calendarId,
        providerEtag: externalEvent.etag,
        title: externalEvent.title,
        description: externalEvent.description,
        startTime: externalEvent.startTime,
        endTime: externalEvent.endTime,
        timezone: externalEvent.timezone,
        isAllDay: externalEvent.isAllDay,
        location: externalEvent.location,
        meetingLink: externalEvent.meetingLink,
        syncStatus: hasConflict 
          ? ExternalEventSyncStatus.CONFLICT 
          : ExternalEventSyncStatus.SYNCED,
        hasConflict,
        conflictingEventIds: conflicts.flatMap(c => c.internalEventIds),
        providerMetadata: externalEvent.metadata as any,
      },
    });

    return { created: true, updated: false, hasConflict };
  }

  // ===========================================================================
  // CONFLICT DETECTION
  // ===========================================================================

  /**
   * HARD GUARDRAIL: Internal Depo-Pro events ALWAYS win
   * External events that conflict are marked but cannot override internal events
   */
  private async detectConflicts(
    context: SyncContext,
    externalEvent: ExternalEvent
  ): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];

    // Find overlapping internal calendar events
    const overlappingEvents = await prisma.calendarEvent.findMany({
      where: {
        firmId: context.firmId,
        status: {
          notIn: [
            CalendarEventStatus.CANCELLED,
            CalendarEventStatus.EXTERNAL_BLOCK,
          ],
        },
        OR: [
          {
            // Event starts during external event
            startTime: {
              gte: externalEvent.startTime,
              lt: externalEvent.endTime,
            },
          },
          {
            // Event ends during external event
            endTime: {
              gt: externalEvent.startTime,
              lte: externalEvent.endTime,
            },
          },
          {
            // Event spans external event
            AND: [
              { startTime: { lte: externalEvent.startTime } },
              { endTime: { gte: externalEvent.endTime } },
            ],
          },
        ],
      },
      select: {
        id: true,
        assignedReporterId: true,
      },
    });

    if (overlappingEvents.length > 0) {
      conflicts.push({
        externalEventId: externalEvent.id,
        internalEventIds: overlappingEvents.map(e => e.id),
        type: 'OVERLAP',
      });
    }

    return conflicts;
  }

  // ===========================================================================
  // HANDLE DELETED EVENTS
  // ===========================================================================

  private async markDeletedEvents(
    context: SyncContext,
    currentEvents: ExternalEvent[]
  ): Promise<number> {
    const currentEventIds = new Set(currentEvents.map(e => e.id));

    // Find events that exist in our DB but not in the sync response
    const existingEvents = await prisma.externalCalendarEvent.findMany({
      where: {
        connectionId: context.connectionId,
        syncStatus: { not: ExternalEventSyncStatus.DELETED },
        deletedAt: null,
      },
      select: {
        id: true,
        providerEventId: true,
      },
    });

    const toDelete = existingEvents.filter(
      e => !currentEventIds.has(e.providerEventId)
    );

    if (toDelete.length > 0) {
      // Soft delete - mark as deleted, don't remove
      await prisma.externalCalendarEvent.updateMany({
        where: {
          id: { in: toDelete.map(e => e.id) },
        },
        data: {
          syncStatus: ExternalEventSyncStatus.DELETED,
          deletedAt: new Date(),
        },
      });
    }

    return toDelete.length;
  }

  // ===========================================================================
  // SYNC LOGGING
  // ===========================================================================

  private async logSyncResult(
    connectionId: string,
    syncType: string,
    status: string,
    data: {
      eventsCreated: number;
      eventsUpdated: number;
      eventsDeleted: number;
      conflictsFound: number;
      errors: SyncError[];
      durationMs: number;
    }
  ): Promise<void> {
    await prisma.externalCalendarSyncLog.create({
      data: {
        connectionId,
        syncType,
        status,
        eventsCreated: data.eventsCreated,
        eventsUpdated: data.eventsUpdated,
        eventsDeleted: data.eventsDeleted,
        conflictsFound: data.conflictsFound,
        durationMs: data.durationMs,
        errorMessage: data.errors.length > 0 ? data.errors[0].message : null,
        errorDetails: data.errors.length > 0 ? (data.errors as any) : undefined,
        completedAt: new Date(),
      },
    });
  }

  // ===========================================================================
  // CONNECTION MANAGEMENT
  // ===========================================================================

  async connectCalendar(
    userId: string,
    firmId: string,
    provider: ExternalCalendarProvider,
    code: string,
    calendarId: string = 'primary'
  ): Promise<{ success: boolean; connectionId?: string; error?: string }> {
    if (!hasProvider(provider)) {
      return { success: false, error: `Provider ${provider} not configured` };
    }

    const providerImpl = getProvider(provider);

    try {
      // Exchange code for tokens
      const tokens = await providerImpl.exchangeCodeForTokens(code);

      // Get calendar info
      const calendars = await providerImpl.listCalendars(tokens.accessToken);
      const selectedCalendar = calendars.find((c: any) => c.id === calendarId) || calendars[0];

      if (!selectedCalendar) {
        return { success: false, error: 'No calendars found' };
      }

      // Create connection
      const connection = await prisma.externalCalendarConnection.create({
        data: {
          firmId,
          userId,
          provider,
          providerCalendarId: selectedCalendar.id,
          calendarName: selectedCalendar.name,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.expiresAt,
          scopes: tokens.scopes,
          syncMode: ExternalCalendarSyncMode.READ_ONLY, // Default to safest mode
        },
      });

      // Audit log
      await logAudit({
        action: 'EXTERNAL_CALENDAR_CONNECTED' as AuditAction,
        entityType: AuditEntityType.CalendarEvent,
        entityId: connection.id,
        userId,
        details: { provider, calendarId: selectedCalendar.id, firmId },
      });

      // Trigger initial sync
      this.syncCalendar(connection.id, true).catch(console.error);

      return { success: true, connectionId: connection.id };

    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async disconnectCalendar(connectionId: string, userId: string): Promise<void> {
    const connection = await prisma.externalCalendarConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    // Revoke access if possible
    if (hasProvider(connection.provider as ExternalCalendarProvider)) {
      try {
        const provider = getProvider(connection.provider as ExternalCalendarProvider);
        await provider.revokeAccess(connection.accessToken);
      } catch (error) {
        console.warn('Failed to revoke access:', error);
      }
    }

    // Delete all associated external events
    await prisma.externalCalendarEvent.deleteMany({
      where: { connectionId },
    });

    // Delete sync logs
    await prisma.externalCalendarSyncLog.deleteMany({
      where: { connectionId },
    });

    // Delete connection
    await prisma.externalCalendarConnection.delete({
      where: { id: connectionId },
    });

    // Audit log
    await logAudit({
      action: 'EXTERNAL_CALENDAR_DISCONNECTED' as AuditAction,
      entityType: AuditEntityType.CalendarEvent,
      entityId: connectionId,
      userId,
      details: { provider: connection.provider, firmId: connection.firmId },
    });
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const externalCalendarSyncService = new ExternalCalendarSyncService();
