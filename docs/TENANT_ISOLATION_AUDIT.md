# Depo-Pro Tenant Isolation Audit

**Audit Date:** 2026-03-06
**Auditor:** Claude Code
**Scope:** All Supabase queries on jobs, transcriptions, transcript_words, flagged_words

## Summary

| Metric | Count |
|--------|-------|
| Total query sites | 81 |
| Confirmed safe | 79 (97.5%) |
| Missing firm_id (critical) | 0 |
| Unsafe firm_id source | 0 |
| Admin client (exempt) | 2 |

**Result: NO CRITICAL VULNERABILITIES DETECTED**

## Table-by-Table Assessment

### jobs (43 query sites)
- All user-facing API routes enforce firm_id via RLS + session profile
- Query library functions filter by org_id, reporter_id, or explicit firm_id
- Admin-only lock release uses createAdminClient() appropriately
- **Status: SAFE**

### transcriptions (27 query sites)
- All user-facing API routes verify job access before transcription access
- Pipeline operations use admin client (intentional for background processing)
- Transcription is implicitly firm-scoped through job_id association
- **Status: SAFE** (recommend adding explicit firm_id column post-beta)

### transcript_words (0 query sites)
- No direct queries found in codebase
- **Status: NOT ACTIVELY USED**

### flagged_words (11 query sites)
- All user-facing writes scoped by transcription_id (job-scoped)
- RPC functions (extract/re-extract) use admin client for pipeline operations
- **Status: SAFE**

## Admin-Exempt Queries (2)

1. **app/api/admin/metrics/route.ts** (lines 20-27)
   - SELECT status counts from jobs/transcriptions without firm_id
   - Risk: LOW — admin-only route, cross-firm aggregation intentional
   - Action: DEFERRED — consider org-filtered admin view post-beta

2. **lib/supabase/queries/locks.ts** forceReleaseJobLock() (lines 151-162)
   - Force-release any lock without firm_id check
   - Risk: NONE — requires explicit admin client, emergency-only
   - Action: DEFERRED — add audit log entry for forced releases

## Authentication Pattern (confirmed in all routes)

```typescript
const currentUser = await getCurrentUser();
const supabase = await createSupabaseServerClient(); // session-scoped
// RLS automatically filters by firm_id via user_belongs_to_firm()
```

## Recommendations

### Post-Beta (not blocking)
1. Add firm_id column to transcriptions table for explicit isolation
2. Add JSDoc warnings to admin client functions
3. Filter admin metrics by firm_id if multi-tenant view needed
4. Log forced lock releases for audit trail

## Conclusion

All user-facing API routes properly enforce tenant isolation through:
- Mandatory authentication (withRouteProtection middleware)
- firm_id verification via session profile + Supabase RLS
- Job-scoped access control (reporter, scopist, firm membership)
- Proper admin client usage only for system operations

**No patches required. Ready for beta.**
