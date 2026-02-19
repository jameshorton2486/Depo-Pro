# FEATURE FREEZE — Rebuild Discipline Rules

Active during controlled rebuild. Reviewed at each phase gate.

---

## Build Gate Checklist (Before Any New Phase)

- [ ] `npm run build` passes with 0 errors
- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] RLS policies verified via `pg_policies`
- [ ] No TODOs in permission/auth code
- [ ] No direct `org_id` comparisons in app layer (use `requireOrgMembership()`)
- [ ] No service role usage in UI queries
- [ ] Every new table has RLS before deployment
- [ ] No hardcoded role strings outside of DB query files

---

## Frozen Systems — DO NOT MODIFY INTERNAL LOGIC

The following systems are frozen for the duration of the rebuild.
If a frozen file imports roles, update the IMPORT PATH only.

| System | Path |
|--------|------|
| Deepgram transcription pipeline | `lib/transcription/*` |
| Flagged word review | `components/review/*` |
| Transcript export | `components/export/*` |
| Audio processing | `components/audio/*` |
| WKT quiz module | `app/(wkt)/*` |
| Medical chronology | `components/medical/*` |
| Entity extraction service | `lib/services/entity-extraction.ts` |
| Supabase auth callback | `app/auth/callback/*` |
| Attorney portal | `app/(attorney)/*` |

---

## Code Rules

1. **No new libraries** without explicit phase approval
2. **No schema changes** in Phase 0 (code-only)
3. **No stub-to-stub replacements** — stubs must log warnings
4. **Default DENY** on all permission functions — no `return true` as default
5. **No role strings outside** `lib/enums/roles.ts` and `lib/permissions/`
6. **Commit after each task** — do not batch unrelated changes

---

## Role Canonical Sources

| Purpose | File |
|---------|------|
| Role enum | `lib/enums/roles.ts` |
| Role groups | `lib/permissions/role-groups.ts` |
| API guards | `lib/permissions/api-guards.ts` |
| Action permissions | `lib/permissions/rbac.ts` |
| Route permissions | `lib/auth/require-role.ts` |
| Route registry | `lib/permissions/route-access.ts` |

---

*Phase 0 rules — February 2026*
