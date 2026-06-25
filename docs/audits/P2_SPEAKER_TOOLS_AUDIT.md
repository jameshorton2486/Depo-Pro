# P2 — Speaker Tools Persistence Audit

Date: 2026-06-25
Branch: `feature/stage3-workspace-core`
Auditor: Codex

## Contract findings (`src/api/types.ts`)

Source: [src/api/types.ts](C:/Users/james/projects/depo-pro/src/api/types.ts)

- The file header explicitly locks the contract:
  - `// CONTRACT TYPES — never rename or reshape these fields.`
- `SpeakersPayload` currently supports:
  - `speakers: Pick<Speaker, "speaker_id" | "display_name" | "role">[]`
  - optional `utterance_speaker_map?: Array<{ utterance_id; speaker_id }>`
- This means the frozen contract can express:
  - global rename / re-role of existing speakers
  - per-utterance reassignment to a speaker ID
- This contract does **not** include any field for:
  - creating a new speaker with required metadata such as `deepgram_speaker`
  - deleting a speaker
  - deactivating a speaker

Contract verdict:

- Rename/re-role: supported
- Per-utterance reassign: supported
- Add speaker: not fully expressible
- Remove speaker: not expressible

## Edge Function findings (`handlePutSpeakers`)

Source: [supabase/functions/editor-api/index.ts](C:/Users/james/projects/depo-pro/supabase/functions/editor-api/index.ts)

`handlePutSpeakers()`:

- updates existing rows in `transcript_speakers`
- updates `transcript_utterances.speaker_id` and `speaker_label` when `utterance_speaker_map` is present
- updates `transcript_words.speaker_id` for the reassigned utterance
- updates `transcripts.speaker_map_confirmed`
- appends audit rows for utterance reassignment

Important negatives:

- It does **not** `INSERT` any row into `transcript_speakers`
- It does **not** `DELETE` any row from `transcript_speakers`
- It performs no explicit validation that `utterance_speaker_map[*].speaker_id` exists in `transcript_speakers`

Behavior if reassignment references a non-existent `speaker_id`:

- `payload.speakers.find(...)` may return `undefined`
- the utterance update then falls back to `speaker_label: assignment.speaker_id`
- the utterance and word rows can still be updated
- but no new speaker row is created

So the endpoint can persist a reassignment to an arbitrary speaker ID textually, but it cannot create the corresponding speaker record. That is not a safe “add speaker” path.

## Schema findings (`transcript_speakers`)

Source: [supabase/migrations/20260603210000_create_core_schema.sql](C:/Users/james/projects/depo-pro/supabase/migrations/20260603210000_create_core_schema.sql)

`transcript_speakers` definition:

- primary key: `id uuid primary key`
- uniqueness: `unique (transcript_id, speaker_id)`
- required columns:
  - `transcript_id text not null`
  - `speaker_id text not null`
  - `display_name text not null default ''`
  - `deepgram_speaker integer not null`
  - `role text`

RLS policies:

- `select`: yes
- `insert`: yes
- `update`: yes
- `delete`: **no**

Implications:

- The schema does allow inserting additional speaker rows in principle.
- But any insert must provide `deepgram_speaker`, because it is `NOT NULL`.
- There is no delete policy, so row deletion is not available through the authenticated client path under current RLS.

Schema verdict:

- Add speaker: schema can hold it, but only if caller supplies `deepgram_speaker`
- Remove speaker: blocked by missing delete policy

## Client service findings (`workspaceService.saveSpeakers`)

Source: [src/api/workspaceService.ts](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts)

Real-API branch:

- calls `requireFreshTranscript(...)`
- calls `contractApi.saveSpeakers(...)`
- performs the post-save reread added by P1 (`f529467`)
- returns refreshed `updatedAt`

So post-P1 token handling is correct.

Client capability:

- there is a path for updating speakers
- there is a path for sending `utterance_speaker_map`
- there is **no** client service path for inserting a new speaker row
- there is **no** client service path for removing a speaker row

## UI findings (`SpeakerPanel.tsx`)

Source: [src/components/SpeakerPanel/SpeakerPanel.tsx](C:/Users/james/projects/depo-pro/src/components/SpeakerPanel/SpeakerPanel.tsx)

### `SpeakerCard` + `commitEdit`

This supports:

- global rename of an existing speaker
- global re-role of an existing speaker

It does **not** support:

- add speaker
- remove speaker

### `UtteranceReassignment`

This component already exists and is wired.

It supports:

- selecting the active utterance
- reassigning that utterance to another existing speaker
- persisting via `workspaceApi.saveSpeakers(..., { utterance_speaker_map: [...] })`

Edge case:

- when `hasMultipleSegments === true`, reassignment is blocked
- the UI shows:
  - `Speaker reassignment unavailable — utterance contains multiple speakers.`

This is an explicit block, not a silent failure.

### Add speaker UI

No add-speaker button, form, or modal exists.

### Remove speaker UI

No remove-speaker button or delete control exists.

## Verdict table

| Operation | UI exists? | Contract supports it? | Edge Function handles it? | Schema allows it? | Verdict |
|-----------|-----------|----------------------|--------------------------|------------------|---------|
| Rename/re-role (global) | Yes | Yes | Yes | Yes | LIVE |
| Per-utterance reassign | Yes | Yes | Yes | Yes, for existing speaker IDs | LIVE |
| Add speaker | No | No complete insert shape | No insert path | Partially, but requires `deepgram_speaker` | CONTRACT BLOCKED |
| Remove speaker | No | No | No delete path | No delete RLS policy | SCHEMA BLOCKED |

## What is safe to build under freeze

Already safe and already built:

- global rename / re-role
- per-utterance reassignment to an existing speaker

Potential freeze-safe UI refinements only:

- improve discoverability of the existing utterance reassignment control
- improve messaging around the mixed-speaker block state

No schema or contract change is required for those refinements.

## What is blocked and why

### Add speaker

Blocked by contract.

Reason:

- `SpeakersPayload` cannot express the data needed to create a new `transcript_speakers` row
- specifically, it cannot provide `deepgram_speaker`, which is required by schema
- the Edge Function contains no insert path

### Remove speaker

Blocked by both contract and schema.

Reason:

- `SpeakersPayload` has no delete/deactivate concept
- `handlePutSpeakers()` has no delete path
- `transcript_speakers` has no delete RLS policy

### Mixed-speaker reassignment

This is the important nuance.

Per-utterance reassignment is live, but it stops when one utterance contains multiple speaker segments. In that case the blocker is not the persistence path for a normal reassignment; the blocker is that the current UI treats the utterance as a unit, while the user problem is segment-level structure. That is closer to the deferred structural-edit family.

This is not a pure “speaker tools missing” problem. It overlaps with the post-freeze Layer-2 / structure-edit problem if you want to reassign part of a mixed utterance rather than the whole utterance.

## Recommended next action

Do **not** build add/remove speaker tools under freeze; those are blocked. Treat them as deferred until contract/schema scope changes are approved. Do **not** describe per-utterance reassignment as blocked; it is already live and persists today for existing speaker IDs. The next implementation pass, if desired, should be a narrow UX refinement prompt: make the existing reassignment affordance more discoverable, and decide how to handle the `hasMultipleSegments` case. If the requirement is truly paragraph/segment-level reassignment inside one mixed utterance, that should be treated as a structural-edit design decision, not a simple beta UI task.
