# Cursor Rules — Depo-Pro

## Repository Structure Rules

DO NOT create `.md` files at the repository root.

Documentation rules:
- `/docs/auth` → authentication docs
- `/docs/environment` → env & security
- `/docs/deployment` → production & CI
- `/docs/_archive` → incidents and debugging

Scripts:
- `/scripts/dev`
- `/scripts/security`
- `/scripts/archive`

## Hard Rule

If documentation is needed:
- Ask where it belongs
- Or place it under `/docs`

Violations will be rejected by CI and pre-commit hooks.
