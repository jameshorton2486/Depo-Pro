# Event & Workflow Orchestration Architecture

> Depo-Pro — Production Event-Driven Pipeline Design
> Version: 1.0
> Date: 2026-03-10
> Status: Architecture Design (pre-implementation)
>
> Companion documents:
> - `CANONICAL_DOMAIN_MODEL.md` — entity hierarchy
> - `ASYNC_IDEMPOTENCY_MODEL.md` — idempotency keys and worker job model
> - `DEPO_PRO_CORE_ARCHITECTURE_RULES.md` — system invariants
> - `TRANSCRIPT_FORMATTER_ARCHITECTURE.md` — formatter pipeline

---

## 1 — Event Catalog

Every event in the system follows a single envelope schema:

```typescript
interface DomainEvent {
  event_id: string            // UUIDv4, globally unique
  event_type: string          // e.g. 'transcription.hydrated'
  aggregate_type: string      // e.g. 'transcription', 'job', 'export'
  aggregate_id: string        // UUID of the owning entity
  firm_id: string             // tenant isolation — always present
  idempotency_key: string     // dedup key for consumers
  payload: Record<string, unknown>
  emitted_by: string          // producer identifier
  emitted_at: string          // ISO 8601 timestamp
}
```

### 1.1 — Document Ingestion Events

| Event | Trigger Source | Idempotency Key | Downstream Consumers |
|-------|---------------|-----------------|---------------------|
| `document.uploaded` | POST /api/cases/intake | `{firm_id}:{file_hash}` | AI extraction worker |
| `document.metadata_extracted` | AI extraction worker | `{document_id}:{extraction_version}` | Case normalization worker |
| `document.case_normalized` | Normalization worker | `{document_id}:{case_id}` | Job creation service, notification worker |

**Payloads:**

```typescript
// document.uploaded
{
  document_id: string
  firm_id: string
  file_name: string
  file_hash: string       // SHA-256 of uploaded file
  storage_path: string
  uploaded_by: string     // user id
}

// document.metadata_extracted
{
  document_id: string
  case_style: string
  cause_number: string
  deponent_name: string
  deposition_date: string
  attorneys: Array<{ name: string; representing: string }>
  confidence_score: number
  model_version: string
}

// document.case_normalized
{
  document_id: string
  case_id: string
  deposition_id: string
  created_entities: string[]   // which tables were written
}
```

### 1.2 — Job Lifecycle Events

| Event | Trigger Source | Idempotency Key | Downstream Consumers |
|-------|---------------|-----------------|---------------------|
| `job.created` | Job creation service | `{deposition_id}:{job_type}` | Notification worker |
| `job.audio_uploaded` | POST /api/jobs/[id]/upload | `{job_id}:{file_hash}` | Transcription scheduler |
| `job.status_changed` | Any status transition | `{job_id}:{new_status}:{timestamp}` | Notification worker, audit logger |
| `job.finalized` | Reporter review complete | `{job_id}:finalized` | Export eligibility check |

**Payloads:**

```typescript
// job.created
{
  job_id: string
  firm_id: string
  deposition_id: string
  case_id: string
  reporter_id: string
  audio_mode: 'UPLOAD' | 'LIVE'
}

// job.audio_uploaded
{
  job_id: string
  firm_id: string
  audio_file_url: string
  file_hash: string
  duration_seconds: number | null  // null until validated
  format: string
  size_bytes: number
}

// job.status_changed
{
  job_id: string
  previous_status: string
  new_status: string
  changed_by: string | 'system'
  reason: string
}
```

### 1.3 — Transcription Pipeline Events

| Event | Trigger Source | Idempotency Key | Downstream Consumers |
|-------|---------------|-----------------|---------------------|
| `transcription.requested` | Transcription scheduler | `{job_id}:transcription_request` | Pipeline orchestrator |
| `transcription.audio_validated` | Pipeline stage 1 | `{transcription_id}:validated` | Chunking stage |
| `transcription.audio_normalized` | Pipeline stage 1b | `{transcription_id}:normalized` | Chunking stage |
| `transcription.chunks_created` | Pipeline stage 2 | `{transcription_id}:chunked:{chunk_count}` | Chunk processor |
| `transcription.chunk_completed` | Pipeline stage 3 | `{transcription_id}:chunk:{chunk_index}` | Chunk orchestrator |
| `transcription.reassembled` | Pipeline stage 4 | `{transcription_id}:reassembled` | Flag extraction |
| `transcription.flags_extracted` | Pipeline stage 5 | `{transcription_id}:flags:{flag_count}` | Hydration worker |
| `transcription.completed` | Pipeline stage 6 | `{transcription_id}:completed` | Hydration worker |

**Payloads:**

```typescript
// transcription.requested
{
  transcription_id: string
  job_id: string
  firm_id: string
  audio_file_url: string
  model_type: 'STANDARD' | 'MEDICAL' | 'BILINGUAL'
}

// transcription.chunk_completed
{
  transcription_id: string
  chunk_index: number
  total_chunks: number
  word_count: number
  duration_seconds: number
  deepgram_request_id: string
}

// transcription.completed
{
  transcription_id: string
  job_id: string
  total_words: number
  total_speakers: number
  flagged_word_count: number
  average_confidence: number
  integrity_hash: string    // SHA-256 of original transcript
}
```

