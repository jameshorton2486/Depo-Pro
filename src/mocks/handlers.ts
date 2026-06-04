import { http, HttpResponse } from "msw";
import {
  FIXTURE_DOCUMENT,
  FIXTURE_SUGGESTIONS,
  FIXTURE_EXHIBITS,
  FIXTURE_CERTIFY,
  generateBigFixture,
} from "./fixtures";
import type {
  AiSuggestion,
  EditorDocument,
  ReviewPayload,
  SpeakersPayload,
  SaveWorkingPayload,
  WorkingChange,
  Word,
} from "../api/types";

// Valid PCM WAV with a tiny low-amplitude tone so WaveSurfer can fully decode
// and report readiness in the local mock runtime.
const MOCK_WAV = (() => {
  const sampleRate = 8000;
  const channels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const durationSeconds = Math.max(1, Math.ceil(FIXTURE_DOCUMENT.duration));
  const totalSamples = sampleRate * durationSeconds;
  const dataSize = totalSamples * channels * bytesPerSample;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);

  const str = (off: number, s: string) =>
    [...s].forEach((c, i) => view.setUint8(off + i, c.charCodeAt(0)));
  const u32 = (o: number, v: number) => view.setUint32(o, v, true);
  const u16 = (o: number, v: number) => view.setUint16(o, v, true);

  str(0, "RIFF");
  u32(4, 36 + dataSize);
  str(8, "WAVE");
  str(12, "fmt ");
  u32(16, 16);
  u16(20, 1);
  u16(22, channels);
  u32(24, sampleRate);
  u32(28, sampleRate * channels * bytesPerSample);
  u16(32, channels * bytesPerSample);
  u16(34, bitsPerSample);
  str(36, "data");
  u32(40, dataSize);

  const freq = 220;
  const amplitude = 0.12;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const envelope = i % sampleRate < sampleRate * 0.08 ? 1 : 0.18;
    const sample = Math.sin(2 * Math.PI * freq * t) * amplitude * envelope;
    const pcm = Math.max(-1, Math.min(1, sample)) * 0x7fff;
    view.setInt16(44 + i * bytesPerSample, pcm, true);
  }

  return new Uint8Array(buf);
})();

function audioResponse() {
  return new HttpResponse(MOCK_WAV, {
    headers: {
      "Content-Type": "audio/wav",
      "Content-Length": String(MOCK_WAV.byteLength),
      "Accept-Ranges": "bytes",
    },
  });
}

// In-memory state — simulates server-side persistence within the session.
const reviewedWordIds = new Set<string>(
  FIXTURE_DOCUMENT.words.filter((w) => w.reviewed).map((w) => w.word_id)
);

const speakerOverrides = new Map(
  FIXTURE_DOCUMENT.speakers.map((s) => [
    s.speaker_id,
    { display_name: s.display_name, role: s.role },
  ])
);

// Mutable suggestion state keyed by suggestion_id.
// GET /suggestions returns this live map; POST /resolve mutates it.
const suggestionState = new Map<string, AiSuggestion>(
  FIXTURE_SUGGESTIONS.map((s) => [s.suggestion_id, { ...s }])
);

function cloneDocument(doc: EditorDocument): EditorDocument {
  return {
    ...doc,
    speakers: doc.speakers.map((s) => ({ ...s })),
    utterances: doc.utterances.map((u) => ({ ...u, word_ids: [...u.word_ids] })),
    words: doc.words.map((w) => ({ ...w })),
  };
}

const WORKING_DOCUMENT_STORAGE_KEY = "depo-pro.mock.working-document.v1";
const REVIEWED_WORD_IDS_STORAGE_KEY = "depo-pro.mock.reviewed-word-ids.v1";

function readStoredWorkingDocument(): EditorDocument | null {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return null;
    const raw = storage.getItem(WORKING_DOCUMENT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EditorDocument;
  } catch {
    return null;
  }
}

function persistWorkingDocument(doc: EditorDocument) {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return;
    storage.setItem(WORKING_DOCUMENT_STORAGE_KEY, JSON.stringify(doc));
  } catch {
    // Best-effort dev persistence only.
  }
}

function loadWorkingDocument(): EditorDocument {
  return readStoredWorkingDocument() ?? cloneDocument(FIXTURE_DOCUMENT);
}

let workingDocumentState: EditorDocument = loadWorkingDocument();

function readStoredReviewedWordIds(): string[] | null {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return null;
    const raw = storage.getItem(REVIEWED_WORD_IDS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : null;
  } catch {
    return null;
  }
}

function persistReviewedWordIds(ids: Set<string>) {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return;
    storage.setItem(REVIEWED_WORD_IDS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Best-effort dev persistence only.
  }
}

const storedReviewedWordIds = readStoredReviewedWordIds();
if (storedReviewedWordIds) {
  reviewedWordIds.clear();
  storedReviewedWordIds.forEach((id) => reviewedWordIds.add(id));
}

