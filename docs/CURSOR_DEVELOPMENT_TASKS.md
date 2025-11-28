# DEPO-PRO MVP - Cursor Development Tasks

> **Comprehensive step-by-step guide for completing the Depo-Pro MVP using Cursor AI**

---

## 📋 Project Overview

**Depo-Pro** is an AI-powered legal transcription SaaS platform targeting court reporting agencies and law firms.

| Attribute | Value |
|-----------|-------|
| **Tech Stack** | Next.js 15, Supabase (PostgreSQL), Deepgram (AI Transcription), Prisma ORM, BullMQ/Redis |
| **Core Feature** | Reporter-Scopist workflow with low-confidence word review |
| **Target** | 5-10 paid beta customers in 16 weeks |

---

## 📊 Current Repository State

### ✅ Completed
- Authentication system (NextAuth v5 with credentials)
- User roles: ADMIN, COURT_REPORTER, SCOPIST
- Job CRUD operations and status management
- File upload infrastructure (local + cloud-ready)
- Prisma schema with comprehensive data models
- Basic UI components (jobs list, detail pages)
- Scopist assignment system
- Dictionary management (job-specific terms)

### 🔄 Partially Implemented (needs completion)
- Deepgram transcription integration (85% - has TODOs)
- Background job worker (structure exists, needs implementation)
- Transcript editor/viewer components (basic versions exist)

### ❌ Not Yet Implemented
- **Low-confidence word review feature (CORE DIFFERENTIATOR)**
- Audio playback with transcript sync
- Real-time transcription status updates
- Document export (DOCX/PDF) with legal formatting

---

## 🚀 SPRINT 1: Fix Compilation & Core Infrastructure (Week 1-2)

**Goal:** Get the application compiling without errors and establish working infrastructure

### 1.1 TypeScript Compilation Fixes

| # | Priority | Task | Instructions |
|---|----------|------|--------------|
| 1.1.1 | 🔴 HIGH | Fix Import Path Errors | Run `npm run typecheck` and fix all import errors. Ensure `@/` alias paths resolve correctly. Check `tsconfig.json` paths configuration. |
| 1.1.2 | 🔴 HIGH | Fix Prisma Type Mismatches | In `lib/workers/transcription-worker.ts`, fix undefined variables: `noticeFileUrl`, `firmId`. Check job data structure matches `TranscriptionJobData` type. |
| 1.1.3 | 🔴 HIGH | Fix API Route Type Errors | Review `app/api/transcripts/[id]/route.ts` - fix field mapping between Prisma schema and API responses. Fields like `rawText`, `formattedText` need to map to `fullTranscript`. |
| 1.1.4 | 🟡 MEDIUM | Fix Component Type Errors | Check `components/jobs/*.tsx` for type errors. Ensure props match expected types from Prisma models. |
| 1.1.5 | 🟡 MEDIUM | Run Full Type Check | Execute `npm run typecheck` - target ZERO errors before proceeding. |

#### Cursor Prompt for 1.1:
```
Run 'npm run typecheck' and fix ALL TypeScript errors in order of appearance. For each error:
1) Show the file and line number
2) Explain the issue
3) Apply the fix
Continue until zero errors.
```

### 1.2 Database & Environment Setup

| # | Priority | Task | Instructions |
|---|----------|------|--------------|
| 1.2.1 | 🔴 HIGH | Verify Prisma Schema | Run `npx prisma validate` to ensure schema is valid. Check all relations are properly defined. |
| 1.2.2 | 🔴 HIGH | Generate Prisma Client | Run `npx prisma generate` after any schema changes. Verify `node_modules/.prisma/client` exists. |
| 1.2.3 | 🔴 HIGH | Database Migration | Run `npx prisma migrate dev --name sync` to sync database with schema. Check for migration errors. |
| 1.2.4 | 🟡 MEDIUM | Seed Database | Run `npm run db:seed` to create test data. Verify users, firms, and sample jobs exist. |
| 1.2.5 | 🟡 MEDIUM | Environment Variables | Copy `.env.example` to `.env`. Fill in: `DATABASE_URL`, `NEXTAUTH_SECRET`, `DEEPGRAM_API_KEY` (get from console.deepgram.com). |

### 1.3 Authentication Verification

| # | Priority | Task | Instructions |
|---|----------|------|--------------|
| 1.3.1 | 🔴 HIGH | Test Login Flow | Start dev server, navigate to `/login`, test credentials auth. Check session is created properly. |
| 1.3.2 | 🔴 HIGH | Test Registration | Navigate to `/register`, create new user. Verify user appears in database with hashed password. |
| 1.3.3 | 🟡 MEDIUM | Test Role-Based Access | Login as SCOPIST - verify cannot access admin pages. Login as COURT_REPORTER - verify can create jobs. |
| 1.3.4 | 🟡 MEDIUM | Fix Auth Middleware | Check `middleware.ts` - ensure protected routes redirect to login. Verify role checks work properly. |

