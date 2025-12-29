# Security Overview

## Architecture Security

### Multi-Tenant Isolation

Depo-Pro enforces strict tenant (firm) isolation at the application layer:

```
┌─────────────────────────────────────────────────────┐
│                    Request                          │
└─────────────────────┬───────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│           Authentication (NextAuth)                  │
│           - Verify session                          │
│           - Extract user context                    │
└─────────────────────┬───────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│           Authorization Layer                        │
│           - requireTenantContext()                  │
│           - validateJobAccess()                     │
│           - validateTranscriptAccess()              │
└─────────────────────┬───────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│           Data Layer (Prisma)                        │
│           - All queries scoped by firmId            │
│           - No cross-tenant joins                   │
└─────────────────────────────────────────────────────┘
```

### Isolation Guarantees

| Guarantee | Implementation |
|-----------|----------------|
| Query scoping | `withTenantScope()` wrapper |
| Access validation | Per-entity validators |
| Admin access | Explicit, audited |
| Cross-firm prevention | Server-side enforcement |

---

## Authentication

### Session Management

- **Provider:** NextAuth.js (Auth.js)
- **Session Store:** JWT (stateless)
- **Session Duration:** 24 hours
- **Refresh Strategy:** Sliding window

### Password Requirements

| Requirement | Value |
|-------------|-------|
| Minimum length | 12 characters |
| Uppercase | Required |
| Lowercase | Required |
| Number | Required |
| Special character | Required |

### Rate Limiting

| Endpoint | Limit | Lockout |
|----------|-------|---------|
| Login | 5 attempts | 15 minutes |
| Password reset | 3/hour | 1 hour |
| API general | 100/minute | 1 minute |
| Export | 10/hour | 1 hour |

---

## Authorization

### Role-Based Access Control (RBAC)

| Role | Capabilities |
|------|--------------|
| ADMIN | Full system access, cross-firm |
| AGENCY | Firm management, user management |
| COURT_REPORTER | Create jobs, assign scopists |
| SCOPIST | Review assigned transcripts |
| ATTORNEY | View shared transcripts, annotate |

### Permission Matrix

| Action | Admin | Agency | Reporter | Scopist | Attorney |
|--------|-------|--------|----------|---------|----------|
| Create firm | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create user | ✅ | ✅ | ❌ | ❌ | ❌ |
| Change roles | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create job | ✅ | ✅ | ✅ | ❌ | ❌ |
| View transcript | ✅ | ✅ | ✅ | ✅* | ✅* |
| Edit transcript | ✅ | ✅ | ✅ | ✅* | ❌ |
| Share transcript | ✅ | ✅ | ✅ | ❌ | ❌ |
| Export audit | ✅ | ✅ | ❌ | ❌ | ❌ |

*Only for assigned/shared transcripts

### Access Control Enforcement

All access checks are **server-side only**:

```typescript
// ❌ NEVER - Client-side check
if (user.role === 'ADMIN') { showButton() }

// ✅ ALWAYS - Server-side validation
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (session.user.role !== 'ADMIN') {
    return new Response('Forbidden', { status: 403 });
  }
}
```

---

## Audit Trail

### Logged Events

**Authentication:**
- Login success/failure
- Logout
- Password changes
- Session expiry

**Data Access:**
- Transcript views
- Export requests
- Share access

**Data Modification:**
- Create/update/delete
- AI corrections
- Status changes

**Administrative:**
- Role changes
- User management
- System config

### Audit Log Integrity

- **Append-only:** No updates or deletes
- **Immutable:** No modification after creation
- **Signed:** (Planned) Cryptographic integrity
- **Retention:** 7 years minimum

---

## Data Protection

### Encryption

| Layer | Method |
|-------|--------|
| In Transit | TLS 1.3 |
| At Rest | AES-256 (Supabase) |
| Passwords | bcrypt (cost 12) |
| API Keys | SHA-256 hash |

### Sensitive Data Handling

| Data Type | Storage | Logging |
|-----------|---------|---------|
| Passwords | Hashed only | Never |
| API keys | Hashed only | Never |
| SSN | Not collected | N/A |
| Credit cards | Not stored (Stripe) | Never |
| Email addresses | Encrypted | Masked |

### PII in Logs

**Never logged:**
- Passwords
- API keys
- Full email addresses
- Phone numbers
- Credit card numbers
- Social Security numbers

**Always masked:**
- Partial emails (j***@example.com)
- Partial phones (***-***-1234)

---

## Infrastructure Security

### Vercel (Application)

- Automatic HTTPS
- DDoS protection
- Edge caching
- Isolated functions

### Supabase (Database)

- Row-level security (RLS)
- Encrypted at rest
- Point-in-time recovery
- Network isolation

### Third Parties

| Service | Security Certification |
|---------|----------------------|
| Deepgram | SOC-2 Type II |
| Supabase | SOC-2 Type II |
| Vercel | SOC-2 Type II |
| Stripe | PCI DSS Level 1 |

---

## Incident Response

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| P1 - Critical | Data breach, system down | 15 minutes |
| P2 - High | Security vulnerability | 1 hour |
| P3 - Medium | Suspicious activity | 4 hours |
| P4 - Low | Security improvement | 24 hours |

### Response Procedure

1. **Detect** - Alert triggered
2. **Contain** - Isolate affected systems
3. **Investigate** - Root cause analysis
4. **Remediate** - Fix vulnerability
5. **Recover** - Restore service
6. **Report** - Document and notify

---

## Compliance Roadmap

| Standard | Status | Target |
|----------|--------|--------|
| SOC-2 Type I | 🟡 Preparing | Q3 2025 |
| SOC-2 Type II | 🔴 Not started | Q1 2026 |
| HIPAA | 🟡 Architecture ready | As needed |
| GDPR | ✅ Compliant | Ongoing |
| CCPA | ✅ Compliant | Ongoing |

---

## Security Contacts

- **Security Team:** security@depo-pro.com
- **Bug Bounty:** (Coming soon)
- **Emergency:** [On-call rotation]
