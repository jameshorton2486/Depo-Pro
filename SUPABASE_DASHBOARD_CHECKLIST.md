# Supabase Dashboard Configuration Checklist

**Project:** Depo-Pro
**Project ID:** `ildhcfspbmhuemzgvzyx`
**Dashboard:** https://supabase.com/dashboard/project/ildhcfspbmhuemzgvzyx

---

## 🔐 Authentication → URL Configuration

### Site URL
- [ ] **Local Development:**
  - Set to: `http://localhost:3000`

- [ ] **Production:**
  - Set to: `https://your-production-domain.com`
  - Update when deploying to production

### Redirect URLs
Add ALL of these URLs (one per line):

#### Development URLs:
- [ ] `http://localhost:3000`
- [ ] `http://localhost:3000/auth/callback`
- [ ] `http://localhost:3000/reset-password`

#### Production URLs (add when deploying):
- [ ] `https://your-domain.com`
- [ ] `https://your-domain.com/auth/callback`
- [ ] `https://your-domain.com/reset-password`

**Why this matters:** These URLs whitelist where Supabase can redirect users after email verification, password reset, and OAuth flows.

---

## 📧 Authentication → Email Templates

### Confirm Signup
- [ ] Uses `{{ .ConfirmationURL }}` token
- [ ] Redirects to correct callback URL
- [ ] Professional branding/styling (optional)

### Reset Password
- [ ] Uses `{{ .ConfirmationURL }}` token
- [ ] Link expiration: **1 hour** (default)
- [ ] Clear instructions for users
- [ ] **CRITICAL:** Must be configured for password reset to work

### Magic Link
- [ ] Uses `{{ .ConfirmationURL }}` token
- [ ] Enabled if using passwordless login

### Invite User
- [ ] Uses `{{ .ConfirmationURL }}` token
- [ ] Enabled if using team invites

**Email Configuration:**
- [ ] SMTP settings configured (if custom email)
- [ ] "From" email address set correctly
- [ ] Test emails being delivered (check spam folder)

---

## 🔑 Authentication → Providers

### Email Provider
- [ ] **Enabled** ✅
- [ ] Minimum password strength requirements set

### Email Settings
- [ ] **Confirm Email:**
  - ✅ Enabled (production) - users must verify email
  - ⚠️ Can disable for development testing

- [ ] **Secure Email Change:** Enabled (recommended)
- [ ] **Auto Confirm Users:**
  - ❌ DISABLED in production
  - Can enable in development for faster testing

### OAuth Providers (if used)
- [ ] Google OAuth configured
- [ ] Microsoft OAuth configured
- [ ] Other providers as needed

---

## 🛡️ Authentication → Policies

### Password Requirements
- [ ] **Minimum Length:** 8 characters (matches code validation)
- [ ] Your code enforces: uppercase + lowercase + number

### Session Settings
- [ ] **Session Duration:** Default 3600 seconds (1 hour)
- [ ] **Refresh Token Lifetime:** Default 2592000 seconds (30 days)

### Security
- [ ] **Enable MFA:** Consider for admin users
- [ ] **Hook Functions:** Configure if using custom auth logic

---

## ⏱️ Authentication → Rate Limits

### Email Rate Limits
- [ ] **Password Reset:** 3 emails per hour per IP (default)
- [ ] **Email Confirmation:** Similar limits
- [ ] Adjust if too restrictive during development
- [ ] Re-enable strict limits in production

**Common Issue:** If you're testing password reset multiple times, you may hit rate limits. Solutions:
- Wait 1 hour
- Use different email addresses
- Temporarily increase limit in dashboard
- Use Supabase dashboard to manually reset password

---

## 🗄️ Database → Connection Pooling

### Pooler Configuration
- [ ] **PgBouncer Enabled** ✅
- [ ] **Mode:** Transaction mode (recommended for Prisma)
- [ ] **Pool Size:** Adjust based on usage

### Connection Strings
Verify these match your `.env.local`:
- [ ] **Pooled (6543):** Used by Prisma in production
- [ ] **Direct (5432):** Used for migrations

---

## 💾 Storage → Buckets

### Required Buckets
Create these buckets for Depo-Pro:

- [ ] **audio-uploads**
  - Purpose: Deposition audio files
  - Public: No (private by default)
  - File size limit: Adjust based on audio length

- [ ] **transcripts**
  - Purpose: Generated transcript documents
  - Public: No

- [ ] **exhibits**
  - Purpose: Case exhibits and documents
  - Public: No

