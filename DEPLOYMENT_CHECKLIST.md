# Workflow Intelligence Phase A - Deployment Checklist

**Version:** Phase A (Complete)
**Deployment Date:** _____________
**Deployed By:** _____________

---

## Pre-Deployment Verification

### ✅ Code Quality
- [x] Build passes (`npm run build`)
- [x] TypeScript errors resolved
- [x] ESLint warnings addressed
- [x] Pre-commit hooks passing
- [x] Git commit created: `e2fa306`

### ✅ Files Changed
- [x] 13 files modified/created
- [x] 1,131 insertions, 47 deletions
- [x] No breaking changes to existing functionality
- [x] All new files follow project conventions

### ✅ Documentation
- [x] WORKFLOW_INTELLIGENCE_IMPLEMENTATION.md created
- [x] scripts/apply-migration.md created
- [x] scripts/test-workflow-intelligence.md created
- [x] Code comments added to new components
- [x] Type definitions exported properly

---

## Deployment Steps

### Step 1: Backup Database (CRITICAL)
```bash
# Create backup before applying migration
pg_dump "$DATABASE_URL" \
  > backup_before_workflow_intelligence_$(date +%Y%m%d).sql
```
**Status:** [ ] Complete
**Backup Location:** _____________

### Step 2: Apply Database Migration
Choose one method:

**Method A: Supabase Dashboard** (Recommended)
1. Go to https://supabase.com/dashboard
2. Select project: `<your-supabase-project-ref>`
3. Navigate to SQL Editor
4. Run `supabase/migrations/20260211_review_sessions_tracking.sql`
5. Verify success message

**Method B: CLI**
```bash
npx supabase db push
```

**Status:** [ ] Complete
**Time:** _____________

### Step 3: Verify Migration
Run verification queries from `scripts/apply-migration.md`:
```sql
-- Check table exists
SELECT table_name FROM information_schema.tables
WHERE table_name = 'review_sessions';

-- Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename = 'review_sessions';

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename = 'review_sessions';
```

**Expected Results:**
- Table exists: ✓
- RLS enabled (rowsecurity = true): ✓
- 4 indexes created: ✓
- 5 policies created: ✓

**Status:** [ ] Complete
**Verified By:** _____________

### Step 4: Deploy Code to Production

**For Vercel:**
```bash
git push origin main
# Vercel will auto-deploy
```

**For other platforms:**
```bash
npm run build
# Follow your platform's deployment process
```

**Status:** [ ] Complete
**Deployment URL:** _____________

### Step 5: Smoke Test Production

#### Test 5.1: Dashboard Access
1. Visit production `/jobs` URL
2. **Expected:** Dashboard loads, sorted by highest risk
3. **Status:** [ ] Pass [ ] Fail

#### Test 5.2: Risk Sorting
1. Check if jobs are sorted by risk score
2. Click sort toggle buttons
3. **Expected:** Sorting works correctly
4. **Status:** [ ] Pass [ ] Fail

#### Test 5.3: Review Session Access
1. Click "Review" on any job
2. **Expected:** Review page loads
3. **Status:** [ ] Pass [ ] Fail

#### Test 5.4: Keyboard Shortcuts
1. Press Shift+R
2. **Expected:** Jumps to worst word
3. **Status:** [ ] Pass [ ] Fail

#### Test 5.5: Heatmap Toggle
1. Click "Heatmap OFF" button
2. **Expected:** Words change colors
3. **Status:** [ ] Pass [ ] Fail

#### Test 5.6: Session Tracking
1. Stay on review page for 35+ seconds
2. Check database for new session entry
3. **Expected:** Session saved with correct data
4. **Status:** [ ] Pass [ ] Fail

**Overall Smoke Test:** [ ] Pass [ ] Fail

---

## Post-Deployment Tasks

### Task 1: Monitor Error Logs
**Timeframe:** First 24 hours after deployment

**What to Monitor:**
- Application errors in Vercel/hosting platform logs
- Supabase database errors
- Browser console errors (test in production)
- API endpoint errors (`/api/review-sessions`)

**Status:** [ ] Complete
**Issues Found:** _____________

### Task 2: Database Performance Monitoring
**Timeframe:** First 7 days

**What to Monitor:**
```sql
-- Check query performance
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE query LIKE '%review_sessions%'
ORDER BY total_time DESC
LIMIT 10;

-- Check table size growth
SELECT
  pg_size_pretty(pg_total_relation_size('review_sessions')) as total_size,
  pg_size_pretty(pg_relation_size('review_sessions')) as table_size,
  pg_size_pretty(pg_indexes_size('review_sessions')) as index_size;
```

**Expected Growth:** ~1KB per review session
**Status:** [ ] Complete
**Notes:** _____________

### Task 3: User Feedback Collection
**Timeframe:** First 2 weeks

**Feedback Questions:**
1. Do you find the risk-based sorting helpful?
2. Are the keyboard shortcuts improving your workflow?
3. Is the confidence heatmap useful or distracting?
4. Are the effort estimates accurate?
5. Any features not working as expected?

**Feedback Collection Method:** _____________
**Status:** [ ] Complete

### Task 4: Analytics Review
**Timeframe:** After 2 weeks of usage

