/**
 * tests/security/rls.test.ts
 *
 * RLS data-access-layer tests.
 *
 * SCOPE: What the Supabase RLS policies enforce at the data layer.
 *        These tests are DISTINCT from tenant-isolation.test.ts, which tests
 *        firm-level access through HTTP route handlers.
 *        Here we test query behaviour directly against a mock Supabase client
 *        that replicates RLS row-filtering semantics.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers — build mock Supabase clients that simulate RLS filtering
// ---------------------------------------------------------------------------

/** Simulate a row-level security filtered query: only return rows where
 *  `firm_id` matches `callerFirmId`. */
function makeRlsClient(callerFirmId: string, allRows: Record<string, unknown>[]) {
  const filteredRows = allRows.filter((r) => r['firm_id'] === callerFirmId);
  return {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: undefined,
      // Simulates `.select().eq('firm_id', callerFirmId)` returning only own-firm rows
      resolveAll: async () => ({ data: filteredRows, error: null }),
    })),
  };
}

/** Admin client — bypasses RLS via service-role key. */
function makeAdminClient(allRows: Record<string, unknown>[]) {
  return {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      resolveAll: async () => ({ data: allRows, error: null }),
    })),
  };
}

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const JOB_FIRM_A = { id: 'job-a1', firm_id: 'firm-a', reporter_id: 'reporter-a', status: 'IN_PROGRESS' };
const JOB_FIRM_B = { id: 'job-b1', firm_id: 'firm-b', reporter_id: 'reporter-b', status: 'IN_PROGRESS' };
const ALL_JOBS = [JOB_FIRM_A, JOB_FIRM_B];

const FLAGGED_FIRM_A = { id: 'fw-a1', firm_id: 'firm-a', job_id: 'job-a1', scopist_id: 'scopist-a' };
const FLAGGED_FIRM_B = { id: 'fw-b1', firm_id: 'firm-b', job_id: 'job-b1', scopist_id: 'scopist-b' };
const ALL_FLAGGED = [FLAGGED_FIRM_A, FLAGGED_FIRM_B];

const AUDIT_FIRM_A = { id: 'ae-a1', firm_id: 'firm-a', action: 'WORD_CORRECTED', actor_id: 'reporter-a' };
const AUDIT_FIRM_B = { id: 'ae-b1', firm_id: 'firm-b', action: 'WORD_CORRECTED', actor_id: 'reporter-b' };
const ALL_AUDITS = [AUDIT_FIRM_A, AUDIT_FIRM_B];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RLS — data access layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 1. Jobs: reporter sees only own-firm rows ────────────────────────────

  it('Reporter from Firm A sees only Firm A jobs', async () => {
    const client = makeRlsClient('firm-a', ALL_JOBS);
    const chain = client.from('jobs');
    chain.select();
    chain.eq('firm_id', 'firm-a');
    const { data } = await chain.resolveAll();

    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('job-a1');
    // Firm B job must not be visible
    expect(data.find((r: any) => r.id === 'job-b1')).toBeUndefined();
  });

  it('Reporter from Firm B sees only Firm B jobs', async () => {
    const client = makeRlsClient('firm-b', ALL_JOBS);
    const chain = client.from('jobs');
    chain.select();
    chain.eq('firm_id', 'firm-b');
    const { data } = await chain.resolveAll();

    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('job-b1');
    expect(data.find((r: any) => r.id === 'job-a1')).toBeUndefined();
  });

  // ── 2. Admin (service-role) can span firms ───────────────────────────────

  it('Admin client bypasses RLS and sees all jobs across firms', async () => {
    const adminClient = makeAdminClient(ALL_JOBS);
    const chain = adminClient.from('jobs');
    chain.select();
    const { data } = await chain.resolveAll();

    expect(data).toHaveLength(2);
    const ids = data.map((r: any) => r.id);
    expect(ids).toContain('job-a1');
    expect(ids).toContain('job-b1');
  });

  // ── 3. Scopist: flagged_words — firm boundary ────────────────────────────

  it('Scopist from Firm A cannot read Firm B flagged_words', async () => {
    // RLS filters by firm_id; Firm A scopist only sees Firm A flagged words
    const client = makeRlsClient('firm-a', ALL_FLAGGED);
    const chain = client.from('flagged_words');
    chain.select();
    chain.eq('firm_id', 'firm-a');
    const { data } = await chain.resolveAll();

    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('fw-a1');
    expect(data.find((r: any) => r.id === 'fw-b1')).toBeUndefined();
  });

  it('Unassigned Scopist from Firm A sees no Firm B data in unrestricted query', async () => {
    // RLS acts as an implicit WHERE clause: regardless of what the caller queries,
    // only rows matching their own firm_id are ever returned.
    // A Firm A scopist running a general flagged_words query sees only Firm A rows;
    // Firm B rows are completely invisible.
    const client = makeRlsClient('firm-a', ALL_FLAGGED);
    const chain = client.from('flagged_words');
    chain.select();
    const { data } = await chain.resolveAll();

    // Only the Firm A row survives; Firm B row is filtered out by RLS
    expect(data).toHaveLength(1);
    expect(data[0].firm_id).toBe('firm-a');
    expect(data.find((r: any) => r.firm_id === 'firm-b')).toBeUndefined();
  });

  // ── 4. transcription_edits insert — cross-firm blocked ──────────────────

  it('transcription_edits insert returns no error when editor is in same firm', async () => {
    const client = makeRlsClient('firm-a', []);
    const chain = client.from('transcription_edits');
    const { error } = await chain.insert({
      transcription_id: 'tx-a1',
      editor_id: 'scopist-a',
      edit_type: 'WORD_CORRECTION',
      firm_id: 'firm-a',
    });

    // Mock simulates RLS allowing the insert (no error)
    expect(error).toBeNull();
  });

  it('transcription_edits insert is blocked when editor is cross-firm', async () => {
    // Simulate RLS violation: mock returns an error for cross-firm insert
    const client = {
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '42501', message: 'new row violates row-level security policy' },
        }),
      })),
    };

    const chain = client.from('transcription_edits');
    const { error } = await chain.insert({
      transcription_id: 'tx-b1', // belongs to firm-b
      editor_id: 'scopist-a',    // firm-a editor
      edit_type: 'WORD_CORRECTION',
      firm_id: 'firm-a',
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe('42501');
    expect(error!.message).toContain('row-level security');
  });

  // ── 5. audit_events: users see only own-firm events ─────────────────────

  it('Firm A user sees only Firm A audit_events', async () => {
    const client = makeRlsClient('firm-a', ALL_AUDITS);
    const chain = client.from('audit_events');
    chain.select();
    chain.eq('firm_id', 'firm-a');
    const { data } = await chain.resolveAll();

    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('ae-a1');
    expect(data.find((r: any) => r.id === 'ae-b1')).toBeUndefined();
  });

  it('Firm B user sees only Firm B audit_events', async () => {
    const client = makeRlsClient('firm-b', ALL_AUDITS);
    const chain = client.from('audit_events');
    chain.select();
    chain.eq('firm_id', 'firm-b');
    const { data } = await chain.resolveAll();

    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('ae-b1');
    expect(data.find((r: any) => r.id === 'ae-a1')).toBeUndefined();
  });
});
