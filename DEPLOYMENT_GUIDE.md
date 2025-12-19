# Depo-Pro: Deployment & Post-MVP Guide

## 🚀 Pre-Deployment Checklist

### Environment Variables
Ensure all required environment variables are set in Vercel:

```bash
# Database
DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://your-domain.vercel.app

# Deepgram
DEEPGRAM_API_KEY=your-deepgram-api-key

# Storage (if using Supabase)
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (if using BullMQ)
REDIS_URL=your-redis-url

# File Storage
UPLOADS_DIR=./uploads  # Or your storage path

# Email (if configured)
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
```

### Database Setup
1. **Run migrations:**
   ```bash
   npx prisma migrate deploy
   ```

2. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

3. **Seed initial data (optional):**
   ```bash
   npx prisma db seed
   ```

### Build Verification
- ✅ `npm run build` succeeds
- ✅ No critical TypeScript errors
- ✅ All API routes compile

---

## 📦 Deploy to Vercel

### Step 1: Connect Repository
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Vercel will auto-detect Next.js

### Step 2: Configure Build Settings
- **Framework Preset:** Next.js
- **Build Command:** `npm run build` (default)
- **Output Directory:** `.next` (default)
- **Install Command:** `npm install` (default)

### Step 3: Environment Variables
Add all environment variables from the checklist above in Vercel dashboard:
- Settings → Environment Variables
- Add for Production, Preview, and Development

### Step 4: Database Connection
1. **If using Supabase:**
   - Use connection pooling URL for production
   - Format: `postgresql://user:pass@host:port/db?pgbouncer=true`

2. **If using Vercel Postgres:**
   - Vercel will auto-inject `POSTGRES_URL`
   - Update `DATABASE_URL` to use `POSTGRES_URL`

### Step 5: Deploy
1. Push to `main` branch → Auto-deploys
2. Or manually deploy from Vercel dashboard
3. Monitor build logs for errors

### Step 6: Post-Deployment
1. **Run migrations:**
   ```bash
   # Via Vercel CLI or direct database access
   npx prisma migrate deploy
   ```

2. **Verify deployment:**
   - Check homepage loads
   - Test login/registration
   - Verify API routes respond

---

## 👥 Create Test Accounts

### Admin Account
```sql
-- Run in database (or via Prisma Studio)
INSERT INTO "User" (
  id, email, "passwordHash", role, "firstName", "lastName", "createdAt", "updatedAt"
) VALUES (
  'admin-001',
  'admin@depo-pro.com',
  '$2a$10$...', -- Use bcrypt hash
  'ADMIN',
  'Admin',
  'User',
  NOW(),
  NOW()
);
```

### Court Reporter Test Account
- Email: `reporter@test.com`
- Password: `Test123!`
- Role: `REPORTER`

### Scopist Test Account
- Email: `scopist@test.com`
- Password: `Test123!`
- Role: `SCOPIST`

