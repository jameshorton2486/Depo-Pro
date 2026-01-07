# 📄 UI Contracts (Route → UI Agreement)

**Status:** Canonical API Response Contracts  
**Date:** January 2025

---

## 🛡️ UI Contract Rule

**UI components may only rely on these contracts — never on DB fields or inferred joins.**

These contracts guarantee:
- ✅ No snake_case in UI
- ✅ Role-filtered data already applied
- ✅ Safe to render without additional checks
- ✅ Consistent response shapes
- ✅ Type-safe interfaces

---

## 📄 Job List Contract

**Route:** `GET /api/jobs`

```typescript
export interface JobListItem {
  id: string;
  status: JobStatus;
  caseName: string | null;
  caseNumber: string | null;
  depositionDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  assignments?: {
    id: string;
    role: 'REPORTER' | 'SCOPIST';
    status: AssignmentStatus;
    user: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }[];
}
```

**UI Guarantees:**
- ✅ No snake_case properties
- ✅ Role-filtered already (user only sees accessible jobs)
- ✅ Safe to render in lists
- ✅ All dates are ISO strings

---

## 📄 Job Detail Contract

**Route:** `GET /api/jobs/[id]`

```typescript
export interface JobDetail {
  id: string;
  status: JobStatus;
  caseId: string | null;
  caseName: string | null;
  caseNumber: string | null;
  depositionDate: string;
  location: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
  };
  firm: {
    id: string;
    name: string;
  } | null;
  assignments: {
    id: string;
    role: 'REPORTER' | 'SCOPIST';
    status: AssignmentStatus;
    assignedAt: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  }[];
  files: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    storageUrl: string | null;
    uploadedAt: string;
  }[];
  transcripts: {
    id: string;
    status: TranscriptStatus;
    wordCount: number;
    createdAt: string;
  }[];
}
```

**UI Guarantees:**
- ✅ Complete job information
- ✅ All related data included (assignments, files, transcripts)
- ✅ Nested objects use camelCase
- ✅ Nullable fields properly typed

---

## 📄 Transcript Contract

**Route:** `GET /api/transcripts/[id]`

```typescript
export interface TranscriptResponse {
  id: string;
  jobId: string;
  status: TranscriptStatus;
  isLocked: boolean;
  lockedBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  lockedAt: string | null;
  wordCount: number;
  flaggedWordCount: number;
  fullTranscript: string | null;
  lastEditedAt: string | null;
  lastEditedBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  job: {
    id: string;
    caseName: string | null;
    caseNumber: string | null;
    depositionDate: string;
  };
  edits: {
    id: string;
    editType: EditType;
    originalText: string | null;
    editedText: string | null;
    position: number | null;
    createdAt: string;
    createdBy: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }[];
}
```

**UI Guarantees:**
- ✅ Lock status clearly indicated
- ✅ Edit history included
- ✅ Job context included
- ✅ All user references use camelCase

---

## 📄 Notes Contract

**Route:** `GET /api/jobs/[id]/notes`

```typescript
export interface JobNote {
  id: string;
  jobId: string;
  type: 'GENERAL' | 'PROPER_NOUN' | 'ISSUE' | 'CLARIFICATION';
  content: string;
  audioTimestamp: number | null;
  noteCategory: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
}
```

**UI Guarantees:**
- ✅ Note type is explicit enum
- ✅ Creator information included
- ✅ Timestamps are ISO strings
- ✅ Safe to render in lists

---

## 📄 Calendar Contract

**Route:** `GET /api/calendar/events`

```typescript
export interface CalendarEvent {
  id: string;
  firmId: string;
  title: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  status: CalendarEventStatus;
  eventType: EventType;
  location: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  assignedReporter: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  conflicts?: {
    eventId: string;
    title: string;
    start: string;
    end: string;
  }[];
}
```

**UI Guarantees:**
- ✅ Dates are ISO strings (ready for Date parsing)
- ✅ Conflicts included if applicable
- ✅ Reporter assignment clearly indicated
- ✅ Safe for calendar rendering

---

## 📄 Audit Contract

**Route:** `GET /api/audit`

