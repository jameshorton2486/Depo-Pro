# Master Cursor Prompt: Attorney Transcript Review & Exhibit System

## 🎯 PRODUCT CONTEXT

You are working on **Depo-Review (Attorney Edition)** - a separate product from Depo-Pro (court reporter/scopist workflows).

**Product Separation:**
- **Depo-Pro:** `/app/(dashboard)/*` - Reporter/scopist transcription workflows
- **Depo-Review:** `/app/(attorney)/*` - Attorney trial preparation & analysis

**Architectural Isolation:** These products share infrastructure but are completely separate in routing, UI, and business logic.

---

## 📋 AUTHORITATIVE DATA MODEL

### Exhibit Model

```prisma
model Exhibit {
  id              String   @id @default(cuid())
  caseId          String   // Required - all exhibits belong to a case
  jobId           String?  // Optional - deposition-specific (nullable for attorney-global)
  exhibitLabel    String   // e.g., "Exhibit 12" or "Exhibit A"
  exhibitNumber   Int?     // Numeric value for sorting
  description     String
  originalFileUrl String
  stampedFileUrl  String?
  fileType        String   // PDF, IMAGE, DOCX
  mimeType        String
  fileName        String
  fileSize        Int
  stamped         Boolean  @default(false)
  uploadedByRole  UserRole // REPORTER, ATTORNEY, ADMIN
  createdById     String
  createdAt       DateTime @default(now())
}
```

### Transcript Annotation ↔ Exhibit Link

```prisma
model TranscriptAnnotationExhibit {
  id           String   @id @default(cuid())
  annotationId String   // Links to TranscriptAnnotation
  exhibitId    String   // Links to Exhibit
  createdById  String
  createdAt    DateTime @default(now())
  @@unique([annotationId, exhibitId])
}
```

---

## 🔐 PERMISSION MATRIX (AUTHORITATIVE)

| Role | Upload | View | Link |
|------|--------|------|------|
| Court Reporter | Own deposition | Own deposition | ❌ |
| Attorney | Any | All | ✅ |

**Enforcement:**
- **Server-side only** - Never trust UI for permissions
- Court reporters: Filter by `jobId` AND `createdById`
- Attorneys: Filter by `caseId` (unified view across all depositions)
- Linking: Only attorneys can create `TranscriptAnnotationExhibit` records

---

## 🏗️ EXISTING IMPLEMENTATION

### Completed Features

**✅ PROMPT 0-11: Attorney App Foundation**
- Attorney routing (`/app/(attorney)/*`)
- Dashboard with summary cards
- Transcript list and viewer
- Issue coding system (Perjury, Contradiction, Admission, Hearsay)
- Issues overview page
- Report generation (Impeachment, Contradictions, Admissions)
- Persistence layer (PostgreSQL)

**✅ PROMPT 12-17: Exhibit System**
- Domain types (`types/exhibits.ts`)
- Database schema (Exhibit model with case/deposition support)
- Upload APIs (`/api/attorney/exhibits/*`)
- Unified exhibit dashboard (`/app/(attorney)/exhibits`)
- Exhibit linking to transcript annotations
- Report integration (exhibits included in DOCX exports)

### API Routes

**Attorney Exhibits:**
- `GET /api/attorney/exhibits?caseId=...&depositionId=...` - List exhibits (unified view)
- `POST /api/attorney/exhibits` - Upload exhibit (attorney/admin only)
- `GET /api/attorney/exhibits/[id]` - Get single exhibit
- `DELETE /api/attorney/exhibits/[id]` - Delete exhibit (only if uploaded by attorney)

**Exhibit Linking:**
- `POST /api/attorney/annotations/[id]/exhibits` - Link exhibits to annotation
- `DELETE /api/attorney/annotations/[id]/exhibits/[exhibitId]` - Unlink exhibit

**Reporter Exhibits (Depo-Pro):**
- `GET /api/jobs/[id]/exhibits` - List exhibits for deposition (reporter-scoped)
- `POST /api/jobs/[id]/exhibits` - Upload exhibit (reporter-scoped)

---

## 🚫 PHASE 2 FEATURES (NOT IN SCOPE)

**Explicitly Phase 2:**
- Deposition designations
- Objections & counter-designations
- Exhibit callouts
- Clean jury view
- Side-by-side transcript + exhibit
- Impeachment playback mode (Page:Line driven)
- Live courtroom tools
- Video sync
- Jury display control
- Bates stamping
- Objection rulings

**Do NOT implement these in MVP.** Add TODO comments only.

---

## ✅ DEVELOPMENT RULES

### 1. Architectural Isolation

