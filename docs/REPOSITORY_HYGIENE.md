# Repository Hygiene: Docs & Scripts Governance

**Purpose:** Enforce and maintain strict repository hygiene for documentation and scripts  
**Audience:** Developers, AI assistants, future maintainers  
**Last Updated:** 2025-01-XX

---

## 🚫 GLOBAL RULES (DO NOT VIOLATE)

1. ❌ **NEVER** create or leave `.md` files in the repository root
2. ❌ **NEVER** create ad-hoc PowerShell (`.ps1`) scripts in the repo root
3. ❌ **NEVER** overwrite files without explicit confirmation
4. ❌ **NEVER** delete files unless explicitly instructed
5. ✅ **ALWAYS** use `git mv` for tracked files to preserve history
6. ✅ **ALWAYS** present a classification table before making changes

---

## 📚 DOCUMENTATION POLICY

### Long-Lived Documentation → `/docs/`

These files are stable, reference documentation that should remain accessible:

**Structure:**
```
docs/
├── auth/              # Authentication architecture, keys, policies
├── deployment/        # Production deployment guides, checklists
├── environment/       # Environment variable configuration
├── architecture/      # System architecture, design decisions
└── security/          # Security policies, incident response
```

**Examples:**
- `AUTH-ARCHITECTURE.md` → `docs/auth/AUTH-ARCHITECTURE.md`
- `PRODUCTION_DEPLOYMENT_CHECKLIST.md` → `docs/deployment/PRODUCTION_DEPLOYMENT_CHECKLIST.md`
- `ENV_SECURITY.md` → `docs/environment/ENV_SECURITY.md`

### Temporary / Incident Documentation → `/docs/_archive/`

These files document incidents, debugging sessions, or temporary fixes:

**Structure:**
```
docs/_archive/
└── <incident-name-or-year>/
    └── *.md
```

**Examples:**
- `AUTH_HARDENING_COMPLETE.md` → `docs/_archive/auth-incident-2026/AUTH_HARDENING_COMPLETE.md`
- `CRITICAL_KEY_FIX.md` → `docs/_archive/auth-incident-2026/CRITICAL_KEY_FIX.md`
- `MIDDLEWARE_401_FIX.md` → `docs/_archive/auth-incident-2026/MIDDLEWARE_401_FIX.md`

**Classification Criteria:**
- ✅ **Archive if:** Documents a specific incident, debugging session, or temporary fix
- ✅ **Archive if:** Contains "FIX", "COMPLETE", "REPORT", "AUDIT" in filename
- ✅ **Archive if:** Documents a one-time migration or remediation
- ❌ **Keep if:** Provides ongoing reference value (architecture, policies, guides)

---

## 🧰 SCRIPT POLICY

### Active Development Scripts → `/scripts/dev/`

Scripts used regularly during development:

**Examples:**
- `hard-restart.ps1` → `scripts/dev/hard-restart.ps1`
- `fix-env-format.ps1` → `scripts/dev/fix-env-format.ps1`
- `cleanup-unsafe-env.ps1` → `scripts/dev/cleanup-unsafe-env.ps1`
- `validate-env-format.ps1` → `scripts/dev/validate-env-format.ps1`

### Security / Compliance Scripts → `/scripts/security/`

Scripts that verify security, compliance, or configuration:

**Examples:**
- `verify-supabase-security.ps1` → `scripts/security/verify-supabase-security.ps1`
- `verify-publishable-key.ps1` → `scripts/security/verify-publishable-key.ps1`
- `verify-rls.ts` → `scripts/security/verify-rls.ts`

### Legacy / Debug Scripts → `/scripts/archive/`

One-off scripts, debug utilities, or legacy code:

**Examples:**
- `fix-supabase-auth.ps1` → `scripts/archive/fix-supabase-auth.ps1`
- `debug.ps1` → `scripts/archive/debug.ps1`
- `audit-supabase-config.ps1` → `scripts/archive/audit-supabase-config.ps1`
- `dev-env-check.ts` → `scripts/archive/dev-env-check.ts`

### Temporary Folders → `/scripts/archive/`

Sandbox, test, or temporary directories:

**Examples:**
- `test/` → `scripts/archive/test-sandbox/test`
- `supabase/.temp/` → `scripts/archive/supabase-temp/.temp`

---

## 🔄 PROCESS REQUIREMENTS

### Step 1: Scan Repository

Identify all files that need classification:

```bash
# Find all markdown files
find . -name "*.md" -not -path "./node_modules/*" -not -path "./.next/*"

# Find all PowerShell scripts
find . -name "*.ps1" -not -path "./node_modules/*"

# Find TypeScript scripts (non-app runtime)
find ./scripts -name "*.ts" -type f
```

### Step 2: Build Classification Table

Create a table showing:
- Original path
- Proposed destination
- Classification (docs/auth, docs/_archive, scripts/dev, etc.)

**Example:**
| Original Path | New Path | Classification |
|--------------|----------|----------------|
| `AUTH-ARCHITECTURE.md` | `docs/auth/AUTH-ARCHITECTURE.md` | docs/auth |
| `AUTH_HARDENING_COMPLETE.md` | `docs/_archive/auth-incident-2026/AUTH_HARDENING_COMPLETE.md` | archive |
| `scripts/hard-restart.ps1` | `scripts/dev/hard-restart.ps1` | scripts/dev |

