# 🚀 Depo-Pro Complete Deployment Guide to Vercel

**Last Updated:** November 13, 2025  
**Project:** Depo-Pro v0.1.0  
**Deployment Platform:** Vercel + Supabase PostgreSQL  

---

## 📊 Quick Overview

**Total Time:** 45-60 minutes  
**Estimated Monthly Cost:** $0 (development) → $45-70/mo (production)

### What This Guide Covers

1. ✅ Supabase PostgreSQL database setup
2. ✅ Supabase file storage configuration
3. ✅ Vercel project deployment
4. ✅ All environment variables configuration
5. ✅ Database migrations
6. ✅ Testing & verification

---

## 📋 Prerequisites Checklist

Before starting, make sure you have:

- [ ] GitHub repository up-to-date (`https://github.com/jameshorton2486/depo-pro`)
- [ ] Vercel account (sign up at https://vercel.com if needed)
- [ ] Supabase account (sign up at https://supabase.com if needed)
- [ ] Gmail account with 2FA enabled OR Google Workspace
- [ ] Deepgram account (sign up at https://console.deepgram.com)
- [ ] 45-60 minutes of uninterrupted time

**Optional Services (can add later):**
- [ ] Stripe account (for payments - Phase 3)
- [ ] Resend account (alternative to Gmail for email)
- [ ] Redis/Upstash (for background jobs - Phase 3)

---

# PART 1: SUPABASE SETUP (15 minutes)

## Step 1.1: Create Supabase Project

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Click **"New project"**

2. **Configure Project**
   ```
   Organization: [Select or create your organization]
   Name: depo-pro
   Database Password: [Generate strong password]
   Region: US East (North Virginia) - or closest to your users
   Pricing Plan: Free (upgrade to Pro later)
   ```

3. **Save Your Credentials!**
   ```
   ⚠️ CRITICAL: Save your database password immediately!
   You won't be able to see it again.
   
   Project Name: depo-pro
   Database Password: ___________________________
   ```

4. **Wait for Project Initialization**
   - Takes 2-3 minutes
   - You'll see "Setting up project..."
   - When done, you'll see the dashboard

---

## Step 1.2: Get Your Database Connection String

1. **Navigate to Database Settings**
   - In Supabase dashboard: **Settings** (left sidebar) → **Database**

2. **Copy Connection String**
   - Scroll to **"Connection string"** section
   - Click **"URI"** tab
   - Copy the string that looks like:
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
     ```

3. **Replace Password**
   - Replace `[YOUR-PASSWORD]` with your actual database password
   - Save this complete URL - you'll need it for Vercel

   **Example:**
   ```
   postgresql://postgres:MySecureP@ss123@db.abcdefghijk.supabase.co:5432/postgres
   ```

---

## Step 1.3: Get Supabase API Keys

1. **Navigate to API Settings**
   - In Supabase dashboard: **Settings** → **API**

2. **Copy These Keys:**
   
   **Project URL:**
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```
   
   **Anon/Public Key:**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M... (very long string)
   ```
   
   **Service Role Key:** ⚠️ **Keep this secret!**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M... (different long string)
   ```

3. **Save All Three Values:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=___________________________
   NEXT_PUBLIC_SUPABASE_ANON_KEY=___________________________
   SUPABASE_SERVICE_ROLE_KEY=___________________________
   ```

---

## Step 1.4: Create Storage Bucket for File Uploads

1. **Navigate to Storage**
   - Click **Storage** in left sidebar
   - Click **"Create a new bucket"**

2. **Configure Bucket**
   ```
   Name: depo-files
   Public bucket: ❌ OFF (UNCHECKED)
   File size limit: 100 MB
   Allowed MIME types: Leave empty (allow all)
   ```
   - Click **"Create bucket"**

3. **Configure Storage Policies**
   
   Click on your `depo-files` bucket → **Policies** tab → **New Policy**
   
   **Policy 1: Allow Authenticated Uploads**
   ```sql
   CREATE POLICY "Allow authenticated uploads"
   ON storage.objects
   FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'depo-files');
   ```
   
   **Policy 2: Allow Users to Read Files**
   ```sql
   CREATE POLICY "Allow authenticated reads"
   ON storage.objects
   FOR SELECT
   TO authenticated
   USING (bucket_id = 'depo-files');
   ```
   
   **Policy 3: Allow Users to Delete Their Files**
   ```sql
   CREATE POLICY "Allow authenticated deletes"
   ON storage.objects
   FOR DELETE
   TO authenticated
   USING (bucket_id = 'depo-files');
   ```

4. **Verify Policies**
   - You should see 3 policies listed
   - All should show "✓ Enabled"

---

## ✅ Supabase Checklist

At this point, you should have:

- [ ] Supabase project created
- [ ] Database password saved
- [ ] Full DATABASE_URL connection string ready
- [ ] NEXT_PUBLIC_SUPABASE_URL saved
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY saved
- [ ] SUPABASE_SERVICE_ROLE_KEY saved
- [ ] Storage bucket `depo-files` created and configured

---

# PART 2: EXTERNAL SERVICES SETUP (15 minutes)

## Step 2.1: Gmail App Password for Email Notifications

**Why needed:** Send job notifications, password resets, invoices

1. **Enable 2-Step Verification** (if not already)
   - Go to: https://myaccount.google.com/security
   - Click **"2-Step Verification"**
   - Follow setup wizard

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Click **"Select app"** → Choose **"Mail"**
   - Click **"Select device"** → Choose **"Other (Custom name)"**
   - Enter name: `Depo-Pro Application`
   - Click **"Generate"**

3. **Copy the 16-character password**
   ```
   Example: abcd efgh ijkl mnop
   
   ⚠️ Save this immediately - you won't see it again!
   ```

4. **Save Gmail Credentials:**
   ```
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=abcd efgh ijkl mnop
   FROM_EMAIL=your-email@gmail.com
   ```

---

## Step 2.2: Deepgram API Key for Audio Transcription

**Why needed:** Convert audio depositions to text using AI

1. **Create Deepgram Account**
   - Go to: https://console.deepgram.com/signup
   - Sign up with email or Google

2. **Create Project**
   - Click **"Create a Project"**
   - Name: `Depo-Pro`
   - Click **"Create Project"**

3. **Generate API Key**
   - Click **"API Keys"** in left sidebar
   - Click **"Create a New API Key"**
   - Name: `Production Key`
   - Expiration: `Never` (or set to your preference)
   - Click **"Create Key"**

4. **Copy API Key**
   ```
   Example: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   
   DEEPGRAM_API_KEY=___________________________
   ```

---

## Step 2.3: Generate NextAuth Secret

**Why needed:** Secure session tokens and authentication

**Option A: Using OpenSSL (Recommended)**
```bash
# Run in VS Code terminal or PowerShell
openssl rand -base64 32
```

**Option B: Using PowerShell**
```powershell
# Run in PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

**Option C: Online Generator**
- Go to: https://generate-secret.vercel.app/32
- Copy the generated secret

**Save the result:**
```
NEXTAUTH_SECRET=___________________________
```

---

## ✅ External Services Checklist

At this point, you should have:

- [ ] Gmail App Password generated
- [ ] SMTP_USER email saved
- [ ] SMTP_PASSWORD saved
- [ ] FROM_EMAIL saved
- [ ] Deepgram account created
- [ ] DEEPGRAM_API_KEY saved
- [ ] NEXTAUTH_SECRET generated and saved

---

# PART 3: VERCEL DEPLOYMENT (20 minutes)

## Step 3.1: Import Project to Vercel

1. **Go to Vercel Dashboard**
   - Navigate to: https://vercel.com/dashboard

2. **Add New Project**
   - Click **"Add New..."** → **"Project"**

3. **Import Git Repository**
   - If first time: Click **"Continue with GitHub"** → Authorize Vercel
   - Search for: `depo-pro`
   - Click **"Import"** next to your repository

4. **Configure Project (Don't Deploy Yet!)**
   ```
   Framework Preset: Next.js (auto-detected)
   Root Directory: ./
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

5. **⚠️ STOP! Don't click "Deploy" yet!**
   - Click **"Environment Variables"** section to expand it
   - We need to add all variables before first deployment

---

## Step 3.2: Add All Environment Variables

**Click "Environment Variables" section in Vercel deployment screen**

Add these variables one by one. For each variable:
1. Enter **Key** (variable name)
2. Enter **Value**
3. Select environments: **Production**, **Preview**, **Development** (all three)
4. Click **"Add"**

### 🔑 Required Variables (Must Have These!)

```bash
# ===================================
# DATABASE (Supabase PostgreSQL)
# ===================================
DATABASE_URL=postgresql://postgres:YOUR-PASSWORD@db.xxxxx.supabase.co:5432/postgres

# ===================================
# SUPABASE API KEYS
# ===================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ===================================
# FILE STORAGE (Supabase)
# ===================================
USE_CLOUD_STORAGE=true
SUPABASE_STORAGE_BUCKET=depo-files

# ===================================
# AUTHENTICATION (NextAuth.js)
# ===================================
NEXTAUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=https://your-app-name.vercel.app

# ===================================
# EMAIL (Gmail SMTP)
# ===================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=Depo-Pro

# ===================================
# TRANSCRIPTION (Deepgram)
# ===================================
USE_DEEPGRAM=true
DEEPGRAM_API_KEY=your-deepgram-api-key

# ===================================
# FEATURES (Enable core features)
# ===================================
USE_REAL_EXPORT=true
NODE_ENV=production
```

### 📋 Copy-Paste Template

Here's a template to fill in and paste:

```
DATABASE_URL=___________________________
NEXT_PUBLIC_SUPABASE_URL=___________________________
NEXT_PUBLIC_SUPABASE_ANON_KEY=___________________________
SUPABASE_SERVICE_ROLE_KEY=___________________________
USE_CLOUD_STORAGE=true
SUPABASE_STORAGE_BUCKET=depo-files
NEXTAUTH_SECRET=___________________________
NEXTAUTH_URL=https://_____.vercel.app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=___________________________
SMTP_PASSWORD=___________________________
FROM_EMAIL=___________________________
FROM_NAME=Depo-Pro
USE_DEEPGRAM=true
DEEPGRAM_API_KEY=___________________________
USE_REAL_EXPORT=true
NODE_ENV=production
```

---

## Step 3.3: Deploy Your Application

1. **After adding all environment variables**
   - Scroll to bottom
   - Click **"Deploy"**

2. **Watch Build Process** (takes 2-4 minutes)
   ```
   ✓ Installing dependencies
   ✓ Building Next.js application
   ✓ Running Prisma migrations (via postinstall)
   ✓ Optimizing production build
   ✓ Deployment ready
   ```

3. **Get Your Deployment URL**
   - After successful build, you'll see: `https://your-app-name.vercel.app`
   - Click **"Visit"** to open your app

4. **Update NEXTAUTH_URL**
   - Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
   - Find `NEXTAUTH_URL`
   - Update value to your actual Vercel URL: `https://your-actual-app-name.vercel.app`
   - Click **"Save"**
   - Click **"Redeploy"** to apply changes

---

## ✅ Vercel Deployment Checklist

- [ ] Project imported from GitHub
- [ ] All 18+ environment variables added
- [ ] First deployment successful
- [ ] Deployment URL received
- [ ] NEXTAUTH_URL updated with real URL
- [ ] Application redeployed with correct URL

---

# PART 4: DATABASE MIGRATIONS (5 minutes)

The migrations should run automatically during deployment via `postinstall` script.

## Verify Migrations Ran Successfully

1. **Check Vercel Build Logs**
   - In Vercel: **Deployments** tab → Click latest deployment
   - Click **"Building"** section
   - Look for:
     ```
     > prisma generate
     ✓ Generated Prisma Client
     
     Running migrations...
     ✓ Database migrations completed
     ```

2. **Verify in Supabase**
   - Go to Supabase Dashboard → **Table Editor**
   - You should see tables:
     - `User`
     - `Firm`
     - `Job`
     - `JobAssignment`
     - `JobFile`
     - `Transcript`
     - `JobDictionaryTerm`
     - `_prisma_migrations`

## If Migrations Didn't Run

**Manual migration from your local machine:**

```bash
# In VS Code terminal
cd C:\Users\james\depo-pro

# Create .env.local with production DATABASE_URL
echo "DATABASE_URL=your-production-database-url" > .env.local

# Run migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

Then redeploy on Vercel:
- Go to Vercel → **Deployments** → Click **"..."** → **"Redeploy"**

---

# PART 5: TESTING YOUR DEPLOYMENT (10 minutes)

## Test 5.1: Basic Application Load

1. **Visit Your App**
   - Go to: `https://your-app-name.vercel.app`
   - ✅ Should see login/register page
   - ✅ No console errors (press F12 to check)

## Test 5.2: User Registration

1. **Create Test Account**
   - Click **"Register"** or go to `/register`
   - Fill in:
     ```
     Name: Test User
     Email: test@example.com
     Password: TestPassword123!
     Role: Scopist
     ```
   - Click **"Register"**

2. **Verify Account Created**
   - Should redirect to `/dashboard`
   - ✅ You should be logged in
   - ✅ See dashboard with your name

## Test 5.3: Database Connection

1. **Check Supabase**
   - Go to Supabase → **Table Editor** → **User** table
   - ✅ Should see your test user
   - ✅ Password should be hashed (not plain text)

## Test 5.4: File Upload (Storage)

1. **Create a Test Job**
   - In dashboard, click **"New Job"** or go to `/dashboard/jobs/new`
   - Fill in basic details:
     ```
     Title: Test Deposition
     Case Name: Smith v. Jones
     ```
   - Click **"Create Job"**

2. **Upload Test File**
   - Click **"Add File"** or upload button
   - Upload any small file (PDF, audio, etc.)
   - ✅ File should upload successfully
   - ✅ No errors in console

3. **Verify in Supabase Storage**
   - Go to Supabase → **Storage** → **depo-files** bucket
   - ✅ Should see your uploaded file

## Test 5.5: Email Notifications (Optional)

This test requires a job assignment:

1. **Create second user** (as Court Reporter)
2. **Create job and assign** to first user (Scopist)
3. **Check email** at SMTP_USER address
4. ✅ Should receive assignment notification

## Test 5.6: Transcription (Optional)

Requires audio file:

1. **Upload audio file** to a job
2. **Click "Transcribe"** (if button exists)
3. **Check Deepgram dashboard** for API usage
4. ✅ Transcription should appear in app

---

## ✅ Testing Checklist

- [ ] App loads at Vercel URL
- [ ] Can register new account
- [ ] Can login successfully
- [ ] Dashboard loads with user name
- [ ] Can create new job
- [ ] Can upload files to job
- [ ] Files appear in Supabase Storage
- [ ] No console errors
- [ ] Email notifications work (optional)
- [ ] Transcription works (optional)

---

# PART 6: POST-DEPLOYMENT CONFIGURATION

## Update Your Local .env for Development

Create `.env.local` in your project root:

```bash
# Copy from Vercel → Settings → Environment Variables
DATABASE_URL=your-production-database-url
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
# ... (copy all other variables)
```

## Set Up Continuous Deployment

**Already configured!** ✅

Every time you push to GitHub:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

Vercel will automatically:
1. Detect the push
2. Run build process
3. Run tests (if configured)
4. Deploy to production

---

# 🔧 TROUBLESHOOTING

## Issue: "Error connecting to database"

**Symptoms:**
- 500 error on deployment
- "Connection refused" in logs

**Solutions:**
1. Verify DATABASE_URL has correct password
2. Check Supabase project is not paused (free tier pauses after inactivity)
3. Try connection pooler URL (port 6543 instead of 5432):
   ```
   postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:6543/postgres
   ```

---

## Issue: "Prisma Client not generated"

**Symptoms:**
- Build fails with "Cannot find module '@prisma/client'"

**Solution:**
```bash
# In Vercel build settings, ensure these commands run:
npm install
npx prisma generate
npm run build
```

Or run locally and commit:
```bash
npx prisma generate
git add prisma/
git commit -m "Generate Prisma Client"
git push
```

---

## Issue: "File upload fails"

**Symptoms:**
- Upload button doesn't work
- "Bucket not found" error

**Solutions:**
1. Verify bucket name matches exactly: `depo-files`
2. Check storage policies are enabled
3. Verify SUPABASE_SERVICE_ROLE_KEY is correct
4. Check USE_CLOUD_STORAGE=true

---

## Issue: "Email not sending"

**Symptoms:**
- No email received
- "Invalid credentials" error

**Solutions:**
1. Regenerate Gmail App Password
2. Verify 2-Step Verification is enabled
3. Check SMTP_USER and FROM_EMAIL are same
4. Verify SMTP_PORT is 587
5. Try different SMTP port (465 for SSL)

---

## Issue: "Transcription not working"

**Symptoms:**
- Transcription button does nothing
- Deepgram error in logs

**Solutions:**
1. Verify DEEPGRAM_API_KEY is correct
2. Check Deepgram dashboard for API credits
3. Verify USE_DEEPGRAM=true
4. Check audio file is supported format (WAV, MP3, etc.)

---

## Issue: "NextAuth error"

**Symptoms:**
- Can't login
- "Invalid NEXTAUTH_URL"

**Solutions:**
1. Verify NEXTAUTH_URL matches your Vercel URL exactly
2. Must include `https://` prefix
3. No trailing slash
4. Regenerate NEXTAUTH_SECRET if needed

---

# 📊 OPTIONAL: ADVANCED FEATURES

## Add Stripe for Payments (Phase 3)

1. Get Stripe keys: https://dashboard.stripe.com/apikeys
2. Add to Vercel:
   ```bash
   USE_STRIPE=true
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

## Add Redis for Background Jobs (Phase 3)

1. Create Upstash account: https://upstash.com
2. Create Redis database
3. Add to Vercel:
   ```bash
   USE_QUEUE=true
   REDIS_URL=redis://...
   ```

## Add Resend for Better Email (Alternative to Gmail)

1. Create Resend account: https://resend.com
2. Add domain and verify
3. Add to Vercel:
   ```bash
   USE_RESEND=true
   RESEND_API_KEY=re_...
   ```

---

# 🎉 DEPLOYMENT COMPLETE!

## What You've Accomplished

✅ **Infrastructure:**
- Supabase PostgreSQL database deployed
- Supabase file storage configured
- Vercel application deployed
- All environment variables configured

✅ **Features Working:**
- User authentication (register/login)
- File uploads to cloud storage
- Email notifications
- Audio transcription
- Job management system
- Multi-tenant security

✅ **Ready For:**
- User acceptance testing
- Beta user onboarding
- Feature development
- Production launch preparation

---

## Next Steps

### Immediate (Today)
1. ✅ Test all core features
2. ✅ Create your first real user account
3. ✅ Create test job with real files
4. ✅ Verify emails are sending

### Short Term (This Week)
1. Add custom domain (optional)
2. Set up error monitoring (Sentry)
3. Configure SSL certificate
4. Add analytics (Vercel Analytics)

### Before Production Launch
1. Upgrade Supabase to Pro ($25/mo)
2. Upgrade Vercel to Pro ($20/mo) if commercial
3. Set up regular database backups
4. Configure custom email domain
5. Add uptime monitoring

---

## 📞 Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **Deepgram Docs:** https://developers.deepgram.com

---

## 💰 Monthly Cost Estimate

| Service | Free Tier | Production |
|---------|-----------|------------|
| Vercel | $0 | $20/mo (Pro) |
| Supabase | $0 (1GB DB, 500MB storage) | $25/mo (8GB DB, 100GB storage) |
| Deepgram | $200 free credits | ~$20/mo (pay-per-use) |
| Gmail/Google Workspace | $0 (personal) | $6-12/user/mo |
| **Total Development** | **$0/mo** | |
| **Total Production** | | **$45-77/mo** |

---

**🎊 Congratulations! Your Depo-Pro application is now live on Vercel!**

**Deployment URL:** `https://__________.vercel.app`

**Next:** Share link with beta users and start testing!

---

*Guide Version: 1.0*  
*Last Updated: November 13, 2025*  
*Created by: Claude (Anthropic)*
