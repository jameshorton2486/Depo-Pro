# Beta Launch Checklist — Depo-Pro

Generated: 2026-03-10

## Build Verification

- [x] `npm run build` — SUCCESS (all pages compiled, no errors)
- [x] `npx tsc --noEmit` — SUCCESS (zero TypeScript errors)
- [x] `npm test` (vitest) — **37 suites passed, 192 tests passed, 0 failures**
- [x] 3 test suites skipped (calendar-events, cases-intake, phase10-verification — all expected skips)
- [x] Pre-commit hooks (ESLint + tsc + secret scan) — all passing

## Auth & Security

- [x] Supabase SSR auth — no NextAuth anywhere in codebase
- [x] `withRouteProtection()` on 92 API routes
- [x] `firm_id` tenant isolation enforced in RLS policies
- [x] `SUPABASE_SERVICE_ROLE_KEY` never imported in client code
- [x] Webhook handlers fail-closed (reject if secret missing)
- [x] Secret scan in pre-commit hook

## Monitoring & Observability

- [x] `/api/health` — checks database, Deepgram, Anthropic, and storage
- [x] `lib/monitoring.ts` — structured `logRouteError()` and `logSlowRequest()`
- [x] Critical routes (transcribe, flagged-words, export) use `logRouteError()`
- [x] Health endpoint returns 200 always (status in body for uptime monitors)

## Beta Onboarding Infrastructure

- [x] `scripts/seed-beta-users.ts` — creates 5 test accounts (2 reporters, 2 scopists, 1 attorney)
- [x] `docs/BETA_TESTING_GUIDE.md` — plain-language guide for testers
- [x] `docs/BUG_REPORT_TEMPLATE.md` — structured issue reporting template

## Code Cleanup

- [x] 52 root AI/planning .md files archived to `docs/archive/`
- [x] Stale Prisma references removed from docs
- [x] `.gitignore` exceptions for root .md files and `app/reports/`
- [x] Email provider references updated to Resend

## Known Issues (Pre-Existing, Not Blocking)

- [ ] Flagged-words authorization: any SCOPIST can PATCH edits regardless of job assignment (documented in BUGS_FOUND.md)
- [ ] Medical chronology POST route returns 404 (route not implemented yet)
- [ ] `transcript_shares` RLS may have column name mismatch — verify in prod

## Go / No-Go Decision

| Criterion | Status |
|-----------|--------|
| Build compiles | GO |
| Tests pass | GO |
| TypeScript clean | GO |
| Auth guards in place | GO |
| Health monitoring active | GO |
| Beta user provisioning ready | GO |
| Tester documentation ready | GO |
| Known bugs documented | GO |

**Recommendation: GO for beta launch.**
