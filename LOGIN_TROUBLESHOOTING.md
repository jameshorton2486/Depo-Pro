# Login "Invalid API Key" - Troubleshooting Guide

## Quick Fix Checklist

1. ✅ **Run diagnostic:** `npm run check:env`
2. ✅ **Verify .env.local exists** in project root
3. ✅ **Check for quotes** around values (should NOT have quotes)
4. ✅ **Restart dev server** after changing .env.local
5. ✅ **Verify Supabase project** is active (not paused)

## Step-by-Step Fix

### Step 1: Run Environment Check
```bash
npm run check:env
```

This will tell you exactly what's wrong with your environment variables.

### Step 2: Verify .env.local File

Create or edit `.env.local` in the project root:

```bash
# ✅ CORRECT FORMAT (no quotes, no spaces)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcHJvamVjdC1pZCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjE2MjM5MDIyLCJleHAiOjE5MzE4MTUwMjJ9.your-signature-here
```

**Common Mistakes:**
```bash
# ❌ WRONG - Has quotes
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."

# ❌ WRONG - Has trailing spaces
NEXT_PUBLIC_SUPABASE_URL=https://... 

# ❌ WRONG - Using service role key (never use this in client!)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...service_role...

# ✅ CORRECT - No quotes, no spaces
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Step 3: Get Correct Values from Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (NOT service_role!)

### Step 4: Restart Dev Server

**Critical:** After changing `.env.local`, you MUST restart:

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 5: Verify in Browser Console

Open browser console on login page and run:

```javascript
console.log({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length,
  keyStartsWith: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10)
});
```

Expected output:
- `url`: Should show your Supabase URL
- `hasKey`: Should be `true`
- `keyLength`: Should be ~200+ characters
- `keyStartsWith`: Should be `"eyJhbGciOi"`

## Error Messages Explained

| Error Message | Meaning | Fix |
|--------------|---------|-----|
| "Missing Supabase credentials" | Env vars not set | Create .env.local |
| "Environment variables contain quotes" | Values have quotes | Remove quotes from .env.local |
| "Invalid API key" | Key is wrong or env vars not loaded | Check .env.local, restart server |
| "Invalid login credentials" | API key is OK, but email/password wrong | Check user credentials |

## Still Not Working?

### Check 1: Supabase Project Status
- Is your Supabase project **active** (not paused)?
- Did you select the **correct project** in the dashboard?

### Check 2: Key Type
- Are you using the **anon/public key** (not service_role)?
- Service role key should NEVER be in client-side code

### Check 3: Dev Server
- Did you **restart** the dev server after changing .env.local?
- Try stopping completely and starting fresh

### Check 4: File Location
- Is `.env.local` in the **project root** (same level as package.json)?
- Not in a subdirectory?

### Check 5: Next.js Version
- Current version: **Next.js 16.1.1** ✅
- Run `npm run check:version` to verify
- Run `npm install` if needed

## Diagnostic Commands

```bash
# Check environment variables
npm run check:env

# Check Next.js version
npm run check:version

# Verify TypeScript
npm run typecheck

# Check for lint errors
npm run lint
```

## Getting Help

If none of the above works:

1. **Run diagnostics:**
   ```bash
   npm run check:env
   npm run check:version
   ```

2. **Check browser console** for detailed error messages

3. **Check terminal** where dev server is running

4. **Verify Supabase project** is active and accessible

5. **Try creating a test user** to rule out user-specific issues

---

**Remember:** The most common issue is forgetting to restart the dev server after changing `.env.local`!