**Metrics to Review:**
```sql
-- Average review time by risk level
SELECT
  CASE
    WHEN risk_score >= 75 THEN 'Critical'
    WHEN risk_score >= 50 THEN 'High'
    WHEN risk_score >= 25 THEN 'Medium'
    ELSE 'Low'
  END as risk_level,
  COUNT(*) as sessions,
  AVG(active_duration_seconds / 60.0) as avg_active_minutes,
  AVG(completion_rate) as avg_completion_rate
FROM review_sessions
WHERE ended_at IS NOT NULL
GROUP BY risk_level
ORDER BY risk_score DESC;

-- Most used filters
SELECT
  jsonb_array_elements_text(filters_used) as filter,
  COUNT(*) as usage_count
FROM review_sessions
WHERE filters_used != '[]'::jsonb
GROUP BY filter
ORDER BY usage_count DESC;

-- Scopist efficiency
SELECT
  u.name,
  COUNT(rs.id) as sessions_completed,
  AVG(rs.active_duration_seconds / 60.0) as avg_minutes,
  AVG(rs.words_reviewed / NULLIF(rs.active_duration_seconds / 60.0, 0)) as words_per_minute
FROM review_sessions rs
JOIN users u ON u.id = rs.user_id
WHERE rs.ended_at IS NOT NULL
GROUP BY u.id, u.name
ORDER BY words_per_minute DESC;
```

**Status:** [ ] Complete
**Key Insights:** _____________

---

## Rollback Plan (Emergency Only)

### When to Rollback
- Database corruption detected
- Critical bugs blocking all users
- Data loss occurring
- Security vulnerability discovered

### Rollback Steps

#### 1. Revert Code Deployment
```bash
git revert e2fa306
git push origin main
# Or use hosting platform's rollback feature
```

#### 2. Remove Database Table (if needed)
```sql
-- DANGER: Only if table is causing issues
DROP TABLE IF EXISTS public.review_sessions CASCADE;
```

#### 3. Restore from Backup (if needed)
```bash
pg_restore -d "postgresql://..." backup_before_workflow_intelligence_YYYYMMDD.sql
```

#### 4. Verify Rollback
- [ ] Application loads
- [ ] No database errors
- [ ] Users can access jobs
- [ ] Reviews still work (without new features)

**Rollback Executed:** [ ] Yes [ ] No
**Executed By:** _____________
**Date/Time:** _____________
**Reason:** _____________

---

## Known Issues & Workarounds

### Issue 1: Session Tracking Stops After Browser Sleep
**Severity:** Low
**Impact:** Active time may be underreported if browser sleeps
**Workaround:** Users should refresh page after waking computer
**Fix ETA:** _____________

### Issue 2: Heatmap Performance on Very Long Transcripts (5000+ words)
**Severity:** Low
**Impact:** Slight lag (200-300ms) when toggling heatmap
**Workaround:** Keep heatmap OFF by default
**Fix ETA:** Phase B (React virtualization)

### Issue 3: [Add any issues discovered during testing]
**Severity:** _____________
**Impact:** _____________
**Workaround:** _____________
**Fix ETA:** _____________

---

## Phase B Planning

### Data Collection Goals (2-4 weeks)
- [ ] Collect 100+ review sessions per active scopist
- [ ] Gather data across all risk levels (low, medium, high, critical)
- [ ] Track filter usage patterns
- [ ] Identify outliers and edge cases

### Phase B Features (Future)
1. **Adaptive Effort Estimation**
   - Replace heuristic model with ML regression
   - Firm-specific historical averages
   - Scopist skill-level adjustments

2. **Trending Insights**
   - "You're 15% faster than last week"
   - "Complete 3 more jobs to hit daily goal"
   - Efficiency leaderboards

3. **Predictive Scheduling**
   - "You can finish 4 more jobs before 5pm"
   - Auto-assign jobs based on scopist speed
   - Load balancing recommendations

4. **Advanced Analytics Dashboard**
   - Firm-wide efficiency metrics
   - Scopist performance comparisons
   - Filter effectiveness analysis
   - Risk score calibration

**Phase B Start Date:** _____________
**Phase B Owner:** _____________

---

## Sign-Off

### Technical Lead
**Name:** _____________
**Signature:** _____________
**Date:** _____________
**Status:** [ ] Approved [ ] Rejected
**Comments:** _____________

### Product Owner
**Name:** _____________
**Signature:** _____________
**Date:** _____________
**Status:** [ ] Approved [ ] Rejected
**Comments:** _____________

### QA Lead
**Name:** _____________
**Signature:** _____________
**Date:** _____________
**Status:** [ ] Approved [ ] Rejected
**Comments:** _____________

---

## Deployment Success Criteria

**All criteria must be met before marking deployment as successful:**

- [ ] Migration applied successfully
- [ ] Code deployed to production
- [ ] All smoke tests passing
- [ ] No critical errors in logs (first 24 hours)
- [ ] At least 5 review sessions completed successfully
- [ ] Database performing within expected parameters
- [ ] User feedback collected (first 2 weeks)
- [ ] Analytics data flowing correctly

**Deployment Status:** [ ] Successful [ ] Failed [ ] Partial

**Final Notes:** _____________

---

**Deployment Completed:** _____________
**Ready for Phase B:** _____________
