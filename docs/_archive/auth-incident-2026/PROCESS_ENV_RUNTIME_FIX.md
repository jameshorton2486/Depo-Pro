# 🔴 CRITICAL: process.env Runtime Error Fix

**Issue:** `Uncaught ReferenceError: process is not defined`  
**Cause:** `process.env` accessed in browser at runtime  
**Impact:** Supabase client created with `undefined` values → 401 errors

## 🎯 Root Cause

The error shows console.log statements trying to access `process.env` in the browser. In Next.js:
- `NEXT_PUBLIC_*` vars are replaced at **build time**, not runtime
- If accessed directly in browser code, they may be `undefined`
- The getter pattern should work, but needs verification

## ✅ Immediate Fix

### Step 1: Remove Any Console.log Statements

If you added these in browser console, they won't work. Remove them.

### Step 2: Verify Environment Variables

Check `.env.local` has:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://ildhcfspbmhuemzgvzyx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: Clear Build Cache & Restart

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev
```

### Step 4: Verify Client Creation

The getter pattern should work, but if env vars aren't replaced at build time, the validation in `browser.ts` will throw clear errors.

## 🔍 Verification

After restart, check browser console:
- ✅ Should see validation error if vars are missing
- ✅ Should NOT see "process is not defined"
- ✅ Should NOT see 401 errors if vars are correct