### Quick Test Account Creation Script
Create `scripts/create-test-users.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await hash('Test123!', 10);

  // Create test reporter
  const reporter = await prisma.user.upsert({
    where: { email: 'reporter@test.com' },
    update: {},
    create: {
      email: 'reporter@test.com',
      passwordHash: password,
      role: 'REPORTER',
      firstName: 'Test',
      lastName: 'Reporter',
    },
  });

  // Create test scopist
  const scopist = await prisma.user.upsert({
    where: { email: 'scopist@test.com' },
    update: {},
    create: {
      email: 'scopist@test.com',
      passwordHash: password,
      role: 'SCOPIST',
      firstName: 'Test',
      lastName: 'Scopist',
    },
  });

  console.log('Test users created:', { reporter, scopist });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run with: `npx tsx scripts/create-test-users.ts`

---

## 🎯 Beta User Onboarding

### Step 1: Identify Beta Users
- 2-3 court reporters you know personally
- People who will give honest feedback
- Users with real transcription needs

### Step 2: Create Accounts
1. Create accounts for each beta user
2. Send welcome email with:
   - Login credentials
   - Quick start guide
   - Support contact info

### Step 3: Onboarding Session (Optional)
- 30-minute walkthrough
- Show key features:
  - Creating a job
  - Uploading audio
  - Reviewing flagged words
  - Exporting transcript
- Answer questions

### Step 4: Provide Support
- Set up support channel (email, Slack, Discord)
- Be responsive to issues
- Collect feedback systematically

---

## 📊 Feedback Collection

### Feedback Form Template
Create a simple feedback form or use Google Forms:

**Questions:**
1. What features do you use most?
2. What's confusing or unclear?
3. What's missing that you need?
4. Rate overall experience (1-10)
5. Would you recommend to others? (Yes/No)
6. Any bugs or errors encountered?
7. Suggestions for improvement?

### Feedback Tracking
Create `FEEDBACK.md` or use a spreadsheet:

| Date | User | Category | Issue/Feature | Priority | Status |
|------|------|----------|---------------|----------|--------|
| 2024-01-15 | User A | Bug | Audio won't play | High | Fixed |
| 2024-01-16 | User B | Feature | Need PDF export | Medium | Planned |

### Common Feedback Categories
1. **Bugs** - Things that don't work
2. **UX Issues** - Confusing interfaces
3. **Missing Features** - Things users need
4. **Performance** - Slow loading, lag
5. **Design** - Visual improvements

---

## 🔄 Iteration Process

### Weekly Review
1. Review all feedback
2. Prioritize issues:
   - **P0 (Critical):** Blocks core workflow
   - **P1 (High):** Major pain point
   - **P2 (Medium):** Nice to have
   - **P3 (Low):** Future consideration

3. Plan fixes for next sprint

### Quick Wins
Focus on:
- Bug fixes
- UX improvements (small changes, big impact)
- Performance optimizations
- Missing critical features

### Communication
- Update users on fixes
- Share roadmap for planned features
- Be transparent about limitations

---

## 🎨 Phase 2 Features Roadmap

### Priority 1: Core Enhancements

#### 1. Waveform Visualization
**Library:** `wavesurfer.js`

**Implementation:**
```bash
npm install wavesurfer.js
```

**Features:**
- Visual waveform display
- Click to seek
- Zoom in/out
- Highlight current playback position
- Show word boundaries

**Estimated Time:** 2-3 weeks

#### 2. PDF Export
**Library:** `pdfkit` or `@react-pdf/renderer`

**Features:**
- Same formatting as DOCX
- Page breaks at 25 lines
- Line numbers
- Case header/footer
- Watermark option

**Estimated Time:** 1-2 weeks

### Priority 2: User Roles & Collaboration

#### 3. Attorney Role
**Features:**
- View-only access to transcripts
- Add annotations/comments
- Highlight sections
- Request revisions
- Download transcripts

**Estimated Time:** 3-4 weeks

#### 4. Custom Vocabulary/Dictionary
**Features:**
- Add custom terms per job
- Auto-correct common misspellings
- Legal term definitions
- Case-specific terminology

**Estimated Time:** 2-3 weeks

### Priority 3: Business Features

#### 5. Stripe Billing Integration
**Library:** `stripe`

**Features:**
- Subscription plans
- Usage-based billing (per minute)
- Invoice generation
- Payment history
- Team billing

**Estimated Time:** 4-6 weeks

---

## 📈 Success Metrics

### Track These Metrics:
1. **User Adoption**
   - Active users per week
   - Jobs created per week
   - Transcripts completed

2. **Feature Usage**
   - Review interface usage
   - Export frequency
   - Average words reviewed per job

3. **User Satisfaction**
   - NPS score
   - Feature requests
   - Support tickets

4. **Technical**
   - API response times
   - Error rates
   - Uptime percentage

---

## 🛠️ Maintenance

### Weekly Tasks
- [ ] Review error logs
- [ ] Check database performance
- [ ] Monitor API usage
- [ ] Review user feedback

### Monthly Tasks
- [ ] Update dependencies
- [ ] Review security patches
- [ ] Backup database
- [ ] Performance audit

### Quarterly Tasks
- [ ] Major feature planning
- [ ] User interviews
- [ ] Competitive analysis
- [ ] Roadmap review

---

## 🚨 Common Issues & Solutions

### Issue: Build Fails on Vercel
**Solution:**
- Check environment variables
- Verify Node.js version (18+)
- Check build logs for specific errors

### Issue: Database Connection Errors
**Solution:**
- Verify `DATABASE_URL` is set
- Check connection pooling settings
- Ensure database is accessible from Vercel

### Issue: Audio Files Won't Upload
**Solution:**
- Check file size limits (Vercel: 4.5MB default)
- Use Supabase Storage for larger files
- Verify storage permissions

### Issue: Deepgram API Errors
**Solution:**
- Check API key is valid
- Verify account has credits
- Check rate limits

---

## 📞 Support Resources

### Documentation
- Keep `README.md` updated
- Document API endpoints
- Create user guides

### Support Channels
- Email: support@depo-pro.com
- Slack/Discord for beta users
- GitHub Issues for bugs

### Status Page
- Use Vercel Status or create custom page
- Show system health
- Notify users of outages

---

## ✅ Deployment Checklist

Before going live:

- [ ] All environment variables set
- [ ] Database migrations run
- [ ] Test accounts created
- [ ] Build succeeds
- [ ] All critical features tested
- [ ] Error monitoring set up (Sentry, etc.)
- [ ] Analytics configured (if desired)
- [ ] Backup strategy in place
- [ ] Support process defined
- [ ] Documentation complete

---

## 🎉 You're Ready!

Once you've completed this checklist, your MVP is production-ready. Focus on:
1. Getting real users
2. Collecting feedback
3. Iterating quickly
4. Building what users actually need

Good luck! 🚀
