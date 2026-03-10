import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const parseDocumentMock = vi.fn();
const createJobFromSubmissionMock = vi.fn();
const writeKeywordsMock = vi.fn();
const buildAdminOverridesMock = vi.fn();

vi.mock('@/lib/middleware/withRouteProtection', () => ({
  withRouteProtection: (_options: unknown, handler: any) => handler,
}));

vi.mock('@/lib/ingestion', () => ({
  parseDocument: parseDocumentMock,
}));

vi.mock('@/lib/intake/workflow', () => ({
  createJobFromSubmission: createJobFromSubmissionMock,
  writeKeywords: writeKeywordsMock,
  buildAdminOverrides: buildAdminOverridesMock,
}));

function makeTranscriptRequestSupabase(initialRequest?: Record<string, unknown>) {
  const state = {
    insertedRequest: null as Record<string, unknown> | null,
    updatedRequest: null as Record<string, unknown> | null,
    request: initialRequest ?? {
      id: 'req-1',
      firm_id: 'firm-1',
      status: 'PENDING_REVIEW',
      job_title: 'Deposition of Arieana Skye Bourbois',
      case_name: 'Bourbois v. Hernandez',
      case_number: null,
      cause_number: 'C-3123-25-J',
      case_style: 'Bourbois et al. v. Hernandez et al.',
      deponent_name: 'Arieana Skye Bourbois',
      deposition_date: '2026-03-04',
      start_time: '10:00',
      timezone: 'America/Chicago',
      location: 'Via Zoom',
      is_remote: true,
      remote_platform: 'zoom',
      zoom_link: null,
      ordering_attorney: 'Raul Garza',
      ordering_firm: 'Goldman & Peterson',
      ordering_email: 'raul@example.com',
      ordering_phone: '(210) 340-9800',
      audio_processing: 'automated',
      notes: null,
      court_name: '430th Judicial District Court',
      court_number: '430th Judicial District',
      county: 'Hidalgo',
      state: 'Texas',
      document_id: 'doc-1',
      extracted_data: {
        transcription_keywords: { all_keywords: ['Bourbois', 'Hernandez'] },
      },
    },
  };

  const chain = {
    insert: vi.fn((payload: Record<string, unknown>) => {
      state.insertedRequest = payload;
      return chain;
    }),
    update: vi.fn((payload: Record<string, unknown>) => {
      state.updatedRequest = payload;
      return chain;
    }),
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(async () => {
      if (state.insertedRequest) {
        return { data: { id: 'req-1' }, error: null };
      }
      return { data: state.request, error: null };
    }),
  };

  return {
    state,
    client: {
      from: vi.fn((table: string) => {
        if (table !== 'transcript_requests') {
          throw new Error(`Unexpected table: ${table}`);
        }
        return chain;
      }),
    },
  };
}

describe('job request workflow', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    parseDocumentMock.mockResolvedValue({
      success: true,
      extraction: { deposition_sessions: [{ deponent_name: 'Arieana Skye Bourbois' }] },
      confidence: 0.95,
      sessionsFound: 1,
      keywordsFound: 2,
      warnings: [],
    });
    createJobFromSubmissionMock.mockResolvedValue('job-1');
    writeKeywordsMock.mockResolvedValue(undefined);
    buildAdminOverridesMock.mockReturnValue({});
  });

  it('document parse endpoint returns extraction result', async () => {
    const route = await import('@/app/api/intake/parse-document/route');
    const req = new NextRequest('http://localhost/api/intake/parse-document', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source_url: 'https://docs.google.com/document/d/test/edit' }),
    });

    const res = await route.POST(req, { supabase: {}, user: { id: 'user-1', firm_id: 'firm-1', role: 'ATTORNEY' } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(parseDocumentMock).toHaveBeenCalledTimes(1);
  });

  it('ADMIN submit-request creates jobs row path immediately', async () => {
    const route = await import('@/app/api/intake/submit-request/route');
    const req = new NextRequest('http://localhost/api/intake/submit-request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jobTitle: 'Deposition of Arieana Skye Bourbois',
        depositionDate: '2026-03-04',
        startTime: '10:00',
        extractedData: { transcription_keywords: { all_keywords: ['Bourbois', 'Hernandez'] } },
      }),
    });

    const res = await route.POST(req, {
      supabase: {},
      user: { id: 'admin-1', firm_id: 'firm-1', role: 'ADMIN' },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.submissionType).toBe('JOB');
    expect(createJobFromSubmissionMock).toHaveBeenCalledTimes(1);
    expect(writeKeywordsMock).toHaveBeenCalledTimes(1);
  });

  it('ATTORNEY submit-request creates transcript request with pending status', async () => {
    const { client, state } = makeTranscriptRequestSupabase();
    const route = await import('@/app/api/intake/submit-request/route');
    const req = new NextRequest('http://localhost/api/intake/submit-request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jobTitle: 'Deposition of Arieana Skye Bourbois',
        depositionDate: '2026-03-04',
        startTime: '10:00',
      }),
    });

    const res = await route.POST(req, {
      supabase: client,
      user: { id: 'attorney-1', firm_id: 'firm-1', role: 'ATTORNEY' },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.submissionType).toBe('REQUEST');
    expect(state.insertedRequest?.status).toBe('PENDING_REVIEW');
  });

  it('admin approve creates job and updates request status to APPROVED', async () => {
    const { client, state } = makeTranscriptRequestSupabase();
    const route = await import('@/app/api/intake/requests/[id]/review/route');
    const req = new NextRequest('http://localhost/api/intake/requests/req-1/review', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'APPROVE' }),
    });

    const res = await route.PATCH(req, {
      supabase: client,
      user: { id: 'admin-1', firm_id: 'firm-1', role: 'ADMIN' },
      params: { id: 'req-1' },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('APPROVED');
    expect(createJobFromSubmissionMock).toHaveBeenCalledTimes(1);
    expect(state.updatedRequest?.approved_job_id).toBe('job-1');
  });

  it('admin decline persists DECLINED status and reason', async () => {
    const { client, state } = makeTranscriptRequestSupabase();
    const route = await import('@/app/api/intake/requests/[id]/review/route');
    const req = new NextRequest('http://localhost/api/intake/requests/req-1/review', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'DECLINE', declineReason: 'Date unavailable' }),
    });

    const res = await route.PATCH(req, {
      supabase: client,
      user: { id: 'admin-1', firm_id: 'firm-1', role: 'ADMIN' },
      params: { id: 'req-1' },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('DECLINED');
    expect(state.updatedRequest?.status).toBe('DECLINED');
    expect(state.updatedRequest?.decline_reason).toBe('Date unavailable');
  });

  it('admin modify and approve records admin_overrides', async () => {
    buildAdminOverridesMock.mockReturnValue({
      start_time: {
        original: '10:00',
        changed_to: '10:30',
      },
    });
    const { client, state } = makeTranscriptRequestSupabase();
    const route = await import('@/app/api/intake/requests/[id]/review/route');
    const req = new NextRequest('http://localhost/api/intake/requests/req-1/review', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'MODIFY_AND_APPROVE',
        updates: { startTime: '10:30' },
      }),
    });

    const res = await route.PATCH(req, {
      supabase: client,
      user: { id: 'admin-1', firm_id: 'firm-1', role: 'ADMIN' },
      params: { id: 'req-1' },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('MODIFIED_AND_APPROVED');
    expect(state.updatedRequest?.admin_overrides).toEqual({
      start_time: { original: '10:00', changed_to: '10:30' },
    });
  });
});
