# Manual Steps — Depo-Pro Infrastructure

Steps that require live credentials and cannot be run autonomously.

---

## Migration Remote Sync (requires DB password)

Run these commands after providing your Supabase database password:

```bash
supabase link --project-ref ildhcfspbmhuemzgvzyx
supabase migration list
# If remote has old short-format versions, repair each:
# supabase migration repair --status reverted <old_version>
# supabase migration repair --status applied <new_14digit_version>
supabase db push --dry-run
```

---

## GitHub Secrets Setup (requires real credentials)

After running `npx tsx scripts/create-test-users.ts`, set these:

```bash
gh secret set DIRECT_URL --repo jameshorton2486/depo-pro
# Paste your Supabase direct connection string (port 5432)

gh secret set TEST_USER_A --body "<UUID_FROM_SCRIPT>" --repo jameshorton2486/depo-pro
gh secret set TEST_USER_B --body "<UUID_FROM_SCRIPT>" --repo jameshorton2486/depo-pro
```

---

## Vercel Production Secrets (verify these exist)

The following env vars must be set in Vercel production or cron/internal routes
will accept unauthenticated requests:

```bash
# Verify via: vercel env ls --environment=production | grep -E "CRON|INTERNAL"
CRON_SECRET           # Required by api/cron/cleanup and api/cron/process-jobs
INTERNAL_API_SECRET   # Required by api/jobs/[id]/transcribe/process-chunk
```

If missing, add them:
```bash
vercel env add CRON_SECRET production
vercel env add INTERNAL_API_SECRET production
```

---

## Go/No-Go Checklist

Run the automated validation before inviting beta testers:

```bash
bash go-no-go-checklist.sh
```

Then complete `go-no-go-manual-checklist.md` top to bottom (sign off each section).
