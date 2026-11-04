# Website source consolidation audit — 2026-11-04

---
authority_tier: T5
status: ACTIVE
owner: Architecture
scope: website-source-consolidation
supersedes: null
superseded_by: null
approved_by: null
version: null
effective_date: 2026-11-04
ratified_date: null
last_reviewed: 2026-11-04
next_review: 2027-11-04
ratification: NOT_REQUIRED
implementation_status: PARTIAL
---

## Repository boundary

- `jameshorton2486/Depo-Pro` owns the combined public website and browser workspace.
- `jameshorton2486/Depo-Pro-Live` remains the Windows recording application.
- `jameshorton2486/depo-pro-website` is preserved as the frozen Revision 5 design reference. It is not a production source and must not be deleted or archived until the retained concepts below are accepted.

Production deployment, production secrets, customer data, and live Stripe charges were outside this consolidation.

## Integration ancestry

The consolidation branch is `codex/merge-website-projects`. It started at `91172dbd`, the active `feature/ai-correction-review` development head. GitHub's configured default integration target is `feature/stage3-workspace-core`.

The active development line was 81 commits ahead of that target and one commit behind it. The missing target commit, `8fb9f3d0` (`docs(csr): Miah CSR format confirmation sample + cover note`), was merged into the consolidation branch as `71db053e`. The website addition itself is isolated in `dd09171c`.

## Source A: unified web-platform branch

| Source route or feature | Consolidated location | Disposition |
| --- | --- | --- |
| Home | `/`, `src/site/SiteApp.tsx` | Retained and made the public entry point. |
| Features | `/features` | Retained. Product and workflow explanations are combined here. |
| Pricing | `/pricing` | Retained as a proposal; no real checkout is initiated from this route. |
| Checkout | `/checkout` | Retained with a server-side `sk_test_` enforcement gate. |
| Help | `/help` | Retained and combined with browser, Windows, and workspace paths. |
| Privacy | `/privacy` | Retained as test-environment direction, not a final legal policy. |
| Terms | `/terms` | Retained as test-environment direction, not a final agreement. |
| Browser recording | `/live`, `LiveCapturePage.tsx` | Retained with IndexedDB chunk recovery, transcript recovery, reconnect backoff, and local-first failure behavior. |
| Account status | `/account` | Retained; reads entitlement state and preserves access to local/existing files. |
| Browser workspace | `/app` | Retained; mounts the existing seven-stage editor without replacing its stable `mountEditor(config)` API. |
| Licensing contract | `contracts/licensing-v1.openapi.yaml` | Retained. |
| Licensing service | `supabase/functions/licensing/index.ts` | Retained for non-production integration. Checkout refuses keys that do not start with `sk_test_`. |
| Vercel SPA routing | `vercel.json` | Retained. No deployment was performed in this audit. |

## Source B: frozen `depo-pro-website` Revision 5

This repository contains a single self-contained `index.html` plus `vercel.json`; it has no external image or font assets.

| Revision 5 screen or asset | Consolidated disposition |
| --- | --- |
| Home | Combined into `/`; the current site keeps the working-draft disclaimer and synthetic transcript demonstration. |
| Product | Combined into `/features` and the `/app` workspace. |
| How it works | Combined into the home workflow, `/features`, and `/help`. |
| Accuracy and review | Core behavior is retained in the workspace and feature copy. A dedicated public accuracy/review page is not yet present. |
| Security/data care | Partly retained in `/features`, `/privacy`, account-scoped licensing, and server-held credentials. A dedicated security page is not yet present. |
| Architecture | Intentionally superseded as a public route by repository architecture documents. The obsolete `Depo-Pro-New`/new-Supabase wording was not carried forward. |
| About | Not present as a dedicated route. Its digital-reporter focus and human-certification responsibility are retained across Home, Features, and the workspace. |
| Contact | Intentionally not activated. Revision 5 itself disabled the form and collected no data. No receiving mailbox has been verified. |
| Pilot invitation/register | Intentionally superseded by account, plan, and checkout routes. Open self-registration is not represented as available. |
| Sign in | Superseded by the real `/app` authentication/workspace entry rather than a disabled mock form. |
| Privacy preparation | Combined into `/privacy`, but the richer retention/provider/legal-review checklist remains useful source material for the final policy. |
| Terms preparation | Combined into `/terms`, but the richer scope, support, interruption, export, and records-return checklist remains useful source material for final terms. |
| Teal Revision 5 visual system | Intentionally superseded by the slate/blue legal-professional system used by the combined application. |
| Inline favicon | Not copied. It is the only discrete visual asset still absent from the consolidated branch. |
| Synthetic transcript mockup | Combined into the Home transcript sample and the real `/app` workspace. |
| No-index/internal-review headers | Intentionally superseded in source; deployment protection and final indexing policy remain a deployment decision. |

## Still missing from the consolidated branch

The separate website repository has no operational code, account implementation, recording implementation, or external assets missing from the branch. The remaining potentially useful material is:

1. dedicated public Accuracy/Review, Security, and About pages;
2. the detailed privacy and terms preparation checklists;
3. the small inline teal favicon, if that identity is retained;
4. a Contact route only after a real receiving channel and privacy handling are approved;
5. a pilot-invitation route only if invitation-only onboarding remains a product decision.

These are content/design decisions, not blockers to preserving the functional website merge. Keep `depo-pro-website` unchanged until they are reviewed.

## Verification boundary

- Internal public links and all declared routes were exercised locally: `/`, `/features`, `/pricing`, `/checkout`, `/help`, `/privacy`, `/terms`, `/live`, `/account`, and `/app`.
- `/app` mounted the existing Case Browser/editor shell. With no local Supabase credentials it reported the expected unavailable-backend state rather than sending data.
- `/account` rendered a controlled unavailable-account state when Supabase was not configured; a regression test confirms the licensing client stops before making a request.
- Account and checkout UI rendered without invoking checkout. No Stripe session, charge, deployment, migration, or production API call was made.
- The licensing service statically enforces an `sk_test_` Stripe secret before creating a checkout session.
- Browser recovery tests cover final-chunk persistence, continuous reconstruction, consecutive-session isolation, newest-transcript recovery, storage-failure warnings, recorder finalization, cloud reconnect backoff, and audio-derived speaker turns.
- Focused website/recovery tests, the complete test suite, TypeScript checking, and the production build passed before the draft PR.

## Remaining work

- Review the five optional Revision 5 content/design decisions listed above.
- Configure and test a disposable Supabase/Stripe test environment before hosted E2E verification.
- Complete legal/privacy review before publishing operative policies.
- Review the inherited 81-commit development line separately from website commit `dd09171c`.
- Resolve the existing architecture-rule exception in `src/lib/licensingApi.ts`, which currently performs licensing fetches outside `src/api/client.ts`, before final merge if strict single-network-module enforcement is required.
