function padId(n, prefix, width) {
  return `${prefix}${String(n).padStart(width, "0")}`;
}

function makeWord(idx, text, speakerId, uttId, startTime, endTime, confidence = 0.97) {
  return {
    word_id: padId(idx, "w_", 8),
    text,
    raw_text: text,
    speaker_id: speakerId,
    utterance_id: uttId,
    start_time: Number(startTime.toFixed(3)),
    end_time: Number(endTime.toFixed(3)),
    confidence: Number(confidence.toFixed(3)),
    reviewed: false,
    edited: false,
  };
}

const SCRIPT = [
  { spk: "spk_000", utt: "utt_0001", t: 0.0, ws: ["Please", "state", "your", "full", "name", "for", "the", "record."] },
  { spk: "spk_001", utt: "utt_0002", t: 4.2, ws: ["My", "name", "is", "Jonathan", "Michael", "Hargrove."] },
  { spk: "spk_000", utt: "utt_0003", t: 8.5, ws: ["And", "what", "is", "your", "current", "occupation,", "Mr.", "Hargrove?"] },
  { spk: "spk_001", utt: "utt_0004", t: 12.1, ws: ["I", "am", "a", "licensed", "civil", "engineer", "with", "Meridian", "Infrastructure", "Partners."] },
  { spk: "spk_000", utt: "utt_0005", t: 18.3, ws: ["How", "long", "have", "you", "been", "employed", "in", "that", "capacity?"] },
  { spk: "spk_001", utt: "utt_0006", t: 22.0, ws: ["Approximately", "fourteen", "years,", "since", "two", "thousand", "and", "ten."] },
  { spk: "spk_000", utt: "utt_0007", t: 27.4, ws: ["Were", "you", "involved", "in", "the", "design", "of", "the", "Riverside", "Bridge", "project?"] },
  { spk: "spk_001", utt: "utt_0008", t: 32.6, ws: ["Yes.", "I", "was", "the", "lead", "structural", "engineer", "on", "that", "project."] },
  { spk: "spk_002", utt: "utt_0009", t: 38.1, ws: ["Objection.", "Foundation."] },
  { spk: "spk_000", utt: "utt_0010", t: 40.8, ws: ["Overruled.", "The", "witness", "may", "answer."] },
  { spk: "spk_001", utt: "utt_0011", t: 44.5, ws: ["I", "was", "responsible", "for", "the", "load", "calculations,", "material", "specifications,", "and", "final", "sign-off", "on", "the", "construction", "drawings."] },
  { spk: "spk_000", utt: "utt_0012", t: 56.0, ws: ["Did", "you", "have", "any", "concerns", "about", "the", "soil", "conditions?"] },
];

const INTERP_SCRIPT = [
  { spk: "spk_003", utt: "utt_i001", t: 35.0, ws: ["Sí,", "yo", "era", "el", "ingeniero", "estructural", "principal."] },
  { spk: "spk_002", utt: "utt_i002", t: 39.5, ws: ["Objeción.", "Fundamento."] },
  { spk: "spk_003", utt: "utt_i003", t: 42.0, ws: ["Se", "desestima.", "El", "testigo", "puede", "responder."] },
];

const LOW_CONF_INDICES = new Set([13, 27, 43]);

function buildDocumentFromScript(lines, wordIndexOffset = 1) {
  const words = [];
  const utterances = [];
  let wi = wordIndexOffset;

  lines.forEach(({ spk, utt, t, ws }) => {
    const wordIds = [];
    let cursor = t;

    ws.forEach(() => {});
    ws.forEach((word) => {
      const absoluteIdx = wi - wordIndexOffset;
      const dur = 0.15 + word.length * 0.04 + (wi % 7) * 0.02;
      const conf = LOW_CONF_INDICES.has(absoluteIdx)
        ? 0.55 + (wi % 3) * 0.05
        : 0.88 + (wi % 5) * 0.023;
      words.push(makeWord(wi, word, spk, utt, cursor, cursor + dur, Math.min(conf, 1)));
      wordIds.push(padId(wi, "w_", 8));
      cursor += dur + 0.04;
      wi += 1;
    });

    utterances.push({
      utterance_id: utt,
      speaker_id: spk,
      start_time: Number(t.toFixed(3)),
      end_time: Number(cursor.toFixed(3)),
      word_ids: wordIds,
    });
  });

  return {
    utterances,
    words,
    duration: utterances.at(-1)?.end_time ?? 0,
  };
}

const primary = buildDocumentFromScript(SCRIPT, 1);
const interpreter = buildDocumentFromScript(INTERP_SCRIPT, 1000);

const ALL_WORDS = [...primary.words, ...interpreter.words];
const ALL_UTTERANCES = [...primary.utterances, ...interpreter.utterances];

function wid(idx) {
  return primary.words[idx]?.word_id ?? `w_${String(idx + 1).padStart(8, "0")}`;
}

export const editorApiFixture = {
  document: {
    job_id: "demo",
    media_url: "/mock-audio",
    duration: primary.duration,
    speakers: [
      { speaker_id: "spk_000", display_name: "THE REPORTER", deepgram_speaker: 0, role: "REPORTER" },
      { speaker_id: "spk_001", display_name: "THE WITNESS", deepgram_speaker: 1, role: "WITNESS" },
      { speaker_id: "spk_002", display_name: "MR. SMITH", deepgram_speaker: 2, role: "ATTORNEY" },
      { speaker_id: "spk_003", display_name: "THE INTERPRETER", deepgram_speaker: 3, role: "INTERPRETER" },
    ],
    utterances: ALL_UTTERANCES,
    words: ALL_WORDS,
  },
  suggestions: [
    {
      suggestion_id: "sug_001",
      word_id: wid(11),
      utterance_id: "utt_0002",
      original_text: "Jonathan",
      suggested_text: "Jonathon",
      reason: "Common alternate spelling — verify against ID documents",
      confidence: 0.72,
      status: "pending",
    },
    {
      suggestion_id: "sug_002",
      word_id: wid(42),
      utterance_id: "utt_0006",
      original_text: "fourteen",
      suggested_text: "fourteen (14)",
      reason: "Standard legal format for numeric testimony",
      confidence: 0.88,
      status: "pending",
    },
    {
      suggestion_id: "sug_003",
      word_id: wid(65),
      utterance_id: "utt_0008",
      original_text: "structural",
      suggested_text: "structural (civil)",
      reason: "Witness identified as civil engineer — clarify specialty",
      confidence: 0.67,
      status: "pending",
    },
  ],
  exhibits: [
    {
      exhibit_id: "ex_001",
      label: "Exhibit 1",
      description: "Geotechnical Report — Riverside Bridge Site",
      filename: "exhibit-1.txt",
    },
    {
      exhibit_id: "ex_002",
      label: "Exhibit 2",
      description: "Construction Drawings — Structural Package",
      filename: "exhibit-2.txt",
    },
  ],
};

export const rawFixturePacket = {
  source: "editor-api-seed",
  document: editorApiFixture.document,
  suggestions: editorApiFixture.suggestions,
  exhibits: editorApiFixture.exhibits,
};
