import { describe, expect, it } from 'vitest';
import {
  recordingNeededEmail,
  readyForProofingEmail,
  proofingCompleteEmail,
  transcriptDeliveredEmail,
} from '@/lib/email';

const BASE_DATA = {
  caseStyle: 'Perez v. Ugalde',
  causeNumber: '2025-CI-12281',
  deponentName: 'Bianca Perez',
  depositionDate: 'March 11, 2026',
  jobId: 'job-123',
};

describe('Lifecycle Email Templates', () => {
  describe('recordingNeededEmail', () => {
    it('returns correct subject, recipient, and HTML structure', () => {
      const result = recordingNeededEmail({
        ...BASE_DATA,
        recipientName: 'Miah Bardot',
        recipientEmail: 'miah@example.com',
      });

      expect(result.to).toBe('miah@example.com');
      expect(result.subject).toContain('Recording Upload Required');
      expect(result.subject).toContain('Bianca Perez');
      expect(result.subject).toContain('2025-CI-12281');
      expect(result.html).toContain('Hello Miah Bardot');
      expect(result.html).toContain('Perez v. Ugalde');
      expect(result.html).toContain('/jobs/job-123');
      expect(result.html).toContain('Upload Recording');
    });
  });

  describe('readyForProofingEmail', () => {
    it('includes flagged word count badge when count > 0', () => {
      const result = readyForProofingEmail({
        ...BASE_DATA,
        recipientName: 'Scopist One',
        recipientEmail: 'scopist@example.com',
        transcriptId: 'tx-456',
        flaggedWordCount: 12,
      });

      expect(result.to).toBe('scopist@example.com');
      expect(result.subject).toContain('Ready for Proofing');
      expect(result.html).toContain('12 flagged words');
      expect(result.html).toContain('/transcripts/tx-456');
    });

    it('omits badge when flaggedWordCount is 0', () => {
      const result = readyForProofingEmail({
        ...BASE_DATA,
        recipientName: 'Scopist One',
        recipientEmail: 'scopist@example.com',
        transcriptId: 'tx-456',
        flaggedWordCount: 0,
      });

      expect(result.html).not.toContain('flagged word');
    });

    it('uses singular for 1 flagged word', () => {
      const result = readyForProofingEmail({
        ...BASE_DATA,
        recipientName: 'Test',
        recipientEmail: 'test@example.com',
        transcriptId: 'tx-1',
        flaggedWordCount: 1,
      });

      expect(result.html).toContain('1 flagged word');
      expect(result.html).not.toContain('1 flagged words');
    });
  });

  describe('proofingCompleteEmail', () => {
    it('sends to reporter and includes scopist name', () => {
      const result = proofingCompleteEmail({
        ...BASE_DATA,
        reporterName: 'Miah Bardot',
        reporterEmail: 'miah@example.com',
        scopistName: 'Jane Doe',
        unresolvedFlagCount: 3,
      });

      expect(result.to).toEqual(['miah@example.com']);
      expect(result.subject).toContain('Proofing Complete');
      expect(result.html).toContain('Jane Doe');
      expect(result.html).toContain('3 flagged words');
    });

    it('adds agency admin to recipients when provided', () => {
      const result = proofingCompleteEmail({
        ...BASE_DATA,
        reporterName: 'Miah Bardot',
        reporterEmail: 'miah@example.com',
        agencyAdminEmail: 'admin@agency.com',
        scopistName: 'Jane Doe',
        unresolvedFlagCount: 0,
      });

      expect(result.to).toEqual(['miah@example.com', 'admin@agency.com']);
    });

    it('shows success panel when all flags resolved', () => {
      const result = proofingCompleteEmail({
        ...BASE_DATA,
        reporterName: 'Miah Bardot',
        reporterEmail: 'miah@example.com',
        scopistName: 'Jane Doe',
        unresolvedFlagCount: 0,
      });

      expect(result.html).toContain('All flagged words have been resolved');
      expect(result.html).not.toContain('Warning');
    });
  });

  describe('transcriptDeliveredEmail', () => {
    it('includes download token link and expiry notice', () => {
      const result = transcriptDeliveredEmail({
        ...BASE_DATA,
        recipientName: 'Jennifer Durbin',
        recipientEmail: 'jdurbin@law.com',
        reporterName: 'Miah Bardot',
        downloadToken: 'abc123def456',
        expiresHours: 72,
      });

      expect(result.to).toBe('jdurbin@law.com');
      expect(result.subject).toContain('Transcript Delivered');
      expect(result.html).toContain('/download/abc123def456');
      expect(result.html).toContain('72 hours');
      expect(result.html).toContain('Miah Bardot');
    });

    it('defaults to 72 hours when expiresHours not provided', () => {
      const result = transcriptDeliveredEmail({
        ...BASE_DATA,
        recipientName: 'Test',
        recipientEmail: 'test@law.com',
        reporterName: 'Reporter',
        downloadToken: 'token123',
      });

      expect(result.html).toContain('72 hours');
    });
  });
});
