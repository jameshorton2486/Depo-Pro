import { http, HttpResponse } from "msw";
import {
  FIXTURE_DOCUMENT,
  FIXTURE_SUGGESTIONS,
  FIXTURE_EXHIBITS,
  FIXTURE_CERTIFY,
  generateBigFixture,
} from "./fixtures";
import type { AiSuggestion, EditorDocument, ReviewPayload, SpeakersPayload } from "../api/types";

// Minimal silent WAV so WaveSurfer can mount without a real audio file.
const SILENT_WAV = (() => {
  const buf = new ArrayBuffer(44);
  const view = new DataView(buf);
  const str = (off: number, s: string) =>
    [...s].forEach((c, i) => view.setUint8(off + i, c.charCodeAt(0)));
  const u32 = (o: number, v: number) => view.setUint32(o, v, true);
  const u16 = (o: number, v: number) => view.setUint16(o, v, true);
  str(0, "RIFF"); u32(4, 36); str(8, "WAVE"); str(12, "fmt ");
  u32(16, 16); u16(20, 1); u16(22, 1); u32(24, 44100); u32(28, 88200);
  u16(32, 2); u16(34, 16); str(36, "data"); u32(40, 0);
  return new Uint8Array(buf);
})();

function audioResponse() {
  return new HttpResponse(SILENT_WAV, {
    headers: {
      "Content-Type": "audio/wav",
      "Content-Length": String(SILENT_WAV.byteLength),
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
    const doc = big ? generateBigFixture(30_000) : applyMockState(FIXTURE_DOCUMENT);
    return HttpResponse.json(doc);
  }),

  // Audio
  http.get("*/:jobId/media", audioResponse),
  http.get("*/mock-audio",   audioResponse),

  // PUT working transcript
  http.put("*/:jobId/working", async ({ request }) => {
    const body = await request.json() as { changes?: unknown[] };
    return HttpResponse.json({ saved: body.changes?.length ?? 0 });
  }),

  // PUT review
  http.put("*/:jobId/review", async ({ request }) => {
    const body = await request.json() as ReviewPayload;
    body.reviewed_word_ids?.forEach((id) => reviewedWordIds.add(id));
    body.unreviewed_word_ids?.forEach((id) => reviewedWordIds.delete(id));
    return HttpResponse.json({ ok: true, reviewed_count: reviewedWordIds.size });
  }),

  // PUT speakers
  http.put("*/:jobId/speakers", async ({ request }) => {
    const body = await request.json() as SpeakersPayload;
    body.speakers?.forEach((s) => {
      speakerOverrides.set(s.speaker_id, { display_name: s.display_name, role: s.role });
    });
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
