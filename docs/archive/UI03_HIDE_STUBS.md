# UI-03: Hide Stub Pages from Sidebar Navigation

## Scope Lock
- **Only modify files listed below**
- Do NOT delete any page files or route files
- Do NOT remove any routes
- Do NOT modify the role system
- Do NOT modify route protection
- Do NOT create branches — commit directly to main
- Do NOT install any new dependencies

## Step 0: Find the navigation config
```powershell
Select-String -Path "lib/navigation.ts" -Pattern "billing|reports|Coming Soon|integrations" | Select-Object LineNumber, Line
Get-Content -LiteralPath "lib/navigation.ts" -TotalCount 30
```

Also check for feature flags:
```powershell
Get-Content -LiteralPath "lib/config/features.ts" -TotalCount 30
```

## Files to Modify

### File 1: `lib/config/features.ts`
Add at the top (after existing imports/comments):

```typescript
/**
 * Pre-beta mode: hides unfinished pages from sidebar navigation.
 * Pages remain accessible via direct URL for development.
 * To re-enable: set env DISABLE_PRE_BETA=true
 */
export const PRE_BETA_MODE: boolean =
  process.env.DISABLE_PRE_BETA !== 'true';
```

### File 2: `lib/navigation.ts`
Add import at top:
```typescript
import { PRE_BETA_MODE } from '@/lib/config/features';
```

Add BEFORE the `getNavigationForRole` function:
```typescript
/**
 * Nav item IDs hidden during pre-beta.
 * Routes remain accessible via direct URL.
 * To restore: remove ID from this set or set DISABLE_PRE_BETA=true.
 */
const PRE_BETA_HIDDEN_IDS = new Set([
  // Billing — fully stubbed (Stripe not wired)
  'admin-billing',
  'agency-billing',
  // Admin system pages — no page.tsx yet
  'admin-settings-firm',
  'admin-settings-security',
  'admin-settings-integrations',
  // Reports — placeholder stubs
  'admin-reports',
  'attorney-reports',
  // Attorney-specific pages — not built
  'attorney-cases',
  'attorney-transcripts',
  'attorney-recent',
  'attorney-exhibits',
  'attorney-issues',
]);

function applyPreBetaFilter(schema: NavigationSchema): NavigationSchema {
  return schema
    .map(section => ({
      ...section,
      items: section.items.filter(item => !PRE_BETA_HIDDEN_IDS.has(item.id)),
    }))
    .filter(section => section.items.length > 0);
}
```

**IMPORTANT:** Read the actual nav item IDs in the file first. The IDs above are examples — use the REAL IDs from the navigation arrays. If IDs don't match, adapt the set to use the actual IDs found in the file.

Modify `getNavigationForRole`:
```typescript
export function getNavigationForRole(role: UserRole): NavigationSchema {
  const schema = NAVIGATION[role] ?? REPORTER_NAV;
  return PRE_BETA_MODE ? applyPreBetaFilter(schema) : schema;
}
```

## Validation
```bash
npm run typecheck    # Zero errors
npm run build        # Zero errors
```

Check only 2 files modified:
```bash
git diff --name-only
```
Should show ONLY `lib/navigation.ts` and `lib/config/features.ts`.

## Commit
```bash
git add lib/navigation.ts lib/config/features.ts
git commit -m "ui-03: hide stub pages from sidebar nav via PRE_BETA_MODE filter"
git push origin main
```

## STOP after commit. Do not proceed to any other task.
