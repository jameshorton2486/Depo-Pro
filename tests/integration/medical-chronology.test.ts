import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import * as medicalQueries from '@/lib/supabase/queries/medical';
import {
  createMedicalRecord,
  listMedicalRecordsByJob,
  createChronologyEntry,
  listChronologyEntries,
  updateChronologyEntry,
  deleteChronologyEntry,
} from '@/lib/supabase/queries/medical';

const getCurrentUserMock = vi.fn();
const createSupabaseServerClientMock = vi.fn();
const getJobByIdMock = vi.fn();
const processMedicalRecordMock = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock('@/lib/supabase/queries/jobs', () => ({
  getJobById: getJobByIdMock,
}));

vi.mock('@/lib/services/medical-extraction', () => ({
  processMedicalRecord: processMedicalRecordMock,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/middleware/withRouteProtection', () => ({
  withRouteProtection: (_options: unknown, handler: any) => handler,
}));

describe('Medical Chronology', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('medical record upload creates DB record shape', async () => {
    const supabase = {
      from: vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'mr-1',
            job_id: 'job-1',
            file_name: 'record.pdf',
            file_url: 'medical-records/job-1/record.pdf',
            file_size_bytes: 1234,
            mime_type: 'application/pdf',
            uploaded_by_id: 'user-1',
            status: 'UPLOADED',
          },
          error: null,
        }),
      })),
    } as any;

    const created = await createMedicalRecord(supabase, {
      job_id: 'job-1',
      file_name: 'record.pdf',
      file_url: 'medical-records/job-1/record.pdf',
      file_size_bytes: 1234,
      mime_type: 'application/pdf',
      uploaded_by_id: 'user-1',
    });

    expect(created.id).toBe('mr-1');
    expect(created.status).toBe('UPLOADED');
  });

  it('Claude extraction route returns created chronology entries', async () => {
    getCurrentUserMock.mockResolvedValueOnce({
      id: 'reporter-1',
      role: 'REPORTER',
      firmId: 'firm-1',
    });
    createSupabaseServerClientMock.mockResolvedValueOnce({});
    vi.spyOn(medicalQueries, 'getMedicalRecordById').mockResolvedValueOnce({
      id: 'mr-1',
      job_id: 'job-1',
      status: 'UPLOADED',
    });
    processMedicalRecordMock.mockResolvedValueOnce({
      entriesCreated: 3,
      result: {
        document_type: 'PROGRESS_NOTE',
        provider_name: 'Dr. Smith',
        facility_name: 'General Hospital',
        summary: 'Patient follow-up',
      },
    });

    const route = await import('@/app/api/jobs/[id]/medical-records/[recordId]/extract/route');
    const req = new NextRequest('http://localhost/api/jobs/job-1/medical-records/mr-1/extract', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reprocess: false }),
    });
    const res = await route.POST(req, {
      params: Promise.resolve({ id: 'job-1', recordId: 'mr-1' }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.entries_created).toBe(3);
    expect(json.data.status).toBe('EXTRACTED');
  });

  it('chronology CRUD helpers work', async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: 'ce-1', job_id: 'job-1', category: 'TREATMENT', event_date: '2026-01-01' }],
        error: null,
      }),
      single: vi.fn().mockResolvedValue({
        data: { id: 'ce-1', job_id: 'job-1', category: 'TREATMENT', summary: 'Updated' },
        error: null,
      }),
    };
    const supabase = { from: vi.fn(() => chain) } as any;

    const created = await createChronologyEntry(supabase, {
      job_id: 'job-1',
      event_date: '2026-01-01',
      category: 'TREATMENT',
      summary: 'Initial',
      created_by_id: 'user-1',
    });
    expect(created.id).toBe('ce-1');

    const listed = await listChronologyEntries(supabase, 'job-1');
    expect(Array.isArray(listed)).toBe(true);

    const updated = await updateChronologyEntry(supabase, 'ce-1', { summary: 'Updated' });
    expect(updated.summary).toBe('Updated');

    await expect(deleteChronologyEntry(supabase, 'ce-1')).resolves.toBeUndefined();
  });

  it('list medical records can be consumed by export workflow', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'medical_records') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{ id: 'mr-1', job_id: 'job-1' }],
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [{ medical_record_id: 'mr-1', is_verified: true }],
            error: null,
          }),
        };
      }),
    } as any;

    const records = await listMedicalRecordsByJob(supabase, 'job-1');
    expect(records[0].id).toBe('mr-1');
    expect(records[0].verified_count).toBe(1);
  });

  it('firm-scoped access blocks user A from user B medical records', async () => {
    getCurrentUserMock.mockResolvedValueOnce({
      id: 'user-a',
      role: 'REPORTER',
      firmId: 'firm-a',
    });
    createSupabaseServerClientMock.mockResolvedValueOnce({});
    getJobByIdMock.mockResolvedValueOnce(null);

    const route = await import('@/app/api/jobs/[id]/medical-records/route');
    const req = new NextRequest('http://localhost/api/jobs/job-b/medical-records', { method: 'GET' });
    const res = await route.GET(req, { params: Promise.resolve({ id: 'job-b' }) });

    expect(res.status).toBe(404);
  });
});