---

## 🚀 SPRINT 2: Complete Deepgram Integration (Week 3-4)

**Goal:** Fully functional audio transcription with Deepgram API

### 2.1 Deepgram Service Implementation

| # | Priority | Task | Instructions |
|---|----------|------|--------------|
| 2.1.1 | 🔴 HIGH | Install Deepgram SDK | Verify `@deepgram/sdk` is installed. Check `lib/deepgram/index.ts` exports properly. |
| 2.1.2 | 🔴 HIGH | Create Deepgram Client | In `lib/transcription.ts`, create actual Deepgram client: `const deepgram = createClient(process.env.DEEPGRAM_API_KEY)` |
| 2.1.3 | 🔴 HIGH | Configure Transcription Options | In `lib/transcription/config.ts`, set optimal options: `diarize: true, utterances: true, punctuate: true, smart_format: true, model: 'nova-2'` |
| 2.1.4 | 🔴 HIGH | Implement transcribeAudio() | Replace mock with: `await deepgram.listen.prerecorded.transcribeFile(audioBuffer, options)`. Return full Deepgram response. |
| 2.1.5 | 🟡 MEDIUM | Handle API Errors | Add try/catch with specific Deepgram error handling. Implement retry logic for rate limits. |

#### Cursor Prompt for 2.1:
```
In lib/transcription.ts, replace the mock transcribeAudio function with actual Deepgram API integration. 
Use @deepgram/sdk. Configure for: diarize=true, utterances=true, punctuate=true, smart_format=true, model='nova-2'. 
Return the full Deepgram response including word-level timestamps and confidence scores.
```

### 2.2 Transcription Worker Implementation

| # | Priority | Task | Instructions |
|---|----------|------|--------------|
| 2.2.1 | 🔴 HIGH | Fix Worker Variables | In `lib/workers/transcription-worker.ts`, fix undefined vars. Get `firmId` and `audioFileUrl` from `job.data` properly. |
| 2.2.2 | 🔴 HIGH | Download Audio File | Use storage service to download audio: `const audioBuffer = await downloadFile(audioFileUrl)` |
| 2.2.3 | 🔴 HIGH | Call Deepgram API | Implement actual transcription: `const result = await transcribeAudio(audioBuffer, config)` |
| 2.2.4 | 🔴 HIGH | Store Transcription Result | Create/update Transcription record with: `deepgramRawJson`, `fullTranscript`, `words` (with timestamps), confidence scores. |
| 2.2.5 | 🔴 HIGH | Extract Low-Confidence Words | Parse words array, flag any word with confidence < 0.85. Store in `flaggedSegments` JSON field. |
| 2.2.6 | 🟡 MEDIUM | Update Job Status | Update job status through pipeline: PENDING → PROCESSING → AI_COMPLETE. Handle FAILED state on errors. |

#### Cursor Prompt for 2.2:
```
Fix lib/workers/transcription-worker.ts:
1) Get audioFileUrl and firmId from job.data correctly
2) Download audio using storage service
3) Call actual Deepgram API via transcribeAudio()
4) Store result in Transcription model (update existing or create new)
5) Extract words with confidence < 0.85 into flaggedSegments
6) Update job status through PENDING→PROCESSING→AI_COMPLETE
```

### 2.3 API Routes for Transcription

| # | Priority | Task | Instructions |
|---|----------|------|--------------|
| 2.3.1 | 🔴 HIGH | Fix POST /api/jobs/[id]/transcribe | Implement route to trigger transcription. Validate audio file exists, enqueue job to worker. |
| 2.3.2 | 🔴 HIGH | Fix GET /api/transcripts/[id] | Return full transcript with word-level data. Include `flaggedSegments` for review UI. |
| 2.3.3 | 🟡 MEDIUM | Fix GET /api/transcripts/[id]/status | Return transcription progress (0-100%), status, and any error messages. |
| 2.3.4 | 🟡 MEDIUM | Add Webhook Handler | In `app/api/webhooks/deepgram/route.ts`, handle async transcription callbacks if using callback URL. |

---

## 🚀 SPRINT 3: Low-Confidence Word Review UI (Week 5-7)

**Goal:** Build the core differentiating feature - efficient review of uncertain transcription segments

### 3.1 Audio Player Component

