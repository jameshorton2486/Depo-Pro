# Phase 0 — Prerequisites (Do Before Any Code Prompts)

Complete these steps **in order** before running Prompt 1A (Core Types & Enums) or any later phase.

---

## 1. Deploy v1.3 schema

- Open **Supabase Dashboard → SQL Editor**.
- Paste the full contents of **depo-pro-schema-v1.3.sql** (the single consolidated schema file).
- Execute the script.
- **Warning:** This replaces the old Prisma-era schema. Back up any data you need before running.

---

## 2. Create storage buckets

In **Supabase Dashboard → Storage**, create:

| Bucket        | Max size | Allowed MIME / notes        |
|---------------|----------|-----------------------------|
| `depo-audio`  | 2 GB     | audio/*, video/*            |
| `depo-exports`| 50 MB    | application/pdf, etc.       |
| `depo-chunks` | 100 MB   | service role only (private) |

---

## 3. Enable pg_cron and schedule cleanup

In **Supabase SQL Editor** run:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'cleanup-locks',
  '*/5 * * * *',
  'SELECT cleanup_expired_locks()'
);
```

---

## 4. Generate TypeScript types

From the project root (use your real project ref):

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase-generated.ts
```

(Or merge into `types/database.ts` if that’s your pattern.)

---

## 5. Install dependencies

```bash
npm install docx fluent-ffmpeg @ffmpeg-installer/ffmpeg zod
npm install -D @types/fluent-ffmpeg vitest
```

---

## 6. Verify environment variables

In `.env.local` (or your env source) confirm:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEEPGRAM_API_KEY`
- Auth/session secret (e.g. NextAuth or Supabase auth secret) if used

---

## Checklist

- [ ] v1.3 schema executed in Supabase SQL Editor
- [ ] Buckets `depo-audio`, `depo-exports`, `depo-chunks` created
- [ ] pg_cron enabled and `cleanup-locks` job scheduled
- [ ] TypeScript types generated and saved
- [ ] New npm dependencies installed
- [ ] Env vars verified

When all are done, you can proceed to **Prompt 1A (Core Types & Enums)** and then the rest of the implementation plan.
