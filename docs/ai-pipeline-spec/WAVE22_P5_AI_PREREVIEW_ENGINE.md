# WAVE 22 P5 — AI PRE-REVIEW ENGINE
# Depo-Pro | Branch: feature/stage3-workspace-core
# BETA_FREEZE: Schema changes + new Edge Function only. No UI regressions.
#
# Run with: codex --profile depo --no-resume
# Stop condition: npm run build passes, all existing tests pass,
#                 new tests written and passing.
#
# IMMUTABILITY RULE: raw_text is NEVER touched. All AI writes go to
# transcript_words.ai_suggestion only. working_text is only updated
# when Miah explicitly accepts a suggestion.

---

## CONTEXT

The deterministic correction pipeline (CFE → qaFixer → correctionOrchestrator)
already handles everything provably correct. This pass handles only what it
cannot: ambiguous ASR tokens, unidentified speakers, and Q./A. role assignment
for utterances the rule engine missed.

Three-layer model per word:
  raw_text       = Deepgram output — immutable forever
  working_text   = Miah's accepted edits
  ai_suggestion  = AI overlay — pending Miah's confirmation

Display priority: ai_suggestion ?? working_text ?? raw_text

---

## STEP 1 — SCHEMA MIGRATION

File: supabase/migrations/[timestamp]_add_ai_review_overlay.sql

```sql
-- Per-word AI suggestion overlay
ALTER TABLE transcript_words
  ADD COLUMN IF NOT EXISTS ai_suggestion        TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_suggestion_reason TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_confidence        FLOAT       DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_suggestion_status TEXT        DEFAULT NULL
    CHECK (ai_suggestion_status IN ('pending', 'accepted', 'rejected'));

-- Per-transcript AI review metadata
ALTER TABLE transcripts
  ADD COLUMN IF NOT EXISTS ai_review_meta JSONB DEFAULT NULL;

-- Index for fast pending-suggestion queries
CREATE INDEX IF NOT EXISTS idx_transcript_words_ai_pending
  ON transcript_words (transcript_id, ai_suggestion_status)
  WHERE ai_suggestion_status = 'pending';

COMMENT ON COLUMN transcript_words.ai_suggestion IS
  'AI-proposed correction. NULL = no suggestion. Displayed as overlay until accepted/rejected.';
COMMENT ON COLUMN transcript_words.ai_suggestion_status IS
  'pending = awaiting Miah review | accepted = written to working_text | rejected = discarded';
COMMENT ON COLUMN transcripts.ai_review_meta IS
  'Versioning: {completed, prompt_version, model, transcript_revision, completed_at}';
```

---

## STEP 2 — AI SUGGESTION ENGINE

File: src/lib/transcript/aiSuggestionEngine.ts

This module is called by the Edge Function (Step 3). It does NOT run
in the browser. It receives structured input and returns structured output.

