# EXP-01: PDF Export with Legal Formatting

## Scope Lock
- **Only create/modify files listed below**
- Do NOT modify `lib/services/export.ts` (FROZEN)
- Do NOT modify `src/lib/transcription/legal-formatter.ts` (FROZEN)
- Do NOT modify any existing route files
- Do NOT create branches — commit directly to main
- Do NOT install libreoffice-convert (not available on Vercel serverless)

## Approved Dependency
```bash
npm install pdfkit @types/pdfkit
```
This is the ONLY new dependency allowed.

## Step 0: Discover existing export routes
```powershell
Get-ChildItem -Path "app" -Recurse -Filter "route.ts" | Select-String "pdf|PDF|export" | Select-Object -ExpandProperty Path
```
Also check:
```powershell
Get-Content -LiteralPath "src/lib/transcription/legal-formatter.ts" -TotalCount 50
```
Read the legal formatter to understand the formatting rules you must replicate.

## Files to Create

### File 1: `lib/services/legal-pdf-export.ts`
New file — legal-grade PDF generation service.

**Read `src/lib/transcription/legal-formatter.ts` first** and replicate these exact rules:
- Font: Courier New (monospace), 12pt
- Page: US Letter (8.5 x 11 inches)
- Margins: 1 inch all sides
- Lines per page: 25
- Line numbering: left margin, right-aligned in gutter
- Speaker labels: bold, on their own line
- Q/A format: "Q." and "A." labels for examination sections

**Implementation:**
```typescript
import PDFDocument from 'pdfkit';

export async function exportLegalPdf(transcriptId: string): Promise<Buffer> {
  // 1. Create Supabase server client
  // 2. Fetch transcription with job data (same query pattern as DOCX export)
  // 3. Fetch flagged word corrections and merge them into transcript text
  // 4. Build PDF with legal formatting rules
  // 5. Return Buffer
}
```

**Critical: Include corrections in PDF output.**
Query flagged_words where status = 'CORRECTED' and merge edited_text into the transcript,
same as the DOCX export does.

### File 2: `app/api/export/pdf/route.ts`
New file — API route for PDF download.

```typescript
// GET /api/export/pdf?transcriptId=<uuid>
// Protected: requireAuth + role check
// Returns: application/pdf with Content-Disposition header
```

Use `withRouteProtection` wrapper (same pattern as all other routes):
```typescript
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import { UserRole } from '@/lib/enums/roles';

const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.REPORTER, UserRole.SCOPIST];

const GETHandler = async (request: NextRequest, context: ProtectedContext) => {
  const transcriptId = new URL(request.url).searchParams.get('transcriptId');
  if (!transcriptId) {
    return NextResponse.json({ error: 'transcriptId required' }, { status: 400 });
  }
  
  const pdfBuffer = await exportLegalPdf(transcriptId);
  
  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="transcript-${transcriptId}.pdf"`,
    },
  });
};

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: ALLOWED_ROLES },
  GETHandler
);
```

## Validation
```bash
npm run typecheck    # Zero errors
npm run build        # Zero errors
```

Verify:
- `lib/services/legal-pdf-export.ts` exists
- `app/api/export/pdf/route.ts` exists
- No other files modified
- No files in FROZEN layer touched

## Commit
```bash
git add lib/services/legal-pdf-export.ts app/api/export/pdf/route.ts package.json package-lock.json
git commit -m "exp-01: add legal PDF export with pdfkit (Courier New, 25 lines/page, line numbers)"
git push origin main
```

## STOP after commit. Do not proceed to any other task.
