# DEPO-PRO MVP: Cursor AI Mega-Prompts

> **Version:** 2.0 (Updated January 2026)  
> **Status:** ~95% MVP Complete  
> **Goal:** Beta launch with 5-10 paying customers

---

## 🚀 QUICK START

Copy the prompts below directly into Cursor Chat with `@Codebase` enabled.

---

## SPRINT 1: Testing & QA Prompts

### Prompt 1.1: End-to-End Test Suite

```
Create a comprehensive Playwright end-to-end test suite for Depo-Pro. Structure tests in tests/e2e/ folder.

CRITICAL USER FLOWS TO TEST:

1. Authentication Flow (tests/e2e/auth.spec.ts):
   - Login with valid Supabase credentials → verify redirect to dashboard
   - Login with invalid credentials → verify error message shown
   - Registration with new email → verify user created in Supabase
   - Password reset flow → verify email sent and reset works
   - Session expiry → verify graceful redirect to login
   - Role-based access → SCOPIST cannot access /admin routes

2. Job Creation Flow (tests/e2e/jobs.spec.ts):
   - Create new job with case info → verify appears in job list
   - Upload audio file (use test fixture) → verify stored in Supabase Storage
   - View job details → verify all fields displayed
   - Edit job → verify changes persist
   - Assign scopist to job → verify assignment saved

3. Transcription Flow (tests/e2e/transcription.spec.ts):
   - Trigger transcription on job → verify status changes to PROCESSING
   - Monitor status updates → verify AI_COMPLETE reached
   - View transcript → verify text displayed with confidence scores
   - Check flagged words → verify words with confidence < 0.85 flagged

4. Review Flow (tests/e2e/review.spec.ts):
   - Load review page → verify audio player and flagged words panel load
   - Click flagged word → verify audio seeks to timestamp - 2 seconds
   - Edit word inline → verify edit saved to database
   - Mark word reviewed → verify checkbox state persists
   - Complete review → verify job status updates

5. Export Flow (tests/e2e/export.spec.ts):
   - Export to DOCX → verify download triggers, file valid
   - Export to PDF → verify download triggers, file valid
   - Export to ASCII → verify download triggers, file valid

SETUP REQUIREMENTS:
- Create test fixtures in tests/fixtures/ for auth tokens and test audio
- Use Playwright's test.beforeEach for authentication setup
- Add proper assertions for success/failure states
- Include timeout handling for async operations (transcription can take 30s+)

Run: npx playwright test --reporter=html
```

### Prompt 1.2: Authentication Testing Script

```
Create a manual testing script for Supabase authentication in scripts/test-auth.ts.

TEST CASES:
1. Sign up new user with email/password
2. Sign in with valid credentials
3. Sign in with invalid credentials (should fail gracefully)
4. Get current session
5. Refresh session token
6. Sign out
7. Password reset request
8. Role verification (check user_metadata.role)

For each test:
- Log the operation being tested
- Show success/failure with relevant data
- Handle errors gracefully
- Output timing information

Use the Supabase client from lib/supabase/ (not creating a new client).

Add to package.json: "test:auth": "tsx scripts/test-auth.ts"

Expected output format:
✓ Sign up: user created (id: xxx, email: xxx)
✓ Sign in: session created (expires: xxx)
✗ Invalid sign in: correctly rejected
✓ Session refresh: new token issued
...
```

### Prompt 1.3: Deepgram Integration Test

```
Create a test script for Deepgram Nova-3 integration in scripts/test-deepgram.ts.

TEST CASES:
1. Transcribe short audio sample (use a 10-second test file)
2. Verify legal vocabulary recognition (test with terms like "deposition", "plaintiff", "defendant")
3. Check word-level confidence scores returned
4. Verify timestamps are accurate (within 0.5s tolerance)
5. Test error handling (invalid audio, network failure simulation)
6. Test with different audio formats (MP3, WAV, M4A)

REQUIREMENTS:
- Use the existing Deepgram client from lib/deepgram/
- Include the legal vocabulary configuration (304+ terms)
- Output confidence distribution (how many words < 0.85, 0.85-0.95, > 0.95)
- Verify diarize, utterances, punctuate, smart_format options work

Create a test audio fixture in tests/fixtures/test-audio.mp3 (or document how to create one).

Add to package.json: "test:deepgram": "tsx scripts/test-deepgram.ts"
```

---

## SPRINT 2: UI/UX Polish Prompts

