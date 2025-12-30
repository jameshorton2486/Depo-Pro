# Depo-Pro Calendar & CSR System — API Specifications

## Overview

This document defines all API endpoints for the calendar, CSR paperwork, and marketplace features.

**Base URL:** `/api`  
**Authentication:** All endpoints require valid session (NextAuth)  
**Content-Type:** `application/json`

---

## 1. Agency Endpoints

### POST /api/agencies
Create a new agency.

**Authorization:** ADMIN only

**Request Body:**
```json
{
  "name": "Texas Legal Reporting",
  "slug": "texas-legal-reporting",
  "email": "admin@tlr.com",
  "phone": "555-123-4567",
  "address": "123 Main St",
  "city": "Houston",
  "state": "TX",
  "zipCode": "77001",
  "planType": "PROFESSIONAL",
  "maxReporters": 25,
  "maxFirms": 10
}
```

**Response:** `201 Created`
```json
{
  "id": "clx123...",
  "name": "Texas Legal Reporting",
  "slug": "texas-legal-reporting",
  ...
}
```

### GET /api/agencies
List all agencies.

**Authorization:** ADMIN only

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `search` (optional): Search by name

**Response:** `200 OK`
```json
{
  "agencies": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

### GET /api/agencies/[id]
Get agency details.

**Authorization:** ADMIN or agency member

**Response:** `200 OK`
```json
{
  "id": "clx123...",
  "name": "Texas Legal Reporting",
  "slug": "texas-legal-reporting",
  "reporters": [...],
  "firms": [...],
  "stats": {
    "totalReporters": 12,
    "activeJobs": 45,
    "completedThisMonth": 23
  }
}
```

### PATCH /api/agencies/[id]
Update agency.

**Authorization:** ADMIN or AGENCY_ADMIN

### POST /api/agencies/[id]/invite
Invite user to agency.

**Authorization:** ADMIN or AGENCY_ADMIN

**Request Body:**
```json
{
  "email": "reporter@example.com",
  "role": "REPORTER"
}
```

---

## 2. Calendar Endpoints

### GET /api/calendar
List calendar events.

**Authorization:** Any authenticated user (filtered by role)

**Query Parameters:**
- `startDate` (required): ISO date
- `endDate` (required): ISO date
- `status` (optional): Comma-separated statuses
- `reporterId` (optional): Filter by reporter
- `firmId` (optional): Filter by firm
- `locationType` (optional): IN_PERSON, ZOOM, etc.

**Response:** `200 OK`
```json
{
  "events": [
    {
      "id": "clx123...",
      "caseStyle": "Smith v. Jones",
      "deponentName": "John Smith",
      "scheduledStart": "2025-01-15T09:00:00Z",
      "scheduledEnd": "2025-01-15T17:00:00Z",
      "locationType": "IN_PERSON",
      "locationAddress": "123 Main St, Houston, TX",
      "status": "SCHEDULED",
      "assignedReporter": {
        "id": "usr123",
        "firstName": "Jane",
        "lastName": "Doe"
      }
    }
  ],
  "count": 15
}
```

### POST /api/calendar
Create calendar event.

**Authorization:** ADMIN, AGENCY_ADMIN, REPORTER, ATTORNEY

**Request Body:**
```json
{
  "caseStyle": "Smith v. Jones",
  "caseNumber": "2025-CV-12345",
  "deponentName": "John Smith",
  "deponentRole": "PLAINTIFF",
  "scheduledStart": "2025-01-15T09:00:00Z",
  "scheduledEnd": "2025-01-15T17:00:00Z",
  "timezone": "America/Chicago",
  "locationType": "IN_PERSON",
  "locationAddress": "123 Main St",
  "locationCity": "Houston",
  "locationState": "TX",
  "assignedReporterId": "usr123",
  "orderingAttorneyId": "att123",
  "interpreterRequired": false,
  "videographerRequired": false,
  "notes": "Confidential matter"
}
```

**Validation Rules:**
- `caseStyle` required, max 500 chars
- `deponentName` required, max 200 chars
- `scheduledStart` required, must be future
- `scheduledEnd` optional, must be after start
- `assignedReporterId` must be valid reporter, must be available

**Response:** `201 Created`
```json
{
  "id": "clx456...",
  "caseStyle": "Smith v. Jones",
  ...
}
```

### GET /api/calendar/[id]
Get event details.

**Authorization:** Must have access to event

**Response:** `200 OK`
```json
{
  "id": "clx123...",
  "caseStyle": "Smith v. Jones",
  "deponentName": "John Smith",
  ...
  "job": null,
  "orderingAttorney": {
    "id": "att123",
    "firstName": "Taylor",
    "lastName": "Hunter",
    "firmName": "Hunter Law"
  },
  "assignedReporter": {...}
}
```

### PATCH /api/calendar/[id]
Update event.

**Authorization:** Creator, assigned reporter, admin

**Request Body:** Partial event object

**Response:** `200 OK`

### DELETE /api/calendar/[id]
Cancel event (soft delete).

**Authorization:** Creator, admin

**Request Body:**
```json
{
  "cancellationReason": "Client request"
}
```

**Response:** `200 OK`

### POST /api/calendar/[id]/convert-to-job
Create job from calendar event.

**Authorization:** Assigned reporter, admin

**Request Body:**
```json
{
  "createCSRRecord": true
}
```

**Response:** `201 Created`
```json
{
  "jobId": "job123...",
  "csrRecordId": "csr123..."
}
```

### GET /api/calendar/availability
Check reporter availability.

**Query Parameters:**
- `reporterId` (required)
- `startDate` (required)
- `endDate` (required)

**Response:** `200 OK`
```json
{
  "available": true,
  "conflicts": [],
  "availability": [
    {
      "date": "2025-01-15",
      "slots": [
        { "start": "09:00", "end": "12:00" },
        { "start": "13:00", "end": "17:00" }
      ]
    }
  ]
}
```

---

## 3. Attorney Endpoints

### GET /api/attorneys
List attorneys.

**Query Parameters:**
- `page`, `limit`
- `search`: Search name, firm, email
- `state`: Filter by bar state

**Response:** `200 OK`
```json
{
  "attorneys": [
    {
      "id": "att123",
      "firstName": "Taylor",
      "lastName": "Hunter",
      "firmName": "Hunter Law",
      "email": "thunter@hunterlaw.com",
      "barNumber": "12345678",
      "barState": "TX"
    }
  ],
  "pagination": {...}
}
```

### POST /api/attorneys
Create attorney.

**Request Body:**
```json
{
  "firstName": "Taylor",
  "lastName": "Hunter",
  "firmName": "Hunter Law",
  "email": "thunter@hunterlaw.com",
  "phone": "555-234-5678",
  "address": "456 Law Ave",
  "city": "Dallas",
  "state": "TX",
  "zipCode": "75201",
  "barNumber": "12345678",
  "barState": "TX",
  "licensureStates": ["TX", "OK"],
  "preferredFormat": "Word",
  "preferredDelivery": "E-Trans"
}
```

**Response:** `201 Created`

### GET /api/attorneys/search
Autocomplete search.

**Query Parameters:**
- `q` (required): Search term (min 2 chars)

**Response:** `200 OK`
```json
{
  "results": [
    {
      "id": "att123",
      "displayName": "Taylor Hunter (Hunter Law)",
      "email": "thunter@hunterlaw.com"
    }
  ]
}
```

### GET /api/attorneys/[id]
Get attorney details.

### PATCH /api/attorneys/[id]
Update attorney.

### DELETE /api/attorneys/[id]
Delete attorney (admin only).

---

## 4. CSR Record Endpoints

### GET /api/jobs/[id]/csr-record
Get CSR record for job.

**Response:** `200 OK`
```json
{
  "id": "csr123",
  "jobId": "job123",
  "depositionDate": "2025-01-15",
  "caseCaption": "Smith v. Jones",
  "causeNumber": "2025-CV-12345",
  ...
  "witnesses": [...],
  "attorneys": [...],
  "parties": [...],
  "properNouns": [...],
  "transcriptOptions": {...},
  "isLocked": false
}
```

### POST /api/jobs/[id]/csr-record
Create CSR record.

**Request Body:**
```json
{
  "depositionDate": "2025-01-15",
  "scheduledStartTime": "2025-01-15T09:00:00Z",
  "caseCaption": "Smith v. Jones",
  "causeNumber": "2025-CV-12345",
  "courtName": "419th Judicial District Court",
  "county": "Harris",
  "state": "TX",
  ...
}
```

**Response:** `201 Created`

### PATCH /api/jobs/[id]/csr-record
Update CSR record.

**Request Body:** Partial CSR record

**Error:** `403 Forbidden` if record is locked

### POST /api/jobs/[id]/csr-record/witnesses
Add witness.

**Request Body:**
```json
{
  "fullLegalName": "John Smith",
  "preferredName": "Johnny",
  "role": "PLAINTIFF",
  "city": "Houston",
  "state": "TX",
  "appearanceType": "IN_PERSON",
  "readAndSignRequired": true,
  "isPrimary": true
}
```

### PATCH /api/jobs/[id]/csr-record/witnesses/[witnessId]
Update witness.

### DELETE /api/jobs/[id]/csr-record/witnesses/[witnessId]
Remove witness.

### POST /api/jobs/[id]/csr-record/attorneys
Add attorney to deposition.

**Request Body:**
```json
{
  "attorneyId": "att123",
  "role": "ORDERING_ATTORNEY",
  "representing": "Plaintiff",
  "deliveryFormat": "Word",
  "rushRequested": true,
  "rushType": "EXPEDITE",
  "needsOriginal": true,
  "copyCount": 2
}
```

### GET /api/jobs/[id]/csr-record/proper-nouns
List proper nouns.

### POST /api/jobs/[id]/csr-record/proper-nouns
Add proper noun.

**Request Body:**
```json
{
  "value": "Eric Estopinal",
  "category": "PERSON_NAME",
  "phoneticHint": "es-TOP-in-al",
  "source": "Notice"
}
```

### POST /api/jobs/[id]/csr-record/proper-nouns/bulk
Bulk add proper nouns.

**Request Body:**
```json
{
  "nouns": [
    { "value": "Eric Estopinal", "category": "PERSON_NAME" },
    { "value": "A&H Foods", "category": "COMPANY_NAME" },
    { "value": "Pappas Grubbs Price", "category": "COMPANY_NAME" }
  ]
}
```

### DELETE /api/jobs/[id]/csr-record/proper-nouns/[nounId]
Remove proper noun.

### POST /api/jobs/[id]/csr-record/lock
Lock CSR record.

**Request Body:**
```json
{
  "reason": "Transcription started"
}
```

---

## 5. Marketplace Endpoints

### GET /api/marketplace
List available jobs.

**Authorization:** SCOPIST only

**Query Parameters:**
- `page`, `limit`
- `minPages`, `maxPages`
- `deadlineWithin`: Days until deadline
- `rushOnly`: Boolean
- `state`: Geographic filter
- `sortBy`: `deadline`, `pages`, `posted`
- `sortOrder`: `asc`, `desc`

**Response:** `200 OK`
```json
{
  "jobs": [
    {
      "id": "job123",
      "caseNameAnonymized": "Smith v. Jones",
      "estimatedPages": 150,
      "audioDuration": 180,
      "deadline": "2025-01-20",
      "isRush": false,
      "state": "TX",
      "postedAt": "2025-01-10T10:00:00Z"
    }
  ],
  "pagination": {...}
}
```

### POST /api/marketplace/[jobId]/claim
Claim a job.

**Authorization:** SCOPIST only

**Request Body:**
```json
{
  "proposedRate": 3.50,
  "rateType": "PER_PAGE",
  "note": "I have experience with medical depositions"
}
```

**Validation:**
- Scopist has < 3 pending claims
- Job is available (READY_FOR_EDIT, no accepted claim)
- Scopist not blocked by reporter

**Response:** `201 Created`
```json
{
  "claimId": "clm123",
  "status": "PENDING",
  "expiresAt": "2025-01-12T10:00:00Z"
}
```

### GET /api/marketplace/claims
List user's claims.

**Response:** `200 OK`
```json
{
  "claims": [
    {
      "id": "clm123",
      "jobId": "job123",
      "status": "PENDING",
      "claimedAt": "2025-01-10T10:00:00Z",
      "expiresAt": "2025-01-12T10:00:00Z",
      "job": {
        "caseNameAnonymized": "Smith v. Jones",
        "estimatedPages": 150
      }
    }
  ]
}
```

### GET /api/marketplace/claims/[claimId]
Get claim details.

### PATCH /api/marketplace/claims/[claimId]
Respond to claim.

**Authorization:** Job owner (reporter) or claim owner (scopist)

**Request Body (Reporter accepting):**
```json
{
  "action": "accept",
  "agreedRate": 3.50,
  "note": "Welcome aboard!"
}
```

**Request Body (Reporter rejecting):**
```json
{
  "action": "reject",
  "rejectionReason": "Looking for more experienced scopist"
}
```

**Request Body (Scopist cancelling):**
```json
{
  "action": "cancel"
}
```

**Side Effects:**
- On accept: Job status → ASSIGNED, assignment created
- On reject: Claim status → REJECTED
- On cancel: Claim status → CANCELLED

### POST /api/marketplace/claims/[claimId]/release
Release job back to marketplace.

**Authorization:** Scopist with accepted claim

**Request Body:**
```json
{
  "reason": "Personal emergency"
}
```

**Side Effects:**
- Claim status → CANCELLED
- Job status → READY_FOR_EDIT
- Notification to reporter
- Audit log created

### GET /api/marketplace/settings
Get marketplace settings.

### PUT /api/marketplace/settings
Update marketplace settings.

**Request Body:**
```json
{
  "isAvailableForWork": true,
  "minPagesAccepted": 50,
  "maxPagesAccepted": 300,
  "preferredRatePerPage": 3.50,
  "acceptsRushJobs": true,
  "acceptsMedicalDepos": true,
  "preferredStates": ["TX", "OK", "LA"]
}
```

---

## 6. PDF Parsing Endpoints

### POST /api/parse/notice
Parse Notice of Deposition PDF.

**Authorization:** Any authenticated user

**Content-Type:** `multipart/form-data`

**Request Body:**
- `file`: PDF file (max 10MB)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "caseCaption": "Eric Estopinal v. A&H Foods, LLC",
    "causeNumber": "2025-CV-12345",
    "court": {
      "name": "419th Judicial District Court",
      "county": "Harris",
      "state": "TX"
    },
    "deponent": {
      "name": "Eric Estopinal",
      "role": "PLAINTIFF"
    },
    "depositionDate": "2025-01-15",
    "depositionTime": "09:00",
    "location": {
      "type": "IN_PERSON",
      "address": "123 Main St",
      "city": "Houston",
      "state": "TX"
    },
    "orderingAttorney": {
      "name": "Taylor Hunter",
      "firm": "Hunter Law",
      "email": "thunter@hunterlaw.com"
    },
    "copyAttorneys": [...],
    "properNouns": [
      { "value": "Eric Estopinal", "category": "PERSON_NAME" },
      { "value": "A&H Foods", "category": "COMPANY_NAME" }
    ]
  },
  "confidence": {
    "overall": 0.92,
    "fields": {
      "caseCaption": 0.98,
      "deponent.name": 0.95,
      "depositionDate": 0.99,
      "orderingAttorney.email": 0.75
    }
  }
}
```

