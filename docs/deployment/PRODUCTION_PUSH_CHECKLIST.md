# Production Push Checklist

## Pre-Push Verification

Use this checklist before pushing to production or merging to `main`.

---

## 🔍 Code Quality Checks

### TypeScript & Linting
- [ ] `npm run typecheck` - No TypeScript errors
- [ ] `npm run lint` - No ESLint errors or warnings
- [ ] `npm run lint:fix` - Auto-fixable issues resolved

### Build Verification
- [ ] `npm run build` - Build completes successfully
- [ ] No build warnings (review any warnings)
- [ ] All pages compile correctly
- [ ] API routes compile correctly

### Formatting
- [ ] `npm run format:check` - Code is properly formatted
- [ ] `npm run format` - Auto-format if needed

---

## 🧪 Testing

### Unit Tests
- [ ] `npm run test` - All unit tests pass
- [ ] New features have test coverage
- [ ] Edge cases are tested

### Integration Tests
- [ ] `npm run test:api` - API tests pass
- [ ] Database queries work correctly
- [ ] Authentication flows work

### E2E Tests (if applicable)
- [ ] `npm run test:e2e` - Critical paths tested
- [ ] User flows work end-to-end

---

## 🔒 Security & Authentication

### Environment Variables
- [ ] All required env vars are set
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is correct (not legacy ANON_KEY)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set (server-side only)
- [ ] No secrets in code or committed files
- [ ] `.env.example` is updated if new vars added

### Authentication
- [ ] `npm run test-auth` - Auth flows work
- [ ] Login/logout works correctly
- [ ] Session refresh works
- [ ] Role-based access is enforced

### RLS Policies
- [ ] `npm run verify:rls` - RLS policies are correct
- [ ] Users can only access their own data
- [ ] Admin access is properly restricted

---

## 🗄️ Database

### Migrations
- [ ] All migrations are applied
- [ ] Database schema is up to date
- [ ] No pending migrations

### Data Integrity
- [ ] Foreign keys are correct
- [ ] Indexes are optimized
- [ ] No orphaned records

### Backup
- [ ] Database backup strategy is in place
- [ ] Recovery plan is documented

---

## 🚀 Deployment Readiness

### Next.js Configuration
- [ ] `next.config.ts` is production-ready
- [ ] No debug flags enabled
- [ ] Image optimization is configured
- [ ] Output mode is correct (not standalone unless needed)

### Performance
- [ ] No console.log statements (except warn/error)
- [ ] Large dependencies are optimized
- [ ] Images are optimized
- [ ] Bundle size is reasonable

### Error Handling
- [ ] Error boundaries are in place
- [ ] API errors are handled gracefully
- [ ] User-friendly error messages
- [ ] Error logging is configured

---

## 📝 Documentation

### Code Documentation
- [ ] Complex logic is commented
- [ ] API routes have JSDoc comments
- [ ] Type definitions are clear

### User Documentation
- [ ] README is up to date
- [ ] Feature documentation is complete
- [ ] Migration guides (if applicable)

---

## 🔄 Git & Version Control

### Commit Quality
- [ ] Commits have clear, descriptive messages
- [ ] Commits are atomic (one feature per commit)
- [ ] No WIP commits in production branch

### Branch Status
- [ ] Feature branch is up to date with base branch
- [ ] No merge conflicts
- [ ] All changes are committed

### Pre-Commit Hooks
- [ ] Pre-commit hooks pass (lint + typecheck)
- [ ] No `--no-verify` commits (unless emergency)

---

## 🌐 Environment-Specific Checks

### Development
- [ ] Local dev server runs without errors
- [ ] Hot reload works correctly
- [ ] Environment variables are loaded

### Staging (if applicable)
- [ ] Staging environment is tested
- [ ] Staging matches production config
- [ ] Staging data is representative

### Production
- [ ] Production environment variables are set
- [ ] Production database is ready
- [ ] CDN/assets are configured
- [ ] Monitoring is set up

---

## 📊 Monitoring & Logging

### Logging
- [ ] Structured logging is in place
- [ ] Error logging works
- [ ] Log levels are appropriate
- [ ] No sensitive data in logs

### Monitoring
- [ ] Error tracking is configured (e.g., Sentry)
- [ ] Performance monitoring is set up
- [ ] Uptime monitoring is active

---

## 🧹 Code Cleanup

### Dead Code
- [ ] No unused imports
- [ ] No commented-out code
- [ ] No TODO comments (or they're tracked)

### Dependencies
- [ ] `npm audit` - No critical vulnerabilities
- [ ] Dependencies are up to date
- [ ] No duplicate dependencies

---

## ✅ Final Verification

### Manual Testing
- [ ] Critical user flows work
- [ ] UI is responsive
- [ ] No console errors in browser
- [ ] No network errors

### Review
- [ ] Code review completed (if applicable)
- [ ] All feedback addressed
- [ ] Stakeholder approval (if needed)

---

## 🚢 Push Commands

### For Feature Branch
```powershell
# Verify everything
npm run check:all

# Commit (if not already done)
git add -A
git commit -m "Descriptive commit message"

# Push
git push origin feature/your-branch
```

### For Production Merge
```powershell
# Ensure you're on main
git checkout main
git pull origin main

# Merge feature branch
git merge feature/your-branch

# Verify
npm run check:all

# Push
git push origin main
```

---

## 🆘 Emergency Procedures

### If Build Fails
1. Check error messages
2. Review recent changes
3. Run `npm run check` locally
4. Fix issues before pushing

### If Tests Fail
1. Run tests locally: `npm run test`
2. Check test output for details
3. Fix failing tests
4. Re-run full test suite

### If Deployment Fails
1. Check deployment logs
2. Verify environment variables
3. Check database connectivity
4. Review recent changes
5. Rollback if necessary

---

## 📋 Quick Checklist (Copy-Paste)

```
Pre-Push Checklist:
[ ] npm run typecheck
[ ] npm run lint
[ ] npm run build
[ ] npm run test (if applicable)
[ ] Environment variables verified
[ ] No console.log (except warn/error)
[ ] Error handling in place
[ ] Documentation updated
[ ] Git commits are clean
[ ] Manual testing completed
```

---

## 🎯 Post-Push

### Immediate Actions
- [ ] Monitor deployment logs
- [ ] Check error tracking
- [ ] Verify critical paths
- [ ] Test in production environment

### Follow-Up
- [ ] Monitor for 24-48 hours
- [ ] Check performance metrics
- [ ] Review user feedback
- [ ] Document any issues

---

## Summary

**Golden Rule**: 
> Never push to production without running `npm run check:all` first.

**Quick Command**:
```powershell
npm run check:all && git push origin feature/your-branch
```

This ensures:
- ✅ TypeScript compiles
- ✅ Linting passes
- ✅ Build succeeds
- ✅ Code is formatted

**Remember**: It's better to catch issues locally than in production! 🚀