- **Never** mix attorney routes with reporter routes
- **Never** share UI components between products (unless explicitly designed for both)
- **Always** use `/app/(attorney)/*` for attorney features
- **Always** use `/api/attorney/*` for attorney APIs

### 2. Permission Enforcement

- **Always** enforce permissions server-side (API routes)
- **Never** rely on UI-only permission checks
- **Always** verify `caseId` ownership for attorney operations
- **Always** verify `jobId` ownership for reporter operations

### 3. Data Model Rules

- **Exhibits:** Must have `caseId` (required), `jobId` (optional)
- **Court Reporter Uploads:** Must include `jobId` (deposition-specific)
- **Attorney Uploads:** Can omit `jobId` (case-global) or include it (deposition-specific)
- **Linking:** Only attorneys can link exhibits to annotations

### 4. UI/UX Rules

- **Transcripts:** Always read-only (no text editing)
- **Exhibits:** Read-only after upload (no editing)
- **Annotations:** Can be created, updated, deleted by attorneys
- **Reports:** Always include exhibit references when linked

### 5. Code Quality

- **TypeScript:** Strict typing, no `any` types
- **Error Handling:** Always handle errors gracefully
- **Loading States:** Always show loading indicators
- **Empty States:** Always handle empty data gracefully

---

## 📝 COMMON TASKS

### Adding a New Attorney Feature

1. **Route:** Create in `/app/(attorney)/[feature]/page.tsx`
2. **API:** Create in `/api/attorney/[feature]/route.ts`
3. **Types:** Add to `types/attorney-*.ts` or `types/exhibits.ts`
4. **Permissions:** Enforce in API route (ATTORNEY or ADMIN only)
5. **Navigation:** Add to `components/layouts/attorney-navbar.tsx`

### Adding Exhibit Functionality

1. **Verify:** Does it require case-level or deposition-level access?
2. **API:** Use `/api/attorney/exhibits/*` for attorney operations
3. **Permissions:** Check `uploadedByRole` and `caseId` ownership
4. **UI:** Use unified exhibit view (all exhibits in case)

### Linking Exhibits to Annotations

1. **API:** Use `/api/attorney/annotations/[id]/exhibits`
2. **UI:** Use `ExhibitLinker` component
3. **Display:** Show linked exhibits in annotation cards
4. **Reports:** Include exhibit references automatically

---

## 🔍 DEBUGGING CHECKLIST

When something doesn't work:

1. **Permissions:** Check API route enforces role-based access
2. **Case Ownership:** Verify attorney has access to case
3. **Data Model:** Check `caseId` and `jobId` are set correctly
4. **Relations:** Verify Prisma relations are correct
5. **Type Safety:** Check TypeScript types match Prisma schema

---

## 📚 REFERENCE FILES

**Types:**
- `types/attorney-transcript.ts` - Transcript data model
- `types/issue-code.ts` - Issue coding system
- `types/exhibits.ts` - Exhibit domain types

**Components:**
- `components/attorney/transcript-viewer.tsx` - Read-only transcript display
- `components/attorney/issue-code-palette.tsx` - Issue code selection
- `components/attorney/exhibit-linker.tsx` - Exhibit linking UI

**API Routes:**
- `app/api/attorney/transcripts/*` - Transcript operations
- `app/api/attorney/annotations/*` - Annotation operations
- `app/api/attorney/exhibits/*` - Exhibit operations
- `app/api/attorney/reports/*` - Report generation

**Pages:**
- `app/(attorney)/dashboard/page.tsx` - Attorney dashboard
- `app/(attorney)/transcripts/*` - Transcript management
- `app/(attorney)/exhibits/page.tsx` - Unified exhibit view
- `app/(attorney)/issues/page.tsx` - Issues overview
- `app/(attorney)/reports/page.tsx` - Report generation

---

## 🎯 WHEN TO USE THIS PROMPT

Use this prompt when:
- Adding new attorney features
- Modifying exhibit functionality
- Fixing permission issues
- Extending report generation
- Adding new issue codes
- Integrating exhibits with other features

**Always reference this prompt** to maintain consistency with the authoritative model and architectural isolation.

---

## ✅ VERIFICATION CHECKLIST

Before considering a feature complete:

- [ ] Permissions enforced server-side
- [ ] TypeScript types match Prisma schema
- [ ] UI handles loading/empty/error states
- [ ] Exhibits correctly linked to case (and optionally deposition)
- [ ] Attorney can see all exhibits in case (unified view)
- [ ] Reporter can only see own deposition's exhibits
- [ ] Reports include exhibit references when linked
- [ ] No Phase 2 features implemented (only TODOs)
- [ ] Architectural isolation maintained (no mixing with Depo-Pro)

---

**Last Updated:** After Prompts 12-17 completion
**Status:** MVP Complete, Phase 2 Ready

