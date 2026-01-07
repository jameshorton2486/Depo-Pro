# Depo-Pro Build Mode Checklist

## BEFORE BUILDING
- [ ] Next.js version pinned to 16.x (`npm run check:version` or `node scripts/check-next-version.js`)
- [ ] CI version guard passing (`.github/workflows/version-guard.yml`)
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] No TypeScript errors

## WHEN ADDING ROUTES
- [ ] Runtime declared (`export const runtime = 'edge'` or `'nodejs'`)
- [ ] Zod validation added for request bodies
- [ ] Auth check enforced (`getCurrentUser()` or `requireAuth()`)
- [ ] No Node APIs (`fs`, `path`, `process.cwd()`) in Edge runtime
- [ ] Structured logger used (`logger.error()` not `console.error()`)
- [ ] Error handling with proper HTTP status codes

## WHEN TOUCHING AUTH
- [ ] Use official Supabase helpers only (`createSupabaseServerClient()`)
- [ ] Never parse cookies manually
- [ ] RLS policies verified for new tables
- [ ] Role checks use `requireRoleApi()` or `hasRole()`
- [ ] No service role key in client-side code

## FOR CURSOR AI
- [ ] Audit before Fix
- [ ] Fix before Complete
- [ ] Complete before Harden
- [ ] No speculative refactors
- [ ] Minimal, explicit changes only
- [ ] One fix at a time

## BEFORE COMMIT
- [ ] No unused imports
- [ ] No TODOs left behind (or documented with issue numbers)
- [ ] Changes scoped and documented
- [ ] No `as any` type assertions (unless absolutely necessary)
- [ ] All error paths logged with structured logger

## VERSION SAFETY
- [ ] Never upgrade Next.js beyond 16.x
- [ ] Never use `latest`, `canary`, `beta`, or `^17` in package.json
- [ ] Current stable version: 16.1.1
- [ ] Version guard script passes locally
- [ ] CI version guard workflow enabled

## ARCHITECTURE RULES
- [ ] API routes call query layer functions (`lib/supabase/queries/*`)
- [ ] No direct `.from()` calls in `app/api/` routes
- [ ] No `lib/db.ts` usage (migrate to query layer)
- [ ] Query functions create Supabase client internally
- [ ] All database access goes through query layer

## TESTING CHECKLIST
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Auth flow works (login/logout)
- [ ] Critical routes tested manually

---

**Remember:** When in doubt, follow the phases: Audit → Fix → Complete → Harden
