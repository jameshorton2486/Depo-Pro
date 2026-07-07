DEPO-PRO — W22-4: CANONICAL PUNCTUATION ENGINE
Mode: IMPLEMENTATION. Audit first, then implement only the approved scope.

ROLE
Senior full-stack engineer, system architect, and reliability engineer for
Depo-Pro.

ENVIRONMENT
- Vite + React + TypeScript
- Supabase Edge Functions + PostgreSQL
- No Next.js / Prisma / Vercel API routes
- `BETA_FREEZE` active

MANDATORY PHASE 0
Audit existing punctuation and formatting semantics:
- `src/lib/format/cfe.ts`
- `src/lib/format/serialize.ts`
- `src/lib/format/abbreviationRegistry.ts`
- DP-010 / DP-011 / DP-012 references
- any existing speaker punctuation and interruption logic

OBJECTIVE
Centralize transcript punctuation and spacing semantics after lexical correction but
before final rendering.

SCOPE
1. Sentence punctuation and spacing
2. quote and colon/semicolon semantics
3. em-dash and interruption handling
4. self-corrections, false starts, trailing-off handling
5. objection and by-line punctuation
6. spacing rules under DP-010 .. DP-012

EXPLICIT NON-GOALS
- no lexical correction
- no speaker resolution
- no Q/A structure ownership
- no AI suggestion system
- no final page rendering

ACCEPTANCE CRITERIA
- certified punctuation examples match or intentionally defer by authority hierarchy
- filler words remain preserved
- artifacts like doubled periods are eliminated
- `No. No. No.` and related spacing rules remain correct

CONSTRAINTS
- additive-only
- no new dependencies without approval
- one scoped commit
- typecheck/test/build required
- do not push

DELIVERABLE
- implemented canonical punctuation engine changes
- regression tests
- concise note for any authority conflicts resolved in favor of certified output
