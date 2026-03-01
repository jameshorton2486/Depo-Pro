# Phase 2 Roadmap (Post-Beta)

> **Last Updated:** 2026-03-01
> **Status:** DEFERRED — Do NOT implement any item below until prerequisite is met
> **Frozen Layer:** see [Architecture Overview](./ARCHITECTURE_OVERVIEW.md#-frozen-layer--do-not-modify)

---

## ⛔ Prerequisite

**All items in [Beta Launch Criteria](./BETA_LAUNCH_CRITERIA.md) must be completed and signed off before ANY Phase 2 work begins.**

No exceptions. No "starting early." No "working ahead."

Phase 2 features introduce architectural complexity. If the foundation isn't verified stable, you will build on top of bugs.

---

## Decision Framework

Before building any Phase 2 feature:

1. **Have 3+ beta users requested this?** If not, wait.
2. **Does it reduce churn or increase activation?** Prioritize retention.
3. **Can you ship a minimal version in <1 week?** If not, break it down.
4. **Does it require schema changes?** If yes, plan a migration carefully.

---

## Near Term (After Beta Validation)

### Billing & Payments — `DEFERRED`
- **Current state:** Entire billing section stubbed (`lib/invoice.ts`, billing pages use StubPage)
- **Scope:** Stripe integration, subscription plans, usage-based pricing
- **Build on:** `lib/invoice.ts`, `app/api/webhooks/stripe/route.ts`, `app/billing/*`
- **Prerequisite:** Pricing model validated with beta users
- **Est:** 20–30 hrs

### User Invitation System — `DEFERRED`
- **Current state:** Accept page shows beta workaround message
- **Scope:** Admin sends invite → Zoho email → accept page creates account with role
- **Build on:** `app/auth/invite/accept/invite-accept-client.tsx`
- **Est:** 6–8 hrs

### Transactional Email — `DEFERRED`
- **Current state:** Contact form uses webhook; no other email
- **Scope:** Zoho SMTP for job notifications, status changes, exports ready
- **Est:** 4–6 hrs

### Dashboard Analytics — `DEFERRED`
- **Current state:** Report pages all stubs
- **Scope:** Accuracy analytics, usage, system health
- **Build on:** `app/reports/*`
- **Principle:** "Behavior-changing insights, not decorative metrics"
- **Est:** 15–20 hrs

---

## Mid Term

### Multi-Tenant Agency Support — `DEFERRED`
- **Scope:** Organizations table, org memberships, cross-org connections
- **Build on:** `lib/permissions/api-guards.ts` (has org stubs)
- **Prerequisite:** 2+ agencies actively using platform
- **Est:** 30–40 hrs

### Calendar & Scheduling — `DEFERRED`
- **Scope:** Google Calendar sync, booking, conflict detection
- **Build on:** `app/api/calendar/*` (15 routes), `lib/external-calendar/sync-service.ts`
- **Est:** 20–25 hrs

### Attorney Portal Enhancements — `DEFERRED`
- **Scope:** Annotations, exhibits, transcript sharing
- **Build on:** `app/api/attorney/*` (10 routes), `lib/exhibits/pdf-stamper.ts`
- **Est:** 25–30 hrs

---

## Long Term

### Audio Enhancement — `DEFERRED`
- Dolby.io integration for noise reduction
- **Build on:** `lib/services/audio-enhancement-service.ts` (stubbed)
- **Est:** 15–20 hrs

### Real-Time Transcription — `DEFERRED`
- Fundamentally different architecture (WebSocket streaming)
- **Build on:** `app/transcription/live/[jobId]/page.tsx` (stub page)
- **Est:** 40–60 hrs

### Scopist Marketplace — `DEFERRED`
- Job posting, claiming, quality ratings
- **Prerequisite:** Multi-tenant first
- **Est:** 30–40 hrs

### Enterprise Compliance — `DEFERRED`
- SOC 2, HIPAA BAA, data residency
- Mostly process, not code
- **Prerequisite:** Enterprise customer pipeline

---

## Existing Code Inventory

These files already exist and provide a head start for Phase 2:

| Feature | Existing Files | State |
|---------|---------------|-------|
| Billing | `lib/invoice.ts`, `app/api/billing/*`, `app/billing/*` | Stubs with TODOs |
| Calendar | `app/api/calendar/*` (15 routes), `components/calendar/*` | Partial UI, stubbed sync |
| Attorney | `app/api/attorney/*` (10 routes), `components/attorney/*` | Basic CRUD |
| Exhibits | `lib/exhibits/pdf-stamper.ts`, `app/api/jobs/[id]/exhibits/*` | Scaffolded |
| Audio Enhancement | `lib/services/audio-enhancement-service.ts` | Stub only |
| WKT Quiz | `app/api/wkt/*`, `components/wkt/*`, `lib/wkt/*` | Substantially built |
| Webhooks | `app/api/webhooks/stripe/route.ts` | Placeholder |
| Real-Time | `app/transcription/live/[jobId]/page.tsx` | Stub page only |
