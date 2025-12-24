# 🚀 Vercel Deployment Guide

Complete guide to deploy Depo-Pro to Vercel with Supabase + Google Workspace.

## 📋 Prerequisites

- [ ] Vercel account (sign up at https://vercel.com)
- [ ] Supabase account (sign up at https://supabase.com)
- [ ] Google Workspace account (for email)
- [ ] Deepgram account (for transcription)
- [ ] Code pushed to GitHub

---

## Part 1: Supabase Setup (10 minutes)

### Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **New project**
3. Fill in details:
   - **Organization:** Select or create
   - **Name:** `depo-pro`
   - **Database Password:** Generate strong password (save it!)
   - **Region:** Choose closest to your users
     - US customers → `East US (North Virginia)` or `West US (Oregon)`
     - Match with Vercel primary region for best performance
   - **Pricing Plan:** Start with `Free` (upgrade to Pro later)
4. Click **Create new project**
5. Wait 2-3 minutes for project to initialize

### Step 2: Get Database URL

1. In Supabase dashboard, go to **Settings** → **Database**
2. Scroll to **Connection string**
3. Copy the **URI** format:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
4. Replace `[YOUR-PASSWORD]` with your database password
5. Save this for later

### Step 3: Create Storage Bucket

1. In Supabase dashboard, click **Storage** (left sidebar)
2. Click **Create a new bucket**
3. Fill in:
   - **Name:** `depo-files`
   - **Public bucket:** OFF (unchecked) - files must be private
   - **File size limit:** 50MB (or adjust as needed)
4. Click **Create bucket**

### Step 4: Configure Storage Policies

1. Click on your `depo-files` bucket
2. Click **Policies** tab
3. Click **New Policy** → **Create policy from scratch**
4. Add these policies:

```sql
-- Policy 1: Allow authenticated uploads
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'depo-files');

-- Policy 2: Allow users to read their own files
CREATE POLICY "Allow users to read own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'depo-files');
```

5. Click **Review** → **Save policy**

---

## Part 2: Vercel Deployment (15 minutes)

### Step 1: Import Project to Vercel

1. Go to https://vercel.com/dashboard
2. Click **Add New** → **Project**
3. **Import Git Repository:**
   - Connect GitHub if not already
   - Find your `depo-pro` repository
   - Click **Import**

### Step 2: Configure Project Settings

**Framework Preset:** Next.js (auto-detected)
**Build Command:** `npm run build`
**Output Directory:** `.next` (default)
**Install Command:** `npm install`

Click **Deploy** (it will fail - that's expected, we need env vars)

### Step 3: Connect Supabase Integration

1. In Vercel project, go to **Settings** → **Integrations**
2. Search for **Supabase**
3. Click **Add Integration**
4. Click **Continue** → **Add Integration**
5. Log in to Supabase (if prompted)
6. Select your `depo-pro` project
7. Choose scopes: **Production**, **Preview**, **Development**
8. Click **Continue** → **Add Integration**

✅ **Result:** Environment variables auto-populate:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Step 4: Add Database URL

1. Go to **Settings** → **Environment Variables**
2. Click **Add New Variable**
3. Add:
   ```
   Key: DATABASE_URL
   Value: postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
4. Select: **Production**, **Preview**, **Development**
5. Click **Save**

### Step 5: Add Storage Configuration

Add these variables one by one:

```bash
USE_CLOUD_STORAGE=true
SUPABASE_STORAGE_BUCKET=depo-files
```

### Step 6: Run Database Migration

1. In Vercel, go to **Deployments** tab
2. Click on your latest deployment
3. Click **...** menu → **Redeploy**
4. During build, migrations will run automatically via `postinstall` script

---

## Part 3: Google Workspace Email (5 minutes)

### Step 1: Generate App Password

1. Go to https://myaccount.google.com/apppasswords
2. **Enable 2-Step Verification** (if not already):
   - Go to https://myaccount.google.com/security
   - Click **2-Step Verification** → Follow steps
3. Return to https://myaccount.google.com/apppasswords
4. Click **Select app** → Choose **Mail**
5. Click **Select device** → Choose **Other (Custom name)**
6. Enter: `Depo-Pro Application`
7. Click **Generate**
8. **Copy the 16-character password** (format: `abcd efgh ijkl mnop`)
9. Save securely - you won't see it again!

### Step 2: Add Email Variables to Vercel

In Vercel → Settings → Environment Variables, add:

```bash
USE_GMAIL_SMTP=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=james@yourdomain.com
SMTP_PASSWORD=abcd efgh ijkl mnop
FROM_EMAIL=james@yourdomain.com
FROM_NAME=Depo-Pro
```

---

## Part 4: Deepgram Transcription (5 minutes)

### Step 1: Get Deepgram API Key

1. Go to https://console.deepgram.com
2. Sign up or log in
3. Click **Create a Project**
4. Name: `Depo-Pro`
5. Click **API Keys** (left sidebar)
6. Click **Create a New API Key**
7. Name: `Production Key`
8. Copy the API key

### Step 2: Add to Vercel

In Vercel → Environment Variables:

```bash
USE_DEEPGRAM=true
DEEPGRAM_API_KEY=your-key-here
```

---

## Part 5: Export Configuration (2 minutes)

In Vercel → Environment Variables:

```bash
USE_REAL_EXPORT=true
```

---

## Part 6: NextAuth Configuration (3 minutes)

### Step 1: Generate Secret

Run locally:
```bash
openssl rand -base64 32
```

### Step 2: Add to Vercel

```bash
NEXTAUTH_SECRET=your-generated-secret
NEXTAUTH_URL=https://your-app.vercel.app
```

---

## Part 7: Deploy! (2 minutes)

1. In Vercel, go to **Deployments**
2. Click **...** on latest deployment → **Redeploy**
3. Wait 2-3 minutes for build
4. Click on deployment URL to test

---

## ✅ Deployment Checklist

### Supabase
- [ ] Project created
- [ ] Database password saved
- [ ] Storage bucket `depo-files` created
- [ ] Storage policies configured
- [ ] Connection string ready

### Vercel
- [ ] Project imported from GitHub
- [ ] Supabase integration connected
- [ ] All environment variables added:
  - [ ] Database (DATABASE_URL)
  - [ ] Storage (USE_CLOUD_STORAGE, SUPABASE_STORAGE_BUCKET)
  - [ ] Email (SMTP credentials)
  - [ ] Transcription (DEEPGRAM_API_KEY)
  - [ ] Export (USE_REAL_EXPORT)
  - [ ] NextAuth (NEXTAUTH_SECRET, NEXTAUTH_URL)
- [ ] Deployment successful
- [ ] Database migrations ran

### Testing
- [ ] App loads at deployment URL
- [ ] Can create account / log in
- [ ] Can upload file (saves to Supabase)
- [ ] Can create job
- [ ] Email notifications work
- [ ] Transcription works (if audio file uploaded)

---

## 🔧 Troubleshooting

### Build Fails

**Error:** `DATABASE_URL not found`
- **Fix:** Add DATABASE_URL to Environment Variables

**Error:** `Prisma migrate failed`
- **Fix:** Check DATABASE_URL format and database password

### File Upload Fails

**Error:** `Storage bucket not found`
- **Fix:** Verify bucket name matches env var (`depo-files`)

**Error:** `Unauthorized`
- **Fix:** Check storage policies in Supabase

### Email Not Sending

**Error:** `Invalid credentials`
- **Fix:** Regenerate Gmail app password
- **Fix:** Verify 2-Step Verification is enabled

**Error:** `Connection timeout`
- **Fix:** Check SMTP_HOST and SMTP_PORT are correct

### Database Connection Refused

**Error:** `Connection refused`
- **Fix:** Check DATABASE_URL has correct password
- **Fix:** Verify Supabase project is not paused
- **Fix:** Try connection pooler URL (with `:6543` port)

---

## 📊 Monthly Costs

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Hobby (personal) | $0 |
| Vercel | Pro (commercial) | $20/mo |
| Supabase | Free | $0 |
| Supabase | Pro (required for production) | $25/mo |
| Google Workspace | Business Starter | $6-12/user/mo |
| Deepgram | Pay-as-you-go | ~$20/mo |
| **Total (Development)** | | **$0/mo** |
| **Total (Production)** | | **$45-65/mo** |

---

## 🚀 Going to Production

When ready for real customers:

1. **Upgrade Supabase:**
   - Go to Supabase → Settings → Billing
   - Upgrade to Pro ($25/mo)
   - Benefits: More storage, daily backups, higher limits

2. **Upgrade Vercel:**
   - Go to Vercel → Settings → Billing
   - Upgrade to Pro ($20/mo)
   - Required for commercial use per Vercel ToS

3. **Add Custom Domain:**
   - Vercel → Settings → Domains
   - Add your domain (e.g., `app.depopro.com`)
   - Update NEXTAUTH_URL to your domain

4. **Update Email Domain:**
   - Use `noreply@depopro.com` instead of personal email
   - Add domain to Google Workspace
   - Update FROM_EMAIL in Vercel

5. **Enable Monitoring:**
   - Add Sentry for error tracking
   - Add Vercel Analytics
   - Set up uptime monitoring

6. **Add Stripe** (when ready for payments):
   - Get Stripe account
   - Add keys to Vercel environment variables

---

## 📝 Local Development

To run locally with production services:

1. Create `.env.local`:
   ```bash
   # Copy from Vercel → Environment Variables
   DATABASE_URL=...
   NEXT_PUBLIC_SUPABASE_URL=...
   # ... (copy all variables)
   ```

2. Run migrations:
   ```bash
   npx prisma migrate dev
   ```

3. Start dev server:
   ```bash
   npm run dev
   ```

---

## 🆘 Support

- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Prisma Docs:** https://www.prisma.io/docs

---

**Last Updated:** November 11, 2025