```typescript
import Anthropic from '@anthropic-ai/sdk';

export interface AISuggestionInput {
  transcriptId: string;
  utterances: Array<{
    utterance_id: string;
    speaker_id: string;
    speaker_display_name: string;
    speaker_role: string;        // ATTORNEY | WITNESS | REPORTER | OTHER
    raw_text: string;
    working_text: string;
    words: Array<{
      word_id: string;
      raw_text: string;
      working_text: string | null;
      confidence: number;
      is_flagged: boolean;
      flag_type: string | null;
    }>;
  }>;
  correctionReport: {
    ambiguousFlags: Array<{
      word_id: string;
      utterance_id: string;
      raw_text: string;
      context_before: string;
      context_after: string;
      flag_type: string;
    }>;
    speakerIssues: Array<{
      speaker_id: string;
      display_name: string;
      role: string;
      issue: string;
    }>;
    unstructuredBlocks: Array<{
      utterance_id: string;
      raw_text: string;
      speaker_role: string;
    }>;
  };
  caseRecord: {
    causeNumber: string;
    caseStyle: string;
    witnessName: string;
    examiningAttorney: string;
    opposingCounsel: string;
    reporterName: string;       // Always: Miah Bardot, CSR No. 12129
    caseType: string;
    jurisdiction: string;
  };
}

export interface AISuggestionResult {
  wordSuggestions: Array<{
    word_id: string;
    utterance_id: string;
    suggestion: string;
    reason: string;
    confidence: number;         // 0.0 – 1.0
    auto_apply: boolean;        // true if confidence >= AUTO_APPLY_THRESHOLD
  }>;
  speakerSuggestions: Array<{
    speaker_id: string;
    suggested_display_name: string;
    suggested_role: 'ATTORNEY' | 'WITNESS' | 'REPORTER' | 'VIDEOGRAPHER' | 'INTERPRETER';
    reason: string;
    confidence: number;
  }>;
  structureSuggestions: Array<{
    utterance_id: string;
    suggested_line_type: 'Q' | 'A' | 'COLLOQUY' | 'PARENTHETICAL';
    reason: string;
  }>;
  promptVersion: string;
  model: string;
}

const AUTO_APPLY_THRESHOLD = 0.92;
const PROMPT_VERSION = 'wave22-p5-v1';

const SYSTEM_PROMPT = `You are a legal transcript correction assistant for a Texas civil deposition.
You will receive flagged tokens from a Deepgram speech-to-text transcript that the deterministic
correction pipeline could not resolve with certainty.

Your job is to suggest corrections for:
1. Ambiguous ASR tokens — words that are likely mis-transcribed given context
2. Speaker attribution — which legal role each speaker holds
3. Q./A. structure — which utterances should be questions vs. answers vs. colloquy

ABSOLUTE RULES:
- NEVER change testimony content when the meaning is ambiguous
- NEVER change dollar amounts, dates, or numeric figures unless the garble is completely unambiguous
- NEVER change filler words: uh, um, yeah, nope, uh-huh, uh-uh, mm-hmm
- NEVER change words that are clearly correct in context
- When uncertain (confidence < 0.85), return the token unchanged with a flag
- Proper names not in the case record: flag, do not correct

PERMITTED CORRECTIONS (high confidence only):
- ASR garbles of attorney/witness names from the case record
- Medical/legal terminology garbles where context is unambiguous
- Reporter credential garbles (Miah Bardot, CSR No. 12129)
- Oath phrase garbles ("so help you God", "penalty of perjury")
- Objection garbles (Injection/Infection/Protection → Objection)
- "so" read by Deepgram as the start of a sentence when it is part of a phrase

VERBATIM PROTECTED — NEVER TOUCH:
- uh, um, ah, like, you know, I mean, basically, so, well
- uh-huh, uh-uh, mm-hmm, yeah, yep, nope, nah
- gonna, kinda, wanna, gotta, lemme, y'all
- Grammatical errors in testimony
- Profanity (preserve exactly)
- Stutters and false starts

SPEAKER IDENTIFICATION:
- Examining attorney: asks substantive questions, introduces themselves, says "Pass the witness"
- Witness: answers questions, first-person narrative, self-identifies in first Q
- Court reporter: administers oath, opens/closes record, requests spellings
  → ALWAYS label as "THE REPORTER" never "THE COURT REPORTER"
- Videographer: announces recording start/stop only
- Opposing counsel: states objections, may cross-examine

