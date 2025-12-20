# Depo-Pro

**AI-powered legal transcription SaaS for court reporters, scopists, and law firms.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)

## 🎯 What is Depo-Pro?

Depo-Pro is a modern SaaS platform that revolutionizes legal deposition transcription by combining AI-powered transcription with intelligent review workflows. It reduces transcription time by **80%** and costs by **70%** while maintaining professional accuracy standards.

### Key Features

- **🤖 AI Transcription** - Deepgram Nova-3 with 90-95% initial accuracy
- **🎯 Low-Confidence Review** - Jump directly to uncertain words with audio sync
- **👥 Role-Based Workflows** - Reporter → Scopist → Approval pipeline
- **📄 Legal Formatting** - Automatic Q/A structure, capitalization, punctuation
- **📊 Real-Time Tracking** - Job status, progress metrics, and analytics
- **📦 Exhibit Management** - Upload, stamp, and manage deposition exhibits
- **🔒 Enterprise Security** - Multi-tenant isolation, role-based access control

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **PostgreSQL** database ([Supabase](https://supabase.com) recommended)
- **Redis** (for job queue) - Optional for development
- **API Keys:**
  - [Deepgram](https://console.deepgram.com/signup) - Transcription
  - [Anthropic](https://console.anthropic.com/) - Document parsing
  - [Supabase](https://supabase.com) - Database & Storage

### Installation

```bash
# Clone the repository
git clone https://github.com/jameshorton2486/depo-pro.git
cd depo-pro

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys and database URL

# Set up database
npx prisma generate
npx prisma db push

# Run development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 🏗️ Architecture

### Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (via Supabase)
- **ORM:** Prisma
- **Authentication:** NextAuth.js v5
- **AI Transcription:** Deepgram Nova-3
- **Document AI:** Anthropic Claude
- **Job Queue:** BullMQ + Redis
- **Storage:** Supabase Storage
- **Styling:** Tailwind CSS + shadcn/ui

### Project Structure

```
depo-pro/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Protected dashboard routes
│   └── api/               # API routes
├── components/            # React components
│   ├── transcripts/       # Transcript UI components
│   ├── jobs/              # Job management UI
│   └── ui/                # shadcn/ui components
├── lib/                   # Core libraries
│   ├── auth.ts           # Authentication helpers
│   ├── db.ts             # Prisma client
│   ├── transcription/    # Deepgram integration
│   └── workers/          # Background job processors
├── prisma/               # Database schema
└── types/                # TypeScript types
```

## 📖 Documentation

- **[MVP Manual Test Guide](docs/MVP_MANUAL_TEST.md)** - Testing checklist
- **[API Route Inventory](docs/API_ROUTE_INVENTORY.md)** - Complete API reference
- **[Component Inventory](docs/COMPONENT_INVENTORY.md)** - UI component catalog
- **[Role Access Matrix](docs/ROLE_ACCESS_MATRIX.md)** - Permission system
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Production deployment

## 🔐 Security

We take security seriously. See [SECURITY.md](SECURITY.md) for:
- Vulnerability reporting process
- Security best practices
- Responsible disclosure policy

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Code of conduct
- Development setup
- Pull request process
- Coding standards

## 📊 Current Status

### ✅ MVP Complete (v0.1.0)

**Core Features:**
- ✅ User authentication & role-based access
- ✅ Job creation & management
- ✅ Audio/video file upload
- ✅ Deepgram transcription integration
- ✅ Low-confidence word review system
- ✅ Audio-synced transcript editor
- ✅ Document export (DOCX, PDF, TXT)
- ✅ Exhibit management
- ✅ Case intake system
- ✅ Reporter & Scopist dashboards

**Production Ready:**
- ✅ TypeScript strict mode
- ✅ Error handling & logging
- ✅ Database migrations
- ✅ Environment configuration
- ✅ Security headers & middleware

## 🗺️ Roadmap

### Phase 2 (Q2 2025)
- [ ] Real-time transcription progress
- [ ] WebSocket notifications
- [ ] Advanced speaker identification
- [ ] Batch job processing
- [ ] API rate limiting

### Phase 3 (Q3 2025)
- [ ] Mobile app (iOS/Android)
- [ ] Offline mode support
- [ ] Advanced analytics dashboard
- [ ] Integration with case management systems
- [ ] Multi-language support

## 💼 Business Model

Depo-Pro is currently in **private beta**. For enterprise inquiries or partnership opportunities, please contact the maintainers.

## 📝 License

**Proprietary** - All rights reserved

This software is proprietary and confidential. Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited.

## 🙏 Acknowledgments

- [Deepgram](https://deepgram.com) - AI transcription API
- [Anthropic](https://anthropic.com) - Claude AI for document parsing
- [Supabase](https://supabase.com) - Database & storage infrastructure
- [Next.js](https://nextjs.org) - React framework
- [shadcn/ui](https://ui.shadcn.com) - UI component library

## 📧 Contact

- **Issues:** [GitHub Issues](https://github.com/jameshorton2486/depo-pro/issues)
- **Security:** See [SECURITY.md](SECURITY.md)

---

**Built with ❤️ for the legal transcription community**
