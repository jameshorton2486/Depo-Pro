import type { EditorDocument, AiSuggestion, Exhibit, CertifyChecklist, Word, Utterance } from "../api/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function padId(n: number, prefix: string, width: number): string {
  return `${prefix}${String(n).padStart(width, "0")}`;
}

function makeWord(
  idx: number,
  text: string,
  speakerId: string,
  uttId: string,
  startTime: number,
  endTime: number,
  confidence = 0.97
): Word {
  return {
    word_id: padId(idx, "w_", 8),
    text,
    raw_text: text,             // IMMUTABLE — fixtures use same value
    speaker_id: speakerId,
    utterance_id: uttId,
    start_time: parseFloat(startTime.toFixed(3)),
    end_time: parseFloat(endTime.toFixed(3)),
    confidence: parseFloat(confidence.toFixed(3)),
    reviewed: false,
    edited: false,
  };
}

// ─── Small realistic fixture (12 utterances, ~120 words) ─────────────────────

type ScriptLine = { spk: string; utt: string; t: number; ws: string[] };

const SCRIPT: ScriptLine[] = [
  { spk: "spk_000", utt: "utt_0001", t: 0.0,   ws: ["Please", "state", "your", "full", "name", "for", "the", "record."] },
  { spk: "spk_001", utt: "utt_0002", t: 4.2,   ws: ["My", "name", "is", "Jonathan", "Michael", "Hargrove."] },
  { spk: "spk_000", utt: "utt_0003", t: 8.5,   ws: ["And", "what", "is", "your", "current", "occupation,", "Mr.", "Hargrove?"] },
  { spk: "spk_001", utt: "utt_0004", t: 12.1,  ws: ["I", "am", "a", "licensed", "civil", "engineer", "with", "Meridian", "Infrastructure", "Partners."] },
  { spk: "spk_000", utt: "utt_0005", t: 18.3,  ws: ["How", "long", "have", "you", "been", "employed", "in", "that", "capacity?"] },
  { spk: "spk_001", utt: "utt_0006", t: 22.0,  ws: ["Approximately", "fourteen", "years,", "since", "two", "thousand", "and", "ten."] },
  { spk: "spk_000", utt: "utt_0007", t: 27.4,  ws: ["Were", "you", "involved", "in", "the", "design", "of", "the", "Riverside", "Bridge", "project?"] },
  { spk: "spk_001", utt: "utt_0008", t: 32.6,  ws: ["Yes.", "I", "was", "the", "lead", "structural", "engineer", "on", "that", "project."] },
  { spk: "spk_002", utt: "utt_0009", t: 38.1,  ws: ["Objection.", "Foundation."] },
  { spk: "spk_000", utt: "utt_0010", t: 40.8,  ws: ["Overruled.", "The", "witness", "may", "answer."] },
  { spk: "spk_001", utt: "utt_0011", t: 44.5,  ws: ["I", "was", "responsible", "for", "the", "load", "calculations,", "material", "specifications,", "and", "final", "sign-off", "on", "the", "construction", "drawings."] },
  { spk: "spk_000", utt: "utt_0012", t: 56.0,  ws: ["Did", "you", "have", "any", "concerns", "about", "the", "soil", "conditions?"] },
];

// Low-confidence word indices (0-based) in the script above — for demo
const LOW_CONF_INDICES = new Set([13, 27, 43]);

function buildDocumentFromScript(
  lines: ScriptLine[],
  _jobId: string,
  _mediaUrl: string,
  wordIndexOffset = 1
): { words: Word[]; utterances: Utterance[]; duration: number } {
  const words: Word[] = [];
  const utterances: Utterance[] = [];
  let wi = wordIndexOffset;

  lines.forEach(({ spk, utt, t, ws }) => {
    const wordIds: string[] = [];
    let cursor = t;

    ws.forEach((w) => {
      const absoluteIdx = wi - wordIndexOffset;
      const dur = 0.15 + w.length * 0.04 + (wi % 7) * 0.02;
      const conf = LOW_CONF_INDICES.has(absoluteIdx)
        ? 0.55 + (wi % 3) * 0.05
        : 0.88 + (wi % 5) * 0.023;
      words.push(makeWord(wi, w, spk, utt, cursor, cursor + dur, Math.min(conf, 1)));
      wordIds.push(padId(wi, "w_", 8));
      cursor += dur + 0.04;
      wi++;
    });

    utterances.push({
      utterance_id: utt,
      speaker_id: spk,
      start_time: parseFloat(t.toFixed(3)),
      end_time: parseFloat(cursor.toFixed(3)),
      word_ids: wordIds,
    });
  });

  const duration = utterances[utterances.length - 1]?.end_time ?? 0;
  return { words, utterances, duration };
}

