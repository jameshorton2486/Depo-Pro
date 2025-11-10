# 🎯 Depo-Pro - Court Reporter & Scopist Management System

**Phase 1 Complete**: Authentication, Multi-tenant Architecture, Job Management, Assignments, Files, and Dictionary

## 📋 Overview

Depo-Pro is a comprehensive web application designed for court reporters and scopists to manage depositions, transcriptions, and collaborative workflows. Phase 1 establishes a secure foundation with authentication, multi-tenant data isolation, and complete job management features including assignment workflows, file uploads, and case-specific dictionaries.

## ✨ Key Features (Phase 1 - Complete)

### Authentication & Security
- ✅ NextAuth.js v5 with JWT sessions
- ✅ Role-based access control (ADMIN, COURT_REPORTER, SCOPIST)
- ✅ Multi-tenant data isolation with firmId filtering
- ✅ Secure password hashing with bcryptjs
- ✅ Protected API routes and middleware

### Job Management
- ✅ Complete CRUD operations for deposition jobs
- ✅ Job status tracking (Draft, Scheduled, In Progress, Review, Complete, Cancelled)
- ✅ Rich job metadata (case details, court, location, deadline, etc.)
- ✅ Rush order flagging
- ✅ Client information tracking

### Assignment Workflow
- ✅ Assign scopists to jobs
- ✅ Assignment status flow (Pending → Accepted → In Progress → Completed)
- ✅ Scopists can accept/reject assignments
- ✅ Status updates with automatic timestamps
- ✅ Assignment notes and communication

### File Management
- ✅ File upload with validation (type, size)
- ✅ Multiple file types supported (PDF, DOC, audio, video)
- ✅ File metadata tracking (name, size, type, uploader)
- ✅ Delete functionality with permissions
- ✅ Files stored in /uploads directory

### Dictionary Management
- ✅ Case-specific terminology management
- ✅ Term categories (Medical, Legal, Technical, Name, Place, Other)
- ✅ Phonetic spelling support
- ✅ Notes and definitions
- ✅ Search and filter by category
- ✅ Inline add/edit/delete

### User Experience
- ✅ Toast notifications (Sonner)
- ✅ Responsive design
- ✅ Empty states with call-to-actions
- ✅ Loading states
- ✅ Color-coded status badges
- ✅ Role-specific dashboards

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui + Radix UI
- **Database**: SQLite (via Prisma ORM)
- **Authentication**: NextAuth.js v5 (Auth.js)
- **Validation**: Zod
- **Password Hashing**: bcryptjs
- **Notifications**: Sonner toast library

## 🔐 Security Features

- ✅ **Multi-tenant isolation**: Every query filters by `firmId`
- ✅ **Role-based access control**: ADMIN, COURT_REPORTER, SCOPIST
- ✅ **Input validation**: Zod schemas on all forms and API routes
- ✅ **Password security**: bcrypt hashing
- ✅ **SQL injection prevention**: Prisma parameterized queries only

## 🗂️ Database Models

### Core Models (Phase 1)
1. **User** - Authentication and profile management
2. **Firm** - Multi-tenant organization parent
3. **Job** - Deposition/transcription jobs
4. **JobAssignment** - Assign scopists to jobs
5. **JobFile** - File metadata (storage in Phase 2)
6. **Transcript** - Transcript versions (Deepgram in Phase 2)
7. **JobDictionaryTerm** - Case-specific terminology

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (see options below)
- PowerShell (for Windows commands)

### 1. Generate NextAuth Secret

Run this in PowerShell:
```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Copy the output and update `.env` file:
```env
NEXTAUTH_SECRET="paste-your-generated-secret-here"
```

### 2. Set Up PostgreSQL Database

**Option A: Use Prisma's Local Postgres (Already Set Up!)**
- ✅ Prisma created a local database URL in `.env`
- No additional setup needed for development

**Option B: Use Supabase (Free Tier)**
1. Go to https://supabase.com
2. Create a new project
3. Go to Settings → Database → Connection String
4. Copy the connection string and update `.env`:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres"
   ```

**Option C: Use Neon (Free Tier)**
1. Go to https://neon.tech
2. Create a new project
3. Copy the connection string and update `.env`

### 3. Run Database Migration

```powershell
npx prisma migrate dev --name init
```

This creates all tables, indexes, and relationships in your database.

### 4. Generate Prisma Client

```powershell
npx prisma generate
```

### 5. (Optional) Seed Test Data

After we create the seed file in Step 11, you'll run:
```powershell
npx prisma db seed
```

This creates test users:
- `admin@depo-pro.com` / `password123`
- `reporter@depo-pro.com` / `password123`
- `scopist@depo-pro.com` / `password123`

### 6. Start Development Server

```powershell
npm run dev
```

Open http://localhost:3000 in your browser.

## 📁 Project Structure

```
depo-pro/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth routes (login, register)
│   ├── (dashboard)/         # Protected dashboard routes
│   ├── jobs/                # Job management pages
│   ├── api/                 # API routes
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing page
├── components/              # React components
│   ├── ui/                  # shadcn/ui base components
│   ├── forms/               # Form components
│   ├── layouts/             # Layout components (navbar, etc.)
│   ├── dashboard/           # Dashboard components
│   └── jobs/                # Job-related components
├── lib/                     # Utilities and configurations
│   ├── db.ts                # Prisma client singleton
│   ├── auth.ts              # NextAuth helpers
│   ├── validations/         # Zod schemas
│   └── utils.ts             # Utility functions
├── types/                   # TypeScript type definitions
├── prisma/                  # Database schema and migrations
│   ├── schema.prisma        # Database models
│   ├── migrations/          # Migration history
│   └── seed.ts              # Seed data (Step 11)
├── .env                     # Local environment variables (GITIGNORED)
├── .env.example             # Environment template
└── middleware.ts            # Route protection (Step 4)
```

