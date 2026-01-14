# 🔍 CURSOR PROMPT — AUTH VERIFICATION ONLY

**Purpose:** Verify auth is working after fixes  
**Use:** Paste into Cursor after code changes  
**Status:** Testing/Verification Only

---

## ⚠️ IMPORTANT

You are acting as a QA Engineer validating Supabase authentication for the Depo-Pro application.

**⚠️ Do NOT modify business logic or refactor code.**  
**Your task is verification only.**

---

## 📋 Tasks

1. **Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` uses a `sb_publishable_*` key**
   - Check `.env.local` (or production env vars)
   - Confirm key starts with `sb_publishable_`
   - Verify key matches Supabase project URL

2. **Inspect Supabase client initialization (browser + server)**
   - Review `lib/supabase/browser.ts` - should be simple `createBrowserClient(url, key)`
   - Review `lib/supabase/server.ts` - should use cookies
   - Verify no validation logic in browser client (validation is in `lib/env.ts`)

3. **Run the app locally**
   ```bash
   npm run dev
   ```
   - App should start (or fail fast with clear error if env vars missing)
   - No `process is not defined` errors

4. **Test Authentication Flows:**

   **a) Login:**
   - Visit `http://localhost:3000/login`
   - Enter valid credentials
   - Submit form
   - **Expected:** Redirect to `/dashboard`
   - **Check:** Cookies set in DevTools → Application → Cookies

   **b) Forgot Password:**
   - Visit `http://localhost:3000/forgot-password`
   - Enter email
   - Submit form
   - **Expected:** Success message "Check Your Email"
   - **Check:** No 401 errors in Network tab

   **c) Page Refresh After Login:**
   - After successful login, refresh page
   - **Expected:** Session persists, no redirect to login
   - **Check:** User remains authenticated

5. **Inspect Network Tab:**

   **a) Request Headers:**
   - Open DevTools → Network
   - Filter by "auth"
   - Click on `/auth/v1/token` request
   - **Check:** `apikey: sb_publishable_...` header present
   - **Check:** `authorization: Bearer ...` header present (after login)

   **b) Response Status:**
   - `/auth/v1/token` → **Expected:** `200 OK`
   - `/auth/v1/recover` → **Expected:** `200 OK` (or `204 No Content`)
   - **Check:** No `401 Unauthorized` responses

   **c) Cookies:**
   - DevTools → Application → Cookies
   - **Check:** Cookie named `sb-<project-ref>-auth-token` exists
   - **Check:** Cookie has value (JSON array with tokens)

6. **Check Middleware:**
   - Verify middleware does not block auth routes
   - Test: Visit `/login` while logged out → should load
   - Test: Visit `/login` while logged in → should redirect to `/dashboard`
   - Test: Visit `/dashboard` while logged out → should redirect to `/login`

---

## 📊 Output Format

Provide a checklist with results:

```markdown
## Auth Verification Results

### Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` starts with `sb_publishable_`
- [ ] Key matches Supabase project URL
- [ ] Env vars loaded at startup

### Client Initialization
- [ ] Browser client is simple (no validation logic)
- [ ] Server client uses cookies correctly
- [ ] No `process is not defined` errors

### Authentication Flows
- [ ] Login works
- [ ] Forgot password works
- [ ] Cookies set correctly
- [ ] Session persists on refresh

### Network Requests
- [ ] `apikey: sb_publishable_...` header present
- [ ] `/auth/v1/token` returns `200 OK`
- [ ] `/auth/v1/recover` returns `200 OK` (or `204`)
- [ ] No `401 Unauthorized` errors

### Middleware
- [ ] Auth routes accessible when logged out
- [ ] Protected routes redirect when logged out
- [ ] Authenticated users redirected away from login

### Overall Status
- [ ] ✅ All checks pass
- [ ] ⚠️ Some checks failed (explain below)
- [ ] ❌ Critical failures (explain below)
```

---

## 🚨 If Any Item Fails

**Explain why, not just that it failed.**

For example:
- ❌ "Login doesn't work" → **Bad**
- ✅ "Login fails with `401 Unauthorized` from `/auth/v1/token`. Network tab shows `apikey` header is missing. Root cause: `NEXT_PUBLIC_SUPABASE_ANON_KEY` is not set in `.env.local`." → **Good**

---

## 🔧 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `401` on auth endpoints | Check key matches project, verify `sb_publishable_` prefix |
| Cookies not set | Verify key is valid, check Supabase project settings |
| `process is not defined` | Restart dev server, clear `.next` cache |
| Session doesn't persist | Check middleware cookie handling, verify RLS policies |

---

## ✅ Success Criteria

All of the following must pass:

1. ✅ Login completes successfully
2. ✅ Forgot password sends email (or shows success)
3. ✅ Cookies are set in browser
4. ✅ Session persists across page refreshes
5. ✅ No `401` errors from Supabase
6. ✅ Network requests include correct `apikey` header
7. ✅ Middleware correctly protects routes

---

**After verification, report results clearly. If all checks pass, auth is production-ready.**
