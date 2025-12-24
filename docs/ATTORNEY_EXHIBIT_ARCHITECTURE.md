# Attorney Exhibit Architecture - Unified Case View

## ✅ CONFIRMED UNDERSTANDING

### Current State
- **Exhibits** belong to **Jobs** (depositions)
- Each reporter uploads exhibits only for their deposition
- Exhibits are fragmented by source

### Required State
- **Attorneys** need unified view of ALL exhibits across ALL depositions in a case
- Exhibits can be:
  - **Deposition-specific** (uploaded by reporter, tied to Job)
  - **Attorney-global** (uploaded by attorney, tied to Case)
- Attorneys can link exhibits to transcript annotations
- Reports can reference exhibits from any deposition

## 🧱 DATA MODEL CHANGES NEEDED

### Exhibit Model Extension

```prisma
model Exhibit {
  id              String   @id @default(cuid())
  
  // Dual ownership: Job (deposition) OR Case (attorney-global)
  jobId           String?  // Nullable for attorney-global exhibits
  job             Job?     @relation(fields: [jobId], references: [id], onDelete: Cascade)
  
  caseId          String?  // For attorney-global exhibits or case-level organization
  case            Case?    @relation(fields: [caseId], references: [id], onDelete: Cascade)
  
  exhibitNumber   Int      // Unique per job OR per case (if jobId is null)
  description     String
  
  originalFileUrl String
  stampedFileUrl  String?
  
  fileType        String   // PDF, IMAGE, DOCX
  mimeType        String
  fileName        String
  fileSize        Int      // bytes
  
  stamped         Boolean  @default(false)
  
  // Upload tracking
  uploadedByRole  UserRole // REPORTER, ATTORNEY, ADMIN
  createdById     String
  createdAt       DateTime @default(now())
  
  // Links to transcript annotations (for attorney use)
  linkedAnnotations TranscriptAnnotationExhibit[]
  
  @@unique([jobId, exhibitNumber]) // If jobId is not null
  @@unique([caseId, exhibitNumber]) // If caseId is not null and jobId is null
  @@index([jobId])
  @@index([caseId])
  @@index([createdById])
}
```

### Transcript Annotation Extension

```prisma
model TranscriptAnnotation {
  // ... existing fields ...
  
  // Link to exhibits (attorney can reference exhibits)
  linkedExhibits  TranscriptAnnotationExhibit[]
}

model TranscriptAnnotationExhibit {
  id              String   @id @default(cuid())
  annotationId    String
  annotation      TranscriptAnnotation @relation(fields: [annotationId], references: [id], onDelete: Cascade)
  
  exhibitId       String
  exhibit         Exhibit  @relation(fields: [exhibitId], references: [id], onDelete: Cascade)
  
  createdAt       DateTime @default(now())
  
  @@unique([annotationId, exhibitId])
  @@index([annotationId])
  @@index([exhibitId])
}
```

## 🔐 SECURITY MODEL

### Upload Permissions

| Role | Can Upload | Scope |
|------|------------|-------|
| Court Reporter | Exhibits | Only their deposition (jobId required) |
| Attorney | Exhibits | Any deposition (jobId) OR case-global (caseId, jobId null) |
| Attorney | Transcripts | Any deposition or case |
| Admin | Exhibits | Any scope |

### View Permissions

| Role | Can View | Scope |
|------|----------|-------|
| Court Reporter | Exhibits | Only their deposition's exhibits |
| Attorney | Exhibits | ALL exhibits in their cases (merged view) |
| Admin | Exhibits | All exhibits |

## 📁 ATTORNEY API ROUTES NEEDED

### Case-Level Exhibit Management

```
GET    /api/attorney/cases/[caseId]/exhibits
POST   /api/attorney/cases/[caseId]/exhibits
GET    /api/attorney/cases/[caseId]/exhibits/[exhibitId]
DELETE /api/attorney/cases/[caseId]/exhibits/[exhibitId]
```

### Unified Exhibit View

```
GET    /api/attorney/cases/[caseId]/exhibits/unified
  - Returns ALL exhibits across ALL depositions + attorney-global
  - Includes metadata: which deposition, uploaded by whom
  - Filterable by: deposition, exhibit number, uploaded by
```

### Exhibit Linking

```
POST   /api/attorney/annotations/[annotationId]/exhibits
  - Link exhibit(s) to transcript annotation
DELETE /api/attorney/annotations/[annotationId]/exhibits/[exhibitId]
  - Unlink exhibit from annotation
```

## 🎨 ATTORNEY UI COMPONENTS NEEDED

### Unified Exhibit Panel
- `/app/(attorney)/cases/[caseId]/exhibits/page.tsx`
- Shows all exhibits merged together
- Filters: Deposition, Exhibit Number, Uploaded By
- Group by deposition (collapsible sections)
- Link exhibits to transcript annotations

### Exhibit Linker Component
- Used in transcript review interface
- Sidebar showing available exhibits
- Drag/drop or click to link to annotation
- Shows linked exhibits in annotation details

### Report Enhancement
- Include exhibit references in report entries
- Format: "See Exhibit 12" or "Referenced: Exhibit 12, 15"

## 🔄 MIGRATION STRATEGY

1. **Phase 1: Schema Update**
   - Make `jobId` nullable in Exhibit model
   - Add `caseId` field
   - Add `uploadedByRole` field
   - Create `TranscriptAnnotationExhibit` junction table

2. **Phase 2: Backfill**
   - Set `caseId` for existing exhibits (derive from `job.caseId`)
   - Set `uploadedByRole` based on `createdBy.role`

3. **Phase 3: API Routes**
   - Create attorney exhibit routes
   - Update existing routes to handle nullable `jobId`

4. **Phase 4: UI**
   - Build unified exhibit panel
   - Add exhibit linking to review interface
   - Enhance reports with exhibit references

## ✅ MVP SCOPE

### IN SCOPE
- ✅ Exhibit ingestion (PDF, images)
- ✅ Unified exhibit list (merged view)
- ✅ Link exhibit → transcript annotation
- ✅ Exhibit reference in reports

### OUT OF SCOPE (Phase 2+)
- ❌ Exhibit markup/annotation
- ❌ OCR
- ❌ Bates stamping
- ❌ Trial presentation mode

## 🧠 ARCHITECTURAL FIT

This design:
- ✅ Fits cleanly into existing schema
- ✅ Maintains backward compatibility (jobId still works)
- ✅ Supports both deposition-specific and case-global exhibits
- ✅ Enables attorney unified view without refactoring
- ✅ Preserves security boundaries (reporters see only their exhibits)

