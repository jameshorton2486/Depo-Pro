# 📧 Supabase Email Configuration Guide

## 🔴 CRITICAL: Email Service Not Configured

**Current Status:** ❌ Password reset and registration emails are failing with "Invalid API key" error.

**Root Cause:** Supabase has no email service configured.

---

## ✅ SOLUTION: Choose ONE Option

### Option A: Enable Supabase Built-in Email (Easiest - Recommended for Dev)

**Steps:**
1. Go to: https://supabase.com/dashboard
2. Select your project: **ildhcfspbmhuemzgvzyx**
3. Navigate to: **Authentication → Settings → Email**
4. Enable:
   - ✅ **"Enable email confirmations"**
   - ✅ **"Enable password resets"**
5. Configure Site URL:
   - **Site URL:** `http://localhost:3000` (for dev)
   - **Redirect URLs:** Add `http://localhost:3000/**` and `http://localhost:3000/auth/callback`
6. **Save**

**Email Templates (Optional):**
- Go to: **Authentication → Email Templates**
- Customize confirmation and reset emails
- Default templates work fine for testing

**Pros:**
- ✅ No additional setup required
- ✅ Works immediately
- ✅ Free tier includes email sending
- ✅ Perfect for development

**Cons:**
- ⚠️ Emails come from Supabase domain (may go to spam)
- ⚠️ Limited customization
- ⚠️ Rate limits on free tier

---

### Option B: Configure Resend SMTP (Better for Production)

**Prerequisites:**
1. Sign up at: https://resend.com
2. Verify your domain (e.g., `depo-pro.com`)
3. Get your Resend API key

**Steps:**
1. Go to: https://supabase.com/dashboard
2. Select your project: **ildhcfspbmhuemzgvzyx**
3. Navigate to: **Project Settings → Auth**
4. Scroll to **"SMTP Settings"**
5. Configure:
   - **Enable Custom SMTP:** ✅ ON
   - **SMTP Host:** `smtp.resend.com`
   - **SMTP Port:** `465` (SSL) or `587` (TLS)
   - **SMTP User:** `resend`
   - **SMTP Password:** Your Resend API key (e.g., `re_xxxxxxxxxx`)
   - **Sender Email:** `noreply@your-verified-domain.com` (must be verified in Resend)
   - **Sender Name:** `Depo-Pro` (optional)
6. **Test SMTP Connection**
7. **Save**

**Domain Verification in Resend:**
1. Go to: https://resend.com/domains
2. Click **"Add Domain"**
3. Enter your domain: `depo-pro.com`
4. Add DNS records (MX, TXT, DKIM) to your domain provider
5. Wait for verification (5-60 minutes)
6. Once verified, use `noreply@depo-pro.com` as sender

**Pros:**
- ✅ Professional sender address
- ✅ Better deliverability
- ✅ Full email customization
- ✅ Higher rate limits
- ✅ Email analytics

**Cons:**
- ⚠️ Requires domain verification
- ⚠️ Additional service to manage
- ⚠️ Costs money at scale

---

### Option C: Use Another SMTP Provider

If you have another SMTP provider (SendGrid, Mailgun, AWS SES, etc.):

**Steps:**
1. Get SMTP credentials from your provider
2. Go to Supabase Dashboard → Project Settings → Auth → SMTP Settings
3. Configure:
   - **SMTP Host:** Your provider's SMTP host
   - **SMTP Port:** Usually `465` (SSL) or `587` (TLS)
   - **SMTP User:** Your SMTP username
   - **SMTP Password:** Your SMTP password
   - **Sender Email:** Verified sender address
4. Test and save

**Common SMTP Providers:**
- **SendGrid:** `smtp.sendgrid.net:587`
- **Mailgun:** `smtp.mailgun.org:587`
- **AWS SES:** `email-smtp.region.amazonaws.com:587`
- **Gmail (via App Password):** `smtp.gmail.com:587`

---

## 🔍 VERIFICATION

After configuring email service:

### Test 1: Password Reset Email
1. Go to: http://localhost:3000/forgot-password
2. Enter: `jameshorton2486@gmail.com`
3. Click: "Send Reset Link"
4. Check console for errors (should be none)
5. Check email inbox for reset link
6. Click link - should redirect to reset password page

### Test 2: Registration Email
1. Go to: http://localhost:3000/register
2. Fill out form and submit
3. Check email inbox for confirmation link
4. Click link - should confirm email and redirect

### Test 3: Check Supabase Logs
1. Go to: Supabase Dashboard → Logs → Auth Logs
2. Look for email sending events
3. Should see "Email sent" entries (not errors)

---

## 🚨 TROUBLESHOOTING

### Issue: "Invalid API key" Error
**Cause:** Email service not configured or SMTP credentials wrong  
**Fix:**
- Enable built-in email (Option A), OR
- Verify SMTP credentials are correct (Option B/C)

### Issue: Emails Not Received
**Check:**
- ✅ Check spam/junk folder
- ✅ Verify sender email is correct
- ✅ Check Supabase Auth Logs for sending errors
- ✅ Verify domain is verified (for Resend)
- ✅ Check rate limits (free tier has limits)

### Issue: Email Link Expired
**Cause:** Links expire after 1 hour (default)  
**Fix:** User must request new email

### Issue: Redirect Not Working
**Check:**
- ✅ `NEXT_PUBLIC_SITE_URL` is set in `.env.local`
- ✅ Redirect URLs added in Supabase Dashboard → Auth → URL Configuration
- ✅ `/auth/callback` route exists (it does)

---

## 📋 ENVIRONMENT VARIABLES REQUIRED

**Already Set:**
- ✅ `NEXT_PUBLIC_SITE_URL=http://localhost:3000`

**Optional (if using Resend for app emails, not Supabase):**
- `USE_RESEND=true`
- `RESEND_API_KEY=your_key`
- `FROM_EMAIL=noreply@your-domain.com`

**Note:** Supabase uses its own SMTP config from Dashboard, not env vars.

---

## ✅ RECOMMENDED CONFIGURATION

**For Development:**
- ✅ Use Option A (Supabase built-in email)
- ✅ Site URL: `http://localhost:3000`
- ✅ Enable both confirmations and resets

**For Production:**
- ✅ Use Option B (Resend SMTP) for better deliverability
- ✅ Site URL: `https://your-domain.com`
- ✅ Verify domain in Resend
- ✅ Use verified sender address

---

**Next Step:** Configure email service using Option A or B above, then test password reset flow.
