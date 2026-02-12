# PRODUCTION SECURITY BASELINE - Depo-Pro

**Security Audit Version:** 3.0
**Last Updated:** February 2026
**Status:** ✅ Audit D.1-D.14 Implemented

---

## Pre-Deployment Verification

### Storage Configuration
- [ ] **depo-audio bucket**: `is_public = false` ✓
- [ ] **depo-files bucket**: `is_public = false` ✓
- [ ] **depo-exports bucket**: `is_public = false` ✓
- [ ] Signed URLs expire in < 5 minutes ✓
- [ ] File size limits enforced (50MB for PDFs) ✓

### Authentication & Authorization
- [ ] No `service_role` key in client-side code ✓
- [ ] All API routes use server-side Supabase client ✓
- [ ] JWT lifetime <= 1 hour ✓
- [ ] Logout invalidates session server-side ✓
- [ ] All routes use `withRouteProtection()` wrapper ✓

### API Route Security
- [ ] All routes use `withRouteProtection()` guard ✓
- [ ] All POST/PATCH routes validate with Zod ✓
- [ ] All destructive operations require ADMIN role ✓
- [ ] No route trusts `userId` from request body ✓
- [ ] No route reads `role` from request body ✓
- [ ] Tenant isolation (firm_id) enforced on all routes ✓

### Row-Level Security (RLS)
- [ ] RLS enabled on ALL tenant tables ✓
- [ ] Cross-firm test: User A cannot see Firm B data
- [ ] Scopist test: Cannot access unassigned jobs
- [ ] Attorney test: Can only see shared transcripts
- [ ] Phase 10 RLS: Correct table references (`profiles` not `users`) ✓
- [ ] Phase 10 RLS: Snake_case columns (`reporter_id` not `reporterId`) ✓

### Data Integrity
- [ ] All deletes are soft-delete (`deleted_at` column)
- [ ] Integrity chain: `append_integrity_chain` called on edits ✓
- [ ] Optimistic locking: `updated_at` comparison on mutations ✓
- [ ] Audit events logged for all security-relevant actions ✓

### Audit Logging
- [ ] `audit_events` table created and indexed ✓
- [ ] All security-relevant actions logged ✓
- [ ] Data access (views) logged for sensitive resources ✓
- [ ] No console.log of PHI, passwords, or API keys ✓
- [ ] Error logs capture route, firm_id, user_id (not PHI) ✓

### Environment Variables
- [ ] `SUPABASE_SERVICE_ROLE_KEY` not in `NEXT_PUBLIC_*` ✓
- [ ] `DEEPGRAM_API_KEY` not in `NEXT_PUBLIC_*` ✓
- [ ] `ANTHROPIC_API_KEY` not in `NEXT_PUBLIC_*` ✓
- [ ] All env vars validated at startup ✓
- [ ] Feature flags configured in Vercel ✓

### Security Headers (D.10)
- [ ] Content-Security-Policy configured ✓
- [ ] X-Frame-Options: DENY ✓
- [ ] X-Content-Type-Options: nosniff ✓
- [ ] Strict-Transport-Security enabled ✓
- [ ] Permissions-Policy configured ✓

### Size & Cost Guardrails (D.8, D.9)
- [ ] Audio duration limit: 8 hours ✓
- [ ] Audio file size limit: 500MB ✓
- [ ] Medical PDF size limit: 50MB ✓
- [ ] Medical PDF page limit: 100 pages ✓
- [ ] Max extractions per hour: 5 per firm ✓
- [ ] Rate limits configured on all routes ✓

### Feature Flags (D.13)
- [ ] Feature flags implemented for all major features ✓
- [ ] Kill switches tested in staging ✓
- [ ] Vercel env vars configured for toggles ✓

---

## Post-Deployment Testing

### Cross-Firm Isolation Test (CRITICAL)
1. Create Firm A and Firm B in Supabase
2. Create User A (Reporter) in Firm A
3. Create User B (Reporter) in Firm B
4. User A creates Job 1
5. User B creates Job 2
6. Login as User A:
   - ✅ Can see Job 1
   - ❌ Cannot see Job 2
7. Login as User B:
   - ✅ Can see Job 2
   - ❌ Cannot see Job 1
8. **Expected:** Zero cross-firm data leakage

### Scopist Access Test
1. Create Job with Reporter A
2. Assign Scopist B to Job
3. Create Scopist C (not assigned)
4. Login as Scopist B:
   - ✅ Can access assigned job
   - ✅ Can see flagged words with lock
5. Login as Scopist C:
   - ❌ Cannot access job
   - ❌ Job not visible in list

