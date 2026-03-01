# Production Readiness Guide

> **Last Updated:** 2026-03-01
> **Status:** Pre-Beta Stabilization Phase
> **Scope Lock:** Beta workflow ONLY — Upload → Transcribe → Review → Export
> **Frozen Layer:** see [Architecture Overview](./ARCHITECTURE_OVERVIEW.md#-frozen-layer--do-not-modify)
> **Refactor Rules:** see [Architecture Overview](./ARCHITECTURE_OVERVIEW.md#️-global-refactor-constraints)
> **Task Details:** see [Remaining Tasks Analysis](./REMAINING_TASKS_ANALYSIS.md)
> **Launch Gate:** see [Beta Launch Criteria](./BETA_LAUNCH_CRITERIA.md)
> **AI Protocol:** see [AI Execution Protocol](./AI_EXECUTION_PROTOCOL.md)

---

## ✅ Global Validation — Run After EVERY Phase

```bash
npm run typecheck     # Zero errors
npm run build         # Zero errors
npm run lint          # No new warnings
```

Additional checks:
- `grep -r "throw.*not implemented" lib/` → count should decrease, never increase
- No new `// TODO` comments introduced
- No new `console.error` in production code
- No files modified outside the phase's scope

**If any validation fails, the phase is not complete.**

---

## Timeline Overview

| Phase | Focus | Tool Assignment | Est. Hours | When |
|-------|-------|----------------|-----------|------|
| **1** | Crash Prevention | Codex → Aider | ~3 hrs | Day 1 AM |
| **2** | Security Hardening | Aider → Claude Code → Manual | ~13 hrs | Days 1–2 |
| **3** | Export System | Claude Code → Manual | ~6.5 hrs | Day 3 |
| **4** | Review UX | Claude Code → Aider | ~8 hrs | Days 3–4 |
| **5** | Beta Onboarding | Codex → Manual | ~5 hrs | Day 4 |
| **6** | Testing | Manual → Aider | ~8 hrs | Day 5 |
| **7** | Cleanup | Codex → Aider | ~7 hrs | During beta |
| **8** | Hardening | Claude Code → Manual → Codex | ~8 hrs | During beta |

**Pre-beta:** ~43 hours (Phases 1–6) ≈ 5–6 focused days
**During beta:** ~15 hours (Phases 7–8)
**With disciplined AI agents:** Pre-beta compresses to ~15–20 hours of human time.

---

## Phase 1: Crash Prevention (~3 hrs)

**Goal:** Zero production-throwing stubs on active code paths.

**Tasks:** CRASH-01, CRASH-02, STB-01, STB-02, STB-03
**Full specs:** [Remaining Tasks → Phase 1](./REMAINING_TASKS_ANALYSIS.md#phase-1-crash-prevention)

**Execution:**
1. Run Codex on: CRASH-01, CRASH-02, STB-02, STB-03 (single-file rewrites)
2. Run Aider on: STB-01 (needs grep + multi-step logic)
3. Run global validation
4. `git commit -m "phase-1: fix production-throwing stubs"`

**Phase 1 Complete When:**
- [ ] No service in `lib/` throws "not implemented" on active code paths
- [ ] `/api/health` returns database: healthy
- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes

---

## Phase 2: Security Hardening (~13 hrs)

**Goal:** Auth on all active routes. Concurrent edit protection. Infrastructure verified.

**Tasks:** SEC-01, SEC-02, SEC-03, SEC-04, SEC-05
**Full specs:** [Remaining Tasks → Phase 2](./REMAINING_TASKS_ANALYSIS.md#phase-2-security-hardening)

**Execution:**
1. Run Aider on: SEC-02 (add requireAuthV2 to 7 stub routes — fast, repetitive)
2. Manual: SEC-05 (verify Vercel env vars)
3. Run Claude Code on: SEC-01 (migrate 20+ routes to withRouteProtection — big batch)
4. Run Claude Code on: SEC-03 (optimistic locking — multi-file logic)
5. Manual: SEC-04 (verify storage bucket policies in Supabase Dashboard)
6. Run global validation
7. `git commit -m "phase-2: security hardening"`

**Phase 2 Complete When:**
- [ ] 20+ routes use `withRouteProtection`
- [ ] All 7 stub routes require auth before responding
- [ ] Concurrent transcript edit → 409 Conflict
- [ ] Storage bucket policies verified
- [ ] All 9 env vars confirmed in Vercel
- [ ] `npm run build` passes

---

## Phase 3: Export System (~6.5 hrs)

**Goal:** All three export formats produce correct, corrected output.

**Tasks:** EXP-01, EXP-02, EXP-03
**Full specs:** [Remaining Tasks → Phase 3](./REMAINING_TASKS_ANALYSIS.md#phase-3-export-system)

**Execution:**
1. Manual: EXP-02 (test DOCX export with corrections — might already work)
2. Manual: EXP-03 (test TXT export)
3. If DOCX corrections work: Run Claude Code on EXP-01 (PDF formatting)
4. If DOCX corrections broken: Fix first with Aider, then proceed to EXP-01
5. Run global validation
6. `git commit -m "phase-3: export system verified"`

**Phase 3 Complete When:**
- [ ] DOCX: legal formatting + corrections included
- [ ] PDF: acceptable formatting + corrections included
- [ ] TXT: corrections included
- [ ] `npm run build` passes

---

## Phase 4: Review UX (~8 hrs)

**Goal:** Keyboard-driven review. Error boundaries. Clean navigation.

**Tasks:** UI-01, UI-02, UI-03
**Full specs:** [Remaining Tasks → Phase 4](./REMAINING_TASKS_ANALYSIS.md#phase-4-review-ux)

**Execution:**
1. Run Claude Code on: UI-01 (keyboard navigation — multi-component addition)
2. Run Aider on: UI-02 (error boundaries — repetitive wrap across 5 files)
3. Run Aider on: UI-03 (hide stub pages from sidebar)
4. Run global validation
5. `git commit -m "phase-4: review ux polish"`

**Phase 4 Complete When:**
- [ ] Tab/Shift+Tab navigates flagged words with audio sync
- [ ] All 5 dashboard pages have ErrorBoundary
- [ ] No "Coming Soon" in sidebar navigation
- [ ] `npm run build` passes

---

## Phase 5: Beta Onboarding (~5 hrs)

**Goal:** New user completes the full workflow without getting stuck.

**Tasks:** ONB-01, ONB-02, ONB-03
**Full specs:** [Remaining Tasks → Phase 5](./REMAINING_TASKS_ANALYSIS.md#phase-5-beta-onboarding)

**Execution:**
1. Run Codex on: ONB-01 (text change on invite page)
2. Run Codex on: ONB-02 (add webhook to contact form)
3. Run global validation
4. `git commit -m "phase-5: beta onboarding ready"`
5. Manual: ONB-03 (end-to-end test with both roles)
6. Fix anything ONB-03 discovers → commit separately

**Phase 5 Complete When:**
- [ ] Registration works for reporter and scopist
- [ ] Invite page shows helpful message
- [ ] Full workflow: upload → transcribe → review → correct → export
- [ ] Contact form sends notification (if webhook configured)

---

## Phase 6: Testing & Validation (~8 hrs)

**Goal:** Prove stability before external testers.

**Tasks:** TST-01, TST-02, TST-03
**Full specs:** [Remaining Tasks → Phase 6](./REMAINING_TASKS_ANALYSIS.md#phase-6-testing--validation)

**Execution:**
1. Run `npm run test` → fix failures with Aider (TST-01)
2. Run 10-job stability test on production (TST-02)
3. Performance spot check in browser (TST-03)
4. `git commit -m "phase-6: testing complete"`
5. **→ Run [Beta Launch Criteria](./BETA_LAUNCH_CRITERIA.md) checklist**

**Phase 6 Complete When:**
- [ ] Critical path tests pass
- [ ] 10/10 jobs complete without crash
- [ ] Performance within targets
- [ ] **Beta Launch Criteria fully passed**

---

## Phase 7: Cleanup (During Beta, ~7 hrs)

**Goal:** Technical debt reduction alongside beta feedback.

**Tasks:** CLN-01, CLN-02, CLN-03, STB-04 through STB-11
**Full specs:** [Remaining Tasks → Phase 7](./REMAINING_TASKS_ANALYSIS.md#phase-7-cleanup-during-beta)

Not blocking beta. Run between feedback cycles.

**Phase 7 Complete When:**
- [ ] Dead files removed
- [ ] Legacy auth has @deprecated comments
- [ ] All Phase 2 stubs return safely (no throws)
- [ ] `npm run build` passes

---

## Phase 8: Hardening During Beta (~8 hrs)

**Goal:** Complete security audit, documentation, speaker verification.

**Tasks:** SEC-06, SEC-07, DEP-01, DEP-02, CLN-05, CLN-06, FTR-01
**Full specs:** [Remaining Tasks → Phase 8](./REMAINING_TASKS_ANALYSIS.md#phase-8-harden-during-beta)

**Phase 8 Complete When:**
- [ ] Route security audit documented
- [ ] RLS policies verified
- [ ] Deployment checklist passed
- [ ] README updated
- [ ] Beta guide created
- [ ] Speaker diarization verified

---

## What NOT to Build

These are all DEFERRED to Phase 2. Any AI agent that touches these is operating outside scope.

| Feature | Why Not Now |
|---------|-------------|
| Stripe billing | Stubs exist — no beta revenue model yet |
| Google Calendar sync | Scaffolded but not validated by users |
| Multi-tenant agencies | Organizations table not ready |
| Real-time transcription | Different architecture entirely |
| Dolby audio enhancement | Standard FFmpeg works fine |
| Analytics dashboards | All report pages are stubs |
| WKT quiz system | Not core workflow |
| Scopist marketplace | Needs multi-tenant first |

See [Phase 2 Roadmap](./ROADMAP_PHASE_2.md) for planning details.
