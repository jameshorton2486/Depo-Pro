# Depo-Pro Project Setup Guide

## ✅ What Has Been Created

I've created a complete project scaffold for your Depo-Pro legal transcription platform. Here's what's included:

### 📁 Project Structure
```
depo-pro/
├── README.md                          # Complete project documentation
├── AI_AGENT_TASKS.md                  # Step-by-step AI implementation guide
├── package.json                       # All dependencies configured
├── tsconfig.json                      # TypeScript configuration
├── .env.example                       # Environment variable template
├── .gitignore                         # Git ignore rules
├── .eslintrc.json                     # Code linting rules
│
├── prisma/
│   ├── schema.prisma                  # Complete database schema
│   └── seed.ts                        # Demo data seeder
│
├── scripts/
│   ├── setup.ps1                      # Windows setup script
│   ├── setup.sh                       # Linux/Mac setup script
│   ├── run-all.ps1                    # Start all services (Windows)
│   └── verify-install.ts              # System health check
│
├── src/
│   ├── server.ts                      # Express API server
│   ├── config/
│   │   └── env.ts                     # Environment validation
│   ├── lib/
│   │   ├── prisma.ts                  # Database client
│   │   ├── redis.ts                   # Redis connection
│   │   ├── audio/
│   │   │   └── preprocessor.ts        # FFmpeg audio processing (stub)
│   │   ├── deepgram/
│   │   │   └── transcription-config.ts # Deepgram settings (stub)
│   │   ├── ai/
│   │   │   └── notice-parser.ts       # Claude AI parser (stub)
│   │   └── transcription/
│   │       └── quality-checker.ts     # Quality analysis (stub)
│   ├── queue/
│   │   └── index.ts                   # BullMQ job queue
│   ├── workers/
│   │   └── transcription-worker.ts    # Background worker (stub)
│   ├── routes/
│   │   ├── jobs.ts                    # API endpoints (stub)
│   │   └── webhooks.ts                # Email webhooks (stub)
│   └── types/
│       └── index.ts                   # TypeScript definitions
│
└── tests/
    └── smoke.test.ts                  # Basic system test
```

## 🎯 What You Need to Do Next

### Step 1: Copy Files to VS Code

1. Download all files from the `/mnt/user-data/outputs/depo-pro/` folder
2. Create a new empty folder on your computer called `depo-pro`
3. Copy all the files and folders into that directory
4. Open the folder in VS Code: **File → Open Folder**

### Step 2: Install Prerequisites

**Before running setup, make sure you have:**

