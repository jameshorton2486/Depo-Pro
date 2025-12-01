# 🚀 Depo-Pro Deployment Checklist

**Date:** December 1, 2025  
**Target:** Production deployment to Vercel  
**Timeline:** ~25 minutes

---

## ✅ Pre-Deployment Verification

- [x] ✅ All linting errors fixed
- [x] ✅ Git committed and pushed
- [x] ✅ Environment variables documented
- [x] ✅ Database migrations ready
- [x] ✅ API keys secured

---

## 🔐 Required Environment Variables

Copy these to Vercel dashboard during deployment:

### **Authentication**
```env
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
NEXTAUTH_URL=https://your-domain.vercel.app
```

### **Database (Supabase)**
```env
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/[database]?schema=public
DIRECT_URL=postgresql://postgres:[password]@[host]:5432/[database]?schema=public
```

### **Deepgram AI**
```env
DEEPGRAM_API_KEY=<your-deepgram-api-key>
```

### **OpenAI (Optional)**
```env
OPENAI_API_KEY=<your-openai-api-key>
```

### **Storage (Supabase)**
```env
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### **Optional (Add Later)**

**Email (if using)**
```env
RESEND_API_KEY=<resend-api-key>
```

**Redis (BullMQ - for background jobs)**
```env
REDIS_URL=<upstash-redis-url>
REDIS_HOST=<redis-host>
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password>
```

---

## 📝 Deployment Steps

### **1. Install Vercel CLI (if not installed)**
```powershell
npm install -g vercel
```

### **2. Login to Vercel**
```powershell
vercel login
```

### **3. Deploy to Production**
```powershell
# First deployment - follow prompts
vercel

# Or deploy directly to production
vercel --prod
```

**Vercel will ask:**
- Set up and deploy? → **Y**
- Which scope? → Select your account
- Link to existing project? → **N** (first time)
- Project name? → **depo-pro**
- Directory? → **./** (press Enter)
- Override settings? → **N**

### **4. Set Environment Variables**

After initial deployment:

**Option A: Via Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. Select your project → Settings → Environment Variables
3. Add each variable from list above
4. Redeploy: `vercel --prod`

**Option B: Via CLI**
```powershell
vercel env add NEXTAUTH_SECRET production
vercel env add DATABASE_URL production
vercel env add DEEPGRAM_API_KEY production
# ... add each variable
```

### **5. Run Database Migrations**

In Vercel dashboard or via CLI:
```powershell
# Pull production env vars
vercel env pull .env.production

# Run migrations
npx prisma migrate deploy
```

### **6. Verify Deployment**

Visit your production URL and check:
- [ ] Homepage loads
- [ ] Login page works
- [ ] Can create account
- [ ] Dashboard accessible

---

## 🎯 Post-Deployment

### **Immediate (Today)**
1. [ ] Test authentication
2. [ ] Create test job
3. [ ] Upload sample audio
4. [ ] Verify transcription works
5. [ ] Test export functionality

### **Tomorrow**
1. [ ] Fix any critical bugs found
2. [ ] Create your real account
3. [ ] Invite 2 beta testers

---

## 🚨 Common Issues & Fixes

### **Build Fails**
- Check Node version (need v18+)
- Verify all dependencies installed
- Check TypeScript errors: `npm run typecheck`

### **Database Connection Fails**
- Verify DATABASE_URL is correct
- Check IP whitelist in Supabase (allow all: 0.0.0.0/0)
- Ensure SSL mode is correct

### **Deepgram Errors**
- Verify API key is valid
- Check API key has credits
- Test in Deepgram dashboard first

### **Auth Not Working**
- Verify NEXTAUTH_URL matches deployment URL
- Regenerate NEXTAUTH_SECRET if needed
- Check callback URLs in auth config

### **Prisma Errors**
- Ensure prisma is in dependencies (not devDependencies)
- Check DATABASE_URL format
- Run: `npx prisma generate` before build

---

## ✅ Success Criteria

Deployment is successful when:
- [ ] Application loads without errors
- [ ] Users can register and login
- [ ] Jobs can be created
- [ ] Files can be uploaded
- [ ] Transcription processes
- [ ] Exports generate

---

## 📞 Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **Deepgram Docs:** https://developers.deepgram.com
- **Supabase Docs:** https://supabase.com/docs

---

**Status:** Ready to deploy! 🚀
