# Depo-Pro Pre-Build Stabilization Report

**Date**: 2026-01-09  
**Status**: ✅ **COMPLETE**  
**Next.js Version**: 15.0.3 (locked)

---

## Root Cause

### Confirmed Failure Chain

1. **Version Mismatch**: package.json declared "next": "^16.1.1" while CI required exactly 15.0.3
2. **Cascading Failures**:
   - CI version guard failed
   - Build failed (Next.js 16 incompatible flags)
   - Vercel deploy failed
   - TypeScript compilation errors from version mismatch

### Exact Failure Explanation

- **CI Failure**: Version guard script detected ^16.1.1 in package.json, required 15.0.3
- **Build Failure**: Next.js 16.1.1 was installed, but build script used --webpack flag (not supported in Next.js 15)
- **Lockfile Drift**: package-lock.json resolved to 16.1.1 despite CI requirements
- **Transitive Dependencies**: ESLint plugins (@next/eslint-plugin-next, slint-config-next) were on 16.1.1, pulling in incompatible versions

---

## Policy

### Why Next.js 15.0.3 is Locked

1. **Stability**: Next.js 15.0.3 is the tested, stable version for Depo-Pro
2. **CI Requirements**: All CI workflows enforce 15.0.3 exactly
3. **Compatibility**: Application code, middleware, and build tooling are validated against 15.0.3
4. **Legal Industry Standards**: Production stability is critical for legal transcription SaaS

### Who Can Change It

- **Principal Engineer** or **Release Governance Lead** only
- Requires:
  - Full breaking-change audit
  - Test plan execution
  - Rollback plan documentation
  - Approval from technical leadership

### How to Change It Safely

See /docs/nextjs-upgrade-plan.md for complete upgrade procedure.

**Short version**:
1. Create feature branch: eat/upgrade-nextjs-16
2. Follow upgrade plan checklist
3. Run full test suite
4. Get approval
5. Merge to main only after all checks pass

**Do NOT upgrade Next.js on main branch.**

---

## Enforcement

### Where Checks Live

1. **scripts/check-next-version.js** (Primary enforcement)
   - Checks package.json declares 15.0.3 exactly (no caret/range)
   - Verifies package-lock.json resolves to 15.0.3
   - Checks installed version via 
pm list
   - Clear error messages with fix instructions

2. **.github/workflows/version-guard.yml** (CI enforcement)
   - Runs on all PRs and pushes to main
   - Calls 
pm run check:version
   - Blocks merge if version mismatch

3. **.github/workflows/ci.yml** (CI verification)
   - Runs version check before build
   - Fails build if version mismatch
   - Includes preflight diagnostics

4. **.github/workflows/quality-gates.yml** (Quality gates)
   - Includes version check in lint/typecheck job
   - Includes preflight diagnostics

### What They Validate

- ✅ package.json declares "next": "15.0.3" (exact, no caret)
- ✅ package-lock.json resolves to 15.0.3
- ✅ Installed version is 15.0.3
- ✅ No unstable versions (canary, beta, latest)
- ✅ No version ranges (^, ~, >=, etc.)

---

## Fixes Applied

### File: package.json
**Changes**:
- "next": "^16.1.1" → "next": "15.0.3" (exact pinning)
- "@next/eslint-plugin-next": "^16.1.1" → "@next/eslint-plugin-next": "^15.0.3"
- "eslint-config-next": "^16.1.1" → "eslint-config-next": "^15.0.3"
- "build": "next build --webpack" → "build": "next build" (removed unsupported flag)

**Rationale**: Exact version pinning prevents drift. Removed --webpack flag (not supported in Next.js 15).

### File: package-lock.json
**Changes**: Regenerated to resolve Next.js 15.0.3 exactly

**Rationale**: Lockfile must match declared version to prevent transitive dependency conflicts.

### File: scripts/check-next-version.js
**Changes**: Enhanced to check:
- Declared version in package.json
- Resolved version in package-lock.json
- Installed version via 
pm list
- Clear error messages with fix instructions

