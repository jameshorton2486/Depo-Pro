# Environment Variable Security Guide

## ⚠️ CRITICAL: Remove Unsafe .env Files

### Files That MUST Be Deleted

The following files are **security risks** and should be removed immediately:

1. **`.env`** (if exists)
   - ❌ **NEVER** use `.env` in Next.js projects
   - ❌ Can be accidentally committed to git
   - ✅ Use `.env.local` instead (already in `.gitignore`)

2. **`.env.local.backup`** (if exists)
   - ❌ Contains real secrets
   - ❌ Backup files can be accidentally committed
   - ✅ Use secure password manager or encrypted storage instead

3. **`.env.production`** (if exists locally)
   - ❌ Production secrets should NEVER be in local files
   - ✅ Use Vercel/cloud provider env vars only

### Safe Files (Keep These)

- ✅ **`.env.local`** - Your actual secrets (in `.gitignore`)
- ✅ **`.env.example`** - Template with placeholders (safe to commit)

---

## 🔒 How to Remove Unsafe Files

### PowerShell (Windows)

```powershell
# Run the cleanup script
.\scripts\cleanup-unsafe-env.ps1

# Or manually:
Remove-Item .env -ErrorAction SilentlyContinue
Remove-Item .env.local.backup -ErrorAction SilentlyContinue
Remove-Item .env.production -ErrorAction SilentlyContinue
```

### Bash (Linux/Mac)

```bash
# Remove unsafe files
rm -f .env
rm -f .env.local.backup
rm -f .env.production
```

---

## ✅ Expected Result

After cleanup, you should only have:

```
.env.local          (your actual secrets - in .gitignore)
.env.example        (template - safe to commit)
```

---

## 🚨 If You Accidentally Committed Secrets

If you accidentally committed `.env` or `.env.local` to git:

1. **Immediately rotate all keys**
2. **Remove from git history** (coordinate with team)
3. **Force push** (after team coordination)
4. **Verify `.gitignore`** includes `.env*` patterns

---

**Last Updated:** 2025-01-XX