```typescript
export interface AuditLogEntry {
  id: string;
  action: string;
  targetType: AuditTargetType;
  targetId: string;
  createdAt: string;
  actor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
  };
  firm: {
    id: string;
    name: string;
  } | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
}
```

**UI Guarantees:**
- ✅ Actor information included
- ✅ Metadata is typed object
- ✅ Safe for audit log display
- ✅ Filterable by all fields

---

## 📄 Case Contract (Attorney Portal)

**Route:** `GET /api/attorney/cases`

```typescript
export interface CaseListItem {
  id: string;
  caseNumber: string;
  caseStyle: string;
  status: CaseStatus;
  caseType: CaseType;
  courtName: string | null;
  courtType: string | null;
  state: string | null;
  createdAt: string;
  updatedAt: string;
  firm: {
    id: string;
    name: string;
  };
  attorneys: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: CaseRole;
  }[];
  jobCount: number;
  transcriptCount: number;
}
```

**UI Guarantees:**
- ✅ Attorney information included
- ✅ Counts pre-calculated
- ✅ Safe for case list display
- ✅ All dates are ISO strings

---

## 📄 File Contract

**Route:** `GET /api/jobs/[id]/files`

```typescript
export interface JobFile {
  id: string;
  jobId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  mimeType: string | null;
  storageUrl: string | null;
  storagePath: string | null;
  uploadedAt: string;
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
}
```

**UI Guarantees:**
- ✅ File size in bytes (convert for display)
- ✅ Storage URL ready for download
- ✅ Uploader information included
- ✅ Safe for file list display

---

## 📄 User Contract (Admin)

**Route:** `GET /api/admin/users`

```typescript
export interface UserListItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  firmId: string | null;
  firm: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  lastLoginAt: string | null;
  isActive: boolean;
}
```

**UI Guarantees:**
- ✅ Role is explicit enum
- ✅ Firm information included
- ✅ Last login timestamp included
- ✅ Safe for user management UI

---

## 🔄 Contract Enforcement

### In Query Modules

```typescript
// lib/supabase/queries/jobs.ts
export async function getJobById(
  supabase: SupabaseClient,
  jobId: string
): Promise<JobDetail | null> {
  // Query returns snake_case
  const { data } = await supabase.from('jobs').select('*').eq('id', jobId).single();
  
  // Map to camelCase contract
  return {
    id: data.id,
    status: data.status,
    caseId: data.case_id,
    caseName: data.case_name,
    // ... map all fields
  };
}
```

### In API Routes

```typescript
// app/api/jobs/[id]/route.ts
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  
  // Query function returns camelCase contract
  const job = await getJobById(supabase, id);
  
  // Return contract directly
  return NextResponse.json(job);
}
```

### In UI Components

```typescript
// app/(dashboard)/jobs/[id]/page.tsx
const job: JobDetail = await fetch(`/api/jobs/${id}`).then(r => r.json());

// Use camelCase properties
<div>{job.caseName}</div>
<div>{job.depositionDate}</div>
<div>{job.createdBy.firstName}</div>
```

---

## ⚠️ Contract Violations

**Never do this:**

❌ **Access snake_case in UI**
```typescript
// ❌ WRONG
<div>{job.case_id}</div>
<div>{job.created_by_id}</div>
```

❌ **Access DB fields directly**
```typescript
// ❌ WRONG
const { data } = await supabase.from('jobs').select('*');
// Use API route instead
```

❌ **Assume role filtering in UI**
```typescript
// ❌ WRONG
if (user.role === 'ADMIN' || job.createdById === user.id) {
  // UI shouldn't know about access rules
}

// ✅ CORRECT
const permissions = await fetch(`/api/jobs/${id}/permissions`).then(r => r.json());
if (permissions.canEdit) {
  // Show edit button
}
```

---

## ✅ Contract Compliance Checklist

Before committing UI changes:

- [ ] All data accessed via API routes (not direct Supabase)
- [ ] All properties use camelCase
- [ ] No snake_case properties in UI
- [ ] Types match contracts exactly
- [ ] No knowledge of table names
- [ ] No knowledge of RLS policies
- [ ] Role filtering handled by API

---

**Status:** ✅ Contracts Defined  
**Enforcement:** Via TypeScript + Code Review  
**Violations:** Will cause TypeScript errors