**Rationale**: Multi-layer validation catches drift at any stage.

### File: .github/workflows/ci.yml
**Changes**: 
- Added preflight diagnostics step before enforcement
- Diagnostics log Node version, Next.js version, lockfile hash, build command
- Version check runs before build

**Rationale**: Surface environment mismatches before failure, eliminate ambiguity.

### File: .github/workflows/version-guard.yml
**Changes**: 
- Added preflight diagnostics
- Uses 
pm run check:version for consistency
- Runs 
pm ci before version check

**Rationale**: Single source of truth for version checking, consistent with other workflows.

### File: .github/workflows/quality-gates.yml
**Changes**: 
- Added version check to lint/typecheck job
- Added preflight diagnostics

**Rationale**: Ensure version compliance in all CI paths.

---

## CI Improvements

### Diagnostics Added

All CI workflows now include preflight diagnostics that log:
- Node version
- Declared Next.js version
- Lockfile hash (first 16 chars)
- Build command

**Purpose**: Surface mismatches before enforcement, eliminate "why did this fail?" ambiguity.

**Implementation**: Diagnostics run before enforcement, log only (no secrets), never block builds by themselves.

### Enforcement Hardened

- Version check runs in all CI workflows
- Single source of truth: scripts/check-next-version.js
- Clear error messages with fix instructions
- Checks declared, resolved, and installed versions
- No duplicate or redundant checks (consolidated to single script)

---

## Final Version Matrix

| Component | Version | Status |
|-----------|---------|--------|
| Next.js | 15.0.3 | ✅ Locked (exact) |
| Node.js | 20.x | ✅ CI standard |
| @next/eslint-plugin-next | ^15.0.3 | ✅ Aligned |
| eslint-config-next | ^15.0.3 | ✅ Aligned |
| CI | GitHub Actions | ✅ Enforced |
| Vercel | Auto (npm ci + npm run build) | ✅ Aligned |

---

## Vercel Configuration

### Current Setup

- **Build Command**: 
pm run build (matches CI)
- **Install Command**: 
pm ci (matches CI, default Vercel behavior)
- **No Overrides**: ercel.json contains only cron jobs, no build overrides
- **No Auto-Upgrade**: Vercel respects package.json and package-lock.json

### Verification

- ✅ ercel.json has no uildCommand override
- ✅ No environment variables forcing Next.js version
- ✅ Vercel will use 
pm ci + 
pm run build (matches CI)
- ✅ No NEXT_PUBLIC_* or NEXT_* env vars override Next.js version

---

## Status

### ✅ CI Green
- Version guard passes
- All workflows include diagnostics
- Enforcement is consistent across all CI paths
- No duplicate or redundant checks

### ✅ Version Drift Eliminated
- Exact pinning in package.json
- Lockfile matches declared version
- Multi-layer validation prevents silent drift

### ✅ Build Mode Enabled
- All checks pass
- Build succeeds
- No experimental flags

### ✅ CI/Verify Cascade Fixed
- Version check runs before build
- Clear failure messages
- Deterministic exit behavior
- No redundant checks

### ✅ Vercel Aligned
- Build command matches CI
- No auto-upgrade behavior
- Respects package-lock.json

### 🚫 Feature Work Allowed
- Repository is stable
- CI is deterministic
- Version is locked
- Safe to proceed with feature development

---

## Next Steps

1. ✅ **Complete**: Version normalization
2. ✅ **Complete**: CI diagnostics
3. ✅ **Complete**: Enforcement hardening
4. ✅ **Complete**: CI/verify cascade fixes
5. ✅ **Complete**: Vercel alignment
6. 📋 **Documented**: Upgrade plan (/docs/nextjs-upgrade-plan.md)
7. 📋 **Documented**: Build checklist (/docs/build-mode-checklist.md)

---

**This repository is now in Build Mode. Feature development can proceed safely.**
