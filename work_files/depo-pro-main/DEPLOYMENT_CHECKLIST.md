# ✅ Depo-Pro Deployment Quick Checklist

**Print this page and check off items as you complete them!**

---

## 🎯 Pre-Deployment (5 minutes)

- [ ] GitHub repo is up to date (`git push origin main`)
- [ ] Code builds locally without errors (`npm run build`)
- [ ] All tests pass (`npm run check`)
- [ ] `.env.local` file has all required variables

---

## 📦 Supabase Setup (15 minutes)

### Project Creation
- [ ] Supabase account created
- [ ] New project created: `depo-pro`
- [ ] Database password saved somewhere safe
- [ ] Project fully initialized (green checkmark)

### Database Configuration
- [ ] DATABASE_URL copied and password replaced
- [ ] Connection string tested (optional)

### API Keys
- [ ] NEXT_PUBLIC_SUPABASE_URL copied
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY copied
- [ ] SUPABASE_SERVICE_ROLE_KEY copied

### Storage Setup
- [ ] Bucket `depo-files` created
- [ ] Bucket is PRIVATE (not public)
- [ ] 3 storage policies added and enabled:
  - [ ] Allow authenticated uploads
  - [ ] Allow authenticated reads  
  - [ ] Allow authenticated deletes

---

## 🔑 External Services (15 minutes)

### Gmail/Email
- [ ] Gmail 2FA enabled
- [ ] App password generated (16 characters)
- [ ] SMTP_USER saved
- [ ] SMTP_PASSWORD saved
- [ ] FROM_EMAIL saved

### Deepgram
- [ ] Deepgram account created
- [ ] Project created
- [ ] API key generated
- [ ] DEEPGRAM_API_KEY saved
- [ ] Free credits visible in dashboard

### NextAuth
- [ ] NEXTAUTH_SECRET generated (32+ characters)
- [ ] NEXTAUTH_SECRET saved

---

## 🚀 Vercel Deployment (20 minutes)

### Project Import
- [ ] Vercel account connected to GitHub
- [ ] `depo-pro` repository imported
- [ ] Framework detected as Next.js

### Environment Variables Added
Core Variables:
- [ ] DATABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] USE_CLOUD_STORAGE=true
- [ ] SUPABASE_STORAGE_BUCKET=depo-files
- [ ] NEXTAUTH_SECRET
- [ ] NEXTAUTH_URL (update after first deploy)

Email Variables:
- [ ] SMTP_HOST=smtp.gmail.com
- [ ] SMTP_PORT=587
- [ ] SMTP_USER
- [ ] SMTP_PASSWORD
- [ ] FROM_EMAIL
- [ ] FROM_NAME=Depo-Pro

Feature Variables:
- [ ] USE_DEEPGRAM=true
- [ ] DEEPGRAM_API_KEY
- [ ] USE_REAL_EXPORT=true
- [ ] NODE_ENV=production

### Deployment
- [ ] First deployment started
- [ ] Build completed successfully (2-4 mins)
- [ ] Deployment URL received
- [ ] NEXTAUTH_URL updated with real URL
- [ ] Application redeployed

---

## ✅ Verification Testing (10 minutes)

### Basic Functionality
- [ ] App loads at Vercel URL
- [ ] No console errors (F12 to check)
- [ ] Login page displays correctly

### User Registration
- [ ] Can register new test user
- [ ] No registration errors
- [ ] Redirects to dashboard
- [ ] User name displays in dashboard

### Database Connection
- [ ] User appears in Supabase `User` table
- [ ] Password is hashed (not plain text)
- [ ] All database tables visible in Supabase

### File Storage
- [ ] Can create new job
- [ ] Can upload file to job
- [ ] File appears in Supabase Storage
- [ ] No upload errors

### Optional Features
- [ ] Email notification received (if configured)
- [ ] Can view uploaded files
- [ ] Transcription works (if audio uploaded)

---

## 📋 Post-Deployment Tasks

### Documentation
- [ ] Save all credentials securely (password manager)
- [ ] Deployment URL documented
- [ ] Share access with team members (if applicable)

### Monitoring Setup (Optional)
- [ ] Vercel Analytics enabled
- [ ] Error tracking configured (Sentry)
- [ ] Uptime monitoring set up

### Local Development
- [ ] `.env.local` created with production variables
- [ ] Can run `npm run dev` locally with production DB
- [ ] Git ignores `.env.local`

---

## 🎊 Success Criteria

**Your deployment is successful when:**

✅ App loads at `https://__________.vercel.app`  
✅ Can register and login  
✅ Can create jobs  
✅ Can upload files  
✅ Files save to Supabase Storage  
✅ No critical errors in console  

**Deployment URL:** `https://______________________.vercel.app`

**Completed:** ____ / ____ / ____

**Deployed by:** _______________________

---

## 📞 Quick Help

**App won't load?**
→ Check Vercel deployment logs for errors

**Can't login?**
→ Verify NEXTAUTH_URL matches your Vercel URL exactly

**File upload fails?**
→ Check storage policies in Supabase

**Database error?**
→ Verify DATABASE_URL password is correct

**Email not sending?**
→ Regenerate Gmail app password

---

## 🔗 Quick Links

- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://supabase.com/dashboard  
- Deepgram Console: https://console.deepgram.com
- GitHub Repo: https://github.com/jameshorton2486/depo-pro

---

**Time Spent:** _____ minutes

**Notes:**
_______________________________________
_______________________________________
_______________________________________

