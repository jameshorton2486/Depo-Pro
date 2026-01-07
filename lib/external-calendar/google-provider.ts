// =============================================================================
// STEP 4: GOOGLE CALENDAR PROVIDER
// =============================================================================
// lib/external-calendar/providers/google.ts
// =============================================================================

import { ExternalCalendarProvider } from '@/lib/enums';
import type {
  ExternalCalendarProviderInterface,
  ExternalEvent,
  ExternalCalendar,
  OAuthTokens,
  SyncOptions,
} from './types';

// =============================================================================
// GOOGLE CALENDAR API TYPES
// =============================================================================

interface GoogleCalendarListResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  items: GoogleCalendarResource[];
}

interface GoogleCalendarResource {
  kind: string;
  etag: string;
  id: string;
  summary: string;
  description?: string;
  location?: string;
  timeZone?: string;
  colorId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
  accessRole: 'owner' | 'writer' | 'reader' | 'freeBusyReader';
}

interface GoogleEventListResponse {
  kind: string;
  etag: string;
  summary: string;
  updated: string;
  timeZone: string;
  accessRole: string;
  nextPageToken?: string;
  nextSyncToken?: string;
  items: GoogleEventResource[];
}

interface GoogleEventResource {
  kind: string;
  etag: string;
  id: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink: string;
  created: string;
  updated: string;
  summary?: string;
  description?: string;
  location?: string;
  creator: { email: string; displayName?: string; self?: boolean };
  organizer: { email: string; displayName?: string; self?: boolean };
  start: GoogleDateTime;
  end: GoogleDateTime;
  recurrence?: string[];
  recurringEventId?: string;
  transparency?: 'opaque' | 'transparent';
  visibility?: 'default' | 'public' | 'private' | 'confidential';
  attendees?: GoogleAttendee[];
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{ entryPointType: string; uri: string }>;
  };
}

interface GoogleDateTime {
  date?: string;        // For all-day events
  dateTime?: string;    // For timed events
  timeZone?: string;
}

interface GoogleAttendee {
  email: string;
  displayName?: string;
  responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  self?: boolean;
}

// =============================================================================
// GOOGLE CALENDAR PROVIDER
// =============================================================================

export class GoogleCalendarProvider implements ExternalCalendarProviderInterface {
  readonly provider = ExternalCalendarProvider.GOOGLE;

  private readonly config = {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 
      `${process.env.NEXTAUTH_URL}/api/external-calendar/google/callback`,
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    revokeUrl: 'https://oauth2.googleapis.com/revoke',
    apiBase: 'https://www.googleapis.com/calendar/v3',
  };

