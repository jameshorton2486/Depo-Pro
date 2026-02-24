# Beta Gate Smoke Test — Depo-Pro

End-to-end checklist that must pass before opening beta to external testers.
Run manually on the production Vercel deployment (not localhost).

**Required access:** Admin account + one Scopist test account + one test audio file (~5 min deposition).

---

## 1. Authentication

- [ ] Sign up with a new email → receives confirmation email → confirms → lands on dashboard
- [ ] Sign in with existing account → lands on dashboard
- [ ] Sign out → redirected to `/auth/login`
- [ ] Unauthenticated request to `/api/jobs` → 401
- [ ] Unauthenticated request to `/api/transcripts/[id]/export` → 401

---

## 2. Job Creation & Upload

- [ ] Create new job (title, case number, deposition date)
- [ ] Upload test audio file → upload completes without error
- [ ] File appears in Supabase Storage bucket `depo-audio`
- [ ] Job status transitions: `PENDING` → `PROCESSING`

---

## 3. Transcription

- [ ] Transcription job completes (Deepgram webhook received)
- [ ] Job status transitions: `PROCESSING` → `TRANSCRIBED`
- [ ] `flagged_words` rows created for words with confidence < 0.85
- [ ] Review page loads without error for this job

---

## 4. Review — Flagged Word Actions

- [ ] Navigate to review page → `<ConnectionStatus>` shows no banner (online)
- [ ] First flagged word is highlighted in transcript viewer
- [ ] **Correct** a word → optimistic UI update → no error toast
- [ ] **Confirm** a word → moves to next flagged word
- [ ] **Skip** a word → moves to next flagged word
- [ ] Progress bar / stats update after each action
- [ ] Disconnect network → red "Connection lost" banner appears
- [ ] Reconnect network → green "Connection restored" banner appears for ~2 s

---

## 5. Conflict Detection

- [ ] Open same job in two browser tabs as the same user
- [ ] Make a correction in Tab 1
- [ ] Make a correction in Tab 2 → receives 409 conflict message
- [ ] Review page shows "Refresh to see changes" notification

---

## 6. Review Submit

- [ ] With pending flagged words remaining → Submit button blocked (409 PENDING_WORDS)
- [ ] Resolve all flagged words → Submit button succeeds
- [ ] Job status transitions to `SCOPIST_COMPLETE`
- [ ] Transcription lock released

---

## 7. Export

- [ ] Export as DOCX → file downloads with correct filename
- [ ] Open DOCX → line numbering present, legal header/footer present
- [ ] Corrections applied in export (corrected word appears, not original)
- [ ] Export as TXT → downloads plain text
- [ ] Export as PDF → downloads valid PDF (if role permits)
- [ ] Export quota exceeded response returns 429 with meaningful message

---

## 8. Tenant Isolation

- [ ] User A cannot access User B's jobs via `/api/jobs/[id]` (expect 403 or 404)
- [ ] User A cannot export User B's transcript → 403
- [ ] Admin can access jobs across firms

---

## 9. Audit Trail

- [ ] After export: `audit_events` table has a row with `action = 'TRANSCRIPT_EXPORTED'`
- [ ] After correction: `transcription_edits` has a row with `edit_type = 'WORD_CORRECTION'`
- [ ] After review submit: `audit_events` (if wired) or job status change is timestamped

---

## 10. Error Handling

- [ ] Navigate to `/api/jobs/nonexistent-id` → 404 JSON response
- [ ] POST `/api/jobs/[id]/review` with missing `wordId` → 400 with message
- [ ] Simulate 500 in review route → `captureError` fires (visible in Vercel logs as structured JSON)
- [ ] Client-side ErrorBoundary: manually throw in `SyncedTranscriptViewer` → fallback UI renders, error reported to `/api/client-errors`

---

## 11. Rate Limiting

- [ ] Hit `PATCH /api/jobs/[id]/review` 61 times in 60 s → 429 response on 61st

---

## Sign-Off

| Tester | Date | Env | Result |
|---|---|---|---|
| | | Production | Pass / Fail |

All items must be checked before beta opens. Document any failures as GitHub issues
before proceeding.