### 1.4 — Post-Transcription Events

| Event | Trigger Source | Idempotency Key | Downstream Consumers |
|-------|---------------|-----------------|---------------------|
| `transcription.hydrated` | Hydration worker | `{transcription_id}:hydrated:{word_count}` | Formatter worker |
| `transcription.speaker_mapped` | Speaker mapping service | `{transcription_id}:speakers:{version}` | Formatter worker |
| `transcription.formatted` | Formatter worker | `{transcription_id}:formatted:{paragraph_count}` | Quality gate worker |
| `transcription.quality_gate_passed` | Quality gate worker | `{transcription_id}:qg:{result_hash}` | Export eligibility, notification worker |
| `transcription.quality_gate_failed` | Quality gate worker | `{transcription_id}:qg_fail:{result_hash}` | Notification worker |

**Payloads:**

```typescript
// transcription.hydrated
{
  transcription_id: string
  firm_id: string
  word_count: number
  speaker_count: number
  hydration_duration_ms: number
}

// transcription.formatted
{
  transcription_id: string
  paragraph_count: number
  page_count: number
  section_types: string[]
  formatter_version: string
}

// transcription.quality_gate_passed
{
  transcription_id: string
  passed: true
  error_count: number
  warning_count: number
  can_export_with_acknowledgment: boolean
  checks: Array<{ name: string; status: 'pass' | 'warn' }>
}
```

### 1.5 — Export Events

| Event | Trigger Source | Idempotency Key | Downstream Consumers |
|-------|---------------|-----------------|---------------------|
| `export.requested` | GET /api/transcripts/[id]/export | `{transcription_id}:{format}:{source_version}` | Export worker |
| `export.generated` | Export worker | `{export_id}:generated` | Notification worker, audit logger |
| `export.downloaded` | File download handler | `{export_id}:download:{user_id}` | Audit logger |

**Payloads:**

```typescript
// export.requested
{
  export_id: string
  transcription_id: string
  firm_id: string
  format: 'docx' | 'pdf' | 'txt'
  requested_by: string
  quality_gate_snapshot: object
  profile_id: string | null
}

// export.generated
{
  export_id: string
  transcription_id: string
  format: string
  storage_path: string
  file_size_bytes: number
  page_count: number
  generation_duration_ms: number
}
```

### 1.6 — Deepgram Webhook Events

| Event | Trigger Source | Idempotency Key | Downstream Consumers |
|-------|---------------|-----------------|---------------------|
| `deepgram.webhook_received` | POST /api/webhooks/deepgram | `{deepgram_request_id}` | Webhook processor |
| `deepgram.result_stored` | Webhook processor | `{transcription_id}:deepgram_stored` | Pipeline reassembly |

**Payloads:**

```typescript
// deepgram.webhook_received
{
  deepgram_request_id: string
  transcription_id: string
  job_id: string
  status: 'completed' | 'error'
  metadata: object
}
```

### 1.7 — Review Workflow Events

| Event | Trigger Source | Idempotency Key | Downstream Consumers |
|-------|---------------|-----------------|---------------------|
| `review.scopist_assigned` | PATCH /api/jobs/[id] | `{job_id}:scopist:{scopist_id}` | Notification worker |
| `review.word_corrected` | PATCH /api/jobs/[id]/flagged-words | `{transcription_id}:edit:{word_index}:{version}` | Audit logger |
| `review.scopist_completed` | POST /api/jobs/[id]/review/submit | `{job_id}:scopist_complete` | Notification worker |
| `review.reporter_approved` | POST /api/jobs/[id]/review/approve | `{job_id}:reporter_approved` | Re-format trigger, export eligibility |

---

## 2 — Event Producers & Consumers

### 2.1 — Producer Registry

| Producer | Events Emitted | Runtime |
|----------|---------------|---------|
| **Intake API** (`/api/cases/intake`) | `document.uploaded` | Vercel Function |
| **Upload API** (`/api/jobs/[id]/upload`) | `job.audio_uploaded` | Vercel Function |
| **Transcription Scheduler** (`lib/transcription/scheduler.ts`) | `transcription.requested`, `transcription.chunk_completed`, `transcription.completed` | Vercel Function (chained) |
| **Transcription Pipeline** (`lib/transcription/pipeline.ts`) | `transcription.audio_validated`, `transcription.reassembled`, `transcription.flags_extracted` | Vercel Function or BullMQ worker |
| **Deepgram Webhook** (`/api/webhooks/deepgram`) | `deepgram.webhook_received`, `deepgram.result_stored` | Vercel Function |
| **AI Extraction Service** (`lib/services/ai-extractor.ts`) | `document.metadata_extracted` | Vercel Function |
| **Hydration Worker** (`lib/transcription/hydrate.ts`) | `transcription.hydrated` | Vercel Function |
| **Formatter Engine** (`lib/transcription/formatter/`) | `transcription.formatted` | Vercel Function |
| **Quality Gate** (`lib/transcription/formatter/quality-gate.ts`) | `transcription.quality_gate_passed`, `transcription.quality_gate_failed` | Vercel Function |
| **Export Worker** (`/api/transcripts/[id]/export`) | `export.requested`, `export.generated` | Vercel Function |
| **Review Routes** (`/api/jobs/[id]/review/*`) | `review.*` events | Vercel Function |
| **Job Status Service** | `job.status_changed`, `job.finalized` | Any route that transitions job status |

