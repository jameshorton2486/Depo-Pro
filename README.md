# Depo-Pro

> Legal transcription SaaS built with Next.js 15, Supabase, Deepgram, Prisma, and BullMQ

---

## 🏗️ Project Status

**Current Phase:** Phase 3 Complete ✅  
**Version:** v1.0-beta (ready for tagging)  
**Last Updated:** January 2, 2026

### Phase Completion

- ✅ **Phase 1: Foundation** - MVP with core functionality
- ✅ **Phase 2: Stabilization** - Permissions hardened, code cleaned
- ✅ **Phase 3: Core Workflows** - Calendar, transcript review, export polish, admin tooling
- ⬜ **Phase 4: Workflow Maturity** - Not started
- ⬜ **Phase 5: Production Readiness** - Not started

See [docs/COMPLETE_PHASE_ROADMAP.md](./docs/COMPLETE_PHASE_ROADMAP.md) for full roadmap.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

---

## 📚 Documentation

- **[Complete Phase Roadmap](./docs/COMPLETE_PHASE_ROADMAP.md)** - Full development roadmap
- **[Architecture Locks](./docs/ARCHITECTURE_LOCKS.md)** - Critical architectural decisions
- **[Phase 3 Complete](./PHASE_3_COMPLETE.md)** - Phase 3 completion summary
- **[Phase 4 Plan](./docs/PHASE_4_PLAN.md)** - Next phase planning
- **[Phase 5 Plan](./docs/PHASE_5_PLAN.md)** - Production readiness plan
- **[Backlog Post Phase 5](./docs/BACKLOG_POST_PHASE_5.md)** - Future considerations

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL (via Supabase)
- **ORM:** Prisma
- **Authentication:** NextAuth v5
- **Transcription:** Deepgram
- **Queue:** BullMQ (Redis)
- **Storage:** Supabase Storage
- **UI:** React, Tailwind CSS, shadcn/ui

---

## 📋 Key Features

### Phase 1 (Complete)
- User authentication and role-based access
- Job management workflow
- Deepgram transcription integration
- Low-confidence word review
- Basic document export

### Phase 2 (Complete)
- Centralized permission system
- Navigation alignment
- Architecture locks documented
- Permission regression tests

### Phase 3 (Complete)
- Unified calendar with availability management
- Transcript lifecycle (Draft → Finalized)
- Confidence highlighting and review tools
- Export profiles with role permissions
- Admin visibility and health monitoring

---

## 🔒 Security & Permissions

- **Single Source of Truth:** `lib/permissions/route-access.ts`
- **No Inline Role Checks:** All permissions via route-access
- **Audit Trail:** All sensitive actions logged
- **Transcript Locking:** Hard lock on finalization (admin override available)

See [docs/ARCHITECTURE_LOCKS.md](./docs/ARCHITECTURE_LOCKS.md) for details.

---

## 🧪 Development

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Navigation audit
npm run nav:audit

# Normalize navigation IDs
npm run nav:normalize
```

---

## 📦 Project Structure

```
├── app/                    # Next.js app router pages
├── components/            # React components
├── lib/                   # Core libraries
│   ├── auth/             # Authentication
│   ├── calendar/         # Calendar & scheduling
│   ├── export/           # Export functionality
│   ├── permissions/      # Permission system
│   ├── transcripts/      # Transcript management
│   └── ...
├── prisma/               # Database schema
├── scripts/              # Utility scripts
└── docs/                # Documentation
```

---

## 🎯 Next Steps

1. **Tag v1.0-beta** - Mark Phase 3 completion
2. **Beta Testing** - Validate workflows with real users
3. **Phase 4 Planning** - Begin workflow maturity work

---

## 📝 License

Proprietary - All rights reserved

---

**Built with discipline. Ship each phase. Don't skip ahead.**
