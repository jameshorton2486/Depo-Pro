DEPO-PRO — W22-3: DETERMINISTIC CORRECTION ENGINE
Mode: IMPLEMENTATION

ROLE
Senior full-stack engineer, system architect, and reliability engineer for Depo-Pro.

ENVIRONMENT
- Vite + React 18 + TypeScript
- Supabase Edge Functions + PostgreSQL
- No Next.js / Prisma / Vercel API routes
- Branch: `feature/stage3-workspace-core`
- `BETA_FREEZE` active

MANDATORY PHASE 0 REUSE MAP
The W22-3 audit already established the implementation posture:
- `src/lib/transcript/correctionRegistry.ts` = `REUSE`
- `src/lib/transcript/correctionEngines.ts` = `EXTEND`
- `src/lib/keyterms/autoSeedKeyterms.ts` = `REUSE`
- `src/lib/keytermDerivation.ts` = `REUSE`
- structured correction-reporting surfaces = `REUSE`

Do not build a parallel deterministic engine. Extend the existing registry/engine path only.

OBJECTIVE
Make deterministic lexical correction a single, explicit pre-workspace ownership layer:
- downstream of W22-2 structure ownership
- upstream of punctuation ownership and AI ambiguity handling

SCOPE
1. Extend deterministic metadata-backed correction coverage in the existing engine
   - seed audited proper-name, party-name, company-name, and procedural fixes from the Etminan audit set
   - examples include:
     - `Standing Steam -> Standing Seam`
     - `Koepke`-class proper-name/company corrections where deterministic metadata support exists
     - party-name normalization support for cases like `Rocio Laura Elizondo Vargas`
     - deterministic title normalization only where existing policy clearly allows it

2. Centralize deterministic vocabulary suppression for noisy scopist flags
   - common legal vocabulary such as `plaintiff`, `remote`, `notice`, and `witness` must not surface as spelling-review noise
   - keep this ownership in the deterministic correction layer, not scattered across render paths

3. Formalize sequencing in the existing engine
   - make `src/lib/transcript/correctionEngines.ts` the explicit deterministic lexical pass
   - do not move punctuation, spacing, or AI ambiguity logic into this pass

4. Seed tests from the audited transcript error set
   - deterministic metadata/company corrections
   - legal vocabulary suppression
   - preservation of verbatim fillers and false starts

EXPLICIT NON-GOALS
- no speaker attribution or Q/A structure changes
- no punctuation or spacing semantics
- no AI ambiguity resolution
- no render/export formatting work
- no schema changes or migrations

FILES TO EXTEND
- `src/lib/transcript/correctionRegistry.ts`
- `src/lib/transcript/correctionEngines.ts`
- `src/lib/transcript/correctionEngines.test.ts`
- only touch other files if required by tests or type flow

ACCEPTANCE CRITERIA
- audited deterministic misses now resolve through the owned deterministic engine
- common legal vocabulary does not trigger `VERIFY_SPELLING` noise
- verbatim fillers and false starts remain preserved
- no duplicate deterministic ownership is introduced elsewhere
- `npx tsc --noEmit -p tsconfig.app.json`, `npm run test`, and `npm run build` pass

CONSTRAINTS
- additive-only
- one scoped commit when implementation is complete
- do not push
- if a candidate correction depends on contextual judgment rather than deterministic support, defer it explicitly to W22-5 instead of encoding it here

DELIVERABLE
- extended deterministic correction layer using the existing registry/engine path
- seeded tests
- short completion note listing:
  - reused modules
  - added deterministic rules
  - deferred ambiguous cases