### 2.2 — Consumer Registry

| Consumer | Events Consumed | Action |
|----------|----------------|--------|
| **AI Extraction Worker** | `document.uploaded` | Parse document, extract metadata via Claude |
| **Case Normalization Worker** | `document.metadata_extracted` | Create/update case, deposition, job records |
| **Transcription Scheduler** | `job.audio_uploaded` | Validate audio, create transcription, start pipeline |
| **Chunk Processor** | `transcription.chunks_created` | Process individual audio chunks through Deepgram |
| **Chunk Orchestrator** | `transcription.chunk_completed` | Check if all chunks done, trigger reassembly |
| **Hydration Worker** | `transcription.completed` | Write `transcript_words` rows from Deepgram JSON |
| **Speaker Mapping Service** | `transcription.hydrated` | Assign speaker roles (Q/A/colloquy) |
| **Formatter Worker** | `transcription.hydrated` AND `transcription.speaker_mapped` | Build paragraphs, paginate |
| **Quality Gate Worker** | `transcription.formatted` | Validate export readiness |
| **Export Worker** | `export.requested` (only if quality gate passed) | Generate DOCX/PDF/TXT |
| **Notification Worker** | Multiple events | Send emails via Resend, in-app notifications |
| **Audit Logger** | All events | Write to `pipeline_events` table |

### 2.3 — Consumer Dependency Graph

```
document.uploaded
  └─→ AI Extraction Worker
        └─→ document.metadata_extracted
              └─→ Case Normalization Worker
                    └─→ document.case_normalized
                          └─→ Job Creation

job.audio_uploaded
  └─→ Transcription Scheduler
        └─→ transcription.requested
              └─→ Pipeline Orchestrator
                    ├─→ transcription.audio_validated
                    ├─→ transcription.chunks_created
                    │     └─→ Chunk Processor (per chunk)
                    │           └─→ transcription.chunk_completed
                    ├─→ transcription.reassembled
                    ├─→ transcription.flags_extracted
                    └─→ transcription.completed
                          └─→ Hydration Worker
                                └─→ transcription.hydrated
                                      └─→ Formatter Worker
                                            └─→ transcription.formatted
                                                  └─→ Quality Gate Worker
                                                        ├─→ transcription.quality_gate_passed
                                                        └─→ transcription.quality_gate_failed

export.requested (requires quality_gate_passed)
  └─→ Export Worker
        └─→ export.generated
```

---

## 3 — Workflow State Machines

### 3.1 — Job State Machine

```
                    ┌─────────────────────────────────┐
                    │           SCHEDULED              │
                    └──────────────┬──────────────────┘
                                   │ audio file uploaded
                                   ▼
                    ┌─────────────────────────────────┐
                    │         AUDIO_UPLOADED           │
                    └──────────────┬──────────────────┘
                                   │ transcription.requested
                                   ▼
                    ┌─────────────────────────────────┐
                    │          TRANSCRIBING            │
                    └──────────────┬──────────────────┘
                                   │ transcription.completed
                                   ▼
                    ┌─────────────────────────────────┐
                    │          AI_COMPLETE             │
                    └──────────────┬──────────────────┘
                                   │ scopist assigned OR
                                   │ reporter starts review
                                   ▼
                    ┌─────────────────────────────────┐
                    │           IN_REVIEW              │
                    └──────────────┬──────────────────┘
                                   │ review.scopist_completed
                                   ▼
                    ┌─────────────────────────────────┐
                    │        REVIEW_COMPLETE           │
                    └──────────────┬──────────────────┘
                                   │ review.reporter_approved
                                   ▼
                    ┌─────────────────────────────────┐
                    │           FINALIZED              │
                    └──────────────┬──────────────────┘
                                   │ export.generated
                                   ▼
                    ┌─────────────────────────────────┐
                    │           EXPORTED               │
                    └─────────────────────────────────┘

Error states (reachable from TRANSCRIBING):
  TRANSCRIBING → PIPELINE_FAILED → (manual retry) → TRANSCRIBING
```

**Transition Rules:**

| From | To | Guard Condition |
|------|----|-----------------|
| SCHEDULED | AUDIO_UPLOADED | Audio file stored in Supabase Storage |
| AUDIO_UPLOADED | TRANSCRIBING | Transcription record created, pipeline started |
| TRANSCRIBING | AI_COMPLETE | Pipeline stage 6 complete, integrity hash set |
| TRANSCRIBING | PIPELINE_FAILED | Unrecoverable pipeline error after retries |
| PIPELINE_FAILED | TRANSCRIBING | Manual retry by admin/reporter |
| AI_COMPLETE | IN_REVIEW | Scopist assigned OR reporter opens review |
| IN_REVIEW | REVIEW_COMPLETE | Scopist submits review |
| REVIEW_COMPLETE | FINALIZED | Reporter approves transcript |
| FINALIZED | EXPORTED | First successful export generated |

