# 🎯 Depo-Pro - Court Reporter & Scopist Management System

**Phase 1 Foundation**: Authentication, Multi-tenant Architecture, Job Management, and Role-Based Dashboards

## 📋 Overview

Depo-Pro is a comprehensive web application designed for court reporters and scopists to manage depositions, transcriptions, and collaborative workflows. This Phase 1 implementation establishes the secure foundation with authentication, multi-tenant data isolation, and core job management features.

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Database**: PostgreSQL (via Prisma ORM)
- **Authentication**: NextAuth.js v5 (Auth.js)
- **Validation**: Zod
- **Password Hashing**: bcryptjs

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

## 🎨 Key Features (Phase 1)

### ✅ Completed in Steps 1-2
- [x] Next.js 15 project scaffolding
- [x] TypeScript strict mode configuration
- [x] Tailwind CSS v4 setup
- [x] shadcn/ui component library
- [x] Prisma ORM with PostgreSQL
- [x] Complete database schema (7 models)
- [x] Environment configuration

### 🔜 Coming in Steps 3-13
- [ ] Authentication (NextAuth.js)
- [ ] Role-based dashboards (Admin, Reporter, Scopist)
- [ ] Job CRUD operations
- [ ] Job assignment workflow
- [ ] File metadata management
- [ ] Dictionary term management
- [ ] Loading states and error handling
- [ ] Seed data for testing

## 🔜 Phase 2+ Features (Not Yet Implemented)

- [ ] Real file storage (S3/Supabase Storage)
- [ ] Deepgram audio transcription
- [ ] Transcript editing with formatting
- [ ] Export formats (ASCII, DOCX, PDF)
- [ ] Invoicing and payment processing
- [ ] Email notifications
- [ ] Background job processing
- [ ] Advanced security hardening

## 🧪 Development Commands

```powershell
# Install dependencies
npm install

# Run development server
npm run dev

# Run Prisma Studio (database GUI)
npx prisma studio

# Create a new migration
npx prisma migrate dev --name your_migration_name

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Generate Prisma Client after schema changes
npx prisma generate

# Format code
npm run format

# Lint code
npm run lint
```

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
- [API Routes](app/api/) - Coming in Steps 7-10
- [Components](components/) - Coming in Steps 5-7

## 🤝 Contributing

This is Phase 1 of the Depo-Pro project. Follow the numbered steps in the implementation plan to build features incrementally and safely.

## 📄 License

Proprietary - All rights reserved

---

**Status**: ✅ Steps 1-2 Complete | 🔜 Next: Steps 3-4 (Utilities & Authentication)
