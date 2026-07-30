# Depo-Pro

Depo-Pro is a legal deposition production application for court reporters and scopists. It supports case intake, Deepgram transcription, synchronized transcript review, corrections, speaker resolution, exhibits, certification, and export.

The active development baseline is `feature/stage3-workspace-core`. Read `AGENTS.md` and `docs/architecture/MASTER_ARCHITECTURE.md` before changing code.

## Core integrity rules

- Deepgram `raw_text`, word identity, timing, and confidence are canonical and immutable.
- Human edits belong in working or overlay fields.
- AI output is advisory and must remain reviewable, auditable, acceptable, and rejectable.
- Certified or export-locked transcripts must not be silently changed.
- Test fixtures must be synthetic; do not commit client transcripts, notices, credentials, or signed media URLs.
- Structural reassembly must be previewed and explicitly applied.

## Technology

- React 18 and TypeScript
- Vite
- Tailwind CSS
- TipTap / ProseMirror
- WaveSurfer
- Supabase
- Vitest and Testing Library

## Local setup

Requirements:

- Node.js 20.19 or newer
- npm
- A Supabase project only when testing real API mode

Install dependencies:

```bash
npm ci
```

Create a local environment file (single source of truth — not `.env.local`):

```bash
cp .env.example .env
```

Mock mode is the safe default:

```dotenv
VITE_USE_REAL_API=0
```

Start the development server:

```bash
npm run dev
```

Audit which env key names are declared, present locally, and referenced by code (names only, never values):

```bash
npm run env:audit
```

Do not place service-role keys, Deepgram keys, Anthropic keys, client data, or signed URLs in any `VITE_*` variable; Vite exposes those values to browser code. Do not create `.env.local` — local scripts load `.env` only. Edge Function secrets belong in Supabase secrets (`supabase secrets set`), not in browser-exposed Vite vars.

## Verification

Run the complete local gate before opening or merging a pull request:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

The build script also runs the application TypeScript check. A Vite-only build is not sufficient evidence of release readiness.

## Runtime modes

- Mock mode: `VITE_USE_REAL_API=0`
- Real API mode: `VITE_USE_REAL_API=1`
- Real editor API URL: `VITE_EDITOR_API_BASE_URL`
- Binding confirmation gate: `VITE_REQUIRE_BINDING_CONFIRM=true`

Use mock mode for routine development. Do not run scripts that seed, migrate, transcribe, or modify Supabase unless the target environment is explicitly confirmed as disposable or isolated.

## Repository map

- `src/components/`: workflow screens and UI
- `src/api/`: client and persistence services
- `src/lib/transcript/`: transcript integrity, reconstruction, corrections, and formatting engines
- `src/lib/format/`: canonical formatting engine
- `supabase/functions/`: Edge Functions
- `supabase/migrations/`: database migrations and policies
- `docs/architecture/`: governing architecture
- `docs/audits/`: audit evidence and decision records
- `reference/wave8/`: read-only normative reference; never import into runtime code or modify

## Contribution workflow

1. Branch from the active development baseline.
2. Make focused changes that preserve canonical transcript data.
3. Add regression coverage for every defect.
4. Run all verification commands.
5. Open a draft pull request describing the root cause, safety constraints, and checks performed.

Do not rewrite unrelated code for style, alter frozen API contract shapes, or mix schema changes with unrelated UI work.
