# Cursor-Safe Git Workflow

## Overview

This guide provides a reliable Git workflow optimized for use with Cursor AI and Windows environments, avoiding common subprocess and pipe creation errors.

## The Problem

On Windows, AI tools (like Cursor) sometimes fail when running Git commands due to:
- Signal pipe creation issues (`ENOENT`, `Win32 error 5`)
- Non-interactive subprocess limitations
- Antivirus/security software interference

## The Solution

**Use a hybrid approach**: Let Cursor edit files, you handle Git operations.

---

## Recommended Workflow

### ✅ Phase 1: Let Cursor Edit

1. **Tell Cursor what to change**
   ```
   "Update the dashboard to use the new loading components"
   ```

2. **Cursor makes the edits**
   - Files are modified
   - Changes are saved to disk
   - No Git operations needed yet

3. **Verify changes**
   ```powershell
   git status
   git diff
   ```

### ✅ Phase 2: You Handle Git

**Option A: PowerShell (Recommended)**
```powershell
cd C:\Users\james\depo-pro
git add -A
git commit -m "Your commit message"
git push origin feature/your-branch
```

**Option B: Git Bash**
```bash
git add -A
git commit -m "Your commit message"
git push origin feature/your-branch
```

**Option C: VS Code Git UI**
- Use Source Control panel
- Stage changes
- Commit with message
- Push via UI

---

## Quick Reference Commands

### Check Status
```powershell
git status
git status --short
```

### Stage Changes
```powershell
git add -A                    # All changes
git add app/                  # Specific directory
git add app/page.tsx          # Specific file
```

### Commit
```powershell
git commit -m "Descriptive message"
```

### Push
```powershell
git push origin feature/your-branch
git push origin main          # If on main
```

### Pull & Sync
```powershell
git pull origin feature/your-branch
git fetch origin
git status
```

---

## When Cursor Git Commands Fail

### Symptoms
- `fatal error - couldn't create signal pipe`
- `Win32 error 5`
- `ENOENT` errors during commit

### Solution
1. **Don't retry** - The issue is environmental, not your code
2. **Check what's staged**:
   ```powershell
   git status
   ```
3. **Commit manually** (see Phase 2 above)
4. **Verify success**:
   ```powershell
   git log --oneline -1
   ```

---

## Branch Strategy

### Feature Branches
```powershell
# Create feature branch
git checkout -b feature/wkt-quiz-module

# Work on feature
# ... make changes ...

# Commit and push
git add -A
git commit -m "WKT: Add practice mode"
git push origin feature/wkt-quiz-module
```

### Main Branch Protection
- Never commit directly to `main`
- Always use feature branches
- Create PRs for review
- Merge after approval

---

## Pre-Commit Checks

Our pre-commit hook automatically runs:
- `npm run lint` - ESLint checks
- `npm run typecheck` - TypeScript validation

**To skip (not recommended):**
```powershell
git commit --no-verify -m "Emergency fix"
```

**To run manually:**
```powershell
npm run lint
npm run typecheck
npm run build
```

---

## Troubleshooting

### "Nothing to commit"
- Changes might already be committed
- Check `git log --oneline -5`
- Verify files are saved in your editor

### "Working tree clean" but you see changes
- Files might be unsaved in editor
- Save all files first
- Check `git diff` to see unstaged changes

### Merge Conflicts
```powershell
# Pull latest
git pull origin feature/your-branch

# Resolve conflicts in editor
# Then:
git add .
git commit -m "Resolve merge conflicts"
git push
```

### Undo Last Commit (Keep Changes)
```powershell
git reset --soft HEAD~1
```

### Undo Last Commit (Discard Changes)
```powershell
git reset --hard HEAD~1  # ⚠️ Destructive!
```

---

## Best Practices

1. **Commit Often**
   - Small, logical commits
   - Clear commit messages
   - One feature per commit

2. **Test Before Commit**
   ```powershell
   npm run typecheck
   npm run lint
   ```

3. **Write Good Messages**
   ```
   ✅ Good: "WKT: Add practice mode with category filters"
   ❌ Bad: "fix stuff"
   ```

4. **Pull Before Push**
   ```powershell
   git pull origin feature/your-branch
   git push origin feature/your-branch
   ```

5. **Use Feature Branches**
   - Keep `main` stable
   - Isolate work
   - Enable easy rollback

---

## Cursor Integration Tips

### What Cursor Does Well
- ✅ File editing
- ✅ Code generation
- ✅ Refactoring
- ✅ Reading codebase

### What You Should Do
- ✅ Git commits
- ✅ Git pushes
- ✅ Branch management
- ✅ Conflict resolution

### Hybrid Approach
1. **Cursor**: "Update all WKT pages to use loading skeletons"
2. **You**: Review changes, test locally
3. **You**: `git add -A && git commit -m "WKT: Add loading states"`
4. **You**: `git push origin feature/wkt-quiz-module`

---

## Emergency Procedures

### Need to Commit But Pre-Commit Failing
```powershell
# Fix issues first (recommended)
npm run lint:fix
npm run typecheck

# Or skip (only if urgent)
git commit --no-verify -m "Emergency: Fix critical bug"
```

### Accidentally Committed to Wrong Branch
```powershell
# Move commit to correct branch
git log --oneline -1  # Note commit hash
git reset --soft HEAD~1
git checkout correct-branch
git cherry-pick <commit-hash>
```

### Need to Undo Everything
```powershell
# See what would change
git status

# Discard all uncommitted changes
git reset --hard HEAD

# ⚠️ This is destructive - use carefully!
```

---

## Summary

**The Golden Rule**: 
> Let Cursor edit, you commit.

This workflow:
- ✅ Avoids Windows subprocess issues
- ✅ Gives you control over Git history
- ✅ Prevents accidental commits
- ✅ Works reliably on all systems

**Quick Workflow:**
1. Cursor edits files
2. You run `git status` to review
3. You run `git add -A && git commit -m "message"`
4. You run `git push origin branch-name`

Done! 🎉
