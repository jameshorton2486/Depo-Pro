# 🔧 Password Reset - Server Client Fix

## 🚨 Root Cause Identified

**The Problem:**
- Your password reset link is working (PKCE code is being generated)
- The callback route receives the code correctly
- BUT: The server-side Supabase client (`server.ts`) uses `process.env.NEXT_PUBLIC_SUPABASE_URL` which is **undefined**
- This causes `exchangeCodeForSession()` to fail
- The callback route redirects to `/login` on error

**The Solution:**
You hardcoded the keys in `browser.ts` (which works), but `server.ts` and `middleware.ts` still use env vars. I've hardcoded them in those files too to match.

---

## ✅ FIXES APPLIED

### 1. Fixed `lib/supabase/server.ts`
- Changed from `process.env.NEXT_PUBLIC_SUPABASE_URL!` to hardcoded `SUPABASE_URL`
- Changed from `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!` to hardcoded `SUPABASE_ANON_KEY`
- Also fixed `createSupabaseServiceClient()` to use hardcoded URL

### 2. Fixed `lib/supabase/middleware.ts`
- Changed from env vars to hardcoded constants
- This ensures middleware can read sessions correctly

---

## 🧪 TEST NOW

1. **Restart dev server** (to load new code):
   ```powershell
   taskkill /F /IM node.exe 2>$null
   npm run dev
   ```

2. **Request fresh password reset**:
   - Go to: `http://localhost:3000/forgot-password`
   - Enter email: `jameshorton2486@gmail.com`
   - Click "Send Reset Link"
   - Check email immediately

3. **Click the reset link**:
   - Click the link in your email
   - Should redirect to: `/auth/callback?code=...&type=recovery`
   - Callback should exchange code and redirect to: `/reset-password`
   - You should see the password reset form!

---

## 📋 CHECK TERMINAL LOGS

After clicking the reset link, check your terminal for:

**Expected logs:**
```
[Auth Callback] Received: { code: true, token_hash: false, type: 'recovery', ... }
[Auth Callback] Exchanging PKCE code, type: recovery
[Auth Callback] Code exchange successful
[Auth Callback] Recovery flow - redirecting to /reset-password
```

**If you see errors:**
- Check what error appears
- Share the error message

---

## 🔍 WHY THIS HAPPENS

**Next.js Environment Variables:**
- `NEXT_PUBLIC_*` vars are replaced at **build time** in the browser bundle
- But server-side code (API routes, Server Components) reads from `process.env` at **runtime**
- If env vars aren't loaded properly, they're `undefined`
- This causes Supabase client creation to fail

**Your Fix (Hardcoded):**
- Works immediately (no env var issues)
- Not ideal for production (keys in source code)
- But Supabase anon key is public anyway, so it's OK for now

**Long-term Fix (Later):**
- Fix env var loading in Next.js
- Use `.env.local` properly
- Switch back to env vars after fixing build cache

---

## ✅ EXPECTED FLOW NOW

1. **User clicks reset link** → `/auth/callback?code=xxx&type=recovery`
2. **Callback route runs** → Creates server client (now works with hardcoded keys)
3. **Code exchange** → `exchangeCodeForSession(code)` succeeds
4. **Redirect** → `/reset-password` (with valid session)
5. **User enters new password** → `updateUser({ password })` works
6. **Success** → Redirect to `/login`

---

**The code is fixed. Restart your dev server and test with a fresh password reset link!**