## 🧪 Development Commands

```powershell
# Install dependencies
npm install

# Run development server
npm run dev

# Full health check (lint + typecheck + build)
npm run check

# Run linter
npm run lint

# Run type checker
npm run typecheck

# Build for production
npm run build

# Seed test database
npm run db:seed

# Run Prisma Studio (database GUI)
npx prisma studio

# Create a new migration
npx prisma migrate dev --name your_migration_name

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Generate Prisma Client after schema changes
npx prisma generate
```

## 🧪 Test Credentials

After running `npm run db:seed`, you can log in with:

| Role | Email | Password | Firm |
|------|-------|----------|------|
| Admin | admin@acme-court.com | password123 | Acme Court Reporting |
| Court Reporter | alice.reporter@acme-court.com | password123 | Acme Court Reporting |
| Scopist | bob.scopist@acme-court.com | password123 | Acme Court Reporting |
| Court Reporter | charlie.reporter@precision.com | password123 | Precision Reporting |
| Scopist | diana.scopist@precision.com | password123 | Precision Reporting |

**Test Scenarios:**
- Multi-tenant isolation: Users from different firms cannot see each other's jobs
- Assignment workflow: Reporters assign jobs to scopists, scopists accept/reject
- File uploads: Upload audio, video, or document files to jobs
- Dictionary management: Add medical, legal, or technical terms with phonetic spellings

## � API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/[...nextauth]` - NextAuth.js endpoints (signin, signout, etc.)

### Jobs
- `GET /api/jobs` - List all jobs (filtered by user permissions)
- `POST /api/jobs` - Create new job
- `GET /api/jobs/[id]` - Get job details
- `PATCH /api/jobs/[id]` - Update job
- `DELETE /api/jobs/[id]` - Delete job

### Assignments
- `POST /api/jobs/[id]/assign` - Assign scopist to job
- `PATCH /api/assignments/[id]` - Update assignment status
- `DELETE /api/assignments/[id]` - Remove assignment

### Files
- `GET /api/jobs/[id]/files` - List job files
- `POST /api/jobs/[id]/files` - Upload file (multipart/form-data)
- `DELETE /api/files/[id]` - Delete file

### Dictionary
- `GET /api/jobs/[id]/dictionary` - List dictionary terms (with search/filter)
- `POST /api/jobs/[id]/dictionary` - Create dictionary term
- `PATCH /api/dictionary/[id]` - Update term
- `DELETE /api/dictionary/[id]` - Delete term

## 📊 Phase 1 Progress

✅ **100% Complete!**

- ✅ Step 1-2: Project setup and database schema
- ✅ Step 3-4: Utilities and authentication
- ✅ Step 5-6: Role-based dashboards
- ✅ Step 7: Job management (CRUD)
- ✅ Step 8: Assignment workflow
- ✅ Step 9: File upload and metadata
- ✅ Step 10: Dictionary management
- ✅ Step 11: Seed data
- ✅ Step 12: UI polish (toasts, empty states)
- ✅ Step 13: Documentation

## 🔜 Phase 2 Features (Planned)

- [ ] Real file storage (S3/Supabase Storage) with download links
- [ ] Deepgram audio transcription integration
- [ ] Transcript editor with formatting toolbar
- [ ] Export formats (ASCII, DOCX, PDF)
- [ ] Invoicing and payment processing
- [ ] Email notifications (assignment updates, deadlines)
- [ ] Background job processing
- [ ] Advanced search and filtering
- [ ] Activity logs and audit trails
- [ ] Mobile-responsive improvements

## 🧯 Error Handling & Logging

Depo-Pro includes structured logging and error handling so that problems are traceable and easy to debug.

- All logs are written to the `logs/` directory at the project root.
- Log files are separated by level (info, warn, error) and by date.
- Server-side code uses the shared logger in `lib/logger.ts`.

For full details and examples of how to use the logger inside routes, API handlers, and background tasks, see:

👉 [`docs/ERROR_HANDLING.md`](docs/ERROR_HANDLING.md)

## 🔒 Multi-Tenant Security Reminders

Every database query for Jobs, Files, and Transcripts **MUST** filter by `firmId`:

```typescript
// ✅ CORRECT - Filters by firmId
const jobs = await db.job.findMany({
  where: {
    firmId: user.firmId,  // 🔒 Multi-tenant isolation
    status: 'IN_PROGRESS'
  }
});

// ❌ WRONG - Exposes data across firms!
const jobs = await db.job.findMany({
  where: {
    status: 'IN_PROGRESS'
  }
});
```

## 📚 Documentation

- [Prisma Schema](prisma/schema.prisma) - Full database documentation
- [Environment Variables](.env.example) - Configuration guide
- [Error Handling](docs/ERROR_HANDLING.md) - Logging and error handling guide
- [API Routes](app/api/) - RESTful API implementation
- [Components](components/) - Reusable UI components

## 🤝 Contributing

This project follows a phased development approach. Phase 1 is complete! Future phases will add transcription, payments, and advanced features.

## 📄 License

Proprietary - All rights reserved

---

**Status**: ✅ Phase 1 Complete (Steps 1-13) | 🔜 Next: Phase 2 (Cloud Storage & Transcription)
