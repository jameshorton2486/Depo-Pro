// lib/external-calendar/sync-service.ts
// STUB: External calendar sync service

export class ExternalCalendarSyncService {
  async syncEvents(__connectionId: string) {
    console.log('[STUB] ExternalCalendarSyncService.syncEvents called');
    return { synced: 0, errors: [] };
  }

  async getAuthUrl(__provider: string, __userId: string) {
    console.log('[STUB] ExternalCalendarSyncService.getAuthUrl called');
    return '';
  }

  async handleCallback(__code: string, __state: string) {
    console.log('[STUB] ExternalCalendarSyncService.handleCallback called');
    return { success: false };
  }
}

export const externalCalendarSyncService = new ExternalCalendarSyncService();
