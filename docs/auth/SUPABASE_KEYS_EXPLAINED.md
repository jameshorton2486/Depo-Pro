# Supabase API Keys — Internal Reference

**Audience:** Developers, contractors, future you  
**Status:** Internal / Not public  
**Last Updated:** 2025-01-XX

---

## 🧩 Key Types Overview

Supabase provides multiple API key types. Using the wrong key will cause 401 errors, silent auth failures, or security issues.

| Key Type | Prefix | Where Found | Use Case |
|----------|--------|-------------|----------|
| **Publishable key** | `sb_publishable_` | Settings → API Keys | Browser & client auth (REQUIRED) |
| **Secret key** | `sb_secret_` | Settings → API Keys | Server-side privileged access |
| **Legacy anon key** | `eyJhbGciOi…` | API Keys → Legacy | ❌ Deprecated |
| **Service role key** | `eyJhbGciOi…` | API Keys → Legacy | Admin/server only |

---

## ✅ What Depo-Pro Uses (Authoritative)

### Browser & Client-Side Auth

```
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

- ✅ Safe for browsers
- ✅ Works with Supabase Auth
- ✅ Required for `/auth/v1/*` endpoints
- ✅ Enforced by Row Level Security (RLS)

**File:** `lib/supabase/browser.ts`

```ts
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // ← Must be sb_publishable_*
);
```

### Server / API Routes (Non-Privileged)

```
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

- ✅ Used with `createServerClient`
- ✅ Cookies determine user identity
- ✅ Respects RLS policies

**File:** `lib/supabase/server.ts`

### Admin / System Tasks ONLY

```
SUPABASE_SERVICE_ROLE_KEY=sb_secret_... (or legacy service_role)
```

- ⚠️ Bypasses RLS
- ⚠️ Never imported into client code
- ✅ `server-only` enforced

**File:** `lib/supabase/admin.ts`

---

## 🚫 Forbidden Patterns

- ❌ Using legacy JWT anon keys in browser
- ❌ Copying keys from a different Supabase project
- ❌ Decoding JWTs manually
- ❌ Storing secrets in client components
- ❌ Rotating keys without restarting services

---

## 🧠 Common Failure Modes

| Symptom | Root Cause |
|---------|------------|
| `401` on `/auth/v1/token` | Wrong project key |
| `401` on `/auth/v1/recover` | Legacy key mismatch |
| Cookies never set | Invalid API key |
| Auth works locally but not prod | Env mismatch |

---

## ✅ Golden Rule

**If the project URL is `ildhcfspbmhuemzgvzyx.supabase.co`, the API key MUST belong to that exact project — and must be the publishable key for browsers.**

---

## 🔍 How to Verify Your Key

1. **Check Supabase Dashboard:**
   - Go to Settings → API Keys
   - Find "Publishable" key (starts with `sb_publishable_`)
   - Copy the full key

2. **Verify in `.env.local`:**
   ```bash
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
   ```

3. **Test in Browser:**
   - Open DevTools → Network
   - Attempt login
   - Check request headers: `apikey: sb_publishable_...`
   - Verify response: `200 OK` (not `401`)

---

## 📚 Related Documentation

- `AUTH-ARCHITECTURE.md` - Full auth system architecture
- `PRODUCTION_ENV_STRATEGY.md` - Production deployment guide
- `ENV_SETUP.md` - Environment variable setup

---

## 🆘 Troubleshooting

### "401 Unauthorized" on Auth Endpoints

**First, verify your key format:**

```powershell
npm run verify:key
```

This will tell you if you're using the correct publishable key.

**If you see `eyJhbGciOi` in your key:**
1. ❌ **You're using a legacy JWT key** - This will NOT work
2. ✅ Get the publishable key from Supabase Dashboard → Settings → API Keys
3. ✅ Update `.env.local` with `sb_publishable_...` key
4. ✅ Run hard restart: `npm run restart:hard && npm run dev`
5. ✅ Hard refresh browser (close all tabs, open new one)

**If your key is correct but still getting 401:**
1. Verify key matches project URL
2. Check key starts with `sb_publishable_`
3. Ensure key is in `.env.local` (not just `.env.example`)
4. Restart dev server after changing env vars
5. Clear `.next` cache: `Remove-Item -Recurse -Force .next`
6. Hard refresh browser (close all tabs)

### "process is not defined" Error

- This means env vars weren't embedded at build time
- Solution: Restart dev server after env changes

### Auth Works Locally But Not in Production

- Check Vercel/env provider has correct `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Verify key matches production Supabase project
- Ensure production project has correct redirect URLs configured

---

**Remember:** The publishable key is safe to expose in browser bundles. The secret key must NEVER be in client code.
