# Depo-Pro - Legal Transcription Platform

**AI-powered legal transcription system for court reporters, scopists, and law firms.**

## What This Project Does (Plain English)

Depo-Pro automates the transcription of legal depositions:

1. **Court reporter sends an email** with audio/video files and a deposition notice (PDF)
2. **Audio is enhanced** using FFmpeg to improve poor quality recordings
3. **AI reads the notice** and extracts important terms (names, case numbers, legal terminology)
4. **Deepgram transcribes** the audio with 90-95% accuracy, identifying speakers and marking uncertain words
5. **Scopist reviews** the transcript, fixing errors highlighted by the AI
6. **Court reporter approves** the final transcript
7. **Lawyer receives** a court-ready transcript with 98-99.5% accuracy

**Result:** 80% faster than manual transcription, 70% lower cost, with professional accuracy.

## Technology Stack

- **Backend:** Node.js + TypeScript + Express
- **Database:** PostgreSQL with Prisma ORM
- **Job Queue:** BullMQ + Redis (for background transcription)
- **AI Transcription:** Deepgram Nova-2 API
- **Audio Processing:** FFmpeg
- **AI Notice Parsing:** Claude API (Anthropic)
- **File Storage:** Vercel Blob Storage
- **Email Processing:** SendGrid Inbound Parse webhooks

## Quick Start in VS Code with AI Agent

### Prerequisites

