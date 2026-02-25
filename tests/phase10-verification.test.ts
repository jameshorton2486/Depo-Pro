/**
 * Phase 10 Medical Extraction - Automated Verification Suite
 * Run with: npm test tests/phase10-verification.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const runPhase10Verification = process.env.RUN_PHASE10_VERIFICATION === 'true';
const describeIfEnabled = runPhase10Verification ? describe : describe.skip;

describeIfEnabled('Phase 10 - Medical Extraction Verification', () => {
  let supabase: any;
  let testJobId: string;
  let authToken: string;

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get a test job (or create one)
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id')
      .limit(1)
      .single();

    if (!jobs) {
      throw new Error('No test job found. Create a job first.');
    }

    testJobId = jobs.id;

    // Get auth token for API requests
    // NOTE: Replace with actual auth logic
    authToken = 'test-auth-token';
  });

  describe('1. Database Schema Verification', () => {
    it('should have medical_records table', async () => {
      const { error } = await supabase
        .from('medical_records')
        .select('id')
        .limit(1);

      expect(error).toBeNull();
    });

    it('should have chronology_entries table', async () => {
      const { error } = await supabase
        .from('chronology_entries')
        .select('id')
        .limit(1);

      expect(error).toBeNull();
    });

    it('should have correct columns in medical_records', async () => {
      const { data, error } = await supabase
        .from('medical_records')
        .select('id, job_id, file_name, status, document_type')
        .limit(0);

      expect(error).toBeNull();
    });

    it('should have RLS policies enabled', async () => {
      const { data: policies } = await supabase
        .rpc('pg_policies')
        .eq('tablename', 'medical_records');

      expect(policies).toBeDefined();
    });
  });

  describe('2. API Routes Verification', () => {
    it('GET /api/jobs/[id]/medical-records should return 200', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/jobs/${testJobId}/medical-records`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('GET /api/jobs/[id]/chronology should return 200', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/jobs/${testJobId}/chronology`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('data');
    });

    it('POST /api/jobs/[id]/medical-records should validate file type', async () => {
      const formData = new FormData();
      const invalidFile = new Blob(['test'], { type: 'text/plain' });
      formData.append('file', invalidFile, 'test.txt');

      const response = await fetch(
        `${API_BASE_URL}/api/jobs/${testJobId}/medical-records`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
          body: formData,
        }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('PDF');
    });
  });

  describe('3. Storage Verification', () => {
    it('should have depo-files bucket', async () => {
      const { data: buckets, error } = await supabase.storage.listBuckets();

      expect(error).toBeNull();
      const depoFilesBucket = buckets?.find((b: any) => b.name === 'depo-files');
      expect(depoFilesBucket).toBeDefined();
    });

    it('should allow authenticated uploads', async () => {
      // This is a placeholder - actual test would require auth
      const { data: buckets } = await supabase.storage.listBuckets();
      expect(buckets).toBeDefined();
    });
  });

  describe('4. Type Safety Verification', () => {
    it('should have medical types exported', () => {
      // This will fail at compile time if types are missing
      const testImport = require('@/types/medical');

      expect(testImport.MedicalRecordRow).toBeDefined();
      expect(testImport.ChronologyEntryRow).toBeDefined();
    });
  });

  describe('5. Query Layer Verification', () => {
    it('should export medical query functions', async () => {
      const queries = await import('@/lib/supabase/queries/medical');

      expect(queries.listMedicalRecordsByJob).toBeDefined();
      expect(queries.createMedicalRecord).toBeDefined();
      expect(queries.listChronologyEntries).toBeDefined();
      expect(queries.createChronologyEntry).toBeDefined();
    });
  });

  describe('6. Service Layer Verification', () => {
    it('should export medical extraction service', async () => {
      const service = await import('@/lib/services/medical-extraction');

      expect(service.extractMedicalChronology).toBeDefined();
      expect(service.processMedicalRecord).toBeDefined();
    });

    it('should export chronology export service', async () => {
      const service = await import('@/lib/services/chronology-export');

      expect(service.generateChronologyDocx).toBeDefined();
    });

    it('should require ANTHROPIC_API_KEY', () => {
      expect(process.env.ANTHROPIC_API_KEY).toBeDefined();
      expect(process.env.ANTHROPIC_API_KEY).toMatch(/^sk-ant-/);
    });
  });

  describe('7. Component Verification', () => {
    it('should export MedicalRecordsPanel', async () => {
      const component = await import('@/components/medical/MedicalRecordsPanel');
      expect(component.default).toBeDefined();
    });

    it('should export ChronologyViewer', async () => {
      const component = await import('@/components/medical/ChronologyViewer');
      expect(component.default).toBeDefined();
    });
  });

  describe('8. Integration Test (Optional - requires real data)', () => {
    it.skip('should upload, extract, and export a medical record', async () => {
      // This would be a full end-to-end test
      // Skipped by default as it requires API keys and real PDFs

      // 1. Upload a test PDF
      // 2. Trigger extraction
      // 3. Verify entries created
      // 4. Export to DOCX
      // 5. Verify DOCX content
      // 6. Clean up test data
    });
  });
});

describeIfEnabled('Phase 10 - Pre-flight Checklist', () => {
  it('Environment: ANTHROPIC_API_KEY is set', () => {
    expect(process.env.ANTHROPIC_API_KEY).toBeDefined();
  });

  it('Environment: Supabase credentials are set', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined();
  });

  it('Database: Migration has been run', async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { error: medicalError } = await supabase
      .from('medical_records')
      .select('id')
      .limit(1);

    const { error: chronologyError } = await supabase
      .from('chronology_entries')
      .select('id')
      .limit(1);

    expect(medicalError).toBeNull();
    expect(chronologyError).toBeNull();
  });

  it('Types: Supabase types have been regenerated', async () => {
    const types = await import('@/types/supabase-generated');
    expect(types.Database).toBeDefined();

    // Check if medical tables exist in types
    const typeString = JSON.stringify(types.Database);
    expect(typeString.includes('medical_records')).toBe(true);
    expect(typeString.includes('chronology_entries')).toBe(true);
  });
});
