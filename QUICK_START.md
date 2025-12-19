# Depo-Pro: Quick Start Guide

## 🚀 Deploy to Vercel (5 minutes)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "MVP ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel auto-detects Next.js

3. **Add Environment Variables:**
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
   - `NEXTAUTH_URL` - Your Vercel domain (e.g., `https://your-app.vercel.app`)
   - `DEEPGRAM_API_KEY` - Your Deepgram API key
   - Add all other required vars from `.env.example`

4. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete
   - Visit your live site!

5. **Run Database Migrations:**
   ```bash
   # Via Vercel CLI or direct database access
   npx prisma migrate deploy
   ```

---

## 👥 Create Test Accounts

```bash
npm run create-test-users
```

This creates:
- **Reporter:** `reporter@test.com` / `Test123!`
- **Scopist:** `scopist@test.com` / `Test123!`
- **Admin:** `admin@test.com` / `Test123!`

---

## ✅ Post-Deployment Checklist

- [ ] Homepage loads
- [ ] Can register new account
- [ ] Can login
- [ ] Can create a job
- [ ] Can upload audio file
- [ ] Can trigger transcription
- [ ] Review page works (`/jobs/[id]/review`)
- [ ] Audio player plays
- [ ] Transcript syncs with audio
- [ ] Flagged words panel works
- [ ] Can edit words
- [ ] Can export to DOCX

---

## 📊 Monitor Your Deployment

### Vercel Dashboard
- View deployment logs
- Check function logs
- Monitor performance

### Database
- Use Prisma Studio: `npm run db:studio`
- Monitor query performance
- Check for errors

### Error Tracking (Recommended)
Set up error tracking:
- **Sentry** (recommended)
- **LogRocket**
- **Rollbar**

---

## 🎯 Next Steps

1. **Create 2-3 beta user accounts**
2. **Send them login credentials**
3. **Collect feedback** (use `FEEDBACK_TEMPLATE.md`)
4. **Iterate based on feedback**
5. **Plan Phase 2 features**

---

## 🆘 Troubleshooting

### Build Fails
- Check environment variables are set
- Verify Node.js version (18+)
- Check build logs in Vercel

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check database is accessible
- Ensure connection pooling is enabled

### Audio Won't Play
- Check file storage permissions
- Verify audio file URLs are accessible
- Check browser console for errors

---

## 📞 Support

For issues or questions:
- Check `DEPLOYMENT_GUIDE.md` for detailed info
- Review error logs in Vercel
- Check database logs

---

**You're all set! 🎉**