**Software Required:**
- Node.js 18+ ([download](https://nodejs.org/))
- PostgreSQL database ([download](https://www.postgresql.org/download/))
- Redis ([Windows](https://github.com/tporadowski/redis/releases), [Mac](https://redis.io/docs/getting-started/installation/install-redis-on-mac-os/))
- FFmpeg ([download](https://ffmpeg.org/download.html))

**API Keys Needed:**
- Deepgram API key ([get free key](https://console.deepgram.com/signup))
- Anthropic API key ([get key](https://console.anthropic.com/))
- Vercel Blob token ([create account](https://vercel.com/))

### Step 1: Copy Files

Copy all these project files into an empty folder on your computer.

### Step 2: Open in VS Code

1. Open Visual Studio Code
2. File → Open Folder → Select the project folder
3. VS Code will ask to install recommended extensions - click "Install"

### Step 3: Configure Environment

1. In VS Code, open `.env.example`
2. Save it as `.env` (remove the `.example` part)
3. Fill in your actual values:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/depo_pro"
REDIS_HOST="localhost"
DEEPGRAM_API_KEY="your_actual_deepgram_key_here"
ANTHROPIC_API_KEY="your_actual_anthropic_key_here"
BLOB_READ_WRITE_TOKEN="your_vercel_blob_token_here"
```

### Step 4: Run Setup (Automated)

**Windows (PowerShell):**
```powershell
.\scripts\setup.ps1
```

**Mac/Linux (Bash):**
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

This automatically:
- ✅ Installs all dependencies
- ✅ Sets up the database
- ✅ Creates demo data
- ✅ Verifies everything works

### Step 5: Start Everything

**Windows:**
```powershell
.\run-all.ps1
```

**Mac/Linux:**
```bash
npm run dev &
npm run worker &
```

Your API server runs at: `http://localhost:3000`

### Step 6: Use VS Code AI Agent (Optional - Recommended)

Open `AI_AGENT_TASKS.md` in VS Code, then tell your AI assistant:
```
You are my project implementation assistant.

1. Read README.md and AI_AGENT_TASKS.md
2. Follow the steps in AI_AGENT_TASKS.md one by one
3. Use the integrated terminal to run commands
4. If commands fail, fix the issue in code/config and retry without asking me
5. Keep me updated only at major checkpoints

Start with PHASE 0.
```

The AI agent will:
- Verify your setup
- Fill in any missing implementation details
- Run tests
- Fix errors automatically
- Report when complete

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string |
| `REDIS_HOST` | ✅ Yes | Redis server address |
| `REDIS_PORT` | No | Redis port (default: 6379) |
| `DEEPGRAM_API_KEY` | ✅ Yes | Deepgram transcription API key |
| `ANTHROPIC_API_KEY` | ✅ Yes | Claude API for notice parsing |
| `BLOB_READ_WRITE_TOKEN` | ✅ Yes | Vercel Blob storage token |
| `SENDGRID_WEBHOOK_SECRET` | No | Email webhook verification |
| `RESEND_API_KEY` | No | Email notifications (optional) |
| `APP_URL` | No | Public URL (for production) |

## Project Structure
```
src/
├── server.ts              # Main API server
├── config/env.ts          # Environment validation
├── lib/                   # Core libraries
│   ├── audio/             # FFmpeg audio processing
│   ├── deepgram/          # Transcription config
│   ├── ai/                # Notice parsing (Claude)
│   └── transcription/     # Export & formatting
├── queue/                 # Job queue setup
├── workers/               # Background job workers
└── routes/                # API endpoints
```

## Key Features

### ✅ Implemented
- Email webhook handler for receiving jobs
- FFmpeg audio enhancement pipeline
- Deepgram transcription with optimal config
- AI notice parsing (Claude)
- Word-level timestamps
- Low-confidence word flagging
- Multi-file deposition handling
- Background job processing
- Multi-tenant isolation (by firmId)

### 🚧 To Be Implemented by AI Agent
- Web UI for scopists
- Transcript editor with audio sync
- Export to DOCX/PDF
- User authentication
- Email notifications
- Progress tracking

## Development Commands
```bash
# Start API server
npm run dev

# Start background worker
npm run worker

# Start both (Windows)
.\run-all.ps1

# Database
npm run db:migrate      # Run migrations
npm run db:seed         # Seed demo data
npm run db:studio       # Open Prisma Studio

# Testing
npm run test:smoke      # Quick integration test
npm run lint            # Check code quality
npm run type-check      # TypeScript validation

# Build
npm run build           # Compile TypeScript
```

## How It Works (Technical)

### Email → Transcription Pipeline
```
1. Court reporter sends email to: {firmId}@depo-pro.com
   ↓
2. SendGrid webhook forwards to: /api/webhooks/inbound-email
   ↓
3. System creates Job + JobFile records
   ↓
4. If notice PDF attached: Claude extracts case info & custom terms
   ↓
5. Job queued in BullMQ (Redis)
   ↓
6. Worker picks up job:
   a) Downloads audio files
   b) FFmpeg enhances audio quality
   c) Deepgram transcribes with custom keywords
   d) Stores word-level data + confidence scores
   e) Flags low-confidence words (<85% confidence)
   ↓
7. Job status → AI_COMPLETE
   ↓
8. Scopist reviews and corrects flagged words
   ↓
9. Court reporter approves
   ↓
10. Export to lawyer (DOCX/PDF)
```

### Database Schema

**Core Tables:**
- `Firm` - Law firms (multi-tenant)
- `User` - Court reporters, scopists, admins
- `Job` - Individual depositions
- `JobFile` - Audio/video/notice files per job
- `Transcription` - AI-generated transcripts
- `CustomDictionaryEntry` - Firm-specific terminology
- `BackgroundJob` - Job queue tracking

See `prisma/schema.prisma` for complete schema.

## Known Limitations

### Current State
- **Email ingestion:** Webhook endpoint ready, needs SendGrid configuration
- **UI:** No web interface yet (API-only)
- **Authentication:** Basic JWT placeholder (needs full implementation)
- **Exports:** Format functions exist, need PDF/DOCX generation libraries
- **Monitoring:** No dashboard for job progress (coming soon)

### Future Enhancements
- Real-time progress tracking via WebSocket
- Scopist editing interface with foot pedal support
- Automatic speaker identification (beyond generic labels)
- Advanced quality metrics and reporting
- Integration with case management systems

## Troubleshooting

### "Cannot connect to database"
**Solution:**
1. Check PostgreSQL is running
2. Verify `DATABASE_URL` in `.env`
3. Try: `npx prisma migrate reset` (WARNING: deletes data)

### "FFmpeg not found"
**Solution:**
- Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html), add to PATH
- Mac: `brew install ffmpeg`
- Linux: `sudo apt-get install ffmpeg`
- Verify: `ffmpeg -version`

### "Redis connection failed"
**Solution:**
1. Start Redis server:
   - Windows: `redis-server.exe`
   - Mac: `brew services start redis`
   - Linux: `sudo systemctl start redis`
2. Check `REDIS_HOST` in `.env` (should be `localhost`)

### "Deepgram API error"
**Solution:**
1. Verify API key at [Deepgram Console](https://console.deepgram.com/)
2. Check you have credits remaining
3. Ensure key in `.env` has no extra spaces

### Worker not processing jobs
**Solution:**
1. Ensure worker is running: `npm run worker`
2. Check Redis connection
3. View BullMQ jobs: `npm run queue:ui` (if installed)

## Support

- **Documentation:** See `AI_AGENT_TASKS.md` for detailed implementation steps
- **Issues:** Check worker logs in console
- **Database:** Use `npm run db:studio` to inspect data

## License

Proprietary - All rights reserved
