# Secret Rotation Runbook

Last updated: February 25, 2026

## Why this runbook exists

A literal database credential was previously present in `scripts/apply-migration.md`.  
The file has been remediated, but any exposed credential must be treated as compromised and rotated.

## Immediate rotation order (same day)

1. Rotate Supabase database password (pooled and direct URLs).
2. Regenerate Supabase service role key.
3. Rotate any shared test user passwords used in automation.
4. Reissue CI/hosting environment variables.

## Systems to update after rotation

- Vercel project env vars
- GitHub Actions secrets
- Local `.env.local` for active developers
- Any deployment scripts that depend on `DATABASE_URL` / `DIRECT_URL`

## Verification checklist

- [ ] `npm run security:scan` passes
- [ ] `npm run check:env` passes
- [ ] `npm run check` passes
- [ ] `npm run test` passes
- [ ] CI `CI` workflow is green on latest commit
- [ ] CI `Quality Gates` workflow is green on latest commit
- [ ] Auth and DB connectivity smoke tests pass in staging

## Guardrails now enforced

- Pre-commit hook runs `npm run security:scan:staged`
- CI runs `npm run security:scan`
- Hardcoded credentials should be replaced with environment variables or placeholders
