# ✅ Complete Migration to NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

**Date:** 2026-01-10  
**Status:** COMPLETE

## Summary

All code has been migrated from `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to align with Supabase's new publishable key system.

## Files Updated

### Core Supabase Clients
- ✅ `lib/supabase/browser.ts` - Rewritten with inline validation
- ✅ `lib/supabase/server.ts` - Updated to use PUBLISHABLE_KEY
- ✅ `lib/supabase/middleware.ts` - Updated variable name
- ✅ `lib/supabase/admin.ts` - No changes needed (uses service role)
- ✅ `lib/supabase/client.ts` - No changes needed (re-exports from browser)

### Environment & Validation
- ✅ `lib/env.ts` - Updated PUBLIC_ENV export
- ✅ `lib/env/validation.ts` - Updated validation rules
- ✅ `lib/security.ts` - Updated env var reference
- ✅ `types/env.d.ts` - Updated TypeScript definitions
- ❌ `lib/env/require-public-supabase-key.ts` - **DELETED** (validation moved to browser.ts)

### Configuration Files
- ⚠️ `.env.example` - **MANUAL UPDATE REQUIRED** (see below)
- ⚠️ `.env.local` - **USER MUST UPDATE** (see below)

## Key Changes

### 1. Browser Client (`lib/supabase/browser.ts`)

**Before:**
```typescript
import { requirePublishableSupabaseKey } from '@/lib/env/require-public-supabase-key';
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  requirePublishableSupabaseKey()
);
```

**After:**
```typescript
function validatePublishableKey(): { url: string; key: string } {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // Inline validation with clear error messages
  if (!key || !key.startsWith('sb_publishable_')) {
    throw new Error('[Supabase] INVALID KEY FORMAT...');
  }
  return { url, key };
}
```

### 2. Server Client (`lib/supabase/server.ts`)

**Before:**
```typescript
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
```

**After:**
```typescript
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

### 3. Middleware (`lib/supabase/middleware.ts`)

**Before:**
```typescript
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
```

**After:**
```typescript
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
return { url, anonKey: publishableKey };
```

## Required Manual Actions

### 1. Update `.env.local`

**Rename the variable:**
```bash
# OLD (remove this line)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# NEW (add this line)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_[YOUR_FULL_KEY_HERE]
```

**Get the key from:**
- Supabase Dashboard → Settings → API → "Publishable and secret API keys" tab
- Copy the **full** publishable key (starts with `sb_publishable_`)

### 2. Update `.env.example` (if exists)

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
SUPABASE_SERVICE_ROLE_KEY=sb_secret_your_key_here
```

### 3. Hard Restart

After updating `.env.local`:
```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

## Validation

The new validation in `browser.ts` will:
- ✅ Reject legacy JWT keys (starting with `eyJhbGciOi`)
- ✅ Require publishable keys (starting with `sb_publishable_`)
- ✅ Show clear error messages if the key is wrong

## Verification Steps

1. **Check key format:**
   ```powershell
   npm run verify:key
   ```

2. **Test login:**
   - Visit `http://localhost:3000/login`
   - Open DevTools → Network tab
   - Try to log in
   - Verify request headers show `apikey: sb_publishable_...`

3. **Check for errors:**
   - No "Legacy JWT key detected" errors
   - No 401 errors from Supabase
   - Login works correctly

## Breaking Changes

⚠️ **This is a breaking change for local development:**
- All developers must update their `.env.local` files
- The old variable name (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) will no longer work
- CI/CD environments must be updated with the new variable name

## Backward Compatibility

❌ **No backward compatibility:**
- The old variable name is completely removed from code
- No fallback to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- This ensures all environments use the correct key format

## Files NOT Updated (Intentionally)

These files contain historical references and don't need updates:
- `docs/**` - Documentation files (historical)
- `scripts/archive/**` - Archived scripts
- `docs/_archive/**` - Archived documentation

## Next Steps

1. ✅ Code migration complete
2. ⚠️ **User must update `.env.local`** (see above)
3. ⚠️ **User must hard restart** dev server
4. ✅ Test login flow
5. ✅ Verify no 401 errors

## Related Files

- `lib/supabase/browser.ts` - Main validation logic
- `lib/supabase/server.ts` - Server client
- `lib/supabase/middleware.ts` - Middleware client
- `types/env.d.ts` - TypeScript definitions
- `lib/env.ts` - Environment variable exports
