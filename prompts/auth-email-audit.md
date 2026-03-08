# Auth & Email Flow Audit Prompt

You are auditing the Depo-Pro Next.js 16 application for all authentication
and email delivery flows. The stack is: Next.js 16 App Router, Supabase SSR
(@supabase/ssr), proxy.ts (NOT middleware.ts), TypeScript, Vercel deployment.

Project ref: ildhcfspbmhuemzgvzyx
Domain: https://depo-pro.com
Auth pattern: getCurrentUser() from @/lib/auth/session only
SMTP: smtp.zoho.com, smtp_user: info@depo-pro.com

HARD CONSTRAINTS:
- Do NOT modify supabase/migrations/ or any .sql files
- Do NOT re-introduce NextAuth, Prisma, or removed packages
- Do NOT add new npm packages
- console.log is forbidden — use console.warn or console.error only
- Run npx tsc --noEmit after ALL changes — must return 0 errors

## AUDIT SCOPE 1 — SUPABASE AUTH CONFIG

Using the Supabase Management API or MCP, verify:

1. mailer_autoconfirm = false
2. smtp_host = smtp.zoho.com
3. smtp_port = 587
4. smtp_user = info@depo-pro.com
5. smtp_admin_email = info@depo-pro.com
6. smtp_sender_name = Depo-Pro
7. site_url = https://depo-pro.com
8. uri_allow_list contains https://depo-pro.com/** only
   (flag any app.depo-pro.com or localhost entries)
9. external_email_enabled = true
10. mailer_secure_email_change_enabled = true

Report any mismatches and patch them via PATCH /v1/projects/{ref}/config/auth.

## AUDIT SCOPE 2 — EMAIL FLOW CODE AUDIT

Search the codebase for all email-related code:

1. Find all files that call /auth/v1/recover or supabase.auth.resetPasswordForEmail()
2. Find all files that call supabase.auth.signUp() — verify emailRedirectTo points
   to https://depo-pro.com not localhost
3. Find all files that call supabase.auth.updateUser() with email
4. Find all hardcoded localhost:3000 strings in app/ and lib/ — replace with
   process.env.NEXT_PUBLIC_SITE_URL ?? 'https://depo-pro.com'
5. Check lib/email.ts — verify all URLs use NEXT_PUBLIC_SITE_URL not localhost
6. Verify /app/auth/ routes exist: forgot-password, reset-password, verify-email
7. Check that reset-password page handles the token_hash + type=recovery
   URL params from Supabase correctly

## AUDIT SCOPE 3 — AUTH SESSION FLOW

1. Verify proxy.ts exists at root and exports named export `proxy` (not middleware)
2. Verify no root middleware.ts exists
3. Verify getCurrentUser() in lib/auth/session.ts uses @supabase/ssr createServerClient
4. Verify no getSession() calls anywhere in app/ or lib/
5. Verify no next-auth imports anywhere
6. Check all protected routes use getCurrentUser() and return 401/redirect if null
7. Verify /app/api/auth/ routes if they exist — check for proper session handling

## AUDIT SCOPE 4 — END TO END TEST

After all fixes, run this sequence and report pass/fail for each:

- CHECK 1: npx tsc --noEmit → 0 errors
- CHECK 2: npx eslint . --max-warnings=0 → 0 warnings
- CHECK 3: npm run build → successful
- CHECK 4: rg -n "localhost:3000" app lib -g "*.ts" -g "*.tsx" → 0 results
- CHECK 5: rg -n "console\.log" app lib -g "*.ts" -g "*.tsx" → 0 results
- CHECK 6: rg -n "getSession()" app lib -g "*.ts" -g "*.tsx" → 0 results
- CHECK 7: rg -n "next-auth" app lib -g "*.ts" -g "*.tsx" → 0 results
- CHECK 8: Trigger POST /auth/v1/recover → returns {} with no error

Commit all fixes under: "fix: auth and email flow audit corrections"
Report a final status table with PASS/FAIL for each check.
