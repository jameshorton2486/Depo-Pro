# Quick Fix: "Invalid API key" Error

## 🔴 The Problem
You're getting "Invalid API key" when trying to log in.

## ✅ The Fix (3 Steps)

### Step 1: Remove Quotes from `.env.local`

I've already fixed this for you! The quotes around the values in `.env.local` were being included as part of the value.

### Step 2: Restart Dev Server

**CRITICAL:** You MUST restart the dev server for env vars to reload:

1. Stop the current dev server (Ctrl+C in the terminal)
2. Start it again:
   ```bash
   npm run dev
   ```

### Step 3: Clear Browser Cache (Optional)

If it still doesn't work:
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

## 🔍 How to Verify It's Fixed

After restarting the dev server:

1. Open browser DevTools → Console
2. Try to log in
3. You should see debug logs showing the env vars are loaded
4. If you see "Missing environment variables" error, the dev server didn't pick up `.env.local`

## 🚨 If It Still Doesn't Work

Check these:

1. **`.env.local` exists** in project root (same folder as `package.json`)
2. **No quotes** around values in `.env.local`
3. **Dev server restarted** after fixing `.env.local`
4. **Correct values** - verify in Supabase Dashboard → Settings → API

## ✅ Expected Result

After fixing and restarting:
- Login should work
- No "Invalid API key" error
- You can sign in successfully
