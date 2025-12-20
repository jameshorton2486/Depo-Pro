# Branch Protection Rules Setup Guide

This guide walks you through setting up branch protection rules for the `main` branch in GitHub.

## Why Branch Protection?

Branch protection rules help maintain code quality by:
- Requiring pull request reviews before merging
- Ensuring all tests pass before merging
- Preventing force pushes to main
- Requiring up-to-date branches

## Setup Steps

### 1. Navigate to Branch Settings

1. Go to your repository on GitHub
2. Click **Settings** (top navigation)
3. Click **Branches** (left sidebar)

### 2. Add Branch Protection Rule

1. Click **Add rule** or **Add branch protection rule**
2. In **Branch name pattern**, enter: `main`

### 3. Configure Protection Settings

Enable the following settings:

#### ✅ Required Settings

- [x] **Require a pull request before merging**
  - [x] Require approvals: **1**
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [x] Require review from Code Owners (if you have CODEOWNERS file)

- [x] **Require status checks to pass before merging**
  - [x] Require branches to be up to date before merging
  - Select required status checks:
    - [x] `typecheck` (TypeScript validation)
    - [x] `lint` (ESLint checks)
    - [x] `build` (Build verification)

- [x] **Require conversation resolution before merging**
  - Ensures all PR comments are addressed

#### ⚠️ Recommended Settings

- [x] **Do not allow bypassing the above settings**
  - Prevents admins from accidentally merging without checks

- [x] **Restrict who can push to matching branches**
  - Only allow repository administrators
  - Or create a "Maintainers" team

- [x] **Require linear history**
  - Prevents merge commits (keeps history clean)

- [ ] **Require signed commits** (optional)
  - Only enable if all contributors use GPG signing

### 4. Save the Rule

Click **Create** or **Save changes** at the bottom of the page.

## Verification

### Test the Protection Rules

1. Create a test branch:
   ```bash
   git checkout -b test/branch-protection
   ```

2. Make a small change and commit:
   ```bash
   echo "# Test" >> TEST.md
   git add TEST.md
   git commit -m "test: verify branch protection"
   git push origin test/branch-protection
   ```

3. Create a Pull Request:
   - Go to GitHub → Pull Requests → New PR
   - Select your test branch → main
   - Try to merge without review (should be blocked)

4. Clean up:
   - Delete the test branch after verification

## Status Checks Setup

For status checks to work, ensure your CI/CD is configured:

### GitHub Actions (Recommended)

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run typecheck
        name: TypeScript Check

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
        name: ESLint

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
        name: Build
```

### Alternative: Use Pre-commit Hooks

If you're not using CI/CD, you can rely on pre-commit hooks (already configured with Husky):

```bash
# Already configured in package.json
"prepare": "husky"
```

## Troubleshooting

### Status Checks Not Showing

**Problem:** Status checks don't appear in PR

**Solutions:**
1. Ensure CI/CD is running (GitHub Actions, CircleCI, etc.)
2. Check that status checks are named exactly: `typecheck`, `lint`, `build`
3. Wait a few minutes for checks to complete
4. Check Actions tab for any failures

### Can't Merge Even After Approval

**Problem:** PR shows "Merging is blocked"

**Solutions:**
1. Check that all required status checks passed
2. Ensure branch is up to date with main
3. Verify all conversations are resolved
4. Check if there are merge conflicts

### Need to Bypass (Emergency Only)

If you need to bypass protection rules in an emergency:

1. Go to Settings → Branches
2. Temporarily disable the rule
3. Merge the PR
4. Re-enable the rule immediately

**⚠️ Warning:** Only do this in true emergencies. Always re-enable protection immediately.

## Best Practices

1. **Never disable protection rules permanently**
   - Always re-enable after emergency bypasses

2. **Require at least 1 reviewer**
   - Even for small changes
   - Prevents accidental merges

3. **Keep status checks fast**
   - Optimize CI/CD pipelines
   - Use caching where possible

4. **Document exceptions**
   - If certain checks are flaky, document why
   - Consider fixing the root cause

5. **Review protection rules periodically**
   - Update as project grows
   - Add new checks as needed

## Summary

✅ **Required:**
- PR reviews (1 approval)
- Status checks (typecheck, lint, build)
- Up-to-date branches
- Conversation resolution

⚠️ **Recommended:**
- No bypassing rules
- Restrict push access
- Linear history

🎯 **Result:**
- Higher code quality
- Fewer bugs in production
- Better collaboration
- Professional workflow

---

**Need help?** Open an issue or discussion on GitHub.

