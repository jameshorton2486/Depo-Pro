# Data Deletion Policy

## Soft Delete vs Hard Delete

Depo-Pro uses a **soft-delete-first** approach for all user-facing data to ensure:
- Accidental deletion recovery
- Audit trail integrity
- Legal compliance
- Data consistency

### Soft Delete

**Definition:** Data is marked as deleted but remains in the database with a `deletedAt` timestamp.

**Applies To:**
- Users
- Jobs
- Transcripts
- Exhibits
- Shares
- Calendar Events

**Implementation:**
```prisma
model User {
  deletedAt DateTime?  // null = active, set = soft-deleted
}
```

**Behavior:**
- Data excluded from normal queries
- Data accessible via admin tools
- Data recoverable within grace period
- Audit trail references remain valid

### Hard Delete

**Definition:** Data is permanently removed from the database.

**Triggers:**
- Grace period expiration (30 days post soft-delete)
- Explicit customer request + confirmation
- Legal requirement (specific jurisdictions)
- Data retention period exceeded

**Process:**
1. Verify no active references
2. Verify no legal hold
3. Log deletion to audit trail
4. Remove from database
5. Remove from backups (async, per backup retention)

## Deletion Workflows

### User Deletion

```
Customer Request
       ↓
┌─────────────────┐
│ Validate Request │
│ - Authorized?    │
│ - Legal hold?    │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Soft Delete     │
│ - Set deletedAt │
│ - Log to audit  │
│ - Notify user   │
└────────┬────────┘
         ↓
    30 days
         ↓
┌─────────────────┐
│ Hard Delete     │
│ - Anonymize PII │
│ - Remove data   │
│ - Confirm       │
└─────────────────┘
```

### Transcript Deletion

**Special Considerations:**
- May be subject to legal discovery
- May have active shares
- Must preserve audit history

**Steps:**
1. Revoke all active shares
2. Log share revocations
3. Soft-delete transcript
4. Soft-delete related highlights, annotations, bookmarks
5. After grace period: hard-delete content, keep metadata

### Firm Deletion (Account Closure)

**Process:**
1. Export all data for customer (required)
2. Revoke all user access
3. Soft-delete all firm data
4. 90-day grace period
5. Hard-delete after confirmation

**Data Preserved:**
- Audit logs (indefinitely)
- Billing records (7 years)
- Anonymized usage statistics

## Cascade Rules

| Parent Entity | Child Entities | Cascade Behavior |
|--------------|----------------|------------------|
| Firm | Users, Jobs | Soft-delete cascade |
| User | Jobs (created), Shares | Orphan (reassign) |
| Job | Transcript, Exhibits | Soft-delete cascade |
| Transcript | Shares, Highlights, etc. | Soft-delete cascade |

## Right to Erasure (GDPR/CCPA)

### Customer Rights
- Request deletion of personal data
- Receive confirmation within 30 days
- Data removed within 90 days

### Exceptions
- Legal hold in place
- Required for legal compliance
- Necessary for contract fulfillment
- Audit trail integrity

### Response Template
```
Dear [Customer],

We have received your data deletion request dated [DATE].

We will process your request within 30 days. Your data will be:
- Immediately soft-deleted (excluded from active use)
- Permanently deleted after 30-day grace period

Exceptions:
- Audit logs will be anonymized but retained for compliance
- Billing records will be retained for 7 years per legal requirements

If you have questions, please contact compliance@depo-pro.com.
```

## Implementation Checklist

### Soft Delete Implementation
- [x] Add `deletedAt` field to models
- [x] Update queries to exclude deleted records
- [x] Add admin recovery endpoints
- [ ] Add scheduled cleanup job (Phase 8)

### Hard Delete Implementation
- [ ] Grace period enforcement
- [ ] Legal hold check
- [ ] Cascade deletion logic
- [ ] Backup cleanup coordination

### Audit Trail
- [x] Log all deletion requests
- [x] Log soft-delete events
- [ ] Log hard-delete events
- [ ] Log recovery events

## API Endpoints

### Delete User
```
DELETE /api/users/:id
Response: 200 { deleted: true, permanentAt: "2024-02-14T..." }
```

### Delete Transcript
```
DELETE /api/transcripts/:id
Response: 200 { deleted: true, sharesRevoked: 3 }
```

### Request Data Export (Pre-deletion)
```
POST /api/account/export
Response: 202 { exportId: "...", estimatedCompletion: "..." }
```

### Confirm Hard Delete
```
POST /api/account/delete/confirm
Body: { confirmationCode: "..." }
Response: 200 { scheduledFor: "2024-02-14T..." }
```

## Monitoring

### Metrics to Track
- Soft-delete requests per day
- Hard-delete completions per day
- Average time to deletion
- Recovery requests
- Failed deletions

### Alerts
- Deletion backlog > 100 records
- Failed deletion attempts
- Legal hold violations
- Unusual deletion patterns
