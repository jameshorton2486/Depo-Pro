# PARKING LOT — Deferred Features

Features confirmed as out of scope for the current rebuild phase.
Do not implement until the phase they belong to is open.

---

## Phase 1 (Post-Phase 0)

| Feature | Notes |
|---------|-------|
| `organizations` table + RLS | Multi-tenant schema migration |
| `organization_memberships` table | Required before org-scoped API guards |
| `org_connections` table | Agency ↔ Firm relationship |
| `cases` table rebuild | Multi-tenant case access |
| `tasks` table | Job lifecycle task engine |
| `invoices` / `invoice_line_items` | Beta billing engine |
| `notifications` table | In-app notification system |
| Real `requireAttorneyCaseAccess()` | Blocked by `case_memberships` table |
| Real `canAccessCase()` | Blocked by `case_memberships` table |
| Real `assertCanAnnotateTranscript()` | Blocked by `transcript_access` table |

## Phase 2

| Feature | Notes |
|---------|-------|
| Stripe payment processing | Billing engine Phase 2 |
| PDF invoice generation | After invoice creation service |
| Real-time notifications | WebSocket or SSE |
| Conflict detection (real) | Blocked by multi-tenant calendar rebuild |
| Task dependency enforcement | Blocked by tasks table |

## Never (Removed from Scope)

| Feature | Reason |
|---------|--------|
| `lib/scheduling/` directory | Deleted — re-implement clean in Phase 1 |
| `lib/webhooks.ts` | Deleted — re-implement as needed |
| WKT module changes | Frozen system |

---

*Updated: Phase 0 execution — February 2026*
