# ⚡ QUICK START: Deploy Depo-Pro in 20 Minutes

**Total Time:** 20 minutes  
**Difficulty:** Easy  
**Prerequisites:** Node.js 18+, Git, Vercel account

---

## 🚀 Step 1: Install Vercel CLI (2 minutes)

```powershell
npm install -g vercel
vercel login
```

Enter your email and verify in browser.

---

## 🚀 Step 2: Deploy Application (5 minutes)

```powershell
# In your project directory (C:\Users\james\depo-pro)
vercel --prod
```

**Answer prompts:**
- Set up and deploy? → **Y**
- Which scope? → Select your account
- Link to existing? → **N**
- Project name? → **depo-pro**
- Directory? → Press **Enter**
- Override settings? → **N**

Wait 2-3 minutes for build...

✅ **SUCCESS:** You'll get a URL like `https://depo-pro-xyz.vercel.app`

---

## 🔐 Step 3: Configure Environment Variables (8 minutes)

### **Method 1: Vercel Dashboard (Recommended)**

1. Go to: https://vercel.com/dashboard
2. Click your project: **depo-pro**
3. Go to: **Settings** → **Environment Variables**
4. Add these ONE BY ONE:

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXTAUTH_SECRET` | Run: `openssl rand -base64 32` | Required |
| `NEXTAUTH_URL` | Your Vercel URL | e.g., `https://depo-pro-xyz.vercel.app` |
| `DATABASE_URL` | Your Supabase URL | From Supabase dashboard |
| `DIRECT_URL` | Same as DATABASE_URL | For migrations |
| `DEEPGRAM_API_KEY` | Your Deepgram key | From Deepgram console |
| `OPENAI_API_KEY` | Your OpenAI key | Optional |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | From Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service key | From Supabase dashboard |

5. **Save** each variable
6. Click **Redeploy** at top right

### **Method 2: CLI (Faster if you know values)**

```powershell
vercel env add NEXTAUTH_SECRET production
# Paste value and press Enter
vercel env add NEXTAUTH_URL production
# Paste value and press Enter
# ... repeat for all variables
```

Then redeploy:
```powershell
vercel --prod
```

---

## 🗄️ Step 4: Run Database Migrations (3 minutes)

```powershell
# Pull production environment
vercel env pull .env.production

# Run Prisma migrations
npx prisma migrate deploy

# (Optional) Seed with test users
npm run db:seed
```

---

## ✅ Step 5: Verify Deployment (2 minutes)

Visit your production URL and test:

1. ✅ Homepage loads
2. ✅ Click "Login" → Page loads
3. ✅ Click "Register" → Page loads
4. ✅ Create test account
5. ✅ Login works
6. ✅ Dashboard displays

**If all pass:** 🎉 **YOU'RE LIVE!**

---

## 🚨 Quick Troubleshooting

### **Build Failed?**
```powershell
# Check locally first
npm run build

# If error, fix and commit
git add .
git commit -m "Fix: build error"
git push
```

### **Database Error?**
- Verify DATABASE_URL is correct
- Check Supabase allows connections (Settings → Database → Connection pooling)
- Add IP: 0.0.0.0/0 to allow all (or Vercel IPs)

### **Auth Error?**
- NEXTAUTH_URL must EXACTLY match your Vercel URL
- NEXTAUTH_SECRET must be set
- Both are case-sensitive!

### **Still Stuck?**
Check detailed docs: `DEPLOYMENT_GUIDE.md`

---

## 🎯 What's Next?

After successful deployment:

1. **TODAY:** Run `E2E_TESTING_CHECKLIST.md` (~1 hour)
2. **TOMORROW:** Invite first 2 beta users
3. **THIS WEEK:** Daily monitoring and support
4. **NEXT WEEK:** Expand to 5-10 beta users

---

## 🎉 Success!

Your Depo-Pro MVP is now live at:

**🌐 [Your Production URL]**

Share it with pride! 🚀

---

**Deployment Time:** ~20 minutes  
**Status:** ✅ **PRODUCTION**  
**Next:** Test and invite users!