### Prompt 2.1: Loading Skeletons

```
Add professional loading skeleton states to all data-fetching components in Depo-Pro.

COMPONENTS TO UPDATE:

1. components/jobs/job-list.tsx
   - Create JobListSkeleton with 5 rows
   - Each row: checkbox skeleton, title skeleton, status badge skeleton, date skeleton
   - Use shadcn/ui Skeleton component

2. components/dashboard/stats-cards.tsx (or create if doesn't exist)
   - Create StatsCardSkeleton
   - Show 4 skeleton cards in grid layout
   - Each card: icon area, number skeleton, label skeleton

3. app/(dashboard)/jobs/[id]/page.tsx
   - Create JobDetailSkeleton
   - Sections: header skeleton, audio player skeleton, transcript area skeleton

4. components/transcripts/transcript-viewer.tsx
   - Create TranscriptSkeleton
   - Show paragraph blocks of varying width
   - Include audio player skeleton

5. components/transcripts/low-confidence-review.tsx
   - Create FlaggedWordsSkeleton
   - Show list items with word, confidence %, timestamp skeletons

IMPLEMENTATION:
- Each skeleton should match the exact layout of the loaded component
- Use subtle pulse animation (animate-pulse)
- Skeleton colors should use Tailwind's gray-200/gray-300
- Add isLoading prop to parent components or use React Suspense

Create a shared components/ui/skeletons.tsx file for reusable skeleton primitives.
```

### Prompt 2.2: Empty States

```
Create visually appealing empty state components for Depo-Pro.

CREATE THESE COMPONENTS in components/ui/empty-states/:

1. EmptyJobList.tsx
   - Icon: Lucide "FileAudio" or "FolderOpen"
   - Title: "No jobs yet"
   - Description: "Create your first job to start transcribing depositions"
   - CTA Button: "Create New Job" → links to /jobs/new

2. EmptyTranscripts.tsx
   - Icon: Lucide "FileText"
   - Title: "No transcripts available"
   - Description: "Transcripts will appear here once audio is processed"
   - CTA Button: "Upload Audio" → opens upload modal

3. EmptyAssignments.tsx (for scopist view)
   - Icon: Lucide "ClipboardList"
   - Title: "No assignments"
   - Description: "You'll see jobs here when a reporter assigns work to you"
   - No CTA (passive state)

4. EmptySearch.tsx
   - Icon: Lucide "SearchX"
   - Title: "No results found"
   - Description: "Try adjusting your search or filters"
   - CTA Button: "Clear filters"

DESIGN REQUIREMENTS:
- Center content vertically and horizontally
- Icon: 48x48px, text-gray-400
- Title: text-lg font-semibold text-gray-900
- Description: text-sm text-gray-500, max-w-md
- CTA: Primary button style matching app theme
- Add subtle illustration or background pattern (optional)

Export all from components/ui/empty-states/index.ts
```

### Prompt 2.3: Toast Notifications

```
Implement consistent toast notifications throughout Depo-Pro using sonner.

SETUP:
1. Verify sonner is installed (npm install sonner if not)
2. Add Toaster component to app/layout.tsx (root layout)
3. Configure theme to match Depo-Pro styling

IMPLEMENT TOASTS FOR:

Success Toasts (toast.success):
- "Job created successfully" - after POST /api/jobs
- "Audio uploaded" - after file upload completes
- "Transcription started" - after triggering transcription
- "Word updated" - after editing flagged word
- "Review completed" - after marking all words reviewed
- "Transcript exported" - after download starts

Error Toasts (toast.error):
- "Failed to create job" - API error on job creation
- "Upload failed" - file upload error
- "Transcription failed" - Deepgram error
- "Failed to save changes" - any PATCH/PUT error
- "Export failed" - export generation error

Loading Toasts (toast.loading → toast.success/error):
- Transcription in progress (show progress %)
- Large file upload (show upload %)
- Export generation

IMPLEMENTATION:
- Create lib/toast.ts with helper functions: showSuccess, showError, showLoading
- Use promise-based toasts where appropriate: toast.promise()
- Add undo action for destructive operations (delete job)
- Position: bottom-right
- Duration: 4000ms for success, 6000ms for errors
```

### Prompt 2.4: Dashboard Statistics

