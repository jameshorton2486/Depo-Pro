# Phase 5 — Beta Hardening

**Status:** ✅ READY — Next phase to execute

## Tasks

| # | Fix | File |
|---|---|---|
| 5.1 | Fix BUG-003: scopist PATCH authorization gap | `app/api/jobs/[id]/flagged-words/route.ts` |
| 5.2 | Fix transcript_shares column name mismatch | `lib/supabase/queries/shares.ts` |
| 5.3 | Add security tests proving BUG-003 fix | `tests/integration/flagged-words.test.ts` |
| 5.4 | Add audio pipeline edge case tests | `tests/integration/audio-pipeline-edge-cases.test.ts` (NEW) |
| 5.5 | Update beta testing guide for Phase 2 UI | `docs/BETA_TESTING_GUIDE.md` |
| 5.6 | Clean up .env.example placeholders | `.env.example` |
| 5.7 | Create Miah Bardot's account (manual — Supabase SQL) | Supabase dashboard |
| 5.8 | Final build verification | All — no file changes |

## How to Run

```powershell
cd C:\Users\james\depo-pro
claude --dangerously-skip-permissions
```

Then paste the Phase 5 mega-prompt content.

## Post-Flight

- All tests pass
- BUG-003 returns 403 for unauthorized SCOPIST PATCH
- Miah Bardot can log in at depo-pro.com
- `npm run build` succeeds