### Step 3: Verify Target Directories

Check if target directories exist, create if missing:

```powershell
# Create directories if they don't exist
New-Item -ItemType Directory -Path "docs/auth" -Force
New-Item -ItemType Directory -Path "docs/_archive/auth-incident-2026" -Force
New-Item -ItemType Directory -Path "scripts/security" -Force
# etc.
```

### Step 4: Check for Conflicts

Verify no files already exist at target locations:

```powershell
# Check for existing files
if (Test-Path "docs/auth/AUTH-ARCHITECTURE.md") {
    Write-Host "WARNING: Target file already exists"
}
```

### Step 5: Execute Moves

**For tracked files (in Git):**
```bash
git mv <source> <destination>
```

**For untracked files:**
```powershell
Move-Item -Path <source> -Destination <destination> -Force
git add <destination>
```

### Step 6: Verify and Stage

```bash
git status --short
git add -A  # Stage all changes
```

### Step 7: Present Summary

Show:
- Total files moved
- Breakdown by classification
- Any conflicts or issues
- Ready for commit status

---

## 📋 CURSOR AI PROMPT TEMPLATE

Use this exact prompt when requesting repository organization:

```
You are acting as a Senior Repository Architect.

Your task is to enforce and maintain strict repository hygiene for documentation and scripts.

GLOBAL RULES (DO NOT VIOLATE):

1. ❌ NEVER create or leave .md files in the repository root.
2. ❌ NEVER create ad-hoc PowerShell (.ps1) scripts in the repo root.
3. ❌ NEVER overwrite files without explicit confirmation.

DOCUMENTATION POLICY:

• Long-lived documentation MUST go under:
  /docs/
    /auth/
    /deployment/
    /environment/
    /architecture/
    /security/

• Temporary, investigative, or incident-related documentation MUST go under:
  /docs/_archive/<incident-name-or-year>/

• If a .md file already exists:
  - Classify it as LONG-LIVED or ARCHIVED
  - Propose the destination path
  - Use `git mv` for all moves

SCRIPT POLICY:

• Active development scripts → /scripts/dev/
• Security or compliance scripts → /scripts/security/
• Debug, legacy, or one-off scripts → /scripts/archive/

• Temp folders (e.g. test/, sandbox/, scratch/) → /scripts/archive/

PROCESS REQUIREMENTS:

1. Scan the repository for:
   - *.md
   - *.ps1
   - *.ts scripts not part of app runtime
2. Build a classification table BEFORE making changes.
3. Check if target directories already exist.
4. Check for filename conflicts.
5. Use ONLY `git mv` for moves.
6. DO NOT commit automatically.
7. Present a confirmation summary before proceeding.

OUTPUT FORMAT REQUIRED:

1. Classification summary table
2. File move plan (source → destination)
3. Confirmation prompt:
   "Proceed with these moves using git mv?"

If anything is ambiguous, STOP and ask for clarification.
```

---

## ✅ SUCCESS CRITERIA

After organization:

- ✅ Repository root contains **zero** loose `.md` files
- ✅ Repository root contains **zero** loose `.ps1` files
- ✅ All documentation is in `/docs/` or `/docs/_archive/`
- ✅ All scripts are in `/scripts/dev/`, `/scripts/security/`, or `/scripts/archive/`
- ✅ Git history is preserved (tracked files used `git mv`)
- ✅ No files were deleted
- ✅ No files were overwritten
- ✅ All changes are staged and ready for commit

---

## 🚨 COMMON VIOLATIONS TO PREVENT

1. **Creating docs in root:**
   - ❌ `FIX_SUMMARY.md` in root
   - ✅ `docs/_archive/incident-2026/FIX_SUMMARY.md`

2. **Leaving scripts in root:**
   - ❌ `debug.ps1` in root
   - ✅ `scripts/archive/debug.ps1`

3. **Mixing long-lived and temporary docs:**
   - ❌ All docs in one folder
   - ✅ Long-lived in `/docs/`, temporary in `/docs/_archive/`

4. **Not preserving Git history:**
   - ❌ `mv file.md docs/file.md` (loses history)
   - ✅ `git mv file.md docs/file.md` (preserves history)

---

## 📝 COMMIT MESSAGE TEMPLATE

After organization, commit with:

```bash
git commit -m "docs(repo): organize documentation and scripts"
```

Or split into logical commits:

```bash
git commit -m "docs(repo): organize long-lived documentation"
git commit -m "docs(repo): archive incident documentation"
git commit -m "chore(scripts): organize scripts by category"
```

---

## 🔄 MAINTENANCE

**When to apply this governance:**

- After major incidents (archive incident docs)
- When onboarding new developers (organize their docs)
- Quarterly repository hygiene reviews
- Before major releases (clean up temporary files)
- When AI assistants create files in wrong locations

**Review frequency:** Quarterly or after major incidents

---

**Remember:** Clean repository structure is a sign of professional engineering. This governance ensures consistency and maintainability.
