# Incident Response Runbook

## 🚨 Incident Severity Levels

- **Low** - Minor issues, no immediate impact
- **Medium** - Affects some users, requires attention
- **High** - Affects many users, needs immediate response
- **Critical** - System-wide impact, emergency response required

## 🔍 Incident Categories

- **Auth** - Authentication failures, login issues
- **RLS** - Row-Level Security violations, unauthorized access attempts
- **AI** - AI service errors, quality issues
- **API** - External API outages, integration failures
- **System** - Infrastructure issues, database problems
- **Other** - Miscellaneous incidents

## 📋 Incident Response Workflow

### 1. Identify Severity

Assess the incident impact:
- How many users are affected?
- Is data at risk?
- Is service completely down?
- What's the business impact?

### 2. Contain Access

If security-related:
- Revoke affected tokens/sessions
- Block suspicious IPs (if needed)
- Disable affected features temporarily
- Notify security team (if applicable)

### 3. Notify Admin

For High/Critical incidents:
- Immediately notify admin team
- Create incident record in system
- Set up incident tracking
- Begin resolution process

### 4. Log Incident

All incidents should be logged:
- Use `incidents` helper from `lib/incidents.ts`
- Include severity, category, message, metadata
- System will automatically track incident

```typescript
import { incidents } from '@/lib/incidents';

// Log auth failure
await incidents.authFailure('Failed login attempt', {
  userId: user.id,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});

// Log RLS violation
await incidents.rlsViolation('Unauthorized access attempt', {
  resource: 'cases',
  resourceId: caseId,
  userId: user.id,
});

// Log AI error
await incidents.aiError('AI service timeout', {
  transcriptId,
  service: 'openai',
  error: error.message,
});

// Log API outage
await incidents.apiOutage('Deepgram', 'Service unavailable', {
  statusCode: 503,
  retryCount: 3,
});
```

### 5. Root Cause Analysis

For Medium+ incidents:
- Investigate logs and audit trails
- Review recent changes
- Identify root cause
- Document findings

### 6. Prevent Recurrence

After resolution:
- Update documentation
- Add monitoring/alerts
- Fix underlying issues
- Review and update runbook

## 📊 Monitoring & Alerts

### Console Logs (Now)
- All errors logged with severity
- Structured logging format
- Easy to search and filter

### Sentry (Next)
- Error tracking
- Performance monitoring
- Release tracking
- Alert notifications

### Uptime Monitor (Future)
- External monitoring (Pingdom / BetterStack)
- Status page
- SLA tracking
- Alert thresholds

## 🔒 Security Incidents

### Auth Failures
- Log all failed login attempts
- Track suspicious patterns
- Alert on repeated failures
- Consider rate limiting

### RLS Violations
- Log all unauthorized access attempts
- Review RLS policies
- Verify no bypasses exist
- Alert on violations

### Data Breaches
- Immediately contain access
- Notify security team
- Review audit logs
- Document incident
- Notify affected users (if required)

## 📈 Incident Metrics

Monitor:
- Incident count by severity
- Incident count by category
- Resolution time
- Recurrence rate
- Trends over time

## ✅ Resolution Checklist

When resolving an incident:
- [ ] Issue identified and documented
- [ ] Root cause found
- [ ] Fix implemented and tested
- [ ] Incident marked as resolved
- [ ] Resolution notes added
- [ ] Monitoring updated (if needed)
- [ ] Documentation updated
- [ ] Team notified (if applicable)

## 🔄 Post-Incident Review

For High/Critical incidents:
- Conduct post-mortem
- Identify improvements
- Update runbook
- Share learnings with team
- Implement preventive measures

---

**Status:** Incident response workflow. Update as needed based on experience.
