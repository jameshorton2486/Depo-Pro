# Depo-Pro Project State
**Last Updated:** December 19, 2025  
**Status:** MVP In Progress - Repository Stabilized

## Current State

### ✅ Completed
- Repository cleanup (Phases 0-1)
- Core authentication system
- Job management workflow
- Transcription pipeline (Deepgram integration)
- Low-confidence word review feature
- Role-based access control (Reporter, Scopist, Admin)
- Database schema (Prisma + PostgreSQL)

### 🚧 In Progress
- TypeScript error resolution
- Documentation consolidation
- API route optimization

### 📋 Planned
- Audio waveform player integration
- Enhanced confidence-based review UI
- DOCX export pipeline refinement
- Module architecture refactoring

## Architecture Overview

### Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js v5
- **Transcription:** Deepgram Nova-2
- **Queue:** BullMQ + Redis
- **Storage:** Supabase Storage
- **Email:** Resend
- **UI:** React 19, Tailwind CSS, Radix UI

### Current Structure
```
app/              # Next.js routes
lib/              # Shared libraries
components/       # React components
types/            # TypeScript types
prisma/           # Database schema
```

### Key Modules

**Authentication (`lib/auth-options.ts`, `app/(auth)/`)**
- Email/password authentication
- Role-based sessions
- Protected routes

**Transcription (`lib/transcription.ts`, `lib/workers/`)**
- Deepgram integration
- Background job processing
- Confidence scoring
- Word-level flagging

**Review (`app/(dashboard)/jobs/[id]/review/`)**
- Low-confidence word review
- Audio-synchronized editing
- Progress tracking

**Export (`lib/export.ts`)**
- DOCX generation
- PDF support (planned)

## Database Schema

**Core Models:**
- `User` - Multi-tenant users (Reporter, Scopist, Admin)
- `Firm` - Law firm tenants
- `Job` - Deposition jobs
- `JobFile` - Audio/video/notice files
- `Transcription` - AI-generated transcripts
- `JobAssignment` - Scopist assignments
- `CustomDictionaryEntry` - Firm-specific terms

## API Routes

### Active Routes
- `/api/auth/*` - Authentication
- `/api/jobs/*` - Job management
- `/api/assignments/*` - Assignment management
- `/api/transcripts/*` - Transcript operations
- `/api/files/*` - File operations
- `/api/webhooks/deepgram` - Deepgram webhooks

### Routes to Verify
- `/api/transcribe/start` - Legacy?
- `/api/transcribe/status/[jobId]` - Legacy?
- `/api/queue` - Still used?

## Known Issues

### TypeScript Errors
- Multiple files have type errors (see `CLEANUP_REPORT.md`)
- These are pre-existing and don't block runtime
- Should be fixed incrementally

### Architecture
- Module boundaries not strictly enforced
- Some cross-module coupling exists
- Refactoring planned post-MVP

## Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL connection
- `NEXTAUTH_SECRET` - Auth secret
- `NEXTAUTH_URL` - App URL
- `DEEPGRAM_API_KEY` - Deepgram API key
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anon key
- `RESEND_API_KEY` - Email service key

**Optional:**
- `REDIS_URL` - Redis connection (for BullMQ)
- `UPLOADS_DIR` - Local upload directory

## Development Workflow

### Setup
```bash
npm install
cp .env.example .env
# Edit .env with your values
npm run db:push
npm run db:seed
npm run dev
```

### Common Commands
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run typecheck    # TypeScript check
npm run db:studio    # Open Prisma Studio
```

## Feature Readiness

### ✅ Ready to Build
- **Audio Waveform Player**
  - `wavesurfer.js` installed
  - Audio playback infrastructure exists
  - Integration point: `components/transcripts/`

- **Confidence-Based Review**
  - Core feature implemented
  - UI exists in `app/(dashboard)/jobs/[id]/review/`
  - Can be enhanced incrementally

- **DOCX Export**
  - `docx` package installed
  - `lib/export.ts` has basic implementation
  - Can be refined and extended

### 🚧 Needs Work Before Features
- Resolve critical TypeScript errors
- Consolidate documentation
- Verify API route usage

## Next Steps

1. **Immediate:**
   - Fix TypeScript errors blocking commits
   - Consolidate environment templates
   - Remove disabled files

2. **Short-term:**
   - Enhance audio player integration
   - Refine review UI/UX
   - Improve export formatting

3. **Long-term:**
   - Modular architecture refactoring
   - Comprehensive testing
   - Performance optimization

## Resources

- **Cleanup Report:** `CLEANUP_REPORT.md`
- **Architecture Docs:** `docs/`
- **API Inventory:** `docs/API_ROUTE_INVENTORY.md`
- **Component Inventory:** `docs/COMPONENT_INVENTORY.md`