**Invariant:** Transitions are forward-only except `PIPELINE_FAILED → TRANSCRIBING`. All transitions must check current status before writing (conditional UPDATE).

### 3.2 — Transcription Pipeline State Machine

```
  PENDING
     │ pipeline started
     ▼
  VALIDATING ──────→ PIPELINE_FAILED
     │ audio valid
     ▼
  NORMALIZING ─────→ PIPELINE_FAILED
     │ audio normalized
     ▼
  CHUNKING ────────→ PIPELINE_FAILED
     │ chunks created
     ▼
  TRANSCRIBING ────→ PIPELINE_FAILED
     │ all chunks complete
     ▼
  REASSEMBLING ────→ PIPELINE_FAILED
     │ single transcript assembled
     ▼
  POST_PROCESSING ─→ PIPELINE_FAILED
     │ text cleanup done
     ▼
  EXTRACTING_FLAGS ─→ PIPELINE_FAILED
     │ flagged words extracted
     ▼
  HYDRATING ───────→ PIPELINE_FAILED (non-fatal, continues)
     │ transcript_words written
     ▼
  FORMATTING ──────→ PIPELINE_FAILED (non-fatal, continues)
     │ paragraphs built
     ▼
  COMPLETE
```

**Chunk Sub-State Machine:**

```
  PENDING
     │ chunk processing started
     ▼
  PROCESSING
     │ Deepgram returns result
     ▼
  COMPLETE

  Error path:
  PROCESSING → FAILED → (retry) → PROCESSING
  FAILED (max retries) → DEAD_LETTER
```

### 3.3 — Export State Machine

```
  REQUESTED
     │ quality gate check
     ├─→ BLOCKED (quality gate failed, not exportable)
     │
     │ quality gate passed
     ▼
  GENERATING
     │ file created
     ▼
  COMPLETE
     │ user downloads
     ▼
  DOWNLOADED

  Error path:
  GENERATING → FAILED → (retry) → GENERATING
```

### 3.4 — Review Workflow State Machine

```
  AWAITING_SCOPIST
     │ scopist opens review
     ▼
  SCOPIST_IN_PROGRESS
     │ scopist submits
     ▼
  SCOPIST_COMPLETE
     │ reporter opens review
     ▼
  REPORTER_REVIEWING
     │ reporter approves
     ▼
  APPROVED
     │
     ├─→ triggers re-format if edits made
     └─→ job → FINALIZED
```

---

## 4 — Event Storage Design

### 4.1 — `pipeline_events` Table

```sql
CREATE TABLE pipeline_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      TEXT NOT NULL,
  aggregate_type  TEXT NOT NULL,          -- 'job', 'transcription', 'export', 'document'
  aggregate_id    UUID NOT NULL,
  firm_id         UUID NOT NULL REFERENCES firms(id),
  idempotency_key TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  emitted_by      TEXT NOT NULL,          -- producer identifier
  status          TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING, PROCESSING, COMPLETED, FAILED, DEAD_LETTER
  retry_count     INTEGER NOT NULL DEFAULT 0,
  max_retries     INTEGER NOT NULL DEFAULT 3,
  last_error      TEXT,
  locked_at       TIMESTAMPTZ,
  locked_by       TEXT,                   -- worker instance id
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,

  CONSTRAINT uq_idempotency UNIQUE (event_type, idempotency_key)
);

-- Indexes for consumer polling
CREATE INDEX idx_pipeline_events_pending
  ON pipeline_events (event_type, status, created_at)
  WHERE status = 'PENDING';

CREATE INDEX idx_pipeline_events_aggregate
  ON pipeline_events (aggregate_type, aggregate_id, created_at);

CREATE INDEX idx_pipeline_events_firm
  ON pipeline_events (firm_id, created_at);

-- Index for stale lock detection
CREATE INDEX idx_pipeline_events_locked
  ON pipeline_events (locked_at)
  WHERE status = 'PROCESSING' AND locked_at IS NOT NULL;

-- RLS: firm_id tenant isolation
ALTER TABLE pipeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY pipeline_events_firm_isolation ON pipeline_events
  USING (firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid()));
```

### 4.2 — `pipeline_event_log` Table (Append-Only Audit Trail)

```sql
CREATE TABLE pipeline_event_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES pipeline_events(id),
  action      TEXT NOT NULL,   -- 'EMITTED', 'CLAIMED', 'COMPLETED', 'FAILED', 'RETRIED', 'DEAD_LETTERED'
  actor       TEXT,            -- worker id or 'system'
  detail      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_log_event ON pipeline_event_log (event_id, created_at);
```

### 4.3 — `processed_webhook_events` Table

