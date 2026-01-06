/**
 * External Calendar Sync Service
 */

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  errors: string[];
}

export interface ConnectionResult {
  success: boolean;
  connectionId?: string;
  error?: string;
}

export class ExternalCalendarSyncService {
  async connectCalendar(
    userId: string,
    provider: string,
    code: string,
    redirectUri: string
  ): Promise<ConnectionResult> {
    console.log('[CalendarSync] connectCalendar', { userId, provider, redirectUri, code: code?.slice(0, 10) });
    return { success: true, connectionId: `conn-${Date.now()}` };
  }

  async disconnectCalendar(
    userId: string,
    connectionId: string
  ): Promise<{ success: boolean; error?: string }> {
    console.log('[CalendarSync] disconnectCalendar', { userId, connectionId });
    return { success: true };
  }

  async syncEvents(connectionId: string): Promise<SyncResult> {
    console.log('[CalendarSync] syncEvents', { connectionId });
    return { success: true, syncedCount: 0, errors: [] };
  }

  async getConnections(userId: string): Promise<any[]> {
    console.log('[CalendarSync] getConnections', { userId });
    return [];
  }
}

export const externalCalendarSyncService = new ExternalCalendarSyncService();
