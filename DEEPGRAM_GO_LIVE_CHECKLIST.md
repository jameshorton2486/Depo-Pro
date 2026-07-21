# Depo-Pro — Deepgram Go-Live Checklist

**Code status:** complete. `diarize_model=latest` enables the current batch diarizer, `mip_opt_out=true` shipped,
keyterms on the live request, both Edge Functions wired. Everything below is
**configuration**, not code. Work top to bottom; the smoke test at the end is the
proof.

---

## PART 1 — One-time configuration

### 1.1 Deepgram secret (the one secret you set by hand)
The Edge Functions read several env vars, but Supabase **auto-injects**
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` into deployed
functions — you cannot and need not set those. The only one you set manually:

```sh
supabase secrets set DEEPGRAM_API_KEY=<your-deepgram-key>
supabase secrets list      # confirm DEEPGRAM_API_KEY is present
```

Without it, `transcribe-start` returns **500 "server misconfigured."**

### 1.2 Deploy both Edge Functions — and the callback MUST skip JWT
`transcribe-start` is called by your authenticated browser, so it keeps JWT
verification ON. `transcribe-callback` is called by **Deepgram**, which has no
Supabase session — it authenticates via its `?token=` param. If the callback is
deployed with default JWT verification, Deepgram's POST is rejected **401 at the
gateway before your code runs**, and the job hangs in `processing` forever.

```sh
supabase functions deploy transcribe-start
supabase functions deploy transcribe-callback --no-verify-jwt
```

Or commit `supabase/config.toml` (none exists today) and deploy normally:

```toml
[functions.transcribe-callback]
verify_jwt = false
```

Verify after deploy:

```sh
supabase functions list    # both present, callback shows verify_jwt = false
```

> Watch-item: the functions import from `../../../src/lib/...`. If a deploy fails
> on import resolution, that's the cause — the CLI must bundle those out-of-dir
> files. (They've deployed before, so this should hold; flagging in case.)

### 1.3 Frontend env — leave mock mode
In `.env.local` (and your Vercel env for deployed previews):

```sh
VITE_SUPABASE_URL=<your real project url>
VITE_SUPABASE_ANON_KEY=<your real anon key>
VITE_USE_REAL_API=1
```

`isMockMode()` is `DEV && VITE_USE_REAL_API !== "1"`. Setting it to `1` flips
`startTranscription` onto the real `transcribe-start` call **and** stops MSW from
starting (those mock "Failed to fetch" console errors disappear). **Restart Vite**
after changing — env is read at boot.

### 1.4 Schema / storage (verify once; already provisioned by migrations)
- `transcription_jobs` table (status enum, active-job unique index, owner RLS).
- `transcript_words` + `raw_text` immutability trigger; speakers/utterances/audit.
- `case-files` storage bucket + owner-scoped policies.

These exist in `supabase/migrations/`; just confirm they're applied to the live
project (`supabase db diff` / dashboard).

---

## PART 2 — Per-run preconditions (every transcript)

- **Logged-in user.** `transcribe-start` requires an Authorization header and
  resolves `owner_user_id` from Supabase auth; no session → 401.
- **A saved case** in `cases.payload` (the function loads + normalizes it).
- **Storage-backed audio** attached to that case. If `case_audio.storage_path`
  is null, the function hard-fails with *"case audio must be storage-backed
  before transcription"* (400). Intake's durable upload handles this — confirm
  the file shows as uploaded, not just selected.

---

## PART 3 — The smoke test (the proof)

1. Real mode on, Vite restarted, logged in.
2. Use a **short clip, ~30–60 seconds** (cheap, fast).
3. Upload it to a case, confirm it's storage-backed.
4. Press **Generate Transcript** (Stage 2).
5. Watch the job, then verify in the DB:

```sql
select status from transcription_jobs order by created_at desc limit 1;
select count(*) from transcript_words where transcript_id = '<the transcript_id>';
```

**GO / success =** job flips to `complete`, `transcript_words` count > 0, and the
editor opens the transcript with word-level audio sync.

---

## PART 4 — If it fails, read the symptom

| Symptom | Most likely cause | Fix |
|---|---|---|
| `transcribe-start` returns **401** | Not authenticated (no session) | Log in; confirm the case is owned by that user |
| `transcribe-start` returns **400** | Audio not storage-backed | Re-upload; confirm `case_audio.storage_path` is set |
| `transcribe-start` returns **500** | Missing `DEEPGRAM_API_KEY` (or anon key) on the function | `supabase secrets set DEEPGRAM_API_KEY=...`, redeploy |
| Deepgram accepts, but job **stuck in `processing`** forever | Callback never reached — `verify_jwt` still on, or callback not deployed | Redeploy callback `--no-verify-jwt`; confirm `supabase functions list` |
| Job → **`failed`** with a Deepgram error string | Deepgram rejected the request | Read the `error` column on the job + the request artifact JSON in `case-files` |
| Job → **`complete`**, words present | Success | You're live |

---

## What is NOT required for this to work (don't get distracted)
- `numerals=true` — intentionally deferred pending gold-set validation.
- A standalone `keyterms.json` artifact — doesn't exist and isn't needed;
  keyterms already go on the request from `record.deepgram.keyterms`.
- The three intake UI fixes (remote-required logic, enum display, extraction
  mapping) — separate cosmetic/parser workstream; none block transcription.
- The MSW errors — vanish the moment `VITE_USE_REAL_API=1` (mock-mode only).
