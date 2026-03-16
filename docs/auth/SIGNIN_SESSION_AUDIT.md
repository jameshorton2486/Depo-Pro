# Sign-In & Session Persistence Audit

## Scope

This audit covers the end-to-end sign-in/session lifecycle for the web application:

- Login submission and redirect handling
- Browser Supabase client session storage behavior
- Server session validation behavior
- Middleware session client behavior
- Logout behavior

## Findings

### 1) Persistent sign-in behavior originated from long-lived auth cookies

The app uses Supabase SSR clients for browser, server, and middleware flows.
Without explicit cookie session hardening, auth cookies are long-lived and survive browser/app/device restarts.

### 2) Login flow itself was structurally correct

Login page correctly:

- calls `supabase.auth.signInWithPassword()`
- verifies a session is returned
- validates redirect target safety
- redirects to dashboard

The observed issue was not invalid credentials handling, but session lifetime policy.

### 3) Logout endpoint existed and was functional

`/logout` calls `supabase.auth.signOut()` and redirects to `/login`.

## Changes Applied

To enforce "log in again after browser/device restart" behavior, Supabase cookie policy was tightened to session-scoped cookies.

Updated files:

- `lib/supabase/browser.ts`
- `lib/supabase/server.ts`
- `lib/supabase/middleware.ts`

All three now set cookie options with:

- `lifetime: 0` (session-cookie behavior)
- `sameSite: 'lax'`
- `secure` in production
- `path: '/'`

## Expected Behavior After Fix

- User can still sign in normally.
- Session works for active browsing.
- Closing browser / system reboot ends session.
- User is required to sign in again when returning.

## Recommended Validation Steps

1. Log in and navigate to authenticated pages.
2. Verify protected routes work while browser is open.
3. Close all browser windows.
4. Re-open browser and return to app.
5. Confirm user is redirected to `/login` and cannot access protected pages without signing in.

## Notes

If business needs evolve, this can be relaxed later by changing cookie lifetime policy centrally in the three Supabase client wrappers.