---

## 7. Google Calendar Sync Endpoints

### POST /api/calendar/sync/connect
Initiate Google Calendar connection.

**Response:** `200 OK`
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/..."
}
```

### DELETE /api/calendar/sync/disconnect
Disconnect Google Calendar.

### GET /api/calendar/sync/status
Get sync status.

**Response:** `200 OK`
```json
{
  "connected": true,
  "email": "user@gmail.com",
  "calendarId": "primary",
  "lastSyncAt": "2025-01-10T10:00:00Z",
  "syncEnabled": true,
  "errors": []
}
```

### POST /api/calendar/sync/trigger
Manually trigger sync.

**Response:** `200 OK`
```json
{
  "synced": 15,
  "created": 2,
  "updated": 3,
  "conflicts": []
}
```

### POST /api/webhooks/google-calendar
Google Calendar webhook handler.

**Authorization:** Validated by Google signature

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Not authorized for action |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `CONFLICT` | 409 | Resource conflict |
| `SCHEDULING_CONFLICT` | 409 | Reporter not available |
| `CSR_LOCKED` | 403 | CSR record is locked |
| `CLAIM_EXPIRED` | 410 | Claim has expired |
| `RATE_LIMITED` | 429 | Too many requests |

---

## Rate Limiting

| Endpoint Category | Limit |
|-------------------|-------|
| Read operations | 100/minute |
| Write operations | 30/minute |
| PDF parsing | 10/minute |
| Google sync | 5/minute |

---

## Webhooks (Outgoing)

Depo-Pro can send webhooks for integrations:

### Event: `calendar.event.created`
```json
{
  "event": "calendar.event.created",
  "timestamp": "2025-01-10T10:00:00Z",
  "data": {
    "eventId": "evt123",
    "caseStyle": "Smith v. Jones",
    ...
  }
}
```

### Event: `job.claimed`
```json
{
  "event": "job.claimed",
  "timestamp": "2025-01-10T10:00:00Z",
  "data": {
    "jobId": "job123",
    "claimId": "clm123",
    "scopistId": "usr456"
  }
}
```

### Event: `transcription.completed`
```json
{
  "event": "transcription.completed",
  "timestamp": "2025-01-10T10:00:00Z",
  "data": {
    "jobId": "job123",
    "transcriptId": "trn123",
    "wordCount": 15000,
    "flaggedCount": 45
  }
}
```
