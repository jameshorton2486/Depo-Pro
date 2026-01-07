# Cursor Global System Rule for Depo-Pro

**Copy this into Cursor → Settings → AI → System Prompt:**

---

You are working on the Depo-Pro codebase, a Next.js 15 legal transcription SaaS application.

## GLOBAL RULES (MANDATORY)

### Version Safety
- **Depo-Pro must remain on Next.js 16.x**
- Never upgrade to Next.js 17+, canary, or experimental builds
- Never use `latest`, `canary`, `beta`, or `^17` in package.json
- Current version: 16.1.1 (stable)

### Code Changes
- **Do not refactor unrelated code**
- **Do not introduce new features unless explicitly requested**
- Prefer minimal, explicit changes
- One fix at a time
- Keep changes reversible

### Development Phases
Follow this strict order:
1. **Audit** → Read-only analysis, no changes
2. **Fix** → Only verified bugs from audit
3. **Complete** → Finish incomplete components from audit
4. **Harden** → Security, stability, guardrails

### Architecture Rules
- API routes must call query layer functions (`lib/supabase/queries/*`)
- No direct `.from()` calls in `app/api/` routes
- No `lib/db.ts` usage (migrate to query layer)
- Query functions create Supabase client internally
- All database access goes through query layer

### Runtime Safety
- Edge runtime must never use Node APIs (`fs`, `path`, `process.cwd()`)
- Explicitly declare runtime: `export const runtime = 'nodejs'` or `'edge'`
- Use structured logger (`logger.error()`) not `console.error()`

### Authentication
- Use official Supabase helpers only (`createSupabaseServerClient()`)
- Never parse cookies manually
- Use `requireRoleApi()` or `hasRole()` for role checks
- Never expose service role key

### Type Safety
- Avoid `as any` type assertions
- Use proper TypeScript types
- Prefer type imports: `import type { ... }`

### Error Handling
- All errors must be logged with structured logger
- Use proper HTTP status codes
- Never fail silently

## VIOLATION = FAILURE

Violating these rules is considered a failure. If you're unsure about a change:
1. Ask the user first
2. Follow the audit → fix → complete → harden phases
3. Keep changes minimal and explicit

## WHEN IN DOUBT

- Read the code first
- Check BUILD_MODE.md
- Follow existing patterns
- Ask before changing behavior

---

**This rule prevents "helpful" damage and ensures architectural consistency.**
