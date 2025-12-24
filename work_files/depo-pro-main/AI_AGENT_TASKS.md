# AI Agent Implementation Tasks for Depo-Pro

**You are an AI assistant implementing a legal transcription platform. Follow these phases sequentially.**

## CRITICAL INSTRUCTIONS

**Self-Healing Rules:**
- If a command fails, analyze the error and fix the code/config automatically
- Only ask the human for help when:
  - An API key or credential is required
  - An irreversible decision must be made (e.g., "delete all data?")
- Always retry after fixing an error
- Log your reasoning when making fixes

**Progress Reporting:**
- Report only at phase completion
- Use format: `✅ PHASE X completed` or `⚠️ PHASE X completed with warnings`
- If phase fails after 3 retry attempts, report: `❌ PHASE X failed: [reason]`

---

## PHASE 0: Familiarization (5 minutes)

### Task 0.1: Read Core Documentation
Read these files completely:
1. `README.md`
2. `AI_AGENT_TASKS.md` (this file)
3. `package.json`
4. `prisma/schema.prisma`
5. `src/config/env.ts`

### Task 0.2: Summarize Architecture
Create a mental model. Understand:
- This is a legal transcription system
- Pipeline: Email → FFmpeg → Deepgram → Database → Scopist → Lawyer
- Tech stack: Node + TypeScript + Prisma + BullMQ + Deepgram + FFmpeg
- Multi-tenant by `firmId`
- Background workers process transcription jobs

**Checkpoint:** You should now understand the system architecture.

---

## PHASE 1: Environment & Dependencies (15 minutes)

### Task 1.1: Verify Prerequisites

Run these checks and auto-fix if possible:
```bash
# Check Node.js version
node --version
```
**Expected:** v18.0.0 or higher  
**If failed:** Report to user - cannot auto-fix

```bash
# Check npm
npm --version
```
**Expected:** v9.0.0 or higher  
**If failed:** Report to user

```bash
# Check FFmpeg
ffmpeg -version
```
**Expected:** FFmpeg version info  
**If failed:** Report to user with installation instructions

### Task 1.2: Verify .env File Exists
```bash
# Check if .env exists
Test-Path .env  # PowerShell
# OR
ls .env         # Bash
```

**If .env missing:**
1. Copy `.env.example` to `.env`
2. Alert user: "⚠️ .env created from .env.example. Please fill in API keys."
3. DO NOT proceed until user confirms keys are set

### Task 1.3: Validate Environment Variables

Read `src/config/env.ts` and understand required variables.

Run a quick validation:
```bash
npx tsx -e "require('./src/config/env.ts')"
```

**If validation fails:**
- Check which variable is missing
- Alert user with specific variable name
- DO NOT proceed until fixed

### Task 1.4: Install Dependencies
```bash
npm install
```

**If failed:**
1. Check `package.json` syntax
2. Try: `npm install --legacy-peer-deps`
3. Try: `npm cache clean --force && npm install`
4. If still fails after 3 attempts, report to user

**Expected output:** All packages installed, no critical errors

### Task 1.5: Generate Prisma Client
```bash
npx prisma generate
```

**If failed:**
- Check `prisma/schema.prisma` syntax
- Fix any Prisma syntax errors
- Retry

**Verify:** Check `node_modules/.prisma/client` directory exists

### Task 1.6: Run Database Migrations
```bash
npx prisma migrate dev --name init
```

**If failed:**
- Check `DATABASE_URL` in `.env`
- Try: `npx prisma migrate reset` (only if this is a fresh setup)
- Verify PostgreSQL is running
- If still fails after 2 attempts, report to user

**Expected:** Database schema created, migrations applied

### Task 1.7: Seed Database
```bash
npm run db:seed
```

**If script doesn't exist yet:**
1. Check if `prisma/seed.ts` exists
2. If not, create it (see template below)
3. Add to `package.json`: `"prisma": { "seed": "tsx prisma/seed.ts" }`
4. Retry

**Expected:** Demo firm and user created

### Task 1.8: Health Check
```bash
npm run verify
```

**If script doesn't exist:**
1. Run: `npx tsx scripts/verify-install.ts`
2. If that fails, the script may have TODOs - implement them now

**Expected:** All services reachable (DB, Redis, Deepgram, Claude)

**✅ PHASE 1 COMPLETE:** Environment is ready

---

## PHASE 2: Core Implementation Review (20 minutes)

### Task 2.1: Audio Preprocessor

Open `src/lib/audio/preprocessor.ts`

**Verify it has:**
- `analyzeAudioQuality()` function
- `enhanceAudioForLegal()` function using FFmpeg
- `concatenateAudioFiles()` for multi-part depositions
- Proper error handling

**If missing or has TODOs:**
- Implement the missing functions following the patterns in README.md
- Use fluent-ffmpeg library
- Add comprehensive comments

**Test:**
```bash
# Create test script
npx tsx -e "
const { analyzeAudioQuality } = require('./src/lib/audio/preprocessor');
// Test with sample audio file if available
console.log('Audio preprocessor loaded successfully');
"
```

### Task 2.2: Deepgram Configuration

Open `src/lib/deepgram/transcription-config.ts`

