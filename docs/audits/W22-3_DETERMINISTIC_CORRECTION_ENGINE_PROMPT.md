DEPO-PRO — W22-3: DETERMINISTIC CORRECTION ENGINE
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
Audit existing deterministic correction and keyterm systems before adding anything:
- `src/lib/transcript/correctionRegistry.ts`
- `src/lib/transcript/correctionEngines.ts`
- `src/lib/keyterms/*`
- `src/lib/keyterms/autoSeedKeyterms.ts`
- any existing deterministic phrase/garble/number normalization modules

OBJECTIVE
Apply every mechanical, deterministic, metadata-backed correction before AI and before
final punctuation ownership.

SCOPE
1. Dictionary-backed deterministic correction
   - legal dictionary
   - medical dictionary
   - case dictionary
   - confirmed spellings
   - attorney/reporter/witness name references

2. Metadata normalization in transcript text
   - apply already-resolved names and entities to transcript text where deterministic
   - examples include doctor/title normalization, party names, company names

3. Known ASR and garble repair
   - multiword deterministic corrections
   - phrase-level known errors
   - number normalization where policy allows

4. Scopist flag suppression for known legal/common vocabulary

EXPLICIT NON-GOALS
- No speaker attribution
- No Q/A structure
- No punctuation semantics
- No AI ambiguity resolution
- No render-only formatting

ACCEPTANCE CRITERIA
- Etminan seeded deterministic misses are fixed by owned rules
- common legal terms are not flagged
- certified verbatim fillers and false starts are preserved

CONSTRAINTS
- additive-only
- no schema changes without approval
- one scoped commit
- full typecheck/test/build required
- do not push

DELIVERABLE
- implemented deterministic correction layer
- tests seeded from audited transcript errors
- short report of rule ownership and any deferred ambiguous cases
