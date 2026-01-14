# Production Environment Variable Strategy

## Overview

This document defines how to securely manage environment variables in production for Depo-Pro.

---

## 🎯 Strategy: Environment-by-Deployment

### Development (Local)
- **File:** `.env.local`
- **Purpose:** Local development only
- **Git:** ❌ Never committed (in `.gitignore`)
- **Secrets:** Use test/development keys

### Staging (Vercel Preview)
- **Source:** Vercel Environment Variables (Preview)
- **Purpose:** Pre-production testing
- **Secrets:** Staging Supabase project + test API keys

### Production (Vercel Production)
- **Source:** Vercel Environment Variables (Production)
- **Purpose:** Live production environment
- **Secrets:** Production Supabase project + production API keys

---

## 📋 Required Environment Variables

### Critical (Build-Blocking)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

### Required (Runtime)

```env
DATABASE_URL=postgresql://...
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@yourdomain.com
USE_RESEND=true
DEEPGRAM_API_KEY=...
USE_DEEPGRAM=true
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
USE_STRIPE=true
REDIS_URL=redis://...
USE_QUEUE=true
```

---

## 🚀 Vercel Setup

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable for Production, Preview, and Development environments
3. Trigger new deployment
4. Verify `/api/health/supabase` returns 200

---

## 🖥️ VPS / Custom Server Setup

1. Create `.env.production` on server
2. Set restrictive permissions: `chmod 600 .env.production`
3. Use PM2 or similar process manager
4. Never commit `.env.production` to git

---

## 🔐 Security Checklist

- [ ] All production keys are different from development
- [ ] Service role key never exposed to browser
- [ ] Health check returns 200
- [ ] Auth smoke tests pass

---

**Last Updated:** 2025-01-XX