```
Create a comprehensive statistics dashboard for court reporters.

CREATE: components/dashboard/reporter-stats.tsx

STATS TO DISPLAY (4 cards in grid):
1. Total Jobs
   - Query: count all jobs for current user/firm
   - Icon: Lucide "Briefcase"
   - Show trend vs last month (↑ +5 or ↓ -2)

2. Pending Transcription
   - Query: jobs with status IN ('PENDING', 'PROCESSING')
   - Icon: Lucide "Clock"
   - Color: amber if > 5 pending

3. With Scopist
   - Query: jobs with status = 'AI_COMPLETE' AND scopistId IS NOT NULL
   - Icon: Lucide "Users"

4. Completed This Month
   - Query: jobs with status = 'COMPLETED' AND updatedAt >= startOfMonth
   - Icon: Lucide "CheckCircle"
   - Color: green

API ENDPOINT: Create GET /api/dashboard/stats route that returns:
{
  totalJobs: number,
  pendingTranscription: number,
  withScopist: number,
  completedThisMonth: number,
  trends: {
    totalJobs: number,  // change from last month
    completedThisMonth: number
  }
}

UI REQUIREMENTS:
- Responsive grid: 1 col mobile, 2 cols tablet, 4 cols desktop
- Loading skeleton while fetching
- Error state with retry button
- Use shadcn/ui Card component
- Subtle hover effect on cards
```

### Prompt 2.5: Recent Activity Feed

```
Add a recent activity feed to the reporter dashboard.

CREATE: components/dashboard/activity-feed.tsx

ACTIVITY TYPES TO TRACK:
- JOB_CREATED: "New job created: {caseName}"
- AUDIO_UPLOADED: "Audio uploaded to {caseName}"
- TRANSCRIPTION_STARTED: "Transcription started for {caseName}"
- TRANSCRIPTION_COMPLETE: "AI transcription complete for {caseName}"
- SCOPIST_ASSIGNED: "{scopistName} assigned to {caseName}"
- REVIEW_COMPLETE: "Review completed for {caseName}"
- EXPORT_DOWNLOADED: "Transcript exported for {caseName}"

API ENDPOINT: Create GET /api/dashboard/activity route
- Query recent Job changes with timestamp
- Include related user info (for scopist assignments)
- Limit to 10 most recent
- Filter by current user's firm

UI:
- Vertical timeline layout
- Each item: icon (based on type), description, relative time ("2 hours ago")
- Click item to navigate to job detail
- "View all" link at bottom

Use Lucide icons for each activity type.
Loading state: 5 skeleton items.
Empty state: "No recent activity"
```

---

## SPRINT 3: Documentation Prompts

### Prompt 3.1: Quick Start Guide

```
Create comprehensive user documentation in docs/user-guide/ folder.

CREATE: docs/user-guide/quick-start.md

CONTENT:
# Depo-Pro Quick Start Guide

## Welcome
Brief intro to Depo-Pro and what it does.

## Account Setup
1. How to log in
2. First-time profile setup
3. Understanding your dashboard

## Your First Transcription
Step-by-step with screenshots:
1. Click "New Job"
2. Enter case details (case name, deponent, date)
3. Upload audio file (supported formats: MP3, WAV, M4A)
4. Click "Start Transcription"
5. Wait for AI processing (typically 1-2 minutes per hour of audio)
6. Review low-confidence words
7. Export your transcript

## Key Features
- Low-confidence word review (the killer feature)
- Audio sync and playback
- Multiple export formats
- Scopist collaboration

## Getting Help
- FAQ link
- Support email
- Keyboard shortcuts reference

Also create:
- docs/user-guide/court-reporter-guide.md
- docs/user-guide/scopist-guide.md
- docs/user-guide/keyboard-shortcuts.md

Format all docs with proper Markdown, include placeholders for screenshots [Screenshot: xxx].
```

### Prompt 3.2: API Documentation

```
Generate OpenAPI/Swagger documentation for Depo-Pro API.

CREATE: docs/api/openapi.yaml

DOCUMENT THESE ENDPOINTS:

Authentication:
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/reset-password

Jobs:
- GET /api/jobs (list, with pagination and filters)
- POST /api/jobs (create)
- GET /api/jobs/{id}
- PATCH /api/jobs/{id}
- DELETE /api/jobs/{id}
- POST /api/jobs/{id}/transcribe (trigger transcription)
- POST /api/jobs/{id}/assign (assign scopist)

Transcripts:
- GET /api/transcripts/{id}
- PATCH /api/transcripts/{id}/words (edit words)
- GET /api/transcripts/{id}/export?format=docx|pdf|txt

Files:
- POST /api/files/upload
- GET /api/files/{id}

FOR EACH ENDPOINT INCLUDE:
- HTTP method and path
- Description
- Request body schema (if applicable)
- Response schema with examples
- Authentication requirements
- Error responses (400, 401, 403, 404, 500)

Also create docs/api/README.md with:
- API overview
- Authentication flow (Supabase JWT)
- Rate limiting info
- Common error codes
```

