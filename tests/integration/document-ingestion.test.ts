import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';

const extractDepositionDataMock = vi.fn();

vi.mock('@/lib/ingestion/ai-extractor', () => ({
  extractDepositionData: extractDepositionDataMock,
}));

const MOCK_EXTRACTION = {
  document_type: 'notice_of_deposition',
  confidence: 0.97,
  case_information: {
    cause_number: 'C-3123-25-J',
    case_style: 'Bourbois et al. v. Hernandez et al.',
    court_name: 'District Court',
    court_number: '430th Judicial District',
    county: 'Hidalgo',
    state: 'Texas',
  },
  parties: {
    plaintiffs: ['Arieana Skye Bourbois', 'Ariella Starr Bourbois', 'Cierra Toscano'],
    defendants: ['Ethan Hernandez', 'Jose Humberto Hernandez'],
    third_parties: [],
  },
  attorneys: [{
    name: 'Raul Garza',
    firm: 'Goldman & Peterson',
    role: 'ordering',
    represents: 'defendant',
    email: 'Raul@LJGLaw.com',
    phone: '(210) 340-9800',
    address: '10100 Reunion Place Suite 800',
    city: 'San Antonio',
    state: 'Texas',
    postal_code: '78216',
    fax: null,
    delivery_format: null,
    is_rush: false,
  }],
  deposition_sessions: [{
    deponent_name: 'Arieana Skye Bourbois',
    deposition_date: '2026-03-04',
    start_time: '10:00',
    location: 'Via Zoom',
    is_remote: true,
    remote_platform: 'zoom',
    zoom_link: null,
    is_videotaped: false,
    includes_duces_tecum: true,
  }],
  court_reporter: { firm: 'SA Legal Solutions', name: null, phone: '(210) 591-1791' },
  transcription_keywords: {
    names: ['Arieana Bourbois', 'Ariella Bourbois', 'Cierra Toscano', 'Ethan Hernandez', 'Jose Humberto Hernandez', 'Raul Garza', 'Aaron Ochoa'],
    firms: ['Goldman & Peterson', 'Dang & Zapata'],
    locations: ['Hidalgo County', 'San Antonio', 'McAllen'],
    legal_terms: [],
    all_keywords: ['Arieana Bourbois', 'Ariella Bourbois', 'Cierra Toscano', 'Ethan Hernandez', 'Jose Humberto Hernandez', 'Raul Garza', 'Aaron Ochoa', 'Goldman & Peterson', 'Dang & Zapata', 'Hidalgo County'],
  },
  ordered_by: 'Rose Soto-Oliveras',
  notes: null,
} as const;

function createAdminClientMock() {
  return {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: 'https://example.com/depo-files/test.txt' },
        })),
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'deposition_documents') {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'doc-1' }, error: null }),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      }

      if (table === 'case_metadata') {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'case-1' }, error: null }),
        };
      }

      if (table === 'jobs') {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      }

      if (table === 'case_parties' || table === 'case_attorneys' || table === 'deposition_sessions') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }

      if (table === 'vocabulary_terms') {
        return {
          upsert: vi.fn().mockResolvedValue({ error: null }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe('document-ingestion pipeline', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('processes a TXT document end-to-end with mocked AI', async () => {
    const createAdminClient = vi.fn(() => createAdminClientMock());
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient,
    }));
    extractDepositionDataMock.mockResolvedValue(MOCK_EXTRACTION);

    const { ingestDocument } = await import('@/lib/ingestion');
    const buffer = fs.readFileSync('tests/fixtures/bourbois-notice.txt');

    const result = await ingestDocument({
      buffer,
      mimeType: 'text/plain',
      originalFileName: 'bourbois-notice.txt',
      firmId: 'test-firm-id',
      uploadedBy: 'test-user-id',
    });

    expect(result.success).toBe(true);
    expect(result.sessionsFound).toBe(1);
    expect(result.keywordsAdded).toBeGreaterThan(5);
    expect(result.extraction?.case_information.cause_number).toBe('C-3123-25-J');
  });

  it('returns partial result when AI extraction confidence is low', async () => {
    const createAdminClient = vi.fn(() => createAdminClientMock());
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient,
    }));
    extractDepositionDataMock.mockResolvedValue({ ...MOCK_EXTRACTION, confidence: 0.3 });

    const { ingestDocument } = await import('@/lib/ingestion');
    const result = await ingestDocument({
      buffer: Buffer.from('incomplete document text'),
      mimeType: 'text/plain',
      originalFileName: 'incomplete.txt',
      firmId: 'test-firm-id',
      uploadedBy: 'test-user-id',
    });

    expect(result.success).toBe(true);
    expect(result.parseStatus).toBe('partial');
  });

  it('handles complete extraction failure without throwing', async () => {
    const createAdminClient = vi.fn(() => createAdminClientMock());
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient,
    }));
    extractDepositionDataMock.mockRejectedValue(new Error('API timeout'));

    const { ingestDocument } = await import('@/lib/ingestion');
    const result = await ingestDocument({
      buffer: Buffer.from('test'),
      mimeType: 'text/plain',
      originalFileName: 'test.txt',
      firmId: 'test-firm-id',
      uploadedBy: 'test-user-id',
    });

    expect(result.success).toBe(false);
    expect(result.parseStatus).toBe('failed');
    expect(result.error).toContain('API timeout');
  });
});
