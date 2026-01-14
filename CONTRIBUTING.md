# Contributing to Depo-Pro

Thank you for contributing to Depo-Pro.
This project follows strict engineering and documentation standards.

---

## 🧭 Repository Standards

### 📁 Documentation

- ❌ **Do NOT** place `.md` files in the repository root
- ✅ All documentation lives under `/docs`
- ✅ Temporary or investigative docs go in `/docs/_archive/`
- ❌ **Do NOT** overwrite documentation without review
- ✅ Long-lived docs must be linked from `/docs/README.md`

**Allowed root-level markdown files:**
- `README.md` (project overview)
- `LICENSE` (legal)
- `CONTRIBUTING.md` (this file)

**All other `.md` files must be under `/docs`**

### 🧪 Scripts

- `/scripts/dev` → development utilities
- `/scripts/security` → security & compliance tools
- `/scripts/archive` → debug, legacy, one-off scripts
- ❌ **No scripts in the repo root**

**Forbidden in root:**
- `debug*.ps1`
- `fix-*.ps1`
- `*_debug.ps1`

### 🔄 Git Practices

- Use `git mv` for file reorganization (preserves history)
- Keep commits small and focused
- Separate:
  - code changes
  - documentation updates
  - tooling/scripts

### 🚨 Forbidden Actions

- Creating ad-hoc scripts in root
- Leaving debug files committed
- Mixing unrelated changes in one commit
- Bypassing lint, typecheck, or CI
- Creating documentation outside `/docs`

---

## 🛡 Security-Sensitive Areas

Extra care is required when modifying:

- Authentication
- Environment variables
- Supabase configuration
- Scripts touching secrets or keys

**Explain why before changing how.**

---

## 🤖 AI Usage Policy

AI assistants (Cursor, GitHub Copilot, etc.) must follow these rules:

- ✅ Follow repository structure rules
- ✅ Use `git mv` for tracked files
- ✅ Place files in correct directories
- ❌ Violations will be rejected in review

**Cursor rules are authoritative** - see `.cursor/rules/repo-hygiene.mdc`

---

## 📋 Pull Request Checklist

Before submitting a PR, verify:

- [ ] No root `.md` files created (except allowed ones)
- [ ] Documentation linked from `/docs/README.md` (if long-lived)
- [ ] Scripts placed correctly (`/scripts/{dev|security|archive}`)
- [ ] No temp/debug files committed
- [ ] No files in root that should be organized
- [ ] CI passes (includes repo hygiene checks)
- [ ] Git history is clean and readable

---

## 🔍 Enforcement

This repository uses **three layers of enforcement**:

1. **GitHub Actions** (`.github/workflows/repo-hygiene.yml`)
   - Blocks PRs with violations
   - Runs on every push to main

2. **Pre-commit Hook** (`.husky/pre-commit`)
   - Blocks commits locally
   - Runs before every commit

3. **VS Code Workspace** (`.vscode/settings.json`)
   - Guides before mistakes happen
   - Hides scratch files from explorer

**These checks cannot be bypassed.**

---

## 📚 Documentation Structure

See `/docs/README.md` for the complete documentation index.

**Key directories:**
- `/docs/auth/` - Authentication architecture
- `/docs/deployment/` - Deployment guides
- `/docs/environment/` - Environment configuration
- `/docs/_archive/` - Incident reports (read-only)

---

## 🆘 Need Help?

- See `docs/REPOSITORY_HYGIENE.md` for detailed organization rules
- See `.cursor/rules/repo-hygiene.mdc` for AI behavior rules
- Ask in PR comments if unsure about file placement

---

By contributing, you agree to uphold these standards.

**Remember:** Clean repository structure is a sign of professional engineering.