---

## SPRINT 4: Operational Readiness Prompts

### Prompt 4.1: Error Tracking Setup

```
Set up comprehensive error tracking for Depo-Pro.

OPTION A: Sentry (Recommended)
1. Install: npm install @sentry/nextjs
2. Run: npx @sentry/wizard@latest -i nextjs
3. Configure sentry.client.config.ts and sentry.server.config.ts
4. Add to next.config.js with proper source map handling
5. Create lib/monitoring/sentry.ts for custom error reporting

OPTION B: Vercel's built-in (if Sentry too complex)
1. Enable Error Tracking in Vercel dashboard
2. Add @vercel/otel for tracing

IMPLEMENT:
- Capture unhandled exceptions automatically
- Add manual error reporting for caught errors
- Include user context (user ID, role, firm ID) with errors
- Set up error boundaries in React components
- Configure source maps for readable stack traces

Create error-boundary.tsx component:
- Catch React rendering errors
- Show user-friendly error message
- Report to tracking service
- Offer retry/refresh option

Add to these locations:
- app/error.tsx (global error boundary)
- app/(dashboard)/error.tsx (dashboard-specific)
- API routes (try/catch with reporting)
```

### Prompt 4.2: Security Audit Script

```
Create a security audit script for pre-launch verification.

CREATE: scripts/security-audit.ts

CHECKS TO PERFORM:

1. Environment Variables:
   - Verify no secrets in client-side code (search for NEXT_PUBLIC_ containing sensitive data)
   - Verify .env.local not committed to git
   - Check all required env vars are set

2. API Security:
   - All /api routes require authentication (except auth routes)
   - Role-based access enforced (e.g., /api/admin/* requires ADMIN role)
   - No SQL injection vulnerabilities (using Prisma = safe)
   - Rate limiting configured

3. Supabase Security:
   - Row Level Security (RLS) enabled on all tables
   - Verify policies restrict access appropriately
   - Service role key not exposed to client

4. Headers:
   - CSP (Content Security Policy) configured
   - X-Frame-Options set
   - X-Content-Type-Options: nosniff

5. Dependencies:
   - Run npm audit
   - Check for known vulnerabilities
   - Verify no outdated packages with critical CVEs

6. File Uploads:
   - Allowed file types restricted
   - File size limits enforced
   - Files stored securely (Supabase Storage with proper policies)

OUTPUT:
✓ PASS or ✗ FAIL for each check
Summary with critical issues highlighted
Recommendations for any failures

Add to package.json: "audit:security": "tsx scripts/security-audit.ts"
```

### Prompt 4.3: Beta Launch Checklist Generator

```
Create an interactive beta launch checklist script.

CREATE: scripts/beta-launch-checklist.ts

GENERATE CHECKLIST:

## Pre-Launch (Complete Before Day 1)
[ ] All E2E tests passing
[ ] Security audit passing (zero critical issues)
[ ] Error tracking configured and verified
[ ] Monitoring dashboards set up
[ ] Backup strategy verified (Supabase PITR enabled)
[ ] Documentation complete and reviewed
[ ] Support email configured (support@depo-pro.com)
[ ] Terms of Service and Privacy Policy published
[ ] SSL certificate valid
[ ] Domain DNS configured

## Customer Setup (Per Customer)
[ ] Create user account in Supabase
[ ] Set appropriate role (COURT_REPORTER or AGENCY)
[ ] Create firm/organization record
[ ] Send welcome email with login credentials
[ ] Schedule onboarding call (optional)
[ ] Create sample job with test transcription

## Day 1 Monitoring
[ ] Watch error tracking for new issues
[ ] Monitor transcription success rate
[ ] Check database performance
[ ] Review customer feedback
[ ] Address any blocking issues immediately

The script should:
- Save progress to a JSON file
- Allow marking items complete
- Show completion percentage
- Send reminder for incomplete critical items
- Generate PDF report of checklist status

Usage: npx tsx scripts/beta-launch-checklist.ts [check|report|reset]
```

