# DEPO-PRO GO / NO-GO — MANUAL VERIFICATION CHECKLIST

**Date:** _______________  
**Verified by:** _______________

> Run `bash go-no-go-checklist.sh` first. This document covers the checks that require human verification.

---

## A. SUPABASE RLS VERIFICATION

Run this SQL in Supabase SQL Editor. Every row must show `rowsecurity = true`:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

| Table | RLS On? |
|---|---|
| jobs | ☐ |
| transcriptions | ☐ |
| flagged_words | ☐ |
| profiles | ☐ |
| assignments | ☐ |
| transcription_edits | ☐ |
| transcription_locks | ☐ |
| transcription_corrections | ☐ |
| calendar_events | ☐ |
| medical_records | ☐ |
| chronology_entries | ☐ |

Firm isolation helper exists:

```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'user_belongs_to_firm';
```

☐ Returns 1 row

---

## B. STORAGE BUCKET PRIVACY

| Bucket | Expected | Verify |
|---|---|---|
| depo-audio | Public (UUID paths only) | ☐ Paths are `{firm_id}/{job_id}/{file}` not sequential |
| depo-files | Private | ☐ Incognito URL returns 400/404 |
| depo-exports | Private | ☐ Incognito URL returns 400/404 |
| depo-chunks | Private | ☐ Incognito URL returns 400/404 |

**How to test:** Upload a file through the app → copy the storage path → attempt `https://<project>.supabase.co/storage/v1/object/public/depo-files/<path>` in incognito → must fail.

---

## C. BROWSER SECURITY CHECKS

Open `app.depo-pro.com` in Chrome DevTools:

☐ **Sources tab:** Cmd+F for `service_role` across all JS files → 0 results  
☐ **Console tab:** Filter "Errors" → perform login → dashboard → job list → logout → 0 errors  
☐ **Console tab:** Filter "Warnings" → check for hydration warnings → 0 warnings  

---

## D. MIDDLEWARE ROUTE PROTECTION

| Test | Expected | Pass? |
|---|---|---|
| `curl -s -o /dev/null -w "%{http_code}" https://app.depo-pro.com/api/health` | 200 | ☐ |
| `curl -s -o /dev/null -w "%{http_code}" https://app.depo-pro.com/api/jobs` | 401 | ☐ |
| Visit `/dashboard` in incognito | Redirects to `/auth/login` | ☐ |

---

## E. MULTI-TENANT ISOLATION

**Setup:** Two users from different firms logged in to separate browser profiles.

| # | Test | Expected | Pass? |
|---|---|---|---|
| E1 | User B visits `/jobs/<User-A-job-id>` | 404 or redirect | ☐ |
| E2 | User B visits `/transcripts/<User-A-id>/review` | 404 or redirect | ☐ |
| E3 | User B calls `GET /api/jobs/<User-A-job-id>` in console | 404 response | ☐ |
| E4 | User B calls `POST /api/transcripts/<A-id>/export` | 401 or 404 | ☐ |
| E5 | User B calls `GET /api/jobs` — check all returned firmIds | Only Firm B's | ☐ |

---

## F. 10x END-TO-END SMOKE TEST

Complete this workflow **10 consecutive times** on production. All 10 must succeed.

| Run | Upload | Transcribe | Review | Edit+Save | Refresh OK | Export DOCX | Export PDF | Notes |
|-----|--------|------------|--------|-----------|------------|-------------|------------|-------|
| 1 | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 2 | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 3 | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 4 | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 5 | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 6 | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 7 | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 8 | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 9 | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| 10 | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |

**Per-step verification:**

- **Upload:** File appears in Supabase Storage, job row created with status PENDING
- **Transcribe:** Status transitions PENDING → IN_PROGRESS → TRANSCRIBED, flagged words populated
- **Review:** Flagged words visible, audio syncs to word timestamps (±0.5s)
- **Edit+Save:** Resolve 2-3 words (Confirm, Correct, Skip), stats update in real-time
- **Refresh OK:** Hard refresh (Ctrl+Shift+R) — all corrections still present
- **Export DOCX:** Opens in Word without corruption, corrections reflected, legal line numbering present
- **Export PDF:** Opens in viewer, text selectable, content matches DOCX

**Failure indicators:**
- Flagged word count ≠ actual pending words after refresh → state corruption
- Export contains original words instead of corrections → write bug
- Audio doesn't seek to word position → timestamp mapping broken
- 409 CONFLICT on save → optimistic locking false positive

---

## G. OPERATIONAL READINESS

☐ Supabase database backup taken today  
☐ GitHub branch protection enabled (require PR, disable force-push)  
☐ Last known-good Vercel deployment identified (deployment ID: _______________)  
☐ Vercel Function logs reviewed — no silent 500s in last 24h  
☐ Feedback collection channel ready (email or Google Form)  
☐ Available to respond within 4 hours during beta week 1  

---

## H. FINAL VERDICT

| Category | Status |
|---|---|
| Automated checks (script) | ☐ All passed |
| RLS verification (Section A) | ☐ All tables confirmed |
| Storage privacy (Section B) | ☐ All private buckets confirmed |
| Browser security (Section C) | ☐ No leaks |
| Middleware (Section D) | ☐ All correct |
| Multi-tenant (Section E) | ☐ All 5 tests passed |
| 10x Smoke test (Section F) | ☐ 10/10 completed |
| Operational (Section G) | ☐ All confirmed |

**Decision:**

☐ **GO** — All checks passed. Invite Day 1 testers.  
☐ **NO-GO** — Failures in: _______________ . Fix before re-running.

**Signed:** _______________ **Date:** _______________
