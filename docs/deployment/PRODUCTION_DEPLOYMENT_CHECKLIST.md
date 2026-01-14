# 📦 Production Deployment Checklist

**Use before:** Vercel / VPS / Docker deployment  
**Last Updated:** 2025-01-XX

---

## ✅ Pre-Deployment Checklist

### 🔑 Supabase Configuration

- [ ] Using `sb_publishable_*` key in browser (not legacy JWT)
- [ ] Project URL matches key project
- [ ] Auth → Email provider enabled
- [ ] Redirect URLs configured:
  - [ ] Production URL: `https://yourdomain.com/**`
  - [ ] Development URL: `http://localhost:3000/**`
- [ ] RLS enabled on all tables:
  - [ ] `users` table
  - [ ] `jobs` table
  - [ ] `transcriptions` table
  - [ ] All other user-facing tables
- [ ] Service role key stored securely (never in client code)

### 🌍 Environment Variables

- [ ] `.env.example` up to date with all required vars
- [ ] Production env vars set in deployment platform:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (must be `sb_publishable_*`)
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- [ ] No legacy anon keys in use
- [ ] Service role key marked as secret/encrypted in platform
- [ ] All `NEXT_PUBLIC_*` vars available at build time

### 🧠 Auth Flow Verification

- [ ] Login returns `200 OK` (not `401`)
- [ ] Forgot password returns `200 OK` (not `401`)
- [ ] Cookies set correctly (`sb-<project-ref>-auth-token`)
- [ ] Session persists on page refresh
- [ ] Logout clears session
- [ ] Password reset flow works end-to-end

### 🧱 Middleware Verification

- [ ] Auth routes excluded from protection:
  - [ ] `/login`
  - [ ] `/register`
  - [ ] `/forgot-password`
  - [ ] `/reset-password`
  - [ ] `/auth/callback`
  - [ ] `/auth/confirm`
- [ ] No manual cookie parsing
- [ ] Uses Supabase session APIs only
- [ ] Protected routes redirect to `/login` when unauthenticated
- [ ] Authenticated users redirected away from auth pages

### 🧪 Testing

- [ ] Auth smoke test passes (`npm run test:e2e:auth`)
- [ ] No `401` errors in production logs
- [ ] No auth-related console errors
- [ ] Network requests include `apikey: sb_publishable_...` header
- [ ] Health check endpoint returns `200`:
  - [ ] `/api/health`
  - [ ] `/api/health/supabase`

### 🧹 Repo Hygiene

- [ ] Diagnostics removed or archived (see `SAFE_DELETION_LIST.md`)
- [ ] Clean git status
- [ ] Logical commits (not one giant commit)
- [ ] Auth docs included:
  - [ ] `AUTH-ARCHITECTURE.md`
  - [ ] `SUPABASE_KEYS_EXPLAINED.md`
  - [ ] `PRODUCTION_ENV_STRATEGY.md`

---

## 🚨 Go / No-Go Rule

**If `/auth/v1/token` or `/auth/v1/recover` returns `401` in production — STOP deployment.**

This indicates:
- Wrong API key
- Key from different project
- Missing env vars
- Invalid key format

**Fix before proceeding.**

---

## 🔍 Pre-Deployment Verification Steps

### 1. Local Verification

```bash
# Clear build cache
Remove-Item -Recurse -Force .next

# Build
npm run build

# Type check
npm run typecheck

# Lint
npm run lint

# Start production server locally
npm start

# Test auth flows manually
# Visit http://localhost:3000/login
```

### 2. Environment Variable Verification

**In your deployment platform (Vercel/VPS/etc):**

```bash
# Verify all required vars are set
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY  # Should start with sb_publishable_
echo $SUPABASE_SERVICE_ROLE_KEY      # Should NOT be exposed
```

### 3. Supabase Dashboard Verification

1. **Settings → API Keys:**
   - [ ] Publishable key matches `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - [ ] Project URL matches `NEXT_PUBLIC_SUPABASE_URL`

2. **Auth → URL Configuration:**
   - [ ] Site URL set to production domain
   - [ ] Redirect URLs include production domain

3. **Database → Policies:**
   - [ ] RLS enabled on all tables
   - [ ] Policies use `auth.uid()` correctly

---

## 🚀 Deployment Steps

### Vercel

1. **Set Environment Variables:**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL production
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
   vercel env add SUPABASE_SERVICE_ROLE_KEY production
   ```

2. **Deploy:**
   ```bash
   vercel --prod
   ```

3. **Verify:**
   - [ ] Visit production URL
   - [ ] Test login
   - [ ] Check Network tab for `200` responses

### VPS / Docker

1. **Set Environment Variables:**
   ```bash
   # In .env.production or docker-compose.yml
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   ```

2. **Build & Deploy:**
   ```bash
   npm run build
   npm start
   # or
   docker-compose up -d
   ```

3. **Verify:**
   - [ ] Health check: `curl https://yourdomain.com/api/health`
   - [ ] Test login flow
   - [ ] Check logs for errors

---

## 🔍 Post-Deployment Verification

### Immediate Checks (Within 5 Minutes)

- [ ] Production site loads
- [ ] Login page accessible
- [ ] Login works (test with real account)
- [ ] No `401` errors in browser console
- [ ] Cookies set correctly
- [ ] Session persists on refresh

### Extended Checks (Within 1 Hour)

- [ ] Password reset email received
- [ ] Password reset flow completes
- [ ] Protected routes require authentication
- [ ] Logout works correctly
- [ ] No auth-related errors in logs

### Monitoring (First 24 Hours)

- [ ] Set up error tracking (Sentry, etc.)
- [ ] Monitor Supabase dashboard for auth errors
- [ ] Check application logs for `401` patterns
- [ ] Verify user signups work
- [ ] Test password reset from production

---

## 🆘 Rollback Plan

If auth fails in production:

1. **Immediate:**
   - [ ] Revert deployment
   - [ ] Check environment variables
   - [ ] Verify Supabase project settings

2. **Diagnosis:**
   - [ ] Check Network tab for `401` responses
   - [ ] Verify `apikey` header in requests
   - [ ] Check Supabase dashboard for errors

3. **Fix:**
   - [ ] Update env vars if incorrect
   - [ ] Verify key matches project
   - [ ] Restart services after env changes

---

## 📚 Related Documentation

- `SUPABASE_KEYS_EXPLAINED.md` - Key types and usage
- `AUTH-ARCHITECTURE.md` - Full auth system design
- `PRODUCTION_ENV_STRATEGY.md` - Environment variable strategy
- `AUTH_TESTING_PROMPT.md` - Verification procedures

---

## ✅ Final Checklist

Before marking deployment as complete:

- [ ] All pre-deployment checks pass
- [ ] Environment variables verified
- [ ] Supabase configuration verified
- [ ] Auth flows tested in production
- [ ] No `401` errors
- [ ] Monitoring set up
- [ ] Rollback plan documented
- [ ] Team notified of deployment

---

**Remember:** Authentication is critical infrastructure. If anything feels wrong, stop and verify before proceeding.
