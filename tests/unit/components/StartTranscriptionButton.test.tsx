import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StartTranscriptionButton } from '@/components/jobs/StartTranscriptionButton';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

function renderButton(props: { jobId: string; disabled?: boolean }) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<StartTranscriptionButton {...props} />);
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe('StartTranscriptionButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Start Transcription button', () => {
    const { container } = renderButton({ jobId: 'job-123' });
    expect(container.textContent).toMatch(/start transcription/i);
    container.querySelector('button')?.closest('div')?.remove();
  });

  it('calls transcribe API on click', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Transcription started' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { container } = renderButton({ jobId: 'job-123' });
    const btn = container.querySelector('button');
    expect(btn).toBeTruthy();
    await act(async () => {
      btn?.click();
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/jobs/job-123/transcribe',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
    );
    vi.unstubAllGlobals();
  });

  it('shows error when API fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'No audio file found' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { container } = renderButton({ jobId: 'job-123' });
    const btn = container.querySelector('button');
    await act(async () => {
      btn?.click();
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(container.textContent).toMatch(/no audio file found/i);
    vi.unstubAllGlobals();
  });

  it('is disabled when disabled prop is true', () => {
    const { container } = renderButton({ jobId: 'job-123', disabled: true });
    const btn = container.querySelector('button');
    expect(btn?.hasAttribute('disabled')).toBe(true);
  });
});
