# Cursor AI Implementation Guardrails

## Critical Rules for AI-Assisted Development

When executing approved engineering plans or making changes to this codebase, follow these rules strictly:

### 🚫 DO NOT

- **Refactor unrelated code** - Only modify files explicitly listed in the task
- **Rename enums, models, or database fields** - These are stable and should not change
- **Add new features** - Stick to the specified scope
- **Introduce Prisma or ORM dependencies** - ❌ Prisma is deprecated. Do not introduce Prisma or ORM dependencies. Use Supabase directly.
- **Introduce new dependencies** - Use existing dependencies only
- **Modify logic outside explicitly listed files** - Stay within scope
- **Call `dotenv.config()`** - Next.js handles env loading automatically
- **Refactor `requireRoleApi()` to throw** - It intentionally returns NextResponse
- **Over-optimize or "improve" working code** - If it works, leave it alone

### ✅ ALLOWED Actions

- Modify files explicitly listed in each step
- Add new files exactly as specified
- Update imports when required
- Fix TypeScript errors caused directly by these changes
- Add clarifying comments (as documented)

### 🛑 STOP and Report

If you encounter:
- An unrelated lint error
- A pre-existing type issue
- A tempting refactor opportunity
- A "better way" to do something

**STOP and report it instead of fixing it.**

### 🎯 Goal

**Correctness and stability, not cleverness.**

The codebase is in a stabilized state. Changes should be:
- Minimal
- Focused
- Well-documented
- Backward compatible

### 📝 Implementation Order

When following a plan:
1. Follow the provided implementation order exactly
2. Test after each major change (`npm run typecheck && npm run build`)
3. Commit incrementally with clear messages
4. Do not skip steps or reorder work

### 🔍 Key Files with Special Notes

- **`lib/env.ts`** - Do NOT call `dotenv.config()`. Next.js loads env automatically.
- **`lib/auth.ts`** - `requireRoleApi()` intentionally returns NextResponse, not throws.
- **`lib/transcript-lock.ts`** - API-level enforcement is correct for current phase.

---

**Remember:** You are executing an approved plan. Your job is to implement it correctly, not to improve it.

### AI Safety Hardening

- **No repo-wide refactors:** Stay within the explicitly listed files.
- **No “cleanup” passes:** Do not fix unrelated style or structure issues.
- **No speculative fixes:** Only address issues directly related to the current task.