| # | Priority | Task | Instructions |
|---|----------|------|--------------|
| 3.1.1 | 🔴 HIGH | Create AudioPlayer Component | Create `components/transcripts/audio-player.tsx`. Use HTML5 audio element with custom controls. |
| 3.1.2 | 🔴 HIGH | Add Playback Controls | Implement play/pause, seek, playback speed (0.5x, 1x, 1.5x, 2x). Display current time and duration. |
| 3.1.3 | 🔴 HIGH | Add Time Sync Props | Accept `onTimeUpdate` callback, `currentTime` prop for external control. Enable jumping to specific timestamps. |
| 3.1.4 | 🟡 MEDIUM | Style Audio Player | Professional appearance with dark theme. Show loading state while audio loads. |

#### Cursor Prompt for 3.1:
```
Create components/transcripts/audio-player.tsx with:
- HTML5 audio element with custom styled controls
- Play/pause, seek bar, current time/duration display
- Playback speed selector (0.5x, 1x, 1.5x, 2x)
- Props: src (audio URL), onTimeUpdate (callback), currentTime (for external control)
- seekTo(seconds) method exposed via ref
- Loading and error states
```

### 3.2 Low-Confidence Word Review Component

| # | Priority | Task | Instructions |
|---|----------|------|--------------|
| 3.2.1 | 🔴 HIGH | Create LowConfidenceReview Component | Create `components/transcripts/low-confidence-review.tsx`. Accept transcript with `flaggedSegments`. |
| 3.2.2 | 🔴 HIGH | Display Flagged Words List | Show list of low-confidence words with: word text, confidence %, context (surrounding words), timestamp. |
| 3.2.3 | 🔴 HIGH | Click-to-Play Feature | When user clicks flagged word, jump audio to that timestamp (start - 2 seconds for context). |
| 3.2.4 | 🔴 HIGH | Edit Word Inline | Allow scopist to edit word directly. Show alternatives from Deepgram if available. |
| 3.2.5 | 🔴 HIGH | Mark as Reviewed | Checkbox to mark word as reviewed/corrected. Track in `TranscriptionEdit` model. |
| 3.2.6 | 🟡 MEDIUM | Filter & Sort Options | Sort by confidence (lowest first), by timestamp, filter by reviewed/pending. |
| 3.2.7 | 🟡 MEDIUM | Keyboard Navigation | Arrow keys to navigate words, Space to play audio, Enter to confirm edit. |

#### Cursor Prompt for 3.2:
```
Create components/transcripts/low-confidence-review.tsx that:
1) Displays list of words with confidence < 0.85 from transcript.flaggedSegments
2) Shows word text, confidence %, and surrounding context
3) Has click-to-play that triggers onSeekAudio(timestamp) callback
4) Allows inline editing of words
5) Has checkbox to mark as reviewed
Include proper TypeScript types.
```

### 3.3 Scopist Review Page

| # | Priority | Task | Instructions |
|---|----------|------|--------------|
| 3.3.1 | 🔴 HIGH | Create Review Page | Create `app/(dashboard)/jobs/[id]/review/page.tsx`. Layout: audio player top, transcript left, flagged words right. |
| 3.3.2 | 🔴 HIGH | Load Transcript Data | Fetch job with transcription, files (audio), include flaggedSegments. |
| 3.3.3 | 🔴 HIGH | Sync Audio with Transcript | Highlight current word in transcript as audio plays. Click word to seek audio. |
| 3.3.4 | 🔴 HIGH | Save Edits API | Create PATCH `/api/transcripts/[id]/words` endpoint. Save word corrections to TranscriptionEdit. |
| 3.3.5 | 🟡 MEDIUM | Progress Indicator | Show X of Y flagged words reviewed. Calculate completion percentage. |
| 3.3.6 | 🟡 MEDIUM | Submit for Final Review | Button to mark scopist review complete. Update job status to SCOPIST_COMPLETE. |

#### Cursor Prompt for 3.3:
```
Create app/(dashboard)/jobs/[id]/review/page.tsx with layout:
- AudioPlayer at top
- Transcript text on left (scrollable)
- LowConfidenceReview panel on right
Sync audio playback with transcript highlight. When user clicks word in review panel, 
seek audio to timestamp-2sec. Fetch job with transcription data on load. Include loading and error states.
```

---

## 🚀 SPRINT 4: Document Export & Delivery (Week 8-10)

**Goal:** Generate professional legal transcripts in DOCX/PDF formats

### 4.1 Export Service Implementation

