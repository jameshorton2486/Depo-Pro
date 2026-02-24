# MVP Phase 1 — Deepgram Pipeline End-to-End ✓

**Completed:** 2026-02-23
**Branch:** main
**Build:** ✅ Passes (0 TypeScript errors, 0 ESLint warnings)

---

## Summary

MVP Phase 1 wires together the existing Deepgram transcription pipeline so that the complete
upload → transcribe → review flow works end-to-end without Redis/BullMQ.

No new dependencies were added. No DB schema was changed. No working components were rewritten.

---

## Workstreams

### WS1 — Import Consolidation ✅ (no changes needed)

`lib/transcription/deepgram.ts` was already deleted in a prior sprint.
Both `pipeline.ts` and `scheduler.ts` import correctly from `@/lib/transcription`.
TypeCheck: 0 errors.

### WS2 — Direct Processing Fallback ✅

**Problem:** `/api/transcribe/start` returned HTTP 503 when Redis/BullMQ was unavailable.
The upload page never triggered transcription after file upload.

**Fix (`6cb90c3`):**
- `app/api/transcribe/start/route.ts` — queue-first with `processTranscriptionJob()` fire-and-forget fallback
- `app/transcription/upload/page.tsx` — `handleUploadComplete` now triggers `POST /api/jobs/:id/transcribe`

### WS3 — Audio URL Data Flow ✅

**Problem:** Three-way breakage:
1. `lib/supabase/queries/files.ts` is a stub — `createFile()` never writes to DB
2. `/api/jobs/[id]/files` returned HTTP 201 but the upload XHR checked for 200
3. Review page queried `job_files` (always empty) and crashed with `no_audio` redirect
4. `/api/jobs/[id]/transcribe` called `listFilesForJob()` (stub) and returned 400

**Fix (`8d04d2d`):**
- `app/api/jobs/[id]/files/route.ts` — persists `storage_path` to `jobs.audio_file_url` after audio upload; returns 200
- `app/(dashboard)/jobs/[id]/review/page.tsx` — falls back to `job.audio_file_url`; generates fresh public URL via `getFileUrl(extractStoragePath(...), 'depo-audio')`
- `app/api/jobs/[id]/transcribe/route.ts` — falls back to `job.audio_file_url` in all audio URL references

### WS4 — Flagged Words Pipeline Verification ✅ (no changes needed)

Full pipeline trace confirmed:

| Stage | Location | Status |
|-------|----------|--------|
| Extract flagged words | `pipeline.ts:564` `extractFlaggedWords()` | ✅ Calls RPC, fallback to manual insert |
| Write to DB | `pipeline.ts:650` `flagged_words.insert()` | ✅ `status: PENDING`, with context, speaker, timing |
| Review page reads | `review/page.tsx:230-234` | ✅ Queries `flagged_words` with `transcription_id` filter |
| Client saves correction | `PATCH /api/jobs/:id/flagged-words` | ✅ Zod-validated, optimistic lock (409), job lock (423), upserts `transcription_edits` |
| Analytics reads back | `pipeline.ts:743` | ✅ Reads `flagged_words` for confidence analytics |
| No circular imports | `madge --circular pipeline.ts` | ✅ Clean |
| Unit tests | `tests/integration/flagged-words.test.ts` | ✅ 5 tests covering GET/PATCH/auth/conflict |

### WS5 — Integration Smoke Test ✅

`scripts/test-transcription-pipeline.ts` — 9-step DB data flow test:

```
npx tsx scripts/test-transcription-pipeline.ts
```

Steps:
1. Env vars + Supabase connectivity
2. Create test firm + user (auto-cleaned)
3. Create test job
4. Verify `audio_file_url` persisted
5. Create transcription with 10 synthetic words (3 below 0.85 confidence)
6. Extract flagged words (RPC → manual fallback)
7. Verify `flagged_words` readable with `transcription_id` filter
8. Save correction to `transcription_edits`
9. Update job status

All test data is cleaned up at the end. No real Deepgram call required.

### WS6 — Build Validation ✅

```
npm run typecheck  →  0 errors
npm run lint       →  0 warnings
npm run build      →  ✓ Compiled successfully (103 pages, 29s)
```

---

## Data Flow Diagram (Post-Fix)

```
Upload Page (browser)
  │
  ├─ POST /api/jobs                          → creates jobs row
  │
  ├─ POST /api/jobs/:id/files                → uploads to depo-audio storage
  │    └─ UPDATE jobs SET audio_file_url     ← persists storage path (bypasses stub)
  │
  └─ POST /api/jobs/:id/transcribe
       └─ AudioEnhancementService.enhanceWithDolby()
            └─ processTranscriptionJob(jobId, audioUrl)   [fire-and-forget]
                 ├─ transcribeFromUrl(url)  → Deepgram Nova-3
                 ├─ transcriptions.insert() → words, utterances, content
                 ├─ extract_flagged_words RPC (or manual fallback)
                 │    └─ flagged_words.insert() [status: PENDING]
                 └─ calculateConfidenceAnalytics() → transcriptions.metadata

Review Page (server component)
  │
  ├─ transcriptions.select()   → segments → ReviewClientNew
  ├─ flagged_words.select()    → initialFlaggedWords → ReviewClientNew
  └─ getFileUrl(extractStoragePath(job.audio_file_url), 'depo-audio')  → audioUrl

Review Client (browser)
  │
  ├─ PATCH /api/jobs/:id/flagged-words  → transcription_edits.upsert()
  └─ POST  /api/transcripts/:id/corrections → transcriptions.content_json update
```

---

## Known Gaps (Post-Beta)

| Gap | Impact | Priority |
|-----|--------|----------|
| `flagged_words.status` never updated to `CORRECTED` | Stats show 0 corrected after refresh | Low — corrections are in `transcription_edits` |
| `lib/supabase/queries/files.ts` is a stub | `job_files` table always empty | Low — `jobs.audio_file_url` bypass works |
| No real Deepgram E2E test | Script tests DB layer only | Medium — add when Deepgram sandbox available |

---

## Commits

| SHA | Message |
|-----|---------|
| `6cb90c3` | feat: add direct transcription processing fallback (no Redis required) |
| `8d04d2d` | fix: generate fresh audio URLs for review page and wire audio path through data flow |
| `659160d` | fix: verify flagged words extraction and add pipeline integration test |
