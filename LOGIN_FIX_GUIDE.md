# Login "Invalid API Key" Error - Fix Guide

## Problem
The login page shows "Invalid API key" error when attempting to sign in.

## Root Causes
1. **Missing Environment Variables** - `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` not set
2. **Incorrect Environment Variables** - Values are wrong or have quotes
3. **Dev Server Not Restarted** - Environment variables changed but server wasn't restarted
4. **Wrong Supabase Project** - Using credentials from wrong project

## Solution Steps

### 1. Check Environment Variables
Create or verify `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important:**
- No quotes around values
- No trailing spaces
- Use the **anon key** (not service role key)
- Get these from: Supabase Dashboard → Settings → API

### 2. Verify Values
Run this in browser console (on login page):
```javascript
console.log({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length
});
```

### 3. Restart Dev Server
After changing `.env.local`:
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### 4. Check for Quotes
Common mistake - values should NOT have quotes:
```bash
# ❌ WRONG
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."

# ✅ CORRECT
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 5. Verify Supabase Project
- Go to Supabase Dashboard
- Check project URL matches `NEXT_PUBLIC_SUPABASE_URL`
- Check API keys match your project

## Debugging

The login page now includes better error messages:
- "Configuration error: Missing Supabase credentials" - Environment variables not set
- "Configuration error: Invalid API key" - API key is wrong or has quotes
- "Invalid email or password" - Credentials are wrong (but API key is OK)

## Still Not Working?

1. **Check browser console** for detailed error messages
2. **Check terminal** where dev server is running for errors
3. **Verify Supabase project is active** (not paused)
4. **Try creating a new user** to test if it's a user-specific issue

## Next.js Version Note

The app is now configured for **Next.js 16.1.1**. If you see version-related errors, ensure:
- `package.json` shows `"next": "^16.1.1"`
- Run `npm install` to ensure dependencies are up to date
- Version guard allows 16.x (updated in this fix)
