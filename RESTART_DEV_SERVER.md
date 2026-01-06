# 🔴 CRITICAL: Restart Dev Server

## The Problem
Even though `.env.local` is fixed, the dev server is still using the old cached values.

## ✅ The Fix

### Step 1: Stop the Dev Server
Press `Ctrl+C` in the terminal where `npm run dev` is running.

### Step 2: Clear Next.js Cache (Optional but Recommended)
```powershell
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
```

### Step 3: Restart Dev Server
```bash
npm run dev
```

### Step 4: Hard Refresh Browser
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

## 🔍 Verify It's Working

After restarting, open the browser console (F12 → Console) and look for:

```
[Supabase Client] Environment check: {
  hasUrl: true,
  hasKey: true,
  urlPreview: "https://ildhcfspbmhuemzgvzyx.supabase.co...",
  keyPreview: "eyJhbGciOiJIUzI1NiIsInR5cCI6Ik...",
  keyStartsWith: "eyJhbGciOi"
}
```

If you see this, the env vars are loaded correctly!

## 🚨 If You Still See "Invalid API key"

1. **Check the console logs** - Do you see the debug output above?
2. **Verify the key** - Go to Supabase Dashboard → Settings → API → Copy the anon key
3. **Compare** - Does it match what's in `.env.local`?

## ✅ Expected Result

After restarting:
- Console shows the debug logs
- Login works without "Invalid API key" error
- You can successfully sign in
