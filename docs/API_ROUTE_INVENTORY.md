# Depo-Pro API Route Inventory

## Authentication Routes
| Route | Method | Path | Status | Notes |
|-------|--------|------|--------|-------|
| NextAuth | GET / POST | `/api/auth/[...nextauth]` | ✅ Complete | Credentials provider wired to Prisma via NextAuth v5 with JWT sessions. |
| Register | POST | `/api/auth/register` | ⚠️ Partial | Creates users but expects client-supplied password hashes; needs server-side hashing and stricter role validation. |

## Job Routes
| Route | Method | Path | Status | Notes |
|-------|--------|------|--------|-------|
| List Jobs | GET | `/api/jobs` | ✅ Complete | Supports role-based filtering plus pagination/search parameters. |
| Create Job | POST | `/api/jobs` | ✅ Complete | Zod validation + access control (scopists blocked). |
| Get Job | GET | `/api/jobs/[id]` | ✅ Complete | Includes relations and verifies reporter/scopist/admin access. |
| Update Job | PUT | `/api/jobs/[id]` | ⚠️ Partial | Uses PUT (no PATCH handler) and updates entire payload; lacks firm assignment + optimistic locking. |
| Delete Job | DELETE | `/api/jobs/[id]` | ✅ Complete | Reporter/admin only; removes record. |
| Trigger Transcription | POST | `/api/jobs/[id]/transcribe` | ⚠️ Partial | Calls mock `transcribeAudio` synchronously; should enqueue background worker and capture progress/errors. |

## Transcript Routes
| Route | Method | Path | Status | Notes |
|-------|--------|------|--------|-------|
| Get Transcript | GET | `/api/transcripts/[id]` | ✅ Complete | Returns content, tokens, and audio URL with access checks. |
| Update Transcript | PATCH | `/api/transcripts/[id]` | ⚠️ Partial | Creates a new version for reporter edits only; scopist workflow + word-level edits still missing. |
| Export Transcript | GET | `/api/transcripts/[id]/export` | ⚠️ Partial | Works but relies on mock ASCII export; DOCX/PDF options return plain text buffers until `lib/export.ts` is finished. |
| Get Status | GET | `/api/transcripts/[id]/status` | ⚠️ Partial | Returns metadata but progress numbers come from mock `getTranscriptionStatus`. |
| Update Words | PATCH | `/api/transcripts/[id]/words` | ❌ Missing | Endpoint referenced in specs not yet implemented. |

## File Routes
| Route | Method | Path | Status | Notes |
|-------|--------|------|--------|-------|
| Upload File | POST | `/api/files/upload` | ❌ Missing | Uploads currently handled under `/api/jobs/[id]/files` instead of a shared endpoint. |
| Get File | GET | `/api/files/[id]` | ⚠️ Partial | Returns metadata only; actual download served via `/api/files/[id]/download`. |

## User Routes
| Route | Method | Path | Status | Notes |
|-------|--------|------|--------|-------|
| List Users | GET | `/api/users` | ❌ Missing | No admin/user management API yet. |
| Get User | GET | `/api/users/[id]` | ❌ Missing | Needed for admin tooling. |
| Update User | PATCH | `/api/users/[id]` | ❌ Missing | No endpoint to adjust roles/profiles beyond registration. |