```sql
-- Separate table for fast webhook dedup lookups
CREATE TABLE processed_webhook_events (
  provider          TEXT NOT NULL,          -- 'deepgram', 'stripe'
  provider_event_id TEXT NOT NULL,
  received_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at      TIMESTAMPTZ,
  payload_hash      TEXT,

  PRIMARY KEY (provider, provider_event_id)
);
```

---

## 5 — Idempotency Rules

> These rules extend `ASYNC_IDEMPOTENCY_MODEL.md`. That document defines the worker job record schema and retry semantics. This section adds event-specific deduplication rules.

### 5.1 — Event Emission Idempotency

Every event is emitted with an `idempotency_key`. The `UNIQUE(event_type, idempotency_key)` constraint on `pipeline_events` prevents duplicate emission.

**Emit pattern (pseudocode):**

```typescript
async function emitEvent(event: DomainEvent): Promise<boolean> {
  const { error } = await supabase
    .from('pipeline_events')
    .insert({
      event_type: event.event_type,
      aggregate_type: event.aggregate_type,
      aggregate_id: event.aggregate_id,
      firm_id: event.firm_id,
      idempotency_key: event.idempotency_key,
      payload: event.payload,
      emitted_by: event.emitted_by,
      status: 'PENDING',
    });

  if (error?.code === '23505') {
    // Unique violation — event already emitted, safe to ignore
    return false;
  }
  if (error) throw error;
  return true;
}
```

### 5.2 — Consumer Idempotency

Consumers claim events atomically before processing:

```typescript
async function claimEvent(eventId: string, workerId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('pipeline_events')
    .update({
      status: 'PROCESSING',
      locked_at: new Date().toISOString(),
      locked_by: workerId,
    })
    .eq('id', eventId)
    .eq('status', 'PENDING')  // atomic guard
    .select('id')
    .single();

  return !!data && !error;
}
```

### 5.3 — Per-Operation Idempotency Rules

| Operation | Idempotency Key | Dedup Strategy |
|-----------|----------------|----------------|
| Document upload | `{firm_id}:{file_hash}` | Reject duplicate file hashes per firm |
| AI extraction | `{document_id}:{extraction_version}` | Skip if extraction already exists for version |
| Deepgram submission | `{transcription_id}:deepgram_submit` | Check transcription status before submitting |
| Deepgram webhook | `{deepgram_request_id}` | `processed_webhook_events` lookup before processing |
| Word hydration | `{transcription_id}:hydrated` | Check `transcript_words` count > 0 before writing |
| Formatter run | `{transcription_id}:formatted:{input_hash}` | Hash of word count + last edit timestamp. Skip if paragraphs exist for same hash |
| Quality gate | `{transcription_id}:qg:{paragraph_hash}` | Hash of paragraph content. Skip if same result exists |
| Export generation | `{transcription_id}:{format}:{source_version}` | Source version = transcript `updated_at`. Skip if export exists for same version |
| Stripe webhook | `{stripe_event_id}` | `processed_webhook_events` lookup |
| Notifications | `{event_type}:{recipient}:{aggregate_id}:{version}` | Skip if notification already sent for same version |

### 5.4 — Webhook Replay Protection

```typescript
async function isWebhookProcessed(provider: string, eventId: string): Promise<boolean> {
  const { data } = await supabase
    .from('processed_webhook_events')
    .select('provider_event_id')
    .eq('provider', provider)
    .eq('provider_event_id', eventId)
    .single();

  return !!data;
}

async function markWebhookProcessed(provider: string, eventId: string): Promise<void> {
  await supabase
    .from('processed_webhook_events')
    .upsert({
      provider,
      provider_event_id: eventId,
      processed_at: new Date().toISOString(),
    });
}
```

### 5.5 — State Transition Guards

All status transitions use conditional updates to prevent race conditions:

```typescript
async function transitionJobStatus(
  jobId: string,
  expectedStatus: string,
  newStatus: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('jobs')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('status', expectedStatus)  // optimistic lock
    .select('id')
    .single();

  if (!data || error) {
    // Status already advanced or unexpected state — safe to skip
    return false;
  }
  return true;
}
```

---

## 6 — Retry & Recovery Strategy

### 6.1 — Retry Configuration Per Event Type

| Event Category | Max Retries | Backoff Base | Backoff Max | Timeout |
|---------------|-------------|-------------|-------------|---------|
| Document ingestion | 3 | 2s | 30s | 60s |
| AI extraction | 3 | 5s | 60s | 120s |
| Deepgram submission | 5 | 10s | 300s | N/A (async) |
| Deepgram webhook processing | 3 | 2s | 30s | 30s |
| Hydration | 3 | 5s | 60s | 120s |
| Formatter | 3 | 5s | 60s | 180s |
| Quality gate | 2 | 2s | 15s | 30s |
| Export generation | 3 | 5s | 60s | 300s |
| Notifications | 5 | 10s | 300s | 30s |

### 6.2 — Exponential Backoff Formula

```
delay = min(base * 2^attempt + jitter, max_delay)
jitter = random(0, base * 0.5)
```

### 6.3 — Retry Execution Pattern

