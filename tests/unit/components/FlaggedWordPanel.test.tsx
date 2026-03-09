/**
 * Pre-flight summary:
 * - The live review component is components/transcripts/low-confidence-panel.tsx, wrapped by flagged-word-review-panel.tsx.
 * - The repo does not currently expose a standalone FlaggedWordPanel component, so this test targets LowConfidencePanel's database-backed review mode.
 * - Review data is backed by "flagged_words", "transcription_edits", and "transcriptions", with a 0.85 review threshold in the pipeline.
 * - Current UI behavior differs slightly from the prompt: timestamp buttons seek to the raw word start time, while the parent review client applies the 2-second preroll.
 */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderUi(element: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return {
    container,
    rerender: (next: React.ReactElement) => {
      act(() => {
        root.render(next);
      });
    },
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function baseWords() {
  return [
    {
      id: 'fw-1',
      transcription_id: 'tx-1',
      word_index: 3,
      segment_index: null,
      original_word: 'Miyamardeau',
      confidence: 0.38,
      start_time: 1.04,
      end_time: 1.44,
      speaker: 'SPEAKER_01',
      context_before: 'Please state your',
      context_after: 'for the record',
      alternatives: [{ word: 'Bardot', confidence: 0.81 }],
      corrected_word: null,
      status: 'PENDING',
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
      sort_order: 0,
      created_at: '2026-03-09T12:00:00.000Z',
    },
    {
      id: 'fw-2',
      transcription_id: 'tx-1',
      word_index: 7,
      segment_index: null,
      original_word: 'record',
      confidence: 0.74,
      start_time: 2.04,
      end_time: 2.44,
      speaker: 'SPEAKER_01',
      context_before: 'Miyamardeau for the',
      context_after: 'today please',
      alternatives: null,
      corrected_word: null,
      status: 'PENDING',
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
      sort_order: 1,
      created_at: '2026-03-09T12:00:00.000Z',
    },
    {
      id: 'fw-3',
      transcription_id: 'tx-1',
      word_index: 9,
      segment_index: null,
      original_word: 'Bardot',
      confidence: 0.83,
      start_time: 3.04,
      end_time: 3.44,
      speaker: 'SPEAKER_00',
      context_before: 'the witness is',
      context_after: 'on the record',
      alternatives: null,
      corrected_word: null,
      status: 'PENDING',
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
      sort_order: 2,
      created_at: '2026-03-09T12:00:00.000Z',
    },
  ] as const;
}

describe('FlaggedWordPanel review surface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = vi.fn();
    }
  });

  it('renders flagged words with confidence percentages and context', async () => {
    const { LowConfidencePanel } = await import('@/components/transcripts/low-confidence-panel');
    const onSeekAudio = vi.fn();
    const onCorrection = vi.fn(async () => {});
    const { container, unmount } = renderUi(
      <LowConfidencePanel
        flaggedWords={[...baseWords()]}
        stats={{ total: 3, pending: 3, corrected: 0, confirmed: 0, skipped: 0 }}
        currentAudioTime={0}
        onSeekAudio={onSeekAudio}
        onCorrection={onCorrection}
        isReadOnly={false}
        isLoading={false}
      />,
    );

    expect(container.textContent).toContain('Miyamardeau');
    expect(container.textContent).toContain('record');
    expect(container.textContent).toContain('Bardot');
    expect(container.textContent).toContain('Confidence: 38%');
    expect(container.textContent).toContain('Confidence: 74%');
    expect(container.textContent).toContain('Confidence: 83%');
    expect(container.textContent).toContain('Please state your');
    expect(container.textContent).toContain('for the record');

    unmount();
  });

  it('clicking a timestamp seeks to the word start time used by the current implementation', async () => {
    const { LowConfidencePanel } = await import('@/components/transcripts/low-confidence-panel');
    const onSeekAudio = vi.fn();
    const { container, unmount } = renderUi(
      <LowConfidencePanel
        flaggedWords={[...baseWords()]}
        stats={{ total: 3, pending: 3, corrected: 0, confirmed: 0, skipped: 0 }}
        currentAudioTime={0}
        onSeekAudio={onSeekAudio}
        onCorrection={vi.fn(async () => {})}
        isReadOnly={false}
        isLoading={false}
      />,
    );

    const timestampButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === '0:01');
    expect(timestampButton).toBeTruthy();
    act(() => {
      timestampButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSeekAudio).toHaveBeenCalledWith(1.04);

    unmount();
  });

  it('opens the inline correction editor and submits corrections through onCorrection', async () => {
    const { LowConfidencePanel } = await import('@/components/transcripts/low-confidence-panel');
    const onCorrection = vi.fn(async () => {});
    const { container, unmount } = renderUi(
      <LowConfidencePanel
        flaggedWords={[...baseWords()]}
        stats={{ total: 3, pending: 3, corrected: 0, confirmed: 0, skipped: 0 }}
        currentAudioTime={0}
        onSeekAudio={vi.fn()}
        onCorrection={onCorrection}
        isReadOnly={false}
        isLoading={false}
      />,
    );

    const correctButtons = Array.from(container.querySelectorAll('button')).filter((button) => button.textContent === 'Correct');
    act(() => {
      correctButtons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const input = container.querySelector('input[placeholder="Enter correction"]') as HTMLInputElement | null;
    expect(input).toBeTruthy();
    await act(async () => {
      if (input) {
        const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        valueSetter?.call(input, 'Bardot');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    const saveButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Save');
    await act(async () => {
      saveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onCorrection).toHaveBeenCalledWith('fw-1', 'correct', 'Bardot');

    unmount();
  });

  it('supports keyboard navigation and skips non-pending words when tabbing', async () => {
    const { LowConfidencePanel } = await import('@/components/transcripts/low-confidence-panel');
    const words = [...baseWords()];
    words[1] = { ...words[1], status: 'CONFIRMED', corrected_word: 'record' };
    const onSeekAudio = vi.fn();

    const { container, unmount } = renderUi(
      <LowConfidencePanel
        flaggedWords={words}
        stats={{ total: 3, pending: 2, corrected: 0, confirmed: 1, skipped: 0 }}
        currentAudioTime={0}
        onSeekAudio={onSeekAudio}
        onCorrection={vi.fn(async () => {})}
        isReadOnly={false}
        isLoading={false}
      />,
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });

    let selected = container.querySelector('[data-word-index="0"]');
    expect(selected?.className).toContain('ring-blue-500');
    expect(onSeekAudio).toHaveBeenLastCalledWith(0);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });

    selected = container.querySelector('[data-word-index="1"]');
    expect(selected?.className).toContain('ring-blue-500');
    expect(onSeekAudio).toHaveBeenLastCalledWith(1.04);

    unmount();
  });

  it('shows reviewed progress and hides editing actions in read-only mode', async () => {
    const { LowConfidencePanel } = await import('@/components/transcripts/low-confidence-panel');
    const { container, unmount } = renderUi(
      <LowConfidencePanel
        flaggedWords={[
          { ...baseWords()[0], status: 'CORRECTED', corrected_word: 'Bardot' },
          { ...baseWords()[1], status: 'CONFIRMED' },
          { ...baseWords()[2], status: 'PENDING' },
        ]}
        stats={{ total: 3, pending: 1, corrected: 1, confirmed: 1, skipped: 0 }}
        currentAudioTime={0}
        onSeekAudio={vi.fn()}
        onCorrection={vi.fn(async () => {})}
        isReadOnly={true}
        isLoading={false}
      />,
    );

    expect(container.textContent).toContain('1 / 3 reviewed');
    expect(Array.from(container.querySelectorAll('button')).some((button) => button.textContent === 'Correct')).toBe(false);
    expect(Array.from(container.querySelectorAll('button')).some((button) => button.textContent === 'Confirm')).toBe(false);
    expect(Array.from(container.querySelectorAll('button')).some((button) => button.textContent === 'Skip')).toBe(false);

    unmount();
  });
});
