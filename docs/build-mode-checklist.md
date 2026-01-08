# Depo-Pro Build Mode Checklist

**Purpose**: Ensure repository stability before and during feature development.

---

## Before Feature Work

### Pre-Development Verification

- [ ] CI is green on main branch
  - Check: https://github.com/[org]/depo-pro/actions
  - All workflows must pass (CI, version-guard, quality-gates)

- [ ] Next.js version == 15.0.3
  - Run: `npm run check:version`
  - Expected: `✅ Next.js version OK (15.0.3): 15.0.3`

- [ ] package-lock.json committed
  - Check: `git status` shows no uncommitted `package-lock.json`
  - Lockfile must be in sync with `package.json`

- [ ] No disabled CI checks
  - Verify: All GitHub Actions workflows are enabled
  - No `continue-on-error: true` on critical checks

- [ ] Vercel deploy passes
  - Check: Latest Vercel deployment succeeded
  - No build errors or version mismatches

- [ ] No experimental flags enabled
  - Check: `next.config.ts` has no experimental features
  - No `--experimental-*` flags in build scripts

---

## Feature Work Rules

### ❌ Do NOT

- ❌ **Do not upgrade Next.js**
  - Next.js is locked to 15.0.3
  - Upgrades require separate approval process (see `/docs/nextjs-upgrade-plan.md`)

- ❌ **Do not change build tooling**
  - Do not modify `next.config.ts` build settings
  - Do not change webpack configuration
  - Do not add experimental flags

- ❌ **Do not bypass version checks**
  - Do not modify `scripts/check-next-version.js`
  - Do not disable CI workflows
  - Do not use `--force` to override version checks

- ❌ **Do not commit without CI passing**
  - All PRs must pass CI before merge
  - Do not merge with failing checks

### ✅ DO

- ✅ **Feature-only commits**
  - Focus on application features
  - Follow existing patterns
  - Maintain code quality standards

- ✅ **Run checks locally**
  - `npm run check:version` before commit
  - `npm run lint` before commit
  - `npm run typecheck` before commit
  - `npm run build` before commit

- ✅ **Keep lockfile in sync**
  - Commit `package-lock.json` with dependency changes
  - Run `npm ci` (not `npm install`) in CI

- ✅ **Follow upgrade plan for Next.js**
  - See `/docs/nextjs-upgrade-plan.md`
  - Create feature branch
  - Get approval before merging

---

## If CI Fails

### Stop Feature Work

**Immediate Actions**:

1. **Stop all feature commits**
   - Do not push new features
   - Do not merge PRs

2. **Identify failure type**:
   - Version mismatch → Check `package.json` and `package-lock.json`
   - Build failure → Check build logs
   - Test failure → Check test output
   - Lint failure → Run `npm run lint:fix`

3. **Fix build first**:
   - Fix version issues (if any)
   - Fix build errors
   - Fix test failures
   - Fix lint errors

4. **Verify locally**:
   ```bash
   npm ci
   npm run check:version
   npm run lint
   npm run typecheck
   npm run build
   ```

5. **Push fix to main**:
   - Create fix commit
   - Ensure CI passes
   - Resume feature work only after CI is green

### Common Failure Scenarios

#### Version Mismatch
```
❌ Next.js version mismatch in package.json
   Detected: ^16.1.1
   Required: 15.0.3
```
**Fix**: Update `package.json` to `"next": "15.0.3"` (exact, no caret), then `npm ci`

#### Build Failure
```
error: unknown option '--webpack'
```
**Fix**: Remove `--webpack` flag from build script (Next.js 15 doesn't support it)

#### Lockfile Out of Sync
```
❌ Next.js resolved version mismatch in package-lock.json
```
**Fix**: Delete `package-lock.json` and `node_modules`, then `npm install`

---

## Emergency Procedures

### If Version Drift Occurs

1. **Immediate**: Revert any commits that changed `package.json` or `package-lock.json`
2. **Verify**: Run `npm run check:version`
3. **Fix**: Update `package.json` to exact version, regenerate lockfile
4. **Test**: Run full CI locally
5. **Deploy**: Push fix to main, verify CI passes

### If Build Breaks

1. **Check**: Review build logs for specific error
2. **Isolate**: Identify which change caused the break
3. **Revert**: If necessary, revert the breaking commit
4. **Fix**: Apply fix in separate commit
5. **Verify**: Ensure CI passes before resuming work

---

## Daily Checklist

Before starting work each day:

- [ ] Pull latest from main
- [ ] Run `npm ci` to sync dependencies
- [ ] Run `npm run check:version` to verify version
- [ ] Check CI status on main branch
- [ ] Verify no breaking changes in latest commits

---

## Weekly Checklist

Once per week:

- [ ] Review CI metrics (pass rate, build times)
- [ ] Check for dependency updates (security only)
- [ ] Verify Vercel deployments are successful
- [ ] Review version guard logs for any warnings

---

## Pre-Release Checklist

Before any release:

- [ ] All CI checks passing
- [ ] Version locked to 15.0.3
- [ ] Lockfile committed and synced
- [ ] Build succeeds locally and in CI
- [ ] Vercel deployment successful
- [ ] No experimental flags
- [ ] All tests passing

---

**Remember**: Build stability is non-negotiable. Fix build issues before feature work.