# Depo-Pro Authentication Architecture

## Overview

Depo-Pro uses **Supabase Auth exclusively**.  
No other authentication providers are permitted.

This document defines the authentication contract for all developers, contractors, and contributors.

---

## Client Types

### Browser Client
- **File:** `lib/supabase/browser.ts`
- **Uses:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Purpose:** Login, logout, session refresh, client-side auth operations
- **Access:** `getSupabaseBrowserClient()`
- **Example:**
  ```ts
  import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signInWithPassword({ email, password });
  ```

### Server Client
- **File:** `lib/supabase/server.ts`
- **Uses:** `cookies()` from Next.js, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Purpose:** SSR, API routes, protected pages, server-side auth checks
- **Access:** `createSupabaseServerClient()`
- **Example:**
  ```ts
  import { createSupabaseServerClient } from '@/lib/supabase/server';
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  ```

### Middleware Client
- **File:** `lib/supabase/middleware.ts`
- **Uses:** Request cookies, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Purpose:** Session refresh, route protection in middleware
- **Access:** `createMiddlewareClient(request)`
- **Example:**
  ```ts
  import { createMiddlewareClient } from '@/lib/supabase/middleware';
  const { supabase, response } = await createMiddlewareClient(request);
  ```

### Admin Client
- **File:** `lib/supabase/admin.ts`
- **Uses:** `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- **Purpose:** System tasks, RLS bypass, administrative operations
- **Access:** `getSupabaseAdmin()`
- **Example:**
  ```ts
  import { getSupabaseAdmin } from '@/lib/supabase/admin';
  const admin = getSupabaseAdmin();
  ```

⚠️ **CRITICAL:** Admin client is **NEVER** imported into client code.  
🚫 **FORBIDDEN:** Using admin client in `'use client'` components.

---

## Forbidden Patterns 🚫

The following patterns are **strictly forbidden** and will cause PR rejection:

- ❌ **NextAuth** - Removed, not allowed
- ❌ **JWT decoding** - Use Supabase's built-in session management
- ❌ **Manual cookie parsing** - Supabase handles cookies automatically
- ❌ **`process.env` usage outside `lib/env.ts`** - Use centralized env validation
- ❌ **Importing admin client into client code** - Security violation
- ❌ **Creating multiple Supabase clients in the same component** - Use singleton pattern
- ❌ **Accessing `process.env` in client components** - Use `NEXT_PUBLIC_*` vars only

---

## Environment Rules

### Required Variables

**Browser-safe (must start with `NEXT_PUBLIC_`):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

**Server-only (never exposed to browser):**
- `SUPABASE_SERVICE_ROLE_KEY` - Admin operations only

### Validation

- ✅ Environment validation **blocks build** if vars are missing
- ✅ Missing envs = **fatal error** at startup
- ✅ Env validation enforced in `lib/env.ts` and `app/layout.tsx`

---

## RLS Policy Model

### Requirements

- ✅ All tables **require RLS** (Row Level Security)
- ✅ Auth enforced via `auth.uid()` in policies
- ✅ Roles resolved via `users.role` column
- ✅ RLS policies verified at runtime via `scripts/verify-rls.ts`

### Policy Pattern

```sql
-- Example RLS policy
CREATE POLICY "Users can read own profile"
ON users FOR SELECT
USING (auth.uid() = id);
```

---

## Testing Requirements

All of the following **must pass** before deployment:

1. ✅ **Playwright auth test** (`tests/e2e/auth.spec.ts`)
   - Run: `npx playwright test tests/e2e/auth.spec.ts`
   - Validates: Login flow, cookie persistence, route protection

2. ✅ **RLS verification script** (`scripts/verify-rls.ts`)
   - Run: `tsx scripts/verify-rls.ts`
   - Validates: RLS policies are enforced

3. ✅ **Health check endpoint** (`/api/health/supabase`)
   - Run: `curl http://localhost:3000/api/health/supabase`
   - Validates: Supabase connectivity and RLS enforcement

---

## Authentication Flow

### Login Flow
1. User submits credentials → `app/(auth)/login/page.tsx`
2. Browser client calls `supabase.auth.signInWithPassword()`
3. Supabase sets auth cookies automatically
4. Middleware refreshes session on next request
5. User redirected to `/dashboard`

### Password Reset Flow
1. User requests reset → `app/(auth)/forgot-password/page.tsx`
2. Browser client calls `supabase.auth.resetPasswordForEmail()`
3. Supabase sends email with recovery link
4. User clicks link → `/auth/callback?type=recovery`
5. Callback handler exchanges code for session
6. User redirected to `/reset-password`
7. User updates password → `supabase.auth.updateUser()`

### Session Management
- Sessions stored in HTTP-only cookies (managed by Supabase)
- Middleware refreshes expired sessions automatically
- No manual cookie manipulation required

---

## Error Handling

### Client-Side Errors
- Use `parseAuthError()` from `lib/supabase/parse-auth-error.ts`
- Display user-friendly messages
- Log technical details for debugging

### Server-Side Errors
- Return appropriate HTTP status codes
- Never expose internal error details to clients
- Log errors server-side for monitoring

---

## Security Guarantees

After implementing this architecture:

- ✅ App will not boot without correct env vars
- ✅ Supabase key always injected at build time
- ✅ Auth failures are isolated instantly
- ✅ No legacy auth conflicts
- ✅ Architecture is audit-ready (legal SaaS)
- ✅ CI/CD safe (env drift blocked)

---

## Violations

**Any PR violating these rules will be rejected.**

If you're unsure about an approach:
1. Check this document first
2. Review existing code in `lib/supabase/*`
3. Ask in PR comments before implementing

---

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js App Router + Supabase](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [RLS Policies Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**Last Updated:** 2025-01-XX  
**Maintained By:** Platform Team  
**Review Frequency:** Quarterly
