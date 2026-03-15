# Depo-Pro — AI Agent Context File
# Quick-reference for all AI coding tools.
# Version: 1.0 · March 2026

---

## Platform Summary

Depo-Pro converts deposition audio → Deepgram JSON → structured legal transcript → certified DOCX.

Users: Court Reporters · Scopists · Attorneys · Admins
Firms: Multi-tenant, firm_id-scoped throughout

---

## Infrastructure

| Service       | Details                                              |
|---------------|------------------------------------------------------|
| Frontend      | Next.js 15, App Router, TypeScript, Tailwind CSS     |
| Auth          | Supabase SSR (cookies), RBAC via profiles.role       |
| Database      | Supabase PostgreSQL, RLS on all tables               |
| Storage       | Supabase Storage (depo-audio, depo-files, depo-exports, depo-chunks) |
| Speech AI     | Deepgram Nova-3 (diarize, utterances, keyterms)      |
| Document AI   | Anthropic Claude (medical extraction, intake parsing)|
| Export        | docx npm package                                     |
| Hosting       | Vercel (auto-deploy on git push)                     |
| Email         | Resend via notifications@depo-pro.com                |
| Domain        | depo-pro.com (canonical)                             |

---

## Key Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY   ← NOT anon key
SUPABASE_SERVICE_ROLE_KEY
DEEPGRAM_API_KEY
ANTHROPIC_API_KEY
NEXT_PUBLIC_APP_URL
CRON_SECRET
```

Legacy (deleted — do not recreate):
  DATABASE_URL · DIRECT_URL · NEXTAUTH_SECRET · NEXTAUTH_URL

---

## Key File Paths

```
lib/supabase/server.ts                  ← FROZEN — server Supabase client
lib/supabase/client.ts                  ← FROZEN — browser client
lib/auth/session.ts                     ← FROZEN — session helper
middleware.ts                           ← FROZEN — auth middleware
lib/middleware/withRouteProtection.ts   ← use this for all new routes
lib/transcription/formatter/index.ts   ← Phase 1 entry point
lib/transcription/buildKeywords.ts     ← stub to fix (returns [] always)
lib/transcription/legal-formatter.ts   ← legacy, to be replaced
components/transcripts/AudioPlayer.tsx
components/transcripts/FlaggedWordPanel.tsx
components/transcripts/TranscriptPanel.tsx
app/(dashboard)/jobs/[id]/review/page.tsx
```

---

## Database Table Groups

**Existing (production):**
profiles · firms · jobs · transcriptions · transcription_chunks ·
flagged_words · transcription_edits · transcript_integrity_chain ·
audit_log · custom_vocabularies · firm_vocabularies

**Phase A (formatter — run before Phase 1):**
depositions · participants · documents · vocabulary_terms · exhibits ·
exhibit_markers · transcript_words · speaker_assignments ·
transcript_paragraphs · transcript_flags · ai_suggestions ·
jurisdiction_configs · exports

**Phase B (editor — run before Phase 2):**
transcript_sessions · transcript_sections · reporter_preferences ·
speaker_voice_profiles · proofreading_assignments · ai_review_sessions ·
ai_rules · transcript_access_log · export_certifications ·
audio_annotations · realtime_sessions · calendar_events

---

## Confidence Class Thresholds

| Class    | Threshold | CSS Class     | Action            |
|----------|-----------|---------------|-------------------|
| HIGH     | ≥ 0.90    | conf-high     | No review needed  |
| MEDIUM   | 0.80–0.89 | conf-medium   | Quick listen      |
| LOW      | 0.70–0.79 | conf-low      | Review required   |
| CRITICAL | < 0.70    | conf-critical | Must correct      |

---

## Quality Gate Codes

| Code   | Severity | Blocks Export | Description                       |
|--------|----------|---------------|-----------------------------------|
| QG-001 | ERROR    | YES           | Unresolved [VERIFY] tags          |
| QG-002 | ERROR    | YES           | Speaker mapping incomplete        |
| QG-003 | ERROR    | YES           | Date conflict flags unresolved    |
| QG-004 | ERROR    | YES           | Certification block empty         |
| QG-005 | ERROR    | YES           | Words marked is_deleted=true      |
| QG-006 | ERROR    | YES           | [SCOPIST: ...] notes in body      |
| QG-007 | ERROR    | YES           | Exhibit index missing page numbers|
| QG-008 | WARNING  | NO            | Font/spacing non-compliant        |
| QG-009 | WARNING  | NO            | Lines/page exceeds maximum        |
| QG-010 | WARNING  | NO            | Low-confidence words unreviewed   |
| QG-011 | WARNING  | NO            | Em dash present                   |
| QG-012 | WARNING  | NO            | "THE COURT REPORTER" detected     |

---

## Miah Bardot Misrecognition

Court reporter: Miah Bardot (B-A-R-D-O-T), CSR #12129, SA Legal Solutions
Deepgram misrecognizes as: "Miyamardeau" or "Mia Bardeau"
Response: Flag as CRITICAL, surface to scopist, NEVER auto-correct.
