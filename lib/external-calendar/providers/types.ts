// =============================================================================
// EXTERNAL CALENDAR PROVIDER TYPES (STUB)
// =============================================================================
// Phase 5 feature - currently stubbed for safety
// Real types exist in lib/external-calendar/types.ts
// =============================================================================

import { ExternalCalendarProvider, ExternalCalendarSyncMode } from '@/lib/enums';
import type { ExternalEvent as ExternalEventType, SyncResult as SyncResultType, SyncError as SyncErrorType } from '../types';

/**
 * External calendar provider type.
 */
export type ExternalProvider = 'google' | 'outlook' | 'apple';

// Re-export types from main types file
export type ExternalEvent = ExternalEventType;
export type SyncResult = SyncResultType;
export type SyncError = SyncErrorType;

// Provider registry functions
const providers: Map<ExternalCalendarProvider, any> = new Map();

export function getProvider(provider: ExternalCalendarProvider) {
  const impl = providers.get(provider);
  if (!impl) {
    throw new Error(`Provider ${provider} is not registered`);
  }
  return impl;
}

export function hasProvider(provider: ExternalCalendarProvider): boolean {
  return providers.has(provider);
}

export function _canWriteExternal(mode: ExternalCalendarSyncMode): boolean {
  return mode === ExternalCalendarSyncMode.PUSH_INTERNAL || 
         mode === ExternalCalendarSyncMode.BIDIRECTIONAL;
}

