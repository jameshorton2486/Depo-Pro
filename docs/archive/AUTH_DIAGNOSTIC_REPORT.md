# Depo-Pro Auth Diagnostic Report
Generated: 2026-03-09T05:54:55.109Z
Duration: 7.9s

## Summary

| Result | Count |
|--------|-------|
| PASS | 33 |
| FAIL | 0 |
| WARN | 0 |
| SKIP | 0 |
| INFO | 3 |
| **Auth Readiness** | **READY** |

## All Results

| Category | Test | Status | Detail |
|----------|------|--------|--------|
| Server | Dev server reachable | PASS | HTTP 200 at http://localhost:3000 |
| Supabase | NEXT_PUBLIC_SUPABASE_URL | INFO | https://ildhcfspbmhuemzgvzyx.supabase.co |
| Supabase | Auth API reachable | PASS | Connected — signup enabled: true |
| Supabase | Schema public access (anon) | PASS | anon role can query public schema |
| Supabase | Service role key | PASS | Admin API accessible — 1 user(s) in page |
| RLS | anon access: profiles | PASS | Query succeeds (RLS filters rows) |
| RLS | anon access: jobs | PASS | Query succeeds (RLS filters rows) |
| RLS | anon access: firms | PASS | Query succeeds (RLS filters rows) |
| RLS | anon access: transcriptions | PASS | Query succeeds (RLS filters rows) |
| Public Pages | /login | PASS | HTTP 200 — accessible without auth |
| Public Pages | /register | PASS | HTTP 200 — accessible without auth |
| Public Pages | /forgot-password | PASS | HTTP 200 — accessible without auth |
| Public Pages | /reset-password | PASS | HTTP 200 — accessible without auth |
| Public Pages | /unauthorized | PASS | HTTP 200 — accessible without auth |
| Protected Pages | /dashboard | PASS | HTTP 307 -> /login?redirect=%2Fdashboard (correctly blocked) |
| Protected Pages | /jobs | PASS | HTTP 307 -> /login?redirect=%2Fjobs (correctly blocked) |
| Protected Pages | /reporter | PASS | HTTP 307 -> /login?redirect=%2Freporter (correctly blocked) |
| Protected Pages | /scopist | PASS | HTTP 307 -> /login?redirect=%2Fscopist (correctly blocked) |
| Protected Pages | /attorney | PASS | HTTP 307 -> /login?redirect=%2Fattorney (correctly blocked) |
| Protected Pages | /admin | PASS | HTTP 307 -> /login?redirect=%2Fadmin (correctly blocked) |
| Redirects | /unauthorized page | PASS | HTTP 200 — error page renders correctly |
| Redirects | /auth/callback route | PASS | HTTP 307 -> https://depo-pro.com/login?error=auth_callback_failed — route exists |
| Redirects | /auth/confirm route | PASS | HTTP 307 — route exists |
| Login | Login page renders | PASS | HTTP 200 |
| Login | Login form present | PASS | Page contains email/password form elements |
| Login | Auth method | INFO | Login is client-side via supabase.auth.signInWithPassword() — no API route needed |
| Password Reset | Forgot password page | PASS | HTTP 200 |
| Password Reset | Reset page form | PASS | Page contains password form elements |
| Password Reset | /auth/callback (no code) | PASS | Graceful redirect -> https://depo-pro.com/login?error=auth_callback_failed |
| Password Reset | Reset flow | INFO | Flow: forgot-password -> Supabase email -> /auth/callback?next=/reset-password -> reset-password page -> supabase.auth.updateUser() |
| API Guards | Jobs list | PASS | HTTP 401 — correctly rejects unauthenticated |
| API Guards | Transcripts list | PASS | HTTP 401 — correctly rejects unauthenticated |
| API Guards | Admin health (role-gated) | PASS | HTTP 401 — correctly rejects unauthenticated |
| API Guards | Cron secret enforcement | PASS | HTTP 401 — wrong secret correctly rejected |
| Health | /api/health | PASS | HTTP 200 — status: healthy |
| Health | /api/health/supabase | PASS | HTTP 200 — {"status":"ok","message":"Supabase connected (RLS check inconclusive)","timestam |

## Manual Verification Required

These cannot be tested programmatically:

- [ ] Supabase Dashboard > Auth > Email Templates > Reset Password URL is:
      `{{ .SiteURL }}/auth/callback?next=/reset-password`
- [ ] Supabase Dashboard > Auth > URL Configuration > Redirect URLs includes:
      `https://depo-pro.com/auth/callback`
- [ ] Password reset email actually arrives in inbox
- [ ] Clicking reset link lands on password form (not spinner)
- [ ] Login with real credentials succeeds end-to-end
- [ ] Dashboard loads with real data after login
