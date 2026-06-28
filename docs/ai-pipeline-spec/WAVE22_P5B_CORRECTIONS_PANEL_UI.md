# WAVE 22 P5-B — CORRECTIONS PANEL: AI SUGGESTIONS UI
# Depo-Pro | Depends on: Wave 22 P5 (schema + engine must be deployed first)
# Run with: codex --profile depo --no-resume

---

## CONTEXT

P5 built the AI engine and stored suggestions in the DB. This prompt
builds the UI surface in the Corrections Panel where Miah reviews and
accepts/rejects pending AI suggestions.

The Corrections Panel already exists with three sections:
  - Summary card
  - Needs Audio Verification
  - Auto-corrected (collapsed)

Add a fourth section: AI Suggestions — sits BETWEEN Summary and
Needs Audio Verification. Only renders when pending suggestions exist.

---

## STEP 1 — FETCH PENDING AI SUGGESTIONS

Add to src/hooks/useAISuggestions.ts (NEW FILE):

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface AISuggestion {
  word_id: string;
  utterance_id: string;
  raw_text: string;
  ai_suggestion: string;
  ai_suggestion_reason: string;
  ai_confidence: number;
  // Context for display
  context_before: string;
  context_after: string;
  utterance_raw_text: string;
}

export function useAISuggestions(transcriptId: string) {
  return useQuery({
    queryKey: ['ai-suggestions', transcriptId],
    queryFn: async (): Promise<AISuggestion[]> => {
      const { data, error } = await supabase
        .from('transcript_words')
        .select(`
          id,
          utterance_id,
          raw_text,
          ai_suggestion,
          ai_suggestion_reason,
          ai_confidence,
          transcript_utterances!inner(raw_text)
        `)
        .eq('transcript_id', transcriptId)
        .eq('ai_suggestion_status', 'pending')
        .order('ai_confidence', { ascending: false });

      if (error) throw error;

      return (data ?? []).map((w) => ({
        word_id: w.id,
        utterance_id: w.utterance_id,
        raw_text: w.raw_text,
        ai_suggestion: w.ai_suggestion!,
        ai_suggestion_reason: w.ai_suggestion_reason ?? '',
        ai_confidence: w.ai_confidence ?? 0,
        context_before: '',  // populated by buildContext below
        context_after: '',
        utterance_raw_text: (w as any).transcript_utterances?.raw_text ?? '',
      }));
    },
    staleTime: 30_000,
  });
}

export function useAcceptAISuggestion(transcriptId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (wordId: string) => {
      const res = await fetch(
        `/functions/v1/editor-api/${transcriptId}/ai-suggestions/${wordId}`,
        { method: 'PATCH', body: JSON.stringify({ action: 'accept' }) }
      );
      if (!res.ok) throw new Error('Accept failed');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-suggestions', transcriptId] });
      qc.invalidateQueries({ queryKey: ['transcript-words', transcriptId] });
    },
  });
}

export function useRejectAISuggestion(transcriptId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (wordId: string) => {
      const res = await fetch(
        `/functions/v1/editor-api/${transcriptId}/ai-suggestions/${wordId}`,
        { method: 'PATCH', body: JSON.stringify({ action: 'reject' }) }
      );
      if (!res.ok) throw new Error('Reject failed');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-suggestions', transcriptId] });
    },
  });
}