| # | Priority | Task | Instructions |
|---|----------|------|--------------|
| 4.1.1 | 🔴 HIGH | Implement DOCX Export | In `lib/export.ts`, use 'docx' package. Create document with: title page, appearance page, transcript body with line numbers. |
| 4.1.2 | 🔴 HIGH | Legal Formatting | 25 lines per page, line numbers every 5 lines, Q/A format, speaker labels, timestamps optional. |
| 4.1.3 | 🔴 HIGH | Include Case Info Header | Add case name, case number, deponent name, date, court reporter name on each page. |
| 4.1.4 | 🟡 MEDIUM | Implement PDF Export | Use pdfkit or docx-to-pdf conversion. Match DOCX formatting exactly. |
| 4.1.5 | 🟡 MEDIUM | ASCII Export | Plain text with legal formatting for legacy systems. |

#### Cursor Prompt for 4.1:
```
In lib/export.ts, implement exportToDOCX() that creates a legal transcript document using the 'docx' package. Include:
1) Title page with case info
2) Appearance page placeholder
3) Transcript body with 25 lines per page
4) Line numbers on left margin
5) Q/A formatting with speaker labels
6) Page numbers in footer
Return Buffer for download.
```

### 4.2 Export API & UI

| # | Priority | Task | Instructions |
|---|----------|------|--------------|
| 4.2.1 | 🔴 HIGH | Fix Export Endpoint | In `app/api/transcripts/[id]/export/route.ts`, generate actual documents (not mock). |
| 4.2.2 | 🔴 HIGH | Add Export Options UI | In transcript viewer, add export button dropdown: DOCX, PDF, ASCII. Show format descriptions. |
| 4.2.3 | 🟡 MEDIUM | Configure Export Options | Allow user to set: include timestamps, include speaker labels, line numbering style. |
| 4.2.4 | 🟡 MEDIUM | Download Handling | Return proper Content-Disposition header. Generate meaningful filename: `CaseName_Date_Transcript.docx` |

---

## 🚀 SPRINT 5: Reporter Dashboard & Job Management (Week 11-12)

**Goal:** Complete court reporter workflow for creating and managing jobs

### 5.1 Reporter Dashboard

| # | Priority | Task | Instructions |
|---|----------|------|--------------|
| 5.1.1 | 🔴 HIGH | Enhance Reporter Page | In `app/(dashboard)/reporter/page.tsx`, add: job statistics, recent jobs, quick actions. |
| 5.1.2 | 🔴 HIGH | Job Statistics Cards | Show: total jobs, pending transcription, with scopist, completed this month. |
| 5.1.3 | 🟡 MEDIUM | Recent Activity Feed | Show latest job updates: new uploads, transcription complete, scopist assigned. |
| 5.1.4 | 🟡 MEDIUM | Quick Upload Button | Prominent 'New Job' button that opens job creation flow. |

### 5.2 Job Creation Flow

| # | Priority | Task | Instructions |
|---|----------|------|--------------|
| 5.2.1 | 🔴 HIGH | Enhance Job Form | In `components/jobs/job-form.tsx`, add validation. Required fields: case name, deposition date. |
| 5.2.2 | 🔴 HIGH | File Upload in Form | Integrate FileUpload component into job creation. Allow multiple audio files. |
| 5.2.3 | 🔴 HIGH | Auto-Start Transcription | After job creation with audio, automatically queue for transcription. |
| 5.2.4 | 🟡 MEDIUM | Scopist Assignment UI | In job detail, add 'Assign to Scopist' dropdown. Show available scopists in firm. |
| 5.2.5 | 🟡 MEDIUM | Notification on Assignment | When scopist assigned, trigger email notification via `lib/email.ts`. |

### 5.3 Scopist Dashboard

| # | Priority | Task | Instructions |
|---|----------|------|--------------|
| 5.3.1 | 🔴 HIGH | Enhance Scopist Page | In `app/(dashboard)/scopist/page.tsx`, show assigned jobs queue. |
| 5.3.2 | 🔴 HIGH | Job Queue List | Display jobs assigned to scopist with: status, deadline, flagged word count. |
| 5.3.3 | 🔴 HIGH | Start Review Action | Button to open low-confidence review page for each job. |
| 5.3.4 | 🟡 MEDIUM | Completion Tracking | Show progress: X% of flagged words reviewed per job. |

---

## 🚀 SPRINT 6: Polish & Beta Launch (Week 13-16)

**Goal:** Production-ready application for beta testers

### 6.1 Error Handling & Logging