OUTPUT: Return valid JSON only. No prose. No explanation outside the JSON fields.`;

export async function generateAISuggestions(
  input: AISuggestionInput,
  apiKey: string
): Promise<AISuggestionResult> {
  const client = new Anthropic({ apiKey });

  const userMessage = buildUserMessage(input);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    temperature: 0,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMessage }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from AI');

  const raw = JSON.parse(content.text);
  return normalizeAndScore(raw);
}

function buildUserMessage(input: AISuggestionInput): string {
  return JSON.stringify({
    task: 'transcript_correction',
    case_record: input.caseRecord,
    flagged_tokens: input.correctionReport.ambiguousFlags.map((f) => ({
      word_id: f.word_id,
      utterance_id: f.utterance_id,
      raw_text: f.raw_text,
      context: `...${f.context_before} [${f.raw_text}] ${f.context_after}...`,
      flag_type: f.flag_type,
    })),
    speaker_issues: input.correctionReport.speakerIssues,
    unstructured_blocks: input.correctionReport.unstructuredBlocks,
    response_format: {
      wordSuggestions: [
        {
          word_id: 'string',
          utterance_id: 'string',
          suggestion: 'string',
          reason: 'string (one sentence)',
          confidence: 'number 0.0-1.0',
        },
      ],
      speakerSuggestions: [
        {
          speaker_id: 'string',
          suggested_display_name: 'string (e.g. MR. BENTLEY)',
          suggested_role: 'ATTORNEY|WITNESS|REPORTER|VIDEOGRAPHER|INTERPRETER',
          reason: 'string (one sentence)',
          confidence: 'number 0.0-1.0',
        },
      ],
      structureSuggestions: [
        {
          utterance_id: 'string',
          suggested_line_type: 'Q|A|COLLOQUY|PARENTHETICAL',
          reason: 'string (one sentence)',
        },
      ],
    },
  });
}

function normalizeAndScore(raw: any): AISuggestionResult {
  return {
    wordSuggestions: (raw.wordSuggestions ?? []).map((s: any) => ({
      ...s,
      auto_apply: (s.confidence ?? 0) >= AUTO_APPLY_THRESHOLD,
    })),
    speakerSuggestions: raw.speakerSuggestions ?? [],
    structureSuggestions: raw.structureSuggestions ?? [],
    promptVersion: PROMPT_VERSION,
    model: 'claude-sonnet-4-6',
  };
}
```

---

## STEP 3 — EDGE FUNCTION: ai-review

File: supabase/functions/ai-review/index.ts

Triggered by the transcription completion webhook (same trigger that fires
the existing editor-api pipeline). Stores results in the DB so the workspace
loads with suggestions already present.

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.0';

