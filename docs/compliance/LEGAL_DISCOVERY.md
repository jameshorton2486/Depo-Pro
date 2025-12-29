# Legal Discovery & Right-to-Know

## Overview

This document outlines procedures for responding to legal discovery requests and customer right-to-know inquiries for Depo-Pro.

## Legal Discovery

### Types of Discovery Requests

1. **Subpoena** - Court order for specific records
2. **Court Order** - Judicial mandate for data production
3. **Litigation Hold** - Preservation notice
4. **Regulatory Request** - Government agency inquiry

### Response Procedure

```
Receipt of Request
       ↓
┌─────────────────────┐
│ Legal Review        │
│ - Validate source   │
│ - Assess scope      │
│ - Check compliance  │
└─────────┬───────────┘
          ↓
┌─────────────────────┐
│ Litigation Hold     │
│ - Identify data     │
│ - Suspend deletion  │
│ - Notify IT         │
└─────────┬───────────┘
          ↓
┌─────────────────────┐
│ Data Collection     │
│ - Export relevant   │
│ - Preserve chain    │
│ - Log access        │
└─────────┬───────────┘
          ↓
┌─────────────────────┐
│ Production          │
│ - Format per specs  │
│ - Deliver securely  │
│ - Document transfer │
└─────────────────────┘
```

### Data Available for Discovery

| Data Type | Available | Format | Notes |
|-----------|-----------|--------|-------|
| Transcripts | Yes | JSON, DOCX, PDF | Full text with metadata |
| Audio Files | Yes | Original format | Encrypted delivery |
| Audit Logs | Yes | JSON, CSV | Cannot be redacted |
| User Actions | Yes | JSON | Per-user activity |
| Shares/Access | Yes | JSON | Access history |
| Exhibits | Yes | Original format | With stamps |
| Job Metadata | Yes | JSON | Workflow history |

### Export Capabilities

**Admin Export Endpoint:**
```
POST /api/admin/legal-export
Authorization: Admin only
Body: {
  requestId: "legal-request-123",
  scope: {
    firmId: "firm-abc",
    dateRange: { start: "2024-01-01", end: "2024-06-01" },
    dataTypes: ["transcripts", "audit_logs", "shares"]
  },
  format: "json" | "native"
}
```

**Response includes:**
- Complete data export
- Chain of custody manifest
- Integrity checksums
- Export audit log entry

### Chain of Custody

Every legal export includes:

```json
{
  "exportId": "export-uuid",
  "requestedBy": "admin@firm.com",
  "requestedAt": "2024-01-15T10:30:00Z",
  "legalRequestId": "case-2024-001",
  "scope": { ... },
  "recordCount": 1547,
  "checksums": {
    "algorithm": "SHA-256",
    "manifest": "abc123...",
    "files": [
      { "name": "transcripts.json", "checksum": "def456..." }
    ]
  },
  "deliveredTo": "attorney@lawfirm.com",
  "deliveredAt": "2024-01-15T14:22:00Z"
}
```

---

## Right-to-Know (Data Subject Requests)

### Covered Regulations
- **GDPR** Article 15 (Right of Access)
- **CCPA** Section 1798.100 (Right to Know)
- **CPRA** Enhanced consumer rights

### Request Types

1. **Access Request** - What data do you have about me?
2. **Portability Request** - Give me my data in machine-readable format
3. **Correction Request** - Fix inaccurate data
4. **Deletion Request** - Remove my data (see DATA_DELETION.md)

### Response Timeline

| Regulation | Response Deadline | Extension Allowed |
|------------|------------------|-------------------|
| GDPR | 30 days | +60 days (complex) |
| CCPA | 45 days | +45 days (complex) |
| Internal SLA | 14 days | N/A |

### Data Subject Access Request (DSAR) Procedure

```
1. RECEIVE REQUEST
   - Via email, form, or portal
   - Log to tracking system
   - Auto-acknowledge receipt

2. VERIFY IDENTITY
   - Require government ID or
   - Account verification or
   - Multi-factor confirmation

3. SCOPE ASSESSMENT
   - Identify all data stores
   - Check for third-party processors
   - Determine data categories

4. DATA COLLECTION
   - Export personal data
   - Include all categories
   - Note any exclusions

5. REVIEW & REDACT
   - Remove third-party PII
   - Remove trade secrets
   - Legal review if needed

6. DELIVER RESPONSE
   - Secure delivery method
   - Include data inventory
   - Explain retention periods

7. CLOSE REQUEST
   - Log completion
   - Store for compliance
   - Update metrics
```

### Data Categories for DSAR

**Personal Information:**
- Name, email, phone
- Account creation date
- Role and permissions

**Activity Data:**
- Login history
- Actions performed
- Files accessed

**Content Data:**
- Transcripts created
- Annotations made
- Exhibits uploaded

**Technical Data:**
- IP addresses
- Device information
- Browser details

**Derived Data:**
- Usage analytics
- Performance metrics
- Error logs

### Self-Service Export

Users can export their own data:

```
POST /api/account/export-my-data
Authorization: User session
Response: {
  exportId: "...",
  status: "processing",
  estimatedCompletion: "2024-01-15T12:00:00Z",
  notifyEmail: true
}
```

**Export includes:**
- All personal data
- All created content
- Activity history
- Access in formats: JSON, CSV

---

## Implementation Status

| Feature | Status | Target |
|---------|--------|--------|
| Legal hold flag | 🟡 Planned | Phase 8 |
| Admin legal export | 🟡 Planned | Phase 8 |
| DSAR self-service | 🟡 Planned | Phase 8 |
| Chain of custody | 🟡 Planned | Phase 8 |
| Identity verification | 🟡 Planned | Phase 8 |
| Audit log export | ✅ Implemented | Phase 7 |

---

## Contact & Escalation

**Privacy Requests:**
- Email: privacy@depo-pro.com
- Response SLA: 48 hours acknowledgment

**Legal Requests:**
- Email: legal@depo-pro.com
- Phone: [Legal counsel direct line]

**Escalation Path:**
1. Privacy Officer
2. General Counsel
3. CEO (if required)
