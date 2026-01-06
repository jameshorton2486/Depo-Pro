# Fix "Invalid API key" Error

## 🔴 Problem
Getting "Invalid API key" error when trying to log in.

## ✅ Solution Steps

### Step 1: Check `.env.local` Format

Your `.env.local` should have **NO QUOTES** around values:

```bash
# ✅ CORRECT (no quotes)
NEXT_PUBLIC_SUPABASE_URL=https://ildhcfspbmhuemzgvzyx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsZGhjZnNwYm1odWVtemd2enl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNTMwMzgsImV4cCI6MjA3ODYyOTAzOH0.X9ugAI2BWea4WHRNQBP6UrKXXyxokKJqtpZciX2owcM

# ❌ WRONG (with quotes - Next.js includes the quotes as part of the value)
NEXT_PUBLIC_SUPABASE_URL="https://ildhcfspbmhuemzgvzyx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Step 2: Restart Dev Server

After fixing `.env.local`:

1. **Stop the dev server** (Ctrl+C)
2. **Restart it:**
   ```bash
   npm run dev
   ```

### Step 3: Verify Environment Variables

Add a temporary debug log to verify values are loaded:

```typescript
// In lib/supabase/browser.ts (temporary)
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30));
console.log('Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30));
```

### Step 4: Check Browser Console

Open browser DevTools → Console and look for:
- The debug logs above
- Any errors about missing environment variables

## 🚨 Common Issues

### Issue 1: Quotes in `.env.local`
**Fix:** Remove quotes from values

### Issue 2: Dev Server Not Restarted
**Fix:** Stop and restart `npm run dev`

### Issue 3: Wrong Key
**Fix:** Verify the anon key in Supabase Dashboard → Settings → API

### Issue 4: Key Has Extra Spaces
**Fix:** Check for leading/trailing spaces in `.env.local`

## ✅ Quick Fix Command

If your `.env.local` has quotes, remove them:

```powershell
# Read current file
$content = Get-Content .env.local

# Remove quotes from NEXT_PUBLIC_* lines
$fixed = $content | ForEach-Object {
    if ($_ -match '^NEXT_PUBLIC_') {
        $_ -replace '="([^"]+)"', '=$1'
    } else {
        $_
    }
}

# Write back
$fixed | Set-Content .env.local
```

Then restart dev server.
