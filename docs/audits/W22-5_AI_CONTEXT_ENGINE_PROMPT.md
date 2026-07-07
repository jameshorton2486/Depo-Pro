DEPO-PRO — W22-5: AI CONTEXT ENGINE AND VALIDATION OVERLAY
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
Audit the current AI suggestion and validation surface:
- `supabase/functions/ai-review/index.ts`
- `src/lib/transcript/aiSuggestionEngine.ts`
- `src/lib/transcript/aiReview.ts`
- `src/lib/transcript/correctionValidator.ts`
- suggestion/review UI consumers

OBJECTIVE
Limit AI to true ambiguity and ensure every AI output is suggestion-only, validated,
auditable, and reversible.

SCOPE
1. ambiguous lexical cases only
2. contextual place/entity ambiguity
3. low-confidence speaker tie-break support where deterministic ownership ends
4. validated AI overlay outputs with provenance
5. rejection of AI outputs that violate:
   - certified transcript authority
   - locked Depo-Pro decisions
   - canonical invariants

EXPLICIT NON-GOALS
- no deterministic correction already owned by W22-3
- no punctuation ownership
- no canonical word mutation
- no hidden or auto-finalized AI rewrites

ACCEPTANCE CRITERIA
- real-word ambiguities become reviewable suggestions, not silent rewrites
- common legal vocabulary does not reappear as noisy review output
- all AI suggestions remain reversible and source-linked

CONSTRAINTS
- additive-only
- no schema changes without approval
- one scoped commit
- typecheck/test/build required
- do not push

DELIVERABLE
- implemented AI ambiguity-only layer
- validation tests
- concise note on the deterministic/AI boundary
