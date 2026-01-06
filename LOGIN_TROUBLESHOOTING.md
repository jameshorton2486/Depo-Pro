# 🔐 Login Troubleshooting Guide

## ✅ Your Setup is Already Correct

Your Supabase authentication is **properly configured**:
- ✅ `@supabase/ssr` is installed (v0.8.0)
- ✅ Canonical clients use proper cookie handling
- ✅ Middleware uses `createSupabaseMiddlewareClient` (correct pattern)
- ✅ Login page uses `getSupabaseBrowserClient()` (correct pattern)

## Common Login Issues & Fixes

### Issue 1: "Invalid email or password"

**Possible causes:**
1. User doesn't exist in Supabase Auth
2. Wrong password
3. Email not confirmed (if email confirmation is enabled)

**Fix:**
1. Check Supabase Dashboard → Authentication → Users
2. Verify user exists and email is confirmed
3. Try resetting password via `/forgot-password`

### Issue 2: Login succeeds but redirects back to login

**Possible causes:**
1. Middleware not reading cookies correctly
2. Profile doesn't exist in database
3. Session cookies not being set

**Fix:**
1. Check browser DevTools → Application → Cookies
2. Look for cookies starting with `sb-` (Supabase cookies)
3. Verify profile exists: `npm run list-users`
4. Clear cookies and try again

### Issue 3: "User not found" after login

**Possible causes:**
1. Profile wasn't created in database
2. Profile guard failed

**Fix:**
1. Check if profile exists: `npm run list-users`
2. If missing, the profile should auto-create on first API call
3. Try accessing `/dashboard` after login (triggers profile creation)

### Issue 4: Cookies not being set

**Possible causes:**
1. Browser blocking cookies
2. Incorrect domain/path settings
3. HTTPS required but using HTTP

**Fix:**
1. Check browser console for cookie errors
2. Verify Supabase Site URL matches your domain
3. Check Supabase Dashboard → Settings → Auth → Site URL

## Diagnostic Commands

```bash
# Test Supabase connection
npm run diagnose-auth

# List all users
npm run list-users

# Promote user to admin
EMAIL=your-email@example.com npm run promote-to-admin
```

## Browser DevTools Checklist

After attempting login, check:

1. **Console Tab:**
   - Look for JavaScript errors
   - Check for Supabase client errors

2. **Network Tab:**
   - Find request to `/auth/v1/token`
   - Check response status (should be 200)
   - Check response body for session data

3. **Application Tab → Cookies:**
   - Look for cookies starting with `sb-`
   - Verify they have values (not empty)
   - Check expiration dates

4. **Application Tab → Local Storage:**
   - Check for Supabase-related keys
   - Note: `@supabase/ssr` uses cookies, not localStorage

## Supabase Dashboard Checklist

1. **Authentication → Providers:**
   - ✅ Email provider is **Enabled**
   - ✅ "Confirm email" can be OFF for testing

2. **Authentication → Users:**
   - ✅ User exists
   - ✅ Email is confirmed (if required)
   - ✅ User is active (not banned)

3. **Settings → API:**
   - ✅ Project URL is correct
   - ✅ Anon key matches `.env.local`
   - ✅ Service role key matches `.env.local`

4. **Settings → Auth:**
   - ✅ Site URL matches your domain (e.g., `http://localhost:3000`)
   - ✅ Redirect URLs include your domain

## Quick Test Flow

1. **Create a user:**
   ```bash
   # Go to /register
   # Fill out form and submit
   # Check Supabase Dashboard → Users to verify
   ```

2. **Test login:**
   ```bash
   # Go to /login
   # Enter email and password
   # Check browser DevTools for errors
   # Verify cookies are set
   ```

3. **Verify session:**
   ```bash
   # After login, check middleware is working
   # Try accessing /dashboard
   # Should not redirect to /login
   ```

## Still Not Working?

If login still fails after these checks:

1. **Run full diagnostic:**
   ```bash
   npm run diagnose-auth
   ```

2. **Check server logs:**
   - Look for middleware errors
   - Check for database connection issues

3. **Verify environment:**
   - All three Supabase env vars are set
   - Values match Supabase Dashboard exactly

4. **Test with curl:**
   ```bash
   # Test Supabase API directly
   curl -X POST 'https://YOUR_PROJECT.supabase.co/auth/v1/token?grant_type=password' \
     -H "apikey: YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'
   ```

## Your Current Setup (Verified ✅)

- **Browser Client:** `lib/supabase/browser.ts` - Uses `@supabase/ssr` ✅
- **Server Client:** `lib/supabase/server.ts` - Uses `@supabase/ssr` ✅
- **Middleware Client:** `lib/supabase/middleware.ts` - Uses `@supabase/ssr` ✅
- **Admin Client:** `lib/supabase/admin.ts` - Service role ✅
- **Middleware:** `middleware.ts` - Properly configured ✅
- **Login Page:** Uses `getSupabaseBrowserClient()` ✅

**No changes needed** - your setup is correct!
