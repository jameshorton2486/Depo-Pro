# 🎯 Pre-Build Action Plan

**Status:** Critical Issues Identified  
**Date:** January 2025

---

## 🔴 PHASE 1: Query Layer Completion (CRITICAL - Week 1)

### Priority 1: Migrate Routes with Direct `.from()` Calls

**Target:** Move all 68 direct `.from()` calls from API routes to query modules

#### Batch 1: Notes & Files (Already have query modules)
- [ ] `app/api/jobs/[id]/notes/route.ts` → Use `lib/supabase/queries/notes.ts`
- [ ] `app/api/jobs/[id]/notes/[noteId]/route.ts` → Use `lib/supabase/queries/notes.ts`
- [ ] `app/api/jobs/[id]/files/route.ts` → Use `lib/supabase/queries/files.ts`

#### Batch 2: Calendar (Already have query module)
- [ ] `app/api/calendar/[id]/assign/route.ts` → Use `lib/supabase/queries/calendar.ts`
- [ ] `app/api/calendar/[id]/reschedule/route.ts` → Use `lib/supabase/queries/calendar.ts`
- [ ] `app/api/calendar/[id]/notes/route.ts` → Use `lib/supabase/queries/calendar.ts`
- [ ] `app/api/calendar/[id]/convert-to-job/route.ts` → Use `lib/supabase/queries/calendar.ts`

#### Batch 3: Proper Nouns (Create query module)
- [ ] Create `lib/supabase/queries/proper-nouns.ts`
- [ ] `app/api/jobs/[id]/proper-nouns/route.ts` → Migrate
- [ ] `app/api/jobs/[id]/proper-nouns/[nounId]/route.ts` → Migrate

#### Batch 4: Exhibits (Create query module)
- [ ] Create `lib/supabase/queries/exhibits.ts`
- [ ] `app/api/jobs/[id]/exhibits/route.ts` → Migrate

#### Batch 5: Transcripts (Extend existing)
- [ ] Extend `lib/supabase/queries/transcripts.ts` with status update function
- [ ] `app/api/transcripts/[id]/status/route.ts` → Migrate

#### Batch 6: Other Routes
- [ ] `app/api/jobs/[id]/status/route.ts` → Extend `lib/supabase/queries/jobs.ts`
- [ ] `app/api/transcribe/start/route.ts` → Create `lib/supabase/queries/transcription.ts`
- [ ] `app/api/cases/intake/route.ts` → Extend `lib/supabase/queries/cases.ts`
- [ ] `app/api/external-calendar/google/callback/route.ts` → Create `lib/supabase/queries/external-calendar.ts`

**Estimated Time:** 2-3 days

---

## 🔴 PHASE 2: Middleware Migration (CRITICAL - Day 1)

### Migrate to Next.js 16 "proxy" Pattern

- [ ] Rename `middleware.ts` → `proxy.ts`
- [ ] Update Next.js config if needed
- [ ] Test authentication flow
- [ ] Verify role-based access still works

**Estimated Time:** 2-4 hours

---

## 🟠 PHASE 3: Type Safety Cleanup (HIGH - Week 2)

### Replace `: any` Types

**Strategy:**
1. Start with API routes (highest impact)
2. Move to query modules
3. Clean up UI components last

**Files with most `: any` usage:**
- `lib/supabase/queries/jobs.ts` - Check for any types
- `app/api/**/*.ts` - Replace all `: any` with proper types
- `lib/**/*.ts` - Replace all `: any` with proper types

**Estimated Time:** 3-5 days

---

## 🟠 PHASE 4: Core Services Implementation (HIGH - Week 3-4)

### Service Priority Order:

1. **Notification Service** (Highest impact)
   - [ ] Create `lib/services/notification-service.ts`
   - [ ] Integrate with Resend or SendGrid
   - [ ] Add to job assignment, status change routes

2. **Email Service** (Replace console.log)
   - [ ] Create `lib/services/email-service.ts`
   - [ ] Replace all `console.log` email calls
   - [ ] Add email templates

3. **BullMQ Queue Worker** (Background jobs)
   - [ ] Complete `lib/workers/transcription-worker.ts`
   - [ ] Set up queue configuration
   - [ ] Add job retry logic