### Bucket Policies (RLS)
For each bucket:
- [ ] RLS policies enabled
- [ ] Authenticated users can upload
- [ ] Users can only access their own files (or team files)
- [ ] Service role has admin access

Example policy:
```sql
-- Allow users to upload their own files
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to read their own files
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## 🔧 Project Settings → API

### API Keys
Verify these match your `.env.local` file:

- [ ] **Project URL:** `https://ildhcfspbmhuemzgvzyx.supabase.co` ✅
- [ ] **Anon Key:** Starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` ✅
- [ ] **Service Role Key:** Different from anon key, highly privileged ✅

### API Settings
- [ ] **JWT Secret:** Auto-generated, don't change unless necessary
- [ ] **JWT Expiry:** Default 3600 seconds

---

## 🌐 Project Settings → General

### Project Information
- [ ] Project name set
- [ ] Organization set correctly
- [ ] Region: Choose closest to users (can't change after creation)

### Pause Project
- [ ] **Auto-pause:** Disabled for production
- [ ] Can enable for development to save costs

---

## 📊 Database → RLS Policies

### Critical Tables
Ensure Row Level Security (RLS) is enabled on all tables:

- [ ] **users** - Users can read/update own profile
- [ ] **cases** - Users see only their cases or firm's cases
- [ ] **transcripts** - Users access transcripts from their cases
- [ ] **audio_files** - Linked to cases with proper access control
- [ ] **audit_logs** - Read-only for users, admin access for service role

Example RLS policy:
```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id);
```

---

## 🔍 Monitoring & Logs

### Database Logs
- [ ] Check query performance in Dashboard → Database → Query Performance
- [ ] Monitor slow queries
- [ ] Check for missing indexes

### Auth Logs
- [ ] Review failed login attempts
- [ ] Check for suspicious activity
- [ ] Monitor rate limit hits

### API Logs
- [ ] Check for 4xx/5xx errors
- [ ] Monitor API usage

---

## 🚀 Production Readiness

### Before Going Live:
- [ ] All redirect URLs updated to production domain
- [ ] Site URL set to production domain
- [ ] Email templates tested and branded
- [ ] Email confirmation enabled
- [ ] Rate limits configured appropriately
- [ ] Storage buckets created with RLS policies
- [ ] Database RLS enabled on all tables
- [ ] Backup policy configured
- [ ] Monitoring/alerts set up
- [ ] API keys rotated from development
- [ ] Service role key kept secret (never in client code)

---

## 🐛 Troubleshooting Common Issues

### "Email link is invalid or has expired"
**Causes:**
1. Link expired (1 hour default)
2. Redirect URL not whitelisted in dashboard
3. User clicked link multiple times
4. Link from old email after requesting new reset

**Solutions:**
- ✅ Add all callback URLs to redirect whitelist
- ✅ Request a new password reset email
- ✅ Check email rate limits

### "User not found" on login
**Causes:**
1. Email not confirmed (if confirm email is enabled)
2. User doesn't exist
3. Wrong credentials

**Solutions:**
- Check if email confirmation is required
- Manually confirm user in dashboard if testing
- Check user exists in Authentication → Users

### Password reset email not received
**Causes:**
1. Email in spam folder
2. SMTP not configured correctly
3. Rate limit hit
4. Email address typo

**Solutions:**
- Check spam folder
- Check Supabase dashboard → Authentication → Logs
- Wait 1 hour if rate limited
- Use dashboard to manually reset password for testing

### Storage upload fails
**Causes:**
1. Bucket doesn't exist
2. RLS policy blocks upload
3. File size exceeds limit

**Solutions:**
- Create bucket if missing
- Review/update RLS policies
- Check file size limits in bucket settings

---

## 📋 Quick Verification Script

Run this locally to verify configuration:
```powershell
.\audit-supabase-config.ps1
```

This script checks:
- ✅ Environment variables
- ✅ Code implementation
- ✅ API connectivity
- ⚠️ Manual dashboard settings (checklist provided)

---

## 📞 Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **Auth Docs:** https://supabase.com/docs/guides/auth
- **RLS Guide:** https://supabase.com/docs/guides/auth/row-level-security
- **Storage Docs:** https://supabase.com/docs/guides/storage
- **Dashboard:** https://supabase.com/dashboard/project/ildhcfspbmhuemzgvzyx

---

**Last Updated:** January 12, 2026
**Status:** Development Configuration Active