export function useAcceptAllAISuggestions(transcriptId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/functions/v1/editor-api/${transcriptId}/ai-suggestions/accept-all`,
        { method: 'POST' }
      );
      if (!res.ok) throw new Error('Accept all failed');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-suggestions', transcriptId] });
      qc.invalidateQueries({ queryKey: ['transcript-words', transcriptId] });
    },
  });
}
```

---

## STEP 2 — AI SUGGESTIONS SECTION COMPONENT

File: src/components/CorrectionsPanel/AISuggestionsSection.tsx (NEW FILE)

```tsx
import { useState } from 'react';
import {
  useAISuggestions,
  useAcceptAISuggestion,
  useRejectAISuggestion,
  useAcceptAllAISuggestions,
} from '@/hooks/useAISuggestions';

interface Props {
  transcriptId: string;
  onScrollToWord?: (wordId: string) => void;
}

export function AISuggestionsSection({ transcriptId, onScrollToWord }: Props) {
  const { data: suggestions = [], isLoading } = useAISuggestions(transcriptId);
  const accept = useAcceptAISuggestion(transcriptId);
  const reject = useRejectAISuggestion(transcriptId);
  const acceptAll = useAcceptAllAISuggestions(transcriptId);
  const [expanded, setExpanded] = useState(true);

  if (isLoading) return null;
  if (suggestions.length === 0) return null;

  const highConfidence = suggestions.filter((s) => s.ai_confidence >= 0.90);
  const lowerConfidence = suggestions.filter((s) => s.ai_confidence < 0.90);

  return (
    <section className="corrections-section ai-suggestions-section">
      <div
        className="corrections-section-header"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
      >
        <span className="section-icon ai-icon">✦</span>
        <span className="section-title">
          AI Suggestions
          <span className="section-badge">{suggestions.length}</span>
        </span>
        <span className="section-chevron">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="corrections-section-body">
          {suggestions.length > 1 && (
            <div className="ai-bulk-actions">
              <button
                className="btn-accept-all"
                onClick={() => acceptAll.mutate()}
                disabled={acceptAll.isPending}
              >
                Accept all {suggestions.length} suggestions
              </button>
            </div>
          )}

          {highConfidence.length > 0 && (
            <div className="ai-confidence-group">
              <span className="confidence-label high">High confidence</span>
              {highConfidence.map((s) => (
                <AISuggestionRow
                  key={s.word_id}
                  suggestion={s}
                  onAccept={() => accept.mutate(s.word_id)}
                  onReject={() => reject.mutate(s.word_id)}
                  onClickContext={() => onScrollToWord?.(s.word_id)}
                  accepting={accept.isPending}
                  rejecting={reject.isPending}
                />
              ))}
            </div>
          )}

          {lowerConfidence.length > 0 && (
            <div className="ai-confidence-group">
              <span className="confidence-label lower">Verify carefully</span>
              {lowerConfidence.map((s) => (
                <AISuggestionRow
                  key={s.word_id}
                  suggestion={s}
                  onAccept={() => accept.mutate(s.word_id)}
                  onReject={() => reject.mutate(s.word_id)}
                  onClickContext={() => onScrollToWord?.(s.word_id)}
                  accepting={accept.isPending}
                  rejecting={reject.isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function AISuggestionRow({
  suggestion,
  onAccept,
  onReject,
  onClickContext,
  accepting,
  rejecting,
}: {
  suggestion: {
    word_id: string;
    raw_text: string;
    ai_suggestion: string;
    ai_suggestion_reason: string;
    ai_confidence: number;
    utterance_raw_text: string;
  };
  onAccept: () => void;
  onReject: () => void;
  onClickContext: () => void;
  accepting: boolean;
  rejecting: boolean;
}) {
  const confidencePct = Math.round(suggestion.ai_confidence * 100);

  // Highlight the token in context
  const contextHighlighted = suggestion.utterance_raw_text.replace(
    new RegExp(`\\b${escapeRegex(suggestion.raw_text)}\\b`, 'i'),
    `<mark>${suggestion.raw_text}</mark>`
  );

  return (
    <div className="ai-suggestion-row">
      <div className="suggestion-change">
        <span className="token-original">{suggestion.raw_text}</span>
        <span className="arrow">→</span>
        <span className="token-suggested">{suggestion.ai_suggestion}</span>
        <span className="confidence-pct">{confidencePct}%</span>
      </div>

      <div
        className="suggestion-context"
        onClick={onClickContext}
        title="Click to jump to this word in the transcript"
        dangerouslySetInnerHTML={{ __html: contextHighlighted }}
      />

      <div className="suggestion-reason">{suggestion.ai_suggestion_reason}</div>

      <div className="suggestion-actions">
        <button
          className="btn-accept"
          onClick={onAccept}
          disabled={accepting || rejecting}
          aria-label={`Accept: change ${suggestion.raw_text} to ${suggestion.ai_suggestion}`}
        >
          ✓ Accept
        </button>
        <button
          className="btn-reject"
          onClick={onReject}
          disabled={accepting || rejecting}
          aria-label={`Reject suggestion for ${suggestion.raw_text}`}
        >
          ✕ Reject
        </button>
      </div>
    </div>
  );
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

---

## STEP 3 — WIRE INTO CorrectionsPanel.tsx

In src/components/CorrectionsPanel/CorrectionsPanel.tsx, add the new
section between Summary and Needs Audio Verification:

```tsx
// Add import
import { AISuggestionsSection } from './AISuggestionsSection';

// In the JSX, after <SummaryCard> and before <NeedsAudioSection>:
<AISuggestionsSection
  transcriptId={transcriptId}
  onScrollToWord={onScrollToWord}
/>
```

---

## STEP 4 — ACCEPT-ALL ENDPOINT

Add to supabase/functions/editor-api/index.ts:

```
POST /transcripts/:transcript_id/ai-suggestions/accept-all

For every transcript_word where:
  transcript_id = :transcript_id
  ai_suggestion_status = 'pending'

Execute:
  UPDATE transcript_words
  SET
    working_text = ai_suggestion,
    ai_suggestion_status = 'accepted'
  WHERE transcript_id = :transcript_id
    AND ai_suggestion_status = 'pending';

Log one change_log entry:
  { type: 'ai_suggestions_accepted_all', count: N, transcript_id }

Return: { accepted_count: N }
```

---

## STEP 5 — SPEAKER SUGGESTIONS IN SPEAKER PANEL

The speaker suggestions from the AI engine (Step 3 in P5) are stored in
speaker_resolution_current with ai_suggested = true. Surface them in the
Speaker Panel with a distinct AI badge:

In src/components/SpeakerPanel/SpeakerPanel.tsx, for each speaker that has
ai_suggested = true on their current record, show:

```tsx
{speaker.ai_suggested && (
  <span className="ai-suggested-badge" title={speaker.ai_suggestion_reason}>
    ✦ AI
  </span>
)}
```

The badge disappears once the speaker is manually verified (when Miah
edits the name or role in the speaker panel, set ai_suggested = false).

---

## CSS (add to CorrectionsPanel.css)

```css
.ai-suggestions-section {
  border-left: 3px solid #3B82F6;
}

.ai-icon {
  color: #3B82F6;
}

.ai-bulk-actions {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

.btn-accept-all {
  font-size: 12px;
  padding: 4px 12px;
  background: #3B82F6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.ai-confidence-group {
  padding: 8px 12px;
}

.confidence-label {
  display: block;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

.confidence-label.high { color: #059669; }
.confidence-label.lower { color: #D97706; }

.ai-suggestion-row {
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.suggestion-change {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.token-original {
  font-family: var(--font-mono);
  background: #FEF2F2;
  color: #B91C1C;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
}

.token-suggested {
  font-family: var(--font-mono);
  background: #F0FDF4;
  color: #15803D;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 500;
}

.confidence-pct {
  font-size: 11px;
  color: var(--text-muted);
  margin-left: auto;
}

.suggestion-context {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  cursor: pointer;
  line-height: 1.4;
}

.suggestion-context mark {
  background: #FEF9C3;
  border-radius: 2px;
}

.suggestion-reason {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 6px;
  font-style: italic;
}

.suggestion-actions {
  display: flex;
  gap: 6px;
}

.btn-accept {
  padding: 3px 10px;
  font-size: 12px;
  background: #F0FDF4;
  color: #15803D;
  border: 1px solid #BBF7D0;
  border-radius: 4px;
  cursor: pointer;
}

.btn-reject {
  padding: 3px 10px;
  font-size: 12px;
  background: #FEF2F2;
  color: #B91C1C;
  border: 1px solid #FECACA;
  border-radius: 4px;
  cursor: pointer;
}

.ai-suggested-badge {
  font-size: 10px;
  background: #EFF6FF;
  color: #1D4ED8;
  border: 1px solid #BFDBFE;
  border-radius: 10px;
  padding: 1px 6px;
  margin-left: 4px;
}
```

---

## VERIFICATION CHECKLIST

1. [ ] AISuggestionsSection does not render when pending count = 0
2. [ ] Accept writes working_text, clears ai_suggestion_status to 'accepted'
3. [ ] Reject clears ai_suggestion_status to 'rejected', does NOT change working_text
4. [ ] Accept All processes all pending words in one request
5. [ ] Context click scrolls to word in transcript viewer
6. [ ] AI badge appears on speaker panel for ai_suggested speakers
7. [ ] AI badge disappears after manual speaker edit
8. [ ] npm run build passes, 0 TypeScript errors
9. [ ] npm run test passes, all existing tests green
10. [ ] New tests for useAISuggestions hook (mock supabase query)
11. [ ] New test for AISuggestionsSection renders nothing when empty

---

## COMMIT MESSAGES

feat(hooks): useAISuggestions — fetch, accept, reject, accept-all mutations
feat(ui): AISuggestionsSection in CorrectionsPanel with high/lower confidence grouping
feat(panel): wire AISuggestionsSection into CorrectionsPanel between summary and audio flags
feat(api): accept-all endpoint for AI suggestions batch acceptance
feat(speakers): AI suggested badge in SpeakerPanel for ai_suggested speakers