### Phase 10 RLS Test (Medical Chronology)
1. Reporter A uploads medical record to Job 1
2. Reporter B attempts to access:
   - GET `/api/jobs/{job1_id}/medical-records`
   - **Expected:** 403 Forbidden or empty array
3. Admin user accesses same endpoint
   - **Expected:** 200 OK, sees all records

### Rate Limit Test
1. Rapid-fire 10 transcript export requests in 30 seconds
2. **Expected:** First 5 succeed, rest return 429 Too Many Requests
3. Wait 60 seconds, retry
4. **Expected:** Requests succeed again

### Feature Flag Test
1. Set `ENABLE_MEDICAL_CHRONOLOGY=false` in Vercel
2. Restart app (no redeploy)
3. Attempt to upload medical record
4. **Expected:** 503 Service Unavailable, "Feature temporarily disabled"
5. Re-enable flag
6. **Expected:** Feature works normally

### Audit Log Test
1. Perform actions: correct word, export transcript, create job
2. Query `audit_events` table
3. **Expected:** All actions logged with:
   - User ID
   - Firm ID
   - Timestamp
   - Action type
   - Entity ID
   - IP address (if available)

---

## Security Incident Response

### Suspected Data Breach
1. **Immediate:** Disable affected feature via feature flag
2. **Query:** Check `audit_events` for unauthorized access patterns
3. **Isolate:** Identify affected firms/users
4. **Notify:** Security team + affected customers
5. **Investigate:** Review RLS policies, API logs, rate limit violations

### Cost Overrun (Deepgram/Anthropic)
1. **Immediate:** Set `ENABLE_TRANSCRIPTION=false` or `ENABLE_AI_EXTRACTION=false`
2. **Query:** Check `usage_tracking` table for spike
3. **Identify:** Which firm exceeded limits
4. **Cap:** Apply stricter rate limits for that firm
5. **Re-enable:** After confirming cost controls in place

### XSS/Injection Attack
1. **Verify:** CSP headers blocking execution
2. **Check:** Input validation schemas (Zod) rejecting payloads
3. **Audit:** Review `audit_events` for malicious patterns
4. **Patch:** Tighten validation if needed

---

## Compliance Notes

### HIPAA (Medical Records)
- ✅ RLS prevents cross-tenant access
- ✅ Audit trail for all PHI access
- ✅ Encryption at rest (Supabase default)
- ✅ Encryption in transit (HTTPS)
- ⚠️ **TODO:** Business Associate Agreement (BAA) with Supabase
- ⚠️ **TODO:** BAA with Anthropic (for medical AI extraction)

### Attorney-Client Privilege (Transcripts)
- ✅ Soft-delete preserves chain of custody
- ✅ Audit trail proves no unauthorized access
- ✅ Integrity hash for tamper detection
- ✅ Export footer with timestamp + hash

---

## Monitoring & Alerts

### Metrics to Track
- [ ] Failed authentication attempts (> 10/hour/IP)
- [ ] Cross-firm access attempts (RLS denials)
- [ ] Rate limit violations (429 responses)
- [ ] Unusual API usage patterns
- [ ] Cost metrics (Deepgram minutes, Anthropic tokens)
- [ ] Export failures (DOCX generation timeouts)

### Alert Thresholds
- **CRITICAL:** > 50 failed auth attempts from single IP in 1 hour
- **HIGH:** > 5 cross-firm access attempts by single user
- **MEDIUM:** Daily Anthropic cost > $100
- **MEDIUM:** Daily Deepgram cost > $200

---

## Regular Security Tasks

### Weekly
- [ ] Review `audit_events` for anomalies
- [ ] Check `error_logs` for repeated failures
- [ ] Verify backup strategy working

### Monthly
- [ ] Review and update RLS policies if schema changed
- [ ] Test disaster recovery procedure
- [ ] Review feature flag usage

### Quarterly
- [ ] Re-run security audit (Part A scan)
- [ ] Penetration testing
- [ ] Update this checklist with new findings

---

## Emergency Contacts

**Security Lead:** [Your Name]
**DevOps:** [Name]
**Legal Counsel:** [Name]
**Supabase Support:** https://supabase.com/support
**Anthropic Support:** support@anthropic.com
**Deepgram Support:** support@deepgram.com

---

## Document Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 3.0 | Feb 2026 | Security Audit D.1-D.14 implemented | Claude |
| 2.0 | Feb 2026 | Phase 10 RLS fixes (C.3) | Claude |
| 1.0 | Jan 2026 | Initial baseline | Team |

---

**This checklist must be reviewed and signed off before each production deployment.**

**Deployment Signoff:**

- [ ] All Pre-Deployment checks passed
- [ ] Post-Deployment tests passed
- [ ] Monitoring/alerting configured
- [ ] Security team approval

**Approved by:** _________________ **Date:** _________