---

## CODE CLEANUP PROMPTS

### Prompt C.1: File Naming Consistency

```
Fix file naming inconsistencies in the Depo-Pro codebase.

CHANGES NEEDED:

1. hooks/useTranscriptSync.ts → hooks/use-transcript-sync.ts
   - Update the filename
   - Update all imports across the codebase
   - Use search: grep -r "useTranscriptSync" --include="*.ts" --include="*.tsx" src/

VERIFICATION:
- Run TypeScript compiler: npm run typecheck
- Run build: npm run build
- Ensure no import errors

This is the only naming inconsistency identified. All other hook files already follow kebab-case convention.
```

### Prompt C.2: Remove Debug Statements

```
Search and remove all debug console.log statements from production code.

SEARCH PATTERN:
grep -rn "console.log" --include="*.ts" --include="*.tsx" src/ app/ components/ lib/

KEEP:
- console.error for actual error handling
- console.warn for deprecation warnings
- Logs inside scripts/ folder (development tools)
- Logs wrapped in if (process.env.NODE_ENV === 'development')

REMOVE:
- Debugging console.log statements
- Temporary testing logs
- Data inspection logs

REPLACE WITH:
- Proper error tracking (Sentry/monitoring)
- Structured logging (lib/logger if exists)
- Remove entirely if not needed

Count and report:
- Total console.log found: X
- Removed: Y
- Kept (with reason): Z
```

---

## 🎯 EXECUTION ORDER

Follow this sequence for maximum efficiency:

### Week 1-2: Testing & QA
1. Run Prompt 1.1 (E2E Tests)
2. Run Prompt 1.2 (Auth Testing)
3. Run Prompt 1.3 (Deepgram Testing)
4. Execute all tests, fix any failures

### Week 3-4: UI/UX Polish
5. Run Prompt 2.1 (Loading Skeletons)
6. Run Prompt 2.2 (Empty States)
7. Run Prompt 2.3 (Toast Notifications)
8. Run Prompt 2.4 (Dashboard Statistics)
9. Run Prompt 2.5 (Activity Feed)

### Week 5-6: Documentation
10. Run Prompt 3.1 (User Guides)
11. Run Prompt 3.2 (API Documentation)

### Week 7-8: Operational Readiness
12. Run Prompt 4.1 (Error Tracking)
13. Run Prompt 4.2 (Security Audit)
14. Run Prompt 4.3 (Launch Checklist)
15. Run Code Cleanup Prompts (C.1, C.2)

### Launch Day
16. Execute beta launch checklist
17. Onboard first customers
18. Monitor and iterate

---

## 📋 TESTING CHECKLIST

Copy to your issue tracker or print:

### Authentication
- [ ] Can register new user with email/password
- [ ] Can login with Supabase credentials
- [ ] Protected routes redirect to login
- [ ] Role-based access works (admin vs reporter vs scopist)
- [ ] Password reset flow works end-to-end

### Job Management
- [ ] Can create new job with case info
- [ ] Can upload audio files to job (MP3, WAV, M4A)
- [ ] Can view job list (filtered by role)
- [ ] Can view job details
- [ ] Can edit job information
- [ ] Can assign scopist to job

### Transcription (Deepgram Nova-3)
- [ ] Can trigger transcription on job with audio
- [ ] Transcription completes successfully
- [ ] Legal vocabulary (304+ terms) recognized correctly
- [ ] Can view transcript text
- [ ] Low-confidence words (<0.85) are flagged
- [ ] Word timestamps match audio playback

### Review Workflow
- [ ] Audio player loads and plays
- [ ] Clicking flagged word seeks audio to timestamp
- [ ] Can edit flagged words inline
- [ ] Can mark words as reviewed
- [ ] Edits persist after page refresh
- [ ] Keyboard shortcuts work (arrows, space, enter)

### Export
- [ ] Can export to DOCX
- [ ] DOCX has proper legal formatting (25 lines/page, line numbers)
- [ ] Can export to PDF
- [ ] Can export to ASCII/TXT
- [ ] Export includes case information in header

### Security
- [ ] No secrets exposed in client code
- [ ] API routes properly authenticated
- [ ] Row-level security policies active in Supabase
- [ ] Audit logging capturing user actions

---

*Generated: January 2026 | Depo-Pro MVP v2.0*
