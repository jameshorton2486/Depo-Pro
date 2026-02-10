import { logger } from '@/lib/logger';
// lib/external-calendar/sync-service.ts
// STUB: External calendar sync service
//
// Production guard: This service is stubbed and will throw in production
// to prevent silent failures. Implement real calendar sync before deploying.

export class ExternalCalendarSyncService {
  async syncEvents(__connectionId: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[ExternalCalendarSyncService] syncEvents is not implemented. ' +
        'This is a stubbed service - implement real calendar sync before production deployment.'
      );
    }
    logger.debug('[STUB] ExternalCalendarSyncService.syncEvents called');
    return { synced: 0, errors: [] };
  }

  async getAuthUrl(__provider: string, __userId: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[ExternalCalendarSyncService] getAuthUrl is not implemented. ' +
        'This is a stubbed service - implement real calendar sync before production deployment.'
      );
    }
    logger.debug('[STUB] ExternalCalendarSyncService.getAuthUrl called');
    return '';
  }

  async handleCallback(__code: string, __state: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[ExternalCalendarSyncService] handleCallback is not implemented. ' +
        'This is a stubbed service - implement real calendar sync before production deployment.'
      );
    }
    logger.debug('[STUB] ExternalCalendarSyncService.handleCallback called');
    return { success: false };
  }

  async connectCalendar(__userId: string, __firmId: string, __provider: string, __code: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[ExternalCalendarSyncService] connectCalendar is not implemented. ' +
        'This is a stubbed service - implement real calendar sync before production deployment.'
      );
    }
    logger.debug('[STUB] ExternalCalendarSyncService.connectCalendar called');
    return { success: false, error: 'External calendar sync not implemented' };
  }
}

export const externalCalendarSyncService = new ExternalCalendarSyncService();