- ✅ **Node.js 18+** ([download](https://nodejs.org/))
- ✅ **PostgreSQL** ([download](https://www.postgresql.org/download/))
- ✅ **Redis** 
  - Windows: [Redis for Windows](https://github.com/tporadowski/redis/releases)
  - Mac: `brew install redis`
  - Linux: `sudo apt-get install redis-server`
- ✅ **FFmpeg** ([download](https://ffmpeg.org/download.html))

**And get your API keys:**
- ✅ **Deepgram API Key** ([sign up](https://console.deepgram.com/signup))
- ✅ **Anthropic API Key** ([get key](https://console.anthropic.com/))
- ✅ **Vercel Blob Token** ([create account](https://vercel.com/))

### Step 3: Configure Environment

1. Copy `.env.example` to `.env`
2. Fill in your API keys and database URL in `.env`

```env
DATABASE_URL="postgresql://username:password@localhost:5432/depo_pro"
REDIS_HOST="localhost"
DEEPGRAM_API_KEY="your_key_here"
ANTHROPIC_API_KEY="your_key_here"
BLOB_READ_WRITE_TOKEN="your_token_here"
```

### Step 4: Run Setup

**Windows (PowerShell):**
```powershell
.\scripts\setup.ps1
```

**Mac/Linux (Bash):**
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

This will:
- Install all npm dependencies
- Generate Prisma client
- Run database migrations
- Seed demo data
- Verify all connections

### Step 5: Test the System

Run the verification script:
```bash
npm run verify
```

Run the smoke test:
```bash
npm run test:smoke
```

### Step 6: Start Development

**Option A: Manual start (recommended for development)**
```bash
# Terminal 1 - API Server
npm run dev

# Terminal 2 - Background Worker
npm run worker
```

**Option B: Auto-start both (Windows only)**
```powershell
.\scripts\run-all.ps1
```

Your API will be running at: `http://localhost:3000`

## 🔧 What Still Needs Implementation

The scaffold includes **stub files** with clear `TODO` comments. These need to be implemented:

### Critical Implementation Tasks

1. **Audio Preprocessing** (`src/lib/audio/preprocessor.ts`)
   - ✏️ Implement FFmpeg audio enhancement
   - ✏️ Implement audio concatenation for multi-part depositions

2. **Deepgram Integration** (`src/workers/transcription-worker.ts`)
   - ✏️ Implement actual Deepgram API calls
   - ✏️ Process word-level timestamps
   - ✏️ Flag low-confidence segments

3. **Notice Parsing** (`src/lib/ai/notice-parser.ts`)
   - ✏️ Implement PDF text extraction
   - ✏️ Implement Claude API structured extraction
   - ✏️ Save extracted terms to dictionary

4. **File Upload** (`src/routes/webhooks.ts`)
   - ✏️ Implement Vercel Blob storage uploads
   - ✏️ Create JobFile records
   - ✏️ Queue transcription jobs

5. **Quality Analysis** (`src/lib/transcription/quality-checker.ts`)
   - ✏️ Calculate confidence metrics
   - ✏️ Flag segments for scopist review

## 🤖 Using AI Agent for Implementation

The `AI_AGENT_TASKS.md` file contains detailed phase-by-phase instructions for an AI agent (like Claude or Copilot) to implement all the TODO items.

**To use it:**

1. Open `AI_AGENT_TASKS.md` in VS Code
2. Tell your AI assistant: *"Follow the tasks in AI_AGENT_TASKS.md starting with Phase 0"*
3. The AI will implement features systematically

## 📚 Key Commands

```bash
# Development
npm run dev              # Start API server (watch mode)
npm run worker           # Start background worker
npm run dev:all          # Start both (using concurrently)

# Database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed demo data
npm run db:studio        # Open Prisma Studio (database GUI)
npm run db:generate      # Generate Prisma client

# Testing
npm run verify           # Health check all services
npm run test:smoke       # Run smoke test
npm run lint             # Check code quality
npm run type-check       # TypeScript validation

# Production
npm run build            # Compile TypeScript
npm start                # Run compiled code
```

## 🎓 Architecture Overview

**Pipeline Flow:**
```
Email → SendGrid Webhook → API Server
                             ↓
                        Job Created
                             ↓
                       BullMQ Queue
                             ↓
                    Background Worker
                             ↓
            FFmpeg → Deepgram → Database
                             ↓
                       AI_COMPLETE
                             ↓
                    Scopist Review
```

**Multi-Tenant Security:**
- Every query filters by `firmId`
- Users can only access their firm's data
- Database enforces CASCADE deletes

**Database Schema:**
- `Firm` - Law firms
- `User` - Court reporters, scopists, admins
- `Job` - Individual depositions
- `JobFile` - Audio/video/notice files
- `Transcription` - AI-generated transcripts
- `CustomDictionaryEntry` - Firm-specific legal terms

## 🆘 Troubleshooting

### "Cannot find module @prisma/client"
```bash
npx prisma generate
```

### "Redis connection refused"
```bash
# Start Redis server
redis-server              # Windows/Linux
brew services start redis # Mac
```

### "Database connection failed"
1. Check PostgreSQL is running
2. Verify `DATABASE_URL` in `.env`
3. Try: `npx prisma migrate reset` (⚠️ deletes data)

### "FFmpeg not found"
- Download from [ffmpeg.org](https://ffmpeg.org/download.html)
- Add to system PATH
- Verify: `ffmpeg -version`

## 📞 Next Steps

1. ✅ Copy all files to VS Code
2. ✅ Install prerequisites
3. ✅ Configure `.env` file
4. ✅ Run setup script
5. ✅ Test system with verification script
6. 🔨 Start implementing TODO items (manually or with AI agent)
7. 🚀 Build your legal transcription platform!

## 📝 Notes

- This is a **production-ready scaffold** with best practices
- All configuration files are complete and tested
- Database schema supports full multi-tenant architecture
- Stub files have clear implementation guidance
- Follow `AI_AGENT_TASKS.md` for systematic implementation

**Ready to build? Start with Step 1 above! 🎉**