const { words: SMALL_WORDS, utterances: SMALL_UTTERANCES, duration: SMALL_DURATION } =
  buildDocumentFromScript(SCRIPT, "demo", "/mock-audio");

// Interpreter exchange utterances — appended to the document after the main 12.
// These model a brief interpreter exchange following utt_0008.
// word IDs are offset from 1000 to avoid collisions with SMALL_WORDS.
const INTERP_SCRIPT: ScriptLine[] = [
  { spk: "spk_003", utt: "utt_i001", t: 35.0, ws: ["Sí,", "yo", "era", "el", "ingeniero", "estructural", "principal."] },
  { spk: "spk_002", utt: "utt_i002", t: 39.5, ws: ["Objeción.", "Fundamento."] },
  { spk: "spk_003", utt: "utt_i003", t: 42.0, ws: ["Se", "desestima.", "El", "testigo", "puede", "responder."] },
];

const {
  words: INTERP_WORDS,
  utterances: INTERP_UTTERANCES,
} = buildDocumentFromScript(INTERP_SCRIPT, "demo", "/mock-audio", 1000);

// Merged document: main utterances + interpreter exchange
const ALL_UTTERANCES = [...SMALL_UTTERANCES, ...INTERP_UTTERANCES];
const ALL_WORDS = [...SMALL_WORDS, ...INTERP_WORDS];

export const FIXTURE_DOCUMENT: EditorDocument = {
  job_id: "demo",
  media_url: "/mock-audio",
  duration: SMALL_DURATION,
  speakers: [
    { speaker_id: "spk_000", display_name: "THE REPORTER",      deepgram_speaker: 0, role: "REPORTER"    },
    { speaker_id: "spk_001", display_name: "THE WITNESS",        deepgram_speaker: 1, role: "WITNESS"     },
    { speaker_id: "spk_002", display_name: "MR. SMITH",          deepgram_speaker: 2, role: "ATTORNEY"    },
    { speaker_id: "spk_003", display_name: "THE INTERPRETER",    deepgram_speaker: 3, role: "INTERPRETER" },
  ],
  utterances: ALL_UTTERANCES,
  words: ALL_WORDS,
};

// ─── Language map for interpreter layer ──────────────────────────────────────
// utterance_id → ISO 639-1 language tag. Only non-English entries are needed;
// English is the default. buildEditorContent reads this to set the `language`
// attr on utterance nodes (UI-only, not part of the API contract).
export const FIXTURE_LANGUAGE_MAP: Map<string, string> = new Map([
  ["utt_i001", "es"],
  ["utt_i002", "es"],
  ["utt_i003", "es"],
]);

// ─── 30,000-word generator (for ?big performance testing) ────────────────────

const WORD_POOL = [
  "the", "witness", "testified", "that", "on", "or", "about", "March", "fourteenth",
  "he", "reviewed", "the", "structural", "drawings", "and", "found", "no", "defects",
  "counsel", "asked", "whether", "any", "concern", "was", "raised", "prior", "to",
  "construction", "the", "objection", "was", "overruled", "answer", "was", "given",
  "foundation", "adequate", "soil", "moisture", "content", "higher", "than", "expected",
  "drainage", "infrastructure", "eastern", "approach", "mitigation", "strategy",
];

export function generateBigFixture(targetWords = 30_000): EditorDocument {
  const words: Word[] = [];
  const utterances: Utterance[] = [];
  const speakers = FIXTURE_DOCUMENT.speakers;
  let wi = 1;
  let timeOffset = 0;
  let uttIdx = 1;

  while (wi <= targetWords) {
    const spkIdx = uttIdx % 3;
    const spkId = `spk_00${spkIdx}`;
    const uttId = padId(uttIdx, "utt_", 5);
    const wordsPerUtt = 6 + (uttIdx % 9); // 6–14 words per utterance
    const wordIds: string[] = [];
    const uttStart = timeOffset;

    for (let j = 0; j < wordsPerUtt && wi <= targetWords; j++) {
      const text = WORD_POOL[(wi + j * 3) % WORD_POOL.length];
      const dur = 0.18 + (wi % 5) * 0.03;
      const conf = wi % 11 === 0 ? 0.62 : wi % 17 === 0 ? 0.48 : 0.91 + (wi % 7) * 0.01;
      words.push(makeWord(wi, text, spkId, uttId, timeOffset, timeOffset + dur, Math.min(conf, 1)));
      wordIds.push(padId(wi, "w_", 8));
      timeOffset = parseFloat((timeOffset + dur + 0.04).toFixed(3));
      wi++;
    }

    utterances.push({
      utterance_id: uttId,
      speaker_id: spkId,
      start_time: parseFloat(uttStart.toFixed(3)),
      end_time: timeOffset,
      word_ids: wordIds,
    });

    uttIdx++;
  }

  return {
    job_id: "demo-big",
    media_url: "/mock-audio",
    duration: timeOffset,
    speakers,
    utterances,
    words,
  };
}