const PROMPT_VERSION = 'wave22-p5-v1';
const AUTO_APPLY_THRESHOLD = 0.92;

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { transcript_id, force_rerun } = await req.json();
  if (!transcript_id) {
    return new Response(JSON.stringify({ error: 'transcript_id required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!;

  // --- Version gate: skip if already reviewed with same prompt version ---
  const { data: transcript } = await supabase
    .from('transcripts')
    .select('ai_review_meta, transcript_revision, job_id')
    .eq('id', transcript_id)
    .single();

  if (!force_rerun && transcript?.ai_review_meta?.completed) {
    const meta = transcript.ai_review_meta;
    if (
      meta.prompt_version === PROMPT_VERSION &&
      meta.transcript_revision === transcript.transcript_revision
    ) {
      return new Response(
        JSON.stringify({ skipped: true, reason: 'already_reviewed' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // --- Load transcript data ---
  const [utterancesRes, wordsRes, speakersRes, jobRes] = await Promise.all([
    supabase
      .from('transcript_utterances')
      .select('*')
      .eq('transcript_id', transcript_id)
      .order('sequence_number'),
    supabase
      .from('transcript_words')
      .select('*')
      .eq('transcript_id', transcript_id)
      .order('utterance_id, word_index'),
    supabase
      .from('speaker_resolution_current')
      .select('*')
      .eq('transcript_id', transcript_id),
    supabase
      .from('jobs')
      .select('case_style, cause_number, witness_name, examining_attorney, opposing_counsel, case_type, jurisdiction')
      .eq('id', transcript.job_id)
      .single(),
  ]);

  if (utterancesRes.error || wordsRes.error) {
    throw new Error('Failed to load transcript data');
  }

  // --- Build word map ---
  const wordsByUtterance = new Map<string, typeof wordsRes.data>();
  for (const word of wordsRes.data ?? []) {
    const list = wordsByUtterance.get(word.utterance_id) ?? [];
    list.push(word);
    wordsByUtterance.set(word.utterance_id, list);
  }

  // --- Build correction report (inline — mirrors correctionOrchestrator logic) ---
  const ambiguousFlags = (wordsRes.data ?? [])
    .filter((w) => w.confidence < 0.75 || w.is_flagged)
    .map((w) => {
      const utteranceWords = wordsByUtterance.get(w.utterance_id) ?? [];
      const idx = utteranceWords.findIndex((x) => x.id === w.id);
      return {
        word_id: w.id,
        utterance_id: w.utterance_id,
        raw_text: w.raw_text,
        context_before: utteranceWords
          .slice(Math.max(0, idx - 4), idx)
          .map((x) => x.working_text ?? x.raw_text)
          .join(' '),
        context_after: utteranceWords
          .slice(idx + 1, idx + 5)
          .map((x) => x.working_text ?? x.raw_text)
          .join(' '),
        flag_type: w.is_flagged ? w.flag_type ?? 'LOW_CONFIDENCE' : 'LOW_CONFIDENCE',
      };
    })
    .slice(0, 60); // Cap at 60 tokens per AI call

  const speakerIssues = (speakersRes.data ?? [])
    .filter((s) => !s.verified_role || s.display_name?.startsWith('SPEAKER'))
    .map((s) => ({
      speaker_id: s.speaker_id,
      display_name: s.display_name,
      role: s.verified_role ?? 'OTHER',
      issue: !s.verified_role ? 'no_role_assigned' : 'generic_display_name',
    }));

  // Skip AI call if nothing to review
  if (ambiguousFlags.length === 0 && speakerIssues.length === 0) {
    await supabase
      .from('transcripts')
      .update({
        ai_review_meta: {
          completed: true,
          prompt_version: PROMPT_VERSION,
          model: 'claude-sonnet-4-6',
          transcript_revision: transcript.transcript_revision,
          completed_at: new Date().toISOString(),
          suggestions_count: 0,
          auto_applied_count: 0,
        },
      })
      .eq('id', transcript_id);

    return new Response(
      JSON.stringify({ completed: true, suggestions_count: 0 }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // --- Call AI ---
  const { generateAISuggestions } = await import('../../../src/lib/transcript/aiSuggestionEngine.ts');
  const suggestions = await generateAISuggestions(
    {
      transcriptId: transcript_id,
      utterances: (utterancesRes.data ?? []).map((u) => ({
        utterance_id: u.id,
        speaker_id: u.speaker_id,
        speaker_display_name: u.speaker_display_name ?? '',
        speaker_role: u.speaker_role ?? 'OTHER',
        raw_text: u.raw_text,
        working_text: u.working_text ?? u.raw_text,
        words: wordsByUtterance.get(u.id) ?? [],
      })),
      correctionReport: {
        ambiguousFlags,
        speakerIssues,
        unstructuredBlocks: (utterancesRes.data ?? [])
          .filter((u) => !u.line_type || u.line_type === 'UNKNOWN')
          .map((u) => ({
            utterance_id: u.id,
            raw_text: u.raw_text,
            speaker_role: u.speaker_role ?? 'OTHER',
          })),
      },
      caseRecord: {
        causeNumber: jobRes.data?.cause_number ?? '',
        caseStyle: jobRes.data?.case_style ?? '',
        witnessName: jobRes.data?.witness_name ?? '',
        examiningAttorney: jobRes.data?.examining_attorney ?? '',
        opposingCounsel: jobRes.data?.opposing_counsel ?? '',
        reporterName: 'Miah Bardot, CSR No. 12129',
        caseType: jobRes.data?.case_type ?? '',
        jurisdiction: jobRes.data?.jurisdiction ?? '',
      },
    },
    anthropicKey
  );

  // --- Persist word suggestions ---
  const wordUpdates = suggestions.wordSuggestions.map((s) => ({
    id: s.word_id,
    ai_suggestion: s.suggestion,
    ai_suggestion_reason: s.reason,
    ai_confidence: s.confidence,
    ai_suggestion_status: 'pending' as const,
  }));

  if (wordUpdates.length > 0) {
    await supabase.from('transcript_words').upsert(wordUpdates, { onConflict: 'id' });
  }

  // --- Auto-apply high-confidence word suggestions ---
  const autoApply = suggestions.wordSuggestions.filter((s) => s.auto_apply);
  if (autoApply.length > 0) {
    for (const s of autoApply) {
      await supabase
        .from('transcript_words')
        .update({
          working_text: s.suggestion,
          ai_suggestion_status: 'accepted',
        })
        .eq('id', s.word_id);
    }
  }

  // --- Persist speaker suggestions ---
  for (const s of suggestions.speakerSuggestions) {
    if (s.confidence >= 0.90) {
      await supabase
        .from('speaker_resolution_current')
        .update({
          display_name: s.suggested_display_name,
          verified_role: s.suggested_role,
          ai_suggested: true,
          ai_suggestion_reason: s.reason,
        })
        .eq('transcript_id', transcript_id)
        .eq('speaker_id', s.speaker_id);
    }
  }

  // --- Persist structure suggestions ---
  for (const s of suggestions.structureSuggestions) {
    await supabase
      .from('transcript_utterances')
      .update({ ai_suggested_line_type: s.suggested_line_type })
      .eq('id', s.utterance_id);
  }

  // --- Mark review complete ---
  const totalSuggestions = suggestions.wordSuggestions.length +
    suggestions.speakerSuggestions.length +
    suggestions.structureSuggestions.length;

  await supabase
    .from('transcripts')
    .update({
      ai_review_meta: {
        completed: true,
        prompt_version: PROMPT_VERSION,
        model: 'claude-sonnet-4-6',
        transcript_revision: transcript.transcript_revision,
        completed_at: new Date().toISOString(),
        suggestions_count: totalSuggestions,
        auto_applied_count: autoApply.length,
      },
    })
    .eq('id', transcript_id);

  return new Response(
    JSON.stringify({
      completed: true,
      suggestions_count: totalSuggestions,
      auto_applied_count: autoApply.length,
      pending_review_count: totalSuggestions - autoApply.length,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

---

## STEP 4 — OVERLAY DISPLAY IN workspacePresentation.ts

In the word rendering path, resolve the display value using the three-layer priority.
Add this helper and call it wherever raw_text is currently used for display:

```typescript
// Add to src/lib/transcript/workspacePresentation.ts

export function resolveWordDisplay(word: {
  raw_text: string;
  working_text: string | null;
  ai_suggestion: string | null;
  ai_suggestion_status: string | null;
}): {
  displayText: string;
  layer: 'ai_suggestion' | 'working_text' | 'raw_text';
  isPending: boolean;
} {
  if (
    word.ai_suggestion &&
    word.ai_suggestion_status === 'pending'
  ) {
    return {
      displayText: word.ai_suggestion,
      layer: 'ai_suggestion',
      isPending: true,
    };
  }
  if (word.working_text) {
    return {
      displayText: word.working_text,
      layer: 'working_text',
      isPending: false,
    };
  }
  return {
    displayText: word.raw_text,
    layer: 'raw_text',
    isPending: false,
  };
}
```

In buildEditorContent.ts, add a visual class for AI-overlay tokens:
- `ai-suggestion-pending` → light blue underline (distinct from orange confidence flags)
- `ai-auto-applied` → no visual mark (silently accepted, Miah sees the result)

---

## STEP 5 — REVIEW BANNER COMPONENT

File: src/components/AIReviewBanner/AIReviewBanner.tsx

Shows in the workspace header while AI review is pending/running.
Disappears once all suggestions are resolved or dismissed.

```typescript
import { useEffect, useState } from 'react';

interface AIReviewBannerProps {
  transcriptId: string;
  pendingCount: number;
  autoAppliedCount: number;
  onDismiss: () => void;
}

export function AIReviewBanner({
  transcriptId,
  pendingCount,
  autoAppliedCount,
  onDismiss,
}: AIReviewBannerProps) {
  if (pendingCount === 0 && autoAppliedCount === 0) return null;

  return (
    <div className="ai-review-banner" role="status" aria-live="polite">
      <span className="ai-icon">✦</span>
      {autoAppliedCount > 0 && (
        <span>
          {autoAppliedCount} correction{autoAppliedCount !== 1 ? 's' : ''} applied automatically.
        </span>
      )}
      {pendingCount > 0 && (
        <span className="pending-link">
          {pendingCount} suggestion{pendingCount !== 1 ? 's' : ''} need your review.
        </span>
      )}
      <button onClick={onDismiss} aria-label="Dismiss AI review banner">
        ✕
      </button>
    </div>
  );
}
```

CSS (add to workspace.css):
```css
.ai-review-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--color-ai-banner-bg, #EFF6FF);
  border-bottom: 1px solid var(--color-ai-banner-border, #BFDBFE);
  font-size: 13px;
  color: var(--color-ai-banner-text, #1E40AF);
}

/* AI suggestion overlay — light blue underline */
.ai-suggestion-pending {
  text-decoration: underline;
  text-decoration-color: #3B82F6;
  text-decoration-style: dotted;
  cursor: pointer;
}
```

---

## STEP 6 — ACCEPT / REJECT API ENDPOINT

Add to supabase/functions/editor-api/index.ts:

```
PATCH /transcripts/:transcript_id/ai-suggestions/:word_id
Body: { action: 'accept' | 'reject' }

accept:
  - Set working_text = ai_suggestion
  - Set ai_suggestion_status = 'accepted'
  - Log to change_log: { type: 'ai_suggestion_accepted', word_id, suggestion }

reject:
  - Set ai_suggestion_status = 'rejected'  
  - ai_suggestion stays in DB for audit trail
  - Log to change_log: { type: 'ai_suggestion_rejected', word_id }
```

---

## STEP 7 — TRIGGER AI REVIEW AFTER TRANSCRIPTION

In the existing transcription completion handler (wherever job status is set
to CERTIFIED or TRANSCRIPTION_COMPLETE), add:

```typescript
// After transcription pipeline completes successfully
await supabase.functions.invoke('ai-review', {
  body: { transcript_id: result.transcriptId },
});
```

This fires the Edge Function asynchronously. The workspace can open before
it completes — the AIReviewBanner will show when suggestions arrive.

---

## VERIFICATION CHECKLIST

Run ALL of the following before committing:

1. [ ] `npx supabase db push` — migration applies cleanly, no errors
2. [ ] `npm run build` — TypeScript compiles, 0 errors
3. [ ] `npm run test` — all existing tests pass
4. [ ] New tests written for:
     - aiSuggestionEngine: mock Anthropic response, verify normalization
     - resolveWordDisplay: all three layer priority cases
     - ai-review Edge Function: skip-if-already-reviewed gate
     - accept/reject endpoint: working_text update + change_log entry
5. [ ] raw_text column untouched in all migrations and code paths
6. [ ] No browser-side Anthropic API calls (key stays server-side only)
7. [ ] AIReviewBanner does not render when pending_count = 0
8. [ ] Auto-applied corrections have no visual marker in the workspace

---

## COMMIT MESSAGES (one per step)

Step 1: feat(schema): add ai_suggestion overlay columns + ai_review_meta
Step 2: feat(ai): aiSuggestionEngine — Anthropic suggestion engine with verbatim guards
Step 3: feat(edge): ai-review Edge Function with version gating
Step 4: feat(workspace): resolveWordDisplay three-layer priority + ai-suggestion CSS class
Step 5: feat(ui): AIReviewBanner component
Step 6: feat(api): accept/reject endpoints for AI suggestions
Step 7: feat(pipeline): trigger ai-review Edge Function on transcription completion
