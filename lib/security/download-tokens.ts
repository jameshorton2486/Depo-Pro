// lib/security/download-tokens.ts
// Secure one-time download token generation and validation for attorney delivery.
// Because no new migrations can be added, we store tokens in the jobs table
// internal_notes JSON field with a 'downloadTokens' array.

import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

export interface DownloadToken {
  token: string;
  jobId: string;
  transcriptId: string;
  recipientEmail: string;
  expiresAt: string;        // ISO string
  usedAt?: string | null;   // ISO string — null until used
}

/**
 * Generate a secure one-time download token for attorney transcript delivery.
 * Token is stored in jobs.internal_notes as JSON alongside any existing notes.
 * Expires after 72 hours by default.
 */
export async function generateDownloadToken(
  jobId: string,
  transcriptId: string,
  recipientEmail: string,
  expiresHours = 72,
): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + expiresHours * 60 * 60 * 1000).toISOString();

  const adminClient = createAdminClient();

  // Read existing internal_notes
  const { data: job } = await adminClient
    .from('jobs')
    .select('internal_notes')
    .eq('id', jobId)
    .single();

  let notes: Record<string, any> = {};
  if (job?.internal_notes) {
    try {
      notes = typeof job.internal_notes === 'string'
        ? JSON.parse(job.internal_notes)
        : job.internal_notes;
    } catch {
      notes = {};
    }
  }

  // Append new token to downloadTokens array
  const tokens: DownloadToken[] = notes.downloadTokens || [];
  tokens.push({ token, jobId, transcriptId, recipientEmail, expiresAt, usedAt: null });

  // Keep only last 20 tokens to prevent unbounded growth
  const trimmed = tokens.slice(-20);
  notes.downloadTokens = trimmed;

  const { error } = await adminClient
    .from('jobs')
    .update({ internal_notes: JSON.stringify(notes) })
    .eq('id', jobId);

  if (error) {
    throw new Error(`Failed to store download token: ${error.message}`);
  }

  return token;
}

/**
 * Validate a download token and return its data if valid.
 * Returns null if token is not found, expired, or already used.
 */
export async function validateDownloadToken(token: string): Promise<DownloadToken | null> {
  if (!token || token.length !== 64) return null;

  const adminClient = createAdminClient();

  // Search recent jobs that may contain this token
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

  const { data: jobs } = await adminClient
    .from('jobs')
    .select('id, internal_notes')
    .not('internal_notes', 'is', null)
    .gte('updated_at', cutoff)
    .limit(200);

  if (!jobs) return null;

  for (const job of jobs) {
    try {
      const notes = typeof job.internal_notes === 'string'
        ? JSON.parse(job.internal_notes)
        : job.internal_notes;

      const tokens: DownloadToken[] = notes?.downloadTokens || [];
      const found = tokens.find(t => t.token === token);

      if (!found) continue;

      if (new Date(found.expiresAt) < new Date()) {
        console.warn(`[token] Token expired for job ${job.id}`);
        return null;
      }

      if (found.usedAt) {
        console.warn(`[token] Token already used at ${found.usedAt} for job ${job.id}`);
        return null;
      }

      return found;
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Mark a download token as used (one-time use enforcement).
 */
export async function markTokenUsed(jobId: string, token: string): Promise<void> {
  const adminClient = createAdminClient();

  const { data: job } = await adminClient
    .from('jobs')
    .select('internal_notes')
    .eq('id', jobId)
    .single();

  if (!job?.internal_notes) return;

  try {
    const notes = typeof job.internal_notes === 'string'
      ? JSON.parse(job.internal_notes)
      : job.internal_notes;

    const tokens: DownloadToken[] = notes?.downloadTokens || [];
    const updated = tokens.map(t =>
      t.token === token ? { ...t, usedAt: new Date().toISOString() } : t
    );

    notes.downloadTokens = updated;

    await adminClient
      .from('jobs')
      .update({ internal_notes: JSON.stringify(notes) })
      .eq('id', jobId);
  } catch (err: any) {
    console.error(`[token] Failed to mark token used: ${err.message}`);
  }
}
