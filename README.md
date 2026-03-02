# Depo-Pro

Depo-Pro is a Next.js application for deposition workflow management, transcription, review, and exports.

## Prerequisites

- Node.js 20+
- npm 10+
- Supabase project (URL + keys)
- Deepgram API key (for transcription features)

## Local Setup

1. Install dependencies:
```bash
npm install
```

2. Create local environment file:
```bash
cp .env.example .env.local
```

3. Set required environment variables in `.env.local`.

4. Start development server:
```bash
npm run dev
```

5. Open `http://localhost:3000`.

## Required Environment Variables

Template files:

- `.env.example`
- `.env.production.example`

Set these in `.env.local`:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (`https://<project>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable key (`sb_publishable_*`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (`sb_secret_*`) |
| `DEEPGRAM_API_KEY` | Yes | Deepgram API key |
| `REDIS_URL` | No | Redis connection URL for queue/rate-limit paths |
| `ANTHROPIC_API_KEY` | No | Anthropic API key for extraction features |
| `CONTACT_WEBHOOK_URL` | No | Contact-form notification webhook endpoint |

## Scripts

- `npm run dev`: Start local development
- `npm run build`: Production build
- `npm run start`: Run production server
- `npm run typecheck`: TypeScript checks
- `npm run test`: Test suite
- `npm run lint`: ESLint checks

## Project Structure

- `app/`: Next.js App Router routes and API handlers
- `components/`: UI and feature components
- `lib/`: Shared services, integrations, utils, and domain logic
- `types/`: TypeScript types
- `docs/`: Technical documentation and guides
- `scripts/`: Maintenance and utility scripts
- `tests/`: Automated test suites

## Documentation

- Main docs index: `docs/README.md`
- Beta testing guide: `docs/BETA_TESTING_GUIDE.md`
- Deployment docs: `docs/deployment/`