| # | Priority | Task | Instructions |
|---|----------|------|--------------|
| 6.1.1 | 🔴 HIGH | Global Error Boundary | Enhance `app/error.tsx` with user-friendly error messages. Log errors to console/service. |
| 6.1.2 | 🔴 HIGH | API Error Responses | Standardize error format: `{ error: string, code: string, details?: any }`. Use consistent HTTP status codes. |
| 6.1.3 | 🟡 MEDIUM | Winston Logger | Configure `lib/logger/index.ts` for production. Log to files and optionally to external service. |
| 6.1.4 | 🟡 MEDIUM | Toast Notifications | Use sonner for user feedback. Show success/error toasts on actions. |

### 6.2 UI/UX Polish

| # | Priority | Task | Instructions |
|---|----------|------|--------------|
| 6.2.1 | 🟡 MEDIUM | Loading States | Add loading spinners/skeletons to all data-fetching components. |
| 6.2.2 | 🟡 MEDIUM | Empty States | Design empty states for: no jobs, no transcripts, no assignments. |
| 6.2.3 | 🟡 MEDIUM | Mobile Responsiveness | Test and fix layout on tablet/mobile. Priority: dashboard, job list. |
| 6.2.4 | 🟢 LOW | Dark Mode | Optional: Add dark mode toggle using Tailwind `dark:` classes. |

### 6.3 Deployment

| # | Priority | Task | Instructions |
|---|----------|------|--------------|
| 6.3.1 | 🔴 HIGH | Vercel Deployment | Follow `VERCEL_DEPLOYMENT.md`. Set all environment variables in Vercel dashboard. |
| 6.3.2 | 🔴 HIGH | Database Migration | Run `prisma migrate deploy` on production database. |
| 6.3.3 | 🔴 HIGH | Redis Setup | Use Upstash Redis for background jobs. Set `REDIS_URL` in environment. |
| 6.3.4 | 🟡 MEDIUM | Domain Setup | Configure custom domain. Set `NEXTAUTH_URL` to production URL. |
| 6.3.5 | 🟡 MEDIUM | Monitoring | Set up basic monitoring: Vercel Analytics, error tracking. |

---

## 📁 Key File Reference

### Core Configuration
- `prisma/schema.prisma` - Database models and relations
- `lib/auth-options.ts` - NextAuth configuration
- `middleware.ts` - Route protection
- `.env.example` - Environment variable template

### Transcription System
- `lib/deepgram/index.ts` - Deepgram queue setup
- `lib/transcription.ts` - Main transcription service
- `lib/transcription/config.ts` - Deepgram configuration options
- `lib/workers/transcription-worker.ts` - Background job processor

### API Routes
- `app/api/jobs/route.ts` - Job CRUD
- `app/api/jobs/[id]/transcribe/route.ts` - Trigger transcription
- `app/api/transcripts/[id]/route.ts` - Get/update transcript
- `app/api/transcripts/[id]/export/route.ts` - Document export

### UI Components
- `components/transcripts/transcript-editor.tsx` - Rich text editor
- `components/transcripts/transcript-viewer.tsx` - Read-only viewer
- `components/jobs/file-upload.tsx` - File upload component
- `components/jobs/assignment-management.tsx` - Scopist assignment

---

## ✅ Testing Checklist

### Authentication
- [ ] Can register new user with email/password
- [ ] Can login with credentials
- [ ] Protected routes redirect to login
- [ ] Role-based access works (admin vs reporter vs scopist)

### Job Management
- [ ] Can create new job with case info
- [ ] Can upload audio files to job
- [ ] Can view job list (filtered by role)
- [ ] Can view job details
- [ ] Can edit job information
- [ ] Can assign scopist to job

### Transcription
- [ ] Can trigger transcription on job with audio
- [ ] Transcription completes successfully
- [ ] Can view transcript text
- [ ] Low-confidence words are flagged
- [ ] Word timestamps match audio

### Review Workflow
- [ ] Audio player loads and plays
- [ ] Clicking flagged word seeks audio
- [ ] Can edit flagged words inline
- [ ] Can mark words as reviewed
- [ ] Edits persist after refresh

### Export
- [ ] Can export to DOCX
- [ ] DOCX has proper legal formatting
- [ ] Can export to PDF
- [ ] Export includes case information

---

## 🤖 Quick Cursor Commands

Copy these into Cursor for quick task execution:

**Fix all TypeScript errors:**
```
Run npm run typecheck and fix every error. Show file, line, explanation, and fix for each.
```

**Generate Prisma client:**
```
Run npx prisma generate and verify the client was created successfully.
```

**Start dev server and test:**
```
Run npm run dev and open http://localhost:3000 in browser. Report any errors.
```

**Create component with proper structure:**
```
Create a React component in components/[name].tsx with TypeScript types, proper imports, and JSDoc comments.
```

---

*Generated for Depo-Pro MVP Development - Target: 16 weeks to beta launch*