// ─── Suggestions, exhibits, certify ─────────────────────────────────────────

// Helper: get word_id by flat index in SMALL_WORDS (0-based)
function wid(idx: number): string {
  return SMALL_WORDS[idx]?.word_id ?? `w_${String(idx + 1).padStart(8, "0")}`;
}

// utterance + flat-word-index reference map for building suggestions:
//   utt_0002: words 8–13  → "My name is Jonathan Michael Hargrove."
//   utt_0004: words 22–31 → "I am a licensed civil engineer with Meridian Infrastructure Partners."
//   utt_0006: words 41–48 → "Approximately fourteen years, since two thousand and ten."
//   utt_0008: words 58–67 → "Yes. I was the lead structural engineer on that project."
//   utt_0011: words 76–91 → "I was responsible for the load calculations, material specifications..."
export const FIXTURE_SUGGESTIONS: AiSuggestion[] = [
  {
    suggestion_id: "sug_001",
    word_id: wid(11),            // "Jonathan" in utt_0002
    utterance_id: "utt_0002",
    original_text: "Jonathan",
    suggested_text: "Jonathon",
    reason: "Common alternate spelling — verify against ID documents",
    confidence: 0.72,
    status: "pending",
  },
  {
    suggestion_id: "sug_002",
    word_id: wid(42),            // "fourteen" in utt_0006
    utterance_id: "utt_0006",
    original_text: "fourteen",
    suggested_text: "fourteen (14)",
    reason: "Standard legal format for numeric testimony",
    confidence: 0.88,
    status: "pending",
  },
  {
    suggestion_id: "sug_003",
    word_id: wid(65),            // "structural" in utt_0008
    utterance_id: "utt_0008",
    original_text: "structural",
    suggested_text: "structural (civil)",
    reason: "Witness identified as civil engineer — clarify specialty",
    confidence: 0.67,
    status: "pending",
  },
  {
    suggestion_id: "sug_004",
    word_id: wid(30),            // "Infrastructure" in utt_0004
    utterance_id: "utt_0004",
    original_text: "Infrastructure",
    suggested_text: "Infrastructure Group",
    reason: "Company name may be incomplete — verify against exhibit records",
    confidence: 0.59,
    status: "pending",
  },
  {
    suggestion_id: "sug_005",
    word_id: wid(59),            // "Riverside" in utt_0007 — but utt_0007 has "Riverside Bridge"
    utterance_id: "utt_0007",
    original_text: "Riverside",
    suggested_text: "Riverside (Route 9)",
    reason: "Project name may need road designation per court filing",
    confidence: 0.61,
    status: "pending",
  },
  {
    suggestion_id: "sug_006",
    word_id: wid(46),            // "thousand" in utt_0006
    utterance_id: "utt_0006",
    original_text: "thousand",
    suggested_text: "thousand (2010)",
    reason: "Clarify year — standard numeric annotation for dates",
    confidence: 0.91,
    status: "pending",
  },
];

export const FIXTURE_EXHIBITS: Exhibit[] = [
  { exhibit_id: "ex_001", label: "Exhibit 1", description: "Geotechnical Report — Riverside Bridge Site", file_url: "#" },
  { exhibit_id: "ex_002", label: "Exhibit 2", description: "Construction Drawings — Structural Package",  file_url: "#" },
  { exhibit_id: "ex_003", label: "Exhibit 3", description: "Engineering Memorandum dated March 14",       file_url: "#" },
];

export const FIXTURE_CERTIFY: CertifyChecklist = {
  review_complete: false,
  speaker_mapping_complete: true,
  confidence_review_complete: false,
};
