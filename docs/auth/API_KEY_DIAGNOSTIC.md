# 🔑 API Key Diagnostic: "Invalid API key" Error

## ✅ ANSWER: Which API Key?

**The error is from:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`

This is the **Supabase Anonymous/Public Key** used for client-side authentication.

---

## 🔍 Why You're Seeing "Invalid API key"

The "Invalid API key" error from `app/(auth)/forgot-password/page.tsx` line 74 means:

1. **The Supabase client is being initialized** ✅ (good - code is running)
2. **The API request is reaching Supabase** ✅ (good - network is working)
3. **Supabase is rejecting the key** ❌ (the problem)

---

## 🎯 Root Cause Analysis

Based on the diagnostic output:

### ✅ What's Working:
- `.env.local` file exists ✅
- `NEXT_PUBLIC_SUPABASE_URL` is set correctly ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set correctly (208 characters) ✅
- Key starts with `eyJ` (JWT format) ✅

### ❌ What's Broken:
- **Build cache is stale** - `.next` folder has old/undefined values
- **Env vars not replaced at build time** - Next.js didn't inject the values into the browser bundle

---

## 🚨 The Real Issue

**`NEXT_PUBLIC_*` environment variables are replaced at BUILD TIME, not runtime.**

When you:
1. Set variables in `.env.local` ✅
2. But don't delete `.next` folder ❌
3. Next.js uses the OLD cached values (possibly undefined) ❌
4. Browser bundle has `undefined` for the API key ❌
5. Supabase rejects `undefined` as invalid → "Invalid API key" ❌

---

## ✅ THE FIX (Do This Now)

### Step 1: Verify `.env.local` Values

Run this to check your `.env.local` file:
```powershell
node scripts/check-env-vars.js
```

**Expected output:**
```
✅ NEXT_PUBLIC_SUPABASE_URL: Set correctly
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: Set correctly
   Length: 208 characters
```

### Step 2: Clean Build Cache (CRITICAL)

**This is the most important step!**

```powershell
# Stop dev server (Ctrl+C)

# Delete build cache
Remove-Item -Recurse -Force .next

# Optional: Also clean node_modules if you want a completely fresh start
# Remove-Item -Recurse -Force node_modules
# Remove-Item -Force package-lock.json
# npm install

# Start fresh
npm run dev
```

### Step 3: Verify in Browser

After restart:

1. **Open:** `http://localhost:3000/login`
2. **Open DevTools Console (F12)**
3. **Look for:**
   - ✅ Should NOT see: "CRITICAL: Supabase environment variables are UNDEFINED"
   - ✅ Should NOT see: "Invalid API key" (unless credentials are wrong)

### Step 4: Test Login

Try logging in. If you still see "Invalid API key":

1. **Check browser console** for the diagnostic message
2. **Check Network tab** → Find `/auth/v1/token` request
3. **Look at Request Headers** → `apikey` header should show your anon key (starts with `eyJ`)

If the `apikey` header shows `undefined` or empty:
- Build cache is still stale
- Delete `.next` again and restart

---

## 🔍 Debugging: What Value Is Actually Being Used?

The updated `lib/supabase/browser.ts` now includes diagnostic logging. After a clean rebuild:

**If you see this in browser console:**
```
🚨 CRITICAL: Supabase environment variables are UNDEFINED in browser!
   NEXT_PUBLIC_SUPABASE_URL: ❌ UNDEFINED
   NEXT_PUBLIC_SUPABASE_ANON_KEY: ❌ UNDEFINED
```

**This confirms:** Build cache is stale - env vars not replaced at build time.

**Fix:** Delete `.next` and restart dev server.

---

## 📋 Verification Checklist

After clean rebuild, verify:

- [ ] Browser console shows NO "UNDEFINED" errors
- [ ] Browser console shows NO "Invalid API key" (unless credentials wrong)
- [ ] Network tab → `/auth/v1/token` request has `apikey` header with your key
- [ ] Login request succeeds (200 OK)
- [ ] Cookies appear: `sb-ildhcfspbmhuemzgvzyx-auth-token`

---

## 🎯 Quick Test Command

```powershell
# 1. Check env vars in file
node scripts/check-env-vars.js

# 2. Clean build
Remove-Item -Recurse -Force .next

# 3. Restart dev server
npm run dev

# 4. Open browser and check console (should have no "UNDEFINED" errors)
```

---

## 💡 Key Points

1. **The API key is:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase Anonymous Key)
2. **It's set correctly** in `.env.local` (208 characters, starts with `eyJ`)
3. **The problem is:** Stale build cache (`.next` folder has old values)
4. **The fix is:** Delete `.next` and restart dev server
5. **After fix:** Browser will receive the correct key, login will work, cookies will appear

---

## 🚨 If Still Failing After Clean Build

If you still see "Invalid API key" after cleaning `.next`:

1. **Check the actual key value:**
   ```powershell
   # In .env.local, verify:
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsZGhjZnNwYm1odWVtemd2enl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNTMwMzgsImV4cCI6MjA3ODYyOTAzOH0.X9ugAI2BWea4WHRNQBP6UrKXXyxokKJqtpZciX2owcM
   ```

2. **Verify it matches Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard/project/ildhcfspbmhuemzgvzyx/settings/api
   - Check: "anon public" key
   - Must match exactly (no quotes, no spaces)

3. **Verify you're using the ANON key (not service role):**
   - ✅ Use: `anon public` key (safe for client)
   - ❌ Do NOT use: `service_role` key (secret, server-only)

---

**The fix is simple: Delete `.next` and restart. The env vars are correct, but the build cache is stale.**
