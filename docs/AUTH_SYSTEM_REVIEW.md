# Depo-Pro Authentication System

## Configuration
- **Library:** NextAuth v5 (Credentials provider only)
- **Session Strategy:** JWT (stateless, 30-day max age configured in `lib/auth-options.ts`)
- **Password Hashing:** `bcryptjs` – passwords are hashed on registration (currently client-side) and verified server-side via `bcrypt.compare`

## User Roles
| Role | Description |
|------|-------------|
| ADMIN | Intended for platform owners; can access all dashboards and API routes (admin UI still under construction). |
| COURT_REPORTER | Core depositor persona; creates jobs, uploads files, and manages scopist assignments. |
| SCOPIST | Reviewer/editor role; works on assigned jobs and low-confidence word review flows. |

## Auth Flow
### Login
1. User submits email/password from `app/(auth)/login/page.tsx`.
2. `signIn('credentials')` triggers `authorize` in `lib/auth-options.ts`, which validates input with Zod and looks up the user via Prisma.
3. Password is compared using `bcrypt.compare`; on success, NextAuth issues a JWT storing `id`, `email`, `name`, and `role`.
4. The session callback hydrates `session.user` with those claims, and the client redirects to `/dashboard`.

### Registration
1. User fills out the form in `app/(auth)/register/page.tsx`, selects a role, and the page hashes the password with `bcrypt.hash` before sending it to `/api/auth/register`.
2. The API route validates presence of required fields, checks for duplicate email, and creates the Prisma `User` using the provided (already-hashed) password.
3. Success response triggers a redirect to `/login?registered=true`.

## Protected Routes
| Route Pattern | Protection | Notes |
|---------------|------------|-------|
| `/dashboard/*` | Authenticated | Middleware enforces login; server page redirects to role-specific dashboards. |
| `/reporter` | COURT_REPORTER | Middleware gates auth; page enforces role via `requireRole([Role.REPORTER])`. |
| `/scopist` | SCOPIST | Middleware + `requireRole([Role.SCOPIST])`. |
| `/jobs/*` | Authenticated | Middleware requires login; server components add additional role-specific guards (e.g., scopists redirected away from `/jobs/new`). |
| `/admin` | ADMIN (planned) | Middleware currently only enforces login; actual page still TODO. |
| `/api/*` (non-auth) | Authenticated | Middleware blocks unauthenticated API calls except `/api/auth/*`. |

## Files Reference
- Auth config: `lib/auth-options.ts`
- Auth helpers (`auth`, `requireRole`, etc.): `lib/auth.ts`
- Middleware: `middleware.ts`
- Login page: `app/(auth)/login/page.tsx`
- Register page: `app/(auth)/register/page.tsx`
- NextAuth API route: `app/api/auth/[...nextauth]/route.ts`
- Registration API: `app/api/auth/register/route.ts`

## Issues Found
- [ ] Password hashing happens on the client. Anyone intercepting the hashed password can reuse it as credentials. Move hashing to the server before persisting the user.
- [ ] Middleware only checks “logged in” vs. “guest”; role-specific gating (e.g., `/admin`) relies on each page to call `requireRole`, which is easy to forget.
- [ ] Verbose logging in `authorize` prints every login attempt (email, failure reason) to stdout. Good for debugging but risky for production logs.

## Status
- [x] Login flow: **Working**
- [ ] Registration flow: **Needs Fix** (hashing should be server-side and API should validate role assignments more strictly)
- [ ] Role protection: **Needs Fix** (middleware could enforce role policies to prevent accidental exposure)
