/**
 * Google Calendar API Helper
 * Server-only, secure Google Calendar integration
 * 
 * Security Rules:
 * - Server routes only (runtime = 'nodejs')
 * - OAuth tokens stored encrypted in Supabase
 * - Never expose Google APIs to client
 */

import { google } from 'googleapis';
import type { calendar_v3 } from 'googleapis';

export interface GoogleToken {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

/**
 * Get authenticated Google Calendar client
 */
export function getGoogleClient(token: GoogleToken): calendar_v3.Calendar {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expiry_date: new Date(token.expires_at).getTime(),
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Check if token is expired or expires soon (within 5 minutes)
 */
export function isTokenExpired(token: GoogleToken): boolean {
  const expiresAt = new Date(token.expires_at);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  
  return expiresAt <= fiveMinutesFromNow;
}

/**
 * Refresh Google OAuth token
 */
export async function refreshGoogleToken(refreshToken: string): Promise<{
  access_token: string;
  expires_at: string;
}> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token || !credentials.expiry_date) {
    throw new Error('Failed to refresh Google token');
  }

  return {
    access_token: credentials.access_token,
    expires_at: new Date(credentials.expiry_date).toISOString(),
  };
}