4. **Stripe Integration** (Billing)
   - [ ] Complete `lib/services/billing-service.ts`
   - [ ] Implement invoice generation
   - [ ] Add webhook handlers

**Estimated Time:** 1-2 weeks

---

## 🟡 PHASE 5: Production Hardening (MEDIUM - Week 5)

### Replace Console Statements

- [ ] Audit all `console.log/error/warn` in API routes
- [ ] Replace with `logger` from `lib/logger.ts`
- [ ] Add structured logging context
- [ ] Configure log levels

**Estimated Time:** 2-3 days

### Complete TODOs

**Critical TODOs (Fix immediately):**
- [ ] `lib/jobs.ts:46` - BullMQ integration
- [ ] `lib/jobs.ts:165` - Transcription processing
- [ ] `lib/invoice.ts:76` - Stripe integration
- [ ] `lib/security.ts:151` - Case membership checks

**Feature TODOs (Fix before feature work):**
- [ ] Notification service TODOs
- [ ] File upload TODOs
- [ ] Storage integration TODOs

**Estimated Time:** 3-5 days

---

## 🟢 PHASE 6: Testing Infrastructure (LOW - Ongoing)

### Add Test Coverage

- [ ] Set up Jest/Vitest
- [ ] Add unit tests for query modules
- [ ] Add integration tests for API routes
- [ ] Add E2E tests for critical flows

**Target:** >70% coverage

**Estimated Time:** Ongoing

---

## 📋 IMMEDIATE ACTION ITEMS (Today)

### Step 1: Push Current Changes
```powershell
git add -A
git commit -m "docs: add BUILD MODE documentation and query layer templates"
git push origin main
```

### Step 2: Start Query Layer Migration

**Begin with Batch 1 (Notes & Files)** - These query modules already exist:

1. Open `app/api/jobs/[id]/notes/route.ts`
2. Replace direct `.from()` calls with `listNotesForJob()` from `lib/supabase/queries/notes.ts`
3. Test the route
4. Repeat for `[noteId]/route.ts` and `files/route.ts`

**Use this Cursor prompt:**
```
Migrate this API route to use the query layer.

Current: This route calls supabase.from('deposition_notes') directly.
Target: Use functions from lib/supabase/queries/notes.ts instead.

Requirements:
- Remove all direct .from() calls
- Use listNotesForJob(), getNoteById(), createNote(), etc.
- Map snake_case → camelCase in responses
- Preserve all existing functionality
```

### Step 3: Verify After Each Route

```powershell
npm run typecheck
npm run lint
npm run dev
# Test the route manually
```

---

## 🎯 SUCCESS CRITERIA

### Phase 1 Complete When:
- ✅ 0 direct `.from()` calls in API routes
- ✅ All routes use query modules
- ✅ TypeScript compiles with 0 errors
- ✅ ESLint passes with 0 errors

### Phase 2 Complete When:
- ✅ `proxy.ts` replaces `middleware.ts`
- ✅ No deprecation warnings
- ✅ Auth flow works correctly

### Phase 3 Complete When:
- ✅ <10 instances of `: any`
- ✅ All API routes properly typed
- ✅ All query modules properly typed

---

## 📊 PROGRESS TRACKING

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 1: Query Layer | 🔴 Not Started | 0/15 routes migrated |
| Phase 2: Middleware | 🔴 Not Started | 0% |
| Phase 3: Type Safety | 🔴 Not Started | 0/106 `: any` fixed |
| Phase 4: Core Services | 🔴 Not Started | 0/4 services complete |
| Phase 5: Hardening | 🔴 Not Started | 0/151 console.log replaced |
| Phase 6: Testing | 🔴 Not Started | ~5% coverage |

---

## 🚀 RECOMMENDED STARTING POINT

**Begin with:** Batch 1 of Phase 1 (Notes & Files routes)

**Why:**
- Query modules already exist
- Low risk (isolated routes)
- Quick wins (build momentum)
- Establishes pattern for other batches

**Time Estimate:** 2-3 hours for Batch 1

---

**Next:** Start migrating `app/api/jobs/[id]/notes/route.ts` to use `lib/supabase/queries/notes.ts`
