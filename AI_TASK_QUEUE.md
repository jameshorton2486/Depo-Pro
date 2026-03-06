# Depo-Pro AI Task Queue

This file defines the current development task list for AI agents.

**AI agents must read this file before implementing changes.**

Tasks are divided into:

- **CURRENT** — Active development
- **NEXT** — Ready after CURRENT finishes
- **FUTURE** — Planned features
- **COMPLETED** — Finished work

Agents should only work on tasks in **CURRENT** unless instructed otherwise.

---

## CURRENT TASKS

### Authentication Stabilization

**Status:** In Progress

**Tasks:**

- verify middleware.ts refreshes Supabase session cookies
- verify /auth/callback writes session cookies correctly
- ensure login does not create redirect loops
- verify protected routes redirect unauthenticated users

**Files involved:**

- middleware.ts
- app/auth/callback/route.ts
- lib/supabase/middleware.ts

---

## NEXT TASKS

### Transcription Pipeline

**Goal:** Implement Deepgram transcription service.

**Tasks:**

- create lib/transcription/deepgram.ts
- parse Deepgram response into ParsedWord[]
- create transcript_words storage pipeline

**Files:**

- lib/transcription/deepgram.ts
- lib/transcription/parser.ts
- lib/transcription/index.ts

### Transcript Editor API

**Goal:** Expose transcript data to the editor.

**Tasks:**

Create API routes:

- GET /api/transcripts/[id]/words
- PATCH /api/transcripts/[id]/words

**Features:**

- update corrected_word
- preserve original word
- track speaker edits

---

## FUTURE TASKS

### Live Deposition Transcription

**Architecture:**

```
Zoom meeting audio
→ audio stream capture
→ Deepgram streaming API
→ live transcript buffer
→ editor UI
```

**Components:**

- WebSocket server
- audio buffer manager
- speaker diarization

### Transcript Export System

**Goal:** Generate legal transcript exports.

**Formats:**

- DOCX
- PDF

**Requirements:**

- include corrected words
- preserve timestamps
- include speaker labels

---

## COMPLETED TASKS

### AI Governance System

**Completed files:**

- CLAUDE.md
- AI_MASTER_ORCHESTRATOR.md
- REPO_INTELLIGENCE_MAP.md
- docs/DEPO_AUTH_ARCHITECTURE.md
- .cursorrules

**Purpose:** Provide AI architecture rules and repo intelligence.

---

## AI TASK EXECUTION RULES

AI agents must follow these rules:

1. **Read:**
   - AI_MASTER_ORCHESTRATOR.md
   - REPO_INTELLIGENCE_MAP.md
   - AI_TASK_QUEUE.md

2. **Identify** the CURRENT task.

3. **Modify** only relevant files.

4. **Validate** code:
   ```bash
   npx tsc --noEmit
   npm run build
   ```

5. **Log** changes in ai_logs/change_log.md

---

## TASK STATUS DEFINITIONS

| Status | Meaning |
|--------|---------|
| **CURRENT** | Active development tasks. |
| **NEXT** | Tasks ready to start after CURRENT tasks finish. |
| **FUTURE** | Planned features. |
| **COMPLETED** | Finished architecture components. |
