# Audit Evidence & Reproducible Method

Companion to the 2026-07-20 architecture audit. Makes the audit's factual claims
reproducible and pins them to a repository state, so the next reader can re-verify
in minutes instead of re-deriving.

## 1. Repository state this audit reflects

- **HEAD commit:** `9afb41c1f6dc40c240f22a04e624b30277d21f71`
- **Working tree:** **dirty** at audit time — the branch had uncommitted changes and
  was under active restructuring. Claims below reflect the working tree, not a clean
  checkout of HEAD. Re-run the commands after the tree stabilizes to confirm nothing
  drifted.

> Staleness rule: treat this audit as a snapshot. Re-run Section 3 whenever any of the
> four unwired modules gains a non-test importer, or a new `*Engine`/`*Resolver`
> module appears.

## 2. Method

Every "unused / no production caller" claim was established by import search, not by
naming. A module is **unwired** when the only files that import it are its own test
and other unwired modules. Producer/consumer relationships (legitimate layering) were
distinguished from competing ownership by checking whether two modules independently
*produce* the same semantic output versus one *consuming* the other's output.

## 3. Reproducible searches

```bash
# 3a. Who imports the four candidate-dead modules? (expect: only *.test.ts + each other)
git grep -n -E "structureEngine|formattingEngine|correctionEngines|correctionValidator" -- 'src/**/*.ts' 'src/**/*.tsx'

# 3b. Entity registry consumers (expect: correctionOrchestrator, aiSuggestionEngine; NOT the speaker engine)
git grep -n "entityRegistry" -- 'src/**/*.ts'

# 3c. Active Q/A repair stage (expect: imported by transcriptParagraphs.ts)
git grep -n "qaStructureUtils" -- 'src/**/*.ts'

# 3d. Confirm the callback never invokes the unwired modules
git grep -n -E "structureEngine|formattingEngine|correctionEngines|correctionValidator" -- 'supabase/functions/**/*.ts'
```

## 4. Import-island finding (the strongest duplication evidence)

The four "unused" modules form a **closed cluster**: they import only each other and
their own tests, with **zero inbound edges from production code**.

```text
structureEngine.ts      ← structureEngine.test.ts            (otherwise isolated)
correctionEngines.ts    ← correctionEngines.test.ts
                        ← correctionValidator.ts   (type import)
correctionValidator.ts  ← correctionValidator.test.ts
                        ← formattingEngine.ts      (type import)
formattingEngine.ts     ← formattingEngine.test.ts

Inbound edges from production (non-test) modules: 0
Entry points that transitively reach any of the four: none
```

Because nothing in the production graph reaches this cluster, it is a parallel,
dormant implementation of Q/A/objection classification (`structureEngine`),
deterministic-correction application/validation (`correctionEngines` +
`correctionValidator`), and geometry (`formattingEngine`) — the same
responsibilities owned in production by `transcriptParagraphs.ts` and `cfe.ts`.

## 5. Latent third review-queue competitor

The single-owner audit names two active review-queue authorities
(`correctionOrchestrator.ts`, `aiReview.ts`). There is also a **third, unwired**
implementation:

- `correctionValidator.ts:233` exports `buildResidualReviewQueue(...)`
- used only internally (`correctionValidator.ts:271`) and in its test.

This strengthens the "freeze one persisted queue contract" recommendation: there are
three queue-shaped implementations, only two of them reachable.

## 6. God-object sizes (quantifies GOD_OBJECT_REPORT.md)

| Module | Lines | Note |
|---|---|---|
| `transcriptParagraphs.ts` | 1,229 | Highest-risk owner; also generates PROCEEDINGS metadata text from the case record at paragraph-render time — a later stage doing upstream structure/content work. |
| `cfe.ts` | 705 | Active geometry + correction application compiler. |
| `speakerResolutionEngine.ts` | 677 | Cohesive identity domain; does not yet consume `entityRegistry`. |
| `correctionOrchestrator.ts` | 375 | Review report recomputed at render/load time. |

Line counts are a proxy for responsibility breadth, not a refactor mandate.
