# MASTER CONTROL — Depo-Pro
# Version: 1.0
# Status: ACTIVE

## Project Identity

Name:         Depo-Pro
Purpose:      Legal transcription SaaS for court reporters and scopists
Stack:        Next.js (App Router) · React · TypeScript · Tailwind CSS
Backend:      Next.js API Routes · Supabase (PostgreSQL + Storage)
AI/Speech:    Deepgram Nova-3 · Anthropic Claude API
Export:       docx npm package (DOCX) · pdfkit (PDF)
Hosting:      Vercel
Domain:       app.depo-pro.com

## Current Phase

BETA HARDENING — stabilization only.
No new features. No schema changes. No new dependencies.
Ship → gather feedback → iterate.

## Frozen Files (DO NOT MODIFY)

  lib/transcription/*          — Deepgram pipeline (frozen)
  types/transcript.ts          — Shared interface (frozen)
  supabase/migrations/*        — Historical record (read-only)
  prisma/schema.prisma         — Prisma era artifact (read-only)
  All four governance docs     — Read-only

## Active Architecture

Auth:         Supabase Auth (NextAuth fully removed)
DB Client:    createSupabaseServerClient() — never use PrismaClient
Storage:      4 buckets: depo-audio, depo-files, depo-exports,
              depo-chunks
Env vars:     8 required production vars (see .env.example)

## User Roles

ADMIN · COURT_REPORTER · SCOPIST · ATTORNEY
Each role has different permissions enforced at API and RLS level.

## Primary Workflow (do not break this chain)

  Audio upload → Deepgram transcription → Word-level timestamps
  → Low-confidence flagging → Review page → Audio sync
  → Corrections saved → DOCX/PDF/TXT export

## Legal Formatting Requirements

  Font:           Courier New 12pt
  Spacing:        Double (24pt line height)
  Lines per page: 25 (hard limit — triggers page break)
  Line numbers:   1–25, reset each page
  Page size:      US Letter (DOCX: 12240×15840 DXA / PDF: 612×792pt)
  Margins:        1 inch (72pt)

## Key Principle

"AI Assists, Humans Decide"
All AI changes are trackable with before/after comparisons.
Verbatim integrity is non-negotiable in legal transcription.
Speaker mapping follows Deepgram speaker IDs strictly — never
reassign based on content analysis.

## Known Name Correction

Court reporter on Bourbois depositions: MIAH BARDOT (CSR #12129)
Deepgram mistranscribes this as "Miyamardeau" and "Mia Bardeau" —
both are wrong and must be flagged.
