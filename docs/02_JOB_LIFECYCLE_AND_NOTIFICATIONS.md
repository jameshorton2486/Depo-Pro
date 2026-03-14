# DEPO-PRO JOB LIFECYCLE & NOTIFICATION SPECIFICATION
**Version:** 1.0 | **Date:** March 2026 | **Status:** Authoritative  
**Companion to:** `01_MASTER_ARCHITECTURE.md`

> This document defines the complete job lifecycle state machine,
> every status transition, all notification triggers, and the
> delivery model. All AI agents and developers must follow this
> specification exactly.

---

## TABLE OF CONTENTS

1. [Job Status State Machine](#1-job-status-state-machine)
2. [Status Display Labels](#2-status-display-labels)
3. [Transition Rules](#3-transition-rules)
4. [Automatic Transitions](#4-automatic-transitions)
5. [Manual Transitions & UI Actions](#5-manual-transitions--ui-actions)
6. [Notification System](#6-notification-system)
7. [Attorney Delivery Model](#7-attorney-delivery-model)
8. [Data Retention Lifecycle](#8-data-retention-lifecycle)
9. [Navigation Labels Reference](#9-navigation-labels-reference)

---

## 1. Job Status State Machine

```
NOD Uploaded
     │
     ▼
 CREATED ────────────────────────────────── midnight on depo date (auto)
     │                                               │
     │                                               ▼
     │                                       FILES_UPLOADED
     │                                       (Recording Needed)
     │
     │ Audio uploaded
     ▼
ENHANCING_AUDIO
(Processing Audio)
     │ FFmpeg complete (auto)
     ▼
 TRANSCRIBING
     │ Deepgram complete (auto)
     ▼
AI_REVIEWING
(AI Formatting)
     │ Formatting complete (auto)
     ▼
READY_FOR_EDIT ─── Scopist/Reporter opens editor
     │                        │
     │                        ▼
     │                    ASSIGNED
     │                (Assigned to Scopist)
     │                        │
     │                        ▼
     └──────────────────► IN_EDIT
                         (In Proofing)
                              │ Scopist clicks "Submit"
                              ▼
                    SUBMITTED_FOR_REVIEW
                    (Submitted for Reporter Review)
                              │ Reporter opens final review
                              ▼
                          IN_REVIEW
                       (Reporter Review)
                              │ Reporter certifies
                              ▼
                       REVIEW_COMPLETE
                       (Pending Delivery)
                              │ Reporter clicks "Deliver"
                              ▼
                         COMPLETED
                          (Delivered)
                              │ Retention rules (auto, monthly)
                              ▼
                          ARCHIVED

At any point → CANCELLED (manual)
At any point → FAILED (pipeline error, auto)
```

---

## 2. Status Display Labels

> The DB enum values are kept as-is to avoid schema migrations.  
> Display labels are rendered by `components/jobs/job-status-badge.tsx`.

| DB Status Value | UI Display Label | Badge Color |
|---|---|---|
| `CREATED` | Scheduled – Awaiting Deposition | Slate |
| `FILES_UPLOADED` | Recording Needed | Amber |
| `ENHANCING_AUDIO` | Processing Audio | Indigo |
| `TRANSCRIBING` | Transcribing | Purple |
| `AI_REVIEWING` | AI Formatting | Pink |
| `READY_FOR_EDIT` | Ready for Proofing | Green |
| `ASSIGNED` | Assigned to Scopist | Yellow |
| `IN_EDIT` | In Proofing | Orange |
| `SUBMITTED_FOR_REVIEW` | Submitted for Reporter Review | Teal |
| `SCOPIST_COMPLETE` | Scopist Complete (alias) | Teal |
| `IN_REVIEW` | Reporter Review | Cyan |
| `REVIEW_COMPLETE` | Pending Delivery | Emerald |
| `COMPLETED` | Delivered | Emerald |
| `CANCELLED` | Cancelled | Red |
| `FAILED` | Failed | Red |
| `ARCHIVED` | Archived | Gray |

---

## 3. Transition Rules

### Core Rule
**Status transitions must only be triggered through explicit, deliberate UI actions
or verified pipeline completions. Never update job status ad-hoc in a component
or arbitrary API route.**

### Who Can Trigger Each Transition

| From → To | Who | How |
|---|---|---|
| `CREATED` → `FILES_UPLOADED` | System (cron) | Automatic at midnight on deposition date |
| `CREATED` → `ENHANCING_AUDIO` | System | Audio uploaded by reporter |
| `FILES_UPLOADED` → `ENHANCING_AUDIO` | Reporter | Audio upload on job page |
| `ENHANCING_AUDIO` → `TRANSCRIBING` | System | FFmpeg pipeline completes |
| `TRANSCRIBING` → `AI_REVIEWING` | System | Deepgram returns results |
| `AI_REVIEWING` → `READY_FOR_EDIT` | System | AI formatting and flagging complete |
| `READY_FOR_EDIT` → `ASSIGNED` | Admin | Scopist assigned via admin panel |
| `READY_FOR_EDIT` → `IN_EDIT` | Reporter | Opens transcript editor |
| `ASSIGNED` → `IN_EDIT` | Scopist | Opens transcript editor |
| `IN_EDIT` → `SUBMITTED_FOR_REVIEW` | Scopist | Clicks "Submit for Reporter Review" |
| `SUBMITTED_FOR_REVIEW` → `IN_REVIEW` | Reporter | Opens final review UI |
| `IN_REVIEW` → `REVIEW_COMPLETE` | Reporter | Clicks "Certify Transcript" |
| `REVIEW_COMPLETE` → `COMPLETED` | Reporter | Clicks "Deliver Transcript" and confirms |
| Any → `CANCELLED` | Reporter / Admin | Manual cancellation |
| Any → `FAILED` | System | Pipeline error detected |
| `FAILED` → `ENHANCING_AUDIO` | Reporter / Admin | Retry after fixing audio issue |
| `COMPLETED` → `ARCHIVED` | System (cron) | After retention window expires |

---

## 4. Automatic Transitions

### Cron: Recording Needed (`CREATED` → `FILES_UPLOADED`)

**Route:** `POST /api/cron/process-jobs`  
**Trigger:** Daily at midnight (server time / America/Chicago)  
**Logic:**
```
For each job where:
  status = 'CREATED'
  AND deposition_date < TODAY
  AND audio_file_url IS NULL
→ Update status to 'FILES_UPLOADED'
→ Send recordingNeededEmail() to reporter + agency admin
```

### Pipeline: Audio Enhancement → Transcription (automatic chain)

```
Audio uploaded
  → updateJobStatus(jobId, 'ENHANCING_AUDIO')
  → FFmpeg normalizeAudioForTranscription()
  → updateJobStatus(jobId, 'TRANSCRIBING')
  → Deepgram Nova-3 transcription
  → updateJobStatus(jobId, 'AI_REVIEWING') [via transcription status]
  → AI formatting + flagging
  → updateJobStatus(jobId, 'READY_FOR_EDIT')
  → sendReadyForProofingEmail()
```

---

## 5. Manual Transitions & UI Actions

### Scopist: Submit for Reporter Review

**Location:** Transcript editor — "Submit for Reporter Review" button  
**Route:** `POST /api/jobs/[id]/review/submit`  
**Behavior:**
- Count unresolved flagged words
- If unresolvedCount > 0 → show warning modal with count (NOT a hard block)
- Scopist can submit with warning
- Update job status → `SUBMITTED_FOR_REVIEW`
- Send `proofingCompleteEmail()` to reporter + agency admin
- Email includes unresolved flag count and warning if > 0

### Reporter: Certify Transcript

**Location:** Job detail page → "Certify Transcript" button  
**Route:** `POST /api/transcripts/[id]/certify`  
**Behavior:**
- Reporter has done final review in the editor
- Updates job status → `REVIEW_COMPLETE`
- Updates transcript with certification timestamp and reporter signature

### Reporter: Deliver Transcript

**Location:** Job detail page → "Deliver Transcript" button  
**Route:** `POST /api/transcripts/[id]/finalize` (or equivalent)  
**Behavior:**
1. Generate certified DOCX from corrected transcript data
2. Store DOCX at `cases/{cause_number}/jobs/{job_id}/transcripts/certified_transcript.docx`
3. Generate secure one-time download token (72-hour expiry)
4. Update job status → `COMPLETED`
5. Send `transcriptDeliveredEmail()` to ordering attorney
6. Send delivery confirmation to agency admin (if applicable)

---

## 6. Notification System

### Provider

**Resend** is the sole email provider.

```
RESEND_API_KEY = re_*
Sending address: notifications@depo-pro.com
Support display: info@depo-pro.com (display only — not a sending address)
```

> ⚠️ Zoho has been fully removed. No SMTP, no Zoho references anywhere.  
> All 4 email template functions live in `lib/email.ts`.

### Email Templates

All functions defined in `lib/email.ts` and return `EmailOptions` objects.
Call `sendEmail(emailOptions)` to dispatch.

---

#### `recordingNeededEmail(data)` — Recording Upload Required

**Trigger:** Cron job — deposition date passed, no audio uploaded  
**Recipients:** Assigned reporter + agency admin  
**Subject:** `Recording Upload Required – {deponentName} ({causeNumber})`

```typescript
data: {
  recipientName: string
  recipientEmail: string
  caseStyle: string        // "Perez v. Simon Ugalde"
  causeNumber: string      // "2025-CI-12281"
  deponentName: string     // "Bianca Perez"
  depositionDate: string   // "March 11, 2026"
  jobId: string
}
```

**Email contains:**
- Case details box (case style, cause number, deponent, date)
- "Upload Recording" button → links to `/jobs/{jobId}`

---

#### `readyForProofingEmail(data)` — Transcript Ready for Proofing

**Trigger:** AI formatting pipeline completes (`READY_FOR_EDIT` status set)  
**Recipients:** Assigned scopist (if any), otherwise reporter  
**Subject:** `Ready for Proofing – {deponentName} ({causeNumber})`

```typescript
data: {
  recipientName: string
  recipientEmail: string
  caseStyle: string
  causeNumber: string
  deponentName: string
  depositionDate: string
  jobId: string
  transcriptId: string
  flaggedWordCount: number
}
```

**Email contains:**
- Case details box
- Flagged word count badge (amber if > 0)
- "Open Transcript" button → links to `/transcripts/{transcriptId}`

---

#### `proofingCompleteEmail(data)` — Proofing Complete

**Trigger:** Scopist clicks "Submit for Reporter Review"  
**Recipients:** Reporter email + agency admin email (both in `to` array)  
**Subject:** `Proofing Complete – {deponentName} ({causeNumber})`

```typescript
data: {
  reporterName: string
  reporterEmail: string
  agencyAdminEmail?: string     // optional — included if reporter has agency
  caseStyle: string
  causeNumber: string
  deponentName: string
  depositionDate: string
  scopistName: string
  jobId: string
  unresolvedFlagCount: number
}
```

**Email contains:**
- Flag warning panel (amber if unresolvedFlagCount > 0, green if all resolved)
- Case details box
- "Review & Certify" button → links to `/jobs/{jobId}`

---

#### `transcriptDeliveredEmail(data)` — Transcript Delivered

**Trigger:** Reporter clicks "Deliver Transcript"  
**Recipients:** Ordering attorney (paying party only — not all counsel)  
**Subject:** `Transcript Delivered – {deponentName} ({causeNumber})`

```typescript
data: {
  recipientName: string
  recipientEmail: string
  caseStyle: string
  causeNumber: string
  deponentName: string
  depositionDate: string
  reporterName: string
  downloadToken: string      // one-time secure token
  expiresHours?: number      // default 72
}
```

**Email contains:**
- Case details box with court reporter name
- "Download Transcript" button → `/download/{downloadToken}`
- Expiry notice: "This link expires in 72 hours"

---

### Future Notifications (Post-Beta)

- **SMS alerts** via Resend SMS or Twilio — optional per user settings
- **Daily digest** for agencies with multiple active jobs
- **Reminder escalation** — second recording reminder at 72 hours if still not uploaded

---

## 7. Attorney Delivery Model

### Beta Model (Current)

- Attorneys do **NOT** have Depo-Pro accounts
- Delivery is via **one-time secure download link** (72-hour expiry)
- Ordering attorney only receives the delivery notification by default
- Reporter manually adds copy orders for additional counsel

### Copy Order Workflow (Part 3 Implementation)

1. Reporter opens job detail page after `REVIEW_COMPLETE`
2. Clicks "Add Copy Order" → modal opens
3. Enters: attorney name, firm, email, delivery format, charge amount
4. System records copy order → generates separate delivery link per copy
5. Each copy recipient receives their own `transcriptDeliveredEmail()`
6. Copy order charges tracked for billing

### Future Model (Post-Beta)

- Law firm portal login for attorneys
- Persistent access to all transcripts for a case
- No one-time links required

---

## 8. Data Retention Lifecycle

### Active Window

| Asset | Active Window Start | Duration |
|---|---|---|
| Audio files | Upload date | 60 days post-DELIVERED |
| Video files | Upload date | 60 days post-DELIVERED |
| NOD / intake PDFs | Upload date | 60 days post-DELIVERED |
| Certified transcripts | DELIVERED date | 12–18 months (default 18) |

### Archive Process (Monthly Cron)

```
/api/cron/cleanup runs monthly:
  For each job where status = 'COMPLETED':
    If (completed_at + 60 days) < today:
      Move audio/ and video/ files to archive bucket
      Move intake/ files to archive bucket
      Mark job with archived_at timestamp
      Keep transcripts/ files active (18-month window)
    If (completed_at + 18 months) < today:
      Move transcripts/ to archive bucket
      Set transcript_archived_at
```

### 6-Year Retention

All archived files remain in the archive Supabase Storage bucket.
After 6 years from the deposition date, files become eligible for permanent deletion.
**No automated hard deletion is implemented at launch** — this is a future manual/admin process.

### Scopist Access After Completion

- Scopist retains full job access for 60 days post-COMPLETED
- After 60 days: audio and video files archived (scopist loses access)
- Completed transcript remains visible for the full 18-month window

---

## 9. Navigation Labels Reference

File: `lib/navigation.ts`

### Cases & Jobs Section

| Label | Route | Notes |
|---|---|---|
| **All Depositions** | `/jobs` | Was "All Jobs" |
| **Transcript Requests** | `/admin/requests` | Law firm intake requests |
| **New Case** | `/cases/new` | Keep — standalone case creation |
| **New Deposition** | `/jobs/new` | Was "New Job" — New Deposition Intake wizard |
| **Deposition Calendar** | `/calendar` | Was "Calendar" |

### Transcripts Section (Filter Links)

| Label | Route | Status Filter |
|---|---|---|
| **In Proofing** | `/jobs?status=IN_EDIT` | Was "In Progress" |
| **Ready for Proofing** | `/jobs?status=READY_FOR_EDIT` | Was "Ready" |
| **With Scopist** | `/jobs?status=ASSIGNED` | Keep as-is |
| **Delivered** | `/jobs?status=COMPLETED` | Was "Completed" |

### Reporter Section (My view)

| Label | Route |
|---|---|
| **My Depositions** | `/jobs` | Was "My Jobs" |
| **New Deposition** | `/jobs/new` | Was "New Job" |

### Status Filter Dropdown (Jobs List Page)

```html
<option value="">All Statuses</option>
<option value="CREATED">Scheduled – Awaiting Deposition</option>
<option value="FILES_UPLOADED">Recording Needed</option>
<option value="TRANSCRIBING">Transcribing</option>
<option value="AI_REVIEWING">AI Formatting</option>
<option value="READY_FOR_EDIT">Ready for Proofing</option>
<option value="ASSIGNED">Assigned to Scopist</option>
<option value="IN_EDIT">In Proofing</option>
<option value="SUBMITTED_FOR_REVIEW">Submitted for Reporter Review</option>
<option value="IN_REVIEW">Reporter Review</option>
<option value="REVIEW_COMPLETE">Pending Delivery</option>
<option value="COMPLETED">Delivered</option>
<option value="CANCELLED">Cancelled</option>
```