```typescript
async function processWithRetry(eventId: string): Promise<void> {
  const event = await getEvent(eventId);
  if (!event || event.status === 'COMPLETED' || event.status === 'DEAD_LETTER') return;

  if (event.retry_count >= event.max_retries) {
    await moveToDeadLetter(eventId, 'Max retries exceeded');
    return;
  }

  const claimed = await claimEvent(eventId, WORKER_ID);
  if (!claimed) return; // another worker claimed it

  try {
    await processEvent(event);
    await markCompleted(eventId);
  } catch (error) {
    await markFailed(eventId, error);
    await scheduleRetry(eventId, event.retry_count + 1);
  }
}
```

### 6.4 — Dead Letter Queue

Events that exhaust retries are moved to `DEAD_LETTER` status:

```typescript
async function moveToDeadLetter(eventId: string, reason: string): Promise<void> {
  await supabase
    .from('pipeline_events')
    .update({
      status: 'DEAD_LETTER',
      last_error: reason,
      locked_at: null,
      locked_by: null,
    })
    .eq('id', eventId);

  await supabase
    .from('pipeline_event_log')
    .insert({
      event_id: eventId,
      action: 'DEAD_LETTERED',
      actor: 'system',
      detail: { reason },
    });

  // Alert operations team
  logEvent({
    level: 'CRITICAL',
    message: `Event moved to dead letter queue`,
    eventId,
    reason,
  });
}
```

Dead-lettered events are visible in the admin dashboard and can be manually re-driven:

```typescript
async function redriveDeadLetter(eventId: string): Promise<void> {
  await supabase
    .from('pipeline_events')
    .update({
      status: 'PENDING',
      retry_count: 0,
      last_error: null,
      locked_at: null,
      locked_by: null,
    })
    .eq('id', eventId)
    .eq('status', 'DEAD_LETTER');
}
```

### 6.5 — Stale Lock Recovery

Workers may crash while holding locks. A scheduled process reclaims stale locks:

```typescript
// Run via CRON every 5 minutes
async function reclaimStaleLocks(): Promise<void> {
  const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();

  const { data: staleEvents } = await supabase
    .from('pipeline_events')
    .update({
      status: 'PENDING',
      locked_at: null,
      locked_by: null,
    })
    .eq('status', 'PROCESSING')
    .lt('locked_at', cutoff)
    .select('id, event_type');

  if (staleEvents?.length) {
    logEvent({
      level: 'WARN',
      message: `Reclaimed ${staleEvents.length} stale event locks`,
      events: staleEvents.map(e => e.id),
    });
  }
}
```

### 6.6 — Failure Classification

| Error Class | Action | Example |
|-------------|--------|---------|
| **Transient** | Retry with backoff | Network timeout, 503, rate limit |
| **Recoverable** | Retry after fix | Missing dependency (hydration not done yet) |
| **Permanent** | Dead letter immediately | Invalid audio format, corrupt file |
| **Upstream** | Wait and retry | Deepgram outage, Anthropic 500 |

---

## 7 — Long Audio Processing

### 7.1 — Chunking Strategy

Audio files exceeding 30 minutes are split into overlapping chunks:

```
Total audio: 2h 15m (8100 seconds)
Chunk duration: 1800s (30 min)
Overlap: 15s

Chunk 0: 0s — 1800s
Chunk 1: 1785s — 3600s    (15s overlap with chunk 0)
Chunk 2: 3585s — 5400s    (15s overlap with chunk 1)
Chunk 3: 5385s — 7200s
Chunk 4: 7185s — 8100s    (final chunk, shorter)
```

### 7.2 — Chunk Event Flow

```
job.audio_uploaded
  └─→ transcription.requested
        └─→ transcription.audio_validated
              └─→ transcription.chunks_created
                    ├─→ chunk[0].processing → chunk[0].completed
                    ├─→ chunk[1].processing → chunk[1].completed
                    ├─→ chunk[2].processing → chunk[2].completed
                    ├─→ chunk[3].processing → chunk[3].completed
                    └─→ chunk[4].processing → chunk[4].completed
                          └─→ (all chunks done)
                                └─→ transcription.reassembled
```

### 7.3 — Reassembly Guarantees

| Guarantee | Implementation |
|-----------|---------------|
| **Timestamp continuity** | Chunk offsets applied: `word.start_time += chunk.startSeconds - chunk.overlapSeconds` |
| **Speaker consistency** | Speaker indices renumbered globally after reassembly using voice fingerprint matching |
| **Word ordering** | Overlap deduplication: words in overlap window matched by timestamp proximity, duplicates removed |
| **No gaps** | Validation check: max gap between adjacent chunks < 100ms after offset adjustment |
| **No duplicates** | Overlap window words deduplicated before merge |

### 7.4 — Chunk Failure Handling

Individual chunk failures do not fail the entire pipeline:

```
chunk[2] fails
  → retry chunk[2] up to max_retries
  → if chunk[2] exhausts retries:
      → mark chunk[2] as DEAD_LETTER
      → transcription status → PIPELINE_FAILED
      → human intervention required
      → admin can redrive chunk[2] or re-upload audio
```

Chunks that succeed are never reprocessed. The pipeline resumes from the first incomplete chunk.

