# Unused Packages Audit — Depo-Pro

Packages identified as candidates for removal after beta.
**Do not remove during feature freeze** — some may be indirectly required by
transitive dependencies or used in code paths not covered by static analysis.

Verify each with `npm ls <package>` and confirm no runtime usage before removing.

---

## Candidates for Removal (Post-Beta)

| Package | Reason Suspected Unused | Verify Before Removing |
|---|---|---|
| `googleapis` | Google Docs export deleted (`lib/export/google-docs-export.ts`). Check for other usages. | `grep -r "googleapis" app/ lib/` |
| `@google-cloud/storage` | Same — was pulled in for Google Docs integration. | `grep -r "google-cloud" app/ lib/` |

---

## Packages to Keep (Intentional)

| Package | Why Kept |
|---|---|
| `@deepgram/sdk` | Core transcription pipeline |
| `docx` | DOCX export (active) |
| `pdfkit` | PDF export (active) |
| `date-fns` | Date formatting in export metadata |
| `zod` | Request validation across API routes |
| `@supabase/supabase-js` | Database, auth, storage |
| `@supabase/ssr` | Server-side auth session |

---

## How to Audit

```bash
# List all direct dependencies
cat package.json | jq '.dependencies | keys[]'

# Check if a package is imported anywhere in source
grep -r "package-name" app/ lib/ components/ --include="*.ts" --include="*.tsx" -l

# Check for transitive usage (may be required by another package)
npm ls package-name
```

---

## Removal Process (Post-Beta Only)

1. Confirm 0 imports in `app/`, `lib/`, `components/`
2. `npm uninstall <package>`
3. Run `npm run build` — confirm 0 errors
4. Run `npm run typecheck` — confirm 0 errors
5. Commit: `chore: remove unused <package> dependency`
