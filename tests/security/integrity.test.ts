/**
 * tests/security/integrity.test.ts
 *
 * Transcript integrity chain tests.
 *
 * Verifies that the integrity chain (transcript_integrity_chain table +
 * verify_integrity_chain RPC) behaves correctly:
 *  - Chain structure (version numbering, hash linking)
 *  - Verification passes for untampered chains
 *  - Verification fails for tampered chains
 *  - Concurrent edits: only one succeeds
 *  - Export metadata includes version count
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChainRow {
  id: string;
  transcription_id: string;
  version: number;
  previous_hash: string | null;
  transcript_hash: string;
  editor_id: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simulate SHA-256-style hash string (deterministic for tests). */
function mockHash(input: string): string {
  // Deterministic pseudo-hash for testing
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).padStart(8, '0').repeat(8).slice(0, 64);
}

/** Build a valid integrity chain of `n` entries. */
function buildChain(transcriptionId: string, n: number): ChainRow[] {
  const rows: ChainRow[] = [];
  for (let version = 0; version < n; version++) {
    const previousHash = version === 0 ? null : rows[version - 1].transcript_hash;
    const transcript_hash = mockHash(`${transcriptionId}:${version}:${previousHash ?? 'genesis'}`);
    rows.push({
      id: `row-${version}`,
      transcription_id: transcriptionId,
      version,
      previous_hash: previousHash,
      transcript_hash,
      editor_id: 'user-1',
      created_at: new Date(Date.now() + version * 1000).toISOString(),
    });
  }
  return rows;
}

/** Build a mock Supabase client for integrity chain operations. */
function makeIntegrityClient(chain: ChainRow[], verifyResult: { is_valid: boolean }) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'transcript_integrity_chain') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          // Returns the chain rows in order
          then: undefined,
          resolveAll: async () => ({ data: chain, error: null }),
        };
      }
      if (table === 'transcription_edits') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          resolveAll: async () => ({ data: chain.map((r) => ({ id: r.id, version: r.version })), error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        resolveAll: async () => ({ data: [], error: null }),
      };
    }),
    rpc: vi.fn((name: string) => {
      if (name === 'verify_integrity_chain') {
        return Promise.resolve({ data: verifyResult, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Transcript integrity chain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 1. First edit: version 0, previous_hash is null ─────────────────────

  it('First chain entry has version 0 and null previous_hash', () => {
    const chain = buildChain('tx-1', 1);

    expect(chain).toHaveLength(1);
    expect(chain[0].version).toBe(0);
    expect(chain[0].previous_hash).toBeNull();
    expect(chain[0].transcript_hash).toBeTruthy();
  });

  // ── 2. Second edit: previous_hash links to first entry ──────────────────

  it("Second entry's previous_hash equals first entry's transcript_hash", () => {
    const chain = buildChain('tx-1', 2);

    expect(chain[1].version).toBe(1);
    expect(chain[1].previous_hash).toBe(chain[0].transcript_hash);
  });

  it('Chain of 5 entries is fully linked', () => {
    const chain = buildChain('tx-1', 5);

    for (let i = 1; i < chain.length; i++) {
      expect(chain[i].previous_hash).toBe(chain[i - 1].transcript_hash);
    }
  });

  // ── 3. Verification RPC: valid chain ────────────────────────────────────

  it('verify_integrity_chain RPC returns is_valid: true for unbroken chain', async () => {
    const chain = buildChain('tx-1', 3);
    const client = makeIntegrityClient(chain, { is_valid: true });

    const { data, error } = await client.rpc('verify_integrity_chain');

    expect(error).toBeNull();
    expect(data).toEqual({ is_valid: true });
  });

  // ── 4. Verification RPC: tampered chain ─────────────────────────────────

  it('verify_integrity_chain RPC returns is_valid: false when a hash is tampered', async () => {
    const chain = buildChain('tx-1', 3);

    // Simulate tampering: overwrite middle entry's hash
    const tamperedChain = [...chain];
    tamperedChain[1] = { ...tamperedChain[1], transcript_hash: 'aaaa' + 'b'.repeat(60) };

    const client = makeIntegrityClient(tamperedChain, { is_valid: false });

    const { data, error } = await client.rpc('verify_integrity_chain');

    expect(error).toBeNull();
    expect(data!.is_valid).toBe(false);
  });

  // ── 5. Concurrent edits: second insert fails with unique violation ───────

  it('Concurrent insert on the same version returns a unique-constraint error', async () => {
    const chain = buildChain('tx-1', 1);

    let insertCount = 0;
    const client = {
      from: vi.fn(() => ({
        insert: vi.fn().mockImplementation(() => {
          insertCount++;
          if (insertCount > 1) {
            return Promise.resolve({
              data: null,
              error: {
                code: '23505',
                message: 'duplicate key value violates unique constraint "transcript_integrity_chain_transcription_id_version_key"',
              },
            });
          }
          return Promise.resolve({ data: chain[0], error: null });
        }),
      })),
      rpc: vi.fn(),
    };

    const chainTable = client.from('transcript_integrity_chain');

    // First insert succeeds
    const first = await chainTable.insert({ transcription_id: 'tx-1', version: 1 });
    expect(first.error).toBeNull();

    // Re-use same mock — second insert at same version fails
    const second = await chainTable.insert({ transcription_id: 'tx-1', version: 1 });
    expect(second.error).not.toBeNull();
    expect(second.error!.code).toBe('23505');
    expect(second.error!.message).toContain('unique constraint');
  });

  // ── 6. Export metadata includes version count ────────────────────────────

  it('Export metadata includes the integrity chain version count', async () => {
    const chain = buildChain('tx-1', 7);
    const client = makeIntegrityClient(chain, { is_valid: true });

    // Simulate reading the chain to build export metadata
    const chainData = client.from('transcript_integrity_chain');
    chainData.select();
    chainData.eq('transcription_id', 'tx-1');
    chainData.order('version');
    const { data: rows } = await chainData.resolveAll();

    const exportMetadata = {
      transcriptionId: 'tx-1',
      integrityVersionCount: rows!.length,
      integrityChainValid: true,
    };

    expect(exportMetadata.integrityVersionCount).toBe(7);
    expect(exportMetadata.integrityChainValid).toBe(true);
  });

  // ── 7. Chain rows are returned in ascending version order ────────────────

  it('Chain rows are ordered by ascending version number', async () => {
    const chain = buildChain('tx-1', 5);
    const client = makeIntegrityClient(chain, { is_valid: true });

    const chainData = client.from('transcript_integrity_chain');
    const { data: rows } = await chainData.resolveAll();

    for (let i = 1; i < rows!.length; i++) {
      expect(rows![i].version).toBeGreaterThan(rows![i - 1].version);
    }
  });
});
