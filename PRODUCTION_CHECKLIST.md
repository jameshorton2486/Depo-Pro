# Depo-Pro Production Deployment Checklist

## 🔒 VERSION CONTROL
- [ ] Next.js pinned to 15.0.3 (exact version, no caret)
- [ ] CI version guard passing
- [ ] `npm run check:version` passes locally

## ✅ QUALITY
- [ ] `npm run lint` passes (0 errors, 0 warnings)
- [ ] `npm run typecheck` passes (0 errors)
- [ ] API contract tests passing (`npm run test`)
- [ ] No console.log statements in production code
- [ ] All TypeScript errors resolved

## 🔐 SECURITY
- [ ] RLS enabled on all tables
- [ ] Admin role verified and tested
- [ ] No service role used in UI flows
- [ ] Audit logs recording sensitive actions
- [ ] All API routes require authentication
- [ ] No PHI exposed to client without encryption
- [ ] Secrets stored in environment variables only

## 🔑 AUTH
- [ ] Middleware locked (`export const runtime = 'edge'`)
- [ ] No manual cookie parsing
- [ ] Supabase helpers used everywhere (`@supabase/ssr`)
- [ ] All auth errors properly logged
- [ ] Session management secure

## 🏥 HIPAA COMPLIANCE
- [ ] PHI tables protected by RLS
- [ ] Access logging enabled for sensitive data
- [ ] No PHI in logs (transcript content, personal info)
- [ ] No PHI in AI prompts (identifiers stripped)
- [ ] TLS everywhere (Vercel default)
- [ ] Supabase at-rest encryption enabled
- [ ] Audit logs immutable (write-only for users)

## 📋 DATA PROTECTION
- [ ] All transcripts have RLS policies
- [ ] Transcript revisions tracked
- [ ] AI output stored as revisions (never overwrites)
- [ ] All data access logged
- [ ] Backup and recovery plan documented

## 🚀 DEPLOY
- [ ] Environment variables verified
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (if needed)
  - [ ] `GOOGLE_CLIENT_ID` (if using Google Calendar)
  - [ ] `GOOGLE_CLIENT_SECRET` (if using Google Calendar)
  - [ ] `GOOGLE_REDIRECT_URI` (if using Google Calendar)
- [ ] Database migrations applied
  - [ ] RLS policies applied
  - [ ] Admin roles set up
  - [ ] Transcript tables created
- [ ] Supabase RLS policies tested
- [ ] Rollback plan documented
- [ ] Monitoring and alerts configured

## 🧪 TESTING
- [ ] RLS policies tested (users can only see own data)
- [ ] Admin access tested (admins can see all data)
- [ ] Audit logging tested (all sensitive actions logged)
- [ ] HIPAA compliance verified (no PHI in logs)
- [ ] API contracts tested (all endpoints work)
- [ ] Authentication flow tested (login, logout, session)

## 📊 MONITORING
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Log aggregation configured (Logtail, Axiom, etc.)
- [ ] Performance monitoring enabled
- [ ] Audit log monitoring enabled
- [ ] Alert thresholds set

## 📚 DOCUMENTATION
- [ ] Deployment process documented
- [ ] Environment setup documented
- [ ] RLS policies documented
- [ ] Admin access documented
- [ ] HIPAA compliance documented
- [ ] Rollback procedure documented

## 🔄 POST-DEPLOY
- [ ] Health checks passing
- [ ] All endpoints responding correctly
- [ ] Authentication working
- [ ] RLS policies enforced
- [ ] Audit logs recording
- [ ] No errors in production logs
- [ ] Performance metrics acceptable

---

## 🚨 CRITICAL CHECKS (Must Pass)

1. ✅ **Next.js 15.0.3** - Exact version locked
2. ✅ **RLS Enabled** - All tables protected
3. ✅ **No Service Role** - Never used in UI flows
4. ✅ **HIPAA Compliant** - No PHI in logs
5. ✅ **Audit Logging** - All sensitive actions logged
6. ✅ **Admin Access** - Tested and working
7. ✅ **TLS Everywhere** - All traffic encrypted
8. ✅ **Secrets Secure** - All in environment variables

---

**Status:** Pre-deployment checklist. Complete all items before deploying to production.