**Verify it has:**
- `getOptimalDeepgramConfig()` function
- Correct Deepgram options:
  - `diarize: true`
  - `utterances: true`
  - `punctuate: true`
  - `smart_format: true`
  - `filler_words: true`
  - `profanity_filter: false`
  - `alternatives: 3`
  - Model selection logic (nova-2-general, nova-2-medical, etc.)

**If missing or incomplete:**
- Implement following the specifications in README.md
- Ensure all required options are present

### Task 2.3: Notice Parser (AI)

Open `src/lib/ai/notice-parser.ts`

**Verify it has:**
- `parseNoticeDocument()` function
- Uses `@anthropic-ai/sdk` or `pdf-parse`
- Extracts: case number, names, dates, terms
- Returns structured JSON
- `convertToDeepgramKeywords()` helper
- `saveToCustomDictionary()` function

**If missing or has TODOs:**
- Implement following the Claude API pattern
- Use `claude-sonnet-4-20250514` model
- Ensure JSON response parsing is robust

**Test:**
```bash
npx tsx -e "
const { parseNoticeDocument } = require('./src/lib/ai/notice-parser');
console.log('Notice parser loaded successfully');
"
```

### Task 2.4: Transcription Worker

Open `src/workers/transcription-worker.ts`

**This is the most critical file. Verify it:**

1. **Imports correctly:**
   - BullMQ Worker
   - Deepgram SDK
   - Audio preprocessor
   - Notice parser
   - Prisma client

2. **Worker flow:**
```
   a) Fetch Job from DB
   b) Download all JobFiles
   c) If notice PDF: parse with AI, extract terms
   d) If audio quality poor: enhance with FFmpeg
   e) Concatenate multiple audio files if needed
   f) Get firm's custom dictionary
   g) Call Deepgram with optimal config + custom keywords
   h) Store complete JSON response
   i) Extract word-level data
   j) Flag low-confidence words (<0.85 confidence)
   k) Update Job status
   l) Track progress (0-100%)
```

3. **Error handling:**
   - Try/catch blocks
   - Update Job status to FAILED on error
   - Store error message in DB
   - BullMQ retry logic configured

**If incomplete:**
- Implement the complete worker following the pipeline
- Add progress reporting: `job.updateProgress(percent)`
- Add logging for each step
- Ensure all DB updates use transactions

**Do NOT test yet** - wait for Phase 3

### Task 2.5: API Routes

Open `src/routes/jobs.ts`

**Verify endpoints exist:**
- `POST /jobs` - Create new job
- `GET /jobs` - List jobs (filtered by firmId)
- `GET /jobs/:id` - Get job details
- `POST /jobs/:id/transcribe` - Trigger transcription

Open `src/routes/webhooks.ts`

**Verify webhook exists:**
- `POST /webhooks/inbound-email` - Receive email from SendGrid

**If missing or incomplete:**
- Implement RESTful endpoints
- Add authentication middleware (can be placeholder for now)
- Ensure multi-tenant filtering (all queries must filter by firmId)
- Add input validation using Zod

### Task 2.6: Code Quality Check

Run linting and type-checking:
```bash
npm run lint
```

**If errors found:**
- Fix automatically where possible
- Focus on critical errors first
- Ignore warnings for now

```bash
npm run type-check
```

**If TypeScript errors:**
- Fix type mismatches
- Add missing type imports
- Ensure Prisma types are used correctly

**✅ PHASE 2 COMPLETE:** Core implementation reviewed and completed

---

## COMPLETION CHECKLIST

Before reporting complete, verify:

- [ ] All phases completed successfully
- [ ] No critical errors in console
- [ ] Database schema matches requirements
- [ ] Worker processes jobs without crashing
- [ ] Deepgram API calls work
- [ ] FFmpeg preprocessing works
- [ ] Notice parsing extracts data correctly
- [ ] Multi-tenant isolation enforced
- [ ] Tests pass consistently
- [ ] Code is properly typed (TypeScript)
- [ ] Environment variables documented
- [ ] README is accurate

## FINAL REPORT TO USER
```
✅ IMPLEMENTATION COMPLETE

All phases finished successfully.

Your Depo-Pro system is ready with:
- Email-to-transcription pipeline
- FFmpeg audio enhancement
- Deepgram AI transcription
- Notice parsing with Claude
- Background job processing
- Multi-tenant database

To use:
1. npm run dev        (API server)
2. npm run worker     (background jobs)
3. Send test email or use API directly

Next: Implement web UI for scopists and court reporters.
```

---

## TROUBLESHOOTING GUIDE

### Common Issues & Solutions

**"Cannot find module '@prisma/client'"**
→ Run: `npx prisma generate`

**"Redis connection refused"**
→ Start Redis: `redis-server` or `brew services start redis`

**"FFmpeg not found"**
→ Install FFmpeg for your OS (see README)

**"Deepgram API rate limit"**
→ Wait 60 seconds, or reduce worker concurrency

**"TypeScript errors"**
→ Run: `npm run type-check` and fix reported errors

**"Worker not picking up jobs"**
→ Check Redis connection, verify queue name matches

**"Claude API timeout"**
→ Retry, or increase timeout in notice parser

---

**END OF AI AGENT TASKS**

You have now successfully implemented the Depo-Pro legal transcription platform. Report completion to the user.
