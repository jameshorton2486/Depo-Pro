# Review Needed

## Stream B Scope Mismatches

1. The prompt references `app/api/transcriptions/[id]/flagged-words/[wordId]/route.ts` and `components/transcripts/FlaggedWordPanel.tsx`, but the active repo equivalents are:
   - `app/api/jobs/[id]/review/route.ts`
   - `app/api/jobs/[id]/flagged-words/route.ts`
   - `components/transcripts/low-confidence-panel.tsx`

2. The prompt requires optimistic locking on `flagged_words.updated_at`, but the generated Supabase types show no `updated_at` column on `flagged_words`.
   - Existing available timestamp: `transcriptions.updated_at`
   - Beta-safe approach implemented: preserve transcript-level optimistic locking and improve the client-side 409 recovery path
   - Blocked approach: word-level `clientUpdatedAt` against `flagged_words.updated_at` would require a schema change, which is out of scope