---

## 8 — Event Ordering Guarantees

### 8.1 — Strict Ordering Rules

These pairs have **hard ordering dependencies**. The second event MUST NOT be processed before the first completes:

| Must Complete First | Before This Can Start | Enforcement |
|--------------------|----------------------|-------------|
| `transcription.completed` | Hydration worker starts | Hydration checks transcription status = COMPLETE |
| `transcription.hydrated` | Formatter worker starts | Formatter checks `transcript_words` count > 0 |
| `transcription.formatted` | Quality gate runs | Quality gate checks `transcript_paragraphs` exist |
| `transcription.quality_gate_passed` | Export generation | Export checks quality gate result in payload |
| All chunks completed | Reassembly starts | Chunk orchestrator counts completed vs total |
| `transcription.reassembled` | Flag extraction | Flags depend on merged transcript |

### 8.2 — Enforcement Mechanism

Ordering is enforced by **precondition checks**, not event ordering:

```typescript
// Formatter worker — checks precondition before processing
async function handleFormatterEvent(event: DomainEvent): Promise<void> {
  const transcriptionId = event.aggregate_id;

  // Precondition: hydration must be complete
  const { count } = await supabase
    .from('transcript_words')
    .select('id', { count: 'exact', head: true })
    .eq('transcription_id', transcriptionId);

  if (!count || count === 0) {
    throw new PreconditionNotMetError(
      'Hydration not complete — transcript_words is empty'
    );
    // This triggers a retry with backoff, giving hydration time to complete
  }

  // Proceed with formatting...
}
```

This pattern is preferred over strict event ordering because:
1. No single-point-of-failure event bus required
2. Workers are self-healing — they retry until preconditions are met
3. Out-of-order delivery is tolerated gracefully
4. Simpler to reason about in a serverless environment

### 8.3 — Parallel Processing Windows

Some operations can safely run in parallel:

| Parallel Group | Events |
|---------------|--------|
| Chunk transcription | All `chunk[N].processing` events can run concurrently |
| Post-transcription | Hydration and flag extraction can run concurrently |
| Notifications | Always independent, never block pipeline |
| Audit logging | Always independent, never block pipeline |

---

## 9 — Observability & Monitoring

### 9.1 — Pipeline Metrics

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| Event processing latency | `completed_at - created_at` | > 5 min for non-transcription events |
| Pipeline end-to-end time | `audio_uploaded` → `quality_gate_passed` | > 45 min for < 1hr audio |
| Failed event rate | `status = 'FAILED'` count / total | > 5% in 1 hour |
| Dead letter queue depth | `status = 'DEAD_LETTER'` count | > 0 (immediate alert) |
| Stale lock count | `status = 'PROCESSING'` AND `locked_at` > 10 min ago | > 0 |
| Webhook replay rate | Duplicate webhook attempts caught by idempotency | > 10% |
| Chunk failure rate | Failed chunks / total chunks | > 2% |

### 9.2 — Per-Job Pipeline Dashboard

The admin dashboard displays pipeline progress for each job:

```
Job: Smith v. Jones (2026-03-10)
Status: TRANSCRIBING [████████░░] 75%

Pipeline Steps:
  ✅ Audio uploaded         (0.2s)
  ✅ Audio validated        (3.1s)
  ✅ Audio normalized       (12.4s)
  ✅ Chunks created         (0.1s)  — 5 chunks
  ✅ Chunk 1/5 transcribed  (45.2s)
  ✅ Chunk 2/5 transcribed  (43.8s)
  ✅ Chunk 3/5 transcribed  (47.1s)
  🔄 Chunk 4/5 transcribing (running 30s...)
  ⏳ Chunk 5/5 pending
  ⏳ Reassembly
  ⏳ Flag extraction
  ⏳ Hydration
  ⏳ Formatting
  ⏳ Quality gate
```

This view is driven by querying `pipeline_events` for the job's aggregate:

```sql
SELECT event_type, status, created_at, completed_at,
       EXTRACT(EPOCH FROM (completed_at - created_at)) as duration_seconds
FROM pipeline_events
WHERE aggregate_id = :job_id
   OR aggregate_id IN (SELECT id FROM transcriptions WHERE job_id = :job_id)
ORDER BY created_at;
```

### 9.3 — Structured Log Events

All pipeline events emit structured logs via `lib/monitoring.ts`:

```typescript
logEvent({
  level: 'INFO',
  message: 'Pipeline event processed',
  route: 'pipeline-worker',
  event_type: event.event_type,
  aggregate_id: event.aggregate_id,
  firm_id: event.firm_id,
  duration_ms: processingTime,
});
```

### 9.4 — Alert Escalation

| Severity | Condition | Action |
|----------|-----------|--------|
| **P0 — Critical** | Dead letter queue > 0 | Slack alert + email to ops |
| **P0 — Critical** | Pipeline stalled > 30 min | Slack alert + email to ops |
| **P1 — High** | Failed event rate > 5% | Slack alert |
| **P2 — Medium** | Stale locks detected | Auto-reclaim + log |
| **P3 — Low** | Slow pipeline (> 2x expected) | Log warning |