  // === AUTHENTICATION ===

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return `${this.config.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in 
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      scopes: data.scope?.split(' ') || [],
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: refreshToken, // Keep the existing refresh token
      expiresAt: data.expires_in 
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      scopes: data.scope?.split(' ') || [],
    };
  }

  async revokeAccess(accessToken: string): Promise<void> {
    const response = await fetch(
      `${this.config.revokeUrl}?token=${accessToken}`,
      { method: 'POST' }
    );

    if (!response.ok) {
      // Revocation failure is non-critical, log but don't throw
      console.warn('Failed to revoke Google access token');
    }
  }

  // === CALENDARS ===

  async listCalendars(accessToken: string): Promise<ExternalCalendar[]> {
    const response = await this.apiRequest<GoogleCalendarListResponse>(
      accessToken,
      '/users/me/calendarList'
    );

    return response.items.map((cal) => ({
      id: cal.id,
      name: cal.summary,
      description: cal.description,
      color: cal.backgroundColor,
      isPrimary: cal.primary || false,
      accessRole: this.mapAccessRole(cal.accessRole),
    }));
  }

  // === EVENTS (READ) ===

  async listEvents(
    accessToken: string,
    calendarId: string,
    options?: SyncOptions
  ): Promise<{ events: ExternalEvent[]; nextSyncToken?: string }> {
    const params: Record<string, string> = {
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: String(options?.maxResults || 250),
    };

    if (options?.syncToken && !options.fullSync) {
      params.syncToken = options.syncToken;
    } else {
      // Full sync - set time bounds
      params.timeMin = (options?.timeMin || new Date()).toISOString();
      if (options?.timeMax) {
        params.timeMax = options.timeMax.toISOString();
      }
    }

    const allEvents: ExternalEvent[] = [];
    let pageToken: string | undefined;
    let nextSyncToken: string | undefined;

    do {
      const queryParams = pageToken 
        ? { ...params, pageToken } 
        : params;

      const response = await this.apiRequest<GoogleEventListResponse>(
        accessToken,
        `/calendars/${encodeURIComponent(calendarId)}/events`,
        queryParams
      );

      for (const event of response.items) {
        if (event.status !== 'cancelled') {
          const mapped = this.mapGoogleEvent(event, calendarId);
          if (mapped) {
            allEvents.push(mapped);
          }
        }
      }

      pageToken = response.nextPageToken;
      nextSyncToken = response.nextSyncToken;
    } while (pageToken);

    return { events: allEvents, nextSyncToken };
  }

  async getEvent(
    accessToken: string,
    calendarId: string,
    eventId: string
  ): Promise<ExternalEvent | null> {
    try {
      const event = await this.apiRequest<GoogleEventResource>(
        accessToken,
        `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`
      );

      return this.mapGoogleEvent(event, calendarId);
    } catch (error) {
      if ((error as Error).message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  // === EVENTS (WRITE) - For PUSH_INTERNAL and BIDIRECTIONAL modes ===

  async createEvent(
    accessToken: string,
    calendarId: string,
    event: Omit<ExternalEvent, 'id' | 'etag'>
  ): Promise<ExternalEvent> {
    const googleEvent = this.toGoogleEvent(event);

    const response = await this.apiRequest<GoogleEventResource>(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      undefined,
      'POST',
      googleEvent
    );

    return this.mapGoogleEvent(response, calendarId)!;
  }

  async updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    event: Partial<ExternalEvent>
  ): Promise<ExternalEvent> {
    const googleEvent = this.toGoogleEvent(event as ExternalEvent);

    const response = await this.apiRequest<GoogleEventResource>(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      undefined,
      'PATCH',
      googleEvent
    );

    return this.mapGoogleEvent(response, calendarId)!;
  }

  async deleteEvent(
    accessToken: string,
    calendarId: string,
    eventId: string
  ): Promise<void> {
    await this.apiRequest(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      undefined,
      'DELETE'
    );
  }

  // === PRIVATE HELPERS ===

  private async apiRequest<T>(
    accessToken: string,
    endpoint: string,
    params?: Record<string, string>,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<T> {
    const url = new URL(`${this.config.apiBase}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Google Calendar API error (${response.status}): ${error.error?.message || 'Unknown error'}`
      );
    }

    if (method === 'DELETE') {
      return {} as T;
    }

    return response.json();
  }

  private mapAccessRole(role: string): 'owner' | 'writer' | 'reader' {
    switch (role) {
      case 'owner':
        return 'owner';
      case 'writer':
        return 'writer';
      default:
        return 'reader';
    }
  }

  private mapGoogleEvent(
    event: GoogleEventResource,
    calendarId: string
  ): ExternalEvent | null {
    // Skip cancelled events
    if (event.status === 'cancelled') {
      return null;
    }

    const isAllDay = !!event.start.date;

    let startTime: Date;
    let endTime: Date;
    let timezone = 'UTC';

    if (isAllDay) {
      startTime = new Date(event.start.date!);
      endTime = new Date(event.end.date!);
    } else {
      startTime = new Date(event.start.dateTime!);
      endTime = new Date(event.end.dateTime!);
      timezone = event.start.timeZone || 'UTC';
    }

    // Extract meeting link
    let meetingLink: string | undefined;
    if (event.hangoutLink) {
      meetingLink = event.hangoutLink;
    } else if (event.conferenceData?.entryPoints) {
      const videoEntry = event.conferenceData.entryPoints.find(
        (e) => e.entryPointType === 'video'
      );
      meetingLink = videoEntry?.uri;
    }

    return {
      id: event.id,
      calendarId,
      title: event.summary || '(No title)',
      description: event.description,
      startTime,
      endTime,
      timezone,
      isAllDay,
      location: event.location,
      meetingLink,
      etag: event.etag,
      metadata: {
        creator: event.creator,
        organizer: event.organizer,
        visibility: event.visibility,
        transparency: event.transparency,
      },
    };
  }

  private toGoogleEvent(event: Partial<ExternalEvent>): Partial<GoogleEventResource> {
    const result: Partial<GoogleEventResource> = {};

    if (event.title) {
      result.summary = event.title;
    }

    if (event.description !== undefined) {
      result.description = event.description;
    }

    if (event.location !== undefined) {
      result.location = event.location;
    }

    if (event.startTime && event.endTime) {
      if (event.isAllDay) {
        result.start = {
          date: event.startTime.toISOString().split('T')[0],
        };
        result.end = {
          date: event.endTime.toISOString().split('T')[0],
        };
      } else {
        result.start = {
          dateTime: event.startTime.toISOString(),
          timeZone: event.timezone || 'UTC',
        };
        result.end = {
          dateTime: event.endTime.toISOString(),
          timeZone: event.timezone || 'UTC',
        };
      }
    }

    return result;
  }
}

// =============================================================================
// REGISTER PROVIDER
// =============================================================================

import { registerProvider } from './types';

// Only register if Google credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  registerProvider(ExternalCalendarProvider.GOOGLE, new GoogleCalendarProvider());
}
