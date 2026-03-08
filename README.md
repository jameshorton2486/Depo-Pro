# Depo-Pro

AI-assisted deposition transcript management for court reporters and scopists.

## What It Does

Depo-Pro processes deposition audio through Deepgram Nova-3, identifies
low-confidence words, and provides scopists with a synchronized audio review
interface to correct uncertain transcriptions before export.

**Core workflow:**
1. Court reporter uploads audio and creates a job
2. AI transcribes audio and flags low-confidence words
3. Scopist reviews flagged words with audio playback
4. Corrections are applied and transcript is exported as DOCX or PDF

## Tech Stack

- **Frontend:** Next.js 16, React, Tailwind CSS, shadcn/ui
- **Database:** Supabase (PostgreSQL + RLS + Storage)
- **Auth:** Supabase Auth (SSR)
- **Transcription:** Deepgram Nova-3
- **AI:** Anthropic Claude API (correction suggestions, medical extraction)
- **Hosting:** Vercel
- **Export:** docx npm package, pdfkit

## Local Development

### Prerequisites
- Node.js 20+
- A Supabase project
- Deepgram API key
- Anthropic API key

### Setup

```bash
git clone https://github.com/jameshorton2486/depo-pro.git
cd depo-pro
npm install
cp .env.example .env.local
# Fill in your values in .env.local
npm run dev
```

### Environment Variables

See `.env.example` for all required variables. Key ones:

| Variable | Description |
|----------|-------------|
| NEXT_PUBLIC_SUPABASE_URL | Your Supabase project URL |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Supabase publishable key |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key (server only) |
| DEEPGRAM_API_KEY | Deepgram API key for transcription |
| ANTHROPIC_API_KEY | Anthropic API key for AI corrections |
| NEXT_PUBLIC_SITE_URL | Your deployment URL |

## Database

Migrations are in `supabase/migrations/`. Apply them via:

```bash
supabase db push
```

## Testing

```bash
npm run test          # Unit tests (vitest)
npm run test:e2e      # E2E tests (playwright)
npm run typecheck     # TypeScript check
npm run lint          # ESLint
```

## Deployment

Deployed automatically to Vercel on push to `main`.
Production URL: https://depo-pro.com

## User Roles

| Role | Access |
|------|--------|
| Court Reporter | Create jobs, upload audio, assign scopists, export |
| Scopist | Review flagged words, submit corrections |
| Attorney | View completed transcripts |
| Admin | Full access |

## Project Structure

- `app/` — Next.js App Router routes and API handlers
- `components/` — UI and feature components
- `lib/` — Shared services, integrations, utils, and domain logic
- `types/` — TypeScript types
- `supabase/migrations/` — Database migrations
- `docs/` — Technical documentation
- `scripts/` — Maintenance and utility scripts
- `tests/` — Automated test suites

## Legal

All transcripts maintain verbatim integrity. The `original_transcript` field
is immutable — corrections are tracked separately and applied at export time.