---

## 10 — Scalability Design

### 10.1 — Current Architecture (Beta / Vercel Serverless)

The beta system operates within Vercel serverless constraints:

| Constraint | Value | Mitigation |
|-----------|-------|------------|
| Function timeout | 60s (Hobby) / 300s (Pro) | Chunk processing per-function; chain via HTTP |
| Concurrent executions | 1000 (Pro) | Queue-based backpressure |
| No persistent workers | N/A | Database-as-queue pattern with polling |
| No WebSocket events | N/A | Polling-based dashboard updates |

**Database-as-Queue Pattern:**

In the absence of Redis/BullMQ (optional for beta), `pipeline_events` acts as the event queue:

```typescript
// Polling consumer (runs via CRON or triggered by API)
async function pollAndProcess(eventType: string): Promise<void> {
  const { data: event } = await supabase
    .from('pipeline_events')
    .select('*')
    .eq('event_type', eventType)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (!event) return;

  const claimed = await claimEvent(event.id, WORKER_ID);
  if (!claimed) return;

  await processEvent(event);
}
```

### 10.2 — Scale-Up Path (Post-Beta)

When the system needs to handle hundreds of simultaneous depositions:

| Component | Beta | Scale-Up |
|-----------|------|----------|
| Event transport | Postgres polling | Redis Streams or BullMQ |
| Worker execution | Vercel Functions (chained) | Dedicated workers on Railway/Fly.io |
| Event storage | `pipeline_events` table | Same (Postgres is the audit trail regardless) |
| Dashboard updates | Polling | Supabase Realtime subscriptions |
| Chunk parallelism | Sequential (chain) | Parallel workers per chunk |
| Backpressure | None (natural serverless limit) | Redis queue depth + worker pool size |

### 10.3 — Large Transcript Handling

| Audio Duration | Chunks | Estimated Pipeline Time | Words |
|---------------|--------|------------------------|-------|
| < 30 min | 1 | 2-5 min | ~5,000 |
| 1 hour | 2 | 5-10 min | ~10,000 |
| 2 hours | 4 | 10-20 min | ~20,000 |
| 4 hours | 8 | 20-40 min | ~40,000 |
| 8 hours (max) | 16 | 40-80 min | ~80,000 |

Hydration and formatting scale linearly with word count. For 80,000 words:
- Hydration: ~10s (bulk INSERT)
- Formatting: ~5s (in-memory paragraph building)
- Quality gate: ~2s (validation queries)
- DOCX export: ~15s (docx library generation)

### 10.4 — Multi-Hour Audio Specific Concerns

| Concern | Mitigation |
|---------|-----------|
| Memory pressure during reassembly | Stream chunks; never load all Deepgram JSON into memory simultaneously |
| Speaker drift across chunks | Global speaker re-identification pass after reassembly |
| Timeout during hydration (80K words) | Batch INSERT in groups of 5,000 words |
| Export file size (500+ pages) | Stream DOCX generation; buffer to Supabase Storage, not memory |

---

## 11 — Production Readiness Score

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Event catalog completeness** | 9/10 | All pipeline events defined; notification events may expand |
| **Idempotency coverage** | 9/10 | Every async operation has an idempotency key; extends existing ASYNC_IDEMPOTENCY_MODEL |
| **State machine clarity** | 9/10 | Forward-only transitions with guards; covers job, transcription, export, review |
| **Retry strategy** | 8/10 | Exponential backoff + dead letter; needs production tuning of thresholds |
| **Ordering guarantees** | 9/10 | Precondition-based enforcement; tolerates out-of-order delivery |
| **Observability** | 7/10 | Structured logging + pipeline dashboard query; alerting needs external integration (Slack/PagerDuty) |
| **Scalability** | 7/10 | Database-as-queue works for beta; clear upgrade path to Redis/BullMQ |
| **Audit trail** | 10/10 | Every event stored; append-only log; firm-isolated via RLS |
| **Webhook safety** | 9/10 | Separate dedup table; fail-closed handlers |
| **Long audio support** | 8/10 | Chunking with overlap; reassembly guarantees; needs production validation at 8hr+ |

**Overall Production Readiness: 8.5 / 10**

The architecture is production-grade for a legal transcription platform. The primary gaps are:
1. External alerting integration (Slack/PagerDuty) — not yet wired
2. Database-as-queue polling efficiency — adequate for beta, upgrade to Redis for scale
3. Multi-hour audio reassembly — design is sound but needs stress testing with real 4-8hr depositions

---

## Implementation Priority

For beta launch, implement in this order:

1. **`pipeline_events` table + `processed_webhook_events` table** — foundation for everything
2. **`emitEvent()` and `claimEvent()` utility functions** — producer/consumer primitives
3. **Webhook dedup in Deepgram handler** — highest risk of duplicate processing today
4. **State transition guards on job status changes** — prevent invalid transitions
5. **Pipeline dashboard query** — operator visibility
6. **Stale lock recovery CRON** — resilience
7. **Dead letter alerting** — operational awareness

Items 1-4 are critical. Items 5-7 are important but can follow within the first beta week.
