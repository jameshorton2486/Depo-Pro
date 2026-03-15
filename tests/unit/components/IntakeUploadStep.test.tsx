import { describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { IntakeUploadStep } from '@/components/intake/IntakeUploadStep';

const EXTRACTION = {
  document_type: 'notice_of_deposition',
  confidence: 0.95,
  case_information: {
    cause_number: 'C-3123-25-J',
    case_style: 'Bourbois v. Hernandez',
    court_name: '430th Judicial District Court',
    court_number: '430th Judicial District',
    county: 'Hidalgo',
    state: 'Texas',
  },
  parties: { plaintiffs: [], defendants: [], third_parties: [] },
  attorneys: [{ name: 'Raul Garza', firm: 'Goldman & Peterson', role: 'ordering', represents: 'defendant', address: null, city: null, state: null, postal_code: null, phone: null, fax: null, email: null, delivery_format: null, is_rush: false }],
  deposition_sessions: [
    { deponent_name: 'Arieana Skye Bourbois', deposition_date: '2026-03-04', start_time: '10:00', location: 'Via Zoom', is_remote: true, remote_platform: 'zoom', zoom_link: null, is_videotaped: false, includes_duces_tecum: false },
    { deponent_name: 'Ariella Starr Bourbois', deposition_date: '2026-03-04', start_time: '14:00', location: 'Via Zoom', is_remote: true, remote_platform: 'zoom', zoom_link: null, is_videotaped: false, includes_duces_tecum: false },
  ],
  court_reporter: { firm: null, name: null, phone: null },
  transcription_keywords: { names: [], firms: [], locations: [], legal_terms: [], all_keywords: ['Bourbois', 'Hernandez'] },
  ordered_by: null,
  notes: null,
};

describe('IntakeUploadStep', () => {
  function setInputValue(input: HTMLInputElement, value: string) {
    // Direct assignment works in jsdom — React synthetic events are not needed
    // since we dispatch native input+change events below
    input.setAttribute('value', value);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  it('renders upload zone', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => {
      root.render(<IntakeUploadStep onParsed={() => undefined} />);
    });
    expect(container.textContent).toContain('Upload Deposition Document');
    expect(container.querySelector('[data-testid="intake-upload-dropzone"]')).not.toBeNull();
  });

  it('shows extraction summary after successful parse via file upload', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, extraction: EXTRACTION }),
    } as Response);

    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => {
      root.render(<IntakeUploadStep onParsed={() => undefined} />);
    });

    // Use the file input (default "upload" tab) — Radix tabs don't switch in jsdom
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const testFile = new File(['test'], 'notice.pdf', { type: 'application/pdf' });
    const fileList = { 0: testFile, length: 1, item: (i: number) => i === 0 ? testFile : null };
    await act(async () => {
      Object.defineProperty(fileInput, 'files', { value: fileList, writable: false });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 10));
    });

    expect(container.querySelector('[data-testid="intake-upload-summary"]')).not.toBeNull();
    fetchMock.mockRestore();
  });

  it('shows session selector when multiple sessions found via file upload', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, extraction: EXTRACTION }),
    } as Response);

    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => {
      root.render(<IntakeUploadStep onParsed={() => undefined} />);
    });

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const testFile = new File(['test'], 'notice.pdf', { type: 'application/pdf' });
    const fileList = { 0: testFile, length: 1, item: (i: number) => i === 0 ? testFile : null };
    await act(async () => {
      Object.defineProperty(fileInput, 'files', { value: fileList, writable: false });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 10));
    });

    expect(container.textContent).toContain('Which deposition session is this job for?');
    fetchMock.mockRestore();
  });

  it('skip button invokes callback', () => {
    const onSkip = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => {
      root.render(<IntakeUploadStep onParsed={() => undefined} onSkip={onSkip} />);
    });
    const skipButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Skip'));
    act(() => {
      skipButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onSkip).toHaveBeenCalled();
  });
});
