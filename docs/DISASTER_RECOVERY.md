# Disaster Recovery Playbook

> **Version:** 1.0  
> **Last Updated:** January 2, 2026  
> **Status:** ACTIVE

---

## Emergency Contacts

- **Primary:** [Your Name] - [Phone] - [Email]
- **Secondary:** [Backup Contact] - [Phone] - [Email]
- **Hosting Provider:** [Vercel Support](https://vercel.com/support)
- **Database Provider:** [Supabase Support](https://supabase.com/support)

---

## Scenario 1: Database Corruption

**Severity:** CRITICAL  
**Estimated Recovery Time:** 1-4 hours

### Steps

1. **Immediately disable writes**
   - Enable maintenance mode in application
   - Update DNS to point to maintenance page (if possible)
   - Notify users via status page

2. **Assess extent of corruption**
   - Connect to database
   - Run integrity checks
   - Identify affected tables/records

3. **Restore strategy**
   - **Partial corruption:** Restore from latest backup
   - **Complete corruption:** Restore from daily backup + apply incrementals

4. **Restore procedure**
   ```bash
   # Restore from backup
   pg_restore -d $DATABASE_URL /backups/db_YYYYMMDD_HHMMSS.sql.gz
   
   # Verify data integrity
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM jobs;"
   ```

5. **Verify data integrity**
   - Check critical tables
   - Verify user accounts
   - Test application functionality

6. **Re-enable application**
   - Disable maintenance mode
   - Monitor for 24 hours
   - Verify all systems operational

7. **Notify affected users**
   - Send email notification
   - Update status page
   - Document incident

---

## Scenario 2: Complete Server Failure

**Severity:** CRITICAL  
**Estimated Recovery Time:** 2-6 hours

### Steps

1. **DNS: Point to maintenance page**
   - Update DNS records to maintenance page
   - Or use CDN failover if configured

2. **Spin up new infrastructure**
   - Deploy to new Vercel project (if needed)
   - Or restore from previous deployment
   - Verify environment variables

3. **Restore database from backup**
   ```bash
   # Get latest backup
   aws s3 ls s3://depo-pro-backups/db/ | sort | tail -1
   
   # Download and restore
   aws s3 cp s3://depo-pro-backups/db/db_YYYYMMDD_HHMMSS.sql.gz /tmp/
   gunzip /tmp/db_YYYYMMDD_HHMMSS.sql.gz
   pg_restore -d $DATABASE_URL /tmp/db_YYYYMMDD_HHMMSS.sql
   ```

4. **Deploy application**
   ```bash
   # Deploy to Vercel
   vercel --prod
   
   # Or restore from Git
   git checkout v1.0-beta
   npm install
   npm run build
   ```

5. **Verify functionality**
   - Test login
   - Test critical workflows
   - Verify database connectivity
   - Check external service integrations

6. **Update DNS**
   - Point domain to new deployment
   - Wait for DNS propagation (up to 48 hours, usually < 1 hour)
   - Monitor DNS propagation

7. **Monitor for 24 hours**
   - Watch error logs
   - Monitor performance metrics
   - Verify user access

---

## Scenario 3: Security Breach

**Severity:** CRITICAL  
**Estimated Recovery Time:** 4-24 hours

### Steps

1. **Immediately revoke all active sessions**
   ```sql
   -- Revoke all sessions (NextAuth)
   UPDATE "Session" SET expires = NOW() WHERE expires > NOW();
   ```

2. **Rotate all credentials**
   - [ ] Database password
   - [ ] API keys (Deepgram, Stripe, etc.)
   - [ ] JWT secret (NEXTAUTH_SECRET)
   - [ ] Admin passwords
   - [ ] Service account keys
   - [ ] SSL certificates (if compromised)

3. **Assess breach scope**
   - Review audit logs
   - Identify compromised accounts
   - Determine data accessed
   - Check for data exfiltration

4. **Notify affected users**
   - Within 72 hours if PII accessed
   - Email notification
   - Include breach details and remediation steps

5. **Engage security consultant if needed**
   - For significant breaches
   - Legal compliance requirements
   - Forensic analysis

6. **Document incident for compliance**
   - Create incident report
   - Document timeline
   - Record remediation steps
   - Update security procedures

---

## Credential Rotation Checklist

When rotating credentials after a security incident:

- [ ] Database password (Supabase dashboard)
- [ ] API keys:
  - [ ] Deepgram API key
  - [ ] Stripe API keys (if used)
  - [ ] Other third-party services
- [ ] JWT secret (NEXTAUTH_SECRET in environment)
- [ ] Admin passwords (force reset for all admin accounts)
- [ ] Service account keys
- [ ] SSL certificates (if compromised)
- [ ] OAuth client secrets (if used)

**After rotation:**
- [ ] Update all environment variables
- [ ] Restart all services
- [ ] Verify application functionality
- [ ] Test authentication flows

---

## Incident Response Template

```markdown
# Incident Report: [Title]

**Date:** [Date]
**Severity:** [Critical/High/Medium/Low]
**Duration:** [Start Time] - [End Time]
**Affected Users:** [Count/Percentage]

## Timeline
- [HH:MM] - Issue detected
- [HH:MM] - Initial response
- [HH:MM] - Root cause identified
- [HH:MM] - Fix deployed
- [HH:MM] - Normal operation restored

## Root Cause
[Description of what caused the incident]

## Resolution
[What was done to resolve the incident]

## Prevention
[What changes will prevent recurrence]

## Action Items
- [ ] Item 1
- [ ] Item 2
- [ ] Item 3
```

---

## Backup Locations

- **Database Backups:** `s3://depo-pro-backups/db/`
- **File Storage Backups:** `s3://depo-pro-backups/files/`
- **Audit Log Archives:** `s3://depo-pro-backups/audit/`

**Access:**
- AWS credentials stored in secure password manager
- Backup verification runs daily
- Monthly restore drills scheduled

---

## Recovery Time Objectives (RTO)

| Scenario | Target RTO | Maximum Acceptable |
|----------|------------|-------------------|
| Database corruption | 2 hours | 4 hours |
| Server failure | 4 hours | 8 hours |
| Security breach | 1 hour (containment) | 2 hours |
| Data loss | 1 hour | 2 hours |

---

## Recovery Point Objectives (RPO)

| Data Type | Target RPO | Maximum Acceptable |
|-----------|------------|-------------------|
| Database | 1 hour | 24 hours |
| File storage | 24 hours | 72 hours |
| Audit logs | 7 days | 30 days |

---

## Monthly Verification

**Schedule:** First Monday of each month

**Checklist:**
- [ ] Restore backup to test environment
- [ ] Verify data integrity
- [ ] Test application functionality
- [ ] Document any issues
- [ ] Update procedures if needed
- [ ] Review and update this playbook

---

**END OF DISASTER RECOVERY PLAYBOOK**
