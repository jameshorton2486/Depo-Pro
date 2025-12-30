# Data Retention Policy

## Overview

This document outlines Depo-Pro's data retention policies to ensure compliance with legal requirements and best practices for handling legal transcription data.

## Retention Periods

### Audit Logs
- **Retention:** 7 years minimum
- **Reason:** Legal defensibility, SOC-2 compliance, potential litigation
- **Deletion:** Never deleted; archived after 7 years to cold storage
- **Notes:** Audit logs are immutable and append-only

### Transcripts
- **Active Retention:** Indefinite while customer account is active
- **Post-Termination:** 90 days after account closure
- **Legal Hold:** Indefinite when under litigation hold
- **Notes:** Customers can request earlier deletion (see Data Deletion section)

### Audio Files
- **Retention:** Same as associated transcript
- **Storage:** Encrypted at rest (AES-256)
- **Post-Processing:** Original files retained; no automatic deletion

### User Data
- **Active Users:** Retained while account is active
- **Inactive Users:** Anonymized after 2 years of inactivity
- **Deleted Users:** Soft-deleted, hard-deleted after 30 days
- **Notes:** Email may be retained for audit purposes (hashed)

### Job Records
- **Retention:** Same as associated transcript
- **Completed Jobs:** Retained indefinitely
- **Failed Jobs:** Retained for 1 year for debugging

### Shares and Access Records
- **Retention:** Same as parent transcript
- **Expired Shares:** Metadata retained, access revoked
- **Notes:** Share history is part of audit trail

## Data Classification

### Critical Data (Never Auto-Delete)
- Audit logs
- Financial records
- Legal holds
- Compliance documentation

### Sensitive Data (Protected Retention)
- Transcripts
- Audio recordings
- User credentials (hashed)
- Access logs

### Standard Data (Standard Retention)
- Job metadata
- System logs
- Performance metrics
- Analytics data

## Legal Holds

When a legal hold is placed:

1. All deletion requests for affected data are suspended
2. Retention timers are paused
3. Data is flagged with hold status
4. Hold can only be released by authorized personnel
5. All hold events are logged to audit trail

### Hold Triggers
- Litigation notification
- Government investigation
- Internal investigation
- Customer dispute

## Data Deletion

### Customer-Requested Deletion
1. Customer submits deletion request
2. Request logged to audit trail
3. 72-hour processing window
4. Soft-delete applied
5. Hard-delete after 30-day grace period
6. Confirmation sent to customer

### Automatic Deletion
- Only applies to data exceeding retention periods
- Never applies to data under legal hold
- Deletion events logged to audit trail

### Data That Cannot Be Deleted
- Audit logs (ever)
- Data under legal hold
- Data required for pending litigation
- Financial/billing records within retention period

## Backup and Recovery

### Backup Retention
- Daily backups: 30 days
- Weekly backups: 90 days
- Monthly backups: 1 year
- Annual backups: 7 years

### Recovery Considerations
- Restored data subject to same retention policies
- Recovery events logged to audit trail
- Deleted data may exist in backups within retention period

## Implementation Status

| Requirement | Status | Notes |
|-------------|--------|-------|
| Audit log immutability | ✅ Implemented | Append-only design |
| Soft-delete users | ✅ Implemented | 30-day grace period |
| Legal hold system | 🟡 Planned | Phase 8 |
| Automated deletion | 🟡 Planned | Phase 8 |
| Backup encryption | ✅ Implemented | Supabase handles |
| Retention reporting | 🟡 Planned | Phase 8 |

## Compliance References

- SOC-2 Type II: CC6.1, CC6.5
- GDPR: Article 17 (Right to Erasure)
- CCPA: Section 1798.105
- HIPAA: 45 CFR 164.530(j)

## Contact

For data retention inquiries:
- Email: compliance@depo-pro.com
- Internal: #compliance Slack channel
