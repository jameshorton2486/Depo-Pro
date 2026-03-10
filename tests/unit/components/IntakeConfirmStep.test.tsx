import { describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { IntakeConfirmStep } from '@/components/intake/IntakeConfirmStep';

const values = {
  jobTitle: 'Deposition of Arieana Skye Bourbois',
  caseName: 'Bourbois v. Hernandez',
  caseNumber: '',
  causeNumber: 'C-3123-25-J',
  caseStyle: '',
  deponentName: 'Arieana Skye Bourbois',
  depositionDate: '2026-03-04',
  startTime: '10:00',
  timezone: 'America/Chicago',
  location: 'Via Zoom',
  isRemote: true,
  remotePlatform: 'zoom',
  zoomLink: '',
  orderingAttorney: 'Raul Garza',
  orderingFirm: '',
  orderingEmail: '',
  orderingPhone: '',
  audioProcessing: 'automated' as const,
  notes: '',
  courtName: '',
  courtNumber: '',
  county: '',
  state: 'Texas',
  documentId: null,
  extractedData: null,
};

describe('IntakeConfirmStep', () => {
  it('shows "Create Job" for ADMIN role', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => {
      root.render(<IntakeConfirmStep role="ADMIN" values={values} isSubmitting={false} onBack={() => undefined} onSubmit={() => undefined} />);
    });
    expect(container.textContent).toContain('Create Job');
  });

  it('shows "Submit Request" for ATTORNEY role', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => {
      root.render(<IntakeConfirmStep role="ATTORNEY" values={values} isSubmitting={false} onBack={() => undefined} onSubmit={() => undefined} />);
    });
    expect(container.textContent).toContain('Submit Request');
  });

  it('shows "Submit Request" for PARALEGAL role', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => {
      root.render(<IntakeConfirmStep role="PARALEGAL" values={values} isSubmitting={false} onBack={() => undefined} onSubmit={() => undefined} />);
    });
    expect(container.textContent).toContain('Submit Request');
  });
});
