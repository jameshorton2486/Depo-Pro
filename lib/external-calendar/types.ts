// =============================================================================
// STEP 4: EXTERNAL CALENDAR PROVIDER ABSTRACTION
// =============================================================================
// lib/external-calendar/providers/types.ts
// =============================================================================

import { ExternalCalendarProvider, ExternalCalendarSyncMode } from '@/lib/enums';

// =============================================================================
// EXTERNAL EVENT TYPES
// =============================================================================

export interface ExternalEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  isAllDay: boolean;
  location?: string;
  meetingLink?: string;
  etag?: string;
  metadata?: Record<string, unknown>;
}

export interface ExternalCalendar {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isPrimary: boolean;
  accessRole: 'owner' | 'writer' | 'reader';
}

// =============================================================================
// OAUTH TYPES
// =============================================================================

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes: string[];
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

// =============================================================================
// SYNC TYPES
// =============================================================================

export interface SyncResult {
  success: boolean;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  conflictsFound: number;
  nextSyncToken?: string;
  errors: SyncError[];
}

export interface SyncError {
  eventId?: string;
  code: string;
  message: string;
  details?: unknown;
}

export interface SyncOptions {
  fullSync?: boolean;          // Force full sync instead of incremental
  syncToken?: string;          // Token from previous sync
  timeMin?: Date;              // Only sync events after this time
  timeMax?: Date;              // Only sync events before this time
  maxResults?: number;         // Limit number of events
}

// =============================================================================
// PROVIDER INTERFACE
// =============================================================================

export interface ExternalCalendarProviderInterface {
  readonly provider: ExternalCalendarProvider;
  
  // === AUTHENTICATION ===
  getAuthUrl(state: string): string;
  exchangeCodeForTokens(code: string): Promise<OAuthTokens>;
  refreshAccessToken(refreshToken: string): Promise<OAuthTokens>;
  revokeAccess(accessToken: string): Promise<void>;
  
  // === CALENDARS ===
  listCalendars(accessToken: string): Promise<ExternalCalendar[]>;
  
  // === EVENTS (READ) ===
  listEvents(
    accessToken: string,
    calendarId: string,
    options?: SyncOptions
  ): Promise<{ events: ExternalEvent[]; nextSyncToken?: string }>;
  
  getEvent(
    accessToken: string,
    calendarId: string,
    eventId: string
  ): Promise<ExternalEvent | null>;
  
  // === EVENTS (WRITE) - Only for PUSH_INTERNAL and BIDIRECTIONAL modes ===
  createEvent?(
    accessToken: string,
    calendarId: string,
    event: Omit<ExternalEvent, 'id' | 'etag'>
  ): Promise<ExternalEvent>;
  
  updateEvent?(
    accessToken: string,
    calendarId: string,
    eventId: string,
    event: Partial<ExternalEvent>
  ): Promise<ExternalEvent>;
  
  deleteEvent?(
    accessToken: string,
    calendarId: string,
    eventId: string
  ): Promise<void>;
  
  // === WEBHOOKS (Optional) ===
  setupWebhook?(
    accessToken: string,
    calendarId: string,
    webhookUrl: string
  ): Promise<{ webhookId: string; expiration: Date }>;
  
  stopWebhook?(
    accessToken: string,
    webhookId: string
  ): Promise<void>;
}

// =============================================================================
// PROVIDER REGISTRY
// =============================================================================

const providers: Map<ExternalCalendarProvider, ExternalCalendarProviderInterface> = new Map();

export function registerProvider(
  provider: ExternalCalendarProvider,
  implementation: ExternalCalendarProviderInterface
): void {
  providers.set(provider, implementation);
}

export function getProvider(
  provider: ExternalCalendarProvider
): ExternalCalendarProviderInterface {
  const impl = providers.get(provider);
  if (!impl) {
    throw new Error(`Provider ${provider} is not registered`);
  }
  return impl;
}

export function hasProvider(provider: ExternalCalendarProvider): boolean {
  return providers.has(provider);
}

export function listRegisteredProviders(): ExternalCalendarProvider[] {
  return Array.from(providers.keys());
}

// =============================================================================
// SYNC MODE HELPERS
// =============================================================================

export function canReadExternal(_mode: ExternalCalendarSyncMode): boolean {
  return true; // All modes can read
}

export function canWriteExternal(_mode: ExternalCalendarSyncMode): boolean {
  return mode === ExternalCalendarSyncMode.PUSH_INTERNAL || 
         mode === ExternalCalendarSyncMode.BIDIRECTIONAL;
}

export function canSyncBidirectional(_mode: ExternalCalendarSyncMode): boolean {
  return mode === ExternalCalendarSyncMode.BIDIRECTIONAL;
}