function applyUtteranceSpeakerAssignment(
  doc: EditorDocument,
  assignment: { utterance_id: string; speaker_id: string }
): EditorDocument {
  const nextUtterances = doc.utterances.map((utterance) =>
    utterance.utterance_id === assignment.utterance_id
      ? { ...utterance, speaker_id: assignment.speaker_id }
      : utterance
  );

  const wordIds = new Set(
    nextUtterances
      .find((utterance) => utterance.utterance_id === assignment.utterance_id)
      ?.word_ids ?? []
  );

  const nextWords = doc.words.map((word) =>
    wordIds.has(word.word_id)
      ? { ...word, speaker_id: assignment.speaker_id }
      : word
  );

  return {
    ...doc,
    utterances: nextUtterances,
    words: nextWords,
  };
}

function applyWorkingTextChange(doc: EditorDocument, change: WorkingChange): EditorDocument {
  const utterance = doc.utterances.find((u) => u.utterance_id === change.utterance_id);
  if (!utterance) return doc;

  const wordIds = utterance.word_ids;
  if (wordIds.length === 0) return doc;

  const tokens = change.working_text.trim().length > 0
    ? change.working_text.trim().split(/\s+/)
    : [""];

  const nextWords: Word[] = doc.words.map((word) => ({ ...word }));
  const wordIndexById = new Map(nextWords.map((w, i) => [w.word_id, i]));

  for (let i = 0; i < wordIds.length; i++) {
    const wordId = wordIds[i];
    const idx = wordIndexById.get(wordId);
    if (idx === undefined) continue;

    const nextText =
      i < wordIds.length - 1
        ? (tokens[i] ?? "")
        : tokens.slice(i).join(" ");

    nextWords[idx] = {
      ...nextWords[idx],
      text: nextText,
      edited: nextText !== nextWords[idx].raw_text,
    };
  }

  return {
    ...doc,
    words: nextWords,
  };
}

function applyMockState(doc: EditorDocument): EditorDocument {
  return {
    ...doc,
    speakers: doc.speakers.map((s) => {
      const override = speakerOverrides.get(s.speaker_id);
      return override ? { ...s, ...override } : s;
    }),
    words: doc.words.map((w) =>
      reviewedWordIds.has(w.word_id) ? { ...w, reviewed: true } : w
    ),
  };
}

export const handlers = [
  // GET document — supports ?big=1 for 30k-word performance fixture
  http.get("*/:jobId/document", ({ request }) => {
    const big = new URL(request.url).searchParams.has("big");
    const doc = big ? generateBigFixture(30_000) : applyMockState(workingDocumentState);
    return HttpResponse.json(doc);
  }),

  // Audio
  http.get("*/:jobId/media", audioResponse),
  http.get("*/mock-audio",   audioResponse),

  // PUT working transcript
  http.put("*/:jobId/working", async ({ request }) => {
    const body = await request.json() as SaveWorkingPayload;
    const changes = body.changes ?? [];
    for (const change of changes) {
      workingDocumentState = applyWorkingTextChange(workingDocumentState, change);
    }
    persistWorkingDocument(workingDocumentState);
    return HttpResponse.json({ saved: changes.length });
  }),

  // PUT review
  http.put("*/:jobId/review", async ({ request }) => {
    const body = await request.json() as ReviewPayload;
    body.reviewed_word_ids?.forEach((id) => reviewedWordIds.add(id));
    body.unreviewed_word_ids?.forEach((id) => reviewedWordIds.delete(id));
    persistReviewedWordIds(reviewedWordIds);
    return HttpResponse.json({ ok: true, reviewed_count: reviewedWordIds.size });
  }),

  // PUT speakers
  http.put("*/:jobId/speakers", async ({ request }) => {
    const body = await request.json() as SpeakersPayload;
    body.speakers?.forEach((s) => {
      speakerOverrides.set(s.speaker_id, { display_name: s.display_name, role: s.role });
    });
    body.utterance_speaker_map?.forEach((assignment) => {
      workingDocumentState = applyUtteranceSpeakerAssignment(workingDocumentState, assignment);
    });
    persistWorkingDocument(workingDocumentState);
    return HttpResponse.json({ ok: true });
  }),

  // GET suggestions — returns live resolved state
  http.get("*/:jobId/suggestions", () =>
    HttpResponse.json(Array.from(suggestionState.values()))
  ),

  // POST suggestion resolve — mutates mutable state
  http.post("*/:jobId/suggestions/:id/resolve", async ({ params, request }) => {
    const id = params.id as string;
    const body = await request.json() as {
      action: "accept" | "reject" | "edit";
      edited_text?: string;
    };
    const existing = suggestionState.get(id);
    if (existing) {
      suggestionState.set(id, {
        ...existing,
        status: body.action === "reject" ? "rejected" : "accepted",
        suggested_text:
          body.action === "edit" && body.edited_text
            ? body.edited_text
            : existing.suggested_text,
      });
    }
    return HttpResponse.json({ ok: true });
  }),

  // GET exhibits
  http.get("*/:jobId/exhibits", () => HttpResponse.json(FIXTURE_EXHIBITS)),

  // GET certify/status
  http.get("*/:jobId/certify/status", () => HttpResponse.json(FIXTURE_CERTIFY)),
];
